/**
 * A medium popup for one item of a tab (a decision, a risk, a research item): what kind it is, its
 * title and status, a few labelled plain-language fields, and its related ids (each opens its
 * explainer on top). Server component; Modal (client) opens and closes it. Opened with
 * <OpenModalButton target={detailDialogId(id)}>.
 */
import { detailDialogId } from "@/lib/portal/dialogs";
import { resolveRef } from "@/lib/portal/refs";
import { getRefData } from "@/lib/portal/server";
import type { Tone } from "@/lib/portal/view";
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
  tone: Tone;
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
    <Modal id={dialogId} labelledBy={titleId} className="detail-modal">
      <div className="phase-head">
        <div className="phase-head-text">
          <div className="phase-head-meta">
            <span className="eyebrow">{kind}</span>
            <span className="mono small muted">{id}</span>
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
        {extra}
        {related.length > 0 && (
          <div className="stack-8">
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
