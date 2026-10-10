// Check scripts shown by the portal (lib/portal/scripts.ts): only scripts the portal text names, only
// inside <repo>/scripts, never bigger than the limit; the plain explanation at the top of a script;
// and the real portal text names only scripts that exist and can be read.
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPortalUncached } from "@/lib/portal/load";
import { runCommand } from "@/lib/portal/scriptCommand";
import { MAX_SCRIPT_BYTES, namedScripts, readNamedScript, scriptHeader } from "@/lib/portal/scripts";
import { REPO_ROOT } from "./helpers";

const temps: string[] = [];
afterEach(() => {
  for (const t of temps.splice(0)) rmSync(t, { recursive: true, force: true });
});

function repo(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "portal scripts "));
  temps.push(root);
  mkdirSync(path.join(root, "scripts", "verify"), { recursive: true });
  writeFileSync(path.join(root, "scripts", "verify", "p1.1-tools.ps1"), "﻿#Requires -Version 7.0\r\n<#\r\n.SYNOPSIS\r\n  Check one.\r\n#>\r\nWrite-Host hi\r\n");
  writeFileSync(path.join(root, "secret.txt"), "not a script");
  return root;
}

describe("readNamedScript", () => {
  it("reads a named script, without a BOM and with LF line ends", () => {
    const root = repo();
    const r = readNamedScript(root, "scripts/verify/p1.1-tools.ps1", ["scripts/verify/p1.1-tools.ps1"]);
    expect(r).toEqual({ ok: true, path: "scripts/verify/p1.1-tools.ps1", text: "#Requires -Version 7.0\n<#\n.SYNOPSIS\n  Check one.\n#>\nWrite-Host hi\n" });
  });

  it("refuses a script the portal text does not name, and any path outside scripts/", () => {
    const root = repo();
    const named = ["scripts/verify/p1.1-tools.ps1", "scripts/../secret.txt", "secret.txt"];
    expect(readNamedScript(root, "scripts/verify/other.ps1", named)).toEqual({ ok: false, reason: "not-named" });
    for (const bad of ["scripts/../secret.txt", "secret.txt", "../x.ps1", "scripts\\verify\\p1.1-tools.ps1", "/etc/x.ps1", "scripts/verify/p1.1-tools.ps1.txt", ""]) {
      expect(readNamedScript(root, bad, [...named, bad]).ok, bad).toBe(false);
    }
  });

  it("says missing for a named script that does not exist, or a folder", () => {
    const root = repo();
    mkdirSync(path.join(root, "scripts", "dir.ps1"));
    expect(readNamedScript(root, "scripts/verify/gone.ps1", ["scripts/verify/gone.ps1"])).toEqual({ ok: false, reason: "missing" });
    expect(readNamedScript(root, "scripts/dir.ps1", ["scripts/dir.ps1"])).toEqual({ ok: false, reason: "missing" });
    expect(readNamedScript(path.join(root, "nothing"), "scripts/verify/p1.1-tools.ps1", ["scripts/verify/p1.1-tools.ps1"])).toEqual({ ok: false, reason: "missing" });
  });

  it("refuses a script bigger than the limit", () => {
    const root = repo();
    writeFileSync(path.join(root, "scripts", "big.ps1"), "#".repeat(MAX_SCRIPT_BYTES + 1));
    expect(readNamedScript(root, "scripts/big.ps1", ["scripts/big.ps1"])).toEqual({ ok: false, reason: "too-big" });
  });

  it("refuses a link inside scripts/ that points outside it", (ctx) => {
    const root = repo();
    try {
      symlinkSync(path.join(root, "secret.txt"), path.join(root, "scripts", "link.ps1"));
    } catch {
      ctx.skip(); // creating links needs Developer Mode on Windows
    }
    expect(readNamedScript(root, "scripts/link.ps1", ["scripts/link.ps1"])).toEqual({ ok: false, reason: "not-named" });
  });
});

describe("scriptHeader", () => {
  it("returns the explanation block without help keywords and shared indentation", () => {
    const text = "#Requires -Version 7.0\n<#\n.SYNOPSIS\n  Gate check.\n\n.DESCRIPTION\n  What it checks:\n    1. Things.\n#>\ncode";
    expect(scriptHeader(text)).toBe("Gate check.\n\nWhat it checks:\n  1. Things.");
  });
  it("is null without a block or with an empty one", () => {
    expect(scriptHeader("Write-Host hi")).toBeNull();
    expect(scriptHeader("<#\n\n#>")).toBeNull();
  });
});

describe("namedScripts and the real repo", () => {
  it("names each task, gate and next-action script once, sorted, only under scripts/", () => {
    const phase = { tasks: [{ script: "scripts/verify/b.ps1" }, { script: null }, { script: "scripts/verify/b.ps1" }], test_gate: { script: "scripts/gates/a.ps1" } };
    const files = {
      phases: [phase, { tasks: [{ script: "tools/x.ps1" }], test_gate: { script: null } }],
      overview: { next_action: { script: { path: "scripts/run-all-checks.ps1" } } },
    } as unknown as Parameters<typeof namedScripts>[0];
    expect(namedScripts(files)).toEqual(["scripts/gates/a.ps1", "scripts/run-all-checks.ps1", "scripts/verify/b.ps1"]);
    expect(namedScripts({ phases: [], overview: null })).toEqual([]);
  });

  it("every script the real portal text names exists, can be read, and explains itself", async () => {
    const portal = await loadPortalUncached({ portalDir: path.join(REPO_ROOT, "plan", "portal"), approvalsFile: path.join(REPO_ROOT, "plan", "approvals.json") });
    const named = namedScripts(portal.files);
    expect(named.length).toBeGreaterThan(100);
    for (const rel of named) {
      const r = readNamedScript(REPO_ROOT, rel, named);
      expect(r.ok, rel).toBe(true);
      if (r.ok) expect(scriptHeader(r.text), rel).not.toBeNull();
    }
  });

  it("runCommand is the PowerShell 7 command from the repo folder", () => {
    expect(runCommand("scripts/gates/p1-gate.ps1")).toBe("pwsh -NoProfile -File scripts/gates/p1-gate.ps1");
  });
});
