// Architecture (ip-routes-and-views §3.2): the component graph from `connects` only, in trust-level
// swim-lanes, with trust-boundary edges dashed, thick and marked "TB", TRUST-EDGE errors red,
// not-shipped components dotted, dangling targets as red dashed placeholders, a side panel per
// component and an always-present edge table as the text alternative. Filters are URL parameters, so
// the graph and the table always show the same edges.
import type { Metadata } from "next";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import LazyFlowGraph from "@/components/graph/LazyFlowGraph";
import type { FlowEdgeSpec, FlowNodeSpec } from "@/components/graph/types";
import { getApprovals, getIndex } from "@/lib/server/data";
import { approvalLabel, toneOf } from "@/lib/ui/tone";
import { layoutArchitecture, TRUST_LANES } from "@/lib/views/graphLayout";
import { componentGraph, type ComponentEdge, type ComponentNode } from "@/lib/wiki/graph";
import { pageHref, wikiHref } from "@/lib/wiki/routes";
import { EDGE_KINDS } from "@/lib/wiki/schemas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Architecture" };

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

function edgeLabel(e: ComponentEdge): string {
  return `${e.crossesTrustBoundary ? "TB · " : ""}${e.label} (${e.kind})${e.trustEdgeError ? " · TRUST-EDGE" : ""}`;
}

export default async function ArchitectureRoute({ searchParams }: PageProps<"/architecture">) {
  const sp = await searchParams;
  const kind = one(sp.kind);
  const tbOnly = one(sp.tb) === "1";
  const hideUnshipped = one(sp.hide) === "1";
  const [idx, view] = await Promise.all([getIndex(), getApprovals().catch(() => null)]);
  const full = componentGraph(idx);
  const stateOf = new Map((view?.items ?? []).filter((i) => !i.exit).map((i) => [i.id, i.state] as const));

  const nodes = full.nodes.filter((n) => !(hideUnshipped && !n.shipped));
  const keep = new Set(nodes.map((n) => n.id));
  const edges = full.edges.filter((e) => keep.has(e.from) && keep.has(e.to) && (!kind || e.kind === kind) && (!tbOnly || e.crossesTrustBoundary));
  const { boxes, lanes } = layoutArchitecture({ nodes, edges });
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const titleOf = (id: string) => byId.get(id)?.title ?? id;

  const panelOf = (n: ComponentNode): FlowNodeSpec["panel"] => {
    const state = stateOf.get(n.id);
    const phase = n.phase_introduced;
    return {
      title: n.title,
      id: n.id,
      badges: [
        { text: n.status, tone: toneOf(n.status) },
        { text: n.trust_level ?? "no page", tone: "outline" },
        ...(state ? [{ text: `approval: ${approvalLabel(state)}`, tone: toneOf(state === "APPROVED_VOLATILE_DRIFT" ? "approved_volatile_drift" : state) }] : []),
        ...(!n.shipped ? [{ text: "not shipped", tone: "outline" as const }] : []),
        ...(n.unsafe_code ? [{ text: "unsafe", tone: "amber" as const }] : []),
      ],
      rows: [
        { label: "Responsibilities", items: n.responsibilities.map((t) => ({ text: t })) },
        { label: "Interfaces", items: n.interfaces.map((t) => ({ text: t })) },
        { label: "Phase introduced", items: phase ? [{ text: phase, href: `/go/${encodeURIComponent(phase)}` }] : [] },
        {
          label: "Connects to",
          items: full.edges.filter((e) => e.from === n.id).map((e) => ({ text: `${e.to}: ${e.label} (${e.kind})${e.crossesTrustBoundary ? " TB" : ""}`, href: `/go/${encodeURIComponent(e.to)}` })),
        },
      ],
      link: n.path ? { href: wikiHref(n.path), text: "Open the full page" } : null,
    };
  };

  const specs: FlowNodeSpec[] = [
    ...lanes.map((l) => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h, kind: "lane" as const, title: TRUST_LANES.find((t) => t.id === l.id)?.label ?? l.label, ariaLabel: l.label })),
    ...boxes.map((b) => {
      const n = byId.get(b.id)!;
      return {
        id: n.id,
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        kind: "item" as const,
        title: n.title,
        sub: n.id,
        badges: n.dangling
          ? [{ text: "missing page", tone: "red" as const }]
          : [
              { text: n.status, tone: toneOf(n.status) },
              ...(!n.shipped ? [{ text: "not shipped", tone: "outline" as const }] : []),
              ...(n.unsafe_code ? [{ text: "unsafe", tone: "amber" as const }] : []),
            ],
        classes: [n.dangling ? "fg-dangling" : "", !n.shipped ? "fg-dotted" : "", `fg-lane-${n.dangling ? "missing" : n.trust_level}`].filter(Boolean),
        panel: n.dangling ? undefined : panelOf(n),
        href: n.dangling ? `/go/${encodeURIComponent(n.id)}` : undefined,
        ariaLabel: n.dangling ? `${n.id}: missing component page` : `${n.title} (${n.id}), ${n.trust_level}: show details`,
      };
    }),
  ];
  const edgeSpecs: FlowEdgeSpec[] = edges.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: edgeLabel(e),
    classes: [e.crossesTrustBoundary ? "fg-edge-tb" : "", e.trustEdgeError || e.dangling ? "fg-edge-bad" : ""].filter(Boolean),
  }));
  const height = Math.min(760, Math.max(360, (lanes.at(-1) ? lanes.at(-1)!.y + lanes.at(-1)!.h : 0) * 0.75 + 80));
  const filtered = !!kind || tbOnly || hideUnshipped;

  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Architecture</h1>
        <p className="muted">
          {full.nodes.filter((n) => !n.dangling).length} components and {full.edges.length} edges from the <code>connects</code> fields of the component
          pages. The mermaid diagrams on the architecture pages are illustrations (SCHEMA §14); this graph is built from frontmatter only.
        </p>
      </header>

      <form className="filters" method="get" action="/architecture" aria-label="Graph filters">
        <label>
          Edge kind{" "}
          <select name="kind" defaultValue={kind ?? ""}>
            <option value="">all kinds</option>
            {EDGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" name="tb" value="1" defaultChecked={tbOnly} /> only trust-boundary edges
        </label>
        <label>
          <input type="checkbox" name="hide" value="1" defaultChecked={hideUnshipped} /> hide not-shipped
        </label>
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
        {filtered && (
          <a href="/architecture" className="small">
            Clear filters
          </a>
        )}
      </form>

      <ul className="legend small" aria-label="Legend">
        <li>
          <span className="legend-line legend-tb" aria-hidden="true" /> TB: crosses a trust boundary (dashed, thick)
        </li>
        <li>
          <span className="legend-line legend-bad" aria-hidden="true" /> red: TRUST-EDGE lint error or dangling target
        </li>
        <li>
          <span className="legend-box legend-dotted" aria-hidden="true" /> dotted border: not shipped
        </li>
        <li>Lanes: trust level. Tab moves through the components; Enter opens the details panel.</li>
      </ul>

      {nodes.length === 0 ? (
        <p className="muted">No component pages{filtered ? " match the filters" : ""}.</p>
      ) : (
        <LazyFlowGraph nodes={specs} edges={edgeSpecs} label="Component graph" height={height} testId="arch-graph" />
      )}

      <section className="panel" aria-labelledby="edges-title">
        <h2 id="edges-title" className="panel-title">
          Edges (text alternative)
        </h2>
        {edges.length === 0 ? (
          <p className="muted small">No edges{filtered ? " match the filters" : ""}.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-testid="edge-table">
              <thead>
                <tr>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Label</th>
                  <th scope="col">Kind</th>
                  <th scope="col">TB</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e) => (
                  <tr key={e.id} data-edge={e.id} className={e.trustEdgeError || e.dangling ? "row-bad" : undefined}>
                    <td>
                      <a href={`/go/${encodeURIComponent(e.from)}`}>{titleOf(e.from)}</a> <span className="mono small muted">{e.from}</span>
                    </td>
                    <td>
                      <a href={`/go/${encodeURIComponent(e.to)}`} className={e.dangling ? "link-missing" : undefined} title={e.dangling ? "missing (REF-DANGLING)" : undefined}>
                        {titleOf(e.to)}
                      </a>{" "}
                      <span className="mono small muted">{e.to}</span>
                    </td>
                    <td>{e.label}</td>
                    <td className="mono small">{e.kind}</td>
                    <td>
                      {e.crossesTrustBoundary ? <strong>TB yes</strong> : "no"}
                      {e.trustEdgeError && (
                        <span className="chip chip-xs chip-red" title="crosses_trust_boundary disagrees with the trust levels">
                          TRUST-EDGE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="comps-title">
        <h2 id="comps-title" className="panel-title">
          Components
        </h2>
        <div className="table-wrap">
          <table className="data-table" data-testid="component-table">
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col">Trust level</th>
                <th scope="col">Status</th>
                <th scope="col">Shipped</th>
                <th scope="col">Approval</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id}>
                  <td>
                    {n.dangling ? (
                      <span className="link-missing mono">{n.id}</span>
                    ) : (
                      <>
                        <a href={n.path ? pageHref({ id: n.id, path: n.path, kind: "wiki", fm: null, rawFm: null }) : "#"}>{n.title}</a>{" "}
                        <span className="mono small muted">{n.id}</span>
                      </>
                    )}
                  </td>
                  <td>{n.trust_level ?? <span className="muted">no page (dangling)</span>}</td>
                  <td>{n.dangling ? <span className="chip chip-xs chip-red">missing</span> : <StatusBadge status={n.status} />}</td>
                  <td>{n.dangling ? "" : n.shipped ? "yes" : "no"}</td>
                  <td>{stateOf.get(n.id) ? <ApprovalBadge state={stateOf.get(n.id)!} /> : <span className="muted small">n/a</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
