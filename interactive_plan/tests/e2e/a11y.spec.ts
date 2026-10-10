// a11y.spec: axe-core (WCAG 2.1 A and AA rules) finds no violation on any tab, in the light and the
// dark theme, and none in the open reference popup. The per-tab specs also check their own popups.
import { expect, test } from "@playwright/test";
import { expectAccessible } from "./axe";

const ROUTES = ["/", "/roadmap", "/architecture", "/decisions", "/research", "/questions", "/log"];

for (const scheme of ["light", "dark"] as const) {
  for (const route of ROUTES) {
    test(`${route} has no accessibility violations (${scheme} theme)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route);
      await expectAccessible(page);
    });
  }
}

test("the open reference popup has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.locator("main [data-ref-id]").first().click();
  await expect(page.getByTestId("ref-dialog")).toBeVisible();
  await expectAccessible(page, "[data-testid=ref-dialog]");
});

// The phase popup with its eight-column tasks table (owner request 2026-10-10): wide table and phone
// cards, light and dark.
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    test(`the open phase popup has no accessibility violations (${scheme} theme, ${width} wide)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.getByTestId("phase-cards").getByRole("button").first().click();
      await expect(page.locator("dialog.phase-modal[open]")).toBeVisible();
      await expectAccessible(page, "dialog.phase-modal[open]");
    });
  }
}
