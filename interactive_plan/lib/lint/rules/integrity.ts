/**
 * Integrity rules (ip-wiki-lint §2, §2.1; SCHEMA §7, §14): UNV-NOPHASE, UNV-PASTDUE, UNV-MIRROR,
 * INT-NUMBER-NOSRC, CONTRADICTION, MERMAID-RULES and the SCHEMA-SPLIT reminder.
 */
import { finding, type LintFinding } from "../../wiki/findings";
import { contradictions } from "../../wiki/gates";
import { blankFencedCode, stripInlineCode } from "../../wiki/links";
import type { WikiIndex, WikiPage } from "../../wiki/load";
import type { Rule } from "../types";
import { fmObj, paragraphs, phasePages } from "../util";

/** Pages whose bodies the integrity rules read: wiki pages and STATUS.md (raw/ is exempt, SCHEMA §7.1). */
const bodyPages = (idx: WikiIndex) => idx.pages.filter((p) => p.kind === "wiki" || p.kind === "status");
/**
 * Pages whose tags are obligations (UNV-PASTDUE, UNV-MIRROR): log.md is append-only (SCHEMA §12), so the
 * tags its entries quote are history that can never be edited (decided 2026-10-09, IP-5).
 */
const tagPages = (idx: WikiIndex) => bodyPages(idx).filter((p) => p.path !== "log.md");

/** The tag keyword not immediately followed by a bracketed phase id that matches the §7.1 regex. */
const BARE_TAG = /UNVERIFIED(?!\[phase-p[0-8]-[a-z0-9-]+\])/g;

/** 0-based body line range [start, end) of the SCHEMA.md `## 7.` section (its rule text is exempt). */
function schemaSection7(p: WikiPage): [number, number] | null {
  if (p.path !== "SCHEMA.md") return null;
  const lines = p.body.split("\n");
  const start = lines.findIndex((l) => /^## 7\. /.test(l));
  if (start < 0) return null;
  const next = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return [start, next < 0 ? lines.length : next];
}

export const unvNoPhase: Rule = {
  code: "UNV-NOPHASE",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of bodyPages(idx)) {
      const exempt = schemaSection7(p);
      const lines = blankFencedCode(p.body).split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (exempt && i >= exempt[0] && i < exempt[1]) continue;
        // Inline code spans are quotations of the syntax, not tags (same as extractUnverifiedTags and tools/quick_lint.py).
        const line = stripInlineCode(lines[i]);
        for (const m of line.matchAll(BARE_TAG)) {
          const ctx = line.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 40).trim();
          out.push(
            finding("UNV-NOPHASE", p.repoPath, `integrity tag without a valid [phase-pN-…] suffix: …${ctx}…`, {
              id: p.id ?? undefined,
              line: p.bodyStartLine + i,
            }),
          );
        }
      }
    }
    return out;
  },
};

/** verify_in phases of a page's frontmatter `unverified` list. */
function fmUnverified(p: WikiPage): string[] {
  const u = fmObj(p).unverified;
  if (!Array.isArray(u)) return [];
  return u
    .map((x) => (x !== null && typeof x === "object" ? (x as Record<string, unknown>).verify_in : undefined))
    .filter((x): x is string => typeof x === "string");
}

export const unvPastDue: Rule = {
  code: "UNV-PASTDUE",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    const phases = new Map(phasePages(idx).map((p) => [p.fm.id, p.fm] as const));
    const current = idx.status ? phases.get(idx.status.current_phase) : undefined;
    const why = (ph: string): string | null => {
      const fm = phases.get(ph);
      if (!fm) return null; // unknown phase: REF-DANGLING
      if (fm.status === "done") return `${ph} has status done`;
      if (current && fm.order < current.order) return `${ph} (order ${fm.order}) is before the current phase ${current.id} (order ${current.order})`;
      return null;
    };
    for (const p of tagPages(idx)) {
      for (const t of p.unverifiedTags) {
        const w = why(t.phase);
        if (w) out.push(finding("UNV-PASTDUE", p.repoPath, `inline tag names ${t.phase}: ${w}`, { id: p.id ?? undefined, line: t.line }));
      }
      for (const ph of fmUnverified(p)) {
        const w = why(ph);
        if (w) out.push(finding("UNV-PASTDUE", p.repoPath, `unverified[].verify_in ${ph}: ${w}`, { id: p.id ?? undefined }));
      }
    }
    return out;
  },
};

export const unvMirror: Rule = {
  code: "UNV-MIRROR",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of tagPages(idx)) {
      if (p.id === null) continue;
      const inline = new Set(p.unverifiedTags.map((t) => t.phase));
      const listed = new Set(fmUnverified(p));
      const onlyInline = [...inline].filter((x) => !listed.has(x)).sort();
      const onlyListed = [...listed].filter((x) => !inline.has(x)).sort();
      if (onlyInline.length + onlyListed.length === 0) continue;
      const parts = [];
      if (onlyInline.length) parts.push(`inline tags name ${onlyInline.join(", ")} but the frontmatter unverified list does not`);
      if (onlyListed.length) parts.push(`the frontmatter unverified list names ${onlyListed.join(", ")} but no inline tag does`);
      out.push(finding("UNV-MIRROR", p.repoPath, parts.join("; ") + " (SCHEMA §7.1)", { id: p.id }));
    }
    return out;
  },
};

const NUMBER_TYPES = new Set(["experiment", "metric", "hypothesis", "overview"]);
/** A number followed by one of the ip-wiki-lint §2 units. */
export const NUMBER_UNIT = /(?<![\w.])\d+(?:[.,]\d+)?\s?(?:%|(?:ms|s|MB|MiB|GB|GiB|KB|KiB|J|mJ|W|fps)\b)/;

export const intNumberNoSrc: Rule = {
  code: "INT-NUMBER-NOSRC",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of idx.pages) {
      if (p.kind !== "wiki" || !p.fm || !NUMBER_TYPES.has(p.fm.type)) continue;
      const blanked = blankFencedCode(p.body);
      for (const para of paragraphs(blanked, p.bodyStartLine)) {
        const lineCount = para.text.split("\n").length;
        const text = para.text.split("\n").map(stripInlineCode).join("\n");
        const m = NUMBER_UNIT.exec(text);
        if (!m) continue;
        const sourced = p.links.some(
          (l) =>
            l.line >= para.line &&
            l.line < para.line + lineCount &&
            l.resolvedPath !== null &&
            (l.resolvedPath.startsWith("raw/bench/") || l.resolvedPath.startsWith("raw/evidence/")),
        );
        if (!sourced) {
          out.push(
            finding("INT-NUMBER-NOSRC", p.repoPath, `"${m[0]}" with no raw/bench/ or raw/evidence/ link in the same paragraph (heuristic; needs a disposition)`, {
              id: p.id ?? undefined,
              line: para.line,
            }),
          );
        }
      }
    }
    return out;
  },
};

export const contradiction: Rule = {
  code: "CONTRADICTION",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of bodyPages(idx)) {
      for (const c of contradictions(p)) {
        const reg = c.questions.length ? ` (registered as ${c.questions.join(", ")})` : " (names no Q-NNN: blocks the entry gate of a phase whose dependency set holds this page)";
        out.push(finding("CONTRADICTION", p.repoPath, `open CONTRADICTION blockquote${reg}`, { id: p.id ?? undefined, line: c.line }));
      }
    }
    // The semantic pass stays an LLM task (SCHEMA §9.3): the report always reminds the session.
    out.push(
      finding("CONTRADICTION", "wiki/", "reminder: also do the semantic contradiction pass (claims that disagree between pages, with an accepted ADR or a raw source)", {
        severity: "info",
      }),
    );
    return out;
  },
};

interface MermaidBlock {
  line: number;
  lines: string[];
}

/** ```mermaid / ~~~mermaid fenced blocks of a body, with the 1-based file line of the opening fence. */
export function mermaidBlocks(body: string, bodyStartLine: number): MermaidBlock[] {
  const out: MermaidBlock[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(lines[i]);
    if (!open) continue;
    const fence = open[1];
    let j = i + 1;
    while (j < lines.length) {
      const c = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(lines[j]);
      if (c && c[1][0] === fence[0] && c[1].length >= fence.length) break;
      j++;
    }
    if (open[2] === "mermaid") out.push({ line: bodyStartLine + i, lines: lines.slice(i + 1, j) });
    i = j;
  }
  return out;
}

const FLOW_KEYWORDS = new Set(["flowchart", "graph", "subgraph", "end", "direction", "classDef", "class", "style", "linkStyle", "click", "TB", "TD", "BT", "LR", "RL"]);
const STATE_KEYWORDS = new Set(["stateDiagram", "stateDiagram-v2", "state", "direction", "note", "end", "classDef", "class", "as", "TB", "LR"]);

/** Heuristic node count of a flowchart/graph or stateDiagram block (null for other diagram kinds). */
export function mermaidNodeCount(lines: string[]): number | null {
  const headAt = lines.findIndex((l) => l.trim() !== "" && !l.trim().startsWith("%%"));
  const head = headAt < 0 ? "" : lines[headAt].trim();
  const kind = /^(flowchart|graph)\b/.test(head) ? "flow" : /^stateDiagram/.test(head) ? "state" : null;
  if (!kind) return null;
  const nodes = new Set<string>();
  for (const raw of lines.slice(headAt + 1)) {
    let l = raw.trim();
    if (l === "" || l.startsWith("%%")) continue;
    if (kind === "flow" && /^(subgraph|classDef|class|style|linkStyle|click|direction|end)\b/.test(l)) {
      // a subgraph title is not a node
      continue;
    }
    if (kind === "state") {
      if (/^(note|classDef|class|direction)\b/.test(l)) continue;
      // `A --> B: label` / `A --> B : label`: the transition label starts at the first colon.
      l = l.replace(/:.*$/, "").replace(/\[\*\]/g, " ");
    }
    // Remove labels and shapes: ["..."], (...), {...}, |...|, "..." and :::class suffixes.
    let prev = "";
    while (prev !== l) {
      prev = l;
      l = l.replace(/"[^"]*"|\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|\|[^|]*\||:::[A-Za-z0-9_-]+/g, " ");
    }
    // Inline edge text `-- text -->` / `-. text .->`: drop the words between the two arrow halves.
    l = l.replace(/(--|-\.|==)\s[^->=]*?\s(-->|\.->|==>|---|--x|--o)/g, " $2 ");
    for (const m of l.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      const t = m[0];
      if ((kind === "flow" ? FLOW_KEYWORDS : STATE_KEYWORDS).has(t)) continue;
      nodes.add(t);
    }
  }
  return nodes.size;
}

export const MERMAID_MAX_NODES = 30;
export const HTML_TAG = /(?<!<)<\/?[A-Za-z][A-Za-z0-9]*(\s[^<>]*)?\/?>(?!>)/;

export const mermaidRules: Rule = {
  code: "MERMAID-RULES",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    for (const p of bodyPages(idx)) {
      for (const b of mermaidBlocks(p.body, p.bodyStartLine)) {
        const problems: string[] = [];
        b.lines.forEach((l, k) => {
          if (/^\s*click\s/.test(l)) problems.push(`click directive (line ${b.line + 1 + k})`);
          if (/%%\{\s*init/.test(l)) problems.push(`%%{init}%% override (line ${b.line + 1 + k})`);
          // HTML tags such as <br>, <b>, <i/>; not classDiagram annotations like <<trait>>.
          if (HTML_TAG.test(l)) problems.push(`HTML in a label (line ${b.line + 1 + k})`);
        });
        const n = mermaidNodeCount(b.lines);
        if (n !== null && n > MERMAID_MAX_NODES) problems.push(`about ${n} nodes (more than ${MERMAID_MAX_NODES}; split it)`);
        if (problems.length > 0) {
          out.push(finding("MERMAID-RULES", p.repoPath, `mermaid block: ${problems.join("; ")} (SCHEMA §14)`, { id: p.id ?? undefined, line: b.line }));
        }
      }
    }
    return out;
  },
};

export const schemaSplit: Rule = {
  code: "SCHEMA-SPLIT",
  severity: "info",
  run: () => [
    finding("SCHEMA-SPLIT", "CLAUDE.md", "compare CLAUDE.md rules with SCHEMA.md (manual; not mechanically checkable, SCHEMA §9.3, §9.6)"),
  ],
};
