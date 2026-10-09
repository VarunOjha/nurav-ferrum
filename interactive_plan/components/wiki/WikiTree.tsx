/**
 * Wiki browser left pane (ip-routes-and-views §3.7): the directory tree of wiki/, raw/ collapsed by
 * default and labelled "immutable", filterable by type and status (a GET form, no JS needed).
 */
import { STATUS_ENUMS, PAGE_TYPES } from "@/lib/wiki/schemas";
import { wikiHref } from "@/lib/wiki/routes";
import type { TreeNode } from "@/lib/wiki/tree";

const ALL_STATUSES = [...new Set(Object.values(STATUS_ENUMS).flat())].sort();

function Node({ node, current, open, filtering }: { node: TreeNode; current: string; open: Set<string>; filtering: boolean }) {
  if (!node.dir) {
    const here = node.path === current;
    return (
      <li className="tree-file">
        <a
          href={wikiHref(node.path)}
          aria-current={here ? "page" : undefined}
          title={node.page ? `${node.page.id ?? node.path} · ${node.page.title}` : node.path}
        >
          <span className="tree-name">{node.name}</span>
        </a>
      </li>
    );
  }
  const isRaw = node.path === "raw/";
  const expanded = filtering || open.has(node.path) || (!isRaw && node.path.split("/").length <= 2);
  return (
    <li className="tree-dir">
      <details open={expanded}>
        <summary>
          <span className="tree-name">{node.name}</span>
          {isRaw && <span className="chip chip-neutral chip-xs">immutable</span>}
          <span className="tree-count" aria-label={`${node.count} files`}>
            {node.count}
          </span>
        </summary>
        <ul>
          {node.children.map((c) => (
            <Node key={c.path} node={c} current={current} open={open} filtering={filtering} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function WikiTree({
  tree,
  current,
  open,
  filter,
  action,
}: {
  tree: TreeNode;
  current: string;
  open: Set<string>;
  filter: { type: string | null; status: string | null };
  action: string;
}) {
  const filtering = !!(filter.type || filter.status);
  return (
    <aside className="wiki-side" aria-label="Wiki files">
      <form method="get" action={action} className="tree-filter">
        <label>
          <span className="sr-only">Filter by type</span>
          <select name="type" defaultValue={filter.type ?? ""}>
            <option value="">All types</option>
            {PAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select name="status" defaultValue={filter.status ?? ""}>
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Filter
        </button>
        {filtering && (
          <a href={action} className="btn btn-ghost btn-sm">
            Clear
          </a>
        )}
      </form>
      {tree.children.length === 0 ? (
        <p className="muted small">No file matches the filter.</p>
      ) : (
        <ul className="tree" aria-label="wiki/">
          {tree.children.map((c) => (
            <Node key={c.path} node={c} current={current} open={open} filtering={filtering} />
          ))}
        </ul>
      )}
    </aside>
  );
}
