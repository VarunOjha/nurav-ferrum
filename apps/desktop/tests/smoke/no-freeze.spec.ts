// p3.10: tab creation never hangs the app. Tabs are created, navigated and closed from the shell's command path in a
// fast loop without waiting for each to finish (and pop-ups create tabs from page events); everything must settle
// within the time limit, and the app must still answer afterwards with as many views as tabs.
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("no-freeze", { perSite: true }); });
test.afterAll(async () => { await f?.quit(); });

test("a burst of tab commands settles without hanging", async () => {
  test.setTimeout(90_000);
  const sites = ["https://site-a.localhost:8443", "https://site-b.localhost:8443", base];
  // Fire the commands without awaiting each one: they must all return although views are still being made.
  const calls: Promise<unknown>[] = [];
  for (let i = 0; i < 30; i++) {
    calls.push(call(f, "tab_new", { url: `${sites[i % 3]}/landing?burst=${i}` }));
    if (i % 3 === 2) calls.push(call(f, "tab_navigate", { input: `${sites[(i + 1) % 3]}/landing?moved=${i}` }));
    if (i % 5 === 4) calls.push(call(f, "tab_close", { id: null }));
  }
  const settled = await Promise.race([
    Promise.allSettled(calls).then(() => "returned"),
    new Promise((r) => setTimeout(() => r("timed out"), 30_000)),
  ]);
  expect(settled).toBe("returned");
  // Every view the list needs exists, and the app still answers.
  await expect.poll(async () => {
    const s = await call<{ tabs: number; views: number }>(f, "test_stats");
    return s.tabs === s.views;
  }, { timeout: 45_000 }).toBe(true);
  const l = await tabList(f);
  expect(l.tabs.length).toBeGreaterThan(20);
  // Pop-ups: tabs created from page events (a window.open in the active page), while the shell keeps working.
  const before = l.tabs.length;
  await call(f, "tab_new", { url: `${base}/links/popup` });
  await expect.poll(async () => (await tabList(f)).tabs.length, { timeout: 15_000 }).toBe(before + 2);
  expect(await f.shell.evaluate(() => document.getElementById("address") !== null)).toBe(true);
});
