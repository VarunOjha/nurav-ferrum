// /log (ip-routes-and-views §3.10): wiki/log.md as a timeline grouped by date, newest first by default,
// filters by op, session and page id, the RESUME "last 5" view, and LOG-FORMAT findings on top.
import type { Metadata } from "next";
import { getIndex } from "@/lib/server/data";
import { LOG_OPS } from "@/lib/wiki/log";
import { filterLog, groupByDate, sessionsOf } from "@/lib/wiki/logView";
import { OP_TONES } from "@/lib/ui/tone";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

const one = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

function IdLinks({ ids, known }: { ids: string[]; known: (id: string) => boolean }) {
  return (
    <ul className="inline-list">
      {ids.map((id) => (
        <li key={id}>
          <a href={`/go/${encodeURIComponent(id)}`} className={known(id) ? "id-link" : "id-link link-missing"} title={known(id) ? undefined : "missing"}>
            {id}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const sp = await searchParams;
  const op = one(sp.op);
  const session = one(sp.session);
  const page = one(sp.page);
  const order = one(sp.order) === "oldest" ? "oldest" : "newest";
  const last5 = one(sp.view) === "last5";
  const idx = await getIndex();
  const logPage = idx.byPath.get("log.md");
  const formatFindings = (logPage?.findings ?? []).filter((f) => f.code === "LOG-FORMAT");
  const entries = filterLog(idx.log, { op, session, page, order, last5 });
  const days = groupByDate(entries);
  const sessions = sessionsOf(idx.log);
  const known = (id: string) => idx.byId.has(id) || /^Q-\d{3}$/.test(id);
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string | null> = { op, session, page, order: order === "oldest" ? "oldest" : null, view: last5 ? "last5" : null, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return "/log" + (s ? "?" + s : "");
  };

  return (
    <article className="page narrow-wide">
      <header className="page-header">
        <h1 className="page-title">Log</h1>
        <p className="muted">
          {idx.log.length} entries in <code>wiki/log.md</code> (SCHEMA §12).{" "}
          {last5 ? "Showing the last 5, as the RESUME recipe reads them." : order === "newest" ? "Newest first." : "Chronological order."}
        </p>
      </header>

      {formatFindings.length > 0 && (
        <section className="findings banner-red" aria-label="LOG-FORMAT findings">
          <strong>LOG-FORMAT findings ({formatFindings.length})</strong>
          <ul className="findings-list">
            {formatFindings.map((f, i) => (
              <li key={i} className="finding finding-error">
                <code>LOG-FORMAT</code> {f.line ? <span className="muted">line {f.line}</span> : null} {f.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form method="get" action="/log" className="filters" aria-label="Filter the log">
        <label>
          <span>Op</span>
          <select name="op" defaultValue={op ?? ""}>
            <option value="">all</option>
            {LOG_OPS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Session</span>
          <select name="session" defaultValue={session ?? ""}>
            <option value="">all</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Page id</span>
          <input name="page" type="text" defaultValue={page ?? ""} placeholder="e.g. ip-spec" />
        </label>
        {order === "oldest" && <input type="hidden" name="order" value="oldest" />}
        {last5 && <input type="hidden" name="view" value="last5" />}
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
        {(op || session || page) && (
          <a className="btn btn-ghost btn-sm" href={link({ op: null, session: null, page: null })}>
            Clear filters
          </a>
        )}
      </form>

      <div className="segmented" role="group" aria-label="View">
        <a href={link({ order: null })} aria-current={order === "newest" ? "true" : undefined}>
          Newest first
        </a>
        <a href={link({ order: "oldest" })} aria-current={order === "oldest" ? "true" : undefined}>
          Chronological
        </a>
        <a href={link({ view: last5 ? null : "last5" })} aria-current={last5 ? "true" : undefined}>
          Last 5
        </a>
      </div>

      <p className="result-count" aria-live="polite">
        {entries.length} entr{entries.length === 1 ? "y" : "ies"} shown
      </p>

      <div className="timeline">
        {days.map((d) => (
          <section key={d.date} className="day" aria-labelledby={`day-${d.date}`}>
            <h2 id={`day-${d.date}`} className="day-title">
              <time dateTime={d.date}>{d.date}</time>
            </h2>
            <ol className="entries">
              {d.entries.map((e) => (
                <li key={e.line} className="entry" data-op={e.op} data-line={e.line}>
                  <div className="entry-head">
                    <a href={link({ op: e.op })} className={`chip chip-${OP_TONES[e.op] ?? "neutral"} chip-strong op-chip`} title={`filter by op ${e.op}`}>
                      {e.op}
                    </a>
                    <h3 className="entry-title">{e.title}</h3>
                    {e.session && (
                      <a href={link({ session: e.session })} className="chip chip-outline chip-xs" title={`filter by session ${e.session}`}>
                        {e.session}
                      </a>
                    )}
                  </div>
                  <dl className="entry-fields">
                    {e.pages.length > 0 && (
                      <div>
                        <dt>pages</dt>
                        <dd>
                          <IdLinks ids={e.pages} known={known} />
                          {e.notes?.pages && <span className="muted small log-list-note"> {e.notes.pages}</span>}
                        </dd>
                      </div>
                    )}
                    {e.stales.length > 0 && (
                      <div>
                        <dt>stales</dt>
                        <dd>
                          <IdLinks ids={e.stales} known={known} />
                          {e.notes?.stales && (
                            <span className="muted small log-list-note" data-testid="stales-note">
                              {" "}
                              {e.notes.stales}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                    {e.result && (
                      <div>
                        <dt>result</dt>
                        <dd>{e.result}</dd>
                      </div>
                    )}
                    {e.next && (
                      <div>
                        <dt>next</dt>
                        <dd>{e.next}</dd>
                      </div>
                    )}
                    {e.commit && (
                      <div>
                        <dt>commit</dt>
                        <dd>
                          <code>{e.commit}</code>
                        </dd>
                      </div>
                    )}
                  </dl>
                  <details className="entry-raw">
                    <summary>Raw entry (line {e.line})</summary>
                    <pre>
                      <code>{e.raw}</code>
                    </pre>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}
