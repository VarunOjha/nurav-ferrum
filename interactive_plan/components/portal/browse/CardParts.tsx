/**
 * Parts of an opened list card that several tabs share (Decisions, Risks, Research): the details as
 * labelled fields, and the related pages as chips that open their explainers. Server components.
 */
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";

export interface CardField {
  label: string;
  text: string;
}

/** A card's details as labelled fields ("What it means", "Why", "The catch"). */
export function CardFields({ fields }: { fields: CardField[] }) {
  return (
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
  );
}

/** The related pages of a card, each opening its explainer; nothing when there are none. */
export function CardRelated({ ids, title }: { ids: readonly string[]; title: (id: string) => string }) {
  if (ids.length === 0) return null;
  return (
    <div className="stack-8">
      <div className="eyebrow">Related</div>
      <ul className="chip-list">
        {ids.map((r) => (
          <li key={r}>
            <Ref id={r} variant="chip">
              {title(r)}
            </Ref>
          </li>
        ))}
      </ul>
    </div>
  );
}
