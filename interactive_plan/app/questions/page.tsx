// Questions tab: every question Claude has asked you, as a log-like list. Open questions come first
// (in the order of the phase they hold up), then answered, then withdrawn. You answer in Claude Code;
// this tab only shows them (owner feedback 2026-10-09). Reads questions.json, overview.json and
// roadmap.json.
import type { Metadata } from "next";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { getPortal } from "@/lib/portal/server";
import { questionsByStatus, roadmapRow, shortDate } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Questions" };

const TONE = { open: "you", answered: "done", withdrawn: "later" } as const;

export default async function QuestionsPage() {
  const { files } = await getPortal();
  const { questions, overview, roadmap } = files;
  const groups = questionsByStatus(questions);
  const askedNow = new Set(overview?.questions_for_you.items.map((q) => q.id) ?? []);
  const phaseShort = (id: string) => roadmapRow(roadmap, id)?.short ?? id;

  return (
    <div className="page page-narrow">
      <PageHead title="Questions" summary={questions?.summary ?? null}>
        <nav aria-label="Question groups" className="pill-row">
          {groups.map((g) => (
            <a key={g.status} href={`#q-${g.status}`} className="pill">
              {g.label} ({g.items.length})
            </a>
          ))}
        </nav>
      </PageHead>
      {groups.map((g) => (
        <section key={g.status} id={`q-${g.status}`} aria-labelledby={`q-${g.status}-title`} className="stack-12" tabIndex={-1} data-group={g.status}>
          <h2 id={`q-${g.status}-title`} className="h2">
            {g.label} ({g.items.length})
          </h2>
          {g.items.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="plain-list stack-12">
              {g.items.map((q) => (
                <li key={q.id}>
                  <article className={`card entry${g.status === "withdrawn" ? " is-muted" : ""}`} data-question={q.id} aria-labelledby={`${q.id}-q`}>
                    <header className="entry-head">
                      <h3 id={`${q.id}-q`} className="entry-title">
                        <RichText text={q.question} />
                      </h3>
                      <span className="small muted entry-meta">
                        <Ref id={q.id} variant="code" /> · asked {shortDate(q.asked)}
                      </span>
                    </header>
                    <div className="chip-row">
                      <span className={`chip chip-${TONE[q.status]}`}>{g.label}</span>
                      {askedNow.has(q.id) && <span className="chip chip-now">Asked now</span>}
                      {q.blocks.length > 0 && (
                        <span className="small muted">
                          Holds up:{" "}
                          {q.blocks.map((b, i) => (
                            <span key={b}>
                              {i > 0 && ", "}
                              <Ref id={b} variant="inline">
                                {phaseShort(b)}
                              </Ref>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="small text-2 lh">
                      <span className="strong">Why it matters: </span>
                      <RichText text={q.why_it_matters} />
                    </p>
                    {q.answer && (
                      <p className="small lh answer">
                        <span className="strong">Your answer{q.answered_on ? ` (${shortDate(q.answered_on)})` : ""}: </span>
                        <RichText text={q.answer} />
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
