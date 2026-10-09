// a11y.spec (ip-testing §3, IP-9): keyboard only, reach and operate the approve bar, navigate graph
// nodes and toggle the theme; every page has a single h1 and the landmarks (banner, navigation, main,
// contentinfo), a working skip link, and buttons/links/form fields with an accessible name. The
// optional axe scan is not run: @axe-core/playwright needs owner consent (Q-008, open).
// The approve-bar test writes a decision into the temp fixture copy and restores the files it touched.
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { e2eEnv, FX, readOrNull, restore } from "./helpers";

const ROUTES = [
  "/",
  "/wiki",
  FX.adrPath,
  FX.renderPath,
  FX.rawPath,
  "/search?q=shell",
  "/log",
  "/approvals",
  "/phases/phase-p2-fixture-review",
  "/lint",
  "/architecture",
  "/roadmap",
  "/decisions",
  FX.adrView,
  "/risks",
  "/research",
];

/** Elements that need an accessible name but have none (approximation of the accname algorithm). */
async function unnamed(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
    };
    const nameOf = (el: Element): string => {
      const lb = el.getAttribute("aria-labelledby");
      if (lb) {
        const t = lb
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
          .trim();
        if (t) return t;
      }
      const al = el.getAttribute("aria-label")?.trim();
      if (al) return al;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const labels = Array.from(el.labels ?? [])
          .map((l) => l.textContent ?? "")
          .join(" ")
          .trim();
        if (labels) return labels;
        return el.getAttribute("title")?.trim() ?? "";
      }
      const text = (el.textContent ?? "").trim();
      if (text) return text;
      const alt = Array.from(el.querySelectorAll("img[alt], svg[aria-label]"))
        .map((i) => i.getAttribute("alt") ?? i.getAttribute("aria-label") ?? "")
        .join(" ")
        .trim();
      if (alt) return alt;
      return el.getAttribute("title")?.trim() ?? "";
    };
    const sel = "a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=link]";
    return Array.from(document.querySelectorAll(sel))
      .filter((el) => visible(el) && !el.closest("[aria-hidden='true']"))
      .filter((el) => nameOf(el) === "")
      .map((el) => el.outerHTML.slice(0, 160));
  });
}

for (const route of ROUTES) {
  test(`${route}: one h1, landmarks, skip link, named controls`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    expect(await page.getByRole("navigation").count()).toBeGreaterThan(0);
    expect(await unnamed(page)).toEqual([]);
    // the first Tab reaches the skip link; Enter moves focus to <main>
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
}

/** Presses Tab until `target` has focus (at most `max` presses); returns whether it got there. */
async function tabTo(page: Page, target: ReturnType<Page["locator"]>, max = 80): Promise<boolean> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return true;
  }
  return false;
}

test.describe("approve bar, keyboard only", () => {
  test.describe.configure({ mode: "serial" });
  let saved: { approvals: Buffer | null; log: Buffer | null; snapshots: Set<string> };
  const snapshotFiles = () => {
    const dir = path.join(e2eEnv().dataDir, "snapshots");
    try {
      return new Set((readdirSync(dir, { recursive: true }) as string[]).map((p) => path.join(dir, p)));
    } catch {
      return new Set<string>();
    }
  };
  test.beforeAll(() => {
    const env = e2eEnv();
    saved = { approvals: readOrNull(env.approvalsFile), log: readOrNull(env.logFile), snapshots: snapshotFiles() };
  });
  test.afterAll(() => {
    const env = e2eEnv();
    restore(env.approvalsFile, saved.approvals);
    restore(env.logFile, saved.log);
    for (const f of snapshotFiles()) if (!saved.snapshots.has(f)) rmSync(f, { recursive: true, force: true });
  });

  test("reach the comment box from the skip link, Request changes needs a comment, then record it with Enter", async ({ page }) => {
    await page.goto(FX.adrView);
    const bar = page.locator(`[data-testid='approve-bar'][data-key='${FX.adr}']`);
    await expect(bar).toHaveAttribute("data-state", "PENDING");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter"); // skip link -> main
    const comment = bar.getByRole("textbox");
    expect(await tabTo(page, comment)).toBe(true);
    // the buttons follow the comment box in tab order: Approve, Request changes, Reject
    await page.keyboard.press("Tab");
    await expect(bar.getByRole("button", { name: "Approve", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    const request = bar.getByRole("button", { name: "Request changes", exact: true });
    await expect(request).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(bar.getByRole("alert")).toHaveText("A comment is required for Request changes and Reject.");
    await expect(comment).toHaveAttribute("aria-invalid", "true");
    await expect(bar).toHaveAttribute("data-state", "PENDING");
    // back to the box with Shift+Tab, type, forward to Request changes, Space
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(comment).toBeFocused();
    await page.keyboard.type("keyboard-only review");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(request).toBeFocused();
    await page.keyboard.press(" ");
    await expect(bar.locator("[aria-live='polite']")).toHaveText(`Page approval for ${FX.adr} recorded: changes requested`);
    await expect(bar).toHaveAttribute("data-state", "CHANGES_REQUESTED");
  });
});

test("graph nodes: Tab reaches the architecture nodes from the skip link and Enter opens the panel", async ({ page }) => {
  await page.goto("/architecture");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const node = page.locator("[data-node-id='comp-fixture-shell'] .fg-hit").first();
  await expect(node).toBeVisible();
  expect(await tabTo(page, node)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("graph-panel").getByRole("heading", { level: 2 })).toHaveText("Fixture shell");
});

test("graph nodes: Tab reaches the roadmap and research nodes and Enter follows them", async ({ page }) => {
  await page.goto("/roadmap");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const phase = page.locator('[data-testid="phase-dag"] [data-node-id="phase-p1-fixture-build"] a');
  await expect(phase).toBeVisible();
  expect(await tabTo(page, phase)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/phases/phase-p1-fixture-build");

  await page.goto("/research");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const rq = page.locator("[data-node-id='rq-92'] a").first();
  await expect(rq).toBeVisible();
  expect(await tabTo(page, rq, 120)).toBe(true);
  const href = await rq.getAttribute("href");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(href!);
});

test("theme: the toggle is reachable and operable with the keyboard", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/wiki");
  const dark = page.getByRole("button", { name: "Dark theme" });
  expect(await tabTo(page, dark, 30)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  const system = page.getByRole("button", { name: "System theme" });
  await expect(system).toBeFocused();
  await page.keyboard.press(" ");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  await expect(system).toHaveAttribute("aria-pressed", "true");
});
