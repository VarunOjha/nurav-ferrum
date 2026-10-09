/**
 * Graph layouts for the IP-8 views (ip-routes-and-views §3.2, §3.3, §3.8): dagre left-to-right, run on
 * the server so the client graph only draws. Pure and deterministic: positions are top-left corners in
 * px, and every list is returned in keyboard reading order (left to right, then top to bottom).
 */
import { Graph, layout } from "@dagrejs/dagre";
import type { ComponentGraph, PhaseDag, TraceGraph } from "../wiki/graph";
import { TRACE_LAYER } from "../wiki/graph";

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Lane {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const NODE_W = 220;
export const NODE_H = 76;
const COL_GAP = 110;
const ROW_GAP = 28;
const LANE_PAD = 36;
const LANE_GAP = 24;
const SUB_GAP = 24;

/** dagre LR layout; returns node centres. Edges to unknown ids are ignored. */
export function dagreLayout(ids: readonly string[], edges: readonly { from: string; to: string }[], size = { w: NODE_W, h: NODE_H }): Map<string, { x: number; y: number }> {
  const g = new Graph();
  g.setGraph({ rankdir: "LR", nodesep: ROW_GAP, ranksep: COL_GAP, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const set = new Set(ids);
  for (const id of ids) g.setNode(id, { width: size.w, height: size.h });
  for (const e of edges) if (set.has(e.from) && set.has(e.to) && e.from !== e.to) g.setEdge(e.from, e.to);
  layout(g);
  const out = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const n = g.node(id) as { x: number; y: number };
    out.set(id, { x: n.x, y: n.y });
  }
  return out;
}

const readingOrder = (a: Box, b: Box) => a.x - b.x || a.y - b.y || (a.id < b.id ? -1 : 1);

/** Distinct x centres -> column index (0..n-1). */
function columnsOf(pos: Map<string, { x: number; y: number }>): Map<string, number> {
  const xs = [...new Set([...pos.values()].map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const col = new Map<string, number>();
  for (const [id, p] of pos) col.set(id, xs.indexOf(Math.round(p.x)));
  return col;
}

/**
 * Stacks the nodes of each (group, column) cell top to bottom in dagre's vertical order; groups are
 * horizontal bands placed one under another. Returns the boxes and each band's extent.
 */
function stackInBands(
  groups: readonly { id: string; label: string; ids: string[] }[],
  col: Map<string, number>,
  pos: Map<string, { x: number; y: number }>,
  maxRows = Number.POSITIVE_INFINITY,
): { boxes: Box[]; lanes: Lane[] } {
  const boxes: Box[] = [];
  const lanes: Lane[] = [];
  const maxCol = Math.max(0, ...[...col.values()]);
  const cells = groups.map((g) => {
    const byCol = new Map<number, string[]>();
    for (const id of g.ids) {
      const c = col.get(id) ?? 0;
      if (!byCol.has(c)) byCol.set(c, []);
      byCol.get(c)!.push(id);
    }
    for (const ids of byCol.values()) ids.sort((a, b) => pos.get(a)!.y - pos.get(b)!.y || (a < b ? -1 : 1));
    return byCol;
  });
  // A column taller than maxRows wraps into side-by-side sub-columns (SUB_GAP apart).
  const subCols = Array.from({ length: maxCol + 1 }, (_, c) => Math.max(1, ...cells.map((m) => Math.ceil((m.get(c)?.length ?? 0) / maxRows))));
  const colX: number[] = [];
  let x = LANE_PAD;
  for (let c = 0; c <= maxCol; c++) {
    colX.push(x);
    x += subCols[c] * NODE_W + (subCols[c] - 1) * SUB_GAP + COL_GAP;
  }
  const laneW = x - COL_GAP + LANE_PAD;
  let top = 0;
  groups.forEach((g, gi) => {
    if (g.ids.length === 0) return;
    let rows = 0;
    for (const [c, ids] of cells[gi]) {
      ids.forEach((id, i) => {
        const sub = Math.floor(i / maxRows);
        const row = i % maxRows;
        boxes.push({ id, x: colX[c] + sub * (NODE_W + SUB_GAP), y: top + LANE_PAD + row * (NODE_H + ROW_GAP), w: NODE_W, h: NODE_H });
      });
      rows = Math.max(rows, Math.min(ids.length, maxRows));
    }
    const h = 2 * LANE_PAD + rows * NODE_H + (rows - 1) * ROW_GAP;
    lanes.push({ id: g.id, label: g.label, x: 0, y: top, w: laneW, h });
    top += h + LANE_GAP;
  });
  return { boxes: boxes.sort(readingOrder), lanes };
}

export const TRUST_LANES = [
  { id: "trusted", label: "Trusted" },
  { id: "untrusted", label: "Untrusted" },
  { id: "external", label: "External" },
  { id: "missing", label: "Missing (dangling target)" },
] as const;

/** Architecture: dagre columns, then one swim-lane per trust level (ip-routes-and-views §3.2). */
export function layoutArchitecture(g: Pick<ComponentGraph, "nodes" | "edges">): { boxes: Box[]; lanes: Lane[] } {
  const pos = dagreLayout(
    g.nodes.map((n) => n.id),
    g.edges,
  );
  const col = columnsOf(pos);
  const groups = TRUST_LANES.map((l) => ({
    id: l.id,
    label: l.label,
    ids: g.nodes.filter((n) => (n.dangling ? "missing" : n.trust_level) === l.id).map((n) => n.id),
  }));
  return stackInBands(groups, col, pos);
}

/** Roadmap DAG: dagre positions as they are (dependencies to the left). */
export function layoutPhaseDag(d: Pick<PhaseDag, "nodes" | "edges">): Box[] {
  const pos = dagreLayout(
    d.nodes.map((n) => n.id),
    d.edges,
  );
  return d.nodes
    .map((n) => {
      const p = pos.get(n.id)!;
      return { id: n.id, x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2), w: NODE_W, h: NODE_H };
    })
    .sort(readingOrder);
}

/** Minimum rows before the last research column wraps. */
export const TRACE_MIN_ROWS = 12;

export const TRACE_COLUMNS = ["Research question", "Hypothesis", "Experiment", "Metric / Workload / Phase"] as const;

/** Research traceability: fixed columns by kind, dagre's vertical order inside each column (§3.8). */
export function layoutTrace(g: Pick<TraceGraph, "nodes" | "edges">): Box[] {
  const pos = dagreLayout(
    g.nodes.map((n) => n.id),
    g.edges,
  );
  const col = new Map(g.nodes.map((n) => [n.id, TRACE_LAYER[n.kind]] as const));
  // Within the last column keep metrics, then workloads, then phases together.
  const kindRank: Record<string, number> = { metric: 0, workload: 1, phase: 2 };
  const kindOf = new Map(g.nodes.map((n) => [n.id, n.kind] as const));
  const adjusted = new Map<string, { x: number; y: number }>();
  for (const [id, p] of pos) adjusted.set(id, { x: p.x, y: (kindRank[kindOf.get(id)!] ?? 0) * 1e6 + p.y });
  // The last column (metrics, workloads, phases) is usually the tallest: it wraps into sub-columns no
  // taller than the other columns (at least TRACE_MIN_ROWS), so the graph stays readable at fit zoom.
  const counts = [0, 0, 0, 0];
  for (const n of g.nodes) counts[TRACE_LAYER[n.kind]]++;
  const maxRows = Math.max(TRACE_MIN_ROWS, counts[0], counts[1], counts[2]);
  return stackInBands([{ id: "trace", label: "", ids: g.nodes.map((n) => n.id) }], col, adjusted, maxRows).boxes;
}

/**
 * Ids of the edges whose straight line would run behind another node (an edge that skips a rank in
 * the same row, e.g. P6 -> P8 behind P7 on the roadmap). Those are drawn with route "below".
 */
export function edgesBehindNodes(boxes: readonly Box[], edges: readonly { id: string; from: string; to: string }[]): Set<string> {
  const at = new Map(boxes.map((b) => [b.id, b] as const));
  const out = new Set<string>();
  for (const e of edges) {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) continue;
    const x1 = a.x + a.w;
    const x2 = b.x;
    const y1 = a.y + a.h / 2;
    const y2 = b.y + b.h / 2;
    for (const n of boxes) {
      if (n.id === e.from || n.id === e.to || n.x + n.w <= Math.min(x1, x2) || n.x >= Math.max(x1, x2)) continue;
      // the line's y where it crosses the node's horizontal centre
      const t = x2 === x1 ? 0.5 : (n.x + n.w / 2 - x1) / (x2 - x1);
      const y = y1 + (y2 - y1) * Math.min(1, Math.max(0, t));
      if (y >= n.y && y <= n.y + n.h) {
        out.add(e.id);
        break;
      }
    }
  }
  return out;
}
