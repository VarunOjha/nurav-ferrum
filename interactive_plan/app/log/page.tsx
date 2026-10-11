// Log tab (owner-approved Log mockup): one entry per piece of work, newest first, in plain words:
// what was done, what is next, a small table of decisions, a small table of approvals, and the saved
// commit (which opens its explainer). Each entry shows its kind of work and two tags. A search box and
// filters (kind of work, tags, phase, dates, has decisions / has approvals) narrow the list, 20 per
// page, and the choice stays in the page address (owner request 2026-10-10). Reads log.json,
// taxonomy.json, roadmap.json and refs.json.
import type { Metadata } from "next";
import Browse from "@/components/portal/browse/Browse";
import LabelChips from "@/components/portal/browse/LabelChips";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { logBrowse } from "@/lib/portal/browseTabs";
import { resolveRef } from "@/lib/portal/refs";
import { getPortal, getRefData } from "@/lib/portal/server";
import { labelsOf, normalizeTaxonomy } from "@/lib/portal/taxonomy";
import { newestFirst, roadmapRow, shortDate, whoLabel } from "@/lib/portal/view";
import { ui } from "@/lib/portal/uiRefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const [{ files }, refData] = await Promise.all([getPortal(), getRefData()]);
  const entries = newestFirst(files.log);
  const browse = logBrowse(entries, normalizeTaxonomy(files.taxonomy), files.roadmap);
  // Every entry is marked for Ref mode; the mode labels only the first entry (and the first tables)
  // on the page shown now, since they all look the same (components/portal/RefMode.tsx).

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
        searchHint="Search the log"
        noun="entries"
        list={{ as: "div", className: "log-list", testId: "log-list" }}
        refs={{ filters: "LO-7", results: "LO-8", pages: "LO-9", extras: { has: "LO-2" } }}
        cards={Object.fromEntries(
          entries.map((e) => {
            const phase = e.phase ? roadmapRow(files.roadmap, e.phase) : null;
            const commitTitle = e.commit ? (resolveRef(refData, e.commit)?.title.replace(/^Commit:\s*/, "") ?? null) : null;
            const titleId = `log-${e.id}`;
            const labels = labelsOf(e);
            return [
              e.id,
              <article
                key={e.id}
                className="card entry log-entry"
                aria-labelledby={titleId}
                data-entry={e.id}
                data-has-decisions={e.decisions.length > 0 ? "" : undefined}
                data-has-approvals={e.approvals.length > 0 ? "" : undefined}
                {...ui("LO-3")}
              >
                <header className="entry-head">
                  <h2 id={titleId} className="entry-title entry-title-lg">
                    <RichText text={e.title} />
                  </h2>
                  <span className="small muted entry-meta">
                    {shortDate(e.date)}
                    {phase && <> · {phase.name}</>}
                  </span>
                </header>
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
              </article>,
            ];
          }),
        )}
      />
    </div>
  );
}
