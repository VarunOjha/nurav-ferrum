"use client";
/**
 * The tag chips inside an opened card. In a browse list each tag chip is a button that turns on the
 * filter for that tag ("Filter by tag memory"), pressed while that filter is on, and a second click
 * turns it off again; the row says "Filter by tag:" so it does not read as a repeat of the closed line.
 * The category is not repeated here: the closed line above already shows it (review 2026-10-11).
 * Outside a browse list the tags are plain labels ("Tags:"). Items without tags show nothing.
 */
import { ui, type UiRefId } from "@/lib/portal/uiRefs";
import { useBrowse } from "./BrowseContext";

export default function LabelChips({ tags, uiRef }: { tags: readonly string[]; uiRef: UiRefId }) {
  const browse = useBrowse();
  if (tags.length === 0) return null;
  return (
    <div className="label-chips" data-testid="label-chips" {...ui(uiRef)}>
      <span className="small muted label-chips-lead">{browse ? "Filter by tag:" : "Tags:"}</span>
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
            <span aria-hidden="true">#</span>
            {t}
          </span>
        ),
      )}
    </div>
  );
}
