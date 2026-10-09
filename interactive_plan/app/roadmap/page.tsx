// Roadmap (ip-routes-and-views §3.3): the phase DAG (xyflow; edges = depends_on, colour = status, the
// critical path highlighted), a server-rendered SVG timeline in cumulative sessions (no calendar
// dates; start = max(end of dependencies), width = est_sessions, milestones at phase ends) and a
// per-phase table that is also the text alternative. Every node, bar and row opens /phases/[id].
import type { Metadata } from "next";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import LazyFlowGraph from "@/components/graph/LazyFlowGraph";
import type { FlowEdgeSpec, FlowNodeSpec } from "@/components/graph/types";
import { getApprovals, getIndex } from "@/lib/server/data";
import { toneOf } from "@/lib/ui/tone";
import { layoutPhaseDag } from "@/lib/views/graphLayout";
import { exitBarVisible } from "@/lib/views/phase";
import { phaseDag, riskMatrix } from "@/lib/wiki/graph";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Roadmap" };

const phaseHref = (id: string) => `/phases/${encodeURIComponent(id)}`;

/** "P<order> <title>" unless the title already starts with it; cut to fit the label column. */
function timelineLabel(order: number, title: string): string {
  const m = /^P(\d+)(?!\d)/.exec(title);
  const t = m && Number(m[1]) === order ? title : `P${order} ${title}`;
  return t.length > 30 ? t.slice(0, 29) + "…" : t;
}

export default async function RoadmapRoute() {
  const [idx, view] = await Promise.all([getIndex(), getApprovals().catch(() => null)]);
  const dag = phaseDag(idx);
  const risks = new Map(riskMatrix(idx).risks.map((r) => [r.id, r] as const));
  const itemOf = (key: string) => view?.items.find((i) => i.key === key) ?? null;
  const onPath = new Set(dag.criticalPath);
  const boxes = layoutPhaseDag(dag);
  const byId = new Map(dag.nodes.map((n) => [n.id, n] as const));

  const nodes: FlowNodeSpec[] = boxes.map((b) => {
    const n = byId.get(b.id)!;
    const crit = onPath.has(n.id);
    return {
      id: n.id,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      kind: "item",
      title: n.title,
      sub: `P${n.order} · ${n.est_sessions} session${n.est_sessions === 1 ? "" : "s"}`,
      badges: [
        { text: n.status, tone: toneOf(n.status) },
        ...(n.milestone ? [{ text: n.milestone, tone: "outline" as const }] : []),
        ...(crit ? [{ text: "critical path", tone: "purple" as const }] : []),
        ...(dag.cycle.includes(n.id) ? [{ text: "cycle", tone: "red" as const }] : []),
      ],
      classes: [`fg-tone-${toneOf(n.status)}`, crit ? "fg-crit" : ""].filter(Boolean),
      href: phaseHref(n.id),
      ariaLabel: `${n.title} (${n.id}), ${n.status}${crit ? ", on the critical path" : ""}: open the phase`,
    };
  });
  const edges: FlowEdgeSpec[] = dag.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, classes: e.critical ? ["fg-edge-crit"] : [] }));

  // Timeline geometry (px). Bars are proportional to est_sessions: width = est_sessions × unit.
  const total = Math.max(1, dag.totalSessions);
  const LABEL_W = 230;
  const unit = Math.max(14, Math.min(56, Math.floor(880 / total)));
  const ROW = 36;
  const TOP = 30;
  const width = LABEL_W + total * unit + 60;
  const height = TOP + dag.nodes.length * ROW + 24;
  const tickStep = total <= 30 ? 1 : total <= 80 ? 5 : 10;
  const ticks = Array.from({ length: Math.floor(total / tickStep) + 1 }, (_, i) => i * tickStep);

  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Roadmap</h1>
        <p className="muted">
          {dag.nodes.length} phases · critical path {dag.criticalPath.length > 0 ? dag.criticalPath.join(" → ") : "none"} · {dag.totalSessions} sessions in total.
        </p>
      </header>
      {dag.cycle.length > 0 && (
        <p className="banner banner-red" role="alert">
          Dependency cycle between {dag.cycle.join(", ")} (PHASE-ORDER): these phases and those after them are not scheduled.
        </p>
      )}
      {dag.missing.length > 0 && (
        <p className="banner banner-amber">
          Missing dependencies: {dag.missing.map((m) => `${m.phase} → ${m.dep}`).join(", ")} (REF-DANGLING).
        </p>
      )}

      <section className="panel" aria-labelledby="dag-title">
        <h2 id="dag-title" className="panel-title">
          Phase dependencies
        </h2>
        <p className="muted small">Arrows point from a dependency to the phase that needs it. The critical path is marked and drawn thicker. Tab moves through the phases; Enter opens one.</p>
        {nodes.length === 0 ? <p className="muted">No phase pages.</p> : <LazyFlowGraph nodes={nodes} edges={edges} label="Phase dependency graph" height={360} testId="phase-dag" />}
      </section>

      <section className="panel" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="panel-title">
          Timeline in sessions
        </h2>
        <p className="small" data-testid="timeline-note">
          <strong>Session estimates are planning guesses, not measurements.</strong> The axis counts sessions, not dates: a phase starts when its last
          dependency ends.
        </p>
        <div className="table-wrap timeline-wrap">
          <svg className="timeline-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Phase timeline in cumulative sessions" data-testid="timeline" data-unit={unit}>
            <title>Phase timeline in cumulative sessions</title>
            {ticks.map((t) => (
              <g key={t} className="tl-tick">
                <line x1={LABEL_W + t * unit} x2={LABEL_W + t * unit} y1={TOP - 6} y2={height - 18} />
                <text x={LABEL_W + t * unit} y={TOP - 12} textAnchor="middle">
                  {t}
                </text>
              </g>
            ))}
            {dag.nodes.map((n, i) => {
              const s = dag.schedule.get(n.id);
              const y = TOP + i * ROW;
              const crit = onPath.has(n.id);
              return (
                <g key={n.id} className="tl-row">
                  <a href={phaseHref(n.id)} aria-label={`${n.title}: ${s ? `sessions ${s.start} to ${s.end}` : "not scheduled"}`}>
                    <text x={8} y={y + ROW / 2 + 4} className="tl-label">
                      {timelineLabel(n.order, n.title)}
                    </text>
                    {s ? (
                      <rect
                        x={LABEL_W + s.start * unit}
                        y={y + 6}
                        width={n.est_sessions * unit}
                        height={ROW - 12}
                        rx={4}
                        className={`tl-bar tl-${toneOf(n.status)}${crit ? " tl-crit" : ""}`}
                        data-testid="timeline-bar"
                        data-phase={n.id}
                        data-sessions={n.est_sessions}
                      >
                        <title>{`${n.id}: ${n.est_sessions} sessions (${s.start}–${s.end}), ${n.status}${crit ? ", critical path" : ""}`}</title>
                      </rect>
                    ) : (
                      <text x={LABEL_W + 4} y={y + ROW / 2 + 4} className="tl-unscheduled">
                        not scheduled (dependency cycle)
                      </text>
                    )}
                  </a>
                  {s && n.milestone && (
                    <g className="tl-milestone" data-testid="milestone" data-milestone={n.milestone}>
                      <polygon points={`${LABEL_W + s.end * unit},${y + 4} ${LABEL_W + s.end * unit + 7},${y + ROW / 2} ${LABEL_W + s.end * unit},${y + ROW - 4} ${LABEL_W + s.end * unit - 7},${y + ROW / 2}`} />
                      <text x={LABEL_W + s.end * unit + 10} y={y + ROW / 2 + 4}>
                        {n.milestone}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      <section className="panel" aria-labelledby="phases-table-title">
        <h2 id="phases-table-title" className="panel-title">
          Phases (text alternative)
        </h2>
        <div className="table-wrap">
          <table className="data-table" data-testid="phase-rows">
            <thead>
              <tr>
                <th scope="col">Phase</th>
                <th scope="col">Status</th>
                <th scope="col">Milestone</th>
                <th scope="col">Sessions</th>
                <th scope="col">Depends on</th>
                <th scope="col">Exit approval</th>
                <th scope="col">Tasks</th>
                <th scope="col">Risks</th>
                <th scope="col">Experiments</th>
              </tr>
            </thead>
            <tbody>
              {dag.nodes.map((n) => {
                const s = dag.schedule.get(n.id);
                // the same eligibility rule as the exit bar of /phases/[id] (gate-review/done, or a stored record)
                const exitItem = itemOf(`${n.id}#exit`);
                const exit = exitItem && exitBarVisible(n.status, exitItem.record !== null) ? exitItem : null;
                return (
                  <tr key={n.id} data-phase={n.id}>
                    <td>
                      <a href={phaseHref(n.id)}>{n.title}</a> <span className="mono small muted">{n.id}</span>
                      {onPath.has(n.id) && <span className="chip chip-xs chip-purple">critical path</span>}
                    </td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td>{n.milestone ?? <span className="muted">none</span>}</td>
                    <td className="mono small">
                      {n.est_sessions} {s ? `(${s.start}–${s.end})` : "(not scheduled)"}
                    </td>
                    <td className="small">{n.depends_on.length ? n.depends_on.join(", ") : <span className="muted">nothing</span>}</td>
                    <td>{exit ? <ApprovalBadge state={exit.state} /> : <span className="muted small">not open ({n.status})</span>}</td>
                    <td className="mono">{n.tasks}</td>
                    <td>
                      {n.risks.length === 0 ? (
                        <span className="muted small">none</span>
                      ) : (
                        <ul className="inline-list">
                          {n.risks.map((r) => {
                            const rr = risks.get(r);
                            return (
                              <li key={r}>
                                <a href={`/go/${encodeURIComponent(r)}`} className={`chip chip-xs band-chip band-${rr?.band ?? "none"}`} title={rr ? `L${rr.likelihood}×I${rr.impact}` : "missing risk page"}>
                                  {r}
                                  {rr ? ` · ${rr.score}` : ""}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td className="small">
                      {n.experiments.length === 0 ? (
                        <span className="muted">none</span>
                      ) : (
                        <ul className="inline-list">
                          {n.experiments.map((x) => (
                            <li key={x}>
                              <a href={`/go/${encodeURIComponent(x)}`}>{x}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
