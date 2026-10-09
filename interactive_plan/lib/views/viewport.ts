/**
 * Initial graph viewport (IP-9 review). Dependency-free on purpose: the client FlowGraph imports it,
 * and lib/views/graphLayout.ts pulls server-only modules.
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Initial viewport of a graph (IP-9 review): fit the boxes into the canvas (never above 1), but never
 * below `minZoom`. An axis that fits is centred; an axis that does not starts at its top-left corner
 * (plus `pad`), so the reading order starts on screen and the rest is reached by panning.
 */
export function initialViewport(
  boxes: readonly { x: number; y: number; w: number; h: number }[],
  canvas: { w: number; h: number },
  opts: { minZoom: number; maxZoom?: number; pad?: number },
): Viewport {
  const pad = opts.pad ?? 16;
  if (boxes.length === 0 || canvas.w <= 0 || canvas.h <= 0) return { x: pad, y: pad, zoom: 1 };
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const bw = Math.max(1, Math.max(...boxes.map((b) => b.x + b.w)) - minX);
  const bh = Math.max(1, Math.max(...boxes.map((b) => b.y + b.h)) - minY);
  const fit = Math.min((canvas.w - 2 * pad) / bw, (canvas.h - 2 * pad) / bh, opts.maxZoom ?? 1);
  const zoom = Math.max(opts.minZoom, fit);
  const axis = (size: number, extent: number, min: number) =>
    extent * zoom <= size - 2 * pad ? (size - extent * zoom) / 2 - min * zoom : pad - min * zoom;
  return { x: axis(canvas.w, bw, minX), y: axis(canvas.h, bh, minY), zoom };
}

