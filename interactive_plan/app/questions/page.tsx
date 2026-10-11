// Questions tab: every question Claude has asked you, as one list of cards ("one pattern for every
// list", owner's plan of 2026-10-10). It starts on the open questions, newest first (the Status filter
// starts on "Open"; "Any status" shows all). Each card is closed at first and shows one line: the
// question, when it was asked (with the time of day when known), its status, "Asked now" when the
// Overview asks it, its topic and two tags; a click opens the question's id, the phases it holds up,
// why it matters and your answer. You answer in Claude Code; this tab only shows them (owner feedback
// 2026-10-09). Reads questions.json, overview.json, taxonomy.json and roadmap.json.
import type { Metadata } from "next";
import Browse, { type BrowseCard } from "@/components/portal/browse/Browse";
import CardLine from "@/components/portal/browse/CardLine";
import LabelChips from "@/components/portal/browse/LabelChips";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { QUESTION_STATUS, questionsBrowse } from "@/lib/portal/browseTabs";
import { getPortal } from "@/lib/portal/server";
import { labelsOf, normalizeTaxonomy, timeOf } from "@/lib/portal/taxonomy";
import { dateTime, roadmapRow, shortDate } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Questions" };

const TONE = { open: "you", answered: "done", withdrawn: "later" } as const;

export default async function QuestionsPage() {
  const { files } = await getPortal();
  const { questions, overview, roadmap } = files;
  const list = questions?.items ?? [];
  const askedNow = new Set(overview?.questions_for_you.items.map((q) => q.id) ?? []);
  const phaseShort = (id: string) => roadmapRow(roadmap, id)?.short ?? id;
  const browse = questionsBrowse(questions, normalizeTaxonomy(files.taxonomy), roadmap);

  const cards: Record<string, BrowseCard> = Object.fromEntries(
    list.map((q) => {
      const labels = labelsOf(q);
      const card: BrowseCard = {
        attrs: { ...(q.status === "withdrawn" ? { className: "is-muted" } : {}), "data-question": q.id, "data-status": q.status },
        summary: (
          <CardLine
            title={q.question}
            level={2}
            when={`Asked ${dateTime(q.asked, timeOf(q))}`}
            status={{ label: QUESTION_STATUS[q.status], tone: TONE[q.status] }}
            chips={askedNow.has(q.id) ? [{ label: "Asked now", className: "chip-asked", testId: "asked-now" }] : []}
            category={labels.category}
            tags={labels.tags}
          />
        ),
        body: (
          <div className="stack-12">
            <div className="chip-row">
              <span className="small muted">
                Question <Ref id={q.id} variant="code" />
              </span>
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
            <LabelChips tags={labels.tags} uiRef="QU-12" />
          </div>
        ),
      };
      return [q.id, card];
    }),
  );

  return (
    <div className="page page-narrow">
      <PageHead title="Questions" summary={questions?.summary ?? null} uiRef="QU-1" />
      <Browse
        name="questions"
        spec={browse.spec}
        items={browse.items}
        categories={browse.categories}
        tags={browse.tags}
        phases={browse.phases}
        sorts={browse.sorts}
        phaseLabel="Holds up phase"
        searchHint="Search questions"
        noun="questions"
        listTestId="question-list"
        cardRef="QU-6"
        refs={{ filters: "QU-7", results: "QU-8", pages: "QU-9", sort: "QU-10", openAll: "QU-11" }}
        cards={cards}
      />
    </div>
  );
}
