// Parity with the Python fallback (ip-testing §2; SCHEMA §9.3, Q-216): tools/quick_lint.py and the
// TS lint report the same {code, path} set on mini-wiki and broken-wiki for the codes the Python script
// covers, apart from an explicit list of known differences (below). The fixture is copied to a temp
// repo root (quick_lint.py reads wiki/** and STATUS.md from its cwd). Skipped with a visible message
// when Python is absent.
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildLintContext } from "@/lib/lint/context";
import { runLint } from "@/lib/lint/run";
import { clearWikiCache } from "@/lib/wiki/load";
import { BROKEN_WIKI, MINI_STATUS, MINI_WIKI, REPO_ROOT } from "./helpers";

/** The SCHEMA §9.3 codes tools/quick_lint.py checks (its docstring). */
const PY_CODES = ["FILE-ENCODING", "FM-MISSING", "FM-ENUM", "FM-TYPE-DIR", "ID-PATTERN", "ID-DUP", "REF-DANGLING", "UNV-NOPHASE", "INDEX-MISSING"];

/**
 * Known differences (decided 2026-10-09, IP-5): the stdlib Python fallback has no YAML parser and
 * implements a subset of the checks. Each entry says why; any other difference fails the test.
 */
const KNOWN_PY_ONLY: Record<string, string> = {
  "FM-ENUM wiki/decisions/adr-0963--FM-VOLATILE.md": "the line parser reads the folded-scalar indicator `>-` as the status; TS parses YAML and reports FM-VOLATILE",
  "FM-MISSING wiki/decisions/adr-0950--FILE-ENCODING.md": "Python does not strip the BOM, so no `---` at byte 0; TS reports FILE-ENCODING only (IP-2)",
  "INDEX-MISSING wiki/decisions/adr-0964--FM-MISSING.md": "the line parser finds an id in invalid YAML; TS has no id for an unparsable page",
  "INDEX-MISSING wiki/decisions/adr-0965--FM-MISSING.md": "same (duplicate key)",
  "INDEX-MISSING wiki/decisions/adr-0966--FM-YAML-SUBSET--FM-MISSING.md": "same (multi-document stream)",
  "REF-DANGLING wiki/index.md": "Python checks index.md lines as body links; TS reports a broken index line once, as INDEX-MISSING",
};
const KNOWN_TS_ONLY: Record<string, string> = {
  "FM-MISSING wiki/decisions/adr-0964--FM-MISSING.md": "YAML error (unquoted `: `) the line parser cannot see",
  "FM-MISSING wiki/decisions/adr-0965--FM-MISSING.md": "YAML error (duplicate key)",
  "FM-MISSING wiki/decisions/adr-0966--FM-YAML-SUBSET--FM-MISSING.md": "YAML error (multi-document stream)",
  "ID-DUP wiki/decisions/adr-0961-a--ID-DUP.md": "TS reports every file of a duplicate id; Python only the later one",
  "REF-DANGLING wiki/decisions/adr-0968--REF-DANGLING.md": "heading-anchor check (TS only)",
  "REF-DANGLING wiki/overview/ov-broken-source--REF-DANGLING.md": "sources path existence (TS only)",
  "REF-DANGLING wiki/overview/ov-broken-tagphase--REF-DANGLING.md": "integrity-tag phase resolution (TS only)",
  "REF-DANGLING wiki/risks/risk-r96--REF-DANGLING.md": "task reference (`spike`) resolution (TS only)",
};

const python = spawnSync("python", ["--version"], { encoding: "utf8" });
const hasPython = python.status === 0;
if (!hasPython) console.warn("lint-parity: python not found, parity tests SKIPPED (not silently: see this message)");

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

async function both(wiki: string, status: string | null): Promise<{ py: string[]; ts: string[]; pyOut: string }> {
  const root = mkdtempSync(path.join(os.tmpdir(), "ip5 parity "));
  dirs.push(root);
  cpSync(wiki, path.join(root, "wiki"), { recursive: true });
  if (status) copyFileSync(status, path.join(root, "STATUS.md"));
  const r = spawnSync("python", [path.join(REPO_ROOT, "tools", "quick_lint.py")], { cwd: root, encoding: "utf8" });
  const py = new Set<string>();
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = /^ERROR (\S+)\s+(.+?): /.exec(line);
    if (m) py.add(`${m[1]} ${m[2]}`);
  }
  clearWikiCache();
  const ctx = await buildLintContext(
    { wikiDir: path.join(root, "wiki"), statusFile: path.join(root, "STATUS.md"), repoRoot: root, approvalsFile: path.join(root, "plan", "approvals.json") },
    { git: false, today: "2026-10-09" },
  );
  const ts = new Set(
    runLint(ctx)
      .findings.filter((f) => f.severity === "error" && PY_CODES.includes(f.code))
      .map((f) => `${f.code} ${f.path}`),
  );
  return { py: [...py].sort(), ts: [...ts].sort(), pyOut: r.stdout };
}

describe.runIf(hasPython)(`parity with tools/quick_lint.py (${hasPython ? python.stdout.trim() : "no python"})`, () => {
  it("mini-wiki: both clean", async () => {
    const { py, ts, pyOut } = await both(MINI_WIKI, MINI_STATUS);
    expect(py, pyOut).toEqual([]);
    expect(ts).toEqual([]);
  });

  it("broken-wiki: the same {code, path} set, apart from the documented known differences", async () => {
    const { py, ts, pyOut } = await both(BROKEN_WIKI, null);
    const onlyPython = py.filter((x) => !ts.includes(x));
    const onlyTs = ts.filter((x) => !py.includes(x));
    console.log(`python: ${py.length} {code,path} pairs; TS: ${ts.length}; shared: ${py.length - onlyPython.length}`);
    expect(py.length - onlyPython.length).toBeGreaterThanOrEqual(15);
    expect({ onlyPython, onlyTs }, pyOut).toEqual({ onlyPython: Object.keys(KNOWN_PY_ONLY).sort(), onlyTs: Object.keys(KNOWN_TS_ONLY).sort() });
  });
});
