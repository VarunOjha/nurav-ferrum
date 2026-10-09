// Research traceability (ip-routes-and-views §3.8): a layered graph RQ → Hypothesis → Experiment →
// Metric / Workload (and the experiment's phase), node colour = status, metric `support` and the
// hypothesis "preregistered" state as text badges, gaps outlined red with a "gap" badge and listed in
// a table, a per-rq filter, and a nested list as the text alternative.
import type { Metadata } from "next";
import { StatusBadge } from "@/components/Badges";
import LazyFlowGraph from "@/components/graph/LazyFlowGraph";
import type { FlowEdgeSpec, FlowNodeSpec } from "@/components/graph/types";
import { getIndex } from "@/lib/server/data";
import { toneOf } from "@/lib/ui/tone";
import { nextPhaseId } from "@/lib/views/dashboard";
import { layoutTrace, TRACE_COLUMNS } from "@/lib/views/graphLayout";
import { GAP_TEXT, traceGraph, traceSubgraph, type GapKind, type TraceKind, type TraceNode } from "@/lib/wiki/graph";
import { wikiHref } from "@/lib/wiki/routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Research" };

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

const EYEBROW: Record<TraceKind, string> = {
  "research-question": "RQ",
  hypothesis: "Hypothesis",
  experiment: "Experiment",
  metric: "Metric",
  workload: "Workload",
  phase: "Phase",
};

const hrefOf = (n: Pick<TraceNode, "kind" | "id" | "path">) => (n.kind === "phase" ? `/phases/${encodeURIComponent(n.id)}` : wikiHref(n.path));

export default async function ResearchRoute({ searchParams }: PageProps<"/research">) {
  const sp = await searchParams;
  const idx = await getIndex();
  const current = idx.status?.current_phase ?? null;
  const full = traceGraph(idx, { current, next: nextPhaseId(idx, current) });
  const rqParam = one(sp.rq);
  const rqs = full.nodes.filter((n) => n.kind === "research-question");
  const rq = rqParam && rqs.some((n) => n.id === rqParam) ? rqParam : null;
  const g = rq ? traceSubgraph(full, rq) : full;
  const gapsOf = new Map<string, GapKind[]>();
  for (const x of g.gaps) gapsOf.set(x.id, [...(gapsOf.get(x.id) ?? []), x.kind]);
  const byId = new Map(full.nodes.map((n) => [n.id, n] as const));
  const boxes = layoutTrace(g);

  const nodes: FlowNodeSpec[] = boxes.map((b) => {
    const n = byId.get(b.id)!;
    const gaps = gapsOf.get(n.id) ?? [];
    return {
      id: n.id,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      kind: "item",
      eyebrow: EYEBROW[n.kind],
      title: n.title,
      sub: n.id,
      badges: [
        { text: n.status, tone: toneOf(n.status) },
        ...(n.kind === "metric" && n.support ? [{ text: `support: ${n.support}`, tone: toneOf(n.support === "unverified" ? "stale" : n.support === "unsupported" ? "rejected" : "supported"), title: "metric support" }] : []),
        ...(n.kind === "hypothesis" ? [n.preregistered ? { text: "preregistered", tone: "blue" as const } : { text: "not preregistered", tone: "amber" as const }] : []),
        ...(gaps.length ? [{ text: `gap ×${gaps.length}`, tone: "red" as const, title: gaps.map((k) => GAP_TEXT[k]).join("; ") }] : []),
      ],
      // fg-compact: one-line title and one row of badges, so the node never clips its id (IP-9 review);
      // the full title is the control's tooltip.
      classes: [`fg-tone-${toneOf(n.status)}`, "fg-compact", gaps.length ? "fg-gap" : ""].filter(Boolean),
      href: hrefOf(n),
      ariaLabel: `${EYEBROW[n.kind]} ${n.title} (${n.id}), ${n.status}${gaps.length ? `, ${gaps.length} gap${gaps.length === 1 ? "" : "s"}` : ""}: open the page`,
    };
  });
  const edges: FlowEdgeSpec[] = g.edges.map((e) => ({ id: e.id, from: e.from, to: e.to }));
  const bottom = Math.max(0, ...boxes.map((b) => b.y + b.h));
  const height = Math.min(900, Math.max(360, bottom * 0.8 + 100));

  const nodeRef = (id: string) => {
    const n = byId.get(id);
    const gaps = gapsOf.get(id) ?? [];
    return (
      <>
        {n ? (
          <a href={hrefOf(n)}>{n.title}</a>
        ) : (
          <span className="link-missing" title="missing (REF-DANGLING)">
            {id}
          </span>
        )}{" "}
        <span className="mono small muted">{id}</span> {n && <StatusBadge status={n.status} />}
        {n?.kind === "metric" && <span className="chip chip-xs chip-outline">support: {n.support}</span>}
        {n?.kind === "hypothesis" && n.preregistered && <span className="chip chip-xs chip-blue">preregistered</span>}
        {gaps.length > 0 && (
          <span className="chip chip-xs chip-red" title={gaps.map((k) => GAP_TEXT[k]).join("; ")}>
            gap ×{gaps.length}
          </span>
        )}
      </>
    );
  };

  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Research traceability</h1>
        <p className="muted">
          {rqs.length} research questions, {full.nodes.filter((n) => n.kind === "hypothesis").length} hypotheses, {full.nodes.filter((n) => n.kind === "experiment").length} experiments,{" "}
          {full.nodes.filter((n) => n.kind === "metric").length} metrics, {full.nodes.filter((n) => n.kind === "workload").length} workloads · {full.gaps.length} gap{full.gaps.length === 1 ? "" : "s"}.
        </p>
      </header>

      <form className="filters" method="get" action="/research" aria-label="Research question filter">
        <label>
          Research question{" "}
          <select name="rq" defaultValue={rq ?? ""}>
            <option value="">all questions</option>
            {rqs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id}: {n.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Show
        </button>
        {rq && (
          <a href="/research" className="small">
            Show all
          </a>
        )}
      </form>

      <ol className="legend small trace-columns" aria-label="Graph columns">
        {TRACE_COLUMNS.map((c) => (
          <li key={c}>{c}</li>
        ))}
        <li className="muted">Red outline and a “gap” badge: a traceability gap (listed below).</li>
      </ol>

      {g.nodes.length === 0 ? (
        <p className="muted">No research pages.</p>
      ) : (
        <LazyFlowGraph nodes={nodes} edges={edges} label="Research traceability graph" height={height} testId="trace-graph" fitMinZoom={0.6} />
      )}

      <section className="panel" aria-labelledby="gaps-title">
        <h2 id="gaps-title" className="panel-title">
          Gaps ({g.gaps.length})
        </h2>
        {g.gaps.length === 0 ? (
          <p className="muted small">No gaps{rq ? ` in ${rq}` : ""}.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-testid="gap-table">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Gap</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {g.gaps.map((x, i) => (
                  <tr key={i} data-gap={x.kind} data-id={x.id} className="row-bad">
                    <td>
                      <a href={`/go/${encodeURIComponent(x.id)}`} className="mono">
                        {x.id}
                      </a>
                    </td>
                    <td>
                      <code>{x.kind}</code>
                    </td>
                    <td className="small">{x.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="tree-title">
        <h2 id="tree-title" className="panel-title">
          Traceability (text alternative)
        </h2>
        <ul className="trace-tree" data-testid="trace-tree">
          {g.tree.map((t) => (
            <li key={t.rq} data-rq={t.rq}>
              {nodeRef(t.rq)}
              {t.hypotheses.length === 0 ? (
                <p className="muted small">no hypotheses</p>
              ) : (
                <ul>
                  {t.hypotheses.map((h) => (
                    <li key={h.id}>
                      {nodeRef(h.id)}
                      {h.metrics.length > 0 && <p className="small">Metrics: {h.metrics.join(", ")}</p>}
                      {h.experiments.length === 0 ? (
                        <p className="muted small">no experiments</p>
                      ) : (
                        <ul>
                          {h.experiments.map((e) => (
                            <li key={e.id}>
                              {nodeRef(e.id)}
                              <ul>
                                <li className="small">
                                  Metrics:{" "}
                                  {e.metrics.length ? (
                                    e.metrics.map((m, i) => (
                                      <span key={m}>
                                        {i > 0 && ", "}
                                        {nodeRef(m)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="muted">none</span>
                                  )}
                                </li>
                                <li className="small">
                                  Workloads:{" "}
                                  {e.workloads.length ? (
                                    e.workloads.map((w, i) => (
                                      <span key={w}>
                                        {i > 0 && ", "}
                                        {nodeRef(w)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="muted">none</span>
                                  )}
                                </li>
                                <li className="small">Phase: {e.phase ? <a href={`/phases/${encodeURIComponent(e.phase)}`}>{e.phase}</a> : <span className="muted">none</span>}</li>
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {(g.unlinkedHypotheses.length > 0 || g.unlinkedExperiments.length > 0) && (
          <p className="small">
            Not reachable from a research question: {[...g.unlinkedHypotheses, ...g.unlinkedExperiments].join(", ")}
          </p>
        )}
      </section>
    </article>
  );
}
