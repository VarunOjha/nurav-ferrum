// theme.spec (ip-testing §3): prefers-color-scheme dark gives the dark tokens; the toggle overrides and
// persists across reloads; no flash: the attribute is set before first paint, checked via the initial
// HTML and by observing <html> when <body> is first inserted.
import { expect, test } from "@playwright/test";

const LIGHT_BG = "#f6f7f9";
const DARK_BG = "#0e1117";
const bgToken = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());

test("prefers-color-scheme: dark emulation gives the dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/wiki");
  expect(await bgToken(page)).toBe(DARK_BG);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(14, 17, 23)");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("prefers-color-scheme: light gives the light tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/wiki");
  expect(await bgToken(page)).toBe(LIGHT_BG);
});

test("the toggle overrides the OS preference and persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/log");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
  expect(await bgToken(page)).toBe(DARK_BG);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bgToken(page)).toBe(DARK_BG);
  await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");

  // Light overrides a dark OS preference.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "Light theme" }).click();
  expect(await bgToken(page)).toBe(LIGHT_BG);
  await page.goto("/wiki");
  expect(await bgToken(page)).toBe(LIGHT_BG);

  // System clears the override.
  await page.getByRole("button", { name: "System theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(await page.evaluate(() => localStorage.getItem("ferrum-plan-theme"))).toBeNull();
  expect(await bgToken(page)).toBe(DARK_BG);
});

test("no flash: the theme script is inline in <head> of the initial HTML", async ({ request }) => {
  const html = await (await request.get("/wiki")).text();
  const head = html.slice(0, html.indexOf("<body"));
  expect(head).toContain('localStorage.getItem("ferrum-plan-theme")');
  expect(head).toMatch(/<script>\(function\(\)\{try\{var t=localStorage/);
});

test("no flash: data-theme is already set when <body> is first inserted", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ferrum-plan-theme", "dark");
    } catch {
      /* ignore */
    }
    const w = window as unknown as { __themeAtBody?: string | null };
    const mo = new MutationObserver(() => {
      if (document.body && w.__themeAtBody === undefined) {
        w.__themeAtBody = document.documentElement.getAttribute("data-theme");
        mo.disconnect();
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/wiki");
  expect(await page.evaluate(() => (window as unknown as { __themeAtBody?: string | null }).__themeAtBody)).toBe("dark");
});
