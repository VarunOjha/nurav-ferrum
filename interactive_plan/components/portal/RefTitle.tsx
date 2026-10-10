/** A clickable id shown by its explainer title instead of the bare id (falls back to the id). */
import { resolveRef } from "@/lib/portal/refs";
import { getRefData } from "@/lib/portal/server";
import Ref from "./Ref";

export default async function RefTitle({ id, variant = "chip" }: { id: string; variant?: "inline" | "chip" | "code" | "box" }) {
  const info = resolveRef(await getRefData(), id);
  return (
    <Ref id={id} variant={variant}>
      {info?.title ?? id}
    </Ref>
  );
}
