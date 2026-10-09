// Loader (ip-data-contract §2, §4.1, §5.1): mini-wiki is clean, broken-wiki gives exactly the codes
// named in its file names, the cache re-parses only changed files, STATUS.md is optional.
import { cpSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLinks } from "@/lib/wiki/links";
import { clearWikiCache, linkTargetInfo, loadWiki, type WikiIndex } from "@/lib/wiki/load";
import { BROKEN_WIKI, FIXTURES, loadBroken, loadMini, MINI_STATUS, MINI_WIKI } from "./helpers";

const allFindings = (idx: WikiIndex) => {
  const info = linkTargetInfo(idx);
  return idx.pages.flatMap((p) => [
    ...p.findings,
    ...(p.kind === "raw" ? [] : checkLinks(p.links, p.repoPath, info, p.id ?? undefined)),
  ]);
};

describe("mini-wiki (clean fixture)", () => {
  let idx: WikiIndex;
  beforeAll(async () => {
    clearWikiCache();
    idx = await loadMini();
  });

  it("loads every page with zero findings (errors and warnings) and zero dangling links", () => {
    expect(allFindings(idx)).toEqual([]);
    for (const p of idx.pages) if (p.kind !== "raw") expect(p.fm, p.path).not.toBeNull();
  });

  it("has one clean page of every type, ids in the fixture range", () => {
    const types = new Set(idx.pages.map((p) => p.fm?.type).filter(Boolean));
    expect([...types].sort()).toEqual(
      [
        "component",
        "decision",
        "experiment",
        "glossary",
        "handoff",
        "hypothesis",
        "index",
        "log",
        "metric",
        "operations",
        "overview",
        "phase",
        "quality",
        "research-note",
        "research-question",
        "risk",
        "schema",
        "status",
        "workload",
      ].sort(),
    );
    expect(idx.byId.has("adr-0901")).toBe(true);
    expect(idx.byId.has("risk-r91")).toBe(true);
    expect(idx.byId.has("rq-91")).toBe(true);
  });

  it("builds byId, byPath, kinds and repo paths", () => {
    const adr = idx.byId.get("adr-0901")!;
    expect(adr.path).toBe("decisions/adr-0901-fixture-decision.md");
    expect(adr.repoPath).toBe("wiki/decisions/adr-0901-fixture-decision.md");
    expect(adr.kind).toBe("wiki");
    expect(idx.byPath.get(adr.path)).toBe(adr);
    expect(idx.byId.get("research-fixture-note")!.kind).toBe("raw-research");
    const raw = idx.byPath.get("raw/00-fixture-source.md")!;
    expect(raw.kind).toBe("raw");
    expect(raw.id).toBeNull();
    expect(raw.findings).toEqual([]);
    const st = idx.byId.get("status-live")!;
    expect(st.kind).toBe("status");
    expect(st.repoPath).toBe("status/STATUS.md");
    expect(idx.duplicates.size).toBe(0);
    expect(idx.files.has("raw/research/")).toBe(true);
    expect(idx.files.has("raw/00-fixture-source.md")).toBe(true);
  });

  it("parses STATUS.md frontmatter and the Next action section", () => {
    expect(idx.status).toMatchObject({
      id: "status-live",
      current_phase: "phase-p0-fixture-plan",
      current_task: "p0.1",
      next_action: "Run npm test in the fixture",
      blocked_on: ["Q-901"],
      last_handoff: "handoff-2026-10-01-s91",
    });
    expect(idx.statusNextAction).toBe("1. Run `npm test`.");
  });

  it("parses the log and the open-questions register", () => {
    expect(idx.log.map((e) => [e.date, e.op, e.title])).toEqual([
      ["2026-10-01", "plan", "fixture wiki created"],
      ["2026-10-02", "code", "p0.1 fixture loader"],
    ]);
    expect(idx.log[1]).toMatchObject({ commit: "abc1234", stales: ["adr-0901"] });
    expect(idx.openQuestions.map((q) => [q.id, q.status, q.blocking])).toEqual([
      ["Q-901", "open", ["phase-p1-fixture-build"]],
      ["Q-902", "answered", []],
    ]);
  });

  it("computes backlinks from frontmatter refs and body links", () => {
    expect([...idx.backlinks.get("adr-0901")!].sort()).toEqual(
      ["index", "ov-fixture-project", "phase-p1-fixture-build"].sort(),
    );
    expect(idx.backlinks.get("comp-fixture-content")!.has("comp-fixture-shell")).toBe(true); // connects.to + body link
    expect(idx.backlinks.get("phase-p0-fixture-plan")!.has("status-live")).toBe(true); // STATUS current_phase
    expect(idx.backlinks.get("Q-901")!.has("status-live")).toBe(true); // blocked_on
  });

  it("extracts headings, links and integrity tags with file line numbers", () => {
    const ov = idx.byId.get("ov-fixture-project")!;
    expect(ov.headings.map((h) => h.slug)).toEqual(["fixture-project-overview", "structure-of-the-fixture"]);
    expect(ov.links.map((l) => [l.resolvedPath, l.anchor])).toEqual([
      ["decisions/adr-0901-fixture-decision.md", "decision"],
      ["architecture/components/comp-fixture-shell.md", null],
    ]);
    const lines = readFileSync(path.join(MINI_WIKI, ov.path), "utf8").split("\n");
    expect(lines[ov.headings[0].line - 1]).toBe("# Fixture project overview");
    const exp = idx.byId.get("exp-fixture-startup")!;
    expect(exp.unverifiedTags).toEqual([{ phase: "phase-p1-fixture-build", line: exp.bodyStartLine + 3 }]);
  });

  it("leaves hashes null until IP-3 wires lib/approvals/hash.ts", () => {
    expect(idx.pages.every((p) => p.contentHash === null && p.scopeHash === null)).toBe(true);
  });
});

/** Codes encoded in a broken-wiki file name: `<id-part>--CODE[--CODE...].md`. */
function expectedFromName(p: string): string[] {
  const base = path.posix.basename(p, ".md");
  const parts = base.split("--");
  return parts.slice(1).sort();
}

describe("broken-wiki (golden)", () => {
  let idx: WikiIndex;
  beforeAll(async () => {
    clearWikiCache();
    idx = await loadBroken();
  });

  it("each file triggers exactly the codes named in its file name", () => {
    const info = linkTargetInfo(idx);
    const named = idx.pages.filter((p) => p.path.includes("--"));
    expect(named.length).toBe(21);
    for (const p of named) {
      const got = new Set([...p.findings, ...checkLinks(p.links, p.repoPath, info)].map((f) => f.code));
      expect([...got].sort(), p.path).toEqual(expectedFromName(p.path));
    }
  });

  it("log.md: malformed heading, out-of-order entry, unknown bullet key -> 3 LOG-FORMAT", () => {
    const log = idx.byPath.get("log.md")!;
    expect(log.findings.map((f) => [f.code, f.line])).toEqual([
      ["LOG-FORMAT", 19],
      ["LOG-FORMAT", 23],
      ["LOG-FORMAT", 30],
    ]);
    expect(idx.log.map((e) => e.date)).toEqual(["2026-10-02", "2026-10-01", "2026-10-04"]);
  });

  it("ov-open-questions: 4 malformed sections -> 4 Q-FORMAT, all treated as open and blocking", () => {
    const oq = idx.byId.get("ov-open-questions")!;
    expect(oq.findings.map((f) => f.code)).toEqual(["Q-FORMAT", "Q-FORMAT", "Q-FORMAT", "Q-FORMAT"]);
    expect(idx.openQuestions.map((q) => [q.id, q.blocksAll])).toEqual([
      ["Q-950", false],
      ["Q-951", true],
      ["Q-952", true],
      ["Q-953", true],
      ["Q-950", true],
    ]);
  });

  it("other files are clean; duplicates map lists both paths; a missing STATUS.md is not a crash", () => {
    for (const p of idx.pages.filter((x) => !x.path.includes("--") && !["log.md", "overview/ov-open-questions.md"].includes(x.path))) {
      expect(p.findings, p.path).toEqual([]);
    }
    expect(idx.duplicates.get("adr-0961")).toEqual([
      "wiki/decisions/adr-0961-a--ID-DUP.md",
      "wiki/decisions/adr-0961-b--ID-DUP.md",
    ]);
    expect(idx.status).toBeNull();
    expect(idx.statusNextAction).toBeNull();
    expect(idx.byPath.get("decisions/adr-0953--FM-MISSING.md")!.id).toBeNull();
  });

  it("cross-page findings do not accumulate across loads (cache hits)", async () => {
    const again = await loadBroken();
    const a = again.byPath.get("decisions/adr-0961-a--ID-DUP.md")!;
    expect(a.findings.map((f) => f.code)).toEqual(["ID-DUP"]);
    expect(again.byPath.get("log.md")!.findings).toHaveLength(3);
  });
});

describe("cache (mtime + size)", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "plan wiki cache "));
    cpSync(MINI_WIKI, path.join(dir, "wiki"), { recursive: true });
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("re-parses only changed files", async () => {
    clearWikiCache();
    const cfg = { wikiDir: path.join(dir, "wiki"), statusFile: MINI_STATUS, repoRoot: FIXTURES };
    const one = await loadWiki(cfg);
    const two = await loadWiki(cfg);
    expect(two.byId.get("adr-0901")!.fm).toBe(one.byId.get("adr-0901")!.fm); // same cached object
    const file = path.join(dir, "wiki", "risks", "risk-r91-fixture-risk.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("likelihood: 3", "likelihood: 2"));
    const future = new Date(Date.now() + 5000);
    utimesSync(file, future, future);
    const three = await loadWiki(cfg);
    expect(three.byId.get("risk-r91")!.fm).toMatchObject({ likelihood: 2 });
    expect(three.byId.get("risk-r91")!.fm).not.toBe(two.byId.get("risk-r91")!.fm);
    expect(three.byId.get("adr-0901")!.fm).toBe(one.byId.get("adr-0901")!.fm);
  });

  it("a page that becomes invalid shows findings instead of failing the load", async () => {
    const cfg = { wikiDir: path.join(dir, "wiki"), statusFile: MINI_STATUS, repoRoot: FIXTURES };
    const file = path.join(dir, "wiki", "decisions", "adr-0901-fixture-decision.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("decided_by: claude-proposed\n", ""));
    const idx = await loadWiki(cfg);
    const adr = idx.byId.get("adr-0901")!;
    expect(adr.fm).toBeNull();
    expect(adr.findings.map((f) => f.code)).toEqual(["FM-MISSING"]);
    expect(idx.pages.length).toBeGreaterThan(20);
  });
});

it("the broken-wiki fixture directory exists next to mini-wiki", () => {
  expect(path.dirname(BROKEN_WIKI)).toBe(FIXTURES);
});
