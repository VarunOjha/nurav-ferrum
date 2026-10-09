"use client";
/**
 * Interactive graph (ip-routes-and-views §3.2, §3.3, §3.8) on @xyflow/react, drawn from server-side
 * dagre positions. Keyboard: every node holds one real control (a link, or a button that opens the
 * side panel), placed in DOM order = reading order, so Tab walks the nodes left to right and Enter
 * activates them; xyflow's own node focus is switched off so focus never stops twice per node.
 * Nothing is draggable, connectable or selectable: the graph is a read-only view. Re-themes with the
 * app theme (colorMode); no animations, so prefers-reduced-motion has nothing to disable.
 */
import "@xyflow/react/dist/style.css";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useEffectiveTheme } from "../theme";
import type { FlowBadge, FlowGraphProps, FlowNodeSpec, FlowPanel } from "./types";

type ItemData = { spec: FlowNodeSpec };
type LaneData = { title: string };

const OpenPanel = createContext<(id: string, trigger: HTMLElement) => void>(() => {});

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
    <div className={["fg-node", ...(s.classes ?? [])].join(" ")} data-node-id={s.id} style={{ width: s.w, height: s.h }}>
      <Handle type="target" position={Position.Left} isConnectable={false} className="fg-handle" />
      {s.href ? (
        <Link href={s.href} className="fg-hit nodrag nopan" aria-label={s.ariaLabel}>
          {body}
        </Link>
      ) : (
        <button type="button" className="fg-hit nodrag nopan" aria-label={s.ariaLabel} onClick={(e) => open(s.id, e.currentTarget)}>
          {body}
        </button>
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} className="fg-handle" />
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

export default function FlowGraph({ nodes, edges, label, height, testId }: FlowGraphProps) {
  const theme = useEffectiveTheme();
  const [openId, setOpenId] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback((id: string, el: HTMLElement) => {
    trigger.current = el;
    setOpenId(id);
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
  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label,
        className: ["fg-edge", ...(e.classes ?? [])].join(" "),
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        focusable: false,
        selectable: false,
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [edges],
  );
  const panel = openId ? nodes.find((n) => n.id === openId)?.panel ?? null : null;

  return (
    <div className={panel ? "fg-wrap fg-wrap-open" : "fg-wrap"}>
      <section className="fg-canvas" style={{ height }} aria-label={label} data-testid={testId}>
        <OpenPanel.Provider value={open}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            colorMode={theme}
            fitView
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
        </OpenPanel.Provider>
      </section>
      {panel && <SidePanel panel={panel} onClose={close} />}
    </div>
  );
}
