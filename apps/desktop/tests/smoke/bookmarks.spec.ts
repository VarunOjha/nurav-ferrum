// p3.19: bookmarks. The star bookmarks the page into the bookmarks bar and opens the editor (rename, move to a
// folder, remove); the bar opens pages; the sidebar lists every folder; Ctrl+D and Ctrl+Shift+B work in the shell;
// bookmarks and the bar setting survive a restart; websites have no bridge to the bookmark commands; only web
// addresses can be bookmarked (adr-0032).
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

type Bookmark = { id: number; url: string; title: string; folder: string; position: number };
const data = dataDir("bookmarks");
let f: Ferrum;
// Settings saved by Ferrum (the bar's setting) must apply after a restart: the run's settings are the user file only.
test.beforeAll(async () => { f = await launch("bookmarks", { data, userFileOnly: true }); });
test.afterAll(async () => { await f?.quit(); });

const all = () => call<Bookmark[]>(f, "bookmark_list");
const activeUrl = async () => {
  const l = await tabList(f);
  return l.tabs.find((t) => t.id === l.active)?.url;
};

test("the star bookmarks the page into the bar; the editor renames and moves it", async () => {
  await go(f, `${base}/landing?bm=1`);
  const starBtn = f.shell.locator("#star");
  await expect(starBtn).toBeEnabled();
  await expect(starBtn).toHaveAttribute("aria-pressed", "false");
  await starBtn.click();
  await expect(starBtn).toHaveAttribute("aria-pressed", "true");
  await expect(f.shell.locator("#bm-editor")).toBeVisible();
  await expect(f.shell.locator("#bookmarks-bar a")).toHaveText(["Landing"]);
  expect((await all()).map((b) => [b.url, b.folder])).toEqual([[`${base}/landing?bm=1`, "Favourites bar"]]);
  // Rename and move to a new folder.
  await f.shell.locator("#bm-name").fill("My landing");
  await f.shell.locator("#bm-folder").fill("Work");
  await f.shell.locator("#bm-done").click();
  await expect(f.shell.locator("#bm-editor")).toBeHidden();
  await expect.poll(async () => (await all()).map((b) => [b.title, b.folder])).toEqual([["My landing", "Work"]]);
  await expect(f.shell.locator("#bookmarks-bar .bm-empty")).toBeVisible();
  // The editor sits in the top band: the page view starts below it, never under it (checked by the band's height).
  await expect(starBtn).toHaveAttribute("aria-pressed", "true");
});

test("the bar opens pages; Ctrl+D in the shell bookmarks the page", async () => {
  await go(f, `${base}/counted/bm2`);
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press("Escape");
  await f.shell.keyboard.press("Control+d");
  await expect(f.shell.locator("#bm-editor")).toBeVisible();
  await f.shell.keyboard.press("Escape");
  await expect(f.shell.locator("#bm-editor")).toBeHidden();
  await expect(f.shell.locator("#bookmarks-bar a")).toHaveText(["Counted bm2"]);
  await go(f, `${base}/landing?elsewhere`);
  await f.shell.locator("#bookmarks-bar a", { hasText: "Counted bm2" }).click();
  await expect.poll(activeUrl, { timeout: 15_000 }).toBe(`${base}/counted/bm2`);
});

test("the sidebar lists every folder; opening and removing from it", async () => {
  await call(f, "tab_navigate", { input: `${base}/landing?side` });
  await f.shell.locator("#sidebar-btn").click();
  const side = f.shell.locator("#side-bookmarks");
  await expect(side.locator("details[data-folder='Favourites bar'] summary")).toHaveText("Favourites bar (1)");
  await expect(side.locator("details[data-folder='Work'] summary")).toHaveText("Work (1)");
  await side.locator("details[data-folder='Work'] button.bm-open").click();
  await expect.poll(activeUrl, { timeout: 15_000 }).toBe(`${base}/landing?bm=1`);
  await side.locator("details[data-folder='Work'] button.bm-delete").click();
  await expect(side.locator("details[data-folder='Work']")).toHaveCount(0);
  expect((await all()).map((b) => b.title)).toEqual(["Counted bm2"]);
  await f.shell.locator("#sidebar-btn").click();
});

test("only web pages can be bookmarked; websites have no bridge", async () => {
  for (const url of ["javascript:alert(1)", "file:///C:/Windows/win.ini", "about:blank"]) {
    await expect(call(f, "bookmark_add", { url, title: "x", folder: null })).rejects.toBeTruthy();
  }
  expect((await all()).length).toBe(1);
  // The page in the tab cannot reach any app command (no bridge in tab views, p2.3).
  expect(await f.content.evaluate(() => typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)).toBe("undefined");
});

test("Ctrl+Shift+B hides the bar; bookmarks and the setting survive a restart", async () => {
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press("Escape");
  await f.shell.keyboard.press("Control+Shift+B");
  await expect(f.shell.locator("#bookmarks-bar")).toBeHidden();
  await f.quit();
  f = await launch("bookmarks", { data, userFileOnly: true });
  expect((await all()).map((b) => b.title)).toEqual(["Counted bm2"]);
  expect((await call<{ bookmarks_bar: boolean }>(f, "appearance_get")).bookmarks_bar).toBe(false);
  await expect(f.shell.locator("#bookmarks-bar a")).toHaveCount(1); // the bar's contents are drawn, though hidden
  await expect(f.shell.locator("#bookmarks-bar")).toBeHidden();
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press("Control+Shift+B");
  await expect(f.shell.locator("#bookmarks-bar")).toBeVisible();
  expect((await call<{ bookmarks_bar: boolean }>(f, "appearance_get")).bookmarks_bar).toBe(true);
});
