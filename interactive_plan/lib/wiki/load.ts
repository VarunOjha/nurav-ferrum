/**
 * Wiki loader (ip-data-contract §2, §4.1). Reads wiki/ and STATUS.md with node:fs at call time
 * (never `import`ed), validates every page and builds the WikiIndex. Pure apart from fs; tests pass
 * fixture directories. No file failure stops loading: problems become findings on the page.
 */
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { PlanConfig } from "../config";
import { finding, type LintFinding } from "./findings";
import { parseFrontmatterBytes } from "./frontmatter";
import {
  extractHeadings,
  extractLinks,
  extractUnverifiedTags,
  frontmatterRefs,
  type BodyLink,
  type Heading,
  type LinkTargetInfo,
} from "./links";
import { parseLog, type LogEntry } from "./log";
import { parseOpenQuestions, type OpenQuestion } from "./openQuestions";
import { checkIdAndPath, validateFrontmatter, type Page, type StatusLive } from "./schemas";
import { nextActionSection } from "./status";

export type PageKind = "wiki" | "raw-research" | "raw" | "status";

export interface WikiPage {
  /** null if the frontmatter or its `id` is missing (raw files without frontmatter: always null). */
  id: string | null;
  /** Relative to the wiki dir, forward slashes (STATUS.md: `../STATUS.md` relative to the wiki dir). */
  path: string;
  /** `wiki/` + path, or `STATUS.md`. */
  repoPath: string;
  kind: PageKind;
  /** zod-parsed frontmatter, null on any validation failure. */
  fm: Page | null;
  /** Parsed YAML before zod, for display. */
  rawFm: unknown;
  body: string;
  /** 1-based file line of the first body line. */
  bodyStartLine: number;
  /** Filled by lib/approvals/hash.ts from IP-3 (ip-data-contract §6); null until then. */
  contentHash: string | null;
  scopeHash: string | null;
  headings: Heading[];
  links: BodyLink[];
  unverifiedTags: { phase: string; line: number }[];
  /** Parsing + validation findings, plus cross-page findings added by the loader (ID-DUP, LOG-FORMAT, Q-FORMAT). */
  findings: LintFinding[];
  mtimeMs: number;
  size: number;
}

export interface WikiIndex {
  pages: WikiPage[];
  byId: Map<string, WikiPage>;
  byPath: Map<string, WikiPage>;
  /** id -> paths (ID-DUP) for ids defined in more than one file. */
  duplicates: Map<string, string[]>;
  /** id -> ids referencing it (frontmatter refs + body links). */
  backlinks: Map<string, Set<string>>;
  /** Parsed STATUS.md frontmatter, null if the file is missing or invalid. */
  status: StatusLive | null;
  /** STATUS.md body section whose heading contains "Next action". */
  statusNextAction: string | null;
  log: LogEntry[];
  openQuestions: OpenQuestion[];
  /** Every file under the wiki dir (wiki-relative) and every directory (with a trailing `/`). */
  files: Set<string>;
  wikiDir: string;
}

export type LoadConfig = Pick<PlanConfig, "wikiDir" | "statusFile" | "repoRoot">;

type Parsed = Omit<WikiPage, "mtimeMs" | "size">;
const cache = new Map<string, { mtimeMs: number; size: number; parsed: Parsed }>();

/** Drops the in-memory parse cache (tests). */
export function clearWikiCache(): void {
  cache.clear();
}

const posix = (p: string) => p.split(path.sep).join("/");

function kindOf(wikiPath: string): PageKind {
  if (wikiPath.startsWith("raw/research/") && wikiPath.split("/").length === 3) return "raw-research";
  if (wikiPath.startsWith("raw/")) return "raw";
  return "wiki";
}

function parseFile(bytes: Buffer, wikiPath: string, repoPath: string, kind: PageKind, wikiDir: string): Parsed {
  const p = parseFrontmatterBytes(bytes, { repoPath, requireFrontmatter: kind !== "raw" });
  const findings = [...p.findings];
  let fm: Page | null = null;
  let id: string | null = null;
  if (kind !== "raw" && p.rawFm !== null) {
    const raw = p.rawFm as Record<string, unknown>;
    id = typeof raw.id === "string" ? raw.id : null;
    const v = validateFrontmatter(p.rawFm, repoPath);
    findings.push(...v.findings);
    fm = v.fm;
    if (v.type) findings.push(...checkIdAndPath(v.type, id ?? undefined, wikiPath, repoPath, kind === "status"));
  }
  const links = extractLinks(p.body, wikiPath, p.bodyStartLine).map((l) => ({
    ...l,
    resolvedPath: l.resolvedPath === null ? null : canonical(wikiDir, l.resolvedPath),
  }));
  return {
    id,
    path: wikiPath,
    repoPath,
    kind,
    fm,
    rawFm: p.rawFm,
    body: p.body,
    bodyStartLine: p.bodyStartLine,
    contentHash: null,
    scopeHash: null,
    headings: extractHeadings(p.body, p.bodyStartLine),
    links,
    unverifiedTags: kind === "wiki" || kind === "status" ? extractUnverifiedTags(p.body, p.bodyStartLine) : [],
    findings,
  };
}

/** Normalises a wiki-relative path through the real wiki dir (so `../wiki/x.md` becomes `x.md`). */
function canonical(wikiDir: string, rel: string): string {
  const trailing = rel.endsWith("/");
  let out = posix(path.relative(wikiDir, path.resolve(wikiDir, rel)));
  if (trailing && out !== "") out += "/";
  return out;
}

async function loadOne(abs: string, wikiPath: string, repoPath: string, kind: PageKind, wikiDir: string): Promise<WikiPage | null> {
  let st;
  try {
    st = await stat(abs);
  } catch {
    return null;
  }
  const hit = cache.get(abs);
  let parsed: Parsed;
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size && hit.parsed.path === wikiPath) {
    parsed = hit.parsed;
  } else {
    parsed = parseFile(await readFile(abs), wikiPath, repoPath, kind, wikiDir);
    cache.set(abs, { mtimeMs: st.mtimeMs, size: st.size, parsed });
  }
  // Fresh page object per load: cross-page findings must never leak into the cache.
  return { ...parsed, findings: [...parsed.findings], mtimeMs: st.mtimeMs, size: st.size };
}

export async function loadWiki(cfg: LoadConfig): Promise<WikiIndex> {
  const wikiDir = path.resolve(cfg.wikiDir);
  const entries = (await readdir(wikiDir, { recursive: true })).map(posix).sort();
  const files = new Set<string>();
  const mdFiles: string[] = [];
  await Promise.all(
    entries.map(async (rel) => {
      const s = await stat(path.join(wikiDir, rel)).catch(() => null);
      if (!s) return;
      if (s.isDirectory()) files.add(rel + "/");
      else {
        files.add(rel);
        if (rel.endsWith(".md")) mdFiles.push(rel);
      }
    }),
  );
  mdFiles.sort();
  const loaded = await Promise.all(
    mdFiles.map((rel) => loadOne(path.join(wikiDir, rel), rel, "wiki/" + rel, kindOf(rel), wikiDir)),
  );
  const pages = loaded.filter((p): p is WikiPage => p !== null);

  // STATUS.md (optional; a missing file is a dashboard warning, not a crash).
  const statusAbs = path.resolve(cfg.statusFile);
  const statusRel = canonical(wikiDir, posix(path.relative(wikiDir, statusAbs)));
  const statusRepo = posix(path.relative(path.resolve(cfg.repoRoot), statusAbs)) || "STATUS.md";
  const statusPage = existsSync(statusAbs) ? await loadOne(statusAbs, statusRel, statusRepo, "status", wikiDir) : null;
  if (statusPage) pages.push(statusPage);

  const byId = new Map<string, WikiPage>();
  const byPath = new Map<string, WikiPage>();
  const idPaths = new Map<string, string[]>();
  for (const p of pages) {
    byPath.set(p.path, p);
    if (p.id === null) continue;
    if (!byId.has(p.id)) byId.set(p.id, p);
    const list = idPaths.get(p.id) ?? [];
    list.push(p.repoPath);
    idPaths.set(p.id, list);
  }
  const duplicates = new Map<string, string[]>();
  for (const [id, paths] of idPaths) if (paths.length > 1) duplicates.set(id, paths);
  for (const p of pages) {
    if (p.id !== null && duplicates.has(p.id)) {
      const others = duplicates.get(p.id)!.filter((x) => x !== p.repoPath);
      p.findings.push(finding("ID-DUP", p.repoPath, `id ${p.id} is also defined in ${others.join(", ")}`, { id: p.id }));
    }
  }

  const backlinks = new Map<string, Set<string>>();
  const addBacklink = (target: string, source: string) => {
    if (target === source) return;
    let s = backlinks.get(target);
    if (!s) backlinks.set(target, (s = new Set()));
    s.add(source);
  };
  for (const p of pages) {
    if (p.id === null) continue;
    for (const r of frontmatterRefs(p.fm ?? p.rawFm)) addBacklink(r.id, p.id);
    for (const l of p.links) {
      if (l.resolvedPath === null) continue;
      const t = byPath.get(l.resolvedPath);
      if (t?.id) addBacklink(t.id, p.id);
    }
  }

  let log: LogEntry[] = [];
  const logPage = byPath.get("log.md");
  if (logPage) {
    const r = parseLog(logPage.body, logPage.repoPath, logPage.bodyStartLine);
    log = r.entries;
    logPage.findings.push(...r.findings);
  }
  let openQuestions: OpenQuestion[] = [];
  const oq = byId.get("ov-open-questions");
  if (oq) {
    const r = parseOpenQuestions(oq.body, oq.repoPath, oq.bodyStartLine);
    openQuestions = r.questions;
    oq.findings.push(...r.findings);
  }

  const statusFm = statusPage?.fm && statusPage.fm.type === "status" ? (statusPage.fm as StatusLive) : null;
  return {
    pages,
    byId,
    byPath,
    duplicates,
    backlinks,
    status: statusFm,
    statusNextAction: statusPage ? nextActionSection(statusPage.body) : null,
    log,
    openQuestions,
    files,
    wikiDir,
  };
}

/** Link-target lookups for links.checkLinks over a loaded index. */
export function linkTargetInfo(idx: WikiIndex): LinkTargetInfo {
  return {
    exists(rel) {
      if (rel.startsWith("../")) return existsSync(path.resolve(idx.wikiDir, rel));
      return rel === "" || idx.files.has(rel);
    },
    slugs(rel) {
      const p = idx.byPath.get(rel);
      return p ? new Set(p.headings.map((h) => h.slug)) : null;
    },
  };
}
