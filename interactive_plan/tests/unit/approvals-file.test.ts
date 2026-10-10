// lib/approvals/file.ts: reading plan/approvals.json (read-only; the portal and the wiki check).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readApprovals } from "@/lib/approvals/file";

const dir = mkdtempSync(path.join(os.tmpdir(), "ferrum approvals "));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const file = (name: string, text: string) => {
  const p = path.join(dir, name);
  writeFileSync(p, text);
  return p;
};
const H = "sha256:" + "a".repeat(64);

describe("readApprovals", () => {
  it("a missing file reads as the empty, valid file", async () => {
    expect(await readApprovals(path.join(dir, "absent.json"))).toEqual({ exists: false, valid: true, error: null, data: { schema_version: 1, approvals: {} } });
  });

  it("invalid JSON and a wrong shape are reported, never thrown", async () => {
    const bad = await readApprovals(file("bad.json", "{ nope"));
    expect(bad.valid).toBe(false);
    expect(bad.error).toMatch(/^invalid JSON/);
    const shape = await readApprovals(file("shape.json", JSON.stringify({ schema_version: 2, approvals: {} })));
    expect(shape.valid).toBe(false);
    expect(shape.error).toMatch(/^schema: schema_version/);
  });

  it("an unreadable path is reported", async () => {
    const r = await readApprovals(dir);
    expect(r).toMatchObject({ exists: true, valid: false, data: null });
    expect(r.error).toMatch(/^cannot read/);
  });

  it("a valid file is returned as stored, unknown fields kept", async () => {
    const rec = { status: "approved", comment: "", timestamp: "2026-10-09T10:00:00Z", path: "wiki/x.md", content_hash: H, scope_hash: H, approved_by: "owner", history: [], recorded_by: "claude" };
    const r = await readApprovals(file("ok.json", JSON.stringify({ schema_version: 1, approvals: { "adr-0001": rec } })));
    expect(r.valid).toBe(true);
    expect(r.data?.approvals["adr-0001"].recorded_by).toBe("claude");
  });
});
