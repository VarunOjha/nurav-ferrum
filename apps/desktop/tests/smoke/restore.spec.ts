// p3.5: the open tabs come back after a normal exit and after a crash; a restored tab whose site cannot be reached
// shows Ferrum's error panel instead of failing. The crash is the debug-only test_crash command (the process ends at
// once, like a crash; no kill command is used). Back/forward history is not restored (WebView2 has no way to set it).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, waitGone, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

let f: Ferrum | undefined;
test.afterEach(async () => { await f?.quit(); f = undefined; });

const urls = async (x: Ferrum) => (await tabList(x)).tabs.map((t) => t.url);
const activeUrl = async (x: Ferrum) => {
  const l = await tabList(x);
  return l.tabs.find((t) => t.id === l.active)?.url;
};
const savedUrls = (data: string) => {
  try {
    return (JSON.parse(fs.readFileSync(path.join(data, "session.json"), "utf8")).tabs as { url: string }[]).map((t) => t.url);
  } catch {
    return [];
  }
};

/** Replaces the start tab with tabs at `sites`, and activates the second one. */
async function openSites(x: Ferrum, sites: string[]): Promise<void> {
  for (const t of (await tabList(x)).tabs) await call(x, "tab_close", { id: t.id });
  for (const s of sites) await call(x, "tab_new", { url: s });
  await expect.poll(() => urls(x)).toEqual(sites);
  await call(x, "tab_activate", { id: (await tabList(x)).tabs[1]!.id });
}

test("tabs come back after a normal exit, with the same active tab", async () => {
  const data = dataDir("restore-exit");
  const sites = [1, 2, 3].map((n) => `${base}/landing?restore=${n}`);
  f = await launch("restore-exit", { data });
  await openSites(f, sites);
  await f.quit();
  f = await launch("restore-exit", { data });
  await expect.poll(() => urls(f!)).toEqual(sites);
  await expect.poll(() => activeUrl(f!)).toBe(sites[1]);
});

test("tabs come back after a crash (the last save)", async () => {
  const data = dataDir("restore-crash");
  const sites = [1, 2, 3, 4].map((n) => `${base}/landing?crash=${n}`);
  f = await launch("restore-crash", { data });
  await openSites(f, sites);
  // The saver writes within about a second of a change.
  await expect.poll(() => savedUrls(data), { timeout: 10_000 }).toEqual(sites);
  const crashed = f;
  f = undefined;
  await crashed.shell.evaluate(() => (window as any).__TAURI_INTERNALS__.invoke("test_crash")).catch(() => {});
  await waitGone(crashed);
  expect(crashed.proc.exitCode).not.toBe(0); // it really ended abnormally
  f = await launch("restore-crash", { data });
  await expect.poll(() => urls(f!)).toEqual(sites);
  await expect.poll(() => activeUrl(f!)).toBe(sites[1]);
});

test("a restored tab whose site is unreachable shows the error panel", async () => {
  const data = dataDir("restore-unreachable");
  fs.writeFileSync(
    path.join(data, "session.json"),
    JSON.stringify({ version: 1, saved_at: 0, active: 0, tabs: [{ url: "https://127.0.0.1:1/", title: "", profile: "" }] }),
  );
  f = await launch("restore-unreachable", { data });
  await expect.poll(() => urls(f!)).toEqual(["https://127.0.0.1:1/"]);
  await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
  await expect(f.shell.locator("#error-panel")).toBeVisible();
});

test("restore_on_startup = false opens the start-up pages instead", async () => {
  const data = dataDir("restore-off");
  fs.writeFileSync(
    path.join(data, "session.json"),
    JSON.stringify({ version: 1, saved_at: 0, active: 0, tabs: [{ url: `${base}/landing?old`, title: "", profile: "" }] }),
  );
  f = await launch("restore-off", {
    data,
    extraSettings: `[session]\nrestore_on_startup = false\nstartup_urls = ["${base}/landing?fresh"]\n`,
  });
  await expect.poll(() => urls(f!)).toEqual([`${base}/landing?fresh`]);
});
