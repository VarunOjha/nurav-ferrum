/**
 * A medium popup for one item of a tab (a decision, a risk, a research item, a part of the system):
 * what kind it is (or its short name, such as "Decision 19"), its title and status, a few labelled plain-language fields, and its related ids (each opens its
 * explainer on top). Server component; Modal (client) opens and closes it. Opened with
 * <OpenModalButton target={detailDialogId(id)}>.
 */
import { detailDialogId } from "@/lib/portal/dialogs";
import { friendlyId, resolveRef } from "@/lib/portal/refs";
import { getRefData } from "@/lib/portal/server";
import type { Tone } from "@/lib/portal/view";
import { popupContext, ui } from "@/lib/portal/uiRefs";
import Modal, { CloseModalButton } from "./Modal";
import Ref from "./Ref";
import RichText from "./RichText";

export interface DetailField {
  label: string;
  text: string;
}

export default async function DetailPopup({
  id,
  kind,
  title,
  status,
  tone,
  meta,
  fields,
  related,
  extra,
}: {
  id: string;
  kind: string;
  title: string;
  status: string;
  tone: Tone | "you";
  /** Small facts under the title ("Decided by you · 8 Oct"). */
  meta?: React.ReactNode;
  fields: DetailField[];
  related: readonly string[];
  /** Anything else to show after the fields (e.g. "Replaced by" with a button). */
  extra?: React.ReactNode;
}) {
  const refData = await getRefData();
  const dialogId = detailDialogId(id);
  const titleId = `${dialogId}-title`;
  return (
    <Modal id={dialogId} labelledBy={titleId} className="detail-modal" uiContext={popupContext("IT", friendlyId(id) ?? title)}>
      <div className="phase-head" {...ui("IT-1", { pos: "inside" })}>
        <div className="phase-head-text">
          <div className="phase-head-meta">
            {/* The owner's short name ("Decision 19") when there is one, never the internal slug (review 2026-10-09). */}
            <span className="eyebrow">{friendlyId(id) ?? kind}</span>
            <span className={`chip chip-${tone}`}>{status}</span>
          </div>
          <h2 id={titleId} className="detail-title">
            <RichText text={title} />
          </h2>
          {meta && <div className="small muted">{meta}</div>}
        </div>
        <CloseModalButton />
      </div>
      <div className="phase-body detail-body">
        <div {...ui("IT-2")}>
          <dl className="detail-fields">
            {fields.map((f) => (
              <div key={f.label} className="detail-field">
                <dt>{f.label}</dt>
                <dd>
                  <RichText text={f.text} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {extra && <div {...ui("IT-3")}>{extra}</div>}
        {related.length > 0 && (
          <div className="stack-8" {...ui("IT-4")}>
            <div className="eyebrow">Related</div>
            <ul className="chip-list">
              {related.map((r) => (
                <li key={r}>
                  <Ref id={r} variant="chip">
                    {resolveRef(refData, r)?.title ?? r}
                  </Ref>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
