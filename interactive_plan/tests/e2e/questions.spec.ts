// questions.spec: the Questions tab ("one pattern for every list", owner's plan of 2026-10-10). It
// starts on the open questions, newest first (date asked, then time when known, then the order of the
// questions page, reversed). Opened, a card shows its id (which opens its explainer), the phases it
// holds up, why it matters and your answer. Accessible (axe), phone width without sideways scrolling.
// Status, search, filters, sort and pages are tested in browse.spec.ts.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Questions {
  items: { id: string; asked: string; time?: string; question: string; status: "open" | "answered" | "withdrawn"; answer: string | null; blocks: string[] }[];
}
const questions = portalJson<Questions>("questions.json");
const openNewest = questions.items
  .map((q, i) => ({ q, i }))
  .filter((x) => x.q.status === "open")
  .sort((a, b) => {
    if (a.q.asked !== b.q.asked) return a.q.asked < b.q.asked ? 1 : -1;
    const [ta, tb] = [a.q.time ?? "", b.q.time ?? ""];
    if (ta !== tb) return ta < tb ? 1 : -1;
    return b.i - a.i;
  })
  .map((x) => x.q);

test("open questions first, newest first, 20 per page", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/questions");
  const shown = await page.locator("li[data-question]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question")!));
  expect(shown).toEqual(openNewest.slice(0, 20).map((q) => q.id));
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("an opened question shows why it matters and what it holds up; the id opens its explainer", async ({ page }) => {
  // A question that holds up a phase when one is on the first page, else the newest open one; when no
  // question is open, the newest question of all (shown with "Any status").
  const q = openNewest.slice(0, 20).find((x) => x.blocks.length > 0) ?? openNewest[0] ?? questions.items[questions.items.length - 1];
  await page.goto(openNewest.length > 0 ? "/questions" : "/questions?status=any");
  const card = page.locator(`[data-question="${q.id}"]`);
  await card.locator("summary").click();
  await expect(card.locator(".acc-body")).toContainText("Why it matters");
  if (q.blocks.length > 0) await expect(card.locator(".acc-body")).toContainText("Holds up:");
  await card.locator(`.acc-body [data-ref-id="${q.id}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  // The newest answered question, so it is on the first page of the answered list.
  const answered = questions.items.findLast((x) => x.status === "answered" && x.answer);
  if (answered) {
    await page.goto("/questions?status=answered");
    const a = page.locator(`[data-question="${answered.id}"]`);
    await a.locator("summary").click();
    await expect(a.locator(".answer")).toBeVisible();
  }
});

test("phone width: no sideways scrolling, also with every card open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/questions");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByTestId("questions-open-all").click();
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
