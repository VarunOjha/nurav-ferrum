/**
 * Backlinks of one page grouped by reference field (ip-routes-and-views §3.7): frontmatter id
 * references (related, depends_on, connects.to, …) and body links. Pure.
 */
import { frontmatterRefs } from "./links";
import type { WikiIndex } from "./load";

export interface BacklinkGroup {
  /** Frontmatter field name, `connects.to`, or `body link`. */
  field: string;
  /** Referencing page ids, sorted. */
  ids: string[];
}

export const BODY_LINK = "body link";

export function backlinkGroups(idx: Pick<WikiIndex, "pages" | "byPath">, targetId: string): BacklinkGroup[] {
  const target = idx.pages.find((p) => p.id === targetId);
  const groups = new Map<string, Set<string>>();
  const add = (field: string, id: string) => {
    if (id === targetId) return;
    let s = groups.get(field);
    if (!s) groups.set(field, (s = new Set()));
    s.add(id);
  };
  for (const p of idx.pages) {
    if (p.id === null) continue;
    for (const r of frontmatterRefs(p.fm ?? p.rawFm)) if (r.id === targetId) add(r.field, p.id);
    if (target) {
      for (const l of p.links) if (l.resolvedPath !== null && l.resolvedPath === target.path) add(BODY_LINK, p.id);
    }
  }
  const order = (f: string) => (f === BODY_LINK ? "~" : f);
  return [...groups.entries()]
    .sort((a, b) => (order(a[0]) < order(b[0]) ? -1 : order(a[0]) > order(b[0]) ? 1 : 0))
    .map(([field, ids]) => ({ field, ids: [...ids].sort() }));
}
