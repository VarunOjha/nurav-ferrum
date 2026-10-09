// approval-race.spec (ip-testing §3): load a page, modify its file on disk, then click Approve -> the
// 409 PAGE_CHANGED message is shown and approvals.json is unchanged (the owner approved what they saw,
// so a file that changed in between is refused, ip-approvals-api §2.1 step 5). Temp copy only; the
// page file is restored afterwards.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { hashes } from "../../lib/approvals/hash";
import { e2eEnv, editOnce, FX, PAGE_CHANGED_TEXT, readOrNull, realFilesUnchanged, restore, tmpWikiFile } from "./helpers";

const REL = "overview/ov-fixture-project.md";
const KEY = "ov-fixture-project";

let saved: { page: Buffer | null; approvals: Buffer | null; log: Buffer | null };

test.beforeAll(() => {
  const env = e2eEnv();
  saved = { page: readOrNull(tmpWikiFile(REL)), approvals: readOrNull(env.approvalsFile), log: readOrNull(env.logFile) };
});

test.afterAll(() => {
  const env = e2eEnv();
  restore(tmpWikiFile(REL), saved.page);
  restore(env.approvalsFile, saved.approvals);
  restore(env.logFile, saved.log);
});

test("a file changed after the page was rendered is refused with 409 and nothing is written", async ({ page }) => {
  const env = e2eEnv();
  await page.goto(FX.projectPath);
  const bar = page.locator(`[data-testid='approve-bar'][data-key='${KEY}']`);
  await expect(bar).toHaveAttribute("data-state", "PENDING");
  const rendered = hashes(readFileSync(tmpWikiFile(REL)));
  await expect(bar.getByTestId("hash-content")).toHaveText(rendered.content.slice(7, 19));

  // The owner is still reading; meanwhile the file changes on disk.
  const body = readFileSync(tmpWikiFile(REL), "utf8");
  const lastLine = body.trimEnd().split("\n").pop()!;
  editOnce(REL, lastLine, `${lastLine}\n\nA sentence added on disk after the page was rendered.`);
  const approvalsBefore = readOrNull(env.approvalsFile);
  const logBefore = readOrNull(env.logFile);

  const posted = page.waitForResponse((r) => r.url().endsWith("/api/approvals") && r.request().method() === "POST");
  await bar.getByRole("button", { name: "Approve" }).click();
  const res = await posted;
  expect(res.status()).toBe(409);
  const json = (await res.json()) as { error: { code: string; details: { current: { content_hash: string } } } };
  expect(json.error.code).toBe("PAGE_CHANGED");
  expect(json.error.details.current.content_hash).toBe(hashes(readFileSync(tmpWikiFile(REL))).content);
  await expect(bar.getByRole("alert")).toHaveText(PAGE_CHANGED_TEXT);
  await expect(bar).toHaveAttribute("data-state", "PENDING");

  // approvals.json (and the log) are unchanged byte for byte (absent stays absent).
  const approvalsAfter = readOrNull(env.approvalsFile);
  expect(approvalsAfter === null ? null : approvalsAfter.toString("utf8")).toBe(approvalsBefore === null ? null : approvalsBefore.toString("utf8"));
  expect(readOrNull(env.logFile)!.equals(logBefore!)).toBe(true);

  // After a reload the new version shows its new hash and can be reviewed again.
  await page.reload();
  await expect(bar.getByTestId("hash-content")).toHaveText(hashes(readFileSync(tmpWikiFile(REL))).content.slice(7, 19));
  for (const r of realFilesUnchanged()) expect(r, r.path).toEqual({ path: r.path, same: true });
});
