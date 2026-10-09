// IP-8 graphs on the REAL wiki (read-only; runs under `npm run lint:wiki`, not `npm test`, owner answer
// 2026-10-09 wave 0c item 3). The E2E fixture has 3 phases, so the ip-testing §3 roadmap expectation
// "9 phase nodes" is asserted here against the real P0-P8 pages (decided 2026-10-09, IP-8). The
// research gaps are planning information, not lint errors: they are printed, never failed on.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextPhaseId } from "@/lib/views/dashboard";
import { layoutArchitecture, layoutPhaseDag, layoutTrace, type Box } from "@/lib/views/graphLayout";
import { componentGraph, phaseDag, riskMatrix, traceGraph } from "@/lib/wiki/graph";
import { clearWikiCache, loadWiki, type WikiIndex } from "@/lib/wiki/load";
import { REAL_STATUS, REAL_WIKI, REPO_ROOT } from "../unit/helpers";

const APPROVALS = path.join(REPO_ROOT, "plan", "approvals.json");
const fingerprint = (p: string) =>
  existsSync(p) ? `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}` : "absent";
const overlaps = (bs: Box[]) => bs.some((a, i) => bs.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));

let idx: WikiIndex;
let before: string;

beforeAll(async () => {
  before = fingerprint(APPROVALS);
  clearWikiCache();
  idx = await loadWiki({ wikiDir: REAL_WIKI, statusFile: REAL_STATUS, repoRoot: REPO_ROOT });
});

afterAll(() => {
  expect(fingerprint(APPROVALS)).toBe(before);
});

describe("real wiki graphs (IP-8, read-only)", () => {
  it("roadmap: 9 phases P0-P8, acyclic, every phase scheduled, a critical path from P0", () => {
    const d = phaseDag(idx);
    expect(d.nodes).toHaveLength(9);
    expect(d.nodes.map((n) => n.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(d.cycle).toEqual([]);
    expect(d.missing).toEqual([]);
    expect(d.schedule.size).toBe(9);
    for (const e of d.edges) expect(d.schedule.get(e.to)!.start, e.id).toBeGreaterThanOrEqual(d.schedule.get(e.from)!.end);
    expect(d.criticalPath[0]).toBe(d.nodes[0].id);
    const sum = d.criticalPath.reduce((s, id) => s + d.nodes.find((n) => n.id === id)!.est_sessions, 0);
    expect(sum).toBe(d.totalSessions);
    expect(overlaps(layoutPhaseDag(d))).toBe(false);
    console.log(`roadmap: ${d.nodes.length} phases, ${d.totalSessions} sessions, critical path ${d.criticalPath.join(" -> ")}`);
  });

  it("architecture: every edge target is a component, no TRUST-EDGE mismatch, lanes without overlaps", () => {
    const g = componentGraph(idx);
    expect(g.nodes.filter((n) => n.dangling).map((n) => n.id)).toEqual([]);
    expect(g.edges.filter((e) => e.trustEdgeError).map((e) => e.id)).toEqual([]);
    expect(g.nodes.every((n) => n.trust_level !== null)).toBe(true);
    const { boxes, lanes } = layoutArchitecture(g);
    expect(boxes).toHaveLength(g.nodes.length);
    expect(overlaps(boxes)).toBe(false);
    console.log(
      `architecture: ${g.nodes.length} components, ${g.edges.length} edges (${g.edges.filter((e) => e.crossesTrustBoundary).length} TB), lanes ${lanes.map((l) => l.id).join(", ")}`,
    );
  });

  it("risks: every risk is placed in exactly one heatmap cell", () => {
    const m = riskMatrix(idx);
    expect(m.risks.length).toBeGreaterThan(0);
    const placed = m.cells.flat(2);
    expect(placed.sort()).toEqual(m.risks.map((r) => r.id).sort());
    console.log(`risks: ${m.risks.length}; bands ${JSON.stringify(Object.fromEntries(["low", "moderate", "high", "critical"].map((b) => [b, m.risks.filter((r) => r.band === b).length])))}`);
  });

  it("research: the traceability graph builds; gaps are listed for the reader (not failed on)", () => {
    const current = idx.status?.current_phase ?? null;
    const g = traceGraph(idx, { current, next: nextPhaseId(idx, current) });
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const x of g.gaps) expect(ids.has(x.id), x.id).toBe(true);
    expect(overlaps(layoutTrace(g))).toBe(false);
    console.log(`research: ${g.nodes.length} nodes, ${g.edges.length} edges, ${g.gaps.length} gaps`);
    for (const x of g.gaps) console.log(`  gap ${x.kind} ${x.id}: ${x.message}`);
  });
});
