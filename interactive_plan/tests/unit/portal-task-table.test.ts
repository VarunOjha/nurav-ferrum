// The phase popup's tasks table (owner request 2026-10-10, wiki/raw/owner/2026-10-10-s01-task-table-columns.md):
// the column order, the Logic column's steps (lib/portal/view.ts) and the task fields the schema now
// requires (what, why, how; plan/portal/schema/phase.schema.json via lib/portal/schemas.gen.ts).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PhaseFile } from "@/lib/portal/schemas.gen";
import { chainJoin, chainSteps, TASK_COLUMNS } from "@/lib/portal/view";

const PHASES_DIR = path.resolve(__dirname, "..", "..", "..", "plan", "portal", "phases");

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

// Review 2026-10-10: one task chain had arrows inside its middle step, so the Logic column showed 9
// "steps". The schema now allows exactly three steps; these tests keep that rule and the real data honest.
describe("task chains have exactly three steps", () => {
  it("rejects a task chain with fewer or more than two arrows", () => {
    for (const bad of ["Cause → action", "A → B → C → D", "Question → prediction → experiment → raw data → conclusion", "A →→ B"]) {
      expect(PhaseFile.safeParse(phase([{ ...task, chain: bad }])).success, bad).toBe(false);
    }
    expect(PhaseFile.safeParse(phase([{ ...task, chain: "Cause → action, with a list of a, b and c → why it matters" }])).success).toBe(true);
  });
  it("every task in the real phase files splits into exactly three Logic steps", () => {
    const files = readdirSync(PHASES_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    let tasks = 0;
    for (const f of files) {
      const data = JSON.parse(readFileSync(path.join(PHASES_DIR, f), "utf8")) as { tasks: { id: string; chain: string }[] };
      for (const t of data.tasks) {
        tasks += 1;
        expect(chainSteps(t.chain), `${f} ${t.id}`).toHaveLength(3);
      }
    }
    expect(tasks).toBeGreaterThan(0);
  });
  it("names the hidden joining words a screen reader hears instead of the arrows", () => {
    expect([1, 2].map(chainJoin)).toEqual(["then", "so"]);
  });
});
