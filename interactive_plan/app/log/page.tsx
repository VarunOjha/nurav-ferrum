// Log tab (owner-approved Log mockup): one entry per piece of work, newest first, in plain words:
// what was done, what is next, a small table of decisions, a small table of approvals, and the saved
// commit (which opens its explainer). Filter: all, has decisions, has approvals. Reads log.json,
// roadmap.json and refs.json.
import type { Metadata } from "next";
import LogFilter from "@/components/portal/LogFilter";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { resolveRef } from "@/lib/portal/refs";
import { getPortal, getRefData } from "@/lib/portal/server";
import { newestFirst, roadmapRow, shortDate, whoLabel } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const [{ files }, refData] = await Promise.all([getPortal(), getRefData()]);
  const entries = newestFirst(files.log);
  const counts = {
    all: entries.length,
    decisions: entries.filter((e) => e.decisions.length > 0).length,
    approvals: entries.filter((e) => e.approvals.length > 0).length,
  };

  return (
    <div className="page page-narrow">
      <PageHead title="Log" summary={files.log?.summary ?? null} />
      <LogFilter counts={counts}>
        {entries.map((e) => {
          const phase = e.phase ? roadmapRow(files.roadmap, e.phase) : null;
          const commitTitle = e.commit ? (resolveRef(refData, e.commit)?.title.replace(/^Commit:\s*/, "") ?? null) : null;
          const titleId = `log-${e.id}`;
          return (
            <article
              key={e.id}
              className="card entry log-entry"
              aria-labelledby={titleId}
              data-entry={e.id}
              data-has-decisions={e.decisions.length > 0 ? "" : undefined}
              data-has-approvals={e.approvals.length > 0 ? "" : undefined}
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
              <div className="done-next">
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
                <div className="row-wrap log-tables">
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
              <footer className="small muted log-foot">
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
            </article>
          );
        })}
      </LogFilter>
    </div>
  );
}
