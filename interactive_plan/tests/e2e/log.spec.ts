// log.spec (ip-testing §3): entries newest-first, the op filter works, a malformed heading appears as a
// LOG-FORMAT finding. Plus the chronological toggle and the RESUME "last 5" view (ip-routes-and-views §3.10).
import { expect, test } from "@playwright/test";

const dates = (page: import("@playwright/test").Page) => page.locator(".day-title time").allTextContents();

test("entries are newest first by default", async ({ page }) => {
  await page.goto("/log");
  expect(await dates(page)).toEqual(["2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);
  const lines = await page.locator("li.entry").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-line"))));
  expect(lines).toEqual([...lines].sort((a, b) => b - a));
});

test("the chronological toggle reverses the order", async ({ page }) => {
  await page.goto("/log");
  await page.getByRole("link", { name: "Chronological" }).click();
  await expect(page).toHaveURL(/order=oldest/);
  expect(await dates(page)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
});

test("the op filter works", async ({ page }) => {
  await page.goto("/log");
  await page.getByLabel("Op").selectOption("code");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/op=code/);
  const ops = await page.locator("li.entry").evaluateAll((els) => els.map((e) => e.getAttribute("data-op")));
  expect(ops).toEqual(["code", "code"]);
  await expect(page.locator(".entry-title")).toHaveText(["p0.2 fixture views", "p0.1 fixture loader"]);
});

test("clicking an op chip filters by that op; session and page filters work", async ({ page }) => {
  await page.goto("/log");
  await page.locator("li.entry[data-op='lint'] a.op-chip").click();
  await expect(page.locator("li.entry")).toHaveCount(1);
  await page.goto("/log?session=s91");
  await expect(page.locator("li.entry")).toHaveCount(2);
  await page.goto("/log?page=adr-0901");
  await expect(page.locator(".entry-title")).toHaveText(["p0.2 fixture views", "p0.1 fixture loader"]);
});

test("a malformed heading appears as a LOG-FORMAT finding", async ({ page }) => {
  await page.goto("/log");
  const f = page.locator("section[aria-label='LOG-FORMAT findings']");
  await expect(f).toBeVisible();
  await expect(f).toContainText("## [2026-10-3] code | malformed heading");
});

test("the last-5 view matches the RESUME recipe", async ({ page }) => {
  await page.goto("/log?view=last5");
  await expect(page.locator("li.entry")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Last 5" })).toHaveAttribute("aria-current", "true");
});

test("entry pages link to /go/<id>", async ({ page }) => {
  await page.goto("/log");
  const link = page.locator("li.entry").first().getByRole("link", { name: "adr-0901" });
  await expect(link).toHaveAttribute("href", "/go/adr-0901");
});
