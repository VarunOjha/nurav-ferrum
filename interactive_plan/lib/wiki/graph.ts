/**
 * Derived graph structures (ip-data-contract §4.3): componentGraph, phaseDag, traceGraph and
 * riskMatrix. All pure: they read the loaded WikiIndex only (no fs, no approvals). Only zod-valid pages
 * whose id is unique (`byId.get(id) === page`) take part; invalid pages are reported by the lint.
 */
import { reciprocalFindings } from "../lint/rules/refs";
import type { WikiIndex, WikiPage } from "./load";
import type { ComponentPage, PhasePage } from "./schemas";

type Idx = Pick<WikiIndex, "pages" | "byId">;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Valid, uniquely-identified pages of one type, sorted by id. */
function pagesOf<T>(idx: Idx, type: string): { page: WikiPage; fm: T }[] {
  const out: { page: WikiPage; fm: T }[] = [];
  for (const p of idx.pages) {
    if (p.fm?.type === type && p.id && idx.byId.get(p.id) === p) out.push({ page: p, fm: p.fm as T });
  }
  return out.sort((a, b) => cmp(a.page.id!, b.page.id!));
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// =============================================================================================
// componentGraph (ip-routes-and-views §3.2)
// =============================================================================================

export interface ComponentNode {
  id: string;
  title: string;
  status: string;
  trust_level: "trusted" | "untrusted" | "external" | null;
  /** `shipped: false` only; absent means shipped (SCHEMA §6.2). */
  shipped: boolean;
  unsafe_code: boolean;
  /** A `connects[].to` id with no component page: a red dashed placeholder. */
  dangling: boolean;
  path: string | null;
  phase_introduced: string | null;
  responsibilities: string[];
  interfaces: string[];
}

export interface ComponentEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: string;
  crossesTrustBoundary: boolean;
  /** The target has no component page (REF-DANGLING). */
  dangling: boolean;
  /** `crosses_trust_boundary` disagrees with the two trust levels: a TRUST-EDGE lint error (drawn red). */
  trustEdgeError: boolean;
}

export interface ComponentGraph {
  nodes: ComponentNode[];
  edges: ComponentEdge[];
}

export function componentGraph(idx: Idx): ComponentGraph {
  const comps = pagesOf<ComponentPage>(idx, "component");
  const byId = new Map(comps.map((c) => [c.fm.id, c.fm] as const));
  const nodes: ComponentNode[] = comps.map(({ page, fm }) => ({
    id: fm.id,
    title: fm.title,
    status: fm.status,
    trust_level: fm.trust_level,
    shipped: fm.shipped !== false,
    unsafe_code: fm.unsafe_code === true,
    dangling: false,
    path: page.path,
    phase_introduced: fm.phase_introduced,
    responsibilities: [...fm.responsibilities],
    interfaces: [...(fm.interfaces ?? [])],
  }));
  const edges: ComponentEdge[] = [];
  const danglingIds = new Set<string>();
  for (const { fm } of comps) {
    fm.connects.forEach((e, i) => {
      const target = byId.get(e.to);
      if (!target) danglingIds.add(e.to);
      edges.push({
        id: `${fm.id}->${e.to}#${i}`,
        from: fm.id,
        to: e.to,
        label: e.label,
        kind: e.kind,
        crossesTrustBoundary: e.crosses_trust_boundary,
        dangling: !target,
        trustEdgeError: !!target && e.crosses_trust_boundary !== (fm.trust_level !== target.trust_level),
      });
    });
  }
  for (const id of [...danglingIds].sort(cmp)) {
    nodes.push({
      id,
      title: id,
      status: "missing",
      trust_level: null,
      shipped: true,
      unsafe_code: false,
      dangling: true,
      path: null,
      phase_introduced: null,
      responsibilities: [],
      interfaces: [],
    });
  }
  return { nodes, edges };
}

// =============================================================================================
// phaseDag (ip-routes-and-views §3.3; ip-data-contract §4.3)
// =============================================================================================

export interface PhaseNode {
  id: string;
  title: string;
  status: string;
  order: number;
  milestone: string | null;
  est_sessions: number;
  depends_on: string[];
  tasks: number;
  risks: string[];
  experiments: string[];
  decisions: string[];
}

export interface ScheduleSlot {
  /** Cumulative sessions (not dates): max(end of dependencies), 0 without dependencies. */
  start: number;
  end: number;
}

export interface PhaseDag {
  /** Phases sorted by `order`, then id. */
  nodes: PhaseNode[];
  /** `from` is the dependency, `to` the dependent phase (only between existing phases). */
  edges: { id: string; from: string; to: string; critical: boolean }[];
  /** `depends_on` ids that are not phase pages. */
  missing: { phase: string; dep: string }[];
  /** Ids on a dependency cycle (sorted); these have no schedule slot. */
  cycle: string[];
  /** Per phase id; phases on or behind a cycle are absent. */
  schedule: Map<string, ScheduleSlot>;
  /** Longest chain by sessions, first to last; ties are broken by `order`, then id. */
  criticalPath: string[];
  /** max(end) over the scheduled phases. */
  totalSessions: number;
}

export function phaseDag(idx: Idx): PhaseDag {
  const list = pagesOf<PhasePage>(idx, "phase")
    .map((x) => x.fm)
    .sort((a, b) => a.order - b.order || cmp(a.id, b.id));
  const byId = new Map(list.map((p) => [p.id, p] as const));
  const nodes: PhaseNode[] = list.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    order: p.order,
    milestone: p.milestone,
    est_sessions: p.est_sessions,
    depends_on: [...p.depends_on],
    tasks: p.tasks.length,
    risks: [...p.risks],
    experiments: [...p.experiments],
    decisions: [...p.decisions],
  }));
  const missing: { phase: string; dep: string }[] = [];
  const deps = new Map<string, string[]>();
  for (const p of list) {
    const ds: string[] = [];
    for (const d of p.depends_on) {
      if (byId.has(d)) {
        if (!ds.includes(d)) ds.push(d);
      } else missing.push({ phase: p.id, dep: d });
    }
    deps.set(p.id, ds);
  }

  // Cycle detection (iterative DFS colouring; every node on a back-edge cycle is collected).
  const cycle = new Set<string>();
  const colour = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (start: string) => {
    const work: { id: string; i: number }[] = [{ id: start, i: 0 }];
    colour.set(start, 1);
    stack.push(start);
    while (work.length) {
      const top = work[work.length - 1];
      const ds = deps.get(top.id)!;
      if (top.i < ds.length) {
        const d = ds[top.i++];
        const c = colour.get(d) ?? 0;
        if (c === 0) {
          colour.set(d, 1);
          stack.push(d);
          work.push({ id: d, i: 0 });
        } else if (c === 1) {
          for (let k = stack.lastIndexOf(d); k < stack.length; k++) cycle.add(stack[k]);
        }
      } else {
        colour.set(top.id, 2);
        stack.pop();
        work.pop();
      }
    }
  };
  for (const p of list) if (!colour.get(p.id)) visit(p.id);

  // Schedule: start = max(end(dep)); phases on or depending on a cycle stay unscheduled.
  const schedule = new Map<string, ScheduleSlot>();
  const blocked = new Set(cycle);
  const slot = (id: string, seen: Set<string>): ScheduleSlot | null => {
    if (blocked.has(id)) return null;
    const have = schedule.get(id);
    if (have) return have;
    if (seen.has(id)) return null;
    seen.add(id);
    let start = 0;
    for (const d of deps.get(id)!) {
      const s = slot(d, seen);
      if (!s) {
        blocked.add(id);
        return null;
      }
      start = Math.max(start, s.end);
    }
    const out = { start, end: start + byId.get(id)!.est_sessions };
    schedule.set(id, out);
    return out;
  };
  for (const p of list) slot(p.id, new Set());

  // Critical path: from the phase with the largest end, follow the dependency whose end equals start.
  const rank = new Map(list.map((p, i) => [p.id, i] as const));
  const byRank = (a: string, b: string) => rank.get(a)! - rank.get(b)!;
  let totalSessions = 0;
  let last: string | null = null;
  for (const p of list) {
    const s = schedule.get(p.id);
    if (s && s.end > totalSessions) {
      totalSessions = s.end;
      last = p.id;
    }
  }
  const criticalPath: string[] = [];
  for (let cur = last; cur; ) {
    criticalPath.unshift(cur);
    const s = schedule.get(cur)!;
    const next: string | undefined = deps
      .get(cur)!
      .filter((d) => schedule.get(d)?.end === s.start && s.start > 0)
      .sort(byRank)[0];
    cur = next ?? null;
  }
  const onPath = new Set(criticalPath);
  const pathEdges = new Set(criticalPath.slice(1).map((id, i) => `${criticalPath[i]}->${id}`));
  const edges = list.flatMap((p) =>
    deps.get(p.id)!.map((d) => ({ id: `${d}->${p.id}`, from: d, to: p.id, critical: pathEdges.has(`${d}->${p.id}`) && onPath.has(p.id) })),
  );
  return { nodes, edges, missing, cycle: [...cycle].sort(cmp), schedule, criticalPath, totalSessions };
}

// =============================================================================================
// riskMatrix (ip-routes-and-views §3.6)
// =============================================================================================

export type RiskBand = "low" | "moderate" | "high" | "critical";

/** App convention, not SCHEMA: 1-4 low, 5-9 moderate, 10-14 high, 15-25 critical. */
export function riskBand(score: number): RiskBand {
  if (score >= 15) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "moderate";
  return "low";
}

export interface RiskRow {
  id: string;
  title: string;
  likelihood: number;
  impact: number;
  score: number;
  band: RiskBand;
  status: string;
  owner_phase: string;
  spike: string | null;
  mitigation: string;
  trigger: string | null;
  fallback: string | null;
}

export interface RiskMatrix {
  /** cells[impact - 1][likelihood - 1] = risk ids (sorted by score desc, then id). */
  cells: string[][][];
  risks: RiskRow[];
}

export function riskMatrix(idx: Idx): RiskMatrix {
  type RiskFm = { id: string; title: string; likelihood: number; impact: number; status: string; owner_phase: string; spike: string | null; mitigation: string; trigger?: string; fallback?: string };
  const risks: RiskRow[] = pagesOf<RiskFm>(idx, "risk").map(({ fm }) => {
    const score = fm.likelihood * fm.impact;
    return {
      id: fm.id,
      title: fm.title,
      likelihood: fm.likelihood,
      impact: fm.impact,
      score,
      band: riskBand(score),
      status: fm.status,
      owner_phase: fm.owner_phase,
      spike: fm.spike,
      mitigation: fm.mitigation,
      trigger: fm.trigger ?? null,
      fallback: fm.fallback ?? null,
    };
  });
  const cells: string[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as string[]));
  const sorted = [...risks].sort((a, b) => b.score - a.score || cmp(a.id, b.id));
  for (const r of sorted) cells[r.impact - 1][r.likelihood - 1].push(r.id);
  return { cells, risks };
}

// =============================================================================================
// traceGraph (ip-routes-and-views §3.8)
// =============================================================================================

export type TraceKind = "research-question" | "hypothesis" | "experiment" | "metric" | "workload" | "phase";

/** Column of each node kind: RQ → Hypothesis → Experiment → Metric / Workload / Phase. */
export const TRACE_LAYER: Record<TraceKind, number> = {
  "research-question": 0,
  hypothesis: 1,
  experiment: 2,
  metric: 3,
  workload: 3,
  phase: 3,
};

export interface TraceNode {
  id: string;
  kind: TraceKind;
  title: string;
  status: string;
  path: string;
  /** Metrics only: `support`. */
  support?: string;
  /** Hypotheses only: status is `preregistered` (or later states that imply it). */
  preregistered?: boolean;
}

export type GapKind =
  | "rq-no-hypotheses"
  | "hyp-no-experiments"
  | "hyp-no-metrics"
  | "exp-no-workloads"
  | "exp-no-metrics"
  | "exp-no-configurations"
  | "exp-few-trials"
  | "exp-no-phase"
  | "metric-unused"
  | "metric-unverified-soon"
  | "reciprocal";

export const GAP_TEXT: Record<GapKind, string> = {
  "rq-no-hypotheses": "research question with no hypotheses",
  "hyp-no-experiments": "hypothesis with no experiments",
  "hyp-no-metrics": "hypothesis with no metrics",
  "exp-no-workloads": "experiment with no workloads",
  "exp-no-metrics": "experiment with no metrics",
  "exp-no-configurations": "experiment with no configurations",
  "exp-few-trials": "experiment with trials.target < 30",
  "exp-no-phase": "experiment not listed in any phase's experiments",
  "metric-unused": "metric referenced by no hypothesis or experiment",
  "metric-unverified-soon": "metric with support: unverified used by an experiment of the current or next phase",
  reciprocal: "reciprocity mismatch (REF-RECIPROCAL)",
};

export interface Gap {
  kind: GapKind;
  id: string;
  message: string;
}

export interface TraceEdge {
  id: string;
  from: string;
  to: string;
}

export interface TraceTree {
  rq: string;
  hypotheses: { id: string; experiments: { id: string; metrics: string[]; workloads: string[]; phase: string | null }[]; metrics: string[] }[];
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
  gaps: Gap[];
  /** Nested rq → hyp → exp → metrics/workloads (the text alternative). */
  tree: TraceTree[];
  /** Hypotheses not reachable from any research question. */
  unlinkedHypotheses: string[];
  /** Experiments not reachable from any hypothesis. */
  unlinkedExperiments: string[];
}

/** Minimum `trials.target` (master prompt §10). */
export const MIN_TRIALS = 30;

const PREREG_STATES = new Set(["preregistered", "testing", "supported", "not-supported", "inconclusive"]);

/**
 * `current` and `next` phase ids decide the "metric unverified" gap (current = STATUS.current_phase,
 * next = the phase after it in `order`).
 */
export function traceGraph(idx: Idx, phases: { current: string | null; next: string | null } = { current: null, next: null }): TraceGraph {
  type RqFm = { id: string; title: string; status: string; hypotheses: string[] };
  type HypFm = { id: string; title: string; status: string; rq: string; metrics: string[]; experiments: string[] };
  type ExpFm = {
    id: string;
    title: string;
    status: string;
    hypotheses: string[];
    workloads: string[];
    configurations: string[];
    metrics: string[];
    trials: { target: number };
    phase: string;
  };
  type MetricFm = { id: string; title: string; status: string; support: string };
  type WlFm = { id: string; title: string; status: string };
  const rqs = pagesOf<RqFm>(idx, "research-question");
  const hyps = pagesOf<HypFm>(idx, "hypothesis");
  const exps = pagesOf<ExpFm>(idx, "experiment");
  const metrics = pagesOf<MetricFm>(idx, "metric");
  const wls = pagesOf<WlFm>(idx, "workload");
  const phasePages = pagesOf<PhasePage>(idx, "phase");

  const nodes: TraceNode[] = [];
  const known = new Map<string, TraceKind>();
  const add = (kind: TraceKind, page: WikiPage, fm: { id: string; title: string; status: string }, extra: Partial<TraceNode> = {}) => {
    known.set(fm.id, kind);
    nodes.push({ id: fm.id, kind, title: fm.title, status: fm.status, path: page.path, ...extra });
  };
  for (const { page, fm } of rqs) add("research-question", page, fm);
  for (const { page, fm } of hyps) add("hypothesis", page, fm, { preregistered: PREREG_STATES.has(fm.status) });
  for (const { page, fm } of exps) add("experiment", page, fm);
  for (const { page, fm } of metrics) add("metric", page, fm, { support: fm.support });
  for (const { page, fm } of wls) add("workload", page, fm);
  const phaseOfExp = new Map<string, string>();
  const listedInPhase = new Set<string>();
  for (const { fm } of phasePages) for (const e of fm.experiments) listedInPhase.add(e);
  const linkedPhases = new Set(exps.map((e) => e.fm.phase).filter((p) => phasePages.some((x) => x.fm.id === p)));
  for (const { page, fm } of phasePages) if (linkedPhases.has(fm.id)) add("phase", page, fm);

  // Edges (union of both directions of each relation, only between known nodes).
  const edgeSet = new Map<string, TraceEdge>();
  const link = (from: string, to: string) => {
    if (!known.has(from) || !known.has(to)) return;
    const id = `${from}->${to}`;
    if (!edgeSet.has(id)) edgeSet.set(id, { id, from, to });
  };
  for (const { fm } of rqs) for (const h of strs(fm.hypotheses)) link(fm.id, h);
  for (const { fm } of hyps) {
    link(fm.rq, fm.id);
    for (const e of strs(fm.experiments)) link(fm.id, e);
    for (const m of strs(fm.metrics)) link(fm.id, m);
  }
  for (const { fm } of exps) {
    for (const h of strs(fm.hypotheses)) link(h, fm.id);
    for (const m of strs(fm.metrics)) link(fm.id, m);
    for (const w of strs(fm.workloads)) link(fm.id, w);
    if (known.get(fm.phase) === "phase") {
      link(fm.id, fm.phase);
      phaseOfExp.set(fm.id, fm.phase);
    }
  }
  const edges = [...edgeSet.values()];

  // Gaps.
  const gaps: Gap[] = [];
  const gap = (kind: GapKind, id: string, detail?: string) => gaps.push({ kind, id, message: detail ? `${GAP_TEXT[kind]}: ${detail}` : GAP_TEXT[kind] });
  for (const { fm } of rqs) if (strs(fm.hypotheses).length === 0) gap("rq-no-hypotheses", fm.id);
  // A hypothesis's experiments/metrics: its own lists plus experiments that list it (reciprocity gaps are reported separately).
  const expsOfHyp = (h: HypFm) => new Set([...strs(h.experiments), ...exps.filter((e) => strs(e.fm.hypotheses).includes(h.id)).map((e) => e.fm.id)]);
  for (const { fm } of hyps) {
    if (expsOfHyp(fm).size === 0) gap("hyp-no-experiments", fm.id);
    if (strs(fm.metrics).length === 0) gap("hyp-no-metrics", fm.id);
  }
  const soon = new Set([phases.current, phases.next].filter((x): x is string => !!x));
  const metricSupport = new Map(metrics.map((m) => [m.fm.id, m.fm.support] as const));
  for (const { fm } of exps) {
    if (strs(fm.workloads).length === 0) gap("exp-no-workloads", fm.id);
    if (strs(fm.metrics).length === 0) gap("exp-no-metrics", fm.id);
    if (strs(fm.configurations).length === 0) gap("exp-no-configurations", fm.id);
    if (fm.trials.target < MIN_TRIALS) gap("exp-few-trials", fm.id, `target ${fm.trials.target}`);
    if (!listedInPhase.has(fm.id)) gap("exp-no-phase", fm.id, `phase field ${fm.phase}`);
  }
  const usedMetrics = new Set([...hyps.flatMap((h) => strs(h.fm.metrics)), ...exps.flatMap((e) => strs(e.fm.metrics))]);
  for (const { fm } of metrics) {
    if (!usedMetrics.has(fm.id)) gap("metric-unused", fm.id);
    if (metricSupport.get(fm.id) === "unverified") {
      const users = exps.filter((e) => soon.has(e.fm.phase) && strs(e.fm.metrics).includes(fm.id)).map((e) => e.fm.id);
      if (users.length) gap("metric-unverified-soon", fm.id, `used by ${users.join(", ")}`);
    }
  }
  for (const f of reciprocalFindings(idx)) if (f.id) gaps.push({ kind: "reciprocal", id: f.id, message: f.message });

  // Text alternative tree.
  const reachedHyps = new Set<string>();
  const reachedExps = new Set<string>();
  const hypById = new Map(hyps.map((h) => [h.fm.id, h.fm] as const));
  const expById = new Map(exps.map((e) => [e.fm.id, e.fm] as const));
  const hypsOfRq = (rq: RqFm) => [...new Set([...strs(rq.hypotheses), ...hyps.filter((h) => h.fm.rq === rq.id).map((h) => h.fm.id)])].filter((h) => hypById.has(h));
  const tree: TraceTree[] = rqs.map(({ fm: rq }) => ({
    rq: rq.id,
    hypotheses: hypsOfRq(rq).map((h) => {
      reachedHyps.add(h);
      const hfm = hypById.get(h)!;
      return {
        id: h,
        metrics: strs(hfm.metrics),
        experiments: [...expsOfHyp(hfm)]
          .filter((e) => expById.has(e))
          .sort(cmp)
          .map((e) => {
            reachedExps.add(e);
            const efm = expById.get(e)!;
            return { id: e, metrics: strs(efm.metrics), workloads: strs(efm.workloads), phase: phaseOfExp.get(e) ?? null };
          }),
      };
    }),
  }));
  return {
    nodes,
    edges,
    gaps,
    tree,
    unlinkedHypotheses: hyps.map((h) => h.fm.id).filter((h) => !reachedHyps.has(h)),
    unlinkedExperiments: exps.map((e) => e.fm.id).filter((e) => !reachedExps.has(e)),
  };
}

/** The subgraph of one research question: the rq, its hypotheses, their experiments and everything those link to. */
export function traceSubgraph(g: TraceGraph, rqId: string): TraceGraph {
  const keep = new Set<string>([rqId]);
  const out = new Map<string, string[]>();
  for (const e of g.edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from)!.push(e.to);
  }
  const queue = [rqId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of out.get(cur) ?? []) {
      if (!keep.has(n)) {
        keep.add(n);
        queue.push(n);
      }
    }
  }
  return {
    nodes: g.nodes.filter((n) => keep.has(n.id)),
    edges: g.edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
    gaps: g.gaps.filter((x) => keep.has(x.id)),
    tree: g.tree.filter((t) => t.rq === rqId),
    unlinkedHypotheses: [],
    unlinkedExperiments: [],
  };
}
