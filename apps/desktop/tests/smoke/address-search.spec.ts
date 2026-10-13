// p3.20: search of the past in the address bar. Typing shows grouped suggestions (open tabs, bookmarks, history) from
// words of titles and addresses; arrow keys and Enter open one (an open tab is switched to); Esc closes the list;
// Shift+Delete forgets a history page. The list is part of the shell's top band, so the page view moves down while it
// is open and the two never overlap (a web view is always drawn above the shell).
import { test, expect, type Page } from "@playwright/test";
import { launch, go, visit, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("address-search"); });
test.afterAll(async () => { await f?.quit(); });

const activeUrl = async () => {
  const l = await tabList(f);
  return l.tabs.find((t) => t.id === l.active)?.url;
};
const pageAt = async (url: string): Promise<Page> => {
  await expect.poll(() => f.pages().some((p) => p.url() === url), { timeout: 20_000 }).toBe(true);
  return f.pages().find((p) => p.url() === url)!;
};
const typeInAddress = async (text: string) => {
  await f.shell.locator("#address").click();
  await f.shell.locator("#address").fill("");
  await f.shell.keyboard.type(text, { delay: 20 });
};
const heads = () => f.shell.locator("#suggest .sg-head").allTextContents();

let first = 0;
let other = 0;
test("typing shows open tabs, bookmarks and history in groups, never under the page", async () => {
  await visit(f, `${base}/counted/sugg-alpha`);
  await visit(f, `${base}/counted/sugg-beta`);
  await go(f, `${base}/landing?start`);
  await call(f, "bookmark_add", { url: `${base}/counted/sugg-saved`, title: "Sugg saved page", folder: "Work" });
  first = (await tabList(f)).active!;
  other = await call<number>(f, "tab_new", { url: `${base}/counted/sugg-tab` });
  await expect.poll(activeUrl, { timeout: 15_000 }).toBe(`${base}/counted/sugg-tab`);
  await call(f, "tab_activate", { id: first });
  await expect.poll(async () => (await tabList(f)).active).toBe(first);
  const page = await pageAt(`${base}/landing?start`);
  const before = await page.evaluate(() => window.innerHeight);

  await typeInAddress("sugg");
  await expect(f.shell.locator("#suggest")).toBeVisible();
  await expect.poll(heads).toEqual(["Open tabs", "Bookmarks", "History"]);
  await expect(f.shell.locator("#suggest .sg-row[data-kind='tab']")).toHaveAttribute("data-url", `${base}/counted/sugg-tab`);
  await expect(f.shell.locator("#suggest .sg-row[data-kind='bookmark'] .sg-title")).toHaveText("Sugg saved page");
  const hist = await f.shell.locator("#suggest .sg-row[data-kind='history']").evaluateAll((rs) => rs.map((r) => (r as HTMLElement).dataset.url));
  expect(hist).toEqual(expect.arrayContaining([`${base}/counted/sugg-alpha`, `${base}/counted/sugg-beta`]));
  expect(hist).not.toContain(`${base}/counted/sugg-tab`); // shown once, as the open tab
  await expect(f.shell.locator("#suggest mark").first()).toHaveText(/^sugg$/i);

  // The page view starts below the top band (with the list in it): the two never overlap.
  await expect.poll(async () => {
    const band = await f.shell.evaluate(() => Math.ceil(document.getElementById("top")!.getBoundingClientRect().height));
    const shellH = await f.shell.evaluate(() => window.innerHeight);
    const listBottom = await f.shell.evaluate(() => document.getElementById("suggest")!.getBoundingClientRect().bottom);
    const pageH = await page.evaluate(() => window.innerHeight);
    return listBottom <= band && Math.abs(pageH - (shellH - band)) <= 2 && pageH < before;
  }, { timeout: 10_000 }).toBe(true);

  // Esc closes the list; the page view grows back.
  await f.shell.keyboard.press("Escape");
  await expect(f.shell.locator("#suggest")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.innerHeight)).toBe(before);
});

test("arrow keys and Enter: an open tab is switched to; a history page opens", async () => {
  await typeInAddress("sugg tab");
  await expect(f.shell.locator("#suggest .sg-row").first()).toHaveAttribute("data-kind", "tab");
  await f.shell.keyboard.press("ArrowDown");
  await expect(f.shell.locator("#suggest .sg-row").first()).toHaveAttribute("aria-selected", "true");
  await f.shell.keyboard.press("Enter");
  await expect.poll(async () => (await tabList(f)).active).toBe(other);
  await expect(f.shell.locator("#suggest")).toBeHidden();

  await typeInAddress("alpha");
  await expect(f.shell.locator("#suggest .sg-row")).toHaveCount(1);
  await f.shell.keyboard.press("ArrowDown");
  await f.shell.keyboard.press("Enter");
  await expect.poll(activeUrl, { timeout: 15_000 }).toBe(`${base}/counted/sugg-alpha`);
});

test("Shift+Delete forgets a history page; clicking a row opens it", async () => {
  await typeInAddress("beta");
  await expect(f.shell.locator("#suggest .sg-row")).toHaveCount(1);
  await f.shell.keyboard.press("ArrowDown");
  await f.shell.keyboard.press("Shift+Delete");
  await expect(f.shell.locator("#suggest")).toBeHidden();
  expect(await call<unknown[]>(f, "history_list", { query: "beta", limit: null })).toEqual([]);
  await typeInAddress("saved");
  await f.shell.locator("#suggest .sg-row[data-kind='bookmark']").click();
  await expect.poll(activeUrl, { timeout: 15_000 }).toBe(`${base}/counted/sugg-saved`);
});
