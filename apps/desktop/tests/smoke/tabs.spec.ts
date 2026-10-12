// p3.2: one view per tab. 20 tabs are opened through the app's commands, each gets its own view; switching shows only
// the active tab's view (WebView2's IsVisible, read by the debug-only test_stats command; the pages' own
// document.visibilityState is not used, because it stayed "visible" for hidden views in this harness, probably from
// Playwright's focus emulation over CDP, not checked); the active view fills the area below
// the shell's top band; closing every tab releases every view, and WebView2's renderer processes fall back to what the
// shell alone needs (counted with GetProcessInfos, as in spike S3; debug-only test_stats command).
import { test, expect, type Page } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

type Stats = { tabs: number; views: number; renderers: number; shown: number[] };
const stats = (f: Ferrum) => call<Stats>(f, "test_stats");
const N = 20;

let f: Ferrum;
test.beforeAll(async () => { f = await launch("tabs"); });
test.afterAll(async () => { await f?.quit(); });

test("20 tabs: one view each, only the active one shown, all released on close", async () => {
  test.setTimeout(180_000);
  // Baseline: close the start tab, so only the shell is left.
  for (const t of (await tabList(f)).tabs) await call(f, "tab_close", { id: t.id });
  await expect.poll(async () => (await stats(f)).views, { timeout: 15_000 }).toBe(0);
  await expect(f.shell.locator("#empty-panel")).toBeVisible();
  await expect.poll(async () => (await stats(f)).renderers, { timeout: 20_000 }).toBeLessThanOrEqual(1);
  const baseline = (await stats(f)).renderers;

  const ids: number[] = [];
  for (let i = 0; i < N; i++) ids.push(await call<number>(f, "tab_new", { url: `${base}/landing?tab=${i}` }));
  await expect.poll(async () => (await stats(f)).views, { timeout: 60_000 }).toBe(N);
  await expect.poll(() => f.pages().length, { timeout: 30_000 }).toBe(N);
  const pageOf = async (i: number) => {
    const want = `${base}/landing?tab=${i}`;
    await expect.poll(() => f.pages().some((p) => p.url() === want), { timeout: 30_000 }).toBe(true);
    return f.pages().find((p) => p.url() === want)!;
  };
  const opened = await stats(f);
  expect(opened.tabs).toBe(N);
  expect(opened.renderers).toBeGreaterThan(baseline);
  await expect(f.shell.locator(".tab")).toHaveCount(N);

  // Switch through every tab: only the active one is shown, and it fills the content area.
  const topBand = await f.shell.evaluate(() => Math.ceil(document.getElementById("top")!.getBoundingClientRect().height));
  const shellSize = await f.shell.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  let previous: Page | undefined;
  for (let i = 0; i < N; i++) {
    expect(await call<boolean>(f, "tab_activate", { id: ids[i] })).toBe(true);
    const p = await pageOf(i);
    // Only the active tab's view is shown (WebView2 IsVisible).
    await expect.poll(async () => (await stats(f)).shown).toEqual([ids[i]]);
    await expect(f.shell.locator(`.tab[data-id="${ids[i]}"]`)).toHaveAttribute("aria-selected", "true");
    await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing?tab=${i}`);
    previous = p;
  }
  const size = await previous!.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  expect(Math.abs(size.w - shellSize.w)).toBeLessThanOrEqual(2);
  expect(Math.abs(size.h - (shellSize.h - topBand))).toBeLessThanOrEqual(2);

  // Close every tab: no tab, no view, no extra renderer left.
  for (const id of ids) expect(await call<boolean>(f, "tab_close", { id })).toBe(true);
  await expect.poll(async () => (await stats(f)).views, { timeout: 15_000 }).toBe(0);
  await expect.poll(() => f.pages().length, { timeout: 15_000 }).toBe(0);
  await expect.poll(async () => (await stats(f)).renderers, { timeout: 30_000 }).toBeLessThanOrEqual(baseline);
  expect((await stats(f)).tabs).toBe(0);
  expect((await tabList(f)).active).toBeNull();
});
