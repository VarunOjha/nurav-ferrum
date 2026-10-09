// Shared helpers for the IP-3 state/gate tests. Every wiki and approvals file used here is a temp
// copy; the real plan/approvals.json is only fingerprinted (sha256 or "absent"), never written.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Rec, type ApprovalDecision, type ApprovalRecord } from "@/lib/approvals/model";
import { clearWikiCache, loadWiki, type WikiIndex, type WikiPage } from "@/lib/wiki/load";
import { MINI_STATUS, MINI_WIKI, REPO_ROOT } from "./helpers";

export const REAL_APPROVALS = path.join(REPO_ROOT, "plan", "approvals.json");

/** sha256 of the real plan/approvals.json, or "absent". */
export function realApprovalsFingerprint(): string {
  if (!existsSync(REAL_APPROVALS)) return "absent";
  return createHash("sha256").update(readFileSync(REAL_APPROVALS)).digest("hex");
}

export interface TempWiki {
  /** Temp repo root (its path contains a space on purpose). */
  root: string;
  wikiDir: string;
  dataDir: string;
  load(): Promise<WikiIndex>;
  /** Absolute path of a wiki-relative file in the copy. */
  file(rel: string): string;
  read(rel: string): string;
  write(rel: string, text: string): void;
  /** Replaces exactly one occurrence of `from` in a wiki file. */
  edit(rel: string, from: string, to: string): void;
  cleanup(): void;
}

/** Copies the mini-wiki fixture (and optionally a CLAUDE.md) to a fresh temp repo root. */
export function tempMiniWiki(claudeMd: string | null = "# Fixture CLAUDE.md\n"): TempWiki {
  const root = mkdtempSync(path.join(os.tmpdir(), "ip3 state "));
  const wikiDir = path.join(root, "wiki");
  cpSync(MINI_WIKI, wikiDir, { recursive: true });
  if (claudeMd !== null) writeFileSync(path.join(root, "CLAUDE.md"), claudeMd);
  const file = (rel: string) => path.join(wikiDir, rel);
  const t: TempWiki = {
    root,
    wikiDir,
    dataDir: path.join(root, "plan"),
    load() {
      clearWikiCache(); // edits can keep size and mtime within one tick
      return loadWiki({ wikiDir, statusFile: MINI_STATUS, repoRoot: root });
    },
    file,
    read: (rel) => readFileSync(file(rel), "utf8"),
    write: (rel, text) => writeFileSync(file(rel), text),
    edit(rel, from, to) {
      const s = t.read(rel);
      if (s.split(from).length !== 2) throw new Error(`expected exactly one ${JSON.stringify(from)} in ${rel}`);
      t.write(rel, s.replace(from, to));
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
  return t;
}

/** An app-shaped record for the page's current hashes (what store.ts will write in IP-4), zod-validated. */
export function recordFor(
  page: WikiPage,
  opts: { status?: ApprovalDecision; bootstrapHash?: string | null; path?: string } = {},
): ApprovalRecord {
  if (!page.contentHash || !page.scopeHash) throw new Error(`${page.path} is unhashable`);
  const rec: Record<string, unknown> = {
    status: opts.status ?? "approved",
    comment: "",
    timestamp: "2026-10-09T14:03:12+05:30",
    path: opts.path ?? page.repoPath,
    content_hash: page.contentHash,
    scope_hash: page.scopeHash,
    approved_by: "owner",
    history: [],
  };
  if (opts.bootstrapHash) rec.bootstrap_hash = opts.bootstrapHash;
  return Rec.parse(rec);
}
