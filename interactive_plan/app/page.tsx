// `/`: interim home until the full dashboard of IP-7 (ip-routes-and-views §3.1): STATUS next action,
// current phase/task, the last 5 log entries and entry points to the views built so far.
import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { getIndex } from "@/lib/server/data";
import { OP_TONES } from "@/lib/ui/tone";

export const dynamic = "force-dynamic";

export default async function Home() {
  const idx = await getIndex();
  const s = idx.status;
  const last5 = idx.log.slice(-5).reverse();
  return (
    <article className="page narrow-wide">
      <header className="page-header">
        <p className="eyebrow">Ferrum plan</p>
        <h1 className="page-title">Overview</h1>
        <p className="muted">The full dashboard (phase progress, gate checklist, approval counts, blockers) arrives in build step IP-7.</p>
      </header>

      <div className="cards">
        <section className="card card-wide" aria-labelledby="next-title">
          <h2 id="next-title" className="card-title">
            Next action
          </h2>
          {s ? (
            <>
              <p className="next-action mono" data-testid="next-action">
                {s.next_action}
              </p>
              <dl className="kv">
                <div>
                  <dt>Phase</dt>
                  <dd>
                    <a href={`/go/${encodeURIComponent(s.current_phase)}`}>{s.current_phase}</a>
                  </dd>
                </div>
                <div>
                  <dt>Task</dt>
                  <dd className="mono">{s.current_task ?? "none"}</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd className="mono">{s.session}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={s.status} />
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="banner banner-amber">STATUS.md is missing or invalid.</p>
          )}
        </section>

        <section className="card" aria-labelledby="log-title">
          <h2 id="log-title" className="card-title">
            Recent log
          </h2>
          <ol className="mini-log">
            {last5.map((e) => (
              <li key={e.line}>
                <span className={`chip chip-xs chip-${OP_TONES[e.op] ?? "neutral"}`}>{e.op}</span> <span className="muted small">{e.date}</span>
                <div>{e.title}</div>
              </li>
            ))}
          </ol>
          <Link href="/log" className="card-link">
            Open the log →
          </Link>
        </section>

        <section className="card" aria-labelledby="go-title">
          <h2 id="go-title" className="card-title">
            Browse
          </h2>
          <ul className="link-list">
            <li>
              <Link href="/wiki">Wiki browser</Link> <span className="muted small">tree, index, every page</span>
            </li>
            <li>
              <Link href="/search">Search</Link> <span className="muted small">press / anywhere</span>
            </li>
            <li>
              <Link href="/log">Log timeline</Link>
            </li>
            <li>
              <Link href="/go/schema">SCHEMA</Link>
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}
