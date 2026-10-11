// log.spec: the Log tab (Log mockup, then "one pattern for every list" of 2026-10-10): one card per
// piece of work, newest first, closed at first; the closed line shows the date (and the time of day
// when known). Opened, a card shows what was done, what is next, a decisions table, an approvals table
// and the commit (which opens its explainer). 20 per page. Accessible (axe), phone width without
// sideways scrolling. Search, filters, sort and pages are tested in browse.spec.ts.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Log {
  entries: { id: string; date: string; time?: string; title: string; decisions: unknown[]; approvals: unknown[]; commit: string | null }[];
}
const log = portalJson<Log>("log.json");
/** Newest first: date, then time (timed entries after the untimed ones of their day), then file order; reversed. */
const newest = log.entries
  .map((e, i) => ({ e, i }))
  .sort((a, b) => {
    if (a.e.date !== b.e.date) return a.e.date < b.e.date ? 1 : -1;
    const [ta, tb] = [a.e.time ?? "", b.e.time ?? ""];
    if (ta !== tb) return ta < tb ? 1 : -1;
    return b.i - a.i;
  })
  .map((x) => x.e);
const PAGES = Math.ceil(newest.length / 20);
const pageUrl = (p: number) => (p > 1 ? `/log?page=${p}` : "/log");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

test("entries are shown newest first; opened, each shows done, next, tables and commit", async ({ page }) => {
  const errors = collectErrors(page);
  for (let p = PAGES; p >= 1; p--) {
    await page.goto(pageUrl(p));
    const onPage = newest.slice((p - 1) * 20, p * 20);
    const shown = await page.locator("li[data-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-entry")!));
    expect(shown).toEqual(onPage.map((e) => e.id));
    await page.getByTestId("log-open-all").click();
    for (const e of onPage) {
      const el = page.locator(`[data-entry="${e.id}"]`);
      await expect(el.locator("summary")).toContainText(e.time ? `${short(e.date)} ${e.time}` : short(e.date));
      if (e.commit) await expect(el.locator(`footer [data-ref-id="${e.commit}"]`)).toBeVisible();
      if (!e.decisions.length && !e.approvals.length) await expect(el.locator("footer")).toContainText("No decisions · no approvals");
      else await expect(el.locator(".mini-lines tbody tr")).toHaveCount(e.decisions.length + e.approvals.length);
    }
  }
  const first = page.locator(`[data-entry="${newest[0].id}"]`);
  await expect(first.locator("summary h2")).toHaveText(newest[0].title.replace(/\[([^\]\n]+)\]\(ref:[^)\s]+\)/g, "$1"));
  await expect(first).toContainText("What was done");
  await expect(first).toContainText("What's next");
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("a commit opens its explainer", async ({ page }) => {
  const e = newest.find((x) => x.commit)!;
  await page.goto(pageUrl(Math.floor(newest.indexOf(e) / 20) + 1));
  const card = page.locator(`[data-entry="${e.id}"]`);
  await card.locator("summary").click();
  await card.locator(`footer [data-ref-id="${e.commit}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await expect(page.getByTestId("ref-dialog")).toContainText(e.commit!);
});

test("phone width: no sideways scrolling, also with every card open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/log");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByTestId("log-open-all").click();
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
