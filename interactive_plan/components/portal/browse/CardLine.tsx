/**
 * The closed line of a list card (owner's plan of 2026-10-10, "one pattern for every list"): the title,
 * then one row with the date (and time when known), the status, extra chips ("Asked now",
 * "Risk 4 × 5 = 20"), the category and the two tags. It sits inside a <summary>, so it holds only text
 * and chips: no button, no link (the title's `[words](ref:id)` links show as their words). Tag chips
 * that filter are in the opened card (LabelChips). No hooks: renders on the server and in tests.
 */
import { plainText, type Tone } from "@/lib/portal/view";

export interface CardLineProps {
  title: string;
  /** Heading level of the title on its page. */
  level: 2 | 3;
  /** A short lead before the title ("#12" for a decision), or nothing. */
  lead?: string | null;
  /** "10 Oct" or "10 Oct 21:41", with a word before it when useful ("Asked 8 Oct"), or nothing. */
  when?: string | null;
  status?: { label: string; tone: Tone | "you" } | null;
  /** More chips after the status, in order. */
  chips?: { label: string; className: string; testId?: string }[];
  category: string | null;
  tags: readonly string[];
}

export default function CardLine({ title, level, lead, when, status, chips = [], category, tags }: CardLineProps) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <>
      <H className="acc-title">
        {lead && <span className="mono small muted acc-lead">{lead} </span>}
        {plainText(title)}
      </H>
      <span className="acc-meta">
        {when && <span className="small muted acc-when">{when}</span>}
        {status && <span className={`chip chip-${status.tone}`}>{status.label}</span>}
        {chips.map((c) => (
          <span key={c.label} className={`chip ${c.className}`} data-testid={c.testId}>
            {c.label}
          </span>
        ))}
        {category && (
          <span className="chip chip-cat" data-category={category}>
            <span className="sr-only">Category: </span>
            {category}
          </span>
        )}
        {tags.slice(0, 2).map((t) => (
          <span key={t} className="chip chip-tag" data-tag={t}>
            <span className="sr-only">Tag: </span>
            <span aria-hidden="true">#</span>
            {t}
          </span>
        ))}
      </span>
    </>
  );
}
