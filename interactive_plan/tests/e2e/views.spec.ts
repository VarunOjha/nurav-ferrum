// views.spec (ip-testing §3): each route returns 200, has exactly one h1 and logs no console errors;
// 404 for an unknown id (with close matches); /go/<id> redirects. IP-6 rows: /, /wiki, /wiki/[...path],
// /go/[id], /search, /log. IP-7 and IP-8 add the rows of their routes.
import { expect, test } from "@playwright/test";
import { collectErrors, FX } from "./helpers";

const ROUTES = [
  "/",
  "/wiki",
  FX.adrPath,
  FX.projectPath,
  FX.renderPath,
  "/wiki/raw",
  FX.rawPath,
  "/wiki/raw/research/fixture-note.md",
  "/search",
  "/search?q=shell",
  "/log",
  "/log?op=code&order=oldest",
];

for (const route of ROUTES) {
  test(`GET ${route}: 200, one h1, no console errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main#main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("unknown /go id: 404 with close matches", async ({ page }) => {
  const res = await page.goto("/go/adr-0902");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  await expect(page.getByRole("link", { name: "adr-0901" })).toBeVisible();
});

test("unknown wiki path: 404", async ({ page }) => {
  const res = await page.goto("/wiki/decisions/adr-0999-nope.md");
  expect(res?.status()).toBe(404);
});

test("path traversal does not escape wiki/", async ({ request }) => {
  for (const p of ["/wiki/..%2FSTATUS.md", "/wiki/%2E%2E/STATUS.md", "/wiki/raw/..%5C..%5CSTATUS.md"]) {
    const res = await request.get(p, { maxRedirects: 0 });
    expect([404, 308]).toContain(res.status());
    // STATUS.md (outside wiki/) must never be rendered as a page (its title would be the h1).
    expect(await res.text()).not.toMatch(/<h1[^>]*>Fixture live status/);
    if (res.status() === 404) expect(await res.text()).toContain("Not found");
  }
});

test("/go/<id> redirects to the page view", async ({ page, request }) => {
  const res = await request.get(`/go/${FX.adr}`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe(FX.adrPath);
  await page.goto(`/go/${FX.adr}`);
  await expect(page).toHaveURL(FX.adrPath);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture decision: one shell");
});

test("/go resolves a task id and an open-question id", async ({ page }) => {
  await page.goto("/go/p0.1");
  await expect(page).toHaveURL("/wiki/phases/phase-p0-fixture-plan.md");
  await page.goto("/go/Q-901");
  await expect(page).toHaveURL(/\/wiki\/overview\/ov-open-questions\.md#q-901-/);
});
