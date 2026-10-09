// exit-approval.spec (ip-testing §3): the exit bar is hidden for a `planned` phase; for the
// `gate-review` fixture phase (tests/fixtures/e2e-overlay) it is shown, and approving writes the key
// `<phase-id>#exit`. Plus the phase detail sections (entry gate, tasks, test gate evidence ✓/✗).
// Temp copy only; approvals.json and log.md are restored afterwards.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { hashes } from "../../lib/approvals/hash";
import { e2eEnv, readOrNull, realFilesUnchanged, restore, tmpWikiFile } from "./helpers";

const PLANNED = "phase-p1-fixture-build";
const REVIEW = "phase-p2-fixture-review";

let saved: { approvals: Buffer | null; log: Buffer | null };

test.beforeAll(() => {
  const env = e2eEnv();
  saved = { approvals: readOrNull(env.approvalsFile), log: readOrNull(env.logFile) };
});

test.afterAll(() => {
  const env = e2eEnv();
  restore(env.approvalsFile, saved.approvals);
  restore(env.logFile, saved.log);
});

test("the exit bar is hidden for a planned phase; the page bar is shown", async ({ page, request, baseURL }) => {
  await page.goto(`/phases/${PLANNED}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture P1");
  await expect(page.locator(`[data-testid='approve-bar'][data-key='${PLANNED}#exit']`)).toHaveCount(0);
  await expect(page.getByTestId("exit-closed")).toContainText("opens when the phase reaches gate-review");
  await expect(page.locator(`[data-testid='approve-bar'][data-key='${PLANNED}']`)).toHaveAttribute("data-state", "PENDING");
  // the API refuses the exit key too (status planned)
  const h = hashes(readFileSync(tmpWikiFile("phases/phase-p1-fixture-build.md")));
  const res = await request.post("/api/approvals", {
    headers: { Origin: baseURL!, "Content-Type": "application/json" },
    data: { key: `${PLANNED}#exit`, status: "approved", comment: "", seen_content_hash: h.content },
  });
  expect(res.status()).toBe(409);
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe("EXIT_NOT_READY");
  expect(readOrNull(e2eEnv().approvalsFile)?.toString("utf8") ?? null).toBe(saved.approvals?.toString("utf8") ?? null);
});

test("the phase view shows the entry gate, tasks and the test gate with evidence checks", async ({ page }) => {
  await page.goto(`/phases/${REVIEW}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture P2 in gate review");
  const gate = page.getByTestId("entry-gate");
  await expect(gate.locator("li[data-check='dependencies-done']")).toHaveAttribute("data-ok", "false");
  await expect(gate.locator("li[data-check='dependencies-done']")).toContainText(PLANNED);
  await expect(page.getByTestId("gate-result")).toHaveText("blocked");
  await expect(page.getByTestId("tasks")).toContainText("Collect the exit evidence");
  const ev = page.getByTestId("evidence").locator("li");
  await expect(ev).toHaveCount(2);
  await expect(ev.nth(0)).toHaveAttribute("data-exists", "true");
  await expect(ev.nth(0).getByRole("link", { name: "e2e-exit.txt" })).toHaveAttribute("href", `/wiki/raw/evidence/${REVIEW}/e2e-exit.txt`);
  await expect(ev.nth(1)).toHaveAttribute("data-exists", "false");
  await expect(ev.nth(1)).toContainText("✗ missing");
  await expect(page.locator("section[aria-labelledby='risks-title']")).toContainText("risk-r91 Fixture risk: slow startup L3×I4 = 12");
});

test("a gate-review phase shows the exit bar; approving writes <phase-id>#exit", async ({ page }) => {
  await page.goto(`/phases/${REVIEW}`);
  const exitBar = page.locator(`[data-testid='approve-bar'][data-key='${REVIEW}#exit']`);
  await expect(exitBar).toBeVisible();
  await expect(exitBar.getByRole("heading", { name: "Milestone exit" })).toBeVisible();
  await expect(exitBar).toHaveAttribute("data-state", "PENDING");
  await exitBar.getByRole("button", { name: "Approve" }).click();
  await expect(exitBar.locator("[aria-live='polite']")).toHaveText(`Milestone exit for ${REVIEW}#exit recorded: approved`);
  await page.reload();
  await expect(exitBar).toHaveAttribute("data-state", "APPROVED");
  // the page key itself is untouched
  await expect(page.locator(`[data-testid='approve-bar'][data-key='${REVIEW}']`)).toHaveAttribute("data-state", "PENDING");

  const file = JSON.parse(readFileSync(e2eEnv().approvalsFile, "utf8")) as { approvals: Record<string, Record<string, unknown>> };
  const rec = file.approvals[`${REVIEW}#exit`];
  const h = hashes(readFileSync(tmpWikiFile(`phases/${REVIEW}.md`)));
  expect(rec).toMatchObject({ status: "approved", approved_by: "owner", content_hash: h.content, scope_hash: h.scope, path: `wiki/phases/${REVIEW}.md` });
  expect(rec.snapshot).toBe(`plan/snapshots/${REVIEW}__exit/${h.content.slice(7)}.md`);
  expect(file.approvals).not.toHaveProperty(REVIEW);

  // the inbox lists the eligible exit key as approved
  await page.goto("/approvals?tab=approved");
  await expect(page.locator(`tr[data-key='${REVIEW}#exit']`)).toHaveAttribute("data-state", "APPROVED");
  for (const r of realFilesUnchanged()) expect(r, r.path).toEqual({ path: r.path, same: true });
});
