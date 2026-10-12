// p3.15: the sidebar (open tabs and history). Opening it shrinks the active tab's view to the right of it and closing
// it grows the view back, so the two never overlap; choosing a tab activates it; choosing a history entry opens it in
// the active tab; Ctrl+Shift+S toggles it with focus in the shell and with focus inside a page (real keys, as in p3.3).
import { test, expect, type Page } from "@playwright/test";
import { launch, go, call, tabList, realKeys, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("sidebar"); });
test.afterAll(async () => { await f?.quit(); });

const pageAt = async (url: string): Promise<Page> => {
  await expect.poll(() => f.pages().some((p) => p.url() === url), { timeout: 20_000 }).toBe(true);
  return f.pages().find((p) => p.url() === url)!;
};
const widths = async (p: Page) => ({
  page: await p.evaluate(() => window.innerWidth),
  shell: await f.shell.evaluate(() => window.innerWidth),
  side: await f.shell.evaluate(() => {
    const s = document.getElementById("sidebar")!;
    return s.hidden ? 0 : Math.ceil(s.getBoundingClientRect().width);
  }),
});

test("open and close: the tab view shrinks and grows, never overlapping", async () => {
  await go(f, `${base}/landing?side=1`);
  const p = await pageAt(`${base}/landing?side=1`);
  const closed = await widths(p);
  expect(Math.abs(closed.page - closed.shell)).toBeLessThanOrEqual(2);
  await f.shell.click("#sidebar-btn");
  await expect(f.shell.locator("#sidebar")).toBeVisible();
  await expect.poll(async () => {
    const w = await widths(p);
    return w.side > 0 && Math.abs(w.page - (w.shell - w.side)) <= 2;
  }).toBe(true);
  await f.shell.click("#sidebar-btn");
  await expect(f.shell.locator("#sidebar")).toBeHidden();
  await expect.poll(async () => (await widths(p)).page).toBe(closed.page);
});

test("choosing a tab or a history entry in the sidebar", async () => {
  const second = await call<number>(f, "tab_new", { url: `${base}/landing?side=2` });
  await expect.poll(async () => (await tabList(f)).active).toBe(second);
  await f.shell.click("#sidebar-btn");
  const first = (await tabList(f)).tabs[0]!.id;
  await f.shell.locator("#side-tabs button", { hasText: "side=1" }).click();
  await expect.poll(async () => (await tabList(f)).active).toBe(first);
  // History: side=1 was visited; search for it and open it in the active tab (the first tab, now at side=1 already,
  // so navigate it elsewhere first).
  await go(f, `${base}/counted/sidebar`);
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === first)?.url).toBe(`${base}/counted/sidebar`);
  await f.shell.fill("#side-search", "side=2");
  await expect(f.shell.locator("#side-history button")).toHaveCount(1);
  await f.shell.locator("#side-history button").first().click();
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === first)?.url).toBe(`${base}/landing?side=2`);
  await f.shell.click("#sidebar-btn");
  await expect(f.shell.locator("#sidebar")).toBeHidden();
});

test("Ctrl+Shift+S toggles it from the shell and from inside a page", async () => {
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press("Control+Shift+S");
  await expect(f.shell.locator("#sidebar")).toBeVisible();
  await f.shell.keyboard.press("Control+Shift+S");
  await expect(f.shell.locator("#sidebar")).toBeHidden();
  await call(f, "test_focus", { target: "content" });
  await f.shell.waitForTimeout(400);
  realKeys(f, "^+s");
  await expect(f.shell.locator("#sidebar")).toBeVisible();
  await call(f, "test_focus", { target: "content" });
  await f.shell.waitForTimeout(400);
  realKeys(f, "^+s");
  await expect(f.shell.locator("#sidebar")).toBeHidden();
});
