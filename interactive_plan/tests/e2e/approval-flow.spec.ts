// approval-flow.spec (ip-testing §3): (1) the inbox shows adr-0901 as PENDING -> (2) open it, Approve
// -> APPROVED -> (3) the record in <tmp>/plan/approvals.json has status approved, both hashes equal the
// Node-computed hashes of the fixture file, approved_by owner and a valid timestamp -> (4) edit only
// status:/updated: -> APPROVED_VOLATILE_DRIFT -> (5) edit the body -> STALE, listed under Stale ->
// (6) Request changes needs a comment; with one -> CHANGES_REQUESTED, history length 1 -> (7) log.md
// gained `approval` entries in the SCHEMA §12 format. Everything happens in the temp fixture copy;
// the files touched are restored afterwards so the other specs see the fixture as shipped.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { hashes } from "../../lib/approvals/hash";
import { e2eEnv, editOnce, FX, LOG_HEADING, readOrNull, realFilesUnchanged, restore, tmpWikiFile } from "./helpers";

const REL = "decisions/adr-0901-fixture-decision.md";
const bar = (page: Page) => page.locator(`[data-testid='approve-bar'][data-key='${FX.adr}']`);
const approvals = () => JSON.parse(readFileSync(e2eEnv().approvalsFile, "utf8")) as { schema_version: number; approvals: Record<string, Record<string, unknown>> };

test.describe.configure({ mode: "serial" });

let saved: { page: Buffer | null; approvals: Buffer | null; log: Buffer | null };

test.beforeAll(() => {
  const env = e2eEnv();
  saved = { page: readOrNull(tmpWikiFile(REL)), approvals: readOrNull(env.approvalsFile), log: readOrNull(env.logFile) };
  expect(saved.page).not.toBeNull();
});

test.afterAll(() => {
  const env = e2eEnv();
  restore(tmpWikiFile(REL), saved.page);
  restore(env.approvalsFile, saved.approvals);
  restore(env.logFile, saved.log);
});

test("(1) the inbox lists adr-0901 as PENDING", async ({ page }) => {
  expect(saved.approvals).toBeNull(); // fresh temp plan/: every key starts PENDING
  await page.goto("/approvals");
  await expect(page.getByRole("link", { name: /Needs attention/ })).toHaveAttribute("aria-current", "page");
  const row = page.locator(`tr[data-key='${FX.adr}']`);
  await expect(row).toHaveAttribute("data-state", "PENDING");
  await expect(row).toContainText("pending");
  await expect(row).toContainText("Fixture decision: one shell");
});

test("(2) open it and Approve: the UI shows APPROVED; (3) the stored record matches the file", async ({ page }) => {
  await page.goto("/approvals");
  await page.locator(`tr[data-key='${FX.adr}'] a`).first().click();
  // since IP-8 an ADR opens in its typed view /decisions/<id>, which carries the approve bar
  await expect(page).toHaveURL(FX.adrView);
  await expect(bar(page)).toHaveAttribute("data-state", "PENDING");
  await bar(page).getByRole("button", { name: "Approve" }).click();
  await expect(bar(page).locator("[aria-live='polite']")).toHaveText(`Page approval for ${FX.adr} recorded: approved`);
  await expect(bar(page)).toHaveAttribute("data-state", "APPROVED");
  await page.reload();
  await expect(bar(page)).toHaveAttribute("data-state", "APPROVED");
  await expect(bar(page).getByTestId("approve-state")).toHaveText("approved");

  const file = approvals();
  expect(file.schema_version).toBe(1);
  const rec = file.approvals[FX.adr];
  const h = hashes(readFileSync(tmpWikiFile(REL)));
  expect(rec.status).toBe("approved");
  expect(rec.content_hash).toBe(h.content);
  expect(rec.scope_hash).toBe(h.scope);
  expect(rec.approved_by).toBe("owner");
  expect(rec.path).toBe(`wiki/${REL}`);
  expect(rec.history).toEqual([]);
  expect(rec.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/);
  expect(Math.abs(Date.parse(rec.timestamp as string) - Date.now())).toBeLessThan(10 * 60_000);
  expect(rec.snapshot).toBe(`plan/snapshots/${FX.adr}/${h.content.slice(7)}.md`);
  // the hashes rendered on the page are the ones stored
  await expect(bar(page).getByTestId("hash-content")).toHaveText(h.content.slice(7, 19));
  expect(Object.keys(file.approvals)).toEqual([FX.adr]);
});

test("(4) editing only status:/updated: gives APPROVED_VOLATILE_DRIFT", async ({ page }) => {
  editOnce(REL, "status: proposed", "status: accepted");
  editOnce(REL, "updated: 2026-10-08", "updated: 2026-10-09");
  await page.goto(FX.adrPath);
  await expect(bar(page)).toHaveAttribute("data-state", "APPROVED_VOLATILE_DRIFT");
  await expect(bar(page).getByTestId("approve-state")).toHaveText("approved – bookkeeping changed");
  await page.goto("/approvals?tab=approved");
  await expect(page.locator(`tr[data-key='${FX.adr}']`)).toHaveAttribute("data-state", "APPROVED_VOLATILE_DRIFT");
});

test("(5) editing the body gives STALE; the inbox lists it under Stale with a diff since approval", async ({ page }) => {
  editOnce(REL, "\nSimple.\n", "\nSimple, and changed after the approval.\n");
  await page.goto(FX.adrPath);
  await expect(bar(page)).toHaveAttribute("data-state", "STALE");
  await expect(bar(page)).toContainText("content changed since");
  await bar(page).getByRole("button", { name: "Diff since approval" }).click();
  const diff = bar(page).getByTestId("approve-diff");
  await expect(diff.locator(".diff-del")).toContainText(["Simple."]);
  await expect(diff.locator(".diff-add")).toContainText(["Simple, and changed after the approval."]);

  await page.goto("/approvals");
  await page.getByRole("link", { name: /^Stale/ }).click();
  await expect(page).toHaveURL(/tab=stale/);
  const row = page.locator(`tr[data-key='${FX.adr}']`);
  await expect(row).toHaveAttribute("data-state", "STALE");
  await expect(row).toContainText("content changed since");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("(6) Request changes needs a comment; with one it records CHANGES_REQUESTED with history 1", async ({ page }) => {
  const before = readFileSync(e2eEnv().approvalsFile);
  await page.goto(FX.adrPath);
  await bar(page).getByRole("button", { name: "Request changes" }).click();
  await expect(bar(page).getByRole("alert")).toHaveText("A comment is required for Request changes and Reject.");
  await expect(bar(page)).toHaveAttribute("data-state", "STALE");
  expect(readFileSync(e2eEnv().approvalsFile).equals(before)).toBe(true);

  await bar(page).getByRole("textbox").fill('Please say why "one shell" still holds');
  await bar(page).getByRole("button", { name: "Request changes" }).click();
  await expect(bar(page).locator("[aria-live='polite']")).toHaveText(`Page approval for ${FX.adr} recorded: changes requested`);
  await expect(bar(page)).toHaveAttribute("data-state", "CHANGES_REQUESTED");
  await page.reload();
  await expect(bar(page)).toHaveAttribute("data-state", "CHANGES_REQUESTED");
  await expect(bar(page).getByText("History (1)")).toBeVisible();

  const rec = approvals().approvals[FX.adr];
  const h = hashes(readFileSync(tmpWikiFile(REL)));
  expect(rec.status).toBe("changes-requested");
  expect(rec.comment).toBe('Please say why "one shell" still holds');
  expect(rec.content_hash).toBe(h.content);
  expect(rec.history).toHaveLength(1);
  expect((rec.history as Record<string, unknown>[])[0]).toMatchObject({ status: "approved", comment: "" });
  expect(rec).not.toHaveProperty("snapshot"); // only approvals write a snapshot

  await page.goto("/approvals?tab=changes");
  await expect(page.locator(`tr[data-key='${FX.adr}']`)).toContainText("Please say why");
});

test("(7) log.md gained approval entries in the SCHEMA §12 format", async () => {
  const env = e2eEnv();
  const text = readFileSync(env.logFile, "utf8");
  const original = saved.log!.toString("utf8");
  expect(text.startsWith(original.replace(/\n+$/, ""))).toBe(true);
  expect(text.endsWith("\n")).toBe(true);
  expect(text.endsWith("\n\n")).toBe(false);
  const added = text.slice(original.length).trim().split("\n");
  const headings = added.filter((l) => l.startsWith("## "));
  expect(headings).toHaveLength(2);
  for (const h of headings) expect(h).toMatch(LOG_HEADING);
  expect(headings[0]).toMatch(/^## \[\d{4}-\d{2}-\d{2}\] approval \| adr-0901 approved$/);
  expect(headings[1]).toMatch(/^## \[\d{4}-\d{2}-\d{2}\] approval \| adr-0901 changes-requested$/);
  expect(added.filter((l) => l === "- pages: [adr-0901]")).toHaveLength(2);
  const results = added.filter((l) => l.startsWith("- result: "));
  expect(results[0]).toMatch(/^- result: approved by owner via plan app; content_hash sha256:[0-9a-f]{64}; comment: ""$/);
  expect(results[1]).toContain('comment: "Please say why \\"one shell\\" still holds"');
});

test("the server wrote only the temp copy: the real plan/approvals.json, log.md and STATUS.md are unchanged", () => {
  const env = e2eEnv();
  expect(env.approvalsFile).not.toContain(process.cwd());
  for (const r of realFilesUnchanged()) expect(r, r.path).toEqual({ path: r.path, same: true });
});
