/**
 * Serializable graph description passed from the server views to the client FlowGraph
 * (ip-routes-and-views §3.2, §3.3, §3.8). Positions come from lib/views/graphLayout.ts.
 */
import type { Tone } from "@/lib/ui/tone";

export interface FlowBadge {
  text: string;
  tone?: Tone | "outline";
  title?: string;
}

/** Side-panel content of a node that opens a panel instead of navigating (architecture). */
export interface FlowPanel {
  title: string;
  id: string;
  badges: FlowBadge[];
  rows: { label: string; items: { text: string; href?: string }[] }[];
  link: { href: string; text: string } | null;
}

export interface FlowNodeSpec {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** `lane`: a non-interactive background band with a label. */
  kind: "lane" | "item";
  title: string;
  /** Small line under the title (id, order, sessions…). */
  sub?: string;
  /** Upper-case eyebrow (RQ, HYP, …). */
  eyebrow?: string;
  badges?: FlowBadge[];
  /** CSS modifier classes (fg-dotted, fg-gap, fg-crit, fg-dangling, fg-tone-*). */
  classes?: string[];
  /** Navigate on activation (roadmap, research). */
  href?: string;
  /** Open the side panel on activation (architecture). */
  panel?: FlowPanel;
  /** Accessible name of the node's control. */
  ariaLabel: string;
}

export interface FlowEdgeSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Label shown while neither endpoint is active, when the graph's labelMode is "active" (e.g. "TB"). */
  short?: string;
  /** "below": leaves and enters at the bottom of the nodes (smoothstep), so an edge that skips a
   * rank does not run behind the node in between (roadmap). */
  route?: "below";
  /** fg-edge-tb (dashed, thick), fg-edge-bad (red), fg-edge-crit, fg-edge-dangling. */
  classes?: string[];
}

export interface FlowGraphProps {
  nodes: FlowNodeSpec[];
  edges: FlowEdgeSpec[];
  /** Accessible name of the graph region. */
  label: string;
  height: number;
  testId?: string;
  /**
   * Smallest zoom the initial fit may use (default 0.15). A graph that would need less is shown at this
   * zoom from its top-left corner and is panned (drag, scroll bars of the controls) instead of shrunk
   * to unreadable text (IP-9 review).
   */
  fitMinZoom?: number;
  /**
   * "always" (default): every edge label is drawn. "active": only the edges of the hovered, focused or
   * opened node show their full label; the others show `short` (or nothing), so labels never pile up.
   */
  labelMode?: "always" | "active";
}
