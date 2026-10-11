// research.spec: the Research tab ("one pattern for every list", owner's plan of 2026-10-10): the five
// lists of research.json (questions, predictions, experiments, measures, test sites) are one list of
// cards in phase order; the kind is each card's category, and the kind links under the heading count
// each kind. Opened, a card shows its details (the question, the prediction, the unit) and its related
// ids. Accessible (axe), phone width without sideways scrolling. Search, filters, sort and pages are
// tested in browse.spec.ts.
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
const KINDS: [keyof Research, string][] = [
  ["questions", "Research question"],
  ["hypotheses", "Prediction"],
  ["experiments", "Experiment"],
  ["metrics", "Measure"],
  ["workloads", "Test site"],
];
const total = KINDS.reduce((n, [k]) => n + research[k].length, 0);

test("every item of research.json is in the one list; the kind links count each kind", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/research");
  const seen = new Set<string>();
  const pages = Math.ceil(total / 20);
  for (let p = 1; p <= pages; p++) {
    await page.goto(p > 1 ? `/research?page=${p}` : "/research");
    for (const id of await page.locator("li[data-item]").evaluateAll((els) => els.map((e) => e.getAttribute("data-item")!))) seen.add(id);
  }
  expect(seen.size).toBe(total);
  for (const [k] of KINDS) for (const i of research[k]) expect(seen.has(i.id), i.id).toBe(true);
  await page.goto("/research");
  const links = page.getByRole("navigation", { name: "Research kinds" }).getByRole("link");
  await expect(links).toHaveText(KINDS.map(([k, kind]) => `${kind} (${research[k].length})`));
  await expect(page.getByRole("heading", { name: `Research plan (${total})` })).toBeVisible();
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("an opened question shows the question; a measure shows its unit", async ({ page }) => {
  await page.goto("/research?category=Research+question");
  const q = research.questions[0];
  const card = page.locator(`[data-item="${q.id}"]`);
  await card.locator("summary").click();
  await expect(card.locator(".acc-body")).toContainText("The question");
  await page.goto("/research?category=Measure");
  const m = research.metrics[0];
  const mc = page.locator(`[data-item="${m.id}"]`);
  await mc.locator("summary").click();
  await expect(mc.getByTestId("research-meta")).toContainText(`Unit: ${m.unit}`);
});

test("phone width: no sideways scrolling, also with every card open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/research");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByTestId("research-open-all").click();
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});
