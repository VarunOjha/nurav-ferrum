// research.spec: the Research tab in short sections (questions, predictions, experiments,
// measurements, test pages). Each item is one line; its title opens a popup with the details, and the
// related ids inside open their explainers on top. Accessible (axe), phone width without sideways
// scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Item {
  id: string;
  title: string;
  summary: string;
  related: string[];
}
interface Research {
  questions: (Item & { question: string })[];
  hypotheses: (Item & { prediction: string })[];
  experiments: Item[];
  metrics: (Item & { unit: string })[];
  workloads: Item[];
}
const research = portalJson<Research>("research.json");
const SECTIONS: [string, keyof Research][] = [
  ["questions", "questions"],
  ["predictions", "hypotheses"],
  ["experiments", "experiments"],
  ["measurements", "metrics"],
  ["test-pages", "workloads"],
];

test("every section lists every item of research.json", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/research");
  for (const [key, field] of SECTIONS) {
    const section = page.locator(`[data-section="${key}"]`);
    await expect(section.locator("[data-item]")).toHaveCount(research[field].length);
    await expect(section.locator("h2")).toContainText(`(${research[field].length})`);
  }
  await expect(page.locator('[data-section="questions"]')).toContainText(research.questions[0].question);
  await page.getByRole("navigation", { name: "Research sections" }).getByRole("link").nth(3).click();
  await expect(page).toHaveURL(/#measurements$/);
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("an item opens its popup; a related id opens its explainer on top", async ({ page }) => {
  await page.goto("/research");
  const h = research.hypotheses.find((x) => x.related.length > 0)!;
  await page.locator(`[data-item="${h.id}"] .row-title`).click();
  const dialog = page.getByRole("dialog", { name: h.title });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(h.prediction);
  await expectAccessible(page, `#detail-dialog-${h.id}`);
  await dialog.locator(`[data-ref-id="${h.related[0]}"]`).click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("ref-dialog")).toBeHidden();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  const m = research.metrics[0];
  await page.locator(`[data-item="${m.id}"] .row-title`).click();
  await expect(page.getByRole("dialog", { name: m.title })).toContainText(`Unit: ${m.unit}`);
});

test("phone width: no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/research");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
