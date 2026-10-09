// views.spec (ip-testing §3): each route returns 200, has exactly one h1 and logs no console errors;
// 404 for an unknown id (with close matches); /go/<id> redirects. IP-6 rows: /, /wiki, /wiki/[...path],
// /go/[id], /search, /log. IP-7 rows: /approvals (list, tabs, review mode), /phases/[id], /lint.
// IP-8 rows: /architecture, /roadmap, /decisions, /decisions/[id], /risks, /research (with filters).
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
  "/approvals",
  "/approvals?tab=all",
  "/approvals?tab=wave",
  "/approvals?tab=all&review=1&i=2",
  "/phases/phase-p0-fixture-plan",
  "/phases/phase-p1-fixture-build",
  "/phases/phase-p2-fixture-review",
  "/lint",
  "/architecture",
  "/architecture?tb=1&hide=1",
  "/roadmap",
  "/decisions",
  "/decisions?status=proposed&state=PENDING",
  FX.adrView,
  "/risks",
  "/risks?sort=id&dir=asc&active=1",
  "/research",
  "/research?rq=rq-92",
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

// IP-9 review: the 404 view re-renders the root layout on the client; the pre-paint theme script must
// not log React's "Encountered a script tag" error there (and still set the theme before paint).
test("404 views log no console errors (theme script) and keep the stored theme", async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => localStorage.setItem("ferrum-plan-theme", "dark"));
  for (const p of ["/wiki/SCHEMA", "/decisions/adr-0999-nope", "/go/adr-0902", "/phases/phase-p9-nope"]) {
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.waitForLoadState("networkidle");
  }
  expect(errors.filter((e) => !/status of 404/.test(e))).toEqual([]);
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
  // an ADR has a typed view since IP-8; a page without one opens in the wiki browser
  const res = await request.get(`/go/${FX.adr}`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe(FX.adrView);
  await page.goto(`/go/${FX.adr}`);
  await expect(page).toHaveURL(FX.adrView);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture decision: one shell");
  const ov = await request.get("/go/ov-fixture-project", { maxRedirects: 0 });
  expect(ov.headers()["location"]).toBe(FX.projectPath);
});

test("/go resolves a task id and an open-question id", async ({ page }) => {
  await page.goto("/go/p0.1");
  await expect(page).toHaveURL("/phases/phase-p0-fixture-plan");
  await page.goto("/go/Q-901");
  await expect(page).toHaveURL(/\/wiki\/overview\/ov-open-questions\.md#q-901-/);
});

test("/phases/<id> is 404 for a non-phase or unknown id", async ({ page }) => {
  for (const p of ["/phases/adr-0901", "/phases/phase-p9-nope"]) {
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(404);
  }
});

test("every nav entry is a link since IP-8", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.locator(".nav-link-disabled")).toHaveCount(0);
  for (const [name, url] of [
    ["Roadmap", "/roadmap"],
    ["Architecture", "/architecture"],
    ["Decisions", "/decisions"],
    ["Risks", "/risks"],
    ["Research", "/research"],
  ]) {
    await nav.getByRole("link", { name }).click();
    await expect(page).toHaveURL(url);
    await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  }
});

test("the Approvals and Lint nav entries are links since IP-7", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: "Approvals" }).click();
  await expect(page).toHaveURL("/approvals");
  await expect(nav.getByRole("link", { name: "Approvals" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Lint" }).click();
  await expect(page).toHaveURL("/lint");
});

test("approvals review mode steps with j/k and shows the page beside its approve bar", async ({ page }) => {
  await page.goto("/approvals?tab=all&review=1&i=0");
  await expect(page.getByText(/^1 of \d+/)).toBeVisible();
  const first = await page.locator("[data-testid='approve-bar']").getAttribute("data-key");
  await expect(page.locator(".review-page")).toBeVisible();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/i=1/);
  await expect(page.getByText(/^2 of \d+/)).toBeVisible();
  expect(await page.locator("[data-testid='approve-bar']").getAttribute("data-key")).not.toBe(first);
  await page.keyboard.press("k");
  await expect(page).toHaveURL(/i=0/);
  // typing j in the comment box does not navigate
  await page.locator("[data-testid='approve-bar'] textarea").fill("j");
  await page.locator("[data-testid='approve-bar'] textarea").press("j");
  await expect(page).toHaveURL(/i=0/);
});

test("the inbox has no bulk approve: one row per key, no approve buttons in the list", async ({ page }) => {
  await page.goto("/approvals?tab=all");
  await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
  const keys = await page.locator("tbody tr[data-key]").evaluateAll((els) => els.map((e) => e.getAttribute("data-key")));
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toContain("phase-p2-fixture-review#exit");
  expect(keys).not.toContain("phase-p1-fixture-build#exit");
  await expect(page.locator("section[aria-labelledby^='g-']").first()).toContainText("Fixture P0");
});
