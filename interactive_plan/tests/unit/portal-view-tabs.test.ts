// View helpers of the Roadmap, Architecture, Decisions, Questions and Log tabs (lib/portal/view.ts)
// and the popup ids (lib/portal/dialogs.ts). Pure functions; the real portal files are used where the
// expectation follows from them.
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detailDialogId, phaseDialogId } from "@/lib/portal/dialogs";
import { loadPortalUncached } from "@/lib/portal/load";
import type { Architecture, Log, Questions, Risks, Roadmap } from "@/lib/portal/schemas.gen";
import {
  decisionTone,
  firstSentence,
  layerRows,
  layerShortName,
  newestFirst,
  questionsByStatus,
  riskScore,
  risksByScore,
  riskTone,
  stageRange,
  tasksLabel,
  whoLabel,
} from "@/lib/portal/view";
import { REPO_ROOT } from "./helpers";

describe("roadmap helpers", () => {
  const roadmap = {
    phases: [
      { id: "phase-p0-a", short: "P0" },
      { id: "phase-p1-b", short: "P1" },
      { id: "phase-p2-c", short: "P2" },
    ],
  } as unknown as Roadmap;
  it("stageRange names the first and last phase, or the only one", () => {
    expect(stageRange(roadmap, { id: "s", name: "S", summary: "x", phases: ["phase-p0-a", "phase-p2-c"] })).toBe("P0 → P2");
    expect(stageRange(roadmap, { id: "s", name: "S", summary: "x", phases: ["phase-p1-b"] })).toBe("P1");
    expect(stageRange(roadmap, { id: "s", name: "S", summary: "x", phases: [] })).toBe("");
    expect(stageRange(roadmap, { id: "s", name: "S", summary: "x", phases: ["phase-p9-unknown"] })).toBe("phase-p9-unknown");
  });
  it("tasksLabel shows a dash while there is no task list", () => {
    expect(tasksLabel(16, 18)).toBe("16 / 18");
    expect(tasksLabel(0, null)).toBe("0 / —");
  });
});

describe("log, questions and labels", () => {
  it("newestFirst orders by date, later entries first on the same day", () => {
    const e = (id: string, date: string) => ({ id, date }) as Log["entries"][number];
    const log = { entries: [e("a", "2026-10-08"), e("b", "2026-10-09"), e("c", "2026-10-09")] } as Log;
    expect(newestFirst(log).map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(newestFirst(null)).toEqual([]);
  });
  it("questionsByStatus puts open first and keeps file order inside a group", () => {
    const q = (id: string, status: Questions["items"][number]["status"]) => ({ id, status }) as Questions["items"][number];
    const groups = questionsByStatus({ items: [q("Q-001", "answered"), q("Q-002", "open"), q("Q-003", "withdrawn"), q("Q-004", "open")] } as Questions);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Open", ["Q-002", "Q-004"]],
      ["Answered", ["Q-001"]],
      ["Withdrawn", ["Q-003"]],
    ]);
    expect(questionsByStatus(null).every((g) => g.items.length === 0)).toBe(true);
  });
  it("whoLabel, decisionTone, riskTone", () => {
    expect([whoLabel("you"), whoLabel("claude")]).toEqual(["You", "Claude"]);
    expect((["Accepted", "Proposed", "Replaced", "Rejected"] as const).map(decisionTone)).toEqual(["done", "now", "later", "later"]);
    expect((["Open", "Being reduced", "Resolved", "Happened", "Accepted"] as const).map(riskTone)).toEqual(["later", "now", "done", "blocked", "done"]);
  });
  it("risksByScore sorts by likelihood × impact, ties in file order", () => {
    const r = (id: string, likelihood: number, impact: number) => ({ id, likelihood, impact }) as Risks["items"][number];
    const risks = { items: [r("risk-r01", 2, 2), r("risk-r02", 4, 4), r("risk-r03", 1, 4), r("risk-r04", 4, 4)] } as Risks;
    expect(risksByScore(risks).map((x) => x.id)).toEqual(["risk-r02", "risk-r04", "risk-r01", "risk-r03"]);
    expect(riskScore({ likelihood: 3, impact: 5 })).toBe(15);
    expect(risksByScore(null)).toEqual([]);
  });
  it("firstSentence", () => {
    expect(firstSentence("One. Two.")).toBe("One.");
    expect(firstSentence("Only one")).toBe("Only one");
  });
});

describe("layerRows", () => {
  const layer = (id: string, name: string, language?: string): Architecture["layers"][number] => ({
    id,
    name,
    summary: "s",
    trust: "trusted",
    components: [],
    ...(language ? { language } : {}),
  });
  it("puts neighbouring layers with the same prefix in one row and adds a shared language", () => {
    const rows = layerRows([
      layer("a", "What you see: controls", "TypeScript"),
      layer("b", "What you see: websites"),
      layer("c", "Ferrum engine", "Rust"),
      layer("d", "Windows 11"),
    ]);
    expect(rows.map((r) => [r.label, r.layers.map((l) => l.id)])).toEqual([
      ["What you see", ["a", "b"]],
      ["Ferrum engine (Rust)", ["c"]],
      ["Windows 11", ["d"]],
    ]);
    expect(layerShortName(layer("a", "What you see: controls"))).toBe("controls");
    expect(layerShortName(layer("d", "Windows 11"))).toBe("Windows 11");
  });
  it("the real architecture has a row for every layer and every application part in a layer", async () => {
    const p = await loadPortalUncached({ portalDir: path.join(REPO_ROOT, "plan", "portal"), approvalsFile: path.join(REPO_ROOT, "plan", "approvals.json") });
    const arch = p.files.architecture!;
    const rows = layerRows(arch.layers);
    expect(rows.flatMap((r) => r.layers.map((l) => l.id))).toEqual(arch.layers.map((l) => l.id));
    const inLayers = new Set(arch.layers.flatMap((l) => l.components));
    for (const c of arch.components.filter((x) => x.group === "application")) expect(inLayers.has(c.id), c.id).toBe(true);
  });
});

describe("popup ids", () => {
  it("are stable and safe as element ids", () => {
    expect(phaseDialogId("phase-p1-foundation")).toBe("phase-dialog-phase-p1-foundation");
    expect(detailDialogId("adr-0001")).toBe("detail-dialog-adr-0001");
    expect(detailDialogId("odd id#1")).toBe("detail-dialog-odd_id_1");
  });
});
