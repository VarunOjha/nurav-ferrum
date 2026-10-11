// Portal data layer: loads and validates the real plan/portal files; a missing, broken or misshapen
// file becomes a plain problem (never a crash); the approvals file is read, never written; plus the
// small view helpers (dates, tones, headline, latest log, approval labels).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ApprovalsRead } from "@/lib/approvals/file";
import { describeIssues, loadPortal, loadPortalUncached, readPortalFile } from "@/lib/portal/load";
import { OverviewFile } from "@/lib/portal/schemas.gen";
import { approvalLabel, headline, latestLog, percentDone, phaseTone, roadmapRow, shortDate } from "@/lib/portal/view";
import { isActiveTab, TABS } from "@/lib/portal/tabs";
import { REPO_ROOT } from "./helpers";

const REAL = { portalDir: path.join(REPO_ROOT, "plan", "portal"), approvalsFile: path.join(REPO_ROOT, "plan", "approvals.json") };
const temps: string[] = [];
afterEach(() => {
  for (const t of temps.splice(0)) rmSync(t, { recursive: true, force: true });
});

function tempCopy(): { portalDir: string; approvalsFile: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "ferrum portal "));
  temps.push(root);
  cpSync(REAL.portalDir, path.join(root, "portal"), { recursive: true });
  return { portalDir: path.join(root, "portal"), approvalsFile: path.join(root, "approvals.json") };
}

describe("loadPortal on the real plan/portal", () => {
  it("reads every file with no problems, phases in roadmap order", async () => {
    const p = await loadPortalUncached(REAL);
    expect(p.problems).toEqual([]);
    for (const [k, v] of Object.entries(p.files)) expect(v, k).not.toBeNull();
    expect(p.files.phases.map((x) => x.id)).toEqual(p.files.roadmap!.phases.map((x) => x.id));
    expect(p.approvals.valid).toBe(true);
  });

  it("is memoised until a file changes", async () => {
    const cfg = tempCopy();
    const a = await loadPortal(cfg);
    expect(await loadPortal(cfg)).toBe(a);
    const f = path.join(cfg.portalDir, "overview.json");
    const j = JSON.parse(readFileSync(f, "utf8"));
    j.title = "Changed title";
    writeFileSync(f, JSON.stringify(j));
    const b = await loadPortal(cfg);
    expect(b).not.toBe(a);
    expect(b.files.overview?.title).toBe("Changed title");
  });
});

describe("problems instead of crashes", () => {
  it("a missing, a broken and a misshapen file each become one plain problem", async () => {
    const cfg = tempCopy();
    rmSync(path.join(cfg.portalDir, "log.json"));
    writeFileSync(path.join(cfg.portalDir, "risks.json"), "{ not json");
    const ov = JSON.parse(readFileSync(path.join(cfg.portalDir, "overview.json"), "utf8"));
    ov.where_we_are[0].state = "x".repeat(300);
    writeFileSync(path.join(cfg.portalDir, "overview.json"), JSON.stringify(ov));
    const p = await loadPortalUncached(cfg);
    expect(p.files.log).toBeNull();
    expect(p.files.risks).toBeNull();
    expect(p.files.overview).toBeNull();
    expect(p.files.roadmap).not.toBeNull();
    const byFile = Object.fromEntries(p.problems.map((x) => [x.file, x.message]));
    expect(byFile["log.json"]).toBe("the file is missing");
    expect(byFile["risks.json"]).toMatch(/^not valid JSON/);
    expect(byFile["overview.json"]).toMatch(/^does not match its shape: where_we_are\.0\.state: at most 240 characters/);
  });

  it("a missing phase file is a problem; without a readable roadmap the phases folder is listed", async () => {
    const cfg = tempCopy();
    rmSync(path.join(cfg.portalDir, "phases", "phase-p3-tabs-sessions.json"));
    let p = await loadPortalUncached(cfg);
    expect(p.problems.map((x) => x.file)).toEqual(["phases/phase-p3-tabs-sessions.json"]);
    expect(p.files.phases).toHaveLength(8);
    rmSync(path.join(cfg.portalDir, "roadmap.json"));
    p = await loadPortalUncached(cfg);
    expect(p.files.phases.map((x) => x.short)).toEqual(["P0", "P1", "P2", "P4", "P5", "P6", "P7", "P8"]);
  });

  it("an empty portal folder gives problems for every file and no phases", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "ferrum portal "));
    temps.push(root);
    const p = await loadPortalUncached({ portalDir: path.join(root, "nothing"), approvalsFile: path.join(root, "approvals.json") });
    expect(p.files.phases).toEqual([]);
    expect(p.problems.length).toBe(11); // one per single file; taxonomy.json is the eleventh
    expect(p.approvals.exists).toBe(false);
  });

  it("a byte-order mark is accepted, and describeIssues summarises several issues", () => {
    const cfg = tempCopy();
    const f = path.join(cfg.portalDir, "overview.json");
    writeFileSync(f, "﻿" + readFileSync(f, "utf8"));
    expect(readPortalFile(cfg.portalDir, "overview.json", OverviewFile).problem).toBeNull();
    const r = OverviewFile.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) expect(describeIssues(r.error, 2)).toMatch(/\(and \d+ more\)$/);
  });
});

describe("view helpers", () => {
  it("shortDate, percentDone, phaseTone", () => {
    expect(shortDate("2026-10-09")).toBe("9 Oct");
    expect(shortDate("2026-01-31")).toBe("31 Jan");
    expect(shortDate("2026-13-01")).toBe("2026-13-01");
    expect(shortDate("soon")).toBe("soon");
    expect(percentDone(16, 18)).toBe(89);
    expect(percentDone(3, 0)).toBe(0);
    expect(percentDone(3, null)).toBe(0);
    expect(percentDone(5, 4)).toBe(100);
    expect(phaseTone("Done")).toBe("done");
    expect(phaseTone("In progress")).toBe("now");
    expect(phaseTone("Waiting for your review")).toBe("now");
    expect(phaseTone("Blocked")).toBe("blocked");
    expect(phaseTone("Not started")).toBe("later");
    expect(phaseTone("Ready to start")).toBe("later");
  });

  it("headline splits off the first sentence", () => {
    expect(headline("We are finishing the plan (P0). Next comes the portal.")).toEqual({ head: "We are finishing the plan (P0).", rest: "Next comes the portal." });
    expect(headline("One sentence only.")).toEqual({ head: "One sentence only.", rest: "" });
    expect(headline("Version 1.99 is installed. Done.")).toEqual({ head: "Version 1.99 is installed.", rest: "Done." });
  });

  it("latestLog returns the newest entries first", async () => {
    const { files } = await loadPortalUncached(REAL);
    const l = latestLog(files.log, 3);
    expect(l).toHaveLength(3);
    expect(l[0]).toBe(files.log!.entries[files.log!.entries.length - 1]);
    expect(latestLog(null)).toEqual([]);
    const mk = (id: string, date: string) => ({ ...files.log!.entries[0], id, date });
    const log = { ...files.log!, entries: [mk("a", "2026-10-08"), mk("b", "2026-10-09"), mk("c", "2026-10-08")] };
    expect(latestLog(log, 3).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(roadmapRow(files.roadmap, "phase-p0-planning")?.short).toBe("P0");
    expect(roadmapRow(null, "phase-p0-planning")).toBeNull();
  });

  it("approvalLabel reads approvals.json without the wiki", () => {
    const h1 = "sha256:" + "1".repeat(64);
    const h2 = "sha256:" + "2".repeat(64);
    const rec = (status: string, content_hash: string) => ({ status, content_hash, scope_hash: h1, comment: "", timestamp: "2026-10-09T10:00:00Z", path: "wiki/x.md", approved_by: "owner", history: [] });
    const read = (approvals: Record<string, Record<string, unknown>>): ApprovalsRead => ({ exists: true, valid: true, error: null, data: { schema_version: 1, approvals } });
    expect(approvalLabel(read({}), "phase-p1-foundation", h1)).toBe("Not approved yet");
    expect(approvalLabel(read({ k: rec("approved", h1) }), "k", h1)).toBe("Approved");
    expect(approvalLabel(read({ k: rec("approved", h1) }), "k", null)).toBe("Approved");
    expect(approvalLabel(read({ k: rec("approved", h1) }), "k", h2)).toBe("Approved, page edited since");
    expect(approvalLabel(read({ k: rec("changes-requested", h1) }), "k", h1)).toBe("Changes requested");
    expect(approvalLabel(read({ k: rec("rejected", h1) }), "k", h1)).toBe("Rejected");
    expect(approvalLabel(read({ k: rec("maybe", h1) }), "k", h1)).toBe("Approvals file unreadable");
    expect(approvalLabel({ exists: true, valid: false, error: "bad", data: null }, "k", h1)).toBe("Approvals file unreadable");
    expect(approvalLabel(read({}), "toString", h1)).toBe("Not approved yet");
  });

  it("tabs follow the mockup and mark the current one", () => {
    expect(TABS.map((t) => t.label)).toEqual(["Overview", "Roadmap", "Architecture", "Decisions", "Research", "Questions", "Log"]);
    expect(isActiveTab("/", "/")).toBe(true);
    expect(isActiveTab("/", "/log")).toBe(false);
    expect(isActiveTab("/log", "/log")).toBe(true);
    expect(isActiveTab("/log", "/logbook")).toBe(false);
    expect(isActiveTab("/decisions", "/decisions/adr-0001")).toBe(true);
  });
});
