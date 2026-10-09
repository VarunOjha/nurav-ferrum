/**
 * Directory tree of wiki/ for the wiki browser's left pane (ip-routes-and-views §3.7). Pure.
 */
import type { WikiIndex } from "./load";
import { pageTitle } from "./search";

export interface TreeNode {
  name: string;
  /** Wiki-relative path; directories end with `/` (root: ""). */
  path: string;
  dir: boolean;
  children: TreeNode[];
  /** Markdown pages: id, title, type, status. */
  page?: { id: string | null; title: string; type: string | null; status: string | null };
  /** Number of files below (directories). */
  count: number;
}

export interface TreeFilter {
  type?: string | null;
  status?: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function buildTree(idx: Pick<WikiIndex, "files" | "byPath">, filter: TreeFilter = {}): TreeNode {
  const root: TreeNode = { name: "wiki", path: "", dir: true, children: [], count: 0 };
  const dirs = new Map<string, TreeNode>([["", root]]);
  const ensureDir = (p: string): TreeNode => {
    const hit = dirs.get(p);
    if (hit) return hit;
    const trimmed = p.slice(0, -1);
    const slash = trimmed.lastIndexOf("/");
    const parent = ensureDir(slash < 0 ? "" : trimmed.slice(0, slash + 1));
    const node: TreeNode = { name: trimmed.slice(slash + 1), path: p, dir: true, children: [], count: 0 };
    parent.children.push(node);
    dirs.set(p, node);
    return node;
  };
  const filtering = !!(filter.type || filter.status);
  for (const f of [...idx.files].sort()) {
    if (f.endsWith("/")) {
      if (!filtering) ensureDir(f);
      continue;
    }
    const pg = idx.byPath.get(f);
    const fm = (pg?.fm ?? pg?.rawFm ?? null) as Record<string, unknown> | null;
    const type = fm ? str(fm.type) : null;
    const status = fm ? str(fm.status) : null;
    if (filter.type && type !== filter.type) continue;
    if (filter.status && status !== filter.status) continue;
    const slash = f.lastIndexOf("/");
    const parent = ensureDir(slash < 0 ? "" : f.slice(0, slash + 1));
    parent.children.push({
      name: f.slice(slash + 1),
      path: f,
      dir: false,
      children: [],
      count: 0,
      page: pg ? { id: pg.id, title: pageTitle(pg), type, status } : undefined,
    });
  }
  const finish = (n: TreeNode): number => {
    n.children.sort((a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name, "en")));
    n.count = n.children.reduce((s, c) => s + (c.dir ? finish(c) : 1), 0);
    return n.count;
  };
  finish(root);
  return root;
}

/** Ancestor directory paths of a wiki path (`a/b/c.md` -> [`a/`, `a/b/`]), for opening the tree. */
export function ancestorDirs(wikiPath: string): string[] {
  const parts = wikiPath.split("/").filter(Boolean);
  const out: string[] = [];
  const last = wikiPath.endsWith("/") ? parts.length : parts.length - 1;
  for (let i = 1; i <= last; i++) out.push(parts.slice(0, i).join("/") + "/");
  return out;
}
