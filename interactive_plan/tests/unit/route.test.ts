// ip-testing §1.5: route adapter. The handlers are called directly with Request objects against
// temp directories; every ip-approvals-api §2.2 error code is reached with its HTTP status. The
// real plan/approvals.json is fingerprinted before and after and must be untouched.
import { existsSync, rmSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handleGet, handlePost } from "@/lib/approvals/api";
import { ERROR_CODES, ERROR_STATUS, type ApprovalErrorCode } from "@/lib/approvals/errors";
import { HashError } from "@/lib/approvals/hash";
import type { StoreDeps, StoreFs } from "@/lib/approvals/store";
import type { ApprovalsView } from "@/lib/approvals/view";
import { realApprovalsFingerprint } from "./approvals-helpers";
import { errno, fakeClock, tempStore, type TempStore } from "./store-helpers";

const P = 3417;
const BASE = `http://127.0.0.1:${P}/api/approvals`;
const HEADERS = { host: `127.0.0.1:${P}`, origin: `http://127.0.0.1:${P}`, "content-type": "application/json" };

let fingerprint: string;
beforeAll(() => {
  fingerprint = realApprovalsFingerprint();
});
afterAll(() => {
  expect(realApprovalsFingerprint()).toBe(fingerprint);
});

let stores: TempStore[] = [];
const store = (o?: Parameters<typeof tempStore>[0]) => {
  const s = tempStore(o);
  stores.push(s);
  return s;
};
afterEach(() => {
  for (const s of stores) s.cleanup();
  stores = [];
});

const postReq = (b: unknown, headers: Record<string, string> = HEADERS) =>
  new Request(BASE, { method: "POST", headers, body: typeof b === "string" ? b : JSON.stringify(b) });
const getReq = (qs = "", headers: Record<string, string> = { host: `127.0.0.1:${P}` }) =>
  new Request(BASE + qs, { method: "GET", headers });

async function post(s: TempStore, b: unknown, deps: StoreDeps = {}, headers?: Record<string, string>) {
  const res = await handlePost(postReq(b, headers), s.cfg, deps);
  return { status: res.status, json: (await res.json()) as Record<string, unknown>, res };
}
const codeOf = (j: Record<string, unknown>) => (j.error as { code: string } | undefined)?.code;

/**
 * The HTTP status of every error code, written out independently of lib/approvals/errors.ts (IP-9
 * review: comparing against ERROR_STATUS compared the code with itself). Must equal the
 * ip-approvals-api §2.2 table, which schema-sync.test.ts parses.
 */
const EXPECTED_STATUS: Record<ApprovalErrorCode, number> = {
  FORBIDDEN_ORIGIN: 403,
  READ_ONLY: 403,
  BAD_REQUEST: 400,
  UNSUPPORTED_MEDIA_TYPE: 415,
  COMMENT_REQUIRED: 400,
  UNKNOWN_KEY: 404,
  NOT_APPROVABLE: 422,
  NOT_A_PHASE: 422,
  EXIT_NOT_READY: 409,
  UNHASHABLE: 422,
  PAGE_CHANGED: 409,
  APPROVALS_FILE_INVALID: 500,
  LOCK_TIMEOUT: 503,
  WRITE_FAILED: 500,
};

it("ERROR_STATUS equals the literal status table", () => {
  expect(ERROR_STATUS).toEqual(EXPECTED_STATUS);
});

const reached = new Map<ApprovalErrorCode, number>();
function expectError(r: { status: number; json: Record<string, unknown> }, code: ApprovalErrorCode) {
  expect(codeOf(r.json), JSON.stringify(r.json)).toBe(code);
  expect(r.status).toBe(EXPECTED_STATUS[code]);
  const err = r.json.error as Record<string, unknown>;
  expect(Object.keys(err).sort()).toEqual(["code", "details", "message"]);
  expect(typeof err.message).toBe("string");
  reached.set(code, r.status);
}

const approve = async (s: TempStore, id: string, extra: Record<string, unknown> = {}) => ({
  key: id,
  status: "approved",
  comment: "",
  seen_content_hash: await s.hashOf(id),
  ...extra,
});

describe("POST: every §2.2 error code is reachable with its HTTP status", () => {
  it("FORBIDDEN_ORIGIN 403 (bad Host, missing Origin)", async () => {
    const s = store();
    const b = await approve(s, "adr-0901");
    expectError(await post(s, b, {}, { ...HEADERS, host: `evil.example:${P}` }), "FORBIDDEN_ORIGIN");
    const { origin: _o, ...noOrigin } = HEADERS;
    void _o;
    expectError(await post(s, b, {}, noOrigin), "FORBIDDEN_ORIGIN");
    expect(s.dataFiles()).toEqual([]);
  });

  it("READ_ONLY 403 when PLAN_READONLY=1", async () => {
    const s = store({ readonly: true });
    expectError(await post(s, await approve(s, "adr-0901")), "READ_ONLY");
    expect(existsSync(s.dataDir)).toBe(false);
  });

  it("UNSUPPORTED_MEDIA_TYPE 415", async () => {
    const s = store();
    expectError(await post(s, await approve(s, "adr-0901"), {}, { ...HEADERS, "content-type": "text/plain" }), "UNSUPPORTED_MEDIA_TYPE");
  });

  it.each([
    ["status pending", { status: "pending" }],
    ["status changes_requested (underscore)", { status: "changes_requested", comment: "x" }],
    ["unknown field", { extra: 1 }],
    ["bad key", { key: "Bad Key" }],
    ["bad hash", { seen_content_hash: "sha256:xyz" }],
    ["comment too long", { comment: "x".repeat(4001) }],
    ["seen_bootstrap_hash on a non-schema key", { seen_bootstrap_hash: "sha256:" + "a".repeat(64) }],
  ])("BAD_REQUEST 400: %s", async (_n, over) => {
    const s = store();
    expectError(await post(s, { ...(await approve(s, "adr-0901")), ...over }), "BAD_REQUEST");
    expect(s.dataFiles()).toEqual([]);
  });

  it("BAD_REQUEST 400: invalid JSON, body over 16 KiB, schema without seen_bootstrap_hash", async () => {
    const s = store();
    expectError(await post(s, "{not json"), "BAD_REQUEST");
    expectError(await post(s, JSON.stringify({ pad: "x".repeat(17 * 1024) })), "BAD_REQUEST");
    expectError(await post(s, await approve(s, "schema")), "BAD_REQUEST");
  });

  it("COMMENT_REQUIRED 400 for changes-requested / rejected with an empty or blank comment", async () => {
    const s = store();
    for (const status of ["changes-requested", "rejected"]) {
      for (const comment of ["", "  \n\t"]) {
        expectError(await post(s, { ...(await approve(s, "adr-0901")), status, comment }), "COMMENT_REQUIRED");
      }
    }
  });

  it("UNKNOWN_KEY 404", async () => {
    const s = store();
    expectError(await post(s, { ...(await approve(s, "adr-0901")), key: "adr-0999" }), "UNKNOWN_KEY");
  });

  it("NOT_APPROVABLE 422 (approvable: false; broken frontmatter)", async () => {
    const s = store();
    expectError(await post(s, await approve(s, "glossary")), "NOT_APPROVABLE");
    const seen = await s.hashOf("adr-0901");
    s.edit("decisions/adr-0901-fixture-decision.md", "type: decision", "type: no-such-type");
    expectError(await post(s, { key: "adr-0901", status: "approved", comment: "", seen_content_hash: seen }), "NOT_APPROVABLE");
  });

  it("NOT_A_PHASE 422 for #exit on a non-phase page", async () => {
    const s = store();
    expectError(await post(s, { ...(await approve(s, "adr-0901")), key: "adr-0901#exit" }), "NOT_A_PHASE");
  });

  it("EXIT_NOT_READY 409 unless the phase is gate-review or done", async () => {
    const s = store();
    expectError(
      await post(s, { ...(await approve(s, "phase-p0-fixture-plan")), key: "phase-p0-fixture-plan#exit" }),
      "EXIT_NOT_READY",
    );
    s.edit("phases/phase-p0-fixture-plan.md", "status: in-progress", "status: done");
    const ok = await post(s, { ...(await approve(s, "phase-p0-fixture-plan")), key: "phase-p0-fixture-plan#exit" });
    expect(ok.status).toBe(200);
  });

  it("UNHASHABLE 422 (hash failure injected; schema with CLAUDE.md missing)", async () => {
    const s = store();
    const deps: StoreDeps = {
      hashes: () => {
        throw new HashError("NO_CLOSING_FENCE");
      },
    };
    expectError(await post(s, await approve(s, "adr-0901"), deps), "UNHASHABLE");
    const boot = (await s.bootstrapHash())!;
    const b = await approve(s, "schema", { seen_bootstrap_hash: boot });
    rmSync(path.join(s.root, "CLAUDE.md"));
    expectError(await post(s, b), "UNHASHABLE");
    expect(s.approvalsBytes()).toBeNull();
  });

  it("PAGE_CHANGED 409 (page hash; CLAUDE.md hash for schema) with the current hashes", async () => {
    const s = store();
    const r = await post(s, { ...(await approve(s, "adr-0901")), seen_content_hash: "sha256:" + "0".repeat(64) });
    expectError(r, "PAGE_CHANGED");
    const cur = (r.json.error as { details: { current: { content_hash: string; scope_hash: string } } }).details.current;
    expect(cur.content_hash).toBe(await s.hashOf("adr-0901"));
    const r2 = await post(s, await approve(s, "schema", { seen_bootstrap_hash: "sha256:" + "1".repeat(64) }));
    expectError(r2, "PAGE_CHANGED");
    expect(s.approvalsBytes()).toBeNull();
  });

  it("APPROVALS_FILE_INVALID 500", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    writeFileSync(s.approvalsFile, "[]");
    expectError(await post(s, await approve(s, "adr-0901")), "APPROVALS_FILE_INVALID");
    expect(s.approvalsBytes()!.toString()).toBe("[]");
  });

  it("LOCK_TIMEOUT 503 (lock held, fake clock)", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    const clock = fakeClock();
    writeFileSync(path.join(s.dataDir, ".approvals.lock"), JSON.stringify({ pid: 1, started_at: clock.now(), nonce: "n" }));
    expectError(await post(s, await approve(s, "adr-0901"), { clock }), "LOCK_TIMEOUT");
  });

  it("WRITE_FAILED 500 (rename failure injected)", async () => {
    const s = store();
    const fs: Partial<StoreFs> = {
      rename: async (a, b) => {
        if (String(b) === s.approvalsFile) throw errno("EIO");
        return fsp.rename(a, b);
      },
    };
    expectError(await post(s, await approve(s, "adr-0901"), { fs }), "WRITE_FAILED");
    expect(s.approvalsBytes()).toBeNull();
  });

  it("covers every code of ip-approvals-api §2.2", () => {
    expect([...reached.keys()].sort()).toEqual([...ERROR_CODES].sort());
  });
});

describe("POST success", () => {
  it("200 {item} in GET item shape, JSON, no CORS headers", async () => {
    const s = store();
    const r = await post(s, { ...(await approve(s, "adr-0901")), comment: "ok" });
    expect(r.status).toBe(200);
    expect(r.res.headers.get("content-type")).toMatch(/^application\/json/);
    expect([...r.res.headers.keys()].filter((k) => k.startsWith("access-control-"))).toEqual([]);
    const item = r.json.item as Record<string, unknown>;
    expect(item).toMatchObject({ key: "adr-0901", id: "adr-0901", exit: false, type: "decision", state: "APPROVED", counts_as_approved: true, moved: false });
    expect(Object.keys(item).sort()).toEqual(
      ["key", "id", "exit", "type", "title", "path", "page_status", "current", "record", "state", "counts_as_approved", "moved"].sort(),
    );
    expect(r.json.log_appended).toBeUndefined(); // appendLog off in this store
  });

  it("with PLAN_APPEND_LOG: log_appended true; a missing log gives log_appended false + LOG_MISSING warning", async () => {
    const s = store({ appendLog: true });
    const r = await post(s, await approve(s, "adr-0901"));
    expect(r.json.log_appended).toBe(true);
    rmSync(s.file("log.md"));
    const r2 = await post(s, await approve(s, "risk-r91"));
    expect(r2.status).toBe(200);
    expect(r2.json.log_appended).toBe(false);
    expect((r2.json.warnings as { code: string }[]).map((w) => w.code)).toEqual(["LOG_MISSING"]);
  });

  it("changes-requested and rejected give CHANGES_REQUESTED and REJECTED", async () => {
    const s = store();
    const a = await post(s, { ...(await approve(s, "adr-0901")), status: "changes-requested", comment: "fix" });
    expect((a.json.item as { state: string }).state).toBe("CHANGES_REQUESTED");
    const b = await post(s, { ...(await approve(s, "adr-0901")), status: "rejected", comment: "no" });
    expect((b.json.item as { state: string }).state).toBe("REJECTED");
  });
});

describe("GET", () => {
  const get = async (s: TempStore, qs = "", headers?: Record<string, string>) => {
    const res = await handleGet(getReq(qs, headers), s.cfg);
    return { status: res.status, json: (await res.json()) as ApprovalsView & Record<string, unknown> };
  };

  it("lists every approvable key (+ #exit for phases) as PENDING when approvals.json is missing; no side effects", async () => {
    const s = store();
    const r = await get(s);
    expect(r.status).toBe(200);
    expect(r.json.schema_version).toBe(1);
    expect(r.json.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(r.json.file).toMatchObject({ exists: false, valid: true, error: null });
    expect(r.json.readonly).toBe(false);
    const keys = r.json.items.map((i) => i.key);
    const ids = [...(await s.approvableIds()), "schema"].sort();
    const phases = ids.filter((id) => id.startsWith("phase-"));
    expect(keys.sort()).toEqual([...ids, ...phases.map((p) => `${p}#exit`)].sort());
    expect(r.json.items.every((i) => i.state === "PENDING" && i.record === null)).toBe(true);
    expect(r.json.counts.PENDING).toBe(keys.length);
    expect(r.json.orphans).toEqual([]);
    expect(existsSync(s.dataDir)).toBe(false);
  });

  it("shows stored records, states, orphans and filters (key, state, phase)", async () => {
    const s = store();
    await post(s, await approve(s, "adr-0901"));
    await post(s, { ...(await approve(s, "risk-r91")), status: "rejected", comment: "no" });
    const data = JSON.parse(s.approvalsBytes()!.toString());
    data.approvals["adr-0999"] = { ...data.approvals["adr-0901"], path: "wiki/decisions/gone.md" };
    writeFileSync(s.approvalsFile, JSON.stringify(data, null, 2) + "\n");
    s.write("decisions/adr-0901-fixture-decision.md", s.read("decisions/adr-0901-fixture-decision.md") + "More.\n");

    const all = await get(s);
    const byKey = new Map(all.json.items.map((i) => [i.key, i]));
    expect(byKey.get("adr-0901")!.state).toBe("STALE");
    expect(byKey.get("risk-r91")!.state).toBe("REJECTED");
    expect(byKey.get("adr-0901")!.record).toEqual(data.approvals["adr-0901"]);
    expect(all.json.orphans.map((o) => o.key)).toEqual(["adr-0999"]);
    expect(all.json.counts.STALE).toBe(1);

    const one = await get(s, "?key=risk-r91");
    expect(one.json.items.map((i) => i.key)).toEqual(["risk-r91"]);
    const st = await get(s, "?state=STALE,rejected");
    expect(st.json.items.map((i) => i.key).sort()).toEqual(["adr-0901", "risk-r91"]);
    expect(st.json.counts).toMatchObject({ STALE: 1, REJECTED: 1, PENDING: 0 });
    const ph = await get(s, "?phase=phase-p1-fixture-build");
    expect(ph.json.items.length).toBeGreaterThan(0);
    const idx = await s.load();
    const phaseOf = (id: string) => (idx.byId.get(id)?.fm as { phase?: string } | null)?.phase;
    for (const it of ph.json.items) {
      expect(it.id === "phase-p1-fixture-build" || phaseOf(it.id) === "phase-p1-fixture-build", it.key).toBe(true);
    }
    const expected = all.json.items.filter((i) => i.id === "phase-p1-fixture-build" || phaseOf(i.id) === "phase-p1-fixture-build");
    expect(ph.json.items.map((i) => i.key)).toEqual(expected.map((i) => i.key));
    expect(ph.json.items.map((i) => i.key)).toContain("phase-p1-fixture-build#exit");
  });

  it("an invalid approvals.json shows every state as INVALID", async () => {
    const s = store();
    await fsp.mkdir(s.dataDir, { recursive: true });
    writeFileSync(s.approvalsFile, "{ broken");
    const r = await get(s);
    expect(r.json.file).toMatchObject({ exists: true, valid: false });
    expect(r.json.file.error).toMatch(/invalid JSON/);
    expect(r.json.items.every((i) => i.state === "INVALID" && !i.counts_as_approved)).toBe(true);
  });

  it("passes the Host guard (403 for a foreign Host), reports readonly", async () => {
    const s = store({ readonly: true });
    const bad = await get(s, "", { host: `evil.example:${P}` });
    expect(bad.status).toBe(403);
    expect(codeOf(bad.json)).toBe("FORBIDDEN_ORIGIN");
    expect((await get(s)).json.readonly).toBe(true);
  });
});

describe("app/api/approvals/route.ts", () => {
  const KEYS = ["PLAN_REPO_ROOT", "PLAN_WIKI_DIR", "PLAN_STATUS_FILE", "PLAN_DATA_DIR", "PLAN_APPEND_LOG", "PLAN_READONLY", "PLAN_PORT"];
  let saved: Record<string, string | undefined> = {};
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    saved = {};
  });

  it("exports only GET, POST, runtime=nodejs and dynamic=force-dynamic (no PUT/PATCH/DELETE/OPTIONS)", async () => {
    const mod = (await import("@/app/api/approvals/route")) as Record<string, unknown>;
    expect(Object.keys(mod).sort()).toEqual(["GET", "POST", "dynamic", "runtime"]);
    expect(mod.runtime).toBe("nodejs");
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("binds the handlers to the environment config (temp dirs only)", async () => {
    const s = store();
    for (const k of KEYS) saved[k] = process.env[k];
    Object.assign(process.env, {
      PLAN_REPO_ROOT: s.root,
      PLAN_WIKI_DIR: s.wikiDir,
      PLAN_STATUS_FILE: s.cfg.statusFile,
      PLAN_DATA_DIR: s.dataDir,
      PLAN_APPEND_LOG: "0",
      PLAN_READONLY: "0",
      PLAN_PORT: String(P),
    });
    const { GET, POST } = await import("@/app/api/approvals/route");
    const res = await POST(postReq(await approve(s, "adr-0901")));
    expect(res.status).toBe(200);
    expect(JSON.parse(s.approvalsBytes()!.toString()).approvals["adr-0901"].status).toBe("approved");
    const g = await GET(getReq("?key=adr-0901"));
    const view = (await g.json()) as ApprovalsView;
    expect(view.items[0].state).toBe("APPROVED");
    process.env.PLAN_READONLY = "1";
    const ro = await POST(postReq(await approve(s, "adr-0901")));
    expect(ro.status).toBe(403);
    expect(((await ro.json()) as { error: { code: string } }).error.code).toBe("READ_ONLY");
  });
});
