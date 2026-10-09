/**
 * Markdown renderer (ip-routes-and-views §3.7): react-markdown + remark-gfm + rehype-slug, no
 * rehype-raw. Raw HTML in the source is shown as literal text (never parsed or executed; decided
 * 2026-10-09, IP-6). Relative links go to /wiki/<resolved path> (anchors kept), https links get
 * rel="noreferrer noopener" and an external-link icon, links to missing files are red with the title
 * "missing (REF-DANGLING)". Fenced `mermaid` blocks render through <Mermaid>. Integrity tags become
 * amber chips linking to their phase, and `> **CONTRADICTION:**` blockquotes get a red border.
 * Heading levels are shifted down by one, so the page shell's title stays the only h1; rehype-slug
 * anchors depend on the text only and are unchanged.
 */
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { rewriteHref } from "@/lib/wiki/mdlinks";
import Mermaid from "./Mermaid";

// Minimal hast shapes (the plugins below only need these fields).
interface HText {
  type: "text";
  value: string;
}
interface HElement {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HNode[];
}
interface HRoot {
  type: "root";
  children: HNode[];
}
type HNode = HText | HElement | HRoot | { type: "raw"; value: string } | { type: "comment"; value: string } | { type: "doctype" };

export function hastText(n: HNode | undefined): string {
  if (!n) return "";
  if (n.type === "text") return n.value;
  if (n.type === "element" || n.type === "root") return n.children.map(hastText).join("");
  return "";
}

/** Raw HTML nodes become literal text (no rehype-raw: nothing is parsed or executed). */
export function rehypeRawAsText() {
  return (tree: HRoot) => {
    const walk = (parent: HElement | HRoot) => {
      parent.children = parent.children.map((c) => (c.type === "raw" ? ({ type: "text", value: c.value } as HText) : c));
      for (const c of parent.children) if (c.type === "element") walk(c);
    };
    walk(tree);
  };
}

const TAG_RE = /UNVERIFIED\[(phase-p[0-8]-[a-z0-9-]+)\]/g;

/** Splits text nodes (outside <pre>) around integrity tags into <mark data-phase> elements. */
export function rehypeIntegrityTags() {
  return (tree: HRoot) => {
    const walk = (parent: HElement | HRoot) => {
      const out: HNode[] = [];
      for (const c of parent.children) {
        if (c.type === "element") {
          if (c.tagName !== "pre") walk(c);
          out.push(c);
          continue;
        }
        if (c.type !== "text" || !c.value.includes("UNVERIFIED[")) {
          out.push(c);
          continue;
        }
        let last = 0;
        for (const m of c.value.matchAll(TAG_RE)) {
          const at = m.index ?? 0;
          if (at > last) out.push({ type: "text", value: c.value.slice(last, at) });
          out.push({
            type: "element",
            tagName: "mark",
            properties: { className: ["int-tag"], dataPhase: m[1] },
            children: [{ type: "text", value: m[0] }],
          });
          last = at + m[0].length;
        }
        if (last < c.value.length) out.push({ type: "text", value: c.value.slice(last) });
      }
      parent.children = out;
    };
    walk(tree);
  };
}

export interface MarkdownProps {
  source: string;
  /** Wiki-relative path of the page (link resolution base). */
  path: string;
  /** Does a wiki-relative path exist (directories end with `/`)? */
  exists: (wikiPath: string) => boolean;
  /** Page ids, for wiring mermaid nodes to pages (SCHEMA §14). */
  knownIds?: ReadonlySet<string>;
}

const MERMAID_TOKEN = /\b[A-Za-z][A-Za-z0-9_]*\b/g;

/** Mermaid node ids in a source that name a known page (`comp_app_shell` -> `comp-app-shell`). */
export function mermaidNodeLinks(source: string, knownIds?: ReadonlySet<string>): Record<string, string> | undefined {
  if (!knownIds) return undefined;
  const out: Record<string, string> = {};
  for (const m of source.matchAll(MERMAID_TOKEN)) {
    const id = m[0].replace(/_/g, "-");
    if (knownIds.has(id)) out[m[0]] = id;
  }
  return Object.keys(out).length ? out : undefined;
}

type HProps = ComponentPropsWithoutRef<"h1"> & { node?: unknown };

function heading(level: number) {
  const Tag = `h${Math.min(6, level + 1)}` as "h2";
  function MdHeading({ node: _node, children, id, ...rest }: HProps) {
    void _node;
    return (
      <Tag id={id} className={`md-h md-h${level}`} {...rest}>
        {children}
        {id ? (
          <a className="md-anchor" href={`#${id}`} aria-label="Link to this section">
            #
          </a>
        ) : null}
      </Tag>
    );
  }
  return MdHeading;
}

function ExternalIcon() {
  return (
    <svg className="ext-icon" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
      <path d="M4.5 2.5h-2v7h7v-2M7 2.5h2.5V5M9.5 2.5 5.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export default function Markdown({ source, path, exists, knownIds }: MarkdownProps) {
  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a({ href, children, title, node: _node, ...rest }) {
      void _node;
      void rest;
      const r = rewriteHref(path, href ?? "", exists);
      switch (r.kind) {
        case "anchor":
        case "internal":
          return (
            <a href={r.href!} title={title ?? r.title}>
              {children}
            </a>
          );
        case "external":
          return (
            <a href={r.href!} title={title ?? undefined} rel="noreferrer noopener" target="_blank" className="ext-link">
              {children}
              <ExternalIcon />
              <span className="sr-only"> (external link)</span>
            </a>
          );
        case "missing":
          return (
            <a href={r.href!} className="link-missing" title={r.title} data-missing="true">
              {children}
            </a>
          );
        case "outside":
          return (
            <span className="link-outside" title={r.title}>
              {children}
            </span>
          );
        default:
          return (
            <span className="link-unsafe" title={r.title}>
              {children}
            </span>
          );
      }
    },
    img({ alt }) {
      // Images are not served (no external requests, no file route): show the alt text.
      return <span className="md-img-placeholder">[image: {alt || "no description"}]</span>;
    },
    table({ children, node: _node, ...rest }) {
      void _node;
      return (
        <div className="table-wrap">
          <table {...rest}>{children}</table>
        </div>
      );
    },
    pre({ children, node, ...rest }) {
      const n = node as HElement | undefined;
      const code = n?.children.find((c): c is HElement => c.type === "element" && c.tagName === "code");
      const cls = code?.properties?.className;
      const classes = Array.isArray(cls) ? cls.map(String) : typeof cls === "string" ? cls.split(" ") : [];
      if (code && classes.includes("language-mermaid")) {
        const src = hastText(code).replace(/\n$/, "");
        return <Mermaid source={src} nodeLinks={mermaidNodeLinks(src, knownIds)} />;
      }
      return <pre {...rest}>{children}</pre>;
    },
    blockquote({ children, node, ...rest }) {
      const text = hastText(node as HElement | undefined).trimStart();
      const contradiction = text.startsWith("CONTRADICTION:");
      return (
        <blockquote {...rest} className={contradiction ? "contradiction" : undefined}>
          {children}
        </blockquote>
      );
    },
    mark({ children, node, ...rest }) {
      const n = node as HElement | undefined;
      const phase = n?.properties?.dataPhase;
      if (typeof phase === "string") {
        return (
          <a className="chip chip-amber int-chip" href={`/go/${encodeURIComponent(phase)}`} title={`Unverified claim, to be verified in ${phase}`}>
            {children as ReactNode}
          </a>
        );
      }
      return <mark {...rest}>{children}</mark>;
    },
  };
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRawAsText, rehypeSlug, rehypeIntegrityTags]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
