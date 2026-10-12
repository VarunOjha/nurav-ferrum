// p3.22 (adr-0033): the Graphite look. Light or dark follows Windows (here: the emulated colour scheme); the accent
// colour and the density change at once from Settings and are saved; an empty tab shows the new-tab page (favourites,
// most visited, a search box that opens the address bar); the shell loads no remote fonts or images; gentle motion is
// off when Windows asks for less motion. Screenshots of the shell in dark and light go to test-results/look-*.png.
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

let f: Ferrum;
const data = dataDir("look");
test.beforeAll(async () => { f = await launch("look", { data, userFileOnly: true }); });
test.afterAll(async () => { await f?.quit(); });

const token = (name: string) => f.shell.evaluate((n) => document.documentElement.style.getPropertyValue(n), name);
const shot = (name: string) => path.join(import.meta.dirname, "test-results", name);

test("light or dark follows Windows; Graphite's colours", async () => {
  await f.shell.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => token("--bg")).toBe("#141619");
  expect(await token("--accent")).toBe("#F97316");
  expect(await f.shell.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(20, 22, 25)");
  await f.shell.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => token("--bg")).toBe("#F2F3F4");
  expect(await token("--accent")).toBe("#C2410C");
  await f.shell.emulateMedia({ colorScheme: "dark" });
});

test("an empty tab shows the new-tab page; its search box opens the address bar", async () => {
  await go(f, `${base}/counted/lookoften`);
  await go(f, `${base}/landing?look`);
  await go(f, `${base}/counted/lookoften`);
  await call(f, "bookmark_add", { url: `${base}/landing?fav`, title: "Fav page", folder: null });
  const id = await call<number>(f, "tab_new", { url: null });
  await expect.poll(async () => (await tabList(f)).active).toBe(id);
  await expect(f.shell.locator("#newtab-panel")).toBeVisible();
  await expect(f.shell.locator("#nt-tiles a")).toHaveText(["FFav page"]);
  await expect(f.shell.locator("#nt-most a").first()).toHaveText("Counted lookoften");
  await f.shell.screenshot({ path: shot("look-dark.png") });
  await f.shell.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => token("--bg")).toBe("#F2F3F4");
  await f.shell.screenshot({ path: shot("look-light.png") });
  await f.shell.emulateMedia({ colorScheme: "dark" });
  await f.shell.locator("#nt-search").click();
  await expect.poll(() => f.shell.evaluate(() => document.activeElement?.id)).toBe("address");
  await f.shell.keyboard.press("Escape");
  // Opening a favourite leaves the new-tab page.
  await f.shell.locator("#nt-tiles a").first().click();
  await expect(f.shell.locator("#newtab-panel")).toBeHidden({ timeout: 15_000 });
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === id)?.url).toBe(`${base}/landing?fav`);
});

test("accent colour and density change at once from Settings and are saved", async () => {
  await f.shell.emulateMedia({ colorScheme: "dark" });
  await f.shell.locator("#settings-btn").click();
  await expect(f.shell.locator("#settings-panel")).toBeVisible();
  await f.shell.locator("#set-accents input[value='violet']").check();
  await expect.poll(() => token("--accent")).toBe("#8B5CF6");
  const before = await f.shell.evaluate(() => document.getElementById("toolbar")!.getBoundingClientRect().height);
  await f.shell.locator("#set-density").selectOption("compact");
  await expect.poll(() => f.shell.evaluate(() => document.getElementById("toolbar")!.getBoundingClientRect().height)).toBeLessThan(before);
  const a = await call<{ accent: string; density: string; theme: string }>(f, "appearance_get");
  expect([a.theme, a.accent, a.density]).toEqual(["graphite", "violet", "compact"]);
  // Back to the defaults for the other tests.
  await f.shell.locator("#set-accents input[value='orange']").check();
  await f.shell.locator("#set-density").selectOption("roomy");
  await expect.poll(() => token("--accent")).toBe("#F97316");
  await f.shell.locator("#settings-close").click();
});

test("the shell loads only its own fonts and files; less motion when Windows asks", async () => {
  const urls = await f.shell.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name));
  expect(urls.length).toBeGreaterThan(0);
  for (const u of urls) expect(u.startsWith("http://tauri.localhost/") || u.startsWith("http://ipc.localhost/") || u.startsWith("ipc:")).toBe(true);
  expect(urls.some((u) => /ibm-plex-sans-latin-400-normal.*\.woff2$/.test(u))).toBe(true);
  expect(await f.shell.evaluate(() => document.fonts.check("13px 'IBM Plex Sans'"))).toBe(true);
  await f.shell.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => f.shell.evaluate(() => getComputedStyle(document.querySelector(".tab")!).transitionDuration)).toBe("0s");
  await f.shell.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => f.shell.evaluate(() => getComputedStyle(document.querySelector(".tab")!).transitionDuration)).not.toBe("0s");
});
