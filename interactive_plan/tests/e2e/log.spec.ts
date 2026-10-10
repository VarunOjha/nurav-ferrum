// log.spec: the Log tab (Log mockup): one entry per piece of work, newest first, with what was done,
// what is next, a decisions table, an approvals table and the commit (which opens its explainer).
// The filter shows only entries with decisions or with approvals. Accessible (axe), phone width
// without sideways scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Log {
  entries: { id: string; date: string; title: string; decisions: unknown[]; approvals: unknown[]; commit: string | null }[];
}
const log = portalJson<Log>("log.json");
const newest = [...log.entries].map((e, i) => ({ e, i })).sort((a, b) => (a.e.date === b.e.date ? b.i - a.i : a.e.date < b.e.date ? 1 : -1)).map((x) => x.e);

test("entries are shown newest first with done, next, tables and commit", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/log");
  const shown = await page.locator("article[data-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")!));
  expect(shown).toEqual(newest.map((e) => e.id));
  const first = page.locator(`[data-entry="${newest[0].id}"]`);
  await expect(first.locator("h2")).toHaveText(newest[0].title);
  await expect(first).toContainText("What was done");
  await expect(first).toContainText("What's next");
  for (const e of newest) {
    const el = page.locator(`[data-entry="${e.id}"]`);
    if (e.commit) await expect(el.locator(`footer [data-ref-id="${e.commit}"]`)).toBeVisible();
    if (!e.decisions.length && !e.approvals.length) await expect(el.locator("footer")).toContainText("No decisions · no approvals");
    else await expect(el.locator(".mini-lines tbody tr")).toHaveCount(e.decisions.length + e.approvals.length);
  }
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("the filter keeps only entries with decisions, or with approvals", async ({ page }) => {
  await page.goto("/log");
  const visible = page.locator("article[data-entry]:visible");
  await expect(visible).toHaveCount(log.entries.length);
  await page.getByRole("button", { name: "Has decisions" }).click();
  await expect(page.getByRole("button", { name: "Has decisions" })).toHaveAttribute("aria-pressed", "true");
  await expect(visible).toHaveCount(log.entries.filter((e) => e.decisions.length).length);
  await page.getByRole("button", { name: "Has approvals" }).click();
  await expect(visible).toHaveCount(log.entries.filter((e) => e.approvals.length).length);
  await expect(page.getByTestId("log-count")).toContainText(`of ${log.entries.length} entries`);
  await page.getByRole("button", { name: "All" }).click();
  await expect(visible).toHaveCount(log.entries.length);
});

test("a commit opens its explainer", async ({ page }) => {
  await page.goto("/log");
  const e = newest.find((x) => x.commit)!;
  await page.locator(`[data-entry="${e.id}"] footer [data-ref-id="${e.commit}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await expect(page.getByTestId("ref-dialog")).toContainText(e.commit!);
});

test("phone width: no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/log");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
