"use client";
/**
 * Interactive graph (ip-routes-and-views §3.2, §3.3, §3.8) on @xyflow/react, drawn from server-side
 * dagre positions. Keyboard: every node holds one real control (a link, or a button that opens the
 * side panel), placed in DOM order = reading order, so Tab walks the nodes left to right and Enter
 * activates them; xyflow's own node focus is switched off so focus never stops twice per node.
 * Nothing is draggable, connectable or selectable: the graph is a read-only view. Re-themes with the
 * app theme (colorMode); no animations, so prefers-reduced-motion has nothing to disable.
 *
 * IP-9 review: the initial viewport never zooms out below `fitMinZoom` (a larger graph is shown from
 * its top-left corner and panned), with labelMode "active" only the edges of the hovered, focused or
 * opened node show their full label, and `route: "below"` edges leave and enter at the bottom.
 *
 * IP-10 follow-up (hover labels overlapped: 22 labels, 19 overlapping pairs on "WebView manager"):
 * labelMode "active" now draws only short chips on the canvas (the `short` marker, or the label cut to
 * CHIP_MAX characters for the active node's edges), each placed on its curve where it hits no node and
 * no other chip (lib/views/edgeLabels.ts), and lists the full text of the active node's edges in a
 * region beside the graph (data-testid "graph-edges").
 */
import "@xyflow/react/dist/style.css";
import { Background, BaseEdge, Controls, EdgeLabelRenderer, getBezierPath, Handle, MarkerType, Position, ReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chipSize, chipText, placeChips, type ChipRequest } from "@/lib/views/edgeLabels";
import { initialViewport, type Viewport } from "@/lib/views/viewport";
import { useEffectiveTheme } from "../theme";
import type { FlowBadge, FlowEdgeSpec, FlowGraphProps, FlowNodeSpec, FlowPanel } from "./types";

type ItemData = { spec: FlowNodeSpec };
type LaneData = { title: string };

const OpenPanel = createContext<(id: string, trigger: HTMLElement) => void>(() => {});
/** Hover/focus tracking for labelMode "active" (null = the pointer or focus left the node). */
const SetActive = createContext<(id: string | null) => void>(() => {});

function Badge({ b }: { b: FlowBadge }) {
  return (
    <span className={`chip chip-xs chip-${b.tone ?? "outline"}`} title={b.title}>
      {b.text}
    </span>
  );
}

function ItemNode({ data }: NodeProps<Node<ItemData>>) {
  const s = data.spec;
  const open = useContext(OpenPanel);
  const setActive = useContext(SetActive);
  const on = () => setActive(s.id);
  const off = () => setActive(null);
  const body = (
    <>
      {s.eyebrow && <span className="fg-eyebrow">{s.eyebrow}</span>}
      <span className="fg-title">{s.title}</span>
      {s.sub && <span className="fg-sub mono">{s.sub}</span>}
      {s.badges && s.badges.length > 0 && (
        <span className="fg-badges">
          {s.badges.map((b, i) => (
            <Badge key={i} b={b} />
          ))}
        </span>
      )}
    </>
  );
  return (
    <div
      className={["fg-node", ...(s.classes ?? [])].join(" ")}
      data-node-id={s.id}
      style={{ width: s.w, height: s.h }}
      onMouseEnter={on}
      onMouseLeave={off}
      onFocus={on}
      onBlur={off}
    >
      <Handle type="target" id="l" position={Position.Left} isConnectable={false} className="fg-handle" />
      <Handle type="target" id="bt" position={Position.Bottom} isConnectable={false} className="fg-handle" />
      {s.href ? (
        <Link href={s.href} className="fg-hit nodrag nopan" aria-label={s.ariaLabel} title={s.title}>
          {body}
        </Link>
      ) : (
        <button type="button" className="fg-hit nodrag nopan" aria-label={s.ariaLabel} title={s.title} onClick={(e) => open(s.id, e.currentTarget)}>
          {body}
        </button>
      )}
      <Handle type="source" id="r" position={Position.Right} isConnectable={false} className="fg-handle" />
      <Handle type="source" id="b" position={Position.Bottom} isConnectable={false} className="fg-handle" />
    </div>
  );
}

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  return (
    <div className="fg-lane" aria-hidden="true">
      <span className="fg-lane-label">{data.title}</span>
    </div>
  );
}

const NODE_TYPES = { item: ItemNode, lane: LaneNode };

type ChipData = { chip?: string; chipClass?: string; lx?: number; ly?: number; full: string };

/**
 * Bezier edge whose label is a short chip at the position chosen by placeChips (not drawn without one).
 * The chip is HTML in xyflow's label layer, so it sits above every edge line, and its width is the
 * width placeChips reserved (text that would not fit is cut with an ellipsis by CSS).
 */
function ChipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<Edge<ChipData>>) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const chip = data?.chip;
  const show = !!chip && data.lx !== undefined && data.ly !== undefined;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      {show && (
        <EdgeLabelRenderer>
          <div
            className={["fg-chip", data!.chipClass ?? ""].join(" ").trim()}
            data-edge={id}
            title={data!.full}
            aria-hidden="true"
            style={{ width: chipSize(chip).w, transform: `translate(-50%, -50%) translate(${data!.lx}px, ${data!.ly}px)` }}
          >
            {chip}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const EDGE_TYPES = { chip: ChipEdge };

/** Full text of the active node's edges, beside the graph (labelMode "active"). */
function EdgeList({ id, nodes, edges }: { id: string | null; nodes: FlowNodeSpec[]; edges: FlowEdgeSpec[] }) {
  const node = id ? nodes.find((n) => n.id === id && n.kind === "item") : undefined;
  const titleOf = (x: string) => nodes.find((n) => n.id === x && n.kind === "item")?.title ?? x;
  const out = node ? edges.filter((e) => e.from === node.id) : [];
  const inc = node ? edges.filter((e) => e.to === node.id && e.from !== node.id) : [];
  const row = (e: FlowEdgeSpec, other: string, to: boolean) => (
    <li key={e.id} data-edge={e.id} className={(e.classes ?? []).includes("fg-edge-bad") ? "fg-edges-bad" : undefined}>
      <span className="sr-only">{to ? "to " : "from "}</span>
      <strong>{titleOf(other)}</strong>: {e.label ?? e.short ?? ""}
    </li>
  );
  return (
    <section className="fg-edges" aria-labelledby="fg-edges-title" aria-live="polite" data-testid="graph-edges">
      <h2 id="fg-edges-title" className="panel-title">
        {node ? `Edges of ${node.title}` : "Edges"}
      </h2>
      {!node ? (
        <p className="muted small">Hover, focus or open a component to list its edges here in full.</p>
      ) : out.length + inc.length === 0 ? (
        <p className="muted small">No edges.</p>
      ) : (
        <>
          {out.length > 0 && (
            <>
              <h3 className="fg-edges-sub">Outgoing ({out.length})</h3>
              <ul className="plain-list fg-edges-list">{out.map((e) => row(e, e.to, true))}</ul>
            </>
          )}
          {inc.length > 0 && (
            <>
              <h3 className="fg-edges-sub">Incoming ({inc.length})</h3>
              <ul className="plain-list fg-edges-list">{inc.map((e) => row(e, e.from, false))}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function SidePanel({ panel, onClose }: { panel: FlowPanel; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [panel.id]);
  return (
    <aside className="fg-panel" aria-labelledby="fg-panel-title" data-testid="graph-panel">
      <div className="fg-panel-head">
        <h2 id="fg-panel-title" className="panel-title" tabIndex={-1} ref={heading}>
          {panel.title}
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>
      <p className="mono small">{panel.id}</p>
      {panel.badges.length > 0 && (
        <p className="fg-badges">
          {panel.badges.map((b, i) => (
            <Badge key={i} b={b} />
          ))}
        </p>
      )}
      <dl className="fg-panel-rows">
        {panel.rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              {r.items.length === 0 ? (
                <span className="muted">none</span>
              ) : (
                <ul className="plain-list">
                  {r.items.map((it, i) => (
                    <li key={i}>{it.href ? <a href={it.href}>{it.text}</a> : it.text}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {panel.link && (
        <p>
          <a href={panel.link.href} className="btn btn-primary btn-sm">
            {panel.link.text}
          </a>
        </p>
      )}
    </aside>
  );
}

export default function FlowGraph({ nodes, edges, label, height, testId, fitMinZoom = 0.15, labelMode = "always" }: FlowGraphProps) {
  const theme = useEffectiveTheme();
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // The edge list keeps the last active node, so the pointer can move over to it and read it.
  const [listId, setListId] = useState<string | null>(null);
  const setActive = useCallback((id: string | null) => {
    setHoverId(id);
    if (id) setListId(id);
  }, []);
  const canvas = useRef<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  // Initial view from the canvas size before first paint: fit, but never below fitMinZoom.
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    setViewport(initialViewport(nodes, { w: el.clientWidth, h: el.clientHeight }, { minZoom: fitMinZoom }));
  }, [nodes, fitMinZoom]);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback((id: string, el: HTMLElement) => {
    trigger.current = el;
    setOpenId(id);
    setListId(id);
  }, []);
  const close = useCallback(() => {
    setOpenId(null);
    trigger.current?.focus();
  }, []);

  const rfNodes = useMemo<Node[]>(
    () =>
      nodes.map((s) =>
        s.kind === "lane"
          ? {
              id: `lane:${s.id}`,
              type: "lane",
              position: { x: s.x, y: s.y },
              data: { title: s.title },
              style: { width: s.w, height: s.h },
              width: s.w,
              height: s.h,
              zIndex: -1,
              draggable: false,
              selectable: false,
              focusable: false,
              connectable: false,
            }
          : {
              id: s.id,
              type: "item",
              position: { x: s.x, y: s.y },
              data: { spec: s },
              width: s.w,
              height: s.h,
              draggable: false,
              selectable: false,
              focusable: false,
              connectable: false,
            },
      ),
    [nodes],
  );
  const active = hoverId ?? openId;
  const chips = labelMode === "active";
  // Chip positions (labelMode "active"): the active node's edges first, then the short markers.
  const placed = useMemo(() => {
    if (!chips) return new Map<string, { x: number; y: number }>();
    const box = new Map(nodes.filter((n) => n.kind === "item").map((n) => [n.id, { x: n.x, y: n.y, w: n.w, h: n.h }] as const));
    const isActive = (e: FlowEdgeSpec) => active !== null && (e.from === active || e.to === active);
    const req = (e: FlowEdgeSpec): ChipRequest | null => {
      const from = box.get(e.from);
      const to = box.get(e.to);
      const text = isActive(e) ? chipText(e.label ?? "") : (e.short ?? "");
      return from && to && text ? { id: e.id, text, from, to } : null;
    };
    const ordered = [...edges.filter(isActive), ...edges.filter((e) => !isActive(e))].map(req).filter((r): r is ChipRequest => r !== null);
    return placeChips(ordered, [...box.values()]);
  }, [chips, nodes, edges, active]);
  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e): Edge => {
        if (chips) {
          const at = placed.get(e.id);
          const on = active !== null && (e.from === active || e.to === active);
          return {
            id: e.id,
            source: e.from,
            target: e.to,
            sourceHandle: "r",
            targetHandle: "l",
            type: "chip",
            className: ["fg-edge", ...(on ? ["fg-edge-active"] : []), ...(e.classes ?? [])].join(" "),
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            focusable: false,
            selectable: false,
            data: {
              chip: on ? chipText(e.label ?? "") : e.short,
              chipClass: [on ? "fg-chip-active" : "", ...(e.classes ?? []).map((c) => c.replace("fg-edge-", "fg-chip-"))].filter(Boolean).join(" "),
              lx: at?.x,
              ly: at?.y,
              full: e.label ?? "",
            },
          };
        }
        return {
        id: e.id,
        source: e.from,
        target: e.to,
        sourceHandle: e.route === "below" ? "b" : "r",
        targetHandle: e.route === "below" ? "bt" : "l",
        type: e.route === "below" ? "smoothstep" : "default",
        label: labelMode === "always" || (active !== null && (e.from === active || e.to === active)) ? e.label : e.short,
        className: ["fg-edge", ...(e.classes ?? [])].join(" "),
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        focusable: false,
        selectable: false,
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        data: { full: e.label ?? "" },
        };
      }),
    [edges, labelMode, active, chips, placed],
  );
  const panel = openId ? nodes.find((n) => n.id === openId)?.panel ?? null : null;
  const side = !!panel || chips;

  return (
    <div className={side ? "fg-wrap fg-wrap-open" : "fg-wrap"}>
      <section className="fg-canvas" style={{ height }} aria-label={label} data-testid={testId} data-label-mode={labelMode} ref={canvas}>
        <OpenPanel.Provider value={open}>
          <SetActive.Provider value={setActive}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            colorMode={theme}
            viewport={viewport ?? { x: 0, y: 0, zoom: 1 }}
            onViewportChange={setViewport}
            fitViewOptions={{ padding: 0.08 }}
            minZoom={0.15}
            maxZoom={1.75}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            disableKeyboardA11y
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: false }}
          >
            <Background gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
          </SetActive.Provider>
        </OpenPanel.Provider>
      </section>
      {side && (
        <div className="fg-side">
          {panel && <SidePanel panel={panel} onClose={close} />}
          {chips && <EdgeList id={active ?? listId} nodes={nodes} edges={edges} />}
        </div>
      )}
    </div>
  );
}
