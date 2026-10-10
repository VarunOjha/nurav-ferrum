"use client";
/**
 * A clickable id. Renders a button that opens the reference popup (RefProvider) with the refs.json
 * explainer for `id`. `variant="chip"` is the filled pill of the mockups; "inline" is a dotted
 * underline inside running text; "code" shows the id in the mono font (task ids, commits); "box" is a
 * plain block (the boxes of the architecture diagram).
 */
import { resolveRef } from "@/lib/portal/refs";
import { useRefs } from "./RefProvider";

export default function Ref({
  id,
  children,
  variant = "inline",
}: {
  id: string;
  children?: React.ReactNode;
  variant?: "inline" | "chip" | "code" | "box";
}) {
  const { data, open } = useRefs();
  const info = resolveRef(data, id);
  const label = children ?? id;
  return (
    <button
      type="button"
      className={`ref ref-${variant}`}
      data-ref-id={id}
      aria-haspopup="dialog"
      title={info ? `${info.title}: open the explainer` : `${id}: open the explainer`}
      onClick={(e) => open(id, e.currentTarget)}
    >
      {label}
    </button>
  );
}
