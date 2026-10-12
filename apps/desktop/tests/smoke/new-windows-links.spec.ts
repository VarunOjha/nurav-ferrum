// p2.10: target=_blank and window.open follow the new_window setting (same view, or the system browser); links to
// other apps show the shell's confirmation bar and launch nothing without the user's click. The launcher is mocked
// (FERRUM_LAUNCHER_LOG, debug builds only): a "launch" is a line in a file; nothing opens. Every test sets up its own
// page, so one failure does not hide the next.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, type Ferrum } from "./ferrum.ts";
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
const dumpOnFailure = (get: () => Ferrum | undefined) =>
  test.afterEach(async ({}, info) => {
    // On failure, keep what the shell saw (its event list) in the report.
    if (info.status !== info.expectedStatus) console.log("shell events:", await get()?.shell.evaluate(() => document.title).catch(String));
  });

test.describe("default settings (same view, confirm other apps)", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("links", { envFromData: mockLauncher }); });
  test.afterAll(async () => { await f?.quit(); });
  dumpOnFailure(() => f);

  test("target=_blank opens in the same view, no extra window", async () => {
    await open(f, "/links/blank", "#blank");
    await f.content.click("#blank");
    await expect.poll(() => href(f)).toBe(`${base}/landing`);
    await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing`);
    expect(pageCount(f)).toBe(2);
  });

  test("window.open from a click opens in the same view", async () => {
    await open(f, "/links/blank", "#open");
    await f.content.click("#open");
    await expect.poll(() => href(f)).toBe(`${base}/landing`);
    expect(pageCount(f)).toBe(2);
  });

  test("a pop-up opened by script alone also stays in the same view (no new window)", async () => {
    await open(f, "/links/popup", "#popup");
    await expect.poll(() => href(f)).toBe(`${base}/landing`);
    expect(pageCount(f)).toBe(2);
    expect(launches(f)).toEqual([]);
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
