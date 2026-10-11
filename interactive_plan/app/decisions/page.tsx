// Decisions tab ("one pattern for every list", owner's plan of 2026-10-10): every decision as a card,
// newest first. A card is closed at first and shows one line: its number and title, the date, one
// plain standing (who chose it, and whether you signed off its written page), its category and two
// tags; a click opens what it means, why, the catch, what replaced it and its related pages. Replaced
// decisions stay listed, muted. Below, the risks we watch as cards in the same pattern, highest risk
// first ("Risk L × I = S"). Each list has its own search, filters, Sort dropdown, "Open all" and pages;
// both keep their choice in the page address (the risks' keys start with "risk-"). Reads
// decisions.json, taxonomy.json, risks.json, roadmap.json, refs.json and plan/approvals.json
// (read-only labels).
import type { Metadata } from "next";
import Browse, { type BrowseCard } from "@/components/portal/browse/Browse";
import CardLine from "@/components/portal/browse/CardLine";
import { CardFields, CardRelated } from "@/components/portal/browse/CardParts";
import LabelChips from "@/components/portal/browse/LabelChips";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { decisionsBrowse, risksBrowse } from "@/lib/portal/browseTabs";
import { resolveRef } from "@/lib/portal/refs";
import { getPortal, getRefData } from "@/lib/portal/server";
import { labelsOf, normalizeTaxonomy } from "@/lib/portal/taxonomy";
import { ui } from "@/lib/portal/uiRefs";
import { approvalLabel, decisionStanding, decisionTone, riskScore, riskTone, roadmapRow, shortDate } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const [{ files, approvals }, refData] = await Promise.all([getPortal(), getRefData()]);
  const { decisions, risks, roadmap } = files;
  const items = decisions?.items ?? [];
  const riskItems = risks?.items ?? [];
  const titleOf = new Map(items.map((d) => [d.id, d.title]));
  const refTitle = (id: string) => resolveRef(refData, id)?.title ?? id;
  const phaseShort = (id: string) => roadmapRow(roadmap, id)?.short ?? id;
  // Choosing a decision and signing off its written page are two steps; one plain standing says both.
  const standing = new Map(items.map((d) => [d.id, decisionStanding(d, approvalLabel(approvals, d.id, d.source.content_hash))]));
  const taxonomy = normalizeTaxonomy(files.taxonomy);
  const browse = decisionsBrowse(decisions, taxonomy, roadmap);
  const riskBrowse = risksBrowse(risks, taxonomy, roadmap);

  const decisionCards: Record<string, BrowseCard> = Object.fromEntries(
    items.map((d) => {
      const replaced = d.status === "Replaced" || d.status === "Rejected";
      const labels = labelsOf(d);
      const st = standing.get(d.id)!;
      const card: BrowseCard = {
        attrs: { ...(replaced ? { className: "is-muted" } : {}), "data-decision": d.id, "data-status": d.status },
        summary: (
          <CardLine
            title={d.title}
            level={3}
            lead={`#${d.number}`}
            when={shortDate(d.date)}
            status={{ label: st.chip, tone: decisionTone(d.status) }}
            category={labels.category}
            tags={labels.tags}
          />
        ),
        body: (
          <div className="stack-12">
            <p className="small text-2" data-testid="decision-standing">
              {st.line}
            </p>
            <CardFields
              fields={[
                { label: "What it means", text: d.summary },
                { label: "Why", text: d.why },
                ...(d.catch ? [{ label: "The catch", text: d.catch }] : []),
              ]}
            />
            {d.replaced_by && (
              <p className="note small" data-testid="replaced-by">
                This decision was replaced by{" "}
                <Ref id={d.replaced_by} variant="inline">
                  {titleOf.get(d.replaced_by) ?? d.replaced_by}
                </Ref>
                .
              </p>
            )}
            <CardRelated ids={d.related} title={refTitle} />
            <LabelChips tags={labels.tags} uiRef="DE-7" />
          </div>
        ),
      };
      return [d.id, card];
    }),
  );

  const riskCards: Record<string, BrowseCard> = Object.fromEntries(
    riskItems.map((r) => {
      const labels = labelsOf(r);
      const card: BrowseCard = {
        attrs: { "data-risk": r.id, "data-status": r.status },
        summary: (
          <CardLine
            title={r.title}
            level={3}
            when={`Risk ${r.likelihood} × ${r.impact} = ${riskScore(r)}`}
            status={{ label: r.status, tone: riskTone(r.status) }}
            category={labels.category}
            tags={labels.tags}
          />
        ),
        body: (
          <div className="stack-12">
            <p className="small text-2" data-testid="risk-meta">
              How likely: {r.likelihood} of 5 · How bad: {r.impact} of 5 · Handled in{" "}
              <Ref id={r.phase} variant="inline">
                {phaseShort(r.phase)}
              </Ref>
            </p>
            <CardFields
              fields={[
                { label: "What could happen", text: r.summary },
                { label: "What we do about it", text: r.mitigation },
              ]}
            />
            <CardRelated ids={r.related} title={refTitle} />
            <LabelChips tags={labels.tags} uiRef="DE-17" />
          </div>
        ),
      };
      return [r.id, card];
    }),
  );

  return (
    <div className="page">
      <PageHead title="Decisions" summary={decisions?.summary ?? null} uiRef="DE-1" />

      <section aria-labelledby="dec-title" className="stack-12" {...ui("DE-2")}>
        <div className="row-between">
          <h2 id="dec-title" className="h2">
            Decisions ({items.length})
          </h2>
          <span className="small muted">Click a decision to open it</span>
        </div>
        <Browse
          name="decisions"
          spec={browse.spec}
          items={browse.items}
          categories={browse.categories}
          tags={browse.tags}
          phases={browse.phases}
          sorts={browse.sorts}
          phaseLabel="Affects phase"
          searchHint="Search titles and text"
          noun="decisions"
          listTestId="decision-list"
          cardRef="DE-10"
          refs={{ filters: "DE-4", results: "DE-5", pages: "DE-6", sort: "DE-8", openAll: "DE-9" }}
          cards={decisionCards}
        />
      </section>

      <section aria-labelledby="risk-title" className="stack-12" {...ui("DE-3")}>
        <div className="row-between">
          <h2 id="risk-title" className="h2">
            Risks we watch ({riskItems.length})
          </h2>
          <span className="small muted">Click a risk to open it</span>
        </div>
        {risks && (
          <p className="small text-2 lh">
            <RichText text={risks.summary} /> &ldquo;Risk 4 × 5 = 20&rdquo; means how likely (out of 5) times how bad (out of 5).
          </p>
        )}
        <Browse
          name="risks"
          spec={riskBrowse.spec}
          items={riskBrowse.items}
          categories={riskBrowse.categories}
          tags={riskBrowse.tags}
          phases={riskBrowse.phases}
          sorts={riskBrowse.sorts}
          phaseLabel="Handled in phase"
          searchHint="Search the risks"
          noun="risks"
          listTestId="risk-list"
          cardRef="DE-16"
          refs={{ filters: "DE-11", results: "DE-12", pages: "DE-13", sort: "DE-14", openAll: "DE-15" }}
          cards={riskCards}
        />
      </section>
    </div>
  );
}
