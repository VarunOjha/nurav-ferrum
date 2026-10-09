/**
 * Edge-label chips for the architecture graph (IP-10 follow-up of the IP-9 review finding "hover labels
 * overlap"). Dependency-free on purpose: the client FlowGraph imports it.
 *
 * The canvas only carries short chips (a marker such as "TB" or a label cut to CHIP_MAX characters);
 * the full text of the active component's edges is listed beside the graph. Each chip is placed on its
 * own edge curve at the first sample point where it hits neither a node nor an already placed chip;
 * a chip with no free point is not drawn (the edge keeps its line style, the list and the edge table
 * keep the text). Coordinates are flow coordinates, so the result does not depend on the zoom.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Longest chip text on the canvas, in characters (ellipsis included). */
export const CHIP_MAX = 24;
/**
 * Chip box (.fg-chip in globals.css: 11px font, 13px line height, padding 3px 6px, 1px border,
 * border-box). 6.6 px per character is a conservative system-font average; the chip gets exactly this
 * width, so a wider text is cut by CSS rather than growing the box.
 */
export const CHIP_CHAR_W = 6.6;
/** Horizontal padding plus border, per side. */
export const CHIP_PAD_X = 7;
/** Line height + vertical padding + border. */
export const CHIP_H = 13 + 2 * 3 + 2 * 1;
/** Free space kept around every chip and node. */
export const CHIP_MARGIN = 4;
/** Points along the curve tried in order: the middle first, then outwards in steps of 0.04 to 0.1 / 0.9. */
export const CHIP_TS: readonly number[] = [0.5, ...Array.from({ length: 10 }, (_, i) => [0.5 - 0.04 * (i + 1), 0.5 + 0.04 * (i + 1)]).flat()].map((t) => Math.round(t * 100) / 100);

/** Cuts a label to `max` characters with an ellipsis (whole text when it fits). */
export function chipText(label: string, max = CHIP_MAX): string {
  const s = label.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function chipSize(text: string): { w: number; h: number } {
  return { w: Math.ceil(text.length * CHIP_CHAR_W + 2 * CHIP_PAD_X), h: CHIP_H };
}

function controlOffset(distance: number, curvature: number): number {
  return distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
}

/**
 * Point at parameter t of xyflow's default bezier edge from a right-hand source handle to a left-hand
 * target handle (same control points as getBezierPath in @xyflow/system, curvature 0.25).
 */
export function bezierPoint(s: { x: number; y: number }, t: { x: number; y: number }, u: number, curvature = 0.25): { x: number; y: number } {
  const c1 = { x: s.x + controlOffset(t.x - s.x, curvature), y: s.y };
  const c2 = { x: t.x - controlOffset(t.x - s.x, curvature), y: t.y };
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return { x: a * s.x + b * c1.x + c * c2.x + d * t.x, y: a * s.y + b * c1.y + c * c2.y + d * t.y };
}

const hit = (a: Rect, b: Rect, m: number) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

export interface ChipRequest {
  id: string;
  text: string;
  /** Source node box (the edge leaves its right side) and target node box (enters on the left). */
  from: Rect;
  to: Rect;
}

/**
 * Places the chips in the given order (callers put the important ones first). Returns the centre of
 * every chip that found a free spot; the others are left out.
 */
export function placeChips(requests: readonly ChipRequest[], obstacles: readonly Rect[]): Map<string, { x: number; y: number }> {
  const placed: Rect[] = [];
  const out = new Map<string, { x: number; y: number }>();
  for (const r of requests) {
    if (!r.text) continue;
    const { w, h } = chipSize(r.text);
    const s = { x: r.from.x + r.from.w, y: r.from.y + r.from.h / 2 };
    const t = { x: r.to.x, y: r.to.y + r.to.h / 2 };
    for (const u of CHIP_TS) {
      const p = bezierPoint(s, t, u);
      const box = { x: p.x - w / 2, y: p.y - h / 2, w, h };
      if (obstacles.some((o) => hit(box, o, CHIP_MARGIN)) || placed.some((o) => hit(box, o, CHIP_MARGIN))) continue;
      placed.push(box);
      out.set(r.id, { x: Math.round(p.x), y: Math.round(p.y) });
      break;
    }
  }
  return out;
}
