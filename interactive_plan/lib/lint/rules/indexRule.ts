/**
 * INDEX-MISSING (ip-wiki-lint §2; SCHEMA §11, adr-0020). Every page (except index.md itself and root
 * STATUS.md) has a line whose link resolves to it, with the page id as label and the page status;
 * raw files at the raw/ top level and under raw/owner/, raw/research/ and raw/assets/ are listed one per
 * file (label = basename without extension, research notes: their id; status `raw`); files under
 * raw/evidence/ and raw/bench/ are listed per first-level folder. Every index line matches the §11 regex
 * and points at an existing file or folder.
 */
import path from "node:path";
import { finding, type LintFinding } from "../../wiki/findings";
import { blankFencedCode, resolveHref } from "../../wiki/links";
import type { Rule } from "../types";
import { fmObj, isPage } from "../util";

/** SCHEMA §11 index line regex, verbatim. */
export const INDEX_LINE = /^- \[([a-z0-9.-]+)\]\(([^)]+)\) \| ([a-z-]+) \| (.+?) \| (.+)$/;

/** The raw/ subfolders whose files are listed per first-level folder (adr-0020). */
const FOLDER_LISTED = ["evidence", "bench"];

/** SCHEMA §11 label of a first-level evidence/bench folder (`evidence/phase-p0-planning` -> `evidence-phase-p0-planning`). */
export function folderLabel(relToRaw: string): string {
  return relToRaw
    .replace(/\/+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+$/, "");
}

/** Index label of a raw file without frontmatter id: its basename without the extension. */
export function rawFileLabel(rel: string): string {
  const base = path.posix.basename(rel);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/** The first-level evidence/bench folder (`raw/evidence/<x>/`) a raw path belongs to, `"direct"` for a file directly in raw/evidence/ or raw/bench/, or null. */
export function folderOf(rel: string): string | "direct" | null {
  const parts = rel.split("/");
  if (parts[0] !== "raw" || !FOLDER_LISTED.includes(parts[1] ?? "")) return null;
  if (parts.length < 4) return "direct";
  return parts.slice(0, 3).join("/") + "/";
}

export const indexMissing: Rule = {
  code: "INDEX-MISSING",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    const indexPage = idx.byPath.get("index.md");
    if (!indexPage) {
      return [finding("INDEX-MISSING", "wiki/index.md", "wiki/index.md does not exist (SCHEMA §11)")];
    }
    const at = indexPage.repoPath;
    const listed = new Set<string>();
    const lines = blankFencedCode(indexPage.body).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("- [")) continue;
      const fileLine = indexPage.bodyStartLine + i;
      const bad = (msg: string) => out.push(finding("INDEX-MISSING", at, msg, { line: fileLine, id: "index" }));
      const m = INDEX_LINE.exec(line);
      if (!m) {
        bad(`line does not match the SCHEMA §11 regex: ${line}`);
        continue;
      }
      const [, label, href, status] = m;
      const { resolvedPath } = resolveHref("index.md", href);
      if (resolvedPath === null || resolvedPath.startsWith("../") || href.includes("#")) {
        bad(`[${label}](${href}): the link must be a path relative to wiki/ without an anchor`);
        continue;
      }
      if (resolvedPath.endsWith("/")) {
        if (!idx.files.has(resolvedPath)) {
          bad(`[${label}](${href}) points at a missing folder`);
          continue;
        }
        listed.add(resolvedPath);
        const folder = folderOf(resolvedPath + "x");
        if (folder !== resolvedPath) {
          bad(`[${label}](${href}): only first-level raw/evidence/ and raw/bench/ folders are listed as folders`);
          continue;
        }
        const want = folderLabel(resolvedPath.slice("raw/".length));
        if (label !== want) bad(`[${label}](${href}): the folder label must be ${want}`);
        if (status !== "raw") bad(`[${label}](${href}): status must be raw, not ${status}`);
        continue;
      }
      if (!idx.files.has(resolvedPath)) {
        bad(`[${label}](${href}) points at a missing file`);
        continue;
      }
      listed.add(resolvedPath);
      const page = idx.byPath.get(resolvedPath);
      if (page && isPage(page)) {
        if (label !== page.id) bad(`[${label}](${href}): the label must be the page id ${page.id}`);
        const want = page.kind === "raw-research" ? "raw" : fmObj(page).status;
        if (typeof want === "string" && status !== want) {
          bad(`[${label}](${href}): status column ${status} differs from the page status ${want}`);
        }
      } else if (resolvedPath.startsWith("raw/")) {
        if (folderOf(resolvedPath) !== null) {
          bad(`[${label}](${href}): raw/evidence/ and raw/bench/ files are listed per folder, not per file (adr-0020)`);
          continue;
        }
        if (label !== rawFileLabel(resolvedPath)) bad(`[${label}](${href}): the label must be ${rawFileLabel(resolvedPath)}`);
        if (status !== "raw") bad(`[${label}](${href}): status must be raw, not ${status}`);
      } else if (!page) {
        bad(`[${label}](${href}) is not a wiki page or raw file`);
      }
      // a page without a parsable id (FM-MISSING) is reported by its own findings
    }

    // Pages that need a line.
    for (const p of idx.pages) {
      if (!isPage(p) || p.kind === "status" || p.path === "index.md") continue;
      if (!listed.has(p.path)) {
        out.push(finding("INDEX-MISSING", p.repoPath, `${p.id} is not listed in index.md`, { id: p.id }));
      }
    }
    // Raw files and evidence/bench folders that need a line.
    const folders = new Set<string>();
    for (const f of [...idx.files].sort()) {
      if (f.endsWith("/") || !f.startsWith("raw/") || f === "raw/MANIFEST.sha256") continue;
      const page = idx.byPath.get(f);
      if (page && isPage(page)) continue; // research notes: checked as pages above
      const folder = folderOf(f);
      if (folder === "direct") {
        out.push(finding("INDEX-MISSING", "wiki/" + f, "a raw/evidence/ or raw/bench/ file must sit in a folder (SCHEMA §11)"));
      } else if (folder !== null) {
        folders.add(folder);
      } else if (!listed.has(f)) {
        out.push(finding("INDEX-MISSING", at, `raw file ${f} (label ${rawFileLabel(f)}) is not listed`, { id: "index" }));
      }
    }
    for (const folder of [...folders].sort()) {
      if (!listed.has(folder)) {
        const label = folderLabel(folder.slice("raw/".length));
        out.push(finding("INDEX-MISSING", at, `raw folder ${folder} (label ${label}) is not listed`, { id: "index" }));
      }
    }
    return out;
  },
};
