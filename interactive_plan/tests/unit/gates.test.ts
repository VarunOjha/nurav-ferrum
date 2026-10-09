// Entry gate (ip-testing §1.3; ip-data-contract §8.3; SCHEMA §9.7 steps 1-4). Each test starts from
// a fresh temp copy of the mini-wiki, builds approvals from the loaded hashes and edits files on disk.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ApprovalRecord } from "@/lib/approvals/model";
import { BOOTSTRAP_PHASE, contradictions, entryGate, type EntryGate } from "@/lib/wiki/gates";
import type { WikiIndex } from "@/lib/wiki/load";
import { realApprovalsFingerprint, recordFor, tempMiniWiki, type TempWiki } from "./approvals-helpers";

const P1 = "phase-p1-fixture-build";
const P0 = "phase-p0-fixture-plan";
const P0_FILE = "phases/phase-p0-fixture-plan.md";
const ADR_FILE = "decisions/adr-0901-fixture-decision.md";
const OQ_FILE = "overview/ov-open-questions.md";
const SET = ["adr-0901", "comp-fixture-content", "comp-fixture-shell", "exp-fixture-startup", P1, "schema"];

const realBefore = realApprovalsFingerprint();
let t: TempWiki;
beforeEach(() => {
  t = tempMiniWiki();
});
afterEach(() => {
  t.cleanup();
  expect(realApprovalsFingerprint(), "real plan/approvals.json must be untouched").toBe(realBefore);
});

/** Approve every id of P1's dependency set and P0#exit at the current hashes. */
function approveAll(idx: WikiIndex): Record<string, ApprovalRecord> {
  const a: Record<string, ApprovalRecord> = {};
  for (const id of SET) a[id] = recordFor(idx.byId.get(id)!, id === "schema" ? { bootstrapHash: idx.bootstrapHash } : {});
  a[`${P0}#exit`] = recordFor(idx.byId.get(P0)!);
  return a;
}

/** P0 done, Q-901 answered: the fixture's only non-approval blockers removed. */
function makeGreen() {
  t.edit(P0_FILE, "status: in-progress\n", "status: done\n");
  t.edit(OQ_FILE, "- status: open\n", "- status: answered\n");
}

const byCheck = (g: EntryGate, c: string) => g.items.find((i) => i.check === c)!;
const failing = (g: EntryGate) => g.items.filter((i) => !i.ok).map((i) => i.check);

describe("entryGate", () => {
  it("dependency set = phase, decisions, components (listed or phase_introduced), experiments, schema", async () => {
    const idx = await t.load();
    expect(entryGate(idx, {}, P1).dependencySet).toEqual(SET);
    // phase_introduced alone puts a component in the set
    t.edit(`phases/${P1}.md`, "components: [comp-fixture-shell, comp-fixture-content]\n", "components: [comp-fixture-shell]\n");
    expect(entryGate(await t.load(), {}, P1).dependencySet).toEqual(SET);
  });

  it("all green", async () => {
    makeGreen();
    const idx = await t.load();
    const g = entryGate(idx, approveAll(idx), P1);
    expect(failing(g)).toEqual([]);
    expect(g.ok).toBe(true);
    expect(g.bootstrapException).toBe(false);
  });

  it("dependency not done", async () => {
    t.edit(OQ_FILE, "- status: open\n", "- status: answered\n");
    const idx = await t.load();
    const g = entryGate(idx, approveAll(idx), P1);
    expect(failing(g)).toEqual(["dependencies-done"]);
    expect(byCheck(g, "dependencies-done").details).toEqual([{ id: P0, detail: "status in-progress, exit APPROVED" }]);
    expect(g.ok).toBe(false);
  });

  it("dependency done but its exit not approved", async () => {
    makeGreen();
    const idx = await t.load();
    const a = approveAll(idx);
    delete a[`${P0}#exit`];
    let g = entryGate(idx, a, P1);
    expect(byCheck(g, "dependencies-done").details).toEqual([{ id: P0, detail: "status done, exit PENDING" }]);
    a[`${P0}#exit`] = recordFor(idx.byId.get(P0)!, { status: "changes-requested" });
    g = entryGate(idx, a, P1);
    expect(byCheck(g, "dependencies-done").details).toEqual([{ id: P0, detail: "status done, exit CHANGES_REQUESTED" }]);
    expect(g.ok).toBe(false);
  });

  it("a STALE ADR in the dependency set blocks; a volatile-only edit does not", async () => {
    makeGreen();
    let idx = await t.load();
    const a = approveAll(idx);
    t.edit(ADR_FILE, "status: proposed\n", "status: accepted\n");
    idx = await t.load();
    expect(entryGate(idx, a, P1).ok).toBe(true); // APPROVED_VOLATILE_DRIFT counts
    t.write(ADR_FILE, t.read(ADR_FILE) + "\nA new paragraph.\n");
    idx = await t.load();
    const g = entryGate(idx, a, P1);
    expect(failing(g)).toEqual(["dependency-set-approved"]);
    expect(byCheck(g, "dependency-set-approved").details).toEqual([{ id: "adr-0901", detail: "STALE" }]);
  });

  it("unapproved members are listed with their states", async () => {
    makeGreen();
    const idx = await t.load();
    const a = approveAll(idx);
    delete a.schema;
    a["exp-fixture-startup"] = recordFor(idx.byId.get("exp-fixture-startup")!, { status: "rejected" });
    const g = entryGate(idx, a, P1);
    expect(byCheck(g, "dependency-set-approved").details).toEqual([
      { id: "exp-fixture-startup", detail: "REJECTED" },
      { id: "schema", detail: "PENDING" },
    ]);
  });

  it("a blocking open question blocks", async () => {
    t.edit(P0_FILE, "status: in-progress\n", "status: done\n");
    const idx = await t.load();
    const g = entryGate(idx, approveAll(idx), P1);
    expect(failing(g)).toEqual(["no-blocking-questions"]);
    expect(byCheck(g, "no-blocking-questions").details).toEqual([{ id: "Q-901", detail: `blocks ${P1}` }]);
  });

  it("an open question blocking only ids outside the set does not block", async () => {
    makeGreen();
    t.edit(OQ_FILE, "- blocking: []\n- status: answered\n", "- blocking: [risk-r91]\n- status: open\n");
    const idx = await t.load();
    expect(entryGate(idx, approveAll(idx), P1).ok).toBe(true);
  });

  it("a malformed question section fails closed (open, blocking every phase)", async () => {
    makeGreen();
    t.edit(OQ_FILE, "- blocking: []\n- status: answered\n", "- blocking: []\n");
    const idx = await t.load();
    const g = entryGate(idx, approveAll(idx), P1);
    expect(failing(g)).toEqual(["no-blocking-questions"]);
    expect(byCheck(g, "no-blocking-questions").ids).toEqual(["Q-902"]);
    expect(byCheck(g, "no-blocking-questions").details[0].detail).toMatch(/Q-FORMAT/);
  });

  it("an unregistered CONTRADICTION blockquote blocks; one naming a registered Q does not (that Q's blocking decides)", async () => {
    makeGreen();
    const idx0 = await t.load();
    const a = approveAll(idx0);
    // Unregistered: names no Q id at all, then a Q id missing from the register.
    t.write(ADR_FILE, t.read(ADR_FILE) + "\n> **CONTRADICTION:** a new source disagrees.\n> Still open.\n");
    let idx = await t.load();
    a["adr-0901"] = recordFor(idx.byId.get("adr-0901")!); // re-approved: only the contradiction rule fails
    let g = entryGate(idx, a, P1);
    expect(failing(g)).toEqual(["no-unregistered-contradictions"]);
    const adr = idx.byId.get("adr-0901")!;
    const line = adr.bodyStartLine + adr.body.split("\n").findIndex((l) => l.startsWith("> **CONTRADICTION:**"));
    expect(byCheck(g, "no-unregistered-contradictions").ids).toEqual([`adr-0901:${line}`]);

    t.write(ADR_FILE, t.read(ADR_FILE).replace("> Still open.", "> Tracked as Q-999."));
    idx = await t.load();
    a["adr-0901"] = recordFor(idx.byId.get("adr-0901")!);
    expect(failing(entryGate(idx, a, P1))).toEqual(["no-unregistered-contradictions"]);

    // Registered: names Q-902 (answered, blocking []), so it no longer holds this gate.
    t.write(ADR_FILE, t.read(ADR_FILE).replace("> Tracked as Q-999.", "> Tracked as Q-902."));
    idx = await t.load();
    a["adr-0901"] = recordFor(idx.byId.get("adr-0901")!);
    g = entryGate(idx, a, P1);
    expect(failing(g)).toEqual([]);
    expect(g.ok).toBe(true);
  });

  it("unknown or non-phase id -> phase-exists fails", async () => {
    const idx = await t.load();
    for (const id of ["phase-p9-nope", "adr-0901"]) {
      const g = entryGate(idx, {}, id);
      expect(g.ok).toBe(false);
      expect(failing(g)).toEqual(["phase-exists"]);
      expect(g.dependencySet).toEqual([]);
    }
  });

  it("P0 bootstrap exception: ok whatever the items say, items stay informative", async () => {
    expect(BOOTSTRAP_PHASE).toBe("phase-p0-planning");
    const idx = await t.load();
    const g = entryGate(idx, {}, P1, { bootstrapPhase: P1 });
    expect(g.bootstrapException).toBe(true);
    expect(g.ok).toBe(true);
    expect(failing(g).length).toBeGreaterThan(0);
    expect(entryGate(idx, {}, P1).ok).toBe(false);
  });

  it("the gate never writes: the wiki copy is byte-identical after evaluation", async () => {
    const before = t.read(`phases/${P1}.md`);
    const idx = await t.load();
    entryGate(idx, approveAll(idx), P1);
    expect(t.read(`phases/${P1}.md`)).toBe(before);
  });
});

describe("contradictions()", () => {
  it("collects quote continuation lines and the Q ids they name", () => {
    const body = "intro\n> **CONTRADICTION:** x Q-101\n> more Q-005, Q-101\nafter\n> **CONTRADICTION:** none\n";
    expect(contradictions({ body, bodyStartLine: 10 })).toEqual([
      { line: 11, questions: ["Q-005", "Q-101"] },
      { line: 14, questions: [] },
    ]);
    expect(contradictions({ body: "> **Contradiction:** lower case is not the marker\n", bodyStartLine: 1 })).toEqual([]);
  });
});
