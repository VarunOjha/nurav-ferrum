// Effective approval state (ip-testing §1.3; ip-data-contract §8.2; SCHEMA §10.3 truth table and
// the §10.2 bootstrap_hash rule). Unit rows use a minimal in-memory index; the integration rows load
// a temp copy of the mini-wiki and edit files on disk. The real plan/approvals.json is never written.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApprovalsFile, Rec, type ApprovalRecord } from "@/lib/approvals/model";
import {
  countsAsApproved,
  describeApproval,
  effectiveState,
  EFFECTIVE_STATES,
  stateOf,
  type StateIndex,
} from "@/lib/approvals/state";
import { contentHash } from "@/lib/approvals/hash";
import type { WikiPage } from "@/lib/wiki/load";
import { realApprovalsFingerprint, recordFor, tempMiniWiki, type TempWiki } from "./approvals-helpers";

const H = (c: string) => "sha256:" + c.repeat(64);
const C1 = H("1");
const S1 = H("2");
const C2 = H("3");
const S2 = H("4");
const B1 = H("5");
const B2 = H("6");

function fakePage(id: string, o: { type?: string; approvable?: boolean; content?: string | null; scope?: string | null; fm?: boolean; repoPath?: string } = {}): WikiPage {
  return {
    id,
    path: `x/${id}.md`,
    repoPath: o.repoPath ?? `wiki/x/${id}.md`,
    fm: o.fm === false ? null : { id, type: o.type ?? "decision", approvable: o.approvable ?? true },
    contentHash: o.content === undefined ? C1 : o.content,
    scopeHash: o.scope === undefined ? S1 : o.scope,
  } as unknown as WikiPage;
}

function index(pages: WikiPage[], bootstrapHash: string | null = B1): StateIndex {
  return { byId: new Map(pages.map((p) => [p.id!, p])), bootstrapHash };
}

function rec(o: Partial<ApprovalRecord> = {}): ApprovalRecord {
  return Rec.parse({
    status: "approved",
    comment: "",
    timestamp: "2026-10-09T14:03:12+05:30",
    path: "wiki/x/adr-0901.md",
    content_hash: C1,
    scope_hash: S1,
    approved_by: "owner",
    history: [],
    ...o,
  });
}

const idx = index([
  fakePage("adr-0901"),
  fakePage("phase-p1-x", { type: "phase" }),
  fakePage("ov-not-approvable", { approvable: false }),
  fakePage("adr-0902-nofm", { fm: false }),
  fakePage("adr-0903-unhashable", { content: null, scope: null }),
  fakePage("schema", { type: "schema", repoPath: "wiki/SCHEMA.md" }),
]);

describe("effectiveState: SCHEMA §10.3 truth table", () => {
  const rows: [string, string, ApprovalRecord | undefined, string][] = [
    ["no key", "adr-0901", undefined, "PENDING"],
    ["status rejected (hashes match)", "adr-0901", rec({ status: "rejected" }), "REJECTED"],
    ["status changes-requested (hashes match)", "adr-0901", rec({ status: "changes-requested" }), "CHANGES_REQUESTED"],
    ["approved, content hash equal", "adr-0901", rec(), "APPROVED"],
    ["approved, content differs, scope equal", "adr-0901", rec({ content_hash: C2 }), "APPROVED_VOLATILE_DRIFT"],
    ["approved, content and scope differ", "adr-0901", rec({ content_hash: C2, scope_hash: S2 }), "STALE"],
    ["approved, content equal but scope differs (content wins)", "adr-0901", rec({ scope_hash: S2 }), "APPROVED"],
    ["page file missing (no key)", "adr-0999", undefined, "INVALID"],
    ["page file missing (orphaned record)", "adr-0999", rec(), "INVALID"],
    ["approvable: false", "ov-not-approvable", rec(), "INVALID"],
    ["frontmatter invalid (fm null)", "adr-0902-nofm", rec(), "INVALID"],
    ["unhashable page (no closing fence), approved record", "adr-0903-unhashable", rec(), "INVALID"],
    ["unhashable page, no record", "adr-0903-unhashable", undefined, "INVALID"],
    ["#exit key on a non-phase page", "adr-0901#exit", rec(), "INVALID"],
    ["#exit key on a phase page, no record", "phase-p1-x#exit", undefined, "PENDING"],
    ["#exit key on a phase page, approved", "phase-p1-x#exit", rec(), "APPROVED"],
    ["unknown suffix is not an exit key", "phase-p1-x#entry", rec(), "INVALID"],
  ];
  it.each(rows)("%s -> %s", (_label, key, r, want) => {
    expect(effectiveState(key, r, idx)).toBe(want);
  });

  it("countsAsApproved is true only for APPROVED and APPROVED_VOLATILE_DRIFT", () => {
    expect(EFFECTIVE_STATES.filter(countsAsApproved)).toEqual(["APPROVED", "APPROVED_VOLATILE_DRIFT"]);
  });

  it("stateOf looks the key up in an approvals map (own keys only)", () => {
    const approvals = { "adr-0901": rec({ content_hash: C2 }) };
    expect(stateOf("adr-0901", approvals, idx)).toBe("APPROVED_VOLATILE_DRIFT");
    expect(stateOf("phase-p1-x", approvals, idx)).toBe("PENDING");
    expect(stateOf("constructor", approvals, idx)).toBe("INVALID");
  });
});

describe("describeApproval: moved and orphaned flags", () => {
  it("a moved path leaves the state unchanged and sets moved: true", () => {
    const moved = rec({ path: "wiki/old/adr-0901-old-slug.md" });
    const same = rec({ path: "wiki/x/adr-0901.md" });
    const a = describeApproval("adr-0901", moved, idx);
    const b = describeApproval("adr-0901", same, idx);
    expect([a.state, a.moved]).toEqual(["APPROVED", true]);
    expect([b.state, b.moved]).toEqual(["APPROVED", false]);
    expect(describeApproval("adr-0901", rec({ path: "wiki/old/x.md", content_hash: C2, scope_hash: S2 }), idx).state).toBe("STALE");
  });
  it("a stored key with no approvable page is orphaned (INVALID); a missing key is not", () => {
    expect(describeApproval("adr-0999", rec(), idx)).toMatchObject({ state: "INVALID", orphaned: true, page: null });
    expect(describeApproval("adr-0999", undefined, idx)).toMatchObject({ state: "INVALID", orphaned: false });
    expect(describeApproval("adr-0901", undefined, idx)).toMatchObject({ state: "PENDING", orphaned: false, moved: false, rec: null });
  });
});

describe("bootstrap_hash (key `schema`, SCHEMA §10.2)", () => {
  const schemaRec = (o: Partial<ApprovalRecord> = {}) => rec({ path: "wiki/SCHEMA.md", bootstrap_hash: B1, ...o });
  it("CLAUDE.md unchanged -> APPROVED", () => {
    expect(effectiveState("schema", schemaRec(), idx)).toBe("APPROVED");
  });
  it("CLAUDE.md changed -> STALE even when SCHEMA.md content is unchanged", () => {
    expect(effectiveState("schema", schemaRec({ bootstrap_hash: B2 }), idx)).toBe("STALE");
  });
  it("scope-hash drift does not rescue a CLAUDE.md change", () => {
    expect(effectiveState("schema", schemaRec({ bootstrap_hash: B2, content_hash: C2 }), idx)).toBe("STALE");
  });
  it("SCHEMA.md volatile drift with CLAUDE.md unchanged -> APPROVED_VOLATILE_DRIFT", () => {
    expect(effectiveState("schema", schemaRec({ content_hash: C2 }), idx)).toBe("APPROVED_VOLATILE_DRIFT");
  });
  it("CLAUDE.md missing while a bootstrap_hash is stored -> STALE (fail closed)", () => {
    expect(effectiveState("schema", schemaRec(), { ...idx, bootstrapHash: null })).toBe("STALE");
  });
  it("a schema record without bootstrap_hash is judged on the page hashes (as tools/approvals_check.py)", () => {
    expect(effectiveState("schema", rec({ path: "wiki/SCHEMA.md" }), idx)).toBe("APPROVED");
  });
  it("rejected / changes-requested take precedence over the bootstrap check", () => {
    expect(effectiveState("schema", schemaRec({ status: "rejected", bootstrap_hash: B2 }), idx)).toBe("REJECTED");
    expect(effectiveState("schema", schemaRec({ status: "changes-requested", bootstrap_hash: B2 }), idx)).toBe("CHANGES_REQUESTED");
  });
  it("bootstrap_hash on any other key is ignored", () => {
    expect(effectiveState("adr-0901", rec({ bootstrap_hash: B2 }), idx)).toBe("APPROVED");
  });
});

// ---------------------------------------------------------------------------------------------
// Integration on a temp copy of the mini-wiki: real files, real hashes, edits on disk.

describe("integration: temp mini-wiki copy, approvals in a temp data dir", () => {
  let t: TempWiki;
  const realBefore = realApprovalsFingerprint();
  beforeAll(() => {
    t = tempMiniWiki("# Fixture CLAUDE.md\n\nRules.\n");
  });
  afterAll(() => {
    t.cleanup();
    expect(realApprovalsFingerprint(), "real plan/approvals.json must be untouched").toBe(realBefore);
  });

  /** Writes the approvals to <temp>/plan/approvals.json, reads it back and validates it (store.ts comes in IP-4). */
  function persist(approvals: Record<string, ApprovalRecord>) {
    mkdirSync(t.dataDir, { recursive: true });
    const f = path.join(t.dataDir, "approvals.json");
    writeFileSync(f, JSON.stringify({ schema_version: 1, approvals }, null, 2) + "\n");
    expect(path.resolve(f).startsWith(path.resolve(t.root))).toBe(true);
    return ApprovalsFile.parse(JSON.parse(readFileSync(f, "utf8"))).approvals;
  }

  it("APPROVED -> volatile edit -> APPROVED_VOLATILE_DRIFT -> body edit -> STALE", async () => {
    const rel = "decisions/adr-0901-fixture-decision.md";
    let idx = await t.load();
    const approvals = persist({ "adr-0901": recordFor(idx.byId.get("adr-0901")!) });
    expect(stateOf("adr-0901", approvals, idx)).toBe("APPROVED");

    t.edit(rel, "status: proposed\n", "status: accepted\n");
    t.edit(rel, "updated: 2026-10-08\n", "updated: 2026-10-09\n");
    idx = await t.load();
    expect(stateOf("adr-0901", approvals, idx)).toBe("APPROVED_VOLATILE_DRIFT");

    // CRLF checkout of the same content: hashes unchanged (SCHEMA §10.2 N).
    t.write(rel, t.read(rel).replace(/\n/g, "\r\n"));
    idx = await t.load();
    expect(stateOf("adr-0901", approvals, idx)).toBe("APPROVED_VOLATILE_DRIFT");

    t.write(rel, t.read(rel) + "One more body line.\r\n");
    idx = await t.load();
    expect(stateOf("adr-0901", approvals, idx)).toBe("STALE");
  });

  it("bootstrap hash: approve `schema`, change CLAUDE.md in the temp copy -> schema becomes STALE", async () => {
    let idx = await t.load();
    expect(idx.bootstrapHash).toBe(contentHash(readFileSync(path.join(t.root, "CLAUDE.md"))));
    const approvals = persist({ schema: recordFor(idx.byId.get("schema")!, { bootstrapHash: idx.bootstrapHash }) });
    expect(approvals.schema.bootstrap_hash).toBe(idx.bootstrapHash);
    expect(stateOf("schema", approvals, idx)).toBe("APPROVED");

    writeFileSync(path.join(t.root, "CLAUDE.md"), "# Fixture CLAUDE.md\r\n\r\nRules.\r\n"); // EOL only: still equal
    idx = await t.load();
    expect(stateOf("schema", approvals, idx)).toBe("APPROVED");

    writeFileSync(path.join(t.root, "CLAUDE.md"), "# Fixture CLAUDE.md\n\nRules changed.\n");
    idx = await t.load();
    expect(stateOf("schema", approvals, idx)).toBe("STALE");
    expect(idx.byId.get("schema")!.contentHash).toBe(approvals.schema.content_hash); // SCHEMA.md itself unchanged
  });

  it("a renamed page keeps its state and is flagged moved", async () => {
    const idx = await t.load();
    const page = idx.byId.get("comp-fixture-shell")!;
    const approvals = persist({ "comp-fixture-shell": recordFor(page, { path: "wiki/architecture/components/comp-old-slug.md" }) });
    const v = describeApproval("comp-fixture-shell", approvals["comp-fixture-shell"], idx);
    expect([v.state, v.moved]).toEqual(["APPROVED", true]);
  });
});
