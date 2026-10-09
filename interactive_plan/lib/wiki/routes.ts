/**
 * App URLs for wiki pages and ids (ip-routes-and-views §1: /wiki/[...path], /go/[id], 404 close
 * matches). Pure.
 */
import type { WikiIndex, WikiPage } from "./load";

/**
 * `/wiki/<path>` with each segment URL-encoded. A directory's trailing `/` is dropped (Next redirects
 * trailing slashes away); the page resolves `x` to the directory `x/` when no file `x` exists.
 */
export function wikiHref(wikiPath: string, anchor?: string | null): string {
  const enc = wikiPath
    .replace(/\/+$/, "")
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return "/wiki" + (enc ? "/" + enc : "") + (anchor ? "#" + encodeURIComponent(anchor) : "");
}

/**
 * Typed views by page type. A type is registered by the build step that adds its route: IP-7 added
 * `phase` -> /phases/[id]; IP-8 added `decision` -> /decisions/[id] (decided 2026-10-09, IP-6: /go
 * never redirects to a route that does not exist yet).
 */
export const TYPED_ROUTES: Readonly<Record<string, (id: string) => string>> = {
  phase: (id) => `/phases/${encodeURIComponent(id)}`,
  decision: (id) => `/decisions/${encodeURIComponent(id)}`,
};

/** Where a page is shown: its typed view if one exists, the dashboard for STATUS.md, else the wiki browser. */
export function pageHref(p: Pick<WikiPage, "id" | "path" | "kind" | "fm" | "rawFm">, typed = true): string {
  if (p.kind === "status") return "/";
  const fm = (p.fm ?? p.rawFm ?? {}) as Record<string, unknown>;
  const route = typed && typeof fm.type === "string" ? TYPED_ROUTES[fm.type] : undefined;
  if (route && p.id) return route(p.id);
  return wikiHref(p.path);
}

/**
 * Target of `/go/<id>`: a page id, an open-question id (`Q-NNN`, the heading anchor on
 * ov-open-questions) or a task id (`pN.M`, the phase page that defines it). null when unknown.
 */
export function goTarget(idx: Pick<WikiIndex, "byId" | "pages">, rawId: string): string | null {
  const id = rawId.trim();
  const page = idx.byId.get(id);
  if (page) return pageHref(page);
  if (/^Q-\d{3}$/.test(id)) {
    const oq = idx.byId.get("ov-open-questions");
    const h = oq?.headings.find((x) => x.text === id || x.text.startsWith(id + " "));
    if (oq && h) return wikiHref(oq.path, h.slug);
    return null;
  }
  if (/^p[0-8]\.\d+$/.test(id)) {
    for (const p of idx.pages) {
      const tasks = (p.fm as { type?: string; tasks?: { id: string }[] } | null)?.tasks;
      if (p.fm?.type === "phase" && tasks?.some((t) => t.id === id)) return pageHref(p);
    }
  }
  return null;
}

/** Levenshtein distance (case-sensitive; callers lower-case). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Close matches for a missing id or path segment, by edit distance on ids (ip-routes-and-views §1).
 * Ids containing the query (or contained in it) come first; others must be within
 * max(2, ⌈len/3⌉) edits.
 */
export function closeMatches(ids: readonly string[], query: string, limit = 5): string[] {
  const q = query.trim().toLowerCase().replace(/\.md$/, "");
  if (q === "") return [];
  const max = Math.max(2, Math.ceil(q.length / 3));
  const scored: { id: string; d: number }[] = [];
  for (const id of ids) {
    const l = id.toLowerCase();
    if (l.includes(q) || q.includes(l)) scored.push({ id, d: -1 / Math.max(1, Math.abs(l.length - q.length) + 1) });
    else {
      const d = editDistance(l, q);
      if (d <= max) scored.push({ id, d });
    }
  }
  scored.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  return scored.slice(0, limit).map((s) => s.id);
}

export type WikiTarget = { kind: "root" } | { kind: "file"; path: string } | { kind: "dir"; path: string };

/**
 * Maps the `/wiki/[[...path]]` segments to a known wiki file or directory. Only paths present in the
 * loaded file set resolve, so nothing outside wiki/ can ever be read: `..`, `.`, empty segments,
 * backslashes and NUL are rejected before the lookup.
 */
export function resolveWikiParam(segments: readonly string[] | undefined, files: ReadonlySet<string>): WikiTarget | null {
  if (!segments || segments.length === 0) return { kind: "root" };
  const decoded: string[] = [];
  for (const raw of segments) {
    let s = raw;
    if (s.includes("%")) {
      try {
        s = decodeURIComponent(s);
      } catch {
        return null;
      }
    }
    if (s === "" || s === "." || s === ".." || /[\\\u0000]/.test(s) || s.includes("/")) return null;
    decoded.push(s);
  }
  const p = decoded.join("/");
  if (files.has(p)) return { kind: "file", path: p };
  if (files.has(p + "/")) return { kind: "dir", path: p + "/" };
  return null;
}
