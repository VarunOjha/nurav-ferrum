/**
 * plan/approvals.json store (ip-approvals-api §2.1, §4; ip-data-contract §8.1; SCHEMA §10.1).
 * The only code that writes approvals.json, snapshots and `approval` log entries. Called only by
 * the POST route on an owner click; Claude never calls it against the real plan/ (SCHEMA §10.1).
 *
 * The fs functions, clock, timestamp source and hash function are injectable so tests can force
 * a crash before rename, transient rename errors, a held lock and an unhashable page.
 */
import { randomBytes } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { PlanConfig } from "../config";
import { parseFrontmatterBytes } from "../wiki/frontmatter";
import { loadWiki, type WikiPage } from "../wiki/load";
import { validateFrontmatter } from "../wiki/schemas";
import { ApprovalError } from "./errors";
import { contentHash, HashError, hashes as defaultHashes, normalizeEol, type Hashes } from "./hash";
import { realClock, withLock, type Clock, type LockOptions } from "./lock";
import { appendApprovalLog } from "./logAppend";
import { readApprovals, serializeApprovals } from "./file";
import { ApprovalsFile, Decision, Hash, Key, type ApprovalDecision } from "./model";
import { BOOTSTRAP_KEY, isExitKey, pageIdOfKey } from "./state";
import { localIso } from "./time";
import { buildItem, type ApprovalItem } from "./view";

export type StoreConfig = Pick<
  PlanConfig,
  "wikiDir" | "statusFile" | "repoRoot" | "dataDir" | "approvalsFile" | "appendLog"
>;

/** The fs functions the store uses (all from node:fs/promises by default). */
export interface StoreFs {
  readFile: typeof fsp.readFile;
  open: typeof fsp.open;
  rename: typeof fsp.rename;
  unlink: typeof fsp.unlink;
  mkdir: typeof fsp.mkdir;
  access: typeof fsp.access;
}

export interface StoreDeps {
  fs?: Partial<StoreFs>;
  /** Clock for the lock and the rename backoff. */
  clock?: Clock;
  lock?: Omit<LockOptions, "clock">;
  /** Timestamp source (default: new Date()). */
  now?: () => Date;
  /** Hash function (default: lib/approvals/hash.ts hashes). */
  hashes?: (raw: Uint8Array) => Hashes;
  /** Waits between rename attempts (default RENAME_BACKOFF_MS). */
  renameBackoffMs?: readonly number[];
}

const defaultFs: StoreFs = {
  readFile: fsp.readFile,
  open: fsp.open,
  rename: fsp.rename,
  unlink: fsp.unlink,
  mkdir: fsp.mkdir,
  access: fsp.access,
};

// ------------------------------------------------------------------------------------------
// Request body (ip-approvals-api §2)
// ------------------------------------------------------------------------------------------

export const PostBody = z
  .object({
    key: Key,
    status: Decision,
    comment: z.string().max(4000),
    seen_content_hash: Hash,
    /** Required for key `schema` only (ip-data-contract §6.2): CLAUDE.md content_hash the owner saw. */
    seen_bootstrap_hash: Hash.optional(),
  })
  .strict();
export type Submission = z.infer<typeof PostBody>;

/** Validates a POST body: BAD_REQUEST (zod issues) or COMMENT_REQUIRED. */
export function parseSubmission(body: unknown): Submission {
  const r = PostBody.safeParse(body);
  if (!r.success) {
    throw new ApprovalError("BAD_REQUEST", "request body does not match the schema", {
      issues: r.error.issues.map((i) => ({ path: i.path.map(String), code: i.code, message: i.message })),
    });
  }
  const s = r.data;
  if (s.status !== "approved" && s.comment.trim() === "") {
    throw new ApprovalError("COMMENT_REQUIRED", `a comment is required for ${s.status}`);
  }
  if (s.key === BOOTSTRAP_KEY && s.seen_bootstrap_hash === undefined) {
    throw new ApprovalError("BAD_REQUEST", "key schema needs seen_bootstrap_hash (content hash of CLAUDE.md)", {
      issues: [{ path: ["seen_bootstrap_hash"], code: "required", message: "required for key schema" }],
    });
  }
  if (s.key !== BOOTSTRAP_KEY && s.seen_bootstrap_hash !== undefined) {
    throw new ApprovalError("BAD_REQUEST", "seen_bootstrap_hash is only accepted for key schema", {
      issues: [{ path: ["seen_bootstrap_hash"], code: "unrecognized_keys", message: "only for key schema" }],
    });
  }
  return s;
}

// ------------------------------------------------------------------------------------------
// Atomic write (ip-approvals-api §4.2)
// ------------------------------------------------------------------------------------------

const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES"]);
/** Waits between rename attempts (ip-approvals-api §4.2 step 4); attempts in total = waits + 1. */
export const RENAME_BACKOFF_MS: readonly number[] = [20, 40, 80, 160, 320];

export interface AtomicWriteOptions {
  fs: StoreFs;
  clock: Clock;
  /** Self-check of the written temp file; throwing or false = WRITE_FAILED. */
  verify?: (bytes: Buffer) => boolean;
  /** Called with the errno code of each transient rename failure that is retried. */
  onRetry?: (code: string) => void;
  /** Waits between rename attempts (default RENAME_BACKOFF_MS). */
  backoffMs?: readonly number[];
}

/** Writes `file` via a same-directory temp file + fsync + rename. Returns the number of rename attempts. */
export async function writeAtomic(file: string, data: string | Uint8Array, o: AtomicWriteOptions): Promise<number> {
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  const cleanup = () => o.fs.unlink(tmp).catch(() => undefined);
  try {
    const fh = await o.fs.open(tmp, "w");
    try {
      await fh.writeFile(data);
      await fh.sync();
    } finally {
      await fh.close();
    }
    if (o.verify) {
      let ok = false;
      try {
        ok = o.verify(await o.fs.readFile(tmp));
      } catch {
        ok = false;
      }
      if (!ok) throw new ApprovalError("WRITE_FAILED", `self-check of ${path.basename(tmp)} failed`);
    }
  } catch (e) {
    await cleanup();
    if (e instanceof ApprovalError) throw e;
    throw new ApprovalError("WRITE_FAILED", `writing ${path.basename(tmp)} failed: ${String(e)}`);
  }
  const backoff = o.backoffMs ?? RENAME_BACKOFF_MS;
  for (let attempt = 1; ; attempt++) {
    try {
      await o.fs.rename(tmp, file);
      return attempt;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code ?? "";
      if (!RETRYABLE.has(code) || attempt > backoff.length) {
        await cleanup();
        throw new ApprovalError("WRITE_FAILED", `rename to ${path.basename(file)} failed after ${attempt} attempt(s): ${String(e)}`, {
          attempts: attempt,
          errno: code || null,
        });
      }
      o.onRetry?.(code);
      await o.clock.sleep(backoff[attempt - 1]);
    }
  }
}

// ------------------------------------------------------------------------------------------
// submit (ip-approvals-api §2.1 steps 4-11)
// ------------------------------------------------------------------------------------------

export interface SubmitResult {
  item: ApprovalItem;
  log_appended: boolean;
  warnings: { code: string; message: string }[];
  /** Diagnostics (not part of the API response): rename attempts for approvals.json and the retried errno codes. */
  rename_attempts: number;
  rename_retry_codes: string[];
}

export const lockPathOf = (cfg: Pick<StoreConfig, "dataDir">) => path.join(cfg.dataDir, ".approvals.lock");
export const snapshotDirName = (key: string) => key.replace(/#exit$/, "__exit");
const posix = (p: string) => p.split(path.sep).join("/");

const PHASE_EXIT_READY = new Set(["gate-review", "done"]);

/** Records one owner decision. Throws ApprovalError for every refusal. */
export async function submit(body: unknown, cfg: StoreConfig, deps: StoreDeps = {}): Promise<SubmitResult> {
  const sub = parseSubmission(body);
  const fs: StoreFs = { ...defaultFs, ...deps.fs };
  const clock = deps.clock ?? realClock;
  const hashFn = deps.hashes ?? defaultHashes;
  await fs.mkdir(cfg.dataDir, { recursive: true });
  return withLock(lockPathOf(cfg), () => submitLocked(sub, cfg, fs, clock, hashFn, deps), {
    ...deps.lock,
    clock,
  });
}

async function submitLocked(
  sub: Submission,
  cfg: StoreConfig,
  fs: StoreFs,
  clock: Clock,
  hashFn: (raw: Uint8Array) => Hashes,
  deps: StoreDeps,
): Promise<SubmitResult> {
  const { key } = sub;
  const id = pageIdOfKey(key);

  // Step 4: resolve the key; the page itself is read fresh from disk.
  const idx = await loadWiki(cfg);
  const found = idx.byId.get(id);
  if (!found) throw new ApprovalError("UNKNOWN_KEY", `no wiki page has id ${id}`, { key });
  const abs = path.resolve(cfg.wikiDir, found.path);
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(abs);
  } catch {
    throw new ApprovalError("UNKNOWN_KEY", `page file for ${id} is gone`, { key });
  }
  const parsed = parseFrontmatterBytes(bytes, { repoPath: found.repoPath });
  const raw = (parsed.rawFm ?? {}) as Record<string, unknown>;
  if (raw.id !== id) throw new ApprovalError("UNKNOWN_KEY", `page ${found.repoPath} no longer has id ${id}`, { key });
  const fm = parsed.rawFm === null ? null : validateFrontmatter(parsed.rawFm, found.repoPath).fm;
  if (!fm || fm.approvable !== true) {
    throw new ApprovalError("NOT_APPROVABLE", `${id} is not approvable (approvable: true and valid frontmatter needed)`, {
      key,
      path: found.repoPath,
    });
  }
  if (isExitKey(key)) {
    if (fm.type !== "phase") throw new ApprovalError("NOT_A_PHASE", `${id} is a ${fm.type} page, not a phase`, { key });
    if (!PHASE_EXIT_READY.has(fm.status)) {
      throw new ApprovalError("EXIT_NOT_READY", `phase ${id} has status ${fm.status}; exit review needs gate-review or done`, {
        key,
        page_status: fm.status,
      });
    }
  }

  // Step 5: recompute the hashes from the bytes on disk.
  let h: Hashes;
  try {
    h = hashFn(bytes);
  } catch (e) {
    if (e instanceof HashError) throw new ApprovalError("UNHASHABLE", `${found.repoPath}: ${e.code}`, { key });
    throw e;
  }
  const current = { content_hash: h.content, scope_hash: h.scope };
  if (sub.seen_content_hash !== h.content) {
    throw new ApprovalError("PAGE_CHANGED", `${found.repoPath} changed since it was rendered`, { key, current });
  }
  let bootstrapHash: string | null = null;
  if (key === BOOTSTRAP_KEY) {
    try {
      bootstrapHash = contentHash(await fs.readFile(path.join(cfg.repoRoot, "CLAUDE.md")));
    } catch {
      throw new ApprovalError("UNHASHABLE", "CLAUDE.md is missing, so bootstrap_hash cannot be recorded", { key });
    }
    if (sub.seen_bootstrap_hash !== bootstrapHash) {
      throw new ApprovalError("PAGE_CHANGED", "CLAUDE.md changed since it was rendered", {
        key,
        current: { ...current, bootstrap_hash: bootstrapHash },
      });
    }
  }

  // Step 6: read approvals.json (after the lock: one critical section with the write).
  const read = await readApprovals(cfg.approvalsFile, fs);
  if (!read.valid || !read.data) {
    throw new ApprovalError("APPROVALS_FILE_INVALID", `${posix(cfg.approvalsFile)} is invalid and is never overwritten: ${read.error}`, {
      error: read.error,
    });
  }
  const data = read.data;

  // Step 7: the new record; the old top-level record moves into history (append-only).
  const old = Object.hasOwn(data.approvals, key) ? data.approvals[key] : undefined;
  const history: unknown[] = old && Array.isArray(old.history) ? [...old.history] : [];
  if (old) {
    history.push({
      status: old.status,
      comment: old.comment,
      timestamp: old.timestamp,
      content_hash: old.content_hash,
      scope_hash: old.scope_hash,
    });
  }
  const repoPath = posix(path.relative(cfg.repoRoot, abs));
  const rec: Record<string, unknown> = {
    status: sub.status satisfies ApprovalDecision,
    comment: sub.comment.trim(),
    timestamp: localIso(deps.now ? deps.now() : new Date()),
    path: repoPath.startsWith("..") ? found.repoPath : repoPath,
    content_hash: h.content,
    scope_hash: h.scope,
    approved_by: "owner",
    history,
  };

  // Step 8: snapshot of the normalised bytes, before the approvals file; never overwritten.
  if (sub.status === "approved") {
    const hex = h.content.slice("sha256:".length);
    const dir = path.join(cfg.dataDir, "snapshots", snapshotDirName(key));
    const snapAbs = path.join(dir, `${hex}.md`);
    await fs.mkdir(dir, { recursive: true });
    const exists = await fs.access(snapAbs).then(
      () => true,
      () => false,
    );
    if (!exists) await writeAtomic(snapAbs, normalizeEol(bytes), { fs, clock });
    rec.snapshot = `plan/snapshots/${snapshotDirName(key)}/${hex}.md`;
  }
  if (bootstrapHash !== null) rec.bootstrap_hash = bootstrapHash;

  // Step 9: atomic write with a zod self-check of the temp file.
  data.approvals[key] = rec;
  const retryCodes: string[] = [];
  const renameAttempts = await writeAtomic(cfg.approvalsFile, serializeApprovals(data), {
    fs,
    clock,
    onRetry: (c) => retryCodes.push(c),
    backoffMs: deps.renameBackoffMs,
    verify: (b) => ApprovalsFile.safeParse(JSON.parse(b.toString("utf8"))).success,
  });

  // Step 10: optional log entry (failure keeps the approval).
  const warnings: SubmitResult["warnings"] = [];
  let logAppended = false;
  if (cfg.appendLog) {
    const r = await appendApprovalLog(path.join(cfg.wikiDir, "log.md"), {
      key,
      status: sub.status,
      timestamp: rec.timestamp as string,
      contentHash: h.content,
      comment: rec.comment as string,
    });
    if (r.appended) logAppended = true;
    else warnings.push({ code: r.warning, message: r.message });
  }

  // Step 11: the item in GET shape, from the fresh page.
  const page: WikiPage = { ...found, fm, rawFm: parsed.rawFm, contentHash: h.content, scopeHash: h.scope };
  const item = buildItem(key, page, rec, { byId: new Map([[id, page]]), bootstrapHash });
  return { item, log_appended: logAppended, warnings, rename_attempts: renameAttempts, rename_retry_codes: retryCodes };
}
