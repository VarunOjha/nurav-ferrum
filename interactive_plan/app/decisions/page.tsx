// Decisions tab: every decision as a short row; clicking its title opens a popup with what it means,
// why, the catch and your approval state. Replaced decisions stay listed, muted, and point to what
// replaced them. Below, the risks we watch, highest first, each with its own popup. Reads
// decisions.json, risks.json, roadmap.json and plan/approvals.json (read-only labels).
import type { Metadata } from "next";
import DetailPopup from "@/components/portal/DetailPopup";
import { OpenModalButton } from "@/components/portal/Modal";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { detailDialogId } from "@/lib/portal/dialogs";
import { getPortal } from "@/lib/portal/server";
import { approvalLabel, decisionTone, firstSentence, riskTone, risksByScore, roadmapRow, shortDate } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const { files, approvals } = await getPortal();
  const { decisions, risks, roadmap } = files;
  const items = decisions?.items ?? [];
  const titleOf = new Map(items.map((d) => [d.id, d.title]));
  const riskList = risksByScore(risks);
  const phaseShort = (id: string) => roadmapRow(roadmap, id)?.short ?? id;

  return (
    <div className="page">
      <PageHead title="Decisions" summary={decisions?.summary ?? null} />

      <section aria-labelledby="dec-title" className="stack-12">
        <div className="row-between">
          <h2 id="dec-title" className="h2">
            Decisions ({items.length})
          </h2>
          <span className="small muted">Click a decision to open it</span>
        </div>
        <ul className="row-list" data-testid="decision-list">
          {items.map((d) => {
            const replaced = d.status === "Replaced" || d.status === "Rejected";
            return (
              <li key={d.id} className={`row-item${replaced ? " is-muted" : ""}`} data-decision={d.id} data-status={d.status}>
                <span className="mono small muted row-id">#{d.number}</span>
                <div className="stack-4 row-main">
                  <OpenModalButton target={detailDialogId(d.id)} className="link-btn row-title" label={`${d.title}: open the decision`}>
                    {d.title}
                  </OpenModalButton>
                  <span className="small text-2">
                    <RichText text={firstSentence(d.summary)} />
                  </span>
                  {d.replaced_by && (
                    <span className="small muted">
                      Replaced by{" "}
                      <Ref id={d.replaced_by} variant="inline">
                        {titleOf.get(d.replaced_by) ?? d.replaced_by}
                      </Ref>
                    </span>
                  )}
                </div>
                <div className="row-side">
                  <span className={`chip chip-${decisionTone(d.status)}`}>{d.status}</span>
                  <span className="small muted">
                    {d.decided_by === "you" ? "You decided" : "Claude proposed"} · {shortDate(d.date)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="risk-title" className="stack-12">
        <h2 id="risk-title" className="h2">
          Risks we watch ({riskList.length})
        </h2>
        {risks && (
          <p className="small text-2 lh">
            <RichText text={risks.summary} /> Highest first; click a risk to open it.
          </p>
        )}
        <div className="table-wrap">
          <table className="table rtable" data-testid="risk-table">
            <thead>
              <tr>
                <th scope="col">Risk</th>
                <th scope="col" className="col-score">
                  How likely · how bad
                </th>
                <th scope="col" className="col-status">
                  Status
                </th>
                <th scope="col" className="col-short">
                  Checked in
                </th>
              </tr>
            </thead>
            <tbody>
              {riskList.map((r) => (
                <tr key={r.id} data-risk={r.id}>
                  <th scope="row" data-label="Risk" className="rtable-name">
                    <OpenModalButton target={detailDialogId(r.id)} className="link-btn" label={`${r.title}: open the risk`}>
                      {r.title}
                    </OpenModalButton>
                  </th>
                  <td data-label="How likely · how bad" className="text-2">
                    {r.likelihood} of 5 · {r.impact} of 5
                  </td>
                  <td data-label="Status">
                    <span className={`chip chip-${riskTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td data-label="Checked in">
                    <Ref id={r.phase} variant="code">
                      {phaseShort(r.phase)}
                    </Ref>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {items.map((d) => (
        <DetailPopup
          key={d.id}
          id={d.id}
          kind="Decision"
          title={d.title}
          status={d.status}
          tone={decisionTone(d.status)}
          meta={
            <>
              {d.decided_by === "you" ? "You decided" : "Claude proposed"} · {shortDate(d.date)} · Your approval:{" "}
              <strong>{approvalLabel(approvals, d.id, d.source.content_hash)}</strong>
            </>
          }
          fields={[
            { label: "What it means", text: d.summary },
            { label: "Why", text: d.why },
            ...(d.catch ? [{ label: "The catch", text: d.catch }] : []),
          ]}
          related={d.related}
          extra={
            d.replaced_by ? (
              <p className="note">
                This decision was replaced.{" "}
                <OpenModalButton target={detailDialogId(d.replaced_by)} className="link-btn">
                  Open what replaced it: {titleOf.get(d.replaced_by) ?? d.replaced_by}
                </OpenModalButton>
              </p>
            ) : undefined
          }
        />
      ))}
      {riskList.map((r) => (
        <DetailPopup
          key={r.id}
          id={r.id}
          kind="Risk"
          title={r.title}
          status={r.status}
          tone={riskTone(r.status)}
          meta={
            <>
              How likely: {r.likelihood} of 5 · How bad: {r.impact} of 5 · Checked in {phaseShort(r.phase)}
            </>
          }
          fields={[
            { label: "What could happen", text: r.summary },
            { label: "What we do about it", text: r.mitigation },
          ]}
          related={r.related}
        />
      ))}
    </div>
  );
}
