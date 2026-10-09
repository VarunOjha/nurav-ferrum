"use client";
/**
 * Mermaid diagram (ip-routes-and-views §3.7). mermaid is imported dynamically in an effect (IP-1
 * spike S2), configured with securityLevel 'strict', layout 'dagre', look 'classic' and the theme of
 * the app (re-rendered when the theme changes). A render error shows the source and the message and
 * never breaks the page. Node ids that name a page (SCHEMA §14, `-` -> `_`) are wired to that page
 * after render: focusable, a tooltip, click/Enter opens /go/<id>. No `click` directives are used.
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
        if (!cancelled) setResult({ svg, error: null, key });
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
          // mermaid output, sanitised by mermaid itself under securityLevel 'strict'.
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
