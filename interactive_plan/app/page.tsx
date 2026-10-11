// Overview (owner-approved Main mockup, Layout A): where we are, questions for you, what happens next
// in the owner's four-part format, phase progress (each card opens the phase popup), how references
// work, and the latest log. Reads overview.json, roadmap.json, phases/*.json, log.json and refs.json.
import type { Metadata } from "next";
import Link from "next/link";
import { OpenModalButton } from "@/components/portal/Modal";
import { phaseDialogId } from "@/lib/portal/dialogs";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { resolveRef, tokenize, type RefData } from "@/lib/portal/refs";
import { getPatterns, getPortal, getRefData } from "@/lib/portal/server";
import { headline, latestLog, percentDone, phaseTone, questionsRow, shortDate } from "@/lib/portal/view";
import { ScriptButton } from "@/components/portal/ScriptProvider";
import { ui } from "@/lib/portal/uiRefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

/** The id shown as the live example in "Clickable references" (first decision with an explainer). */
const EXAMPLE_REFS = ["adr-0023", "adr-0024", "adr-0001"];

/** True when `text` already shows a clickable id for the same explainer as `ref` (no second chip then). */
function mentions(text: string, ref: string, patterns: RegExp[], refData: RefData): boolean {
  const target = resolveRef(refData, ref)?.id ?? ref;
  return tokenize(text, patterns).some((t) => t.type === "ref" && (resolveRef(refData, t.id)?.id ?? t.id) === target);
}

function Missing({ what }: { what: string }) {
  return <p className="muted">{what} could not be read (see the note at the top of the page).</p>;
}

export default async function OverviewPage() {
  const [{ files }, refData, patterns] = await Promise.all([getPortal(), getRefData(), getPatterns()]);
  const { overview, roadmap, phases, log } = files;
  const latest = latestLog(log, 3);
  const example = EXAMPLE_REFS.find((id) => resolveRef(refData, id)) ?? null;
  const { head, rest } = headline(overview?.summary ?? "");
  const next = overview?.next_action;

  return (
    <div className="page">
      <section className="row-wrap">
        <div className="card card-main stack-18" aria-labelledby="where-title" {...ui("OV-1")}>
          <div className="eyebrow" id="where-title">
            Where we are
          </div>
          {overview ? (
            <>
              <h1 className="hero">
                <RichText text={head} />
              </h1>
              {rest && (
                <p className="lead">
                  <RichText text={rest} />
                </p>
              )}
              <table className="kv" data-testid="where-we-are">
                <tbody>
                  {overview.where_we_are.map((row, i) => (
                    <tr key={i}>
                      <th scope="row">
                        <RichText text={row.item} />
                      </th>
                      <td>
                        <RichText text={row.state} />
                        {row.ref && !mentions(row.state, row.ref, patterns, refData) && (
                          <>
                            {" "}
                            <Ref id={row.ref} variant="chip">
                              {resolveRef(refData, row.ref)?.title ?? row.ref}
                            </Ref>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Counted from the list on the right, so the row, the list and the tab badge always agree. */}
                  <tr data-testid="questions-row">
                    <th scope="row">Questions for you</th>
                    <td>{questionsRow(overview.questions_for_you)}</td>
                  </tr>
                  {latest[0] && (
                    <tr>
                      <th scope="row">Last update</th>
                      <td>
                        {shortDate(latest[0].date)} · <RichText text={latest[0].title} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <h1 className="hero">Ferrum plan portal</h1>
              <Missing what="The overview text" />
            </>
          )}
        </div>

        <aside className="card card-side stack-14" aria-labelledby="questions-title" data-testid="questions-for-you" {...ui("OV-2")}>
          <h2 className="eyebrow" id="questions-title">
            Questions for you
          </h2>
          {overview ? (
            overview.questions_for_you.items.length === 0 ? (
              <p className="muted">Nothing waiting for you right now.</p>
            ) : (
              overview.questions_for_you.items.map((q) => (
                <div key={q.id} className="question-card">
                  <div className="strong">
                    <RichText text={q.question} />
                  </div>
                  <div className="small muted">
                    <Ref id={q.id} variant="code" /> · Asked in Claude Code · {shortDate(q.asked)}
                  </div>
                </div>
              ))
            )
          ) : (
            <Missing what="The questions" />
          )}
          {overview && (
            <p className="small muted">
              {overview.questions_for_you.open} questions are open in total; the rest are asked later, with the phase they belong to.
            </p>
          )}
          <Link href="/questions" className="more">
            See the open questions →
          </Link>
        </aside>
      </section>

      <section className="card stack-18" aria-labelledby="next-title" data-testid="what-next" {...ui("OV-3")}>
        <div className="row-between">
          <h2 className="h2" id="next-title">
            What happens next
          </h2>
          <span className="small muted">
            {next?.who === "you" ? (
              <>
                <span className="chip chip-you">You</span> run something, then tell Claude
              </>
            ) : (
              "Only when you need to run something — otherwise Claude just continues"
            )}
          </span>
        </div>
        {next ? (
          <ol className="next-grid">
            <li className="next-part" {...ui("OV-3", { key: "where" })}>
              <div className="next-part-title">1 · Where we are</div>
              <table className="mini">
                <tbody>
                  {next.where_we_are.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">
                        <RichText text={r.item} />
                      </th>
                      <td>
                        <RichText text={r.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
            <li className="next-part" {...ui("OV-3", { key: "why" })}>
              <div className="next-part-title">2 · Why run something</div>
              <p className="lh">
                <RichText text={next.why} />
              </p>
            </li>
            <li className="next-part" {...ui("OV-3", { key: "script" })}>
              <div className="next-part-title">3 · The script</div>
              {next.script ? (
                <div className="stack-8">
                  <div className="row-between">
                    <span className="mono small">{next.script.path}</span>
                    {/* The owner reads the script before running it (owner feedback 2026-10-09). */}
                    <ScriptButton path={next.script.path} className="secondary-btn">
                      Read the script
                    </ScriptButton>
                  </div>
                  {next.script.parts.map((p, i) => (
                    <div key={i} className="stack-4">
                      <pre className="code-block code-sm">{p.code}</pre>
                      <div className="small">
                        <RichText text={p.explains} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="code-block code-sm">— none needed —</div>
              )}
            </li>
            <li className="next-part" {...ui("OV-3", { key: "tell" })}>
              <div className="next-part-title">4 · Then tell Claude</div>
              <p className="lh">{next.tell_claude ? <RichText text={next.tell_claude} /> : "Nothing. Claude continues on its own."}</p>
            </li>
          </ol>
        ) : (
          <Missing what="The next step" />
        )}
      </section>

      <section className="card stack-18" aria-labelledby="phases-title" {...ui("OV-4")}>
        <div className="row-between">
          <h2 className="h2" id="phases-title">
            Phase progress
          </h2>
          <span className="small muted">Click a phase to open it in a popup</span>
        </div>
        {roadmap ? (
          <ul className="phase-grid" data-testid="phase-cards">
            {roadmap.phases.map((p) => {
              const tone = phaseTone(p.status);
              const pct = percentDone(p.tasks_done, p.tasks_total);
              const hasPopup = phases.some((ph) => ph.id === p.id);
              const body = (
                <>
                  <span className="phase-card-top">
                    <span className="mono small muted">{p.short}</span>
                    <span className={`chip chip-${tone}`}>{p.status}</span>
                  </span>
                  <span className="phase-card-name">{p.name}</span>
                  <span className="phase-card-goal">{p.one_line_goal}</span>
                  <span className="bar" aria-hidden="true">
                    <span className={`bar-fill bar-${tone}`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="small muted">
                    {p.tasks_total === null ? "Tasks not counted yet" : `${p.tasks_done} of ${p.tasks_total} tasks done`}
                  </span>
                </>
              );
              return (
                // The item suffix is the phase number (P1 -> OV-4.1), so it never shifts.
                <li key={p.id} {...ui("OV-4", { index: p.short.replace(/^P/, ""), item: p.short })}>
                  {hasPopup ? (
                    <OpenModalButton target={phaseDialogId(p.id)} className="phase-card">
                      {body}
                    </OpenModalButton>
                  ) : (
                    <div className="phase-card">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Missing what="The roadmap" />
        )}
      </section>

      <section className="row-wrap">
        <div className="card card-main stack-14" aria-labelledby="refs-title" {...ui("OV-5")}>
          <h2 className="h2" id="refs-title">
            Clickable references
          </h2>
          <p className="lead">
            Every id is a link.{" "}
            {example ? (
              <>
                Clicking{" "}
                <Ref id={example} variant="chip">
                  {resolveRef(refData, example)?.title ?? example}
                </Ref>{" "}
                opens a small explainer right here, with no page change.
              </>
            ) : (
              "Clicking one opens a small explainer right here, with no page change."
            )}{" "}
            Inside it, related ids open in the same popup; Esc closes it.
          </p>
        </div>
        <div className="card card-side stack-12" aria-labelledby="log-title" data-testid="latest-log" {...ui("OV-6")}>
          <h2 className="h2" id="log-title">
            Latest log
          </h2>
          {latest.length === 0 ? (
            <p className="muted">No log entries yet.</p>
          ) : (
            <ul className="plain-list stack-12">
              {latest.map((e) => (
                <li key={e.id} className="lh">
                  <strong>{shortDate(e.date)}</strong> — <RichText text={e.title} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/log" className="more">
            Open the log →
          </Link>
        </div>
      </section>

    </div>
  );
}
