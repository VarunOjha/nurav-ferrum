// p2.10, updated in p3.2: target=_blank and window.open follow the new_window setting (a new tab by default since P3,
// the same view, or the system browser); links to other apps show the shell's confirmation bar and launch nothing
// without the user's click. The launcher is mocked
// (FERRUM_LAUNCHER_LOG, debug builds only): a "launch" is a line in a file; nothing opens. Every test sets up its own
// page, so one failure does not hide the next.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

// The page's own address (after a navigation Ferrum cancelled on purpose, Playwright's cached page URL is empty).
// While a page is being replaced the read fails; that counts as "not there yet" so expect.poll tries again.
const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const launches = (f: Ferrum) => {
  const p = path.join(f.data, "launches.txt");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean) : [];
};
const pageCount = (f: Ferrum) => f.browser.contexts().flatMap((c) => c.pages()).length;
const mockLauncher = (d: string) => ({ FERRUM_LAUNCHER_LOG: path.join(d, "launches.txt") });
const open = async (f: Ferrum, route: string, selector: string) => {
  await go(f, `${base}${route}`);
  await expect.poll(() => href(f)).toBe(`${base}${route}`);
  await expect(f.content.locator(selector)).toBeVisible();
};
// WCAG contrast ratio between the text colour of `fg` and the background colour of `bg` (both solid rgb()).
const contrast = (f: Ferrum, fg: string, bg: string) =>
  f.shell.evaluate(([fgSel, bgSel]) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const a = lum(getComputedStyle(document.querySelector(fgSel)!).color);
    const b = lum(getComputedStyle(document.querySelector(bgSel)!).backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, [fg, bg] as const);
const dumpOnFailure = (get: () => Ferrum | undefined) =>
  test.afterEach(async ({}, info) => {
    // On failure, keep what the shell saw (its event list) in the report.
    if (info.status !== info.expectedStatus) console.log("shell events:", await get()?.shell.evaluate(() => document.title).catch(String));
  });

// After a test opened a second tab: close every tab but the first, so `f.content` is one page again.
const backToOneTab = async (f: Ferrum) => {
  const l = await tabList(f);
  for (const t of l.tabs.slice(1)) await call(f, "tab_close", { id: t.id });
  await expect.poll(() => f.pages().length).toBe(1);
  await f.shell.waitForTimeout(1100); // past the one-new-tab-per-second limit of the remaining tab
};

test.describe("default settings (new tab, confirm other apps)", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("links", { envFromData: mockLauncher }); });
  test.afterAll(async () => { await f?.quit(); });
  dumpOnFailure(() => f);

  test("target=_blank opens a new active tab next to the page; the page stays", async () => {
    await open(f, "/links/blank", "#blank");
    const first = (await tabList(f)).tabs[0]!.id;
    await f.content.click("#blank");
    await expect.poll(async () => (await tabList(f)).tabs.map((t) => t.url)).toEqual([`${base}/links/blank`, `${base}/landing`]);
    const l = await tabList(f);
    expect(l.active).toBe(l.tabs[1]!.id);
    expect(l.tabs[0]!.id).toBe(first);
    await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing`);
    await expect.poll(() => pageCount(f)).toBe(3);
    await backToOneTab(f);
  });

  test("window.open from a click opens a new tab", async () => {
    await open(f, "/links/blank", "#open");
    await f.content.click("#open");
    await expect.poll(async () => (await tabList(f)).tabs.length).toBe(2);
    expect((await tabList(f)).tabs[1]!.url).toBe(`${base}/landing`);
    await backToOneTab(f);
  });

  test("a pop-up opened by script opens one new tab at most; a flood is blocked", async () => {
    await open(f, "/links/popup", "#popup");
    // WebView2 reports this script-only pop-up as user-initiated, so Ferrum does not rely on that flag; the per-tab
    // rate limit (one new tab per second) applies to every request.
    await expect.poll(async () => (await tabList(f)).tabs.length).toBe(2);
    await f.shell.waitForTimeout(1500);
    expect((await tabList(f)).tabs.length).toBe(2);
    expect(launches(f)).toEqual([]);
    await backToOneTab(f);
    // Five window.open calls at once: only the first becomes a tab; the rest are blocked with a toolbar note.
    await f.content.evaluate(() => { for (let i = 0; i < 5; i++) window.open(`/landing?flood=${i}`); });
    await expect.poll(async () => (await tabList(f)).tabs.length).toBe(2);
    await f.shell.waitForTimeout(800);
    expect((await tabList(f)).tabs.length).toBe(2);
    expect((await tabList(f)).tabs[1]!.url).toBe(`${base}/landing?flood=0`);
    await call(f, "tab_activate", { id: (await tabList(f)).tabs[0]!.id });
    await expect(f.shell.locator("#status")).toHaveText("Pop-up blocked");
    expect(launches(f)).toEqual([]);
    await backToOneTab(f);
  });

  test("mailto link asks first; Cancel launches nothing", async () => {
    await open(f, "/links/schemes", "#mailto");
    const before = launches(f).length;
    await f.content.click("#mailto", { noWaitAfter: true }); // Ferrum cancels this navigation on purpose
    await expect(f.shell.locator("#external-bar")).toBeVisible();
    await expect(f.shell.locator("#external-uri")).toHaveText("mailto:test@example.invalid");
    await expect(f.shell.locator("#status")).toHaveText("");
    await expect.poll(() => href(f)).toBe(`${base}/links/schemes`);
    await f.shell.waitForTimeout(500);
    expect(launches(f).length).toBe(before);
    // Readable in light and dark mode (owner checklist 2026-10-12: it was light-on-light in dark mode).
    for (const colorScheme of ["light", "dark"] as const) {
      await f.shell.emulateMedia({ colorScheme });
      expect(await contrast(f, "#external-text", "#external-bar"), `${colorScheme} text`).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(f, "#external-cancel", "#external-bar"), `${colorScheme} Cancel`).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(f, "#external-open", "#external-open"), `${colorScheme} Open`).toBeGreaterThanOrEqual(4.5);
    }
    await f.shell.emulateMedia({ colorScheme: null });
    await f.shell.click("#external-cancel");
    await expect(f.shell.locator("#external-bar")).toBeHidden();
    expect(launches(f).length).toBe(before);
  });

  test("custom-scheme link: Open launches exactly that link, once", async () => {
    await open(f, "/links/schemes", "#custom");
    const before = launches(f);
    await f.content.click("#custom", { noWaitAfter: true });
    await expect(f.shell.locator("#external-uri")).toHaveText("ferrum-test:hello");
    await f.shell.click("#external-open");
    await expect(f.shell.locator("#external-bar")).toBeHidden();
    await expect.poll(() => launches(f)).toEqual([...before, "ferrum-test:hello"]);
    // Confirming the same link again without a new request is refused by the app.
    const again = await f.shell.evaluate(() =>
      (window as any).__TAURI_INTERNALS__.invoke("external_open_confirm", { uri: "ferrum-test:hello" }).then(() => "ok", (e: unknown) => String(e)));
    expect(again).toContain("not the link");
    expect(launches(f)).toEqual([...before, "ferrum-test:hello"]);
  });

  test("a typed link to another app asks too", async () => {
    const before = launches(f).length;
    await go(f, "mailto:typed@example.invalid");
    await expect(f.shell.locator("#external-uri")).toHaveText("mailto:typed@example.invalid");
    await f.shell.click("#external-cancel");
    await expect(f.shell.locator("#external-bar")).toBeHidden();
    expect(launches(f).length).toBe(before);
  });
});

test.describe("new_window = same-view (the P2 default)", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("links-same", { extraSettings: '[security]\nnew_window = "same-view"\n', envFromData: mockLauncher });
  });
  test.afterAll(async () => { await f?.quit(); });
  dumpOnFailure(() => f);

  test("target=_blank opens in the same view, no extra tab or window", async () => {
    await open(f, "/links/blank", "#blank");
    await f.content.click("#blank");
    await expect.poll(() => href(f)).toBe(`${base}/landing`);
    await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing`);
    expect(pageCount(f)).toBe(2);
  });
});

test.describe("new_window = system-browser", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("links-sys", { extraSettings: '[security]\nnew_window = "system-browser"\n', envFromData: mockLauncher });
  });
  test.afterAll(async () => { await f?.quit(); });
  dumpOnFailure(() => f);

  test("target=_blank goes to the system browser; the page stays", async () => {
    await open(f, "/links/blank", "#blank");
    await f.content.click("#blank");
    await expect.poll(() => launches(f)).toEqual([`${base}/landing`]);
    await expect.poll(() => href(f)).toBe(`${base}/links/blank`);
    expect(pageCount(f)).toBe(2);
  });
});
