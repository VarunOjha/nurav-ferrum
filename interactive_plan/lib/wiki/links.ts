/**
 * Body links, headings, integrity tags and frontmatter id references (ip-data-contract §2, §4.2;
 * ip-wiki-lint §2 REF-DANGLING). Pure functions over strings; existence checks take a callback.
 */
import path from "node:path";
import GithubSlugger from "github-slugger";
import { finding, type LintFinding } from "./findings";

export interface Heading {
  depth: number;
  text: string;
  slug: string;
  line: number;
}

export interface BodyLink {
  href: string;
  /** Target path relative to the wiki dir (posix, may start with `../` for repo files); null for external/anchor-only links. */
  resolvedPath: string | null;
  anchor: string | null;
  line: number;
}

/**
 * Replaces fenced code blocks (``` or ~~~, CommonMark rules: closing fence uses the same char and
 * is at least as long) with empty lines, keeping line numbers stable.
 */
export function blankFencedCode(body: string): string {
  const lines = body.split("\n");
  let fence: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (fence) {
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && m[2].trim() === "") fence = null;
      lines[i] = "";
    } else if (m && !(m[1][0] === "`" && m[2].includes("`"))) {
      fence = { ch: m[1][0], len: m[1].length };
      lines[i] = "";
    }
  }
  return lines.join("\n");
}

/** Removes inline code spans (same-length backtick runs) from one line. */
export function stripInlineCode(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] !== "`") {
      out += line[i++];
      continue;
    }
    let n = 0;
    while (line[i + n] === "`") n++;
    // find a closing run of exactly n backticks
    let j = i + n;
    let close = -1;
    while (j < line.length) {
      if (line[j] === "`") {
        let m = 0;
        while (line[j + m] === "`") m++;
        if (m === n) {
          close = j;
          break;
        }
        j += m;
      } else j++;
    }
    if (close < 0) {
      out += line.slice(i, i + n);
      i += n;
    } else {
      out += " ".repeat(close + n - i);
      i = close + n;
    }
  }
  return out;
}

/**
 * Plain text of an ATX heading as rehype would see it after rendering: code spans keep their
 * content, link/image syntax keeps the text/alt, emphasis markers, HTML tags and backslash escapes
 * are removed.
 */
export function headingPlainText(md: string): string {
  // Backslash-escaped punctuation becomes a private-use placeholder so emphasis stripping ignores it.
  const PUA = 0xe000;
  const parts = md
    .replace(/\\([!-/:-@[-`{-~])/g, (_m, c: string) => String.fromCharCode(PUA + c.charCodeAt(0)))
    .split(/(`+[^`]*?`+)/);
  const restore = (s: string) => s.replace(/[\ue000-\ue07f]/g, (c) => String.fromCharCode(c.charCodeAt(0) - PUA));
  return parts
    .map((p) => {
      const code = /^(`+)([^`]*?)\1$/.exec(p);
      if (code) return code[2].replace(/^ (.*) $/, "$1");
      return p
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
        .replace(/<(https?:[^>]+)>/g, "$1")
        .replace(/<\/?[A-Za-z][^>]*>/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/(^|[^\w])__([^_]+)__(?=[^\w]|$)/g, "$1$2")
        .replace(/\*([^*\s][^*]*)\*/g, "$1")
        .replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, "$1$2")
        .replace(/~~([^~]+)~~/g, "$1");
    })
    .map(restore)
    .join("");
}

/** ATX headings outside fenced code, with rehype-slug (github-slugger) slugs in document order. */
export function extractHeadings(body: string, bodyStartLine = 1): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  const lines = blankFencedCode(body).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/.exec(lines[i]);
    if (!m) continue;
    const text = headingPlainText((m[2] ?? "").trim()).trim();
    out.push({ depth: m[1].length, text, slug: slugger.slug(text), line: bodyStartLine + i });
  }
  return out;
}

const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

function splitHref(raw: string): { target: string; anchor: string | null } {
  const hash = raw.indexOf("#");
  const target = hash >= 0 ? raw.slice(0, hash) : raw;
  const anchor = hash >= 0 ? raw.slice(hash + 1) : null;
  let t = target;
  try {
    t = decodeURIComponent(target);
  } catch {
    /* keep undecoded */
  }
  let a = anchor;
  if (a !== null) {
    try {
      a = decodeURIComponent(a);
    } catch {
      /* keep undecoded */
    }
  }
  return { target: t, anchor: a };
}

/**
 * Resolves a relative href found in `fromFile` (path relative to the wiki dir, posix) to a path
 * relative to the wiki dir. External links (any scheme) resolve to null.
 */
export function resolveHref(fromFile: string, href: string): { resolvedPath: string | null; anchor: string | null } {
  if (EXTERNAL.test(href)) return { resolvedPath: null, anchor: null };
  const { target, anchor } = splitHref(href);
  if (target === "") return { resolvedPath: fromFile, anchor };
  const dir = path.posix.dirname(fromFile);
  let resolved = path.posix.normalize(path.posix.join(dir, target));
  if (target.endsWith("/") && !resolved.endsWith("/")) resolved += "/";
  return { resolvedPath: resolved, anchor };
}

/**
 * Inline links/images `[t](href)` / `![a](href)` and reference definitions `[x]: href`, outside
 * fenced code and inline code. `fromFile` is the page path relative to the wiki dir.
 */
export function extractLinks(body: string, fromFile: string, bodyStartLine = 1): BodyLink[] {
  const out: BodyLink[] = [];
  const lines = blankFencedCode(body).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = stripInlineCode(lines[i]);
    const hrefs: string[] = [];
    const inline = /\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
    for (let m = inline.exec(line); m; m = inline.exec(line)) hrefs.push(m[1]);
    const def = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/.exec(line);
    if (def) hrefs.push(def[1]);
    for (let h of hrefs) {
      if (h.startsWith("<") && h.endsWith(">")) h = h.slice(1, -1);
      const { resolvedPath, anchor } = resolveHref(fromFile, h);
      out.push({ href: h, resolvedPath, anchor, line: bodyStartLine + i });
    }
  }
  return out;
}

export interface LinkTargetInfo {
  /** Does the path (relative to the wiki dir; trailing `/` = directory) exist? */
  exists(resolvedPath: string): boolean;
  /** Heading slugs of a markdown target, or null when unknown (not loaded, not markdown). */
  slugs(resolvedPath: string): ReadonlySet<string> | null;
}

/** REF-DANGLING findings for relative body links to missing files or missing heading anchors. */
export function checkLinks(links: readonly BodyLink[], repoPath: string, info: LinkTargetInfo, id?: string): LintFinding[] {
  const out: LintFinding[] = [];
  for (const l of links) {
    if (l.resolvedPath === null) continue;
    if (!info.exists(l.resolvedPath)) {
      out.push(finding("REF-DANGLING", repoPath, `body link ${l.href} points to a missing file`, { id, line: l.line }));
      continue;
    }
    if (l.anchor) {
      const slugs = info.slugs(l.resolvedPath);
      if (slugs && !slugs.has(l.anchor)) {
        out.push(
          finding("REF-DANGLING", repoPath, `body link ${l.href}: no heading with anchor #${l.anchor}`, {
            id,
            line: l.line,
          }),
        );
      }
    }
  }
  return out;
}

/** ip-data-contract §4.2 id-reference fields. */
export const REF_FIELDS = [
  "related",
  "depends_on",
  "risks",
  "decisions",
  "experiments",
  "components",
  "rq",
  "hypotheses",
  "metrics",
  "workloads",
  "supersedes",
  "superseded_by",
  "phase",
  "owner_phase",
  "phase_introduced",
  "last_handoff",
  "current_phase",
  "blocked_on",
] as const;
/** Fields that reference task ids (`pN.M`), resolved against all phase tasks. */
export const TASK_REF_FIELDS = ["spike", "current_task"] as const;

export interface FmRef {
  field: string;
  id: string;
}

/** Id references in (raw or typed) frontmatter, including `connects[].to`. */
export function frontmatterRefs(fm: unknown): FmRef[] {
  if (fm === null || typeof fm !== "object") return [];
  const o = fm as Record<string, unknown>;
  const out: FmRef[] = [];
  for (const f of REF_FIELDS) {
    const v = o[f];
    if (typeof v === "string") out.push({ field: f, id: v });
    else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") out.push({ field: f, id: x });
  }
  if (Array.isArray(o.connects)) {
    for (const e of o.connects) {
      const to = e !== null && typeof e === "object" ? (e as Record<string, unknown>).to : undefined;
      if (typeof to === "string") out.push({ field: "connects.to", id: to });
    }
  }
  return out;
}

export const UNVERIFIED_TAG = /UNVERIFIED\[(phase-p[0-8]-[a-z0-9-]+)\]/g;

/**
 * Inline UNVERIFIED[phase] tags outside fenced code, with file line numbers. A well-formed tag inside
 * an inline code span counts: SCHEMA §7.1 exempts only raw/, fenced code and its own rule text, and the
 * wiki writes real tags in backticks (decided 2026-10-09, IP-5; a skipped tag would escape UNV-PASTDUE).
 * Bare keywords inside inline code are quotations of the syntax and are not UNV-NOPHASE (lib/lint).
 */
export function extractUnverifiedTags(body: string, bodyStartLine = 1): { phase: string; line: number }[] {
  const out: { phase: string; line: number }[] = [];
  const lines = blankFencedCode(body).split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(UNVERIFIED_TAG)) out.push({ phase: m[1], line: bodyStartLine + i });
  }
  return out;
}
