// IP-8 graph and register logic (ip-testing §1.6): componentGraph (edges, dangling targets, TB flag
// pass-through, TRUST-EDGE), phaseDag (cycle detection, schedule start = max of dependency ends,
// critical path on a diamond), traceGraph (every gap kind of ip-routes-and-views §3.8), riskMatrix
// (placement, score bands), the dagre layouts and the decision/risk register helpers. Each wiki is a
// temp directory built from small pages; the mini-wiki fixture is used read-only.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { layoutArchitecture, layoutPhaseDag, layoutTrace, NODE_H, NODE_W, type Box } from "@/lib/views/graphLayout";
import { adrSectionCheck, decisionRows, filterDecisions, sortRisks, supersessionChain } from "@/lib/views/registers";
import { componentGraph, phaseDag, riskBand, riskMatrix, traceGraph, traceSubgraph, type GapKind } from "@/lib/wiki/graph";
import { loadWiki, type WikiIndex } from "@/lib/wiki/load";
import { loadMini, page } from "./helpers";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

async function wikiOf(files: Record<string, Buffer>): Promise<WikiIndex> {
  const root = mkdtempSync(path.join(os.tmpdir(), "ip8 graph "));
  roots.push(root);
  const wikiDir = path.join(root, "wiki");
  for (const [rel, buf] of Object.entries(files)) {
    const p = path.join(wikiDir, ...rel.split("/"));
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, buf);
  }
  mkdirSync(wikiDir, { recursive: true });
  return loadWiki({ wikiDir, statusFile: path.join(root, "STATUS.md"), repoRoot: root });
}

const common = (id: string, type: string, status: string, extra: string[] = []) => [
  `id: ${id}`,
  `type: ${type}`,
  `title: "${id} title"`,
  `status: ${status}`,
  "updated: 2026-10-08",
  "sources: []",
  "related: []",
  "approvable: true",
  ...extra,
];

function comp(id: string, trust: string, connects: string[] = [], extra: string[] = []): Buffer {
  return page(
    common(id, "component", "planned", [
      "path: null",
      "crate: null",
      `trust_level: ${trust}`,
      "phase_introduced: phase-p1-x",
      "responsibilities:",
      `  - "${id} does things"`,
      connects.length ? "connects:" : "connects: []",
      ...connects,
      ...extra,
    ]),
  );
}
const edge = (to: string, label: string, kind: string, tb: boolean) => [
  `  - to: ${to}`,
  `    label: "${label}"`,
  `    kind: ${kind}`,
  `    crosses_trust_boundary: ${tb}`,
];

function phase(id: string, order: number, est: number, deps: string[], extra: { experiments?: string[]; status?: string; milestone?: string } = {}): Buffer {
  return page(
    common(id, "phase", extra.status ?? "planned", [
      `milestone: ${extra.milestone ?? "null"}`,
      `order: ${order}`,
      `depends_on: [${deps.join(", ")}]`,
      `est_sessions: ${est}`,
      "entry_criteria: []",
      "deliverables: []",
      "tasks: []",
      "test_gate:",
      "  automated: []",
      "  manual: []",
      "  evidence: []",
      "exit_criteria: []",
      "risks: []",
      "decisions: []",
      `experiments: [${(extra.experiments ?? []).join(", ")}]`,
    ]),
  );
}

// ---------------------------------------------------------------------------------------------

describe("componentGraph", () => {
  it("passes edges through with label, kind and the TB flag; dangling targets become placeholder nodes", async () => {
    const idx = await wikiOf({
      "architecture/components/comp-a.md": comp("comp-a", "trusted", [
        ...edge("comp-b", "creates", "rust-api", true),
        ...edge("comp-c", "calls", "tauri-ipc", false),
        ...edge("comp-ghost", "talks to", "network", true),
      ]),
      "architecture/components/comp-b.md": comp("comp-b", "untrusted", [], ["shipped: false", "unsafe_code: true", "interfaces: [open_tab]"]),
      "architecture/components/comp-c.md": comp("comp-c", "untrusted"),
    });
    const g = componentGraph(idx);
    expect(g.nodes.map((n) => n.id)).toEqual(["comp-a", "comp-b", "comp-c", "comp-ghost"]);
    const b = g.nodes.find((n) => n.id === "comp-b")!;
    expect(b).toMatchObject({ shipped: false, unsafe_code: true, interfaces: ["open_tab"], trust_level: "untrusted", dangling: false, path: "architecture/components/comp-b.md" });
    expect(g.nodes.find((n) => n.id === "comp-a")).toMatchObject({ shipped: true, unsafe_code: false, responsibilities: ["comp-a does things"] });
    expect(g.nodes.find((n) => n.id === "comp-ghost")).toMatchObject({ dangling: true, trust_level: null, path: null });
    expect(g.edges).toEqual([
      { id: "comp-a->comp-b#0", from: "comp-a", to: "comp-b", label: "creates", kind: "rust-api", crossesTrustBoundary: true, dangling: false, trustEdgeError: false },
      // trusted -> untrusted but crosses_trust_boundary: false: the TRUST-EDGE error is flagged
      { id: "comp-a->comp-c#1", from: "comp-a", to: "comp-c", label: "calls", kind: "tauri-ipc", crossesTrustBoundary: false, dangling: false, trustEdgeError: true },
      { id: "comp-a->comp-ghost#2", from: "comp-a", to: "comp-ghost", label: "talks to", kind: "network", crossesTrustBoundary: true, dangling: true, trustEdgeError: false },
    ]);
  });

  it("matches the mini-wiki fixture (2 components, one TB edge)", async () => {
    const g = componentGraph(await loadMini());
    expect(g.nodes.map((n) => n.id)).toEqual(["comp-fixture-content", "comp-fixture-shell"]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]).toMatchObject({ from: "comp-fixture-shell", to: "comp-fixture-content", crossesTrustBoundary: true, trustEdgeError: false });
  });

  it("skips invalid pages and duplicate ids", async () => {
    const idx = await wikiOf({
      "architecture/components/comp-a.md": comp("comp-a", "trusted"),
      "architecture/components/comp-bad.md": page(common("comp-bad", "component", "planned")),
    });
    expect(componentGraph(idx).nodes.map((n) => n.id)).toEqual(["comp-a"]);
  });
});

describe("phaseDag", () => {
  it("schedules a diamond (start = max of dependency ends) and finds the critical path", async () => {
    const idx = await wikiOf({
      "phases/phase-p0-a.md": phase("phase-p0-a", 0, 1, []),
      "phases/phase-p1-b.md": phase("phase-p1-b", 1, 2, ["phase-p0-a"]),
      "phases/phase-p2-c.md": phase("phase-p2-c", 2, 5, ["phase-p0-a"], { milestone: "M1" }),
      "phases/phase-p3-d.md": phase("phase-p3-d", 3, 1, ["phase-p1-b", "phase-p2-c"]),
    });
    const d = phaseDag(idx);
    expect(d.nodes.map((n) => n.id)).toEqual(["phase-p0-a", "phase-p1-b", "phase-p2-c", "phase-p3-d"]);
    expect(Object.fromEntries(d.schedule)).toEqual({
      "phase-p0-a": { start: 0, end: 1 },
      "phase-p1-b": { start: 1, end: 3 },
      "phase-p2-c": { start: 1, end: 6 },
      "phase-p3-d": { start: 6, end: 7 },
    });
    expect(d.criticalPath).toEqual(["phase-p0-a", "phase-p2-c", "phase-p3-d"]);
    expect(d.totalSessions).toBe(7);
    expect(d.cycle).toEqual([]);
    expect(d.edges.filter((e) => e.critical).map((e) => e.id)).toEqual(["phase-p0-a->phase-p2-c", "phase-p2-c->phase-p3-d"]);
    expect(d.edges.filter((e) => !e.critical).map((e) => e.id)).toEqual(["phase-p0-a->phase-p1-b", "phase-p1-b->phase-p3-d"]);
  });

  it("breaks critical-path ties by order", async () => {
    const idx = await wikiOf({
      "phases/phase-p0-a.md": phase("phase-p0-a", 0, 1, []),
      "phases/phase-p1-b.md": phase("phase-p1-b", 1, 2, ["phase-p0-a"]),
      "phases/phase-p2-c.md": phase("phase-p2-c", 2, 2, ["phase-p0-a"]),
      "phases/phase-p3-d.md": phase("phase-p3-d", 3, 1, ["phase-p2-c", "phase-p1-b"]),
    });
    expect(phaseDag(idx).criticalPath).toEqual(["phase-p0-a", "phase-p1-b", "phase-p3-d"]);
  });

  it("detects a cycle: the cycle and everything behind it stay unscheduled; missing dependencies are listed", async () => {
    const idx = await wikiOf({
      "phases/phase-p0-a.md": phase("phase-p0-a", 0, 2, ["phase-p8-nope"]),
      "phases/phase-p1-x.md": phase("phase-p1-x", 1, 1, ["phase-p2-y"]),
      "phases/phase-p2-y.md": phase("phase-p2-y", 2, 1, ["phase-p1-x"]),
      "phases/phase-p3-z.md": phase("phase-p3-z", 3, 1, ["phase-p2-y"]),
    });
    const d = phaseDag(idx);
    expect(d.cycle).toEqual(["phase-p1-x", "phase-p2-y"]);
    expect([...d.schedule.keys()]).toEqual(["phase-p0-a"]);
    expect(d.schedule.get("phase-p0-a")).toEqual({ start: 0, end: 2 });
    expect(d.missing).toEqual([{ phase: "phase-p0-a", dep: "phase-p8-nope" }]);
    expect(d.criticalPath).toEqual(["phase-p0-a"]);
  });

  it("a self-dependency is a cycle", async () => {
    const idx = await wikiOf({ "phases/phase-p0-a.md": phase("phase-p0-a", 0, 1, ["phase-p0-a"]) });
    expect(phaseDag(idx).cycle).toEqual(["phase-p0-a"]);
    expect(phaseDag(idx).totalSessions).toBe(0);
    expect(phaseDag(idx).criticalPath).toEqual([]);
  });

  it("matches the mini-wiki fixture", async () => {
    const d = phaseDag(await loadMini());
    expect(d.nodes.map((n) => [n.id, n.tasks, n.risks])).toEqual([
      ["phase-p0-fixture-plan", 1, []],
      ["phase-p1-fixture-build", 1, ["risk-r91"]],
    ]);
    expect(d.criticalPath).toEqual(["phase-p0-fixture-plan", "phase-p1-fixture-build"]);
    expect(d.totalSessions).toBe(3);
  });
});

describe("riskMatrix", () => {
  const risk = (id: string, l: number, i: number, status = "open") =>
    page(
      common(id, "risk", status, [
        `likelihood: ${l}`,
        `impact: ${i}`,
        'mitigation: "m"',
        "spike: null",
        "owner_phase: phase-p1-x",
      ]),
    );

  it("places risks in cell (L, I) and bands the score", async () => {
    const idx = await wikiOf({
      "risks/risk-r01.md": risk("risk-r01", 3, 4),
      "risks/risk-r02.md": risk("risk-r02", 1, 1, "resolved"),
      "risks/risk-r03.md": risk("risk-r03", 5, 5),
      "risks/risk-r04.md": risk("risk-r04", 3, 4, "mitigating"),
      "risks/risk-r05.md": risk("risk-r05", 5, 2),
    });
    const m = riskMatrix(idx);
    expect(m.cells[3][2]).toEqual(["risk-r01", "risk-r04"]);
    expect(m.cells[0][0]).toEqual(["risk-r02"]);
    expect(m.cells[4][4]).toEqual(["risk-r03"]);
    expect(m.cells[1][4]).toEqual(["risk-r05"]);
    expect(m.cells.flat(2)).toHaveLength(5);
    expect(m.risks.map((r) => [r.id, r.score, r.band])).toEqual([
      ["risk-r01", 12, "high"],
      ["risk-r02", 1, "low"],
      ["risk-r03", 25, "critical"],
      ["risk-r04", 12, "high"],
      ["risk-r05", 10, "high"],
    ]);
  });

  it("score bands: 1-4 low, 5-9 moderate, 10-14 high, 15-25 critical", () => {
    const bands = Array.from({ length: 25 }, (_, i) => riskBand(i + 1));
    expect(bands.slice(0, 4).every((b) => b === "low")).toBe(true);
    expect(bands.slice(4, 9).every((b) => b === "moderate")).toBe(true);
    expect(bands.slice(9, 14).every((b) => b === "high")).toBe(true);
    expect(bands.slice(14).every((b) => b === "critical")).toBe(true);
  });

  it("matches the mini-wiki fixture (risk-r91 at L3, I4)", async () => {
    const m = riskMatrix(await loadMini());
    expect(m.cells[3][2]).toEqual(["risk-r91"]);
    expect(m.risks[0]).toMatchObject({ id: "risk-r91", score: 12, band: "high", spike: "p1.1", trigger: "Startup feels slow", fallback: null });
  });

  it("sortRisks sorts by any column in both directions, ties by score then id", async () => {
    const m = riskMatrix(
      await wikiOf({
        "risks/risk-r01.md": risk("risk-r01", 3, 4),
        "risks/risk-r02.md": risk("risk-r02", 1, 1, "resolved"),
        "risks/risk-r03.md": risk("risk-r03", 5, 5),
      }),
    );
    const rows = m.risks.map((r) => ({ ...r, state: "PENDING" }));
    expect(sortRisks(rows, "score", "desc").map((r) => r.id)).toEqual(["risk-r03", "risk-r01", "risk-r02"]);
    expect(sortRisks(rows, "score", "asc").map((r) => r.id)).toEqual(["risk-r02", "risk-r01", "risk-r03"]);
    expect(sortRisks(rows, "status", "asc").map((r) => r.id)).toEqual(["risk-r03", "risk-r01", "risk-r02"]);
    expect(sortRisks(rows, "id", "desc").map((r) => r.id)).toEqual(["risk-r03", "risk-r02", "risk-r01"]);
  });
});

describe("traceGraph", () => {
  const rq = (id: string, hyps: string[]) => page(common(id, "research-question", "open", ['question: "q?"', `hypotheses: [${hyps.join(", ")}]`]));
  const hyp = (id: string, rqId: string, metrics: string[], exps: string[], status = "draft") =>
    page(common(id, "hypothesis", status, [`rq: ${rqId}`, 'prediction: "p"', 'null_hypothesis: "n"', `metrics: [${metrics.join(", ")}]`, `experiments: [${exps.join(", ")}]`]));
  const exp = (id: string, o: { hyps: string[]; wls?: string[]; cfgs?: string[]; metrics?: string[]; target?: number; phase: string }) =>
    page(
      common(id, "experiment", "designed", [
        `hypotheses: [${o.hyps.join(", ")}]`,
        `workloads: [${(o.wls ?? []).join(", ")}]`,
        `configurations: [${(o.cfgs ?? []).join(", ")}]`,
        `metrics: [${(o.metrics ?? []).join(", ")}]`,
        "trials:",
        `  target: ${o.target ?? 30}`,
        "  warmup: 3",
        "  order: randomized",
        'analysis: "a"',
        `phase: ${o.phase}`,
      ]),
    );
  const metric = (id: string, support = "unverified") =>
    page(
      common(id, "metric", "proposed", [
        "unit: ms",
        'definition: "d"',
        'boundary_start: "s"',
        'boundary_end: "e"',
        'method: "m"',
        'tool: "t"',
        "normalization: none",
        `support: ${support}`,
      ]),
    );
  const wl = (id: string) =>
    page(common(id, "workload", "proposed", ["workload_kind: synthetic-local", "master_prompt_ref: null", "parameters: {}", "fixture_path: x/"]));

  async function gapWiki() {
    return wikiOf({
      // complete chain: rq-01 -> hyp-01 -> exp-good -> metric-a / wl-a, phase-p1-x lists exp-good
      "research/questions/rq-01.md": rq("rq-01", ["hyp-01", "hyp-04"]),
      "research/hypotheses/hyp-01.md": hyp("hyp-01", "rq-01", ["metric-a"], ["exp-good"], "preregistered"),
      "research/experiments/exp-good.md": exp("exp-good", { hyps: ["hyp-01"], wls: ["wl-a"], cfgs: ["cfg-a"], metrics: ["metric-a"], phase: "phase-p1-x" }),
      // rq-no-hypotheses
      "research/questions/rq-02.md": rq("rq-02", []),
      // hyp-no-experiments + hyp-no-metrics
      "research/questions/rq-03.md": rq("rq-03", ["hyp-02", "hyp-03"]),
      "research/hypotheses/hyp-02.md": hyp("hyp-02", "rq-03", [], []),
      // exp-bad: no workloads, metrics, configurations; 10 trials; not in any phase's experiments
      "research/hypotheses/hyp-03.md": hyp("hyp-03", "rq-03", ["metric-a"], ["exp-bad"]),
      "research/experiments/exp-bad.md": exp("exp-bad", { hyps: ["hyp-03"], target: 10, phase: "phase-p1-x" }),
      // reciprocity: rq-01 lists hyp-04 but hyp-04.rq is rq-03, rq-03 does not list hyp-04, and hyp-04
      // lists exp-good whose hypotheses do not include hyp-04
      "research/hypotheses/hyp-04.md": hyp("hyp-04", "rq-03", ["metric-a"], ["exp-good"]),
      // metric-unused; metric-a is unverified and used by exp-good of the next phase
      "research/metrics/metric-a.md": metric("metric-a"),
      "research/metrics/metric-unused.md": metric("metric-unused", "supported"),
      "research/workloads/wl-a.md": wl("wl-a"),
      "phases/phase-p0-x.md": phase("phase-p0-x", 0, 1, [], { status: "in-progress" }),
      "phases/phase-p1-x.md": phase("phase-p1-x", 1, 1, ["phase-p0-x"], { experiments: ["exp-good"] }),
    });
  }

  it("detects every gap kind of ip-routes-and-views §3.8", async () => {
    const g = traceGraph(await gapWiki(), { current: "phase-p0-x", next: "phase-p1-x" });
    const got = g.gaps.map((x) => `${x.kind} ${x.id}`).sort();
    expect(got).toEqual(
      [
        "rq-no-hypotheses rq-02",
        "hyp-no-experiments hyp-02",
        "hyp-no-metrics hyp-02",
        "exp-no-workloads exp-bad",
        "exp-no-metrics exp-bad",
        "exp-no-configurations exp-bad",
        "exp-few-trials exp-bad",
        "exp-no-phase exp-bad",
        "metric-unused metric-unused",
        "metric-unverified-soon metric-a",
        // reciprocity, as the REF-RECIPROCAL lint reports it
        "reciprocal rq-01",
        "reciprocal hyp-04",
        "reciprocal hyp-04",
      ].sort(),
    );
    const kinds = new Set(g.gaps.map((x) => x.kind));
    const all: GapKind[] = [
      "rq-no-hypotheses",
      "hyp-no-experiments",
      "hyp-no-metrics",
      "exp-no-workloads",
      "exp-no-metrics",
      "exp-no-configurations",
      "exp-few-trials",
      "exp-no-phase",
      "metric-unused",
      "metric-unverified-soon",
      "reciprocal",
    ];
    for (const k of all) expect(kinds.has(k), k).toBe(true);
    expect(g.gaps.find((x) => x.kind === "exp-few-trials")!.message).toContain("target 10");
    expect(g.gaps.find((x) => x.kind === "metric-unverified-soon")!.message).toContain("used by exp-good");
  });

  it("the unverified-metric gap needs an experiment of the current or next phase", async () => {
    const g = traceGraph(await gapWiki(), { current: "phase-p8-other", next: null });
    expect(g.gaps.some((x) => x.kind === "metric-unverified-soon")).toBe(false);
  });

  it("builds nodes per kind, edges in both directions of each relation, and the nested text tree", async () => {
    const g = traceGraph(await gapWiki());
    const kindOf = Object.fromEntries(g.nodes.map((n) => [n.id, n.kind]));
    expect(kindOf).toMatchObject({ "rq-01": "research-question", "hyp-01": "hypothesis", "exp-good": "experiment", "metric-a": "metric", "wl-a": "workload", "phase-p1-x": "phase" });
    // phase-p0-x has no experiment linking to it, so it is not a node
    expect(kindOf["phase-p0-x"]).toBeUndefined();
    expect(g.nodes.find((n) => n.id === "hyp-01")!.preregistered).toBe(true);
    expect(g.nodes.find((n) => n.id === "hyp-02")!.preregistered).toBe(false);
    expect(g.nodes.find((n) => n.id === "metric-a")!.support).toBe("unverified");
    const ids = g.edges.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["rq-01->hyp-01", "hyp-01->exp-good", "hyp-01->metric-a", "exp-good->metric-a", "exp-good->wl-a", "exp-good->phase-p1-x", "rq-03->hyp-04", "rq-01->hyp-04"]));
    expect(new Set(ids).size).toBe(ids.length);
    const t1 = g.tree.find((t) => t.rq === "rq-01")!;
    expect(t1.hypotheses.map((h) => h.id)).toEqual(["hyp-01", "hyp-04"]);
    expect(t1.hypotheses[0].experiments).toEqual([{ id: "exp-good", metrics: ["metric-a"], workloads: ["wl-a"], phase: "phase-p1-x" }]);
    expect(g.tree.find((t) => t.rq === "rq-02")!.hypotheses).toEqual([]);
    expect(g.unlinkedHypotheses).toEqual([]);
  });

  it("traceSubgraph keeps one research question and what it reaches", async () => {
    const g = traceGraph(await gapWiki());
    const s = traceSubgraph(g, "rq-03");
    expect(s.nodes.map((n) => n.id).sort()).toEqual(["exp-bad", "exp-good", "hyp-02", "hyp-03", "hyp-04", "metric-a", "phase-p1-x", "rq-03", "wl-a"]);
    expect(s.gaps.every((x) => s.nodes.some((n) => n.id === x.id))).toBe(true);
    expect(s.tree.map((t) => t.rq)).toEqual(["rq-03"]);
  });

  it("the mini-wiki fixture has a complete chain and no gaps", async () => {
    const idx = await loadMini();
    const g = traceGraph(idx, { current: "phase-p0-fixture-plan", next: "phase-p1-fixture-build" });
    // metric-fixture-startup-ms is unverified and used by exp-fixture-startup of the next phase
    expect(g.gaps.map((x) => `${x.kind} ${x.id}`)).toEqual(["metric-unverified-soon metric-fixture-startup-ms"]);
    expect(traceGraph(idx).gaps).toEqual([]);
    expect(g.tree[0].hypotheses[0].experiments[0]).toEqual({ id: "exp-fixture-startup", metrics: ["metric-fixture-startup-ms"], workloads: ["wl-fixture-static"], phase: "phase-p1-fixture-build" });
  });
});

describe("layouts", () => {
  const overlaps = (bs: Box[]) => bs.some((a, i) => bs.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));

  it("architecture: one lane per trust level present, nodes inside their lane, no overlaps, reading order", async () => {
    const idx = await wikiOf({
      "architecture/components/comp-a.md": comp("comp-a", "trusted", [...edge("comp-b", "x", "rust-api", true), ...edge("comp-c", "y", "rust-api", true), ...edge("comp-zz", "z", "network", true)]),
      "architecture/components/comp-b.md": comp("comp-b", "untrusted"),
      "architecture/components/comp-c.md": comp("comp-c", "untrusted"),
      "architecture/components/comp-d.md": comp("comp-d", "external"),
    });
    const g = componentGraph(idx);
    const { boxes, lanes } = layoutArchitecture(g);
    expect(lanes.map((l) => l.id)).toEqual(["trusted", "untrusted", "external", "missing"]);
    expect(boxes).toHaveLength(5);
    expect(overlaps(boxes)).toBe(false);
    const laneOf = (id: string) => {
      const n = g.nodes.find((x) => x.id === id)!;
      return lanes.find((l) => l.id === (n.dangling ? "missing" : n.trust_level))!;
    };
    for (const b of boxes) {
      const l = laneOf(b.id);
      expect(b.y >= l.y && b.y + b.h <= l.y + l.h && b.x >= l.x && b.x + b.w <= l.x + l.w, b.id).toBe(true);
      expect([b.w, b.h]).toEqual([NODE_W, NODE_H]);
    }
    // comp-a is the source (first column); reading order is left to right, then top to bottom
    expect(boxes[0].id).toBe("comp-a");
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].x > boxes[i - 1].x || (boxes[i].x === boxes[i - 1].x && boxes[i].y > boxes[i - 1].y)).toBe(true);
  });

  it("roadmap: dependencies sit left of their dependants", async () => {
    const d = phaseDag(
      await wikiOf({
        "phases/phase-p0-a.md": phase("phase-p0-a", 0, 1, []),
        "phases/phase-p1-b.md": phase("phase-p1-b", 1, 2, ["phase-p0-a"]),
        "phases/phase-p2-c.md": phase("phase-p2-c", 2, 5, ["phase-p0-a"]),
        "phases/phase-p3-d.md": phase("phase-p3-d", 3, 1, ["phase-p1-b", "phase-p2-c"]),
      }),
    );
    const boxes = layoutPhaseDag(d);
    const x = Object.fromEntries(boxes.map((b) => [b.id, b.x]));
    for (const e of d.edges) expect(x[e.from] < x[e.to], e.id).toBe(true);
    expect(overlaps(boxes)).toBe(false);
  });

  it("research: fixed columns by kind (rq, hyp, exp, metric/workload/phase), no overlaps", async () => {
    const g = traceGraph(await loadMini());
    const boxes = layoutTrace(g);
    const x = Object.fromEntries(boxes.map((b) => [b.id, b.x]));
    expect(x["rq-91"]).toBeLessThan(x["hyp-91"]);
    expect(x["hyp-91"]).toBeLessThan(x["exp-fixture-startup"]);
    expect(x["exp-fixture-startup"]).toBeLessThan(x["metric-fixture-startup-ms"]);
    expect(x["metric-fixture-startup-ms"]).toBe(x["wl-fixture-static"]);
    expect(x["wl-fixture-static"]).toBe(x["phase-p1-fixture-build"]);
    expect(overlaps(boxes)).toBe(false);
  });
});

describe("layout wrapping", () => {
  it("research: a last column taller than the other columns wraps into sub-columns (no overlaps)", async () => {
    const files: Record<string, Buffer> = {};
    const metricIds = Array.from({ length: 30 }, (_, i) => `metric-m${String(i).padStart(2, "0")}`);
    for (const id of metricIds) {
      files[`research/metrics/${id}.md`] = page(
        common(id, "metric", "proposed", ["unit: ms", 'definition: "d"', 'boundary_start: "s"', 'boundary_end: "e"', 'method: "m"', 'tool: "t"', "normalization: none", "support: supported"]),
      );
    }
    files["research/questions/rq-01.md"] = page(common("rq-01", "research-question", "open", ['question: "q?"', "hypotheses: [hyp-01]"]));
    files["research/hypotheses/hyp-01.md"] = page(
      common("hyp-01", "hypothesis", "draft", ["rq: rq-01", 'prediction: "p"', 'null_hypothesis: "n"', `metrics: [${metricIds.join(", ")}]`, "experiments: []"]),
    );
    const g = traceGraph(await wikiOf(files));
    const boxes = layoutTrace(g);
    const metricBoxes = boxes.filter((b) => b.id.startsWith("metric-"));
    const xs = [...new Set(metricBoxes.map((b) => b.x))].sort((a, b) => a - b);
    // 30 metrics, at most 12 rows each (TRACE_MIN_ROWS): 3 sub-columns
    expect(xs).toHaveLength(3);
    const rowsPerX = xs.map((x) => metricBoxes.filter((b) => b.x === x).length);
    expect(rowsPerX).toEqual([12, 12, 6]);
    const hypX = boxes.find((b) => b.id === "hyp-01")!.x;
    expect(xs[0]).toBeGreaterThan(hypX);
    const overlaps = boxes.some((a, i) => boxes.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
    expect(overlaps).toBe(false);
  });
});

describe("decision register", () => {
  const adr = (id: string, decidedBy: string, extra: string[] = [], body = "# T\n", status = "proposed") =>
    page(common(id, "decision", status, ["date: 2026-10-01", `decided_by: ${decidedBy}`, ...extra]), body);
  const ALL = "## Context\n\nc\n\n## Options considered\n\no\n\n## Decision\n\nd\n\n## Consequences\n\nx\n\n## Verification / evidence\n\nv\n";

  it("rows: claude-proposed awaiting approval first, then by id; filters by status and approval state", async () => {
    const idx = await wikiOf({
      "decisions/adr-0001.md": adr("adr-0001", "owner", ["supersedes: []"], "# T\n", "accepted"),
      "decisions/adr-0002.md": adr("adr-0002", "claude-proposed", ["supersedes: []"]),
      "decisions/adr-0003.md": adr("adr-0003", "claude-proposed", ["supersedes: []"]),
    });
    const rows = decisionRows(idx, [
      { key: "adr-0001", state: "PENDING" },
      { key: "adr-0002", state: "APPROVED" },
      { key: "adr-0003", state: "STALE" },
    ]);
    expect(rows.map((r) => [r.id, r.awaiting])).toEqual([
      ["adr-0003", true],
      ["adr-0001", false],
      ["adr-0002", false],
    ]);
    expect(filterDecisions(rows, { status: "accepted" }).map((r) => r.id)).toEqual(["adr-0001"]);
    expect(filterDecisions(rows, { state: "APPROVED" }).map((r) => r.id)).toEqual(["adr-0002"]);
    expect(filterDecisions(rows, {}).length).toBe(3);
  });

  it("section check follows the ADR-SECTIONS rule (presence and order)", async () => {
    const idx = await wikiOf({
      "decisions/adr-0001.md": adr("adr-0001", "owner", ["supersedes: []"], ALL),
      "decisions/adr-0002.md": adr("adr-0002", "owner", ["supersedes: []"], "## Decision\n\nd\n\n## Context\n\nc\n"),
    });
    expect(adrSectionCheck(idx.byId.get("adr-0001")!).every((s) => s.present)).toBe(true);
    expect(adrSectionCheck(idx.byId.get("adr-0002")!).map((s) => [s.section, s.present])).toEqual([
      ["Context", true],
      ["Options considered", false],
      ["Decision", false],
      ["Consequences", false],
      ["Verification / evidence", false],
    ]);
  });

  it("supersession chain: oldest first, cycle-safe, missing ids end the chain", async () => {
    const idx = await wikiOf({
      "decisions/adr-0001.md": adr("adr-0001", "owner", ["supersedes: []", "superseded_by: adr-0002"], "# T\n", "superseded"),
      "decisions/adr-0002.md": adr("adr-0002", "owner", ["supersedes: [adr-0001]", "superseded_by: adr-0003"], "# T\n", "superseded"),
      "decisions/adr-0003.md": adr("adr-0003", "owner", ["supersedes: [adr-0002]", "superseded_by: adr-0009"], "# T\n", "accepted"),
      "decisions/adr-0005.md": adr("adr-0005", "owner", ["supersedes: [adr-0006]"]),
      "decisions/adr-0006.md": adr("adr-0006", "owner", ["supersedes: [adr-0005]"]),
    });
    expect(supersessionChain(idx, "adr-0002")).toEqual(["adr-0001", "adr-0002", "adr-0003", "adr-0009"]);
    expect(supersessionChain(idx, "adr-0005")).toEqual(["adr-0006", "adr-0005"]);
    expect(supersessionChain(idx, "adr-0404")).toEqual(["adr-0404"]);
  });
});
