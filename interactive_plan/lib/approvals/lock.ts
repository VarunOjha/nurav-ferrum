/**
 * Write lock for plan/approvals.json (ip-approvals-api §4.1).
 *
 * - In-process: a promise-chain mutex per lock path serialises callers within one server.
 * - Cross-process: `<dataDir>/.approvals.lock`, created with `open(path, 'wx')` (exclusive create),
 *   holding `{pid, started_at, nonce}`. Acquisition retries every 50 ms for up to 3 s, then throws
 *   LOCK_TIMEOUT. A lock older than 30 s is stale: it is broken and the event is logged. The lock
 *   is released in `finally`.
 *
 * The clock is injectable so tests can use a fake clock (ip-testing §1.4 "Stale lock").
 *
 * Windows: `open(lock, 'wx')` can fail with EPERM (also EACCES/EBUSY) while the previous holder's
 * lock file is still pending deletion (it was unlinked while another process had it open to read
 * it). That is a busy lock, not a failure: it is retried like EEXIST until the timeout (LOCK_TIMEOUT),
 * never surfaced as a raw fs error (seen in the IP-8 gate run of the IP-4 cross-process test; decided
 * 2026-10-09). The open function is injectable for that test.
 */
import { randomBytes } from "node:crypto";
import * as fsp from "node:fs/promises";
import { ApprovalError } from "./errors";

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export interface LockOptions {
  retryMs?: number;
  timeoutMs?: number;
  staleMs?: number;
  clock?: Clock;
  /** Called when a stale lock is broken (default: console.warn). */
  onStale?: (info: { path: string; ageMs: number; holder: string }) => void;
  /** The exclusive-create open (default fs/promises open); injectable for tests. */
  open?: (path: string, flags: string) => Promise<Pick<fsp.FileHandle, "writeFile" | "close">>;
}

/** Open errors that mean "busy" on Windows (delete-pending lock file), retried like EEXIST. */
export const TRANSIENT_LOCK_OPEN = new Set(["EPERM", "EACCES", "EBUSY"]);

export const LOCK_DEFAULTS = { retryMs: 50, timeoutMs: 3000, staleMs: 30_000 } as const;

interface LockBody {
  pid?: number;
  started_at?: number;
  nonce?: string;
}

const chains = new Map<string, Promise<unknown>>();

/** Runs `fn` while holding both the in-process mutex and the cross-process lock file. */
export function withLock<T>(lockPath: string, fn: () => Promise<T>, opts: LockOptions = {}): Promise<T> {
  return withMutex(lockPath, () => withFileLock(lockPath, fn, opts));
}

/**
 * Runs `fn` under the in-process mutex only (no lock file, no fs side effect). The app's own reads
 * of approvals.json use it, so a GET in the same server never holds the file open while a POST
 * renames over it (Windows refuses that rename with EPERM; IP-4 cross-process test).
 */
export function withMutex<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(lockPath) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  chains.set(lockPath, tail);
  void tail.then(() => {
    if (chains.get(lockPath) === tail) chains.delete(lockPath);
  });
  return run;
}

async function withFileLock<T>(lockPath: string, fn: () => Promise<T>, opts: LockOptions): Promise<T> {
  const nonce = await acquire(lockPath, opts);
  try {
    return await fn();
  } finally {
    await release(lockPath, nonce);
  }
}

async function readBody(lockPath: string): Promise<{ raw: string; body: LockBody; mtimeMs: number } | null> {
  try {
    const [raw, st] = await Promise.all([fsp.readFile(lockPath, "utf8"), fsp.stat(lockPath)]);
    let body: LockBody = {};
    try {
      const j = JSON.parse(raw) as unknown;
      if (j && typeof j === "object") body = j as LockBody;
    } catch {
      // half-written or foreign content: judged by mtime
    }
    return { raw, body, mtimeMs: st.mtimeMs };
  } catch {
    return null;
  }
}

export async function acquire(lockPath: string, opts: LockOptions = {}): Promise<string> {
  const retryMs = opts.retryMs ?? LOCK_DEFAULTS.retryMs;
  const timeoutMs = opts.timeoutMs ?? LOCK_DEFAULTS.timeoutMs;
  const staleMs = opts.staleMs ?? LOCK_DEFAULTS.staleMs;
  const clock = opts.clock ?? realClock;
  const onStale =
    opts.onStale ??
    ((i) => console.warn(`[approvals] breaking stale lock ${i.path} (age ${i.ageMs} ms, holder ${i.holder})`));
  const open = opts.open ?? ((p: string, f: string) => fsp.open(p, f));
  const start = clock.now();
  const nonce = randomBytes(8).toString("hex");
  let lastBusy: string | undefined;
  const timeout = () =>
    new ApprovalError("LOCK_TIMEOUT", `could not acquire ${lockPath} within ${timeoutMs} ms`, {
      timeout_ms: timeoutMs,
      ...(lastBusy ? { last_error: lastBusy } : {}),
    });
  for (;;) {
    try {
      const fh = await open(lockPath, "wx");
      try {
        await fh.writeFile(JSON.stringify({ pid: process.pid, started_at: clock.now(), nonce }));
      } finally {
        await fh.close();
      }
      return nonce;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        if (!code || !TRANSIENT_LOCK_OPEN.has(code)) throw e;
        // Busy (delete-pending lock file): wait and retry, bounded by the same timeout.
        lastBusy = code;
        if (clock.now() - start >= timeoutMs) throw timeout();
        await clock.sleep(retryMs);
        continue;
      }
    }
    const cur = await readBody(lockPath);
    if (cur) {
      const started = typeof cur.body.started_at === "number" ? cur.body.started_at : cur.mtimeMs;
      const age = clock.now() - started;
      if (age > staleMs && (await breakStale(lockPath, cur.raw))) {
        onStale({ path: lockPath, ageMs: age, holder: `pid ${cur.body.pid ?? "?"}` });
        continue; // retry the exclusive create at once
      }
    } else {
      continue; // released between our create and our read: retry at once
    }
    if (clock.now() - start >= timeoutMs) throw timeout();
    await clock.sleep(retryMs);
  }
}

/**
 * Breaks a stale lock without clobbering a fresh one: the lock is renamed aside, and if the moved
 * file is not the one judged stale (another process replaced it meanwhile) it is linked back
 * (link fails instead of overwriting when a new lock already exists).
 */
async function breakStale(lockPath: string, judgedRaw: string): Promise<boolean> {
  const aside = `${lockPath}.stale-${process.pid}-${randomBytes(4).toString("hex")}`;
  try {
    await fsp.rename(lockPath, aside);
  } catch {
    return false;
  }
  try {
    const moved = await fsp.readFile(aside, "utf8").catch(() => null);
    if (moved !== null && moved !== judgedRaw) {
      await fsp.link(aside, lockPath).catch(() => undefined);
      return false;
    }
    return true;
  } finally {
    await fsp.unlink(aside).catch(() => undefined);
  }
}

export async function release(lockPath: string, nonce: string): Promise<void> {
  const cur = await readBody(lockPath);
  if (!cur || cur.body.nonce !== nonce) return; // broken as stale by someone else: not ours any more
  await fsp.unlink(lockPath).catch(() => undefined);
}
