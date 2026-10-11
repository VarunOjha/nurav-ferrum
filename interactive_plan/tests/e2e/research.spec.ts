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

// Review 2026-10-11: each kind has one status today, so the Status filter would repeat the Kind filter
// and the closed line would show two chips that mean the same. The status sits in the opened card.
test("no Status filter while it follows the kind; the status is in the opened card, not the closed line", async ({ page }) => {
  await page.goto("/research");
  await expect(page.getByTestId("research-browse").getByLabel("Status", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("research-browse").getByLabel("Kind", { exact: true })).toBeVisible();
  const first = page.locator("li[data-item]").first();
  const id = await first.getAttribute("data-item");
  const item = KINDS.flatMap(([k]) => research[k] as unknown as { id: string; status: string }[]).find((i) => i.id === id)!;
  await expect(first.locator("summary")).not.toContainText(item.status);
  await first.locator("summary").click();
  await expect(first.getByTestId("research-status")).toHaveText(`Status: ${item.status}`);
});

test("a kind link keeps search and sort, marks the chosen kind, and a second click shows every kind", async ({ page }) => {
  await page.goto("/research?q=memory&sort=az&page=2");
  const nav = page.getByRole("navigation", { name: "Research kinds" });
  const measure = nav.getByRole("link", { name: /^Measure/ });
  await measure.click();
  const params = () => Object.fromEntries(new URL(page.url()).searchParams);
  await expect.poll(params).toEqual({ q: "memory", sort: "az", category: "Measure" });
  await expect(measure).toHaveAttribute("aria-current", "true");
  await expect(nav.locator("[aria-current]")).toHaveCount(1);
  await expect(page.getByTestId("research-browse").getByLabel("Kind", { exact: true })).toHaveValue("Measure");
  await expect(page.getByTestId("research-browse").getByLabel("Search the research items")).toHaveValue("memory");
  await measure.click();
  await expect.poll(params).toEqual({ q: "memory", sort: "az" });
  await expect(nav.locator("[aria-current]")).toHaveCount(0);
});

test("Newest first on a list without dates says it follows the written order", async ({ page }) => {
  await page.goto("/research");
  await expect(page.getByTestId("research-sort-note")).toHaveCount(0);
  await page.getByTestId("research-browse").getByLabel("Sort").selectOption("newest");
  await expect(page.getByTestId("research-sort-note")).toHaveText("The research items have no date, so this shows the last written first.");
  await page.goto("/decisions?risk-sort=oldest");
  await expect(page.getByTestId("risks-sort-note")).toHaveText("The risks have no date, so this shows the first written first.");
  await expect(page.getByTestId("decisions-sort-note")).toHaveCount(0);
});
