// Decision register (ip-routes-and-views §3.5): id, title, status, decided_by, date, effective
// approval state and supersedes/superseded_by; filters by status and approval state; claude-proposed
// decisions awaiting approval first; owner-decided rows say "owner-decided (confirm or overturn)".
import type { Metadata } from "next";
import Link from "next/link";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import { getApprovals, getIndex } from "@/lib/server/data";
import { decisionRows, filterDecisions } from "@/lib/views/registers";
import { STATUS_ENUMS } from "@/lib/wiki/schemas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decisions" };

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

const STATES = ["PENDING", "APPROVED", "APPROVED_VOLATILE_DRIFT", "STALE", "CHANGES_REQUESTED", "REJECTED", "INVALID"];

const href = (id: string) => `/decisions/${encodeURIComponent(id)}`;

export default async function DecisionsRoute({ searchParams }: PageProps<"/decisions">) {
  const sp = await searchParams;
  const status = one(sp.status);
  const state = one(sp.state);
  const [idx, view] = await Promise.all([getIndex(), getApprovals().catch(() => null)]);
  const all = decisionRows(idx, view?.items ?? []);
  const rows = filterDecisions(all, { status, state });
  const awaiting = all.filter((r) => r.awaiting).length;
  const known = (id: string) => idx.byId.has(id);

  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Decisions</h1>
        <p className="muted">
          {all.length} ADRs · {awaiting} Claude-proposed decision{awaiting === 1 ? "" : "s"} awaiting the owner&apos;s approval (listed first).
        </p>
      </header>

      <form className="filters" method="get" action="/decisions" aria-label="Decision filters">
        <label>
          Status{" "}
          <select name="status" defaultValue={status ?? ""}>
            <option value="">any status</option>
            {STATUS_ENUMS.decision.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Approval state{" "}
          <select name="state" defaultValue={state ?? ""}>
            <option value="">any state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
        {(status || state) && (
          <Link href="/decisions" className="small">
            Clear filters
          </Link>
        )}
      </form>

      <p className="result-count small" aria-live="polite">
        {rows.length} of {all.length} shown
      </p>
      <div className="table-wrap">
        <table className="data-table" data-testid="decision-table">
          <thead>
            <tr>
              <th scope="col">Id</th>
              <th scope="col">Title</th>
              <th scope="col">Status</th>
              <th scope="col">Decided by</th>
              <th scope="col">Date</th>
              <th scope="col">Approval</th>
              <th scope="col">Supersedes</th>
              <th scope="col">Superseded by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-adr={r.id} data-state={r.state} className={r.awaiting ? "row-awaiting" : undefined}>
                <td className="mono small">
                  <a href={href(r.id)}>{r.id}</a>
                </td>
                <td>
                  <a href={href(r.id)}>{r.title}</a>
                  {r.awaiting && <span className="chip chip-xs chip-amber">awaiting approval</span>}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="small">{r.decided_by === "owner" ? "owner-decided (confirm or overturn)" : "claude-proposed"}</td>
                <td className="mono small">{r.date}</td>
                <td>{STATES.includes(r.state) ? <ApprovalBadge state={r.state} /> : <span className="muted small">{r.state}</span>}</td>
                <td className="small">
                  {r.supersedes.length === 0 ? (
                    <span className="muted">none</span>
                  ) : (
                    r.supersedes.map((s, i) => (
                      <span key={s}>
                        {i > 0 && ", "}
                        <a href={`/go/${encodeURIComponent(s)}`} className={known(s) ? undefined : "link-missing"}>
                          {s}
                        </a>
                      </span>
                    ))
                  )}
                </td>
                <td className="small">
                  {r.superseded_by ? (
                    <a href={`/go/${encodeURIComponent(r.superseded_by)}`} className={known(r.superseded_by) ? undefined : "link-missing"}>
                      {r.superseded_by}
                    </a>
                  ) : (
                    <span className="muted">none</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="muted">No decisions match the filters.</p>}
    </article>
  );
}
