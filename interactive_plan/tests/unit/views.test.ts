// IP-7 view models (ip-routes-and-views §3.1, §3.4, §3.11, §3.12): dashboard strip/progress/last
// activity/blockers, inbox tabs/eligibility/wave/grouping/review cursor, phase exit-bar visibility and
// evidence checks, lint grouping, and the server snapshot diff. All on the mini-wiki fixture or temp
// copies; the real plan/approvals.json is only fingerprinted.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { hashes, normalizeEol } from "@/lib/approvals/hash";
import { getView, type ApprovalItem } from "@/lib/approvals/view";
import { approveBarProps, barRecord } from "@/lib/server/approveBar";
import { snapshotDiff } from "@/lib/server/snapshot";
import { approvalsMap, blockers, lastActivity, nextPhaseId, PHASE_COUNT, phaseStrip, progress, stateCounts } from "@/lib/views/dashboard";
import {
  chooseTab,
  eligibleItems,
  filterItems,
  groupByPhase,
  isTab,
  lastDecision,
  needsAttentionCount,
  reviewCursor,
  TABS,
  WAVE_DEFAULT_THRESHOLD,
  waveKeys,
  wavePhase,
} from "@/lib/views/inbox";
import { evidenceChecks, exitBarVisible, groupFindings, riskScore } from "@/lib/views/phase";
import type { LogEntry } from "@/lib/wiki/log";
import { FIXTURES, loadMini, MINI_STATUS, MINI_WIKI } from "./helpers";
import { realApprovalsFingerprint, tempMiniWiki } from "./approvals-helpers";

const realBefore = realApprovalsFingerprint();
const tmpRoots: string[] = [];
afterAll(() => {
  for (const r of tmpRoots) rmSync(r, { recursive: true, force: true });
  expect(realApprovalsFingerprint()).toBe(realBefore);
});

function emptyDataDir(): string {
  const d = mkdtempSync(path.join(os.tmpdir(), "ip7 views "));
  tmpRoots.push(d);
  return d;
}

async function miniView() {
  const dataDir = emptyDataDir();
  return getView({
    wikiDir: MINI_WIKI,
    statusFile: MINI_STATUS,
    repoRoot: FIXTURES,
    dataDir,
    approvalsFile: path.join(dataDir, "approvals.json"),
    readonly: false,
  });
}

const it2 = (over: Partial<ApprovalItem> & { key: string }): ApprovalItem => ({
  id: over.key.replace(/#exit$/, ""),
  exit: over.key.endsWith("#exit"),
  type: "overview",
  title: over.key,
  path: `wiki/${over.key}.md`,
  page_status: "draft",
  current: { content_hash: null, scope_hash: null },
  record: null,
  state: "PENDING",
  counts_as_approved: false,
  moved: false,
  ...over,
});

const log = (over: Partial<LogEntry>): LogEntry => ({
  date: "2026-10-01",
  op: "code",
  title: "x",
  pages: [],
  sources: [],
  stales: [],
  line: 1,
  raw: "",
  ...over,
});

describe("dashboard view model", () => {
  it("phase strip in order, progress over 9 phases and the sessions budget", async () => {
    const idx = await loadMini();
    const cells = phaseStrip(idx);
    expect(cells.map((c) => [c.id, c.order, c.status, c.milestone, c.est_sessions])).toEqual([
      ["phase-p0-fixture-plan", 0, "in-progress", null, 1],
      ["phase-p1-fixture-build", 1, "planned", "M1", 2],
    ]);
    expect(progress(cells)).toEqual({ done: 0, total: PHASE_COUNT, sessionsDone: 0, sessionsTotal: 3 });
    const done = cells.map((c, i) => ({ ...c, status: i === 0 ? "done" : c.status }));
    expect(progress(done)).toEqual({ done: 1, total: 9, sessionsDone: 1, sessionsTotal: 3 });
    expect(nextPhaseId(idx, "phase-p0-fixture-plan")).toBe("phase-p1-fixture-build");
    expect(nextPhaseId(idx, "phase-p1-fixture-build")).toBeNull();
    expect(nextPhaseId(idx, "nope")).toBeNull();
  });

  it("last activity is the newest code entry naming a task id", async () => {
    const idx = await loadMini();
    expect(lastActivity(idx.log)?.task).toBe("p0.1");
    expect(lastActivity([log({ title: "p0.2 a" }), log({ op: "lint", title: "p0.9 b" }), log({ title: "no task", raw: "see p1.3" })])?.task).toBe("p1.3");
    expect(lastActivity([log({ title: "nothing" }), log({ op: "plan", title: "p0.1" })])).toBeNull();
  });

  it("blockers: STATUS blocked_on, blocked phases, open questions, STALE keys of the current/next dependency set", async () => {
    const idx = await loadMini();
    const items = [it2({ key: "adr-0901", state: "STALE" }), it2({ key: "risk-r91", state: "STALE" }), it2({ key: "schema", state: "APPROVED" })];
    const b = blockers(idx, items);
    expect(b.map((x) => `${x.kind}:${x.id}`)).toEqual(["status:Q-901", "question:Q-901", "stale:adr-0901"]);
    expect(b[0].text).toBe("Should the shell be one process?");
    expect(b[1].text).toContain("blocks phase-p1-fixture-build");
    // a blocked phase is listed
    const p1 = idx.byId.get("phase-p1-fixture-build")!;
    const blockedIdx = { ...idx, pages: idx.pages.map((p) => (p === p1 ? { ...p, fm: { ...p.fm!, status: "blocked" } as typeof p.fm } : p)) };
    expect(blockers(blockedIdx, []).map((x) => x.kind)).toContain("phase");
    // no STATUS: nothing from STATUS, nothing stale (no current phase)
    expect(blockers({ ...idx, status: null }, items).map((x) => x.kind)).toEqual(["question"]);
  });

  it("state counts and the approvals map", () => {
    const c = stateCounts([it2({ key: "a" }), it2({ key: "b", state: "STALE" }), it2({ key: "c", state: "STALE" })]);
    expect(c).toEqual({ PENDING: 1, APPROVED: 0, APPROVED_VOLATILE_DRIFT: 0, STALE: 2, CHANGES_REQUESTED: 0, REJECTED: 0, INVALID: 0 });
    expect(approvalsMap({ valid: false, data: null })).toEqual({});
    expect(approvalsMap({ valid: true, data: { approvals: { x: { a: 1 } } } })).toEqual({ x: { a: 1 } });
  });
});

describe("inbox view model", () => {
  it("lists every approvable key; #exit keys only when eligible", async () => {
    const view = await miniView();
    expect(view.items).toHaveLength(16);
    const eligible = eligibleItems(view.items);
    expect(eligible).toHaveLength(14);
    expect(eligible.some((i) => i.exit)).toBe(false);
    expect(needsAttentionCount(view.items)).toBe(14);
    expect(eligibleItems([it2({ key: "p#exit", page_status: "gate-review" }), it2({ key: "q#exit", page_status: "planned", record: { status: "approved" } })])).toHaveLength(2);
  });

  it("tabs filter by state; the wave tab by the next phase's dependency set", async () => {
    const idx = await loadMini();
    expect(wavePhase(idx)).toBe("phase-p1-fixture-build");
    const wave = waveKeys(idx);
    expect([...wave].sort()).toEqual(["adr-0901", "comp-fixture-content", "comp-fixture-shell", "exp-fixture-startup", "phase-p1-fixture-build", "schema"]);
    const items = [
      it2({ key: "adr-0901" }),
      it2({ key: "x", state: "STALE" }),
      it2({ key: "y", state: "CHANGES_REQUESTED" }),
      it2({ key: "z", state: "APPROVED" }),
      it2({ key: "w", state: "APPROVED_VOLATILE_DRIFT" }),
      it2({ key: "r", state: "REJECTED" }),
      it2({ key: "i", state: "INVALID" }),
    ];
    const keys = (t: (typeof TABS)[number]["id"]) => filterItems(items, t, wave).map((i) => i.key);
    expect(keys("needs")).toEqual(["adr-0901", "x", "y"]);
    expect(keys("all")).toHaveLength(7);
    expect(keys("pending")).toEqual(["adr-0901"]);
    expect(keys("stale")).toEqual(["x"]);
    expect(keys("changes")).toEqual(["y"]);
    expect(keys("approved")).toEqual(["z", "w"]);
    expect(keys("rejected")).toEqual(["r"]);
    expect(keys("invalid")).toEqual(["i"]);
    expect(keys("wave")).toEqual(["adr-0901"]);
    // the last phase is its own wave phase; no STATUS -> no wave
    expect(wavePhase({ ...idx, status: { ...idx.status!, current_phase: "phase-p1-fixture-build" } })).toBe("phase-p1-fixture-build");
    expect(waveKeys({ ...idx, status: null }).size).toBe(0);
  });

  it("chooses the tab from ?tab, then ?state, else needs attention (the wave when that list is long)", () => {
    const wave = new Set(["a"]);
    const few = [it2({ key: "a" })];
    const many = Array.from({ length: WAVE_DEFAULT_THRESHOLD + 1 }, (_, i) => it2({ key: `k${i}` }));
    expect(chooseTab({ tab: "rejected" }, few, wave)).toBe("rejected");
    expect(chooseTab({ tab: "bogus", state: "stale" }, few, wave)).toBe("stale");
    expect(chooseTab({ state: "APPROVED_VOLATILE_DRIFT" }, few, wave)).toBe("approved");
    expect(chooseTab({ state: "NOPE" }, few, wave)).toBe("needs");
    expect(chooseTab({}, many, wave)).toBe("wave");
    expect(chooseTab({}, many, new Set())).toBe("needs");
    expect(isTab("wave")).toBe(true);
    expect(isTab(null)).toBe(false);
  });

  it("groups by phase in phase order, Cross-cutting last", async () => {
    const view = await miniView();
    const idx = await loadMini();
    const groups = groupByPhase(idx, eligibleItems(view.items));
    expect(groups.map((g) => g.phase)).toEqual(["phase-p0-fixture-plan", "phase-p1-fixture-build", null]);
    const of = (p: string | null) => groups.find((g) => g.phase === p)!.items.map((i) => i.key).sort();
    expect(of("phase-p0-fixture-plan")).toEqual(["phase-p0-fixture-plan", "schema"]);
    expect(of("phase-p1-fixture-build")).toEqual(["adr-0901", "comp-fixture-content", "comp-fixture-shell", "exp-fixture-startup", "phase-p1-fixture-build"]);
    expect(groups.at(-1)!.title).toBe("Cross-cutting");
    expect(of(null)).toContain("risk-r91");
    expect(groupByPhase(idx, [])).toEqual([]);
  });

  it("review cursor and last decision", () => {
    expect(reviewCursor(0, "0")).toBeNull();
    expect(reviewCursor(3, null)).toEqual({ i: 0, prev: null, next: 1 });
    expect(reviewCursor(3, "1")).toEqual({ i: 1, prev: 0, next: 2 });
    expect(reviewCursor(3, "99")).toEqual({ i: 2, prev: 1, next: null });
    expect(reviewCursor(3, "-1")).toEqual({ i: 0, prev: null, next: 1 });
    expect(lastDecision(null)).toBeNull();
    expect(lastDecision({ status: "approved", timestamp: "t", comment: " a\n b " })).toEqual({ status: "approved", timestamp: "t", comment: "a b" });
    expect(lastDecision({ status: "rejected", comment: "x".repeat(100) })!.comment).toHaveLength(80);
  });
});

describe("phase view model and lint grouping", () => {
  it("exit bar visibility", () => {
    expect(exitBarVisible("planned", false)).toBe(false);
    expect(exitBarVisible("in-progress", false)).toBe(false);
    expect(exitBarVisible("gate-review", false)).toBe(true);
    expect(exitBarVisible("done", false)).toBe(true);
    expect(exitBarVisible("planned", true)).toBe(true);
    expect(exitBarVisible(null, false)).toBe(false);
  });

  it("evidence paths are checked under raw/evidence/<phase-id>/", () => {
    const files = new Set(["raw/evidence/phase-p9-x/a.txt", "raw/evidence/other/b.txt"]);
    expect(evidenceChecks("phase-p9-x", ["a.txt", "raw/evidence/phase-p9-x/a.txt#x", "raw/evidence/other/b.txt", "missing.txt", "../a.txt"], files)).toEqual([
      { entry: "a.txt", path: "raw/evidence/phase-p9-x/a.txt", exists: true, outside: false },
      { entry: "raw/evidence/phase-p9-x/a.txt#x", path: "raw/evidence/phase-p9-x/a.txt", exists: true, outside: false },
      { entry: "raw/evidence/other/b.txt", path: "raw/evidence/other/b.txt", exists: true, outside: true },
      { entry: "missing.txt", path: "raw/evidence/phase-p9-x/missing.txt", exists: false, outside: false },
      { entry: "../a.txt", path: "raw/evidence/phase-p9-x/../a.txt", exists: false, outside: false },
    ]);
    expect(riskScore(3, 4)).toBe(12);
  });

  it("groups findings by severity, then code", () => {
    const f = (code: string, severity: "error" | "warn" | "info") => ({ code, severity, path: "wiki/x.md", message: "m" });
    const g = groupFindings([f("ORPHAN", "warn"), f("REF-DANGLING", "error"), f("FM-MISSING", "error"), f("REF-DANGLING", "error"), f("GIT", "info")]);
    expect(g.map((x) => [x.severity, x.count, x.codes.map((c) => `${c.code}:${c.findings.length}`)])).toEqual([
      ["error", 3, ["FM-MISSING:1", "REF-DANGLING:2"]],
      ["warn", 1, ["ORPHAN:1"]],
      ["info", 1, ["GIT:1"]],
    ]);
    expect(groupFindings([])).toEqual([]);
  });
});

describe("snapshot diff and approve-bar props (server, temp copies)", () => {
  it("diffs the recorded snapshot against the current file; notes a missing snapshot", async () => {
    const t = tempMiniWiki();
    tmpRoots.push(t.root);
    const rel = "decisions/adr-0901-fixture-decision.md";
    const before = Buffer.from(t.read(rel));
    const h = hashes(before);
    const hex = h.content.slice(7);
    mkdirSync(path.join(t.dataDir, "snapshots", "adr-0901"), { recursive: true });
    writeFileSync(path.join(t.dataDir, "snapshots", "adr-0901", `${hex}.md`), normalizeEol(before));
    t.edit(rel, "One shell.", "Two shells after all.");
    const cfg = { dataDir: t.dataDir, repoRoot: t.root, wikiDir: t.wikiDir };
    const rec = { status: "approved", snapshot: `plan/snapshots/adr-0901/${hex}.md`, timestamp: "2026-10-09T10:00:00+05:30" };
    const item = it2({ key: "adr-0901", state: "STALE", record: rec, path: `wiki/${rel}` });
    const d = await snapshotDiff(item, cfg);
    expect(d!.note).toBeNull();
    expect(d!.lines!.map((l) => `${l.op}:${l.text}`)).toEqual(["del:One shell.", "add:Two shells after all."]);

    expect(await snapshotDiff({ ...item, state: "APPROVED" }, cfg)).toBeNull();
    const none = await snapshotDiff({ ...item, record: { status: "approved" } }, cfg);
    expect(none).toEqual({ lines: null, note: `No snapshot was recorded with this approval. If git history exists: git log -p --follow -- wiki/${rel}` });
    const bad = await snapshotDiff({ ...item, record: { snapshot: "plan/snapshots/../../x.md" } }, cfg);
    expect(bad!.lines).toBeNull();
    const gone = await snapshotDiff({ ...item, record: { snapshot: `plan/snapshots/adr-0901/${"0".repeat(64)}.md` } }, cfg);
    expect(gone!.note).toMatch(/could not be read/);

    const props = await approveBarProps(item, "Page approval", { ...cfg, readonly: true }, "sha256:" + "1".repeat(64));
    expect(props).toMatchObject({ itemKey: "adr-0901", label: "Page approval", state: "STALE", readonly: true, bootstrapHash: undefined });
    expect(props.diff!.lines).toHaveLength(2);
    const schemaProps = await approveBarProps(it2({ key: "schema" }), "Page approval", { ...cfg, readonly: false }, "sha256:" + "1".repeat(64));
    expect(schemaProps.bootstrapHash).toBe("sha256:" + "1".repeat(64));
    expect(schemaProps.diff).toBeNull();
  });

  it("barRecord keeps only what the bar shows", () => {
    expect(barRecord(null)).toBeNull();
    expect(barRecord({ status: "approved", comment: 3, history: [{ status: "rejected", x: 1 }, null] })).toEqual({
      status: "approved",
      comment: undefined,
      timestamp: undefined,
      history: [{ status: "rejected", comment: undefined, timestamp: undefined }, { status: undefined, comment: undefined, timestamp: undefined }],
    });
    expect(barRecord({ status: "approved" })!.history).toEqual([]);
  });
});
