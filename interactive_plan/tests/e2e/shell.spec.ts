// shell.spec: the portal frame on every tab (landmarks, one h1, skip link, tabs, read-only badge),
// the theme toggle (kept from v1), the 404 page, and phone width without sideways scrolling.
import { expect, test } from "@playwright/test";

const TABS: [string, string][] = [
  ["/", "Overview"],
  ["/roadmap", "Roadmap"],
  ["/architecture", "Architecture"],
  ["/decisions", "Decisions"],
  ["/research", "Research"],
  ["/questions", "Questions"],
  ["/log", "Log"],
];

for (const [route, label] of TABS) {
  test(`${label} tab: landmarks, one h1, current tab marked, no errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("header.topbar")).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: new RegExp(`^${label}`) })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("readonly-badge")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the skip link is the first stop and jumps to the content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("theme toggle: dark and light apply, persist across a reload, and System clears the choice", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Light theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);
  await page.getByRole("button", { name: "System theme" }).click();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
  await page.reload();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
});

test("an unknown address shows the 404 page inside the portal frame", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByTestId("readonly-badge")).toBeVisible();
});

test("phone width: the overview and a phase popup fit without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByTestId("phase-cards").getByRole("button").first().click();
  const dialog = page.locator("dialog.modal[open]");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  // The task table becomes one card per task: no sideways scrolling inside the popup either.
  const table = dialog.locator("table.tasks-table");
  const inner = await table.evaluate((t) => t.parentElement!.scrollWidth - t.parentElement!.clientWidth);
  expect(inner).toBeLessThanOrEqual(0);
  // The column names are visually hidden (each card labels its own values).
  expect(await table.locator("thead").evaluate((e) => e.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
  // Each task card has the same eight labelled rows as the wide table (owner request 2026-10-10).
  const firstRow = table.locator("tbody tr").first();
  const labels = await firstRow.locator("td").evaluateAll((tds) => tds.map((td) => td.getAttribute("data-label")));
  expect(labels).toEqual(["Id", "Title", "What", "Why", "How", "Logic", "Check script", "State"]);
  const label = await firstRow.locator('td[data-label="What"]').evaluate((td) => getComputedStyle(td, "::before").content);
  expect(label).toBe('"What"');
});
