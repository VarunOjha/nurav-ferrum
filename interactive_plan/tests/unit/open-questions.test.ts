// ip-data-contract §5.3: ov-open-questions parsing, fail closed (Q-FORMAT). Uses the real register
// (read-only, read at test time) plus broken variants derived from it in memory.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseFrontmatterBytes } from "@/lib/wiki/frontmatter";
import { parseOpenQuestions } from "@/lib/wiki/openQuestions";
import { codes, REAL_WIKI } from "./helpers";

let body = "";
let start = 1;
beforeAll(() => {
  const raw = readFileSync(path.join(REAL_WIKI, "overview", "ov-open-questions.md"));
  const p = parseFrontmatterBytes(raw, { repoPath: "wiki/overview/ov-open-questions.md" });
  body = p.body;
  start = p.bodyStartLine;
});

const Q = (id: string, lines: string[]) => [`## ${id} Title of ${id}`, "", ...lines, ""].join("\n");

describe("the real register", () => {
  it("parses every `## Q-NNN` section with no Q-FORMAT findings", () => {
    const r = parseOpenQuestions(body, "wiki/overview/ov-open-questions.md", start);
    const sections = body.split("\n").filter((l) => /^## Q-\d{3} /.test(l)).length;
    expect(r.findings).toEqual([]);
    expect(r.questions.length).toBe(sections);
    expect(r.questions.length).toBeGreaterThan(0);
    const q6 = r.questions.find((q) => q.id === "Q-006")!;
    expect(q6).toMatchObject({ status: "answered", blocking: ["comp-interactive-plan"], blocksAll: false, asked: "2026-10-08" });
    expect(q6.answer).toContain("raw/owner/2026-10-08-s01-wave0.md");
    for (const q of r.questions) expect(["open", "answered", "withdrawn"]).toContain(q.status);
  });

  it("non-Q `##` headings end a section (the Summary table is not parsed as fields)", () => {
    const r = parseOpenQuestions(body + "\n## Appendix\n\n- status: nonsense\n");
    expect(r.findings).toEqual([]);
  });
});

describe("broken variants (fail closed)", () => {
  const ok = Q("Q-900", ["- asked: 2026-10-01", "- blocking: [phase-p1-foundation, phase-p2-x#exit]", "- status: open", "- answer: none"]);
  it("a valid section", () => {
    const r = parseOpenQuestions(ok);
    expect(r.findings).toEqual([]);
    expect(r.questions[0]).toMatchObject({
      id: "Q-900",
      title: "Title of Q-900",
      status: "open",
      blocking: ["phase-p1-foundation", "phase-p2-x#exit"],
      blocksAll: false,
      line: 1,
    });
  });
  it.each([
    ["no status line", Q("Q-901", ["- blocking: []"])],
    ["repeated status", Q("Q-901", ["- blocking: []", "- status: open", "- status: answered"])],
    ["unknown status", Q("Q-901", ["- blocking: []", "- status: pending"])],
    ["status with trailing text", Q("Q-901", ["- blocking: []", "- status: answered (see below)"])],
    ["unparsable blocking (scalar)", Q("Q-901", ["- blocking: phase-p1-foundation", "- status: answered"])],
    ["unparsable blocking (bad chars)", Q("Q-901", ["- blocking: [Phase P1]", "- status: answered"])],
    ["no blocking line", Q("Q-901", ["- status: answered"])],
    ["repeated blocking", Q("Q-901", ["- blocking: []", "- blocking: [x]", "- status: answered"])],
  ])("%s -> Q-FORMAT, treated as open and blocking every phase", (_name, text) => {
    const r = parseOpenQuestions(ok + "\n" + text);
    expect(codes(r.findings)).toEqual(["Q-FORMAT"]);
    expect(r.findings[0].severity).toBe("error");
    const q = r.questions.find((x) => x.id === "Q-901")!;
    expect(q.status).toBe("open");
    expect(q.blocksAll).toBe(true);
    expect(r.questions.find((x) => x.id === "Q-900")!.blocksAll).toBe(false);
  });
  it("a duplicate Q id -> Q-FORMAT on the second section", () => {
    const r = parseOpenQuestions(ok + "\n" + Q("Q-900", ["- blocking: []", "- status: answered"]));
    expect(codes(r.findings)).toEqual(["Q-FORMAT"]);
    expect(r.findings[0].message).toMatch(/duplicate/);
    expect(r.questions[1]).toMatchObject({ status: "open", blocksAll: true });
  });
  it("sections inside fenced code are ignored", () => {
    const r = parseOpenQuestions(ok + "\n```\n## Q-905 in code\n```\n");
    expect(r.questions.map((q) => q.id)).toEqual(["Q-900"]);
  });
});
