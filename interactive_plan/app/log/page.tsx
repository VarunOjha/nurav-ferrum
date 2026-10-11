// Log tab (owner-approved Log mockup, then "one pattern for every list" of 2026-10-10): one card per
// piece of work, newest first. Each card is closed at first and shows one line: the title, the date
// (and the time of day when known), its kind of work and two tags; a click opens what was done, what
// is next, a small table of decisions, a small table of approvals and the saved commit (which opens
// its explainer). Search, filters (kind of work, tags, phase, dates, has decisions / has approvals),
// a Sort dropdown, "Open all" and 20 per page; search, filters, sort and page stay in the page address.
// Reads log.json, taxonomy.json, roadmap.json and refs.json.
import type { Metadata } from "next";
import Browse, { type BrowseCard } from "@/components/portal/browse/Browse";
import CardLine from "@/components/portal/browse/CardLine";
import LabelChips from "@/components/portal/browse/LabelChips";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { logBrowse } from "@/lib/portal/browseTabs";
import { resolveRef } from "@/lib/portal/refs";
import { getPortal, getRefData } from "@/lib/portal/server";
import { labelsOf, normalizeTaxonomy, timeOf } from "@/lib/portal/taxonomy";
import { dateTime, roadmapRow, whoLabel } from "@/lib/portal/view";
import { ui } from "@/lib/portal/uiRefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const [{ files }, refData] = await Promise.all([getPortal(), getRefData()]);
  // File order (oldest first, as log.json is written); the list sorts newest first.
  const entries = files.log?.entries ?? [];
  const browse = logBrowse(entries, normalizeTaxonomy(files.taxonomy), files.roadmap);
  // Every card is marked for Ref mode; the mode labels only the first card (and the first parts of an
  // open card) on the page shown now, since they all look the same (components/portal/RefMode.tsx).

  const cards: Record<string, BrowseCard> = Object.fromEntries(
    entries.map((e) => {
      const phase = e.phase ? roadmapRow(files.roadmap, e.phase) : null;
      const commitTitle = e.commit ? (resolveRef(refData, e.commit)?.title.replace(/^Commit:\s*/, "") ?? null) : null;
      const labels = labelsOf(e);
      const card: BrowseCard = {
        attrs: {
          className: "log-entry",
          "data-entry": e.id,
          ...(e.decisions.length > 0 ? { "data-has-decisions": "" } : {}),
          ...(e.approvals.length > 0 ? { "data-has-approvals": "" } : {}),
        },
        summary: (
          <CardLine
            title={e.title}
            level={2}
            when={`${dateTime(e.date, timeOf(e))}${phase ? ` · ${phase.name}` : ""}`}
            category={labels.category}
            tags={labels.tags}
          />
        ),
        body: (
          <div className="stack-12">
            <LabelChips category={labels.category} tags={labels.tags} uiRef="LO-10" />
            <div className="done-next" {...ui("LO-4")}>
              <div className="stack-4">
                <div className="eyebrow eyebrow-done">What was done</div>
                <p className="lh">
                  <RichText text={e.done} />
                </p>
              </div>
              <div className="stack-4">
                <div className="eyebrow eyebrow-next">What&apos;s next</div>
                <p className="lh">{e.next ? <RichText text={e.next} /> : <span className="muted">Nothing planned from here.</span>}</p>
              </div>
            </div>
            {(e.decisions.length > 0 || e.approvals.length > 0) && (
              <div className="row-wrap log-tables" {...ui("LO-5")}>
                <div className="stack-8 log-decisions">
                  <div className="eyebrow">Decisions</div>
                  {e.decisions.length === 0 ? (
                    <p className="small muted">None this time</p>
                  ) : (
                    <table className="mini mini-lines">
                      <thead className="sr-only">
                        <tr>
                          <th scope="col">Decision</th>
                          <th scope="col">Decided by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.decisions.map((d, i) => (
                          <tr key={i}>
                            <td>
                              <RichText text={d.what} />
                            </td>
                            <td className="muted nowrap right">{whoLabel(d.by)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="stack-8 log-approvals">
                  <div className="eyebrow">Approvals</div>
                  {e.approvals.length === 0 ? (
                    <p className="small muted">None this time</p>
                  ) : (
                    <table className="mini mini-lines">
                      <thead className="sr-only">
                        <tr>
                          <th scope="col">What</th>
                          <th scope="col">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.approvals.map((a, i) => (
                          <tr key={i}>
                            <td>
                              <RichText text={a.what} />
                            </td>
                            <td className="muted nowrap right">{a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            <footer className="small muted log-foot" {...ui("LO-6")}>
              {e.decisions.length === 0 && e.approvals.length === 0 && <span>No decisions · no approvals · </span>}
              {e.commit ? (
                <span>
                  Commit <Ref id={e.commit} variant="code" />
                  {commitTitle && <> — {commitTitle}</>}
                </span>
              ) : (
                <span>No commit (nothing in the repo changed)</span>
              )}
            </footer>
          </div>
        ),
      };
      return [e.id, card];
    }),
  );

  return (
    <div className="page page-narrow">
      <PageHead title="Log" summary={files.log?.summary ?? null} uiRef="LO-1" />
      <Browse
        name="log"
        spec={browse.spec}
        items={browse.items}
        categories={browse.categories}
        tags={browse.tags}
        phases={browse.phases}
        sorts={browse.sorts}
        searchHint="Search the log"
        noun="entries"
        listTestId="log-list"
        cardRef="LO-3"
        refs={{ filters: "LO-7", results: "LO-8", pages: "LO-9", sort: "LO-11", openAll: "LO-12", extras: { has: "LO-2" } }}
        cards={cards}
      />
    </div>
  );
}
