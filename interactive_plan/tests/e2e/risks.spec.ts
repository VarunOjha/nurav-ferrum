// risks.spec (ip-testing §3): the heatmap cell (L, I) contains the fixture risk id; the register is
// sortable by score. Since IP-8 also: the heatmap is a real table with headers, score bands carry a
// text label, and the "open + mitigating only" toggle (the overlay adds a resolved risk-r92, L1 I2).
import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test("heatmap cell (L3, I4) holds risk-r91; (L1, I2) holds risk-r92; bands are labelled", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/risks");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Risks");
  const heat = page.getByTestId("heatmap");
  await expect(heat.locator("thead th")).toHaveText(["Impact ↓ / Likelihood →", "L1", "L2", "L3", "L4", "L5"]);
  await expect(heat.locator("tbody th[scope='row']")).toHaveText(["I5", "I4", "I3", "I2", "I1"]);
  const cell = page.getByTestId("cell-3-4");
  await expect(cell.getByRole("link", { name: "risk-r91" })).toBeVisible();
  await expect(cell).toHaveAttribute("data-band", "high");
  await expect(cell).toContainText("12");
  await expect(page.getByTestId("cell-1-2").getByRole("link", { name: "risk-r92" })).toBeVisible();
  await expect(page.getByTestId("cell-1-2")).toHaveAttribute("data-band", "low");
  await expect(page.getByTestId("cell-5-5")).toHaveAttribute("data-band", "critical");
  await expect(heat.locator("a")).toHaveCount(2);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("the register is sortable by score (both directions)", async ({ page }) => {
  await page.goto("/risks");
  const order = () => page.getByTestId("risk-register").locator("tbody tr").evaluateAll((els) => els.map((e) => e.getAttribute("data-risk")));
  const scoreTh = page.getByTestId("risk-register").locator("th[data-col='score']");
  // default: score, descending
  await expect(scoreTh).toHaveAttribute("aria-sort", "descending");
  expect(await order()).toEqual(["risk-r91", "risk-r92"]);
  await scoreTh.getByRole("link").click();
  await expect(page).toHaveURL(/sort=score&dir=asc/);
  await expect(page.getByTestId("risk-register").locator("th[data-col='score']")).toHaveAttribute("aria-sort", "ascending");
  expect(await order()).toEqual(["risk-r92", "risk-r91"]);
  await page.getByTestId("risk-register").locator("th[data-col='score']").getByRole("link").click();
  await expect(page).toHaveURL(/sort=score&dir=desc/);
  expect(await order()).toEqual(["risk-r91", "risk-r92"]);
  // another column: id ascending
  await page.getByTestId("risk-register").locator("th[data-col='id']").getByRole("link").click();
  await expect(page.getByTestId("risk-register").locator("th[data-col='id']")).toHaveAttribute("aria-sort", "ascending");
  expect(await order()).toEqual(["risk-r91", "risk-r92"]);
  const row = page.locator("tr[data-risk='risk-r91']");
  await expect(row).toContainText("12 · high");
  await expect(row.getByRole("link", { name: "p1.1" })).toHaveAttribute("href", "/phases/phase-p1-fixture-build#task-p1.1");
});

test("the open + mitigating toggle hides the resolved risk", async ({ page }) => {
  await page.goto("/risks");
  await page.getByRole("link", { name: "Open + mitigating only" }).click();
  await expect(page).toHaveURL(/active=1/);
  await expect(page.getByTestId("risk-register").locator("tbody tr")).toHaveCount(1);
  await expect(page.getByTestId("cell-1-2").locator("a")).toHaveCount(0);
  await page.getByRole("link", { name: "All risks" }).click();
  await expect(page.getByTestId("risk-register").locator("tbody tr")).toHaveCount(2);
});
