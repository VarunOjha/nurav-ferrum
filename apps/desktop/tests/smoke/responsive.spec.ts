// p3.9: with a tab whose script never stops (fixture /busy on site-a), the shell stays usable: switching to another
// tab (site-b) and typing an address there both finish within a fixed threshold. The threshold is a requirement of the
// test, not a measurement result (no performance claim is made). Per-site profiles, Ferrum's default.
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const BUSY = "https://site-a.localhost:8443/busy";
const OTHER = "https://site-b.localhost:8443/landing";
const THRESHOLD_MS = 5_000; // requirement: each step finishes within 5 s while the busy tab spins

let f: Ferrum;
test.beforeAll(async () => { f = await launch("responsive", { perSite: true }); });
test.afterAll(async () => { await f?.quit(); });

test("a busy tab does not block switching tabs or typing in the address bar", async () => {
  const other = await call<number>(f, "tab_new", { url: OTHER });
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === other)?.url).toBe(OTHER);
  const busy = await call<number>(f, "tab_new", { url: BUSY });
  // Let its script start spinning (it starts 200 ms after load).
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === busy)?.title).toBe("Busy page");
  await f.shell.waitForTimeout(1_000);

  let t0 = Date.now();
  await call(f, "tab_activate", { id: other });
  await expect(f.shell.locator(`.tab[data-id="${other}"]`)).toHaveAttribute("aria-selected", "true", { timeout: THRESHOLD_MS });
  const switchMs = Date.now() - t0;

  t0 = Date.now();
  await f.shell.fill("#address", `${OTHER}?typed`);
  await f.shell.press("#address", "Enter");
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === other)?.url, { timeout: THRESHOLD_MS })
    .toBe(`${OTHER}?typed`);
  await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "loaded", { timeout: THRESHOLD_MS });
  const typeMs = Date.now() - t0;
  console.log(`p3.9 result: switch ${switchMs} ms, type-and-load ${typeMs} ms (threshold ${THRESHOLD_MS} ms each)`);
  expect(switchMs).toBeLessThan(THRESHOLD_MS);
  expect(typeMs).toBeLessThan(THRESHOLD_MS);

  // The spinning tab can still be closed.
  expect(await call<boolean>(f, "tab_close", { id: busy })).toBe(true);
  await expect.poll(async () => (await tabList(f)).tabs.some((t) => t.id === busy)).toBe(false);
});
