// questions.spec: the Questions tab, a log-like list: open questions first (in file order, which is
// the order of the phase they hold up), then answered, then withdrawn. Each shows why it matters,
// your answer when there is one, and the phases it holds up; the question id opens its explainer.
// Accessible (axe), phone width without sideways scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Questions {
  items: { id: string; question: string; status: "open" | "answered" | "withdrawn"; answer: string | null; blocks: string[] }[];
}
const questions = portalJson<Questions>("questions.json");

test("open questions come first, then answered, then withdrawn", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/questions");
  const shown = await page.locator("[data-question]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question")!));
  const expected = (["open", "answered", "withdrawn"] as const).flatMap((s) => questions.items.filter((q) => q.status === s).map((q) => q.id));
  expect(shown).toEqual(expected);
  await expect(page.locator("section[data-group] > h2")).toHaveText([/^Open \(\d+\)$/, /^Answered \(\d+\)$/, /^Withdrawn \(\d+\)$/]);
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("an answered question shows your answer; the id opens its explainer", async ({ page }) => {
  await page.goto("/questions");
  const answered = questions.items.find((q) => q.status === "answered" && q.answer);
  if (answered) await expect(page.locator(`[data-question="${answered.id}"] .answer`)).toBeVisible();
  const blocking = questions.items.find((q) => q.status === "open" && q.blocks.length > 0);
  if (blocking) await expect(page.locator(`[data-question="${blocking.id}"]`)).toContainText("Holds up:");
  const q = questions.items[0];
  await page.locator(`[data-question="${q.id}"] [data-ref-id="${q.id}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("phone width: no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/questions");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
