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

export function TokensView({ tokens }: { tokens: TextToken[] }) {
  return (
    <>
      {tokens.map((t, i) =>
        t.type === "text" ? (
          <span key={i}>{t.text}</span>
        ) : (
          <Ref key={i} id={t.id} variant={t.linked ? "inline" : "chip"}>
            {t.label}
          </Ref>
        ),
      )}
    </>
  );
}

export default async function RichText({ text }: { text: string }) {
  const patterns = await getPatterns();
  return <TokensView tokens={tokenize(text, patterns)} />;
}
