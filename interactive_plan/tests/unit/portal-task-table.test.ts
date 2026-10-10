// The phase popup's tasks table (owner request 2026-10-10, wiki/raw/owner/2026-10-10-s01-task-table-columns.md):
// the column order, the Logic column's steps (lib/portal/view.ts) and the task fields the schema now
// requires (what, why, how; plan/portal/schema/phase.schema.json via lib/portal/schemas.gen.ts).
import { describe, expect, it } from "vitest";
import { PhaseFile } from "@/lib/portal/schemas.gen";
import { chainSteps, TASK_COLUMNS } from "@/lib/portal/view";

const task = {
  id: "p1.1",
  title: "Confirm the toolchain",
  status: "Not started",
  what: "Checks that every build tool is installed and writes down its exact version.",
  why: "Results can only be repeated when we know which tools made them.",
  how: "Run each tool's version command and save the output as evidence.",
  chain: "Tools installed → record exact versions → every later result names its tools.",
  check: "Each tool prints a version.",
  script: null,
};
const phase = (tasks: unknown[]) => ({
  id: "phase-p1-foundation",
  short: "P1",
  title: "Foundation",
  one_line_goal: "Repo ready",
  summary: "Get the tools ready.",
  status: "Not started",
  progress: { done: 0, total: tasks.length },
  step_order: ["Tools"],
  tasks,
  test_gate: { explanation: "Tools work → gate passes.", rows: [{ check: "Tools", proves: "Installed" }], script: null },
  related: [],
  source: { wiki_path: "wiki/phases/phase-p1-foundation.md", content_hash: `sha256:${"0".repeat(64)}` },
});

describe("tasks table columns", () => {
  it("has the owner's eight columns in his order", () => {
    expect([...TASK_COLUMNS]).toEqual(["Id", "Title", "What", "Why", "How", "Logic", "Check script", "State"]);
  });
});

describe("chainSteps (the Logic column)", () => {
  it("puts each step of the thought chain on its own line, without the arrows", () => {
    expect(chainSteps("Cause → action → why it matters")).toEqual(["Cause", "action", "why it matters"]);
  });
  it("keeps a chain without an arrow as one step", () => {
    expect(chainSteps("Just one thing")).toEqual(["Just one thing"]);
  });
  it("drops empty steps and trims spaces", () => {
    expect(chainSteps("  A →→  B  ")).toEqual(["A", "B"]);
  });
  it("never cuts a reference link that contains an arrow", () => {
    const text = "See [the A → B flow](ref:adr-0007) → then decide";
    expect(chainSteps(text)).toEqual([text]);
  });
  it("splits around a complete reference link", () => {
    expect(chainSteps("Read [the decision](ref:adr-0007) → decide")).toEqual(["Read [the decision](ref:adr-0007)", "decide"]);
  });
});

describe("task fields what, why and how", () => {
  it("accepts a task that has all three", () => {
    expect(PhaseFile.safeParse(phase([task])).success).toBe(true);
  });
  for (const field of ["what", "why", "how"] as const) {
    it(`rejects a task without "${field}"`, () => {
      const rest: Record<string, unknown> = { ...task };
      delete rest[field];
      const r = PhaseFile.safeParse(phase([rest]));
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toContain(field);
    });
    it(`rejects an empty, a two-line or a too-long "${field}"`, () => {
      for (const bad of ["", "line one\nline two", "x".repeat(241)]) {
        expect(PhaseFile.safeParse(phase([{ ...task, [field]: bad }])).success).toBe(false);
      }
      expect(PhaseFile.safeParse(phase([{ ...task, [field]: "x".repeat(240) }])).success).toBe(true);
    });
  }
});
