/**
 * Link rewriting for rendered markdown (ip-routes-and-views §3.7): relative links go to
 * /wiki/<resolved path> with the anchor kept, https links are external, links to missing files are
 * flagged (REF-DANGLING). Pure; existence is a callback.
 */
import { resolveHref } from "./links";
import { wikiHref } from "./routes";

export type LinkKind = "anchor" | "internal" | "external" | "missing" | "outside" | "unsafe";

export interface RewrittenLink {
  kind: LinkKind;
  /** null: render as text (outside the wiki, unsafe scheme). */
  href: string | null;
  /** Tooltip. */
  title?: string;
  /** Wiki-relative target (internal/missing) or repo-relative (outside). */
  target?: string;
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

export function rewriteHref(fromPath: string, href: string, exists: (wikiPath: string) => boolean): RewrittenLink {
  const h = href.trim();
  if (h === "") return { kind: "unsafe", href: null, title: "empty link" };
  if (h.startsWith("#")) return { kind: "anchor", href: h };
  const scheme = SCHEME.exec(h)?.[1]?.toLowerCase();
  if (scheme) {
    if (scheme === "https" || scheme === "http" || scheme === "mailto") return { kind: "external", href: h };
    return { kind: "unsafe", href: null, title: `link with scheme ${scheme}: not rendered` };
  }
  if (h.startsWith("//")) return { kind: "external", href: "https:" + h };
  // A root-relative link (`/x.md`) resolves from the wiki root.
  const { resolvedPath, anchor } = h.startsWith("/") ? resolveHref("index.md", h.slice(1)) : resolveHref(fromPath, h);
  if (resolvedPath === null) return { kind: "unsafe", href: null };
  if (resolvedPath === ".." || resolvedPath.startsWith("../")) {
    const repoRel = resolvedPath.replace(/^(\.\.\/)+/, "");
    if (resolvedPath === "../STATUS.md") return { kind: "internal", href: "/", target: "STATUS.md", title: "STATUS.md (dashboard)" };
    return { kind: "outside", href: null, target: repoRel, title: `repo file ${repoRel} (outside wiki/, not served)` };
  }
  if (!exists(resolvedPath)) {
    return { kind: "missing", href: wikiHref(resolvedPath, anchor), target: resolvedPath, title: "missing (REF-DANGLING)" };
  }
  return { kind: "internal", href: wikiHref(resolvedPath, anchor), target: resolvedPath };
}
