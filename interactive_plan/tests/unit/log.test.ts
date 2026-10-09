// ip-testing §1.6 (log part): heading regex, lenient bullet parsing, malformed headings -> LOG-FORMAT.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFrontmatterBytes } from "@/lib/wiki/frontmatter";
import { LOG_HEADING, parseLog } from "@/lib/wiki/log";
import { codes, REAL_WIKI } from "./helpers";

describe("LOG_HEADING (SCHEMA §12)", () => {
  it("matches valid headings and captures date, op, title", () => {
    const m = LOG_HEADING.exec("## [2026-10-08] code | p0.10 (IP-1 scaffold) | with pipes");
    expect(m?.slice(1)).toEqual(["2026-10-08", "code", "p0.10 (IP-1 scaffold) | with pipes"]);
  });
  it.each([
    "## [2026-10-8] code | x",
    "## [2026-10-08] build | x",
    "## [2026-10-08] code x",
    "## [2026-10-08] code | ",
    "## 2026-10-08 code | x",
    "### [2026-10-08] code | x",
  ])("rejects %j", (h) => expect(LOG_HEADING.test(h)).toBe(false));
});

describe("parseLog", () => {
  const body = [
    "# Log",
    "",
    "## [2026-10-01] plan | first",
    "",
    "- session: s01",
    "- pages: [a, b]",
    "- sources: [raw/x.md]",
    "- result: did things",
    "  continued detail line",
    "  - sub bullet: ignored",
    "- stales: []",
    "- next: more",
    "- commit: abc1234",
    "",
    "## [2026-10-02] correct | second",
    "",
    "- result: fixed",
  ].join("\n");

  it("splits entries and parses bullets leniently", () => {
    const { entries, findings } = parseLog(body, "wiki/log.md", 12);
    expect(findings).toEqual([]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: "2026-10-01",
      op: "plan",
      title: "first",
      session: "s01",
      pages: ["a", "b"],
      sources: ["raw/x.md"],
      result: "did things",
      stales: [],
      next: "more",
      commit: "abc1234",
      line: 14,
    });
    expect(entries[0].raw).toContain("continued detail line");
    expect(entries[1]).toMatchObject({ op: "correct", title: "second", pages: [], line: 26 });
    expect(entries[1].session).toBeUndefined();
  });

  it("malformed `## [` heading -> LOG-FORMAT, and the following bullets belong to no entry", () => {
    const r = parseLog("## [2026-10-01] plan | ok\n\n## [2026-10-02] bogus | bad\n\n- session: s01\n");
    expect(codes(r.findings)).toEqual(["LOG-FORMAT"]);
    expect(r.findings[0].line).toBe(3);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].session).toBeUndefined();
  });

  it("entries out of date order -> LOG-FORMAT", () => {
    const r = parseLog("## [2026-10-02] plan | a\n## [2026-10-01] plan | b\n## [2026-10-01] plan | c\n");
    expect(codes(r.findings)).toEqual(["LOG-FORMAT"]);
    expect(r.findings[0].message).toMatch(/2026-10-01 follows .*2026-10-02/);
  });

  it("a top-level bullet key outside SCHEMA §12 -> LOG-FORMAT", () => {
    const r = parseLog("## [2026-10-01] plan | a\n\n- note: x\n- Session: y\n- plain bullet without key\n");
    expect(codes(r.findings)).toEqual(["LOG-FORMAT", "LOG-FORMAT"]);
  });

  it("headings inside fenced code are ignored; other ## headings end an entry", () => {
    const r = parseLog("## [2026-10-01] plan | a\n```\n## [bad] heading\n- note: x\n```\n## Appendix\n- note: y\n");
    expect(r.findings).toEqual([]);
    expect(r.entries).toHaveLength(1);
  });

  it("the real wiki/log.md parses: one entry per `## [` heading", () => {
    const raw = readFileSync(path.join(REAL_WIKI, "log.md"));
    const p = parseFrontmatterBytes(raw, { repoPath: "wiki/log.md" });
    const r = parseLog(p.body, "wiki/log.md", p.bodyStartLine);
    const headings = p.body.split("\n").filter((l) => l.startsWith("## [")).length;
    expect(r.entries.length).toBe(headings);
    expect(r.entries.length).toBeGreaterThan(0);
    for (const e of r.entries) expect(raw.toString("utf8").split(/\r?\n/)[e.line - 1]).toMatch(LOG_HEADING);
  });
});
