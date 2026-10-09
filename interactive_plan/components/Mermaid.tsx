"use client";
/**
 * Mermaid diagram (ip-routes-and-views §3.7). mermaid is imported dynamically in an effect (IP-1
 * spike S2), configured with securityLevel 'strict', layout 'dagre', look 'classic' and the theme of
 * the app (re-rendered when the theme changes). A render error shows the source and the message and
 * never breaks the page. Node ids that name a page (SCHEMA §14, `-` -> `_`) are wired to that page
 * after render: focusable, a tooltip, click/Enter opens /go/<id>. No `click` directives are used.
 *
 * IP-9 review fixes: mermaid's strict sanitiser keeps `<img src>` in HTML labels, so the SVG is
 * passed through stripExternalResources() before insertion (no request to another host; the CSP
 * `img-src 'self' data:` blocks it as well). Wide diagrams keep at least MIN_SCALE of their native
 * size and scroll horizontally inside the holder instead of shrinking to unreadable text.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useEffectiveTheme } from "./theme";

export interface MermaidProps {
  source: string;
  /** Mermaid node id -> page id, for nodes that name a page. */
  nodeLinks?: Record<string, string>;
}

let renderSeq = 0;

/** Smallest render scale (rendered width / viewBox width) before the holder scrolls instead. */
export const MIN_SCALE = 0.8;

const SAFE_URL = /^(data:image\/|#)/i;

/**
 * Removes every `<img>` and SVG `<image>` whose source is not a `data:` image or a fragment, and
 * every `src`/`href`/`xlink:href`/`srcset` attribute on other elements that points anywhere but a
 * fragment (`#…`). Parsed in an inert `<template>`, so nothing loads while sanitising.
 */
export function stripExternalResources(svg: string): string {
  const t = document.createElement("template");
  t.innerHTML = svg;
  const root = t.content;
  root.querySelectorAll("img, image").forEach((el) => {
    const src = el.getAttribute("src") ?? el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "";
    if (!SAFE_URL.test(src.trim()) || el.hasAttribute("srcset")) el.remove();
  });
  root.querySelectorAll("*").forEach((el) => {
    for (const name of ["src", "srcset", "href", "xlink:href", "background", "poster"]) {
      const v = el.getAttribute(name);
      if (v !== null && !v.trim().startsWith("#")) el.removeAttribute(name);
    }
    const style = el.getAttribute("style");
    if (style && /url\(\s*['"]?(?!#)/i.test(style)) el.setAttribute("style", style.replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none"));
  });
  return t.innerHTML;
}

/** Keeps a rendered SVG at no less than MIN_SCALE of its viewBox width (the holder scrolls). */
export function applyMinScale(svgEl: SVGSVGElement): void {
  const vb = svgEl.getAttribute("viewBox");
  const w = vb ? Number(vb.trim().split(/[\s,]+/)[2]) : NaN;
  if (Number.isFinite(w) && w > 0) svgEl.style.minWidth = `${Math.round(w * MIN_SCALE)}px`;
}

/** Mermaid node id of a rendered node group (`data-id`, else `…flowchart-<id>-<n>`). */
export function nodeIdOf(el: Element): string | null {
  const data = el.getAttribute("data-id");
  if (data) return data;
  // mermaid 12.1.0 flowcharts: `<render id>-flowchart-<node id>-<n>` (seen in the IP-6 E2E run).
  const m = /(?:^|-)flowchart-([A-Za-z0-9_]+)-\d+$/.exec(el.id);
  return m ? m[1] : null;
}

export default function Mermaid({ source, nodeLinks }: MermaidProps) {
  const theme = useEffectiveTheme();
  const router = useRouter();
  const [result, setResult] = useState<{ svg: string | null; error: string | null; key: string } | null>(null);
  const [showSource, setShowSource] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const baseId = "mmd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const key = theme + "\u0000" + source;

  useEffect(() => {
    let cancelled = false;
    const renderId = `${baseId}-${++renderSeq}`;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          layout: "dagre",
          look: "classic",
          theme: theme === "dark" ? "dark" : "default",
        });
        const { svg } = await mermaid.render(renderId, source);
        if (!cancelled) setResult({ svg: stripExternalResources(svg), error: null, key });
      } catch (e) {
        // mermaid may leave its temporary render container behind on a parse error.
        document.getElementById("d" + renderId)?.remove();
        document.getElementById(renderId)?.remove();
        if (!cancelled) setResult({ svg: null, error: e instanceof Error ? e.message : String(e), key });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseId, key, source, theme]);

  const svg = result?.svg ?? null;
  const error = result?.error ?? null;
  const stale = result !== null && result.key !== key;

  useEffect(() => {
    const el = holder.current?.querySelector("svg");
    if (el) applyMinScale(el);
  }, [svg]);

  useEffect(() => {
    const root = holder.current;
    if (!root || !svg || !nodeLinks) return;
    const cleanups: (() => void)[] = [];
    root.querySelectorAll("g.node").forEach((g) => {
      const nid = nodeIdOf(g);
      const pageId = nid ? nodeLinks[nid] : undefined;
      if (!pageId) return;
      const href = "/go/" + encodeURIComponent(pageId);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "link");
      g.setAttribute("aria-label", `Open ${pageId}`);
      g.classList.add("mmd-link");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${pageId} – open page`;
      g.insertBefore(title, g.firstChild);
      const go = () => router.push(href);
      const onKey = (ev: Event) => {
        const k = (ev as KeyboardEvent).key;
        if (k === "Enter" || k === " ") {
          ev.preventDefault();
          go();
        }
      };
      g.addEventListener("click", go);
      g.addEventListener("keydown", onKey);
      cleanups.push(() => {
        g.removeEventListener("click", go);
        g.removeEventListener("keydown", onKey);
      });
    });
    return () => cleanups.forEach((c) => c());
  }, [svg, nodeLinks, router]);

  return (
    <figure className="mermaid-figure" data-state={error ? "error" : svg ? "rendered" : "loading"}>
      {error ? (
        <div className="mermaid-error">
          <p className="mermaid-error-title">
            <strong>Diagram could not be rendered.</strong> The source is shown below.
          </p>
          <p className="mermaid-error-message">
            <code>{error}</code>
          </p>
          <pre className="mermaid-source">
            <code>{source}</code>
          </pre>
        </div>
      ) : svg ? (
        <div
          ref={holder}
          className="mermaid-svg"
          aria-busy={stale}
          // mermaid output, sanitised by mermaid (securityLevel 'strict') and stripExternalResources().
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="mermaid-loading" aria-busy="true">
          Rendering diagram…
        </div>
      )}
      {!error && (
        <figcaption className="mermaid-caption">
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showSource} onClick={() => setShowSource((v) => !v)}>
            {showSource ? "Hide source" : "Show source"}
          </button>
        </figcaption>
      )}
      {!error && showSource && (
        <pre className="mermaid-source">
          <code>{source}</code>
        </pre>
      )}
    </figure>
  );
}
