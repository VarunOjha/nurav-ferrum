// Research tab: the research plan as one list of cards ("one pattern for every list", owner's plan of
// 2026-10-10): the questions we want to answer, our predictions, the experiments, the measures and the
// test sites, 70 items in all, in phase order. The kind is each item's category; the links under the
// heading show one kind (they keep the rest of the address, and the chosen one is marked). A card is
// closed at first and shows one line: the title, its phase, its kind and two tags (the status is in the
// opened card: each kind has one status today, so on the closed line it repeated the kind; review
// 2026-10-11); a click opens the details, and every id inside opens its explainer. Search,
// filters, a Sort dropdown, "Open all" and 20 per page; the choice stays in the page address. Nothing is
// measured yet, and the text says so. Reads research.json, taxonomy.json, roadmap.json and refs.json.
import type { Metadata } from "next";
import Browse, { type BrowseCard } from "@/components/portal/browse/Browse";
import CardLine from "@/components/portal/browse/CardLine";
import KindLinks from "@/components/portal/browse/KindLinks";
import { CardFields, CardRelated, type CardField } from "@/components/portal/browse/CardParts";
import LabelChips from "@/components/portal/browse/LabelChips";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import { researchBrowse, researchRows, type ResearchRow } from "@/lib/portal/browseTabs";
import { resolveRef } from "@/lib/portal/refs";
import { getPortal, getRefData } from "@/lib/portal/server";
import { labelsOf, normalizeTaxonomy } from "@/lib/portal/taxonomy";
import { ui } from "@/lib/portal/uiRefs";
import { roadmapRow } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Research" };

/** What each kind of item shows when its card opens. */
function fieldsOf(row: ResearchRow): CardField[] {
  const i = row.item as { summary: string; question?: string; prediction?: string };
  switch (row.kind) {
    case "questions":
      return [
        { label: "The question", text: i.question ?? "" },
        { label: "How we answer it", text: i.summary },
      ];
    case "hypotheses":
      return [
        { label: "We expect", text: i.prediction ?? "" },
        { label: "What counts", text: i.summary },
      ];
    case "experiments":
      return [{ label: "What we run, compare and measure", text: i.summary }];
    case "metrics":
      return [{ label: "What it measures", text: i.summary }];
    case "workloads":
      return [{ label: "What it is", text: i.summary }];
  }
}

export default async function ResearchPage() {
  const [{ files }, refData] = await Promise.all([getPortal(), getRefData()]);
  const r = files.research;
  const rows = researchRows(r);
  const browse = researchBrowse(r, normalizeTaxonomy(files.taxonomy), files.roadmap);
  const categoryOf = new Map(browse.items.map((i) => [i.id, i.category]));
  const refTitle = (id: string) => resolveRef(refData, id)?.title ?? id;
  const phaseLabel = (id: string) => {
    const row = roadmapRow(files.roadmap, id);
    return row ? `${row.short} · ${row.name}` : id;
  };
  const phaseShort = (id: string) => roadmapRow(files.roadmap, id)?.short ?? id;
  // The kind links: how many items of each kind, each opening the list on that kind.
  const kinds = browse.categories.map((c) => ({ kind: c.name, count: browse.items.filter((i) => i.category === c.name).length }));

  const cards: Record<string, BrowseCard> = Object.fromEntries(
    rows.map((row) => {
      const item = row.item;
      const labels = labelsOf(item);
      const unit = (item as { unit?: string }).unit;
      const card: BrowseCard = {
        attrs: { "data-item": item.id, "data-kind": row.kind },
        summary: (
          <CardLine
            title={item.title}
            level={3}
            when={labels.phase ? `Phase ${phaseShort(labels.phase)}` : null}
            category={categoryOf.get(item.id) ?? null}
            tags={labels.tags}
          />
        ),
        body: (
          <div className="stack-12">
            <p className="small text-2" data-testid="research-meta">
              <span data-testid="research-status">Status: {item.status}</span>
              {labels.phase && (
                <>
                  {" · "}
                  {row.kind === "experiments" ? "Runs in" : "Phase"}{" "}
                  <Ref id={labels.phase} variant="inline">
                    {phaseLabel(labels.phase)}
                  </Ref>
                </>
              )}
              {unit && <> · Unit: {unit}</>}
            </p>
            <CardFields fields={fieldsOf(row)} />
            <CardRelated ids={item.related} title={refTitle} />
            <LabelChips tags={labels.tags} uiRef="RE-15" />
          </div>
        ),
      };
      return [item.id, card];
    }),
  );

  return (
    <div className="page">
      <PageHead title="Research" summary={r?.summary ?? null} uiRef="RE-1">
        <KindLinks kinds={kinds} path="/research" uiRef="RE-2" />
      </PageHead>
      <section aria-labelledby="research-title" className="stack-12" {...ui("RE-8")}>
        <div className="row-between">
          <h2 id="research-title" className="h2">
            Research plan ({rows.length})
          </h2>
          <span className="small muted">Click an item to open it</span>
        </div>
        <Browse
          name="research"
          spec={browse.spec}
          items={browse.items}
          categories={browse.categories}
          tags={browse.tags}
          phases={browse.phases}
          sorts={browse.sorts}
          categoryLabel="Kind"
          searchHint="Search research"
          noun="research items"
          listTestId="research-list"
          cardRef="RE-14"
          refs={{ filters: "RE-9", results: "RE-10", pages: "RE-11", sort: "RE-12", openAll: "RE-13" }}
          cards={cards}
        />
      </section>
    </div>
  );
}
