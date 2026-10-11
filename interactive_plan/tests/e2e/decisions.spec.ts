// decisions.spec: the Decisions tab ("one pattern for every list", owner's plan of 2026-10-10). Every
// decision is one card (20 per page, newest first), closed at first; replaced decisions are muted and,
// opened, name what replaced them (the name opens its explainer). Below, the risks we watch as cards in
// the same pattern. Accessible (axe), phone width without sideways scrolling, also with cards open.
// Search, filters, sort and pages are tested in browse.spec.ts.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Decisions {
  items: { id: string; number: number; date: string; title: string; status: string; replaced_by: string | null }[];
}
const decisions = portalJson<Decisions>("decisions.json");
const risks = portalJson<{ items: { id: string }[] }>("risks.json");
/** Newest first; the same day keeps the file order, reversed. */
const newest = decisions.items
  .map((d, i) => ({ d, i }))
  .sort((a, b) => (a.d.date === b.d.date ? b.i - a.i : a.d.date < b.d.date ? 1 : -1))
  .map((x) => x.d);

test("one card per decision, newest first, 20 per page; replaced ones are muted and name their replacement", async ({ page }) => {
  const errors = collectErrors(page);
  const pages = Math.ceil(newest.length / 20);
  for (let p = 1; p <= pages; p++) {
    await page.goto(p > 1 ? `/decisions?page=${p}` : "/decisions");
    const onPage = newest.slice((p - 1) * 20, p * 20);
    const cards = page.getByTestId("decision-list").locator("li[data-decision]");
    await expect(cards).toHaveCount(onPage.length);
    expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-decision")))).toEqual(onPage.map((d) => d.id));
    await page.getByTestId("decisions-open-all").click();
    for (const d of onPage) {
      const card = page.locator(`[data-decision="${d.id}"]`);
      await expect(card.locator("summary .acc-title")).toContainText(`#${d.number}`);
      await expect(card).toHaveAttribute("data-status", d.status);
      if (d.replaced_by) {
        await expect(card).toHaveClass(/is-muted/);
        await expect(card.getByTestId("replaced-by").locator(`[data-ref-id="${d.replaced_by}"]`)).toBeVisible();
      } else {
        await expect(card).not.toHaveClass(/is-muted/);
      }
    }
  }
  await page.goto("/decisions");
  await expect(page.getByTestId("risk-list").locator("li[data-risk]")).toHaveCount(Math.min(20, risks.items.length));
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("phone width: no sideways scrolling, also with every card open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/decisions");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByTestId("decisions-open-all").click();
  await page.getByTestId("risks-open-all").click();
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
