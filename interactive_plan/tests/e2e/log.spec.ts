// log.spec: the Log tab (Log mockup): one entry per piece of work, newest first, with what was done,
// what is next, a decisions table, an approvals table and the commit (which opens its explainer).
// 20 entries per page. The "Show" filter keeps only entries with decisions or with approvals (search,
// the other filters and pages are tested in browse.spec.ts). Accessible (axe), phone width without
// sideways scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Log {
  entries: { id: string; date: string; title: string; decisions: unknown[]; approvals: unknown[]; commit: string | null }[];
}
const log = portalJson<Log>("log.json");
const newest = [...log.entries].map((e, i) => ({ e, i })).sort((a, b) => (a.e.date === b.e.date ? b.i - a.i : a.e.date < b.e.date ? 1 : -1)).map((x) => x.e);
const PAGES = Math.ceil(newest.length / 20);
const pageUrl = (p: number) => (p > 1 ? `/log?page=${p}` : "/log");

test("entries are shown newest first with done, next, tables and commit", async ({ page }) => {
  const errors = collectErrors(page);
  for (let p = PAGES; p >= 1; p--) {
    await page.goto(pageUrl(p));
    const onPage = newest.slice((p - 1) * 20, p * 20);
    const shown = await page.locator("article[data-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")!));
    expect(shown).toEqual(onPage.map((e) => e.id));
    for (const e of onPage) {
      const el = page.locator(`[data-entry="${e.id}"]`);
      if (e.commit) await expect(el.locator(`footer [data-ref-id="${e.commit}"]`)).toBeVisible();
      if (!e.decisions.length && !e.approvals.length) await expect(el.locator("footer")).toContainText("No decisions · no approvals");
      else await expect(el.locator(".mini-lines tbody tr")).toHaveCount(e.decisions.length + e.approvals.length);
    }
  }
  const first = page.locator(`[data-entry="${newest[0].id}"]`);
  await expect(first.locator("h2")).toHaveText(newest[0].title);
  await expect(first).toContainText("What was done");
  await expect(first).toContainText("What's next");
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("the Show filter keeps only entries with decisions, or with approvals", async ({ page }) => {
  await page.goto("/log");
  const visible = page.locator("article[data-entry]:visible");
  const firstPage = (n: number) => Math.min(20, n);
  await expect(visible).toHaveCount(firstPage(log.entries.length));
  const show = page.getByLabel("Show", { exact: true });
  await show.selectOption({ label: "Has decisions" });
  const withDecisions = newest.filter((e) => e.decisions.length);
  await expect(visible).toHaveCount(firstPage(withDecisions.length));
  for (const id of await visible.evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")!))) expect(withDecisions.map((e) => e.id)).toContain(id);
  await show.selectOption({ label: "Has approvals" });
  await expect(visible).toHaveCount(firstPage(newest.filter((e) => e.approvals.length).length));
  await expect(page.getByTestId("log-count")).toContainText(`(${log.entries.length} in all)`);
  await show.selectOption({ label: "All entries" });
  await expect(visible).toHaveCount(firstPage(log.entries.length));
});

test("a commit opens its explainer", async ({ page }) => {
  const e = newest.find((x) => x.commit)!;
  await page.goto(pageUrl(Math.floor(newest.indexOf(e) / 20) + 1));
  await page.locator(`[data-entry="${e.id}"] footer [data-ref-id="${e.commit}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await expect(page.getByTestId("ref-dialog")).toContainText(e.commit!);
});

test("phone width: no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/log");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
