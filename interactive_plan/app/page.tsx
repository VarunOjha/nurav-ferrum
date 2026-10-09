// Dashboard `/` (ip-routes-and-views §3.1): next action from STATUS.md, phase progress strip with the
// sessions budget and last activity, the current phase's entry gate, approval counts, blockers, the
// last 5 log entries (the RESUME recipe) and the lint summary.
import Link from "next/link";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";
import { EFFECTIVE_STATES } from "@/lib/approvals/state";
import { CHECK_TEXT } from "@/lib/lint/gateReport";
import { getApprovals, getApprovalsFile, getIndex, getLint } from "@/lib/server/data";
import { OP_TONES } from "@/lib/ui/tone";
import { approvalsMap, blockers, lastActivity, phaseStrip, progress, stateCounts } from "@/lib/views/dashboard";
import { eligibleItems } from "@/lib/views/inbox";
import { entryGate } from "@/lib/wiki/gates";
import { linkTargetInfo } from "@/lib/wiki/load";
import { rebaseRootLinks } from "@/lib/wiki/mdlinks";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function IdOrQ({ id, known }: { id: string; known: boolean }) {
  return (
    <a href={`/go/${encodeURIComponent(id)}`} className={known ? "id-link" : "id-link link-missing"} title={known ? undefined : "missing (REF-DANGLING)"}>
      {id}
    </a>
  );
}

export default async function Dashboard() {
  const idx = await getIndex();
  const [view, file, lint] = await Promise.all([getApprovals(), getApprovalsFile(), getLint().catch(() => null)]);
  const s = idx.status;
  const known = (id: string) => idx.byId.has(id) || idx.openQuestions.some((q) => q.id === id);
  const cells = phaseStrip(idx);
  const prog = progress(cells);
  const activity = lastActivity(idx.log);
  const items = eligibleItems(view.items);
  const counts = stateCounts(items);
  const blocks = blockers(idx, items);
  const gate = s ? entryGate(idx, approvalsMap(file), s.current_phase) : null;
  const last5 = idx.log.slice(-5).reverse();

  return (
    <article className="page page-wide">
      <header className="page-header">
        <p className="eyebrow">Ferrum plan</p>
        <h1 className="page-title">Dashboard</h1>
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
              {idx.statusNextAction && (
                <details className="next-action-section" data-testid="next-action-section" open>
                  <summary className="small">
                    STATUS.md <q>Next action</q> section
                  </summary>
                  <div className="page-body">
                    <Markdown source={rebaseRootLinks(idx.statusNextAction)} path="STATUS.md" exists={linkTargetInfo(idx).exists} knownIds={new Set(idx.byId.keys())} />
                  </div>
                </details>
              )}
              {s.blocked_on.length > 0 && (
                <div className="blocked-on banner banner-amber" data-testid="blocked-on">
                  <strong>Blocked on:</strong>{" "}
                  <ul className="inline-list">
                    {s.blocked_on.map((b) => (
                      <li key={b}>
                        <IdOrQ id={b} known={known(b)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="banner banner-amber">STATUS.md is missing or invalid.</p>
          )}
        </section>

        <section className="card card-wide" aria-labelledby="phases-title">
          <h2 id="phases-title" className="card-title">
            Phase progress
          </h2>
          <ol className="phase-strip" data-testid="phase-strip">
            {cells.map((c) => (
              <li key={c.id} className={`phase-cell${c.id === s?.current_phase ? " phase-current" : ""}`} data-status={c.status}>
                <a href={`/phases/${encodeURIComponent(c.id)}`} className="phase-cell-link">
                  <span className="phase-order mono">P{c.order}</span>
                  <span className="phase-name">{c.title}</span>
                </a>
                <StatusBadge status={c.status} />
                <span className="muted small">
                  {c.milestone ?? "no milestone"} · {c.est_sessions} session{c.est_sessions === 1 ? "" : "s"}
                </span>
                {c.id === s?.current_phase && <span className="sr-only">(current phase)</span>}
              </li>
            ))}
          </ol>
          <div className="meters">
            <div className="meter-row">
              <span className="small">
                Phases done: <strong data-testid="phases-done">{prog.done}</strong> of {prog.total}
              </span>
              <meter min={0} max={prog.total} value={prog.done} aria-label={`Phases done: ${prog.done} of ${prog.total}`} />
              <span className="muted small">{pct(prog.done, prog.total)} %</span>
            </div>
            <div className="meter-row">
              <span className="small">
                Sessions budget (planning estimate): {prog.sessionsDone} of {prog.sessionsTotal}
              </span>
              <meter
                min={0}
                max={Math.max(1, prog.sessionsTotal)}
                value={prog.sessionsDone}
                aria-label={`Estimated sessions of done phases: ${prog.sessionsDone} of ${prog.sessionsTotal}`}
              />
              <span className="muted small">{pct(prog.sessionsDone, prog.sessionsTotal)} %</span>
            </div>
          </div>
          <p className="small">
            Last activity:{" "}
            {activity ? (
              <>
                <span className="mono">{activity.task}</span> · {activity.date} · {activity.title}
              </>
            ) : (
              <span className="muted">no code log entry names a task yet</span>
            )}
          </p>
          <p className="muted small">Task progress is not shown as a percentage: task status is not stored on phase pages (SCHEMA §6.3).</p>
        </section>

        {gate && s && (
          <section className="card" aria-labelledby="gate-title">
            <h2 id="gate-title" className="card-title">
              Entry gate: <a href={`/phases/${encodeURIComponent(s.current_phase)}`}>{s.current_phase}</a>
            </h2>
            <ul className="gate-list" data-testid="dashboard-gate">
              {gate.items.map((it) => (
                <li key={it.check} data-ok={it.ok}>
                  <span className={`chip chip-xs chip-${it.ok ? "green" : "amber"}`}>{it.ok ? "✓ ok" : "✗ open"}</span> {CHECK_TEXT[it.check] ?? it.check}
                  {!it.ok && <span className="muted small"> ({it.ids.length})</span>}
                </li>
              ))}
            </ul>
            <p className="small">
              {gate.bootstrapException ? "Bootstrap exception (SCHEMA §9.7): informative only." : gate.ok && file.valid ? "The gate passes." : "The gate is blocked."}
            </p>
          </section>
        )}

        <section className="card" aria-labelledby="counts-title">
          <h2 id="counts-title" className="card-title">
            Approvals
          </h2>
          <ul className="count-list" data-testid="approval-counts">
            {EFFECTIVE_STATES.map((st) => (
              <li key={st} data-state={st}>
                <Link href={`/approvals?state=${st}`} className="count-link">
                  <span className="count-num" data-testid={`count-${st}`}>
                    {counts[st]}
                  </span>{" "}
                  <ApprovalBadge state={st} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Over {items.length} approvable keys. <Link href="/approvals">Open the inbox →</Link>
          </p>
        </section>

        <section className="card" aria-labelledby="blockers-title">
          <h2 id="blockers-title" className="card-title">
            Blockers
          </h2>
          {blocks.length === 0 ? (
            <p className="muted small">None.</p>
          ) : (
            <ul className="plain-list" data-testid="blockers">
              {blocks.map((b) => (
                <li key={`${b.kind}:${b.id}`} data-kind={b.kind}>
                  <span className="chip chip-xs chip-amber">{b.kind}</span> <IdOrQ id={b.id.replace(/#exit$/, "")} known={known(b.id.replace(/#exit$/, ""))} />{" "}
                  <span className="small">{b.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="log-title">
          <h2 id="log-title" className="card-title">
            Recent log
          </h2>
          <ol className="mini-log" data-testid="recent-log">
            {last5.map((e) => (
              <li key={e.line}>
                <span className={`chip chip-xs chip-${OP_TONES[e.op] ?? "neutral"}`}>{e.op}</span> <span className="muted small">{e.date}</span>
                <div>{e.title}</div>
              </li>
            ))}
          </ol>
          <Link href="/log?view=last5" className="card-link">
            Open the log →
          </Link>
        </section>

        <section className="card" aria-labelledby="lint-title">
          <h2 id="lint-title" className="card-title">
            Wiki lint
          </h2>
          {lint ? (
            <p data-testid="lint-counts">
              <span className="chip chip-red chip-strong">{lint.summary.errors} errors</span>{" "}
              <span className="chip chip-amber chip-strong">{lint.summary.warnings} warnings</span>
            </p>
          ) : (
            <p className="muted small">The lint run failed; open the report for details.</p>
          )}
          <Link href="/lint" className="card-link">
            Open the lint report →
          </Link>
        </section>
      </div>
    </article>
  );
}
