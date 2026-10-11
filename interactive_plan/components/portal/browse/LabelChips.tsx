"use client";
/**
 * The labels of one decision or log entry: its category chip and its two tag chips. A tag chip is a
 * button that turns on the filter for that tag ("Filter by tag memory"); pressed while that filter is on,
 * and a second click turns it off again. Items without labels show nothing.
 */
import { ui, type UiRefId } from "@/lib/portal/uiRefs";
import { useBrowse } from "./BrowseContext";

export default function LabelChips({ category, tags, uiRef }: { category: string | null; tags: readonly string[]; uiRef: UiRefId }) {
  const browse = useBrowse();
  if (!category && tags.length === 0) return null;
  return (
    <div className="label-chips" data-testid="label-chips" {...ui(uiRef)}>
      {category && (
        <span className="chip chip-cat" data-category={category}>
          <span className="sr-only">Category: </span>
          {category}
        </span>
      )}
      {tags.map((t) =>
        browse ? (
          <button
            key={t}
            type="button"
            className="chip chip-tag"
            data-tag={t}
            aria-pressed={browse.activeTags.includes(t)}
            aria-label={`Filter by tag ${t}`}
            onClick={() => browse.toggleTag(t)}
          >
            <span aria-hidden="true">#</span>
            {t}
          </button>
        ) : (
          <span key={t} className="chip chip-tag" data-tag={t}>
            <span className="sr-only">Tag: </span>
            <span aria-hidden="true">#</span>
            {t}
          </span>
        ),
      )}
    </div>
  );
}
