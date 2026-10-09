// "Diff since approval" (ip-testing §1.3 snapshot diff; ip-routes-and-views §3.11). The snapshot
// is the normalised bytes that were hashed (ip-approvals-api §2.1 step 8). Writing it on approval
// and never overwriting it are store behaviours, tested with store.ts in IP-4 (ip-testing §1.4);
// here the test writes the snapshot file itself, in a temp data dir.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changes, diffLines } from "@/lib/approvals/diff";
import { hashes, normalizeEol } from "@/lib/approvals/hash";
import { realApprovalsFingerprint, tempMiniWiki, type TempWiki } from "./approvals-helpers";

describe("diffLines", () => {
  it("identical texts -> only equal lines", () => {
    expect(changes(diffLines("a\nb\n", "a\nb\n"))).toEqual([]);
    expect(diffLines("", "")).toEqual([]);
  });
  it("reports a replaced line as del + add with line numbers", () => {
    expect(changes(diffLines("a\nb\nc\n", "a\nB\nc\n"))).toEqual([
      { op: "del", text: "b", oldLine: 2 },
      { op: "add", text: "B", newLine: 2 },
    ]);
  });
  it("insertions and deletions at the start, middle and end", () => {
    expect(changes(diffLines("b\nc\n", "a\nb\nc\nd\n"))).toEqual([
      { op: "add", text: "a", newLine: 1 },
      { op: "add", text: "d", newLine: 4 },
    ]);
    expect(changes(diffLines("a\nb\nc\nd\n", "a\nd\n"))).toEqual([
      { op: "del", text: "b", oldLine: 2 },
      { op: "del", text: "c", oldLine: 3 },
    ]);
  });
  it("line endings are normalised on both sides (CRLF checkout is not a change)", () => {
    expect(changes(diffLines(Buffer.from("a\r\nb\r\n"), "a\nb\n"))).toEqual([]);
    expect(changes(diffLines("a\rb\r", Buffer.from("a\nb\n")))).toEqual([]);
  });
  it("equal lines carry both line numbers and the diff reconstructs both sides", () => {
    const a = "x\ny\nz\nw\n";
    const b = "x\nY\nz\nw\nv\n";
    const d = diffLines(a, b);
    expect(d.filter((l) => l.op !== "add").map((l) => l.text).join("\n") + "\n").toBe(a);
    expect(d.filter((l) => l.op !== "del").map((l) => l.text).join("\n") + "\n").toBe(b);
    expect(d.find((l) => l.text === "w")).toEqual({ op: "equal", text: "w", oldLine: 4, newLine: 4 });
  });
});

describe("snapshot diff on a temp-copy page", () => {
  let t: TempWiki;
  const realBefore = realApprovalsFingerprint();
  beforeAll(() => {
    t = tempMiniWiki();
  });
  afterAll(() => {
    t.cleanup();
    expect(realApprovalsFingerprint()).toBe(realBefore);
  });

  it("edit two body lines -> the diff reports exactly those two lines", async () => {
    const rel = "decisions/adr-0901-fixture-decision.md";
    const idx = await t.load();
    const page = idx.byId.get("adr-0901")!;
    // Snapshot as ip-approvals-api §2.1 step 8 defines it: the normalised bytes that were hashed.
    const raw = readFileSync(t.file(rel));
    const hex = page.contentHash!.slice("sha256:".length);
    const snapDir = path.join(t.dataDir, "snapshots", "adr-0901");
    mkdirSync(snapDir, { recursive: true });
    const snapFile = path.join(snapDir, `${hex}.md`);
    writeFileSync(snapFile, normalizeEol(raw));
    expect(hashes(readFileSync(snapFile)).content).toBe(page.contentHash);

    const bodyLines = page.body.split("\n").filter((l) => l.trim() !== "" && !l.startsWith("#"));
    expect(bodyLines.length).toBeGreaterThanOrEqual(2);
    const [l1, l2] = [bodyLines[0], bodyLines[bodyLines.length - 1]];
    t.edit(rel, l1 + "\n", l1 + " (edited)\n");
    t.edit(rel, l2 + "\n", "Replaced line two.\n");

    const d = changes(diffLines(readFileSync(snapFile), readFileSync(t.file(rel))));
    expect(d.filter((l) => l.op === "del").map((l) => l.text)).toEqual([l1, l2]);
    expect(d.filter((l) => l.op === "add").map((l) => l.text)).toEqual([l1 + " (edited)", "Replaced line two."]);
    expect(d).toHaveLength(4);
  });
});
