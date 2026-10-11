"use client";
/**
 * Lets a card's tag chips (LabelChips) talk to the browse list they sit in: a click on a tag chip turns
 * that tag's filter on or off. Outside a browse list the chips are plain labels.
 */
import { createContext, useContext } from "react";

export interface BrowseActions {
  /** Tags whose filter is on now. */
  activeTags: readonly string[];
  /** Turns the filter for this tag on, or off when it is on. */
  toggleTag: (tag: string) => void;
}

export const BrowseContext = createContext<BrowseActions | null>(null);

export function useBrowse(): BrowseActions | null {
  return useContext(BrowseContext);
}
