"use client";
/**
 * The kind links under the Research heading ("Experiment (9)"): each opens the research list on that
 * kind. The link keeps the rest of the page address (search, other filters, sort) and changes only the
 * kind, going back to page 1; the chosen kind is marked (aria-current and the filled pill style), and
 * clicking it again shows every kind (review 2026-10-11).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PARAM } from "@/lib/portal/browse";
import { ui, type UiRefId } from "@/lib/portal/uiRefs";

/** The query ("?category=…", or "" for none) that shows `kind` (or every kind when it is the chosen one), keeping the other choices. */
export function kindHref(current: string, kind: string): string {
  const sp = new URLSearchParams(current);
  const chosen = sp.get(PARAM.category) === kind;
  if (chosen) sp.delete(PARAM.category);
  else sp.set(PARAM.category, kind);
  sp.delete(PARAM.page);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export default function KindLinks({ kinds, path, uiRef }: { kinds: { kind: string; count: number }[]; path: string; uiRef: UiRefId }) {
  const params = useSearchParams();
  const current = params.toString();
  const chosen = params.get(PARAM.category);
  return (
    <nav aria-label="Research kinds" className="pill-row" {...ui(uiRef)}>
      {kinds.map((k) => {
        const on = chosen === k.kind;
        return (
          <Link
            key={k.kind}
            href={`${path}${kindHref(current, k.kind)}`}
            className="pill"
            scroll={false}
            aria-current={on ? "true" : undefined}
            title={on ? "Shown now: click to show every kind" : undefined}
            data-testid="research-kind-link"
          >
            {k.kind} ({k.count})
          </Link>
        );
      })}
    </nav>
  );
}
