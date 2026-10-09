// ip-testing §1.4: approvals store, concurrency and atomicity. Every test uses a fresh temp repo
// root (mini-wiki copy, temp plan/ dir). The real plan/approvals.json is fingerprinted before and
// after and must be untouched (SCHEMA §10.1: Claude never writes it).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApprovalError } from "@/lib/approvals/errors";
import { readApprovals, serializeApprovals, type RawApprovals } from "@/lib/approvals/file";
import { contentHash, hashes, normalizeEol } from "@/lib/approvals/hash";
import { ApprovalsFile } from "@/lib/approvals/model";
import { appendApprovalLog, formatApprovalEntry, logComment, separatorFor } from "@/lib/approvals/logAppend";
import { RENAME_BACKOFF_MS, submit, writeAtomic, type StoreFs } from "@/lib/approvals/store";
import { parseFrontmatterBytes } from "@/lib/wiki/frontmatter";
import { parseLog } from "@/lib/wiki/log";
import { realApprovalsFingerprint, REAL_APPROVALS } from "./approvals-helpers";
import { APP_DIR } from "./helpers";
import { body, errno, fakeClock, tempStore, type TempStore } from "./store-helpers";

const LOG_HEADING = /^## \[(\d{4}-\d{2}-\d{2})\] (ingest|query|lint|decide|handoff|resume|gate|code|approval|schema|correct|plan) \| (.+)$/;
const ISO_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

let fingerprint: string;
beforeAll(() => {
  fingerprint = realApprovalsFingerprint();
});
afterAll(() => {
  expect(realApprovalsFingerprint()).toBe(fingerprint);
});

let stores: TempStore[] = [];
function store(opts?: Parameters<typeof tempStore>[0]): TempStore {
  const s = tempStore(opts);
  stores.push(s);
  return s;
}
afterEach(() => {
  for (const s of stores) s.cleanup();
  stores = [];
});

const readJson = (s: TempStore): RawApprovals => JSON.parse(s.approvalsBytes()!.toString("utf8"));

async function expectCode(p: Promise<unknown>, code: string): Promise<ApprovalError> {
  const e = await p.then(
    () => null,
    (err: unknown) => err,
  );
  expect(e, `expected ${code}`).toBeInstanceOf(ApprovalError);
  expect((e as ApprovalError).code).toBe(code);
  return e as ApprovalError;
}

describe("the test environment", () => {
  it("never points at the real plan/ directory", () => {
    const s = store();
    expect(path.resolve(s.cfg.approvalsFile)).not.toBe(path.resolve(REAL_APPROVALS));
    expect(path.resolve(s.cfg.dataDir).startsWith(path.resolve(APP_DIR, ".."))).toBe(false);
  });
});

describe("first write", () => {
  it("creates plan/ and approvals.json, valid under the zod schema", async () => {
    const s = store();
    expect(existsSync(s.dataDir)).toBe(false);
    const seen = await s.hashOf("adr-0901");
    const r = await submit(body("adr-0901", "approved", seen, "  looks fine \n"), s.cfg);
    const data = readJson(s);
    expect(ApprovalsFile.safeParse(data).success).toBe(true);
    const rec = data.approvals["adr-0901"];
    expect(rec.status).toBe("approved");
    expect(rec.comment).toBe("looks fine");
    expect(rec.timestamp).toMatch(ISO_LOCAL);
    expect(rec.path).toBe("wiki/decisions/adr-0901-fixture-decision.md");
    expect(rec.content_hash).toBe(seen);
    expect(rec.approved_by).toBe("owner");
    expect(rec.history).toEqual([]);
    expect(rec.bootstrap_hash).toBeUndefined();
    expect(r.item.state).toBe("APPROVED");
    expect(r.item.counts_as_approved).toBe(true);
    expect(r.item.record).toEqual(rec);
    expect(r.rename_attempts).toBe(1);
  });

  it("records bootstrap_hash for key schema (CLAUDE.md content hash)", async () => {
    const s = store();
    const boot = (await s.bootstrapHash())!;
    const r = await submit(
      body("schema", "approved", await s.hashOf("schema"), "", { seen_bootstrap_hash: boot }),
      s.cfg,
    );
    expect(readJson(s).approvals.schema.bootstrap_hash).toBe(boot);
    expect(boot).toBe(contentHash(readFileSync(path.join(s.root, "CLAUDE.md"))));
    expect(r.item.state).toBe("APPROVED");
  });
});

describe("snapshots", () => {
  it("writes plan/snapshots/<id>/<hex>.md with the normalised bytes before approvals.json", async () => {
    const s = store();
    // CRLF on disk: the snapshot holds the LF-normalised bytes that were hashed.
    const rel = "decisions/adr-0901-fixture-decision.md";
    const crlf = Buffer.from(s.read(rel).replace(/\n/g, "\r\n"), "utf8");
    writeFileSync(s.file(rel), crlf);
    const seen = await s.hashOf("adr-0901");
    const renames: string[] = [];
    const fs: Partial<StoreFs> = {
      rename: async (a, b) => {
        renames.push(path.relative(s.dataDir, String(b)).split(path.sep).join("/"));
        return fsp.rename(a, b);
      },
    };
    await submit(body("adr-0901", "approved", seen), s.cfg, { fs });
    const hex = seen.slice("sha256:".length);
    const snapRel = `snapshots/adr-0901/${hex}.md`;
    expect(renames).toEqual([snapRel, "approvals.json"]);
    const snap = readFileSync(path.join(s.dataDir, snapRel));
    expect(snap.equals(normalizeEol(crlf))).toBe(true);
    expect(snap.includes(0x0d)).toBe(false);
    expect(hashes(snap).content).toBe(seen);
    expect(readJson(s).approvals["adr-0901"].snapshot).toBe(`plan/${snapRel}`);
  });

  it("never overwrites a snapshot: a second approval of the same hash leaves it byte-identical", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "approved", seen, "first"), s.cfg);
    const snapAbs = path.join(s.dataDir, "snapshots", "adr-0901", seen.slice(7) + ".md");
    const before = readFileSync(snapAbs);
    const mtime = statSync(snapAbs).mtimeMs;
    await new Promise((r) => setTimeout(r, 30));
    await submit(body("adr-0901", "approved", seen, "second"), s.cfg);
    expect(readFileSync(snapAbs).equals(before)).toBe(true);
    expect(statSync(snapAbs).mtimeMs).toBe(mtime);
    expect(s.dataFiles().filter((f) => f.startsWith("snapshots/adr-0901/"))).toEqual([
      `snapshots/adr-0901/${seen.slice(7)}.md`,
    ]);
  });

  it("writes no snapshot for changes-requested or rejected", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "changes-requested", seen, "fix x"), s.cfg);
    await submit(body("adr-0901", "rejected", seen, "no"), s.cfg);
    expect(s.dataFiles().some((f) => f.startsWith("snapshots"))).toBe(false);
    expect(readJson(s).approvals["adr-0901"].snapshot).toBeUndefined();
  });

  it("uses <phase-id>__exit as the snapshot directory of an exit review", async () => {
    const s = store();
    s.edit("phases/phase-p0-fixture-plan.md", "status: in-progress", "status: gate-review");
    const seen = await s.hashOf("phase-p0-fixture-plan");
    const r = await submit(body("phase-p0-fixture-plan#exit", "approved", seen), s.cfg);
    expect(r.item.exit).toBe(true);
    expect(r.item.state).toBe("APPROVED");
    expect(readJson(s).approvals["phase-p0-fixture-plan#exit"].snapshot).toBe(
      `plan/snapshots/phase-p0-fixture-plan__exit/${seen.slice(7)}.md`,
    );
    expect(existsSync(path.join(s.dataDir, "snapshots", "phase-p0-fixture-plan__exit", seen.slice(7) + ".md"))).toBe(
      true,
    );
  });
});

describe("history", () => {
  it("three decisions give two history items, in order, earlier items unchanged byte for byte", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "changes-requested", seen, "one"), s.cfg);
    const first = readJson(s).approvals["adr-0901"];
    await submit(body("adr-0901", "rejected", seen, "two"), s.cfg);
    const afterTwo = readJson(s).approvals["adr-0901"];
    await submit(body("adr-0901", "approved", seen, "three"), s.cfg);
    const afterThree = readJson(s).approvals["adr-0901"];
    const h2 = afterTwo.history as Record<string, unknown>[];
    const h3 = afterThree.history as Record<string, unknown>[];
    expect(h2).toHaveLength(1);
    expect(h3).toHaveLength(2);
    expect(h3.map((h) => h.comment)).toEqual(["one", "two"]);
    expect(h3.map((h) => h.status)).toEqual(["changes-requested", "rejected"]);
    expect(JSON.stringify(h3[0])).toBe(JSON.stringify(h2[0]));
    expect(h2[0]).toEqual({
      status: first.status,
      comment: first.comment,
      timestamp: first.timestamp,
      content_hash: first.content_hash,
      scope_hash: first.scope_hash,
    });
    expect(Object.keys(h3[0])).toEqual(["status", "comment", "timestamp", "content_hash", "scope_hash"]);
    expect(afterThree.status).toBe("approved");
  });

  it("keeps unknown fields of history items and other records verbatim", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "approved", seen, "a"), s.cfg);
    const data = readJson(s);
    (data.approvals["adr-0901"].history as unknown[]).push({
      status: "rejected",
      comment: "hand-made",
      timestamp: "2026-10-01T10:00:00+05:30",
      content_hash: seen,
      scope_hash: seen,
      note: "extra field",
    });
    writeFileSync(s.approvalsFile, serializeApprovals(data));
    await submit(body("adr-0901", "rejected", seen, "b"), s.cfg);
    const h = readJson(s).approvals["adr-0901"].history as Record<string, unknown>[];
    expect(h).toHaveLength(2);
    expect(h[0].note).toBe("extra field");
  });
});

describe("refusals leave the file unchanged", () => {
  it("seen_content_hash mismatch -> PAGE_CHANGED with the current hashes", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "approved", seen), s.cfg);
    const before = s.approvalsBytes()!;
    s.write("decisions/adr-0901-fixture-decision.md", s.read("decisions/adr-0901-fixture-decision.md") + "Edited line.\n");
    const e = await expectCode(submit(body("adr-0901", "rejected", seen, "x"), s.cfg), "PAGE_CHANGED");
    expect(e.status).toBe(409);
    const cur = (e.details.current as { content_hash: string }).content_hash;
    expect(cur).toBe(await s.hashOf("adr-0901"));
    expect(cur).not.toBe(seen);
    expect(s.approvalsBytes()!.equals(before)).toBe(true);
  });

  it.each([
    ["bad JSON", "{ not json"],
    ["wrong schema_version", JSON.stringify({ schema_version: 2, approvals: {} }, null, 2) + "\n"],
    ["bad record", JSON.stringify({ schema_version: 1, approvals: { "adr-0901": { status: "pending" } } }) + "\n"],
  ])("invalid existing file (%s) -> APPROVALS_FILE_INVALID, unchanged byte for byte", async (_n, text) => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    writeFileSync(s.approvalsFile, text);
    const e = await expectCode(
      submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg),
      "APPROVALS_FILE_INVALID",
    );
    expect(e.status).toBe(500);
    expect(readFileSync(s.approvalsFile, "utf8")).toBe(text);
    expect(s.dataFiles()).toEqual(["approvals.json"]);
  });
});

describe("parallel writes in one process", () => {
  it("50 concurrent submits on 10 keys: no lost update, valid JSON", async () => {
    const s = store();
    const ids = (await s.approvableIds()).slice(0, 10);
    expect(ids).toHaveLength(10);
    const seen = new Map<string, string>();
    for (const id of ids) seen.set(id, await s.hashOf(id));
    const statuses = ["approved", "changes-requested", "rejected"] as const;
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) => {
        const id = ids[i % 10];
        return submit(body(id, statuses[i % 3], seen.get(id)!, `c${i}`), s.cfg);
      }),
    );
    expect(results.filter((r) => r.status === "rejected")).toEqual([]);
    const data = readJson(s);
    expect(ApprovalsFile.safeParse(data).success).toBe(true);
    expect(Object.keys(data.approvals).sort()).toEqual(ids);
    for (const id of ids) expect((data.approvals[id].history as unknown[]).length).toBe(5 - 1);
    // every submission is recorded exactly once (top-level + history)
    const comments = Object.values(data.approvals).flatMap((r) => [
      r.comment,
      ...(r.history as { comment: string }[]).map((h) => h.comment),
    ]);
    expect(comments).toHaveLength(50);
    expect(new Set(comments).size).toBe(50);
    expect(s.dataFiles().filter((f) => /\.tmp-|\.lock/.test(f))).toEqual([]);
  });
});

describe("cross-process", () => {
  const statuses = ["approved", "changes-requested", "rejected"] as const;
  const child = path.join(APP_DIR, "tests", "unit", "children", "approvals-child.mjs");
  const storeUrl = pathToFileURL(path.join(APP_DIR, "lib", "approvals", "store.ts")).href;

  const run = (arg: unknown) =>
    new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
      const p = spawn(
        process.execPath,
        ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--disable-warning=ExperimentalWarning", child, JSON.stringify(arg)],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let out = "";
      let err = "";
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
      p.on("close", (code) => resolve({ code, out, err }));
    });

  interface WriterOut {
    ok: number;
    okComments: string[];
    errors: string[];
    renameRetries: number;
    maxAttempts?: number;
    retryCodes: Record<string, number>;
  }

  /** 4 writer processes x 10 submits on 10 keys of one temp dir, plus one reader process reading every `readEveryMs`. */
  async function crossProcess(label: string, readEveryMs: number) {
    const s = store({ appendLog: true });
    const ids = (await s.approvableIds()).slice(0, 10);
    expect(ids).toHaveLength(10);
    const seen = new Map<string, string>();
    for (const id of ids) seen.set(id, await s.hashOf(id));
    const logBefore = s.read("log.md");
    const goFile = path.join(s.root, "go");
    const doneFile = path.join(s.root, "done");
    const jobsOf = (c: number) =>
      Array.from({ length: 10 }, (_, i) => {
        const id = ids[(c * 3 + i) % 10];
        return { key: id, status: statuses[(c + i) % 3], comment: `p${c}-s${i}`, seen: seen.get(id) };
      });
    const writers = Array.from({ length: 4 }, (_, c) =>
      run({ mode: "writer", storeUrl, cfg: s.cfg, goFile, jobs: jobsOf(c) }),
    );
    const reader = run({ mode: "reader", goFile, doneFile, readFile: s.approvalsFile, readEveryMs });
    writeFileSync(goFile, "");
    const wr = await Promise.all(writers);
    writeFileSync(doneFile, "");
    const rr = await reader;
    for (const w of [...wr, rr]) expect(w.code, w.err).toBe(0);
    const wres = wr.map((w) => JSON.parse(w.out.trim()) as WriterOut);
    const rres = JSON.parse(rr.out.trim()) as { reads: number; missing: number; torn: number; readErrors: string[] };
    console.log(
      `[${label}] writers ${JSON.stringify(
        wres.map((w) => ({ ok: w.ok, errors: w.errors.map((e) => e.split(":")[0]), renameRetries: w.renameRetries, maxAttempts: w.maxAttempts ?? 1, retryCodes: w.retryCodes })),
      )}; reader every ${readEveryMs} ms ${JSON.stringify(rres)}`,
    );

    // Atomicity: a concurrent reader never sees a partial file.
    expect(rres.torn).toBe(0);
    expect(rres.reads).toBeGreaterThan(0);
    // Every error is an explicit refusal of the store (never a crash or a silent loss).
    for (const w of wres) for (const e of w.errors) expect(e).toMatch(/^(WRITE_FAILED|LOCK_TIMEOUT): /);
    // Accounting: the file holds exactly the submissions that reported success, each once.
    const data = readJson(s);
    expect(ApprovalsFile.safeParse(data).success).toBe(true);
    const stored = Object.values(data.approvals).flatMap((r) => [
      r.comment as string,
      ...(r.history as { comment: string }[]).map((h) => h.comment),
    ]);
    const okComments = wres.flatMap((w) => w.okComments);
    expect([...stored].sort()).toEqual([...okComments].sort());
    expect(new Set(stored).size).toBe(stored.length);
    // No leftovers, and one well-formed approval log entry per recorded submission.
    expect(s.dataFiles().filter((f) => /\.tmp-|\.lock|\.stale-/.test(f))).toEqual([]);
    const log = s.read("log.md");
    expect(log.startsWith(logBefore)).toBe(true);
    const headings = log.slice(logBefore.length).split("\n").filter((l) => l.startsWith("## "));
    expect(headings).toHaveLength(okComments.length);
    for (const l of headings) expect(l).toMatch(LOG_HEADING);
    expect(log.endsWith("\n") && !log.endsWith("\n\n")).toBe(true);
    return { wres, ok: okComments.length, data, ids, jobsOf };
  }

  it("4 child processes x 10 submits on one dir, reader every 20 ms: all 40 recorded, no lost update, no torn read, no leftovers", async () => {
    const { wres, ok, data, ids, jobsOf } = await crossProcess("cross-process", 20);
    for (const w of wres) expect(w.errors).toEqual([]);
    expect(ok).toBe(40);
    const expected = new Map<string, number>();
    for (let c = 0; c < 4; c++) for (const j of jobsOf(c)) expected.set(j.key, (expected.get(j.key) ?? 0) + 1);
    expect([...expected.keys()].sort()).toEqual(ids);
    for (const [id, n] of expected) expect((data.approvals[id].history as unknown[]).length + 1, id).toBe(n);
  }, 120_000);

  it("stress, reader every 1 ms: no torn read; every submission is recorded exactly once or refused explicitly", async () => {
    // Windows refuses a rename over a file another process has open (EPERM). Under this read
    // pressure a write can exhaust its retries (WRITE_FAILED) and others can time out on the lock
    // (LOCK_TIMEOUT); both leave the file intact and are reported to the caller.
    const { ok } = await crossProcess("cross-process stress", 1);
    expect(ok).toBeGreaterThan(0);
  }, 120_000);
});

describe("crash during write", () => {
  it("a failure after the temp file is written and before rename keeps the original and removes the temp file", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "approved", seen, "keep me"), s.cfg);
    const before = s.approvalsBytes()!;
    let tempSeen = false;
    const fs: Partial<StoreFs> = {
      rename: async (a, b) => {
        if (String(b) === s.approvalsFile) {
          tempSeen = existsSync(String(a)) && ApprovalsFile.safeParse(JSON.parse(readFileSync(String(a), "utf8"))).success;
          throw errno("EIO");
        }
        return fsp.rename(a, b);
      },
    };
    const e = await expectCode(submit(body("adr-0901", "rejected", seen, "lost"), s.cfg, { fs }), "WRITE_FAILED");
    expect(e.status).toBe(500);
    expect(tempSeen).toBe(true);
    expect(s.approvalsBytes()!.equals(before)).toBe(true);
    expect(s.dataFiles().filter((f) => /\.tmp-|\.lock/.test(f))).toEqual([]);
  });

  it("a temp file that fails the zod self-check is deleted -> WRITE_FAILED", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const target = path.join(s.dataDir, "x.json");
    writeFileSync(target, "original");
    const e = await expectCode(
      writeAtomic(target, "{}", { fs: { ...fsp } as StoreFs, clock: fakeClock(), verify: () => false }),
      "WRITE_FAILED",
    );
    expect(e.message).toMatch(/self-check/);
    expect(readFileSync(target, "utf8")).toBe("original");
    expect(s.dataFiles()).toEqual(["x.json"]);
  });
});

describe("rename retry", () => {
  const failingRename = (target: string, failures: number, code = "EPERM") => {
    let n = 0;
    const fs: Partial<StoreFs> = {
      rename: async (a, b) => {
        if (String(b) === target && n < failures) {
          n++;
          throw errno(code);
        }
        return fsp.rename(a, b);
      },
    };
    return { fs, calls: () => n };
  };

  it("EPERM on the first two attempts -> success on the third (backoff 20, 40 ms)", async () => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    const { fs } = failingRename(s.approvalsFile, 2);
    const clock = fakeClock();
    const r = await submit(body("adr-0901", "approved", seen), s.cfg, { fs, clock });
    expect(r.rename_attempts).toBe(3);
    expect(r.rename_retry_codes).toEqual(["EPERM", "EPERM"]);
    expect(clock.sleeps).toEqual([20, 40]);
    expect(readJson(s).approvals["adr-0901"].status).toBe("approved");
    expect(s.dataFiles().filter((f) => /\.tmp-/.test(f))).toEqual([]);
  });

  it("EPERM on the first five attempts -> success on the sixth (backoff 20, 40, 80, 160, 320 ms)", async () => {
    const s = store();
    const { fs } = failingRename(s.approvalsFile, 5);
    const clock = fakeClock();
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { fs, clock });
    expect(r.rename_attempts).toBe(6);
    expect(clock.sleeps).toEqual([20, 40, 80, 160, 320]);
  });

  it.each(["EPERM", "EBUSY", "EACCES"])("six %s failures -> WRITE_FAILED, original intact, temp removed", async (code) => {
    const s = store();
    const seen = await s.hashOf("adr-0901");
    await submit(body("adr-0901", "approved", seen, "orig"), s.cfg);
    const before = s.approvalsBytes()!;
    const { fs, calls } = failingRename(s.approvalsFile, 6, code);
    const clock = fakeClock();
    const e = await expectCode(submit(body("adr-0901", "rejected", seen, "x"), s.cfg, { fs, clock }), "WRITE_FAILED");
    expect(calls()).toBe(6);
    expect(e.details.attempts).toBe(6);
    expect(clock.sleeps).toEqual([...RENAME_BACKOFF_MS]);
    expect(s.approvalsBytes()!.equals(before)).toBe(true);
    expect(s.dataFiles().filter((f) => /\.tmp-|\.lock/.test(f))).toEqual([]);
  });

  it("a non-transient rename error is not retried", async () => {
    const s = store();
    const { fs, calls } = failingRename(s.approvalsFile, 6, "ENOSPC");
    const clock = fakeClock();
    await expectCode(submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { fs, clock }), "WRITE_FAILED");
    expect(calls()).toBe(1);
    expect(clock.sleeps).toEqual([]);
  });
});

describe("lock", () => {
  it("a lock file older than 30 s is broken and the submit succeeds", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    const lockFile = path.join(s.dataDir, ".approvals.lock");
    writeFileSync(lockFile, JSON.stringify({ pid: 99999, started_at: clock.now() - 30_001, nonce: "old" }));
    const stale: unknown[] = [];
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, {
      clock,
      lock: { onStale: (i) => stale.push(i) },
    });
    expect(r.item.state).toBe("APPROVED");
    expect(stale).toHaveLength(1);
    expect(existsSync(lockFile)).toBe(false);
    expect(s.dataFiles().filter((f) => /\.lock|\.stale-/.test(f))).toEqual([]);
  });

  it("a fresh lock held by another holder -> LOCK_TIMEOUT after 3 s (fake clock), the holder's lock untouched", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    const lockFile = path.join(s.dataDir, ".approvals.lock");
    const held = JSON.stringify({ pid: 99999, started_at: clock.now(), nonce: "other" });
    writeFileSync(lockFile, held);
    const t0 = clock.now();
    const e = await expectCode(
      submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { clock }),
      "LOCK_TIMEOUT",
    );
    expect(e.status).toBe(503);
    expect(clock.now() - t0).toBeGreaterThanOrEqual(3000);
    expect(clock.now() - t0).toBeLessThan(3100);
    expect(new Set(clock.sleeps)).toEqual(new Set([50]));
    expect(readFileSync(lockFile, "utf8")).toBe(held);
    expect(s.approvalsBytes()).toBeNull();
  });

  it("a lock that stays younger than 30 s while we wait is never broken (26 s old + 3 s timeout)", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    writeFileSync(
      path.join(s.dataDir, ".approvals.lock"),
      JSON.stringify({ pid: 99999, started_at: clock.now() - 26_000, nonce: "x" }),
    );
    await expectCode(submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { clock, lock: { staleMs: 30_000 } }), "LOCK_TIMEOUT");
  });

  it("Windows delete-pending: EPERM/EACCES/EBUSY on the exclusive create is a busy lock, retried until it succeeds", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    const codes = ["EPERM", "EACCES", "EBUSY"];
    let calls = 0;
    const open = (p: string, f: string) => {
      calls++;
      return calls <= codes.length ? Promise.reject(errno(codes[calls - 1])) : fsp.open(p, f);
    };
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { clock, lock: { open } });
    expect(r.item.state).toBe("APPROVED");
    expect(calls).toBe(4);
    expect(clock.sleeps.filter((ms) => ms === 50)).toHaveLength(3);
    expect(s.dataFiles().filter((f) => /\.lock/.test(f))).toEqual([]);
  });

  it("a lock that stays busy (EPERM) -> LOCK_TIMEOUT after 3 s, never the raw fs error; other open errors are rethrown", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    const t0 = clock.now();
    const e = await expectCode(
      submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { clock, lock: { open: () => Promise.reject(errno("EPERM")) } }),
      "LOCK_TIMEOUT",
    );
    expect(e.status).toBe(503);
    expect(clock.now() - t0).toBeGreaterThanOrEqual(3000);
    expect(clock.now() - t0).toBeLessThan(3100);
    expect(s.approvalsBytes()).toBeNull();
    await expect(
      submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, { clock: fakeClock(), lock: { open: () => Promise.reject(errno("ENOSPC")) } }),
    ).rejects.toMatchObject({ code: "ENOSPC" });
  });

  it("a half-written lock without started_at is judged by its mtime (IP-9): older than 30 s is broken", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    const lockFile = path.join(s.dataDir, ".approvals.lock");
    writeFileSync(lockFile, "{\"pid\": 4");
    const old = (clock.now() - 31_000) / 1000;
    utimesSync(lockFile, old, old);
    const stale: { holder: string }[] = [];
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg, {
      clock,
      lock: { onStale: (i) => stale.push(i) },
    });
    expect(r.item.state).toBe("APPROVED");
    expect(stale.map((i) => i.holder)).toEqual(["pid ?"]);
    expect(s.dataFiles().filter((f) => /\.lock|\.stale-/.test(f))).toEqual([]);
  });

  it("the lock is released after a refused submit", async () => {
    const s = store();
    await expectCode(submit(body("adr-0901", "approved", "sha256:" + "0".repeat(64)), s.cfg), "PAGE_CHANGED");
    expect(s.dataFiles()).toEqual([]);
  });
});

describe("serialisation", () => {
  it("sorted keys, 2-space indent, SCHEMA record order, trailing LF, LF only", async () => {
    const s = store();
    for (const id of ["risk-r91", "adr-0901", "comp-fixture-shell"]) {
      await submit(body(id, "approved", await s.hashOf(id)), s.cfg);
    }
    const text = s.approvalsBytes()!.toString("utf8");
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text.includes("\r")).toBe(false);
    const data = JSON.parse(text) as RawApprovals;
    expect(Object.keys(data.approvals)).toEqual(["adr-0901", "comp-fixture-shell", "risk-r91"]);
    expect(Object.keys(data.approvals["adr-0901"])).toEqual([
      "status",
      "comment",
      "timestamp",
      "path",
      "content_hash",
      "scope_hash",
      "approved_by",
      "history",
      "snapshot",
    ]);
    expect(text).toBe(JSON.stringify(data, null, 2) + "\n");
    expect(text.split("\n")[1]).toBe('  "schema_version": 1,');
    expect(serializeApprovals(data)).toBe(text);
  });
});

describe("log append (PLAN_APPEND_LOG)", () => {
  it("appends one SCHEMA §12 entry; the log keeps ending with exactly one LF and parses cleanly", async () => {
    const s = store({ appendLog: true });
    const before = s.read("log.md");
    const seen = await s.hashOf("adr-0901");
    const r = await submit(body("adr-0901", "changes-requested", seen, 'please "fix"\nline two'), s.cfg);
    expect(r.log_appended).toBe(true);
    expect(r.warnings).toEqual([]);
    const after = s.read("log.md");
    expect(after.startsWith(before)).toBe(true);
    const added = after.slice(before.length);
    const date = (readJson(s).approvals["adr-0901"].timestamp as string).slice(0, 10);
    expect(added).toBe(
      `\n## [${date}] approval | adr-0901 changes-requested\n` +
        `- pages: [adr-0901]\n` +
        `- result: changes-requested by owner via plan app; content_hash ${seen}; comment: "please \\"fix\\" line two"\n`,
    );
    expect(after.endsWith("\n") && !after.endsWith("\n\n")).toBe(true);
    const fm = parseFrontmatterBytes(Buffer.from(after, "utf8"), { repoPath: "wiki/log.md" });
    const parsed = parseLog(fm.body, "wiki/log.md", fm.bodyStartLine);
    expect(parsed.findings).toEqual([]);
    expect(parsed.entries.at(-1)).toMatchObject({ op: "approval", title: "adr-0901 changes-requested" });
  });

  it("a missing log returns LOG_MISSING without creating the file; the approval stands", async () => {
    const s = store({ appendLog: true });
    rmSync(s.file("log.md"));
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg);
    expect(r.log_appended).toBe(false);
    expect(r.warnings.map((w) => w.code)).toEqual(["LOG_MISSING"]);
    expect(existsSync(s.file("log.md"))).toBe(false);
    expect(readJson(s).approvals["adr-0901"].status).toBe("approved");
  });

  it("a log path that cannot be opened for writing gives LOG_APPEND_FAILED, not a throw (IP-9)", async () => {
    const s = store({ appendLog: true });
    const dir = path.join(s.root, "log-is-a-dir");
    mkdirSync(dir);
    const r = await appendApprovalLog(dir, {
      key: "adr-0901",
      status: "approved",
      timestamp: "2026-10-09T14:03:12+05:30",
      contentHash: "sha256:" + "a".repeat(64),
      comment: "",
    });
    expect(r).toMatchObject({ appended: false, warning: "LOG_APPEND_FAILED" });
  });

  it("PLAN_APPEND_LOG=0 leaves the log untouched", async () => {
    const s = store({ appendLog: false });
    const before = s.read("log.md");
    const r = await submit(body("adr-0901", "approved", await s.hashOf("adr-0901")), s.cfg);
    expect(r.log_appended).toBe(false);
    expect(s.read("log.md")).toBe(before);
  });

  it("separator: exactly one blank line before the entry whatever the log ends with", () => {
    expect(separatorFor(Buffer.from("x\n"))).toBe("\n");
    expect(separatorFor(Buffer.from("x\n\n"))).toBe("");
    expect(separatorFor(Buffer.from("x"))).toBe("\n\n");
    expect(separatorFor(Buffer.from("x\r\n"))).toBe("\n");
    expect(separatorFor(Buffer.alloc(0))).toBe("");
  });

  it("comment: first 200 characters, newlines collapsed, quotes escaped; #exit heading", () => {
    expect(logComment("a\r\n  b\n\nc")).toBe("a b c");
    expect(logComment("x".repeat(300))).toHaveLength(200);
    expect(logComment("é".repeat(250))).toBe("é".repeat(200));
    const e = formatApprovalEntry({
      key: "phase-p1-x#exit",
      status: "approved",
      timestamp: "2026-10-09T14:03:12+05:30",
      contentHash: "sha256:" + "a".repeat(64),
      comment: "",
    });
    expect(e.split("\n")[0]).toMatch(LOG_HEADING);
    expect(e).toContain("- pages: [phase-p1-x]\n");
    expect(e.endsWith('comment: ""\n')).toBe(true);
  });
});

describe("readApprovals (IP-9)", () => {
  it("a read error other than ENOENT makes the file invalid (fail closed), never PENDING", async () => {
    const fs = { readFile: (() => Promise.reject(errno("EACCES"))) as unknown as typeof fsp.readFile };
    const r = await readApprovals("C:/nowhere/approvals.json", fs);
    expect(r.exists).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.data).toBeNull();
    expect(r.error).toMatch(/^cannot read: /);
  });
});
