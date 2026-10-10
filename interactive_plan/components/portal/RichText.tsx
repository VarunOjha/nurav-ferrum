/**
 * Portal text with clickable references. Every `[words](ref:id)` link and every bare id-shaped word
 * (the pipeline.json id patterns) becomes a <Ref>, so nothing that looks like an id is ever shown
 * without its explainer (owner feedback 2026-10-09).
 *
 * TokensView is synchronous (unit tests render it); RichText is the server-component wrapper that
 * tokenizes with the patterns of the current request.
 */
import { tokenize, type TextToken } from "@/lib/portal/refs";
import { getPatterns } from "@/lib/portal/server";
import Ref from "./Ref";

// Punctuation right next to a chip, such as "(" in "(P0)" or "?" after "P8", must not wrap onto
// another line than the chip: a line that starts with ")" or "?" reads as a mistake.
const LEAD = /[^\s\w]{1,3}$/; // e.g. "(" before a chip
const TRAIL = /^[^\s\w]{1,3}/; // e.g. ")." or "?" after a chip

export function TokensView({ tokens }: { tokens: TextToken[] }) {
  const parts: React.ReactNode[] = [];
  // Text still to show; a chip may take a few characters off either end of its neighbours.
  const texts = tokens.map((t) => (t.type === "text" ? t.text : ""));
  tokens.forEach((t, i) => {
    if (t.type === "text") {
      if (texts[i]) parts.push(<span key={i}>{texts[i]}</span>);
      return;
    }
    const chip = !t.linked;
    const ref = (
      <Ref key={i} id={t.id} variant={chip ? "chip" : "inline"}>
        {t.label}
      </Ref>
    );
    if (!chip) {
      parts.push(ref);
      return;
    }
    let lead = "";
    let trail = "";
    const prev = tokens[i - 1];
    if (prev?.type === "text") {
      const m = LEAD.exec(texts[i - 1]);
      if (m && parts.length > 0) {
        lead = m[0];
        texts[i - 1] = texts[i - 1].slice(0, -lead.length);
        parts.pop();
        if (texts[i - 1]) parts.push(<span key={i - 1}>{texts[i - 1]}</span>);
      }
    }
    const next = tokens[i + 1];
    if (next?.type === "text") {
      const m = TRAIL.exec(texts[i + 1]);
      if (m) {
        trail = m[0];
        texts[i + 1] = texts[i + 1].slice(trail.length);
      }
    }
    if (!lead && !trail) {
      parts.push(ref);
      return;
    }
    parts.push(
      <span key={`g${i}`} className="ref-glue">
        {lead}
        {ref}
        {trail}
      </span>,
    );
  });
  return <>{parts}</>;
}

export default async function RichText({ text }: { text: string }) {
  const patterns = await getPatterns();
  return <TokensView tokens={tokenize(text, patterns)} />;
}
