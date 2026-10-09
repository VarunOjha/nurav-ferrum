// Risks (ip-routes-and-views §3.6): a 5×5 heatmap (x = likelihood 1→5, y = impact 1→5) as a real
// <table> with row and column headers, cells banded by score (an app convention, not SCHEMA: 1–4 low,
// 5–9 moderate, 10–14 high, 15–25 critical; each band has a pattern as well as a colour and a text
// label), and a register sortable by any column (URL parameters, so it works without JavaScript).
import type { Metadata } from "next";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import { getApprovals, getIndex } from "@/lib/server/data";
import { ACTIVE_RISK, isRiskSortKey, sortRisks, type RiskSortKey } from "@/lib/views/registers";
import { riskBand, riskMatrix, type RiskBand } from "@/lib/wiki/graph";
import { goTarget } from "@/lib/wiki/routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Risks" };

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

const BAND_TEXT: Record<RiskBand, string> = { low: "low (1–4)", moderate: "moderate (5–9)", high: "high (10–14)", critical: "critical (15–25)" };

const COLUMNS: { key: RiskSortKey | null; label: string; defaultDir: "asc" | "desc" }[] = [
  { key: "id", label: "Id", defaultDir: "asc" },
  { key: "title", label: "Title", defaultDir: "asc" },
  { key: "likelihood", label: "L", defaultDir: "desc" },
  { key: "impact", label: "I", defaultDir: "desc" },
  { key: "score", label: "Score", defaultDir: "desc" },
  { key: "status", label: "Status", defaultDir: "asc" },
  { key: "owner_phase", label: "Owner phase", defaultDir: "asc" },
  { key: null, label: "Spike", defaultDir: "asc" },
  { key: null, label: "Mitigation", defaultDir: "asc" },
  { key: null, label: "Trigger", defaultDir: "asc" },
  { key: null, label: "Fallback", defaultDir: "asc" },
  { key: "state", label: "Approval", defaultDir: "asc" },
];

export default async function RisksRoute({ searchParams }: PageProps<"/risks">) {
  const sp = await searchParams;
  const sortParam = one(sp.sort);
  const sort: RiskSortKey = isRiskSortKey(sortParam) ? sortParam : "score";
  const dir: "asc" | "desc" = one(sp.dir) === "asc" ? "asc" : one(sp.dir) === "desc" ? "desc" : sort === "score" ? "desc" : "asc";
  const activeOnly = one(sp.active) === "1";
  const [idx, view] = await Promise.all([getIndex(), getApprovals().catch(() => null)]);
  const m = riskMatrix(idx);
  const stateOf = new Map((view?.items ?? []).filter((i) => !i.exit).map((i) => [i.id, i.state] as const));
  const shown = m.risks.filter((r) => !activeOnly || ACTIVE_RISK.has(r.status));
  const shownIds = new Set(shown.map((r) => r.id));
  const rows = sortRisks(
    shown.map((r) => ({ ...r, state: stateOf.get(r.id) ?? "n/a" })),
    sort,
    dir,
  );
  const qs = (o: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { sort, dir, active: activeOnly ? "1" : null, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/risks?${p.toString()}`;
  };
  const byId = new Map(m.risks.map((r) => [r.id, r] as const));

  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Risks</h1>
        <p className="muted">
          {m.risks.length} risks, {m.risks.filter((r) => ACTIVE_RISK.has(r.status)).length} open or mitigating. Score = likelihood × impact (SCHEMA §6.5).
        </p>
      </header>

      <nav className="segmented" aria-label="Risk filter">
        <a href={qs({ active: null })} aria-current={!activeOnly ? "true" : undefined}>
          All risks
        </a>
        <a href={qs({ active: "1" })} aria-current={activeOnly ? "true" : undefined}>
          Open + mitigating only
        </a>
      </nav>

      <section className="panel" aria-labelledby="heat-title">
        <h2 id="heat-title" className="panel-title">
          Heatmap
        </h2>
        <ul className="legend small" aria-label="Score bands (app convention)">
          {(["low", "moderate", "high", "critical"] as RiskBand[]).map((b) => (
            <li key={b}>
              <span className={`legend-box heat-${b}`} aria-hidden="true" /> {BAND_TEXT[b]}
            </li>
          ))}
          <li className="muted">Bands are a convention of this app, not of SCHEMA.</li>
        </ul>
        <div className="table-wrap">
          <table className="heatmap" data-testid="heatmap">
            <caption className="sr-only">Risks by likelihood (columns, 1 to 5) and impact (rows, 5 down to 1)</caption>
            <thead>
              <tr>
                <th scope="col" className="heat-corner">
                  Impact ↓ / Likelihood →
                </th>
                {[1, 2, 3, 4, 5].map((l) => (
                  <th key={l} scope="col">
                    L{l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((i) => (
                <tr key={i}>
                  <th scope="row">I{i}</th>
                  {[1, 2, 3, 4, 5].map((l) => {
                    const band = riskBand(l * i);
                    const ids = m.cells[i - 1][l - 1].filter((id) => shownIds.has(id));
                    return (
                      <td key={l} className={`heat-cell heat-${band}`} data-l={l} data-i={i} data-band={band} data-testid={`cell-${l}-${i}`}>
                        <span className="heat-score">
                          {l * i} <span className="sr-only">{band}</span>
                        </span>
                        {ids.length > 0 && (
                          <ul className="heat-chips">
                            {ids.map((id) => (
                              <li key={id}>
                                <a href={`#risk-${id}`} className="chip chip-xs heat-chip" title={byId.get(id)?.title}>
                                  {id}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="reg-title">
        <h2 id="reg-title" className="panel-title">
          Register
        </h2>
        <p className="muted small">Select a column header to sort by it; select it again to reverse the order.</p>
        <div className="table-wrap">
          <table className="data-table risk-table" data-testid="risk-register">
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  if (!c.key) {
                    return (
                      <th key={c.label} scope="col">
                        {c.label}
                      </th>
                    );
                  }
                  const active = c.key === sort;
                  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : c.defaultDir;
                  return (
                    <th key={c.label} scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} data-col={c.key}>
                      <a href={qs({ sort: c.key, dir: nextDir })} className="sort-link">
                        {c.label}
                        <span aria-hidden="true">{active ? (dir === "asc" ? " ▲" : " ▼") : ""}</span>
                      </a>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const spike = r.spike ? goTarget(idx, r.spike) : null;
                return (
                  <tr key={r.id} id={`risk-${r.id}`} data-risk={r.id} data-score={r.score}>
                    <td className="mono small">
                      <a href={`/go/${encodeURIComponent(r.id)}`}>{r.id}</a>
                    </td>
                    <td>{r.title}</td>
                    <td className="mono">{r.likelihood}</td>
                    <td className="mono">{r.impact}</td>
                    <td>
                      <span className={`chip chip-xs band-chip band-${r.band}`} title={BAND_TEXT[r.band]}>
                        {r.score} · {r.band}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="small">
                      <a href={`/go/${encodeURIComponent(r.owner_phase)}`}>{r.owner_phase}</a>
                    </td>
                    <td className="small">
                      {r.spike ? (
                        spike ? (
                          <a href={`${spike}#task-${r.spike}`}>{r.spike}</a>
                        ) : (
                          <span className="link-missing" title="no phase defines this task">
                            {r.spike}
                          </span>
                        )
                      ) : (
                        <span className="muted">none</span>
                      )}
                    </td>
                    <td className="small">{r.mitigation}</td>
                    <td className="small">{r.trigger ?? <span className="muted">none</span>}</td>
                    <td className="small">{r.fallback ?? <span className="muted">none</span>}</td>
                    <td>{r.state !== "n/a" ? <ApprovalBadge state={r.state} /> : <span className="muted small">n/a</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="muted small">No risks{activeOnly ? " are open or mitigating" : ""}.</p>}
      </section>
    </article>
  );
}
