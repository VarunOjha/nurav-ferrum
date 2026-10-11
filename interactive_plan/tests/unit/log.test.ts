// ip-testing §1.6 (log part): heading regex, lenient bullet parsing, malformed headings -> LOG-FORMAT.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFrontmatterBytes } from "@/lib/wiki/frontmatter";
import { inlineList, LOG_BULLET_KEYS, LOG_HEADING, parseLog } from "@/lib/wiki/log";
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

  it("the optional `- time: HH:MM` bullet (owner's plan of 2026-10-10) is read; a bad value -> LOG-FORMAT", () => {
    const ok = parseLog("## [2026-10-10] plan | a\n\n- session: s01\n- time: 21:41\n- result: done\n## [2026-10-10] plan | b\n\n- time: 00:05\n");
    expect(ok.findings).toEqual([]);
    expect(ok.entries.map((e) => e.time)).toEqual(["21:41", "00:05"]);
    // Older entries have no time and stay valid.
    expect(parseLog("## [2026-10-08] plan | old\n\n- session: s01\n").entries[0].time).toBeUndefined();
    for (const bad of ["9:41", "24:00", "21:60", "21:41:00", "9pm", ""]) {
      const r = parseLog(`## [2026-10-10] plan | a\n\n- time: ${bad}\n`, "wiki/log.md", 5);
      expect(codes(r.findings), bad).toEqual(["LOG-FORMAT"]);
      expect(r.findings[0].message, bad).toMatch(/24-hour time written HH:MM/);
      expect(r.findings[0].line, bad).toBe(7);
      expect(r.entries[0].time, bad).toBeUndefined();
    }
  });

  it("LOG_BULLET_KEYS lists `time` right after `session` (SCHEMA §12)", () => {
    expect(LOG_BULLET_KEYS).toEqual(["session", "time", "pages", "sources", "result", "stales", "next", "commit"]);
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

// IP-9 review: a bracketed list followed by a parenthetical (wiki/log.md line 352 and others) produced
// bogus ids such as "[ip-testing" and "ip-approvals-api] (no approvals.json exists".
describe("bracketed lists with a trailing note", () => {
  const LINE_352 =
    "- stales: [ip-routes-and-views, ip-testing, ip-build-plan, ip-spec] (no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)";
  it("links only the ids inside the brackets and keeps the parenthetical as a note", () => {
    const body = `## [2026-10-09] decide | x\n\n- session: s01\n- pages: [a, b]\n${LINE_352}\n`;
    const { entries, findings } = parseLog(body);
    expect(findings).toEqual([]);
    expect(entries[0].stales).toEqual(["ip-routes-and-views", "ip-testing", "ip-build-plan", "ip-spec"]);
    expect(entries[0].notes?.stales).toBe("(no approvals.json exists, so nothing is actually stale; the ip-* pages are re-approved in the app after IP-10)");
    expect(entries[0].pages).toEqual(["a", "b"]);
    expect(entries[0].notes?.pages).toBeUndefined();
  });
  it("inlineList: plain lists, empty lists, unbracketed values", () => {
    expect(inlineList("[schema] (no approvals exist yet)")).toEqual({ items: ["schema"], note: "(no approvals exist yet)" });
    expect(inlineList("[]")).toEqual({ items: [], note: null });
    expect(inlineList("a, b")).toEqual({ items: ["a", "b"], note: null });
    expect(inlineList('["x", \'y\']')).toEqual({ items: ["x", "y"], note: null });
  });
  it("on the real wiki/log.md no stales/pages id contains brackets, parentheses or spaces", async () => {
    const { entries } = parseLog(readFileSync(path.join(REAL_WIKI, "log.md"), "utf8").replace(/\r\n/g, "\n"));
    const bad = entries.flatMap((e) => [...e.pages, ...e.stales]).filter((id) => /[[\]() ]/.test(id));
    expect(bad).toEqual([]);
  });
});
