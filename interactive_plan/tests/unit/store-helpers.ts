// Shared helpers for the IP-4 store / route tests. Everything is written under a fresh temp repo
// root (mini-wiki copy + temp plan/ dir); the real plan/approvals.json is only fingerprinted.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ApiConfig } from "@/lib/approvals/api";
import type { Clock } from "@/lib/approvals/lock";
import type { StoreConfig } from "@/lib/approvals/store";
import { MINI_STATUS } from "./helpers";
import { tempMiniWiki, type TempWiki } from "./approvals-helpers";

export interface TempStore extends TempWiki {
  cfg: StoreConfig & ApiConfig;
  approvalsFile: string;
  /** Current content hash of the page with this id (fresh load). */
  hashOf(id: string): Promise<string>;
  /** Approvable page ids of the fixture (excluding `schema`), sorted. */
  approvableIds(): Promise<string[]>;
  /** approvals.json bytes, or null when absent. */
  approvalsBytes(): Buffer | null;
  /** Every file under the data dir (relative, forward slashes). */
  dataFiles(): string[];
  /** CLAUDE.md content hash of the temp root. */
  bootstrapHash(): Promise<string | null>;
}

export function tempStore(opts: { appendLog?: boolean; readonly?: boolean; port?: number } = {}): TempStore {
  const t = tempMiniWiki();
  const approvalsFile = path.join(t.dataDir, "approvals.json");
  const cfg: StoreConfig & ApiConfig = {
    wikiDir: t.wikiDir,
    statusFile: MINI_STATUS,
    repoRoot: t.root,
    dataDir: t.dataDir,
    approvalsFile,
    appendLog: opts.appendLog ?? false,
    readonly: opts.readonly ?? false,
    port: opts.port ?? 3417,
  };
  return {
    ...t,
    cfg,
    approvalsFile,
    async hashOf(id) {
      const idx = await t.load();
      const p = idx.byId.get(id);
      if (!p?.contentHash) throw new Error(`no hashable page ${id}`);
      return p.contentHash;
    },
    async approvableIds() {
      const idx = await t.load();
      return idx.pages
        .filter((p) => p.id !== null && p.id !== "schema" && p.fm?.approvable === true)
        .map((p) => p.id!)
        .sort();
    },
    approvalsBytes: () => (existsSync(approvalsFile) ? readFileSync(approvalsFile) : null),
    dataFiles: () =>
      existsSync(t.dataDir)
        ? (readdirSync(t.dataDir, { recursive: true }) as string[]).map((p) => p.split(path.sep).join("/")).sort()
        : [],
    async bootstrapHash() {
      return (await t.load()).bootstrapHash;
    },
  };
}

export interface FakeClock extends Clock {
  sleeps: number[];
  advance(ms: number): void;
}

/** A clock whose sleep() returns at once and advances time by the requested amount. */
export function fakeClock(start = 1_700_000_000_000): FakeClock {
  let t = start;
  const sleeps: number[] = [];
  return {
    now: () => t,
    async sleep(ms) {
      sleeps.push(ms);
      t += ms;
    },
    advance(ms) {
      t += ms;
    },
    sleeps,
  };
}

export const body = (key: string, status: string, seen: string, comment = "", extra: Record<string, unknown> = {}) => ({
  key,
  status,
  comment,
  seen_content_hash: seen,
  ...extra,
});

/** An Error with an errno-style code (what fs throws). */
export const errno = (code: string) => Object.assign(new Error(`${code}: injected`), { code });
