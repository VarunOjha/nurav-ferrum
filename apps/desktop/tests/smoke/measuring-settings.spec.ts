// p5.11: the settings screen switches Ferrum's own measuring (owner answer Q-230: off by default) and the network log
// (Q-114: off by default) on and off, and sets how long their files are kept; changes apply at the next start. The run
// keeps everything in its own user settings file, as a real install does. Off: no files are written. On: a measuring
// run that passes the export checker (run line, process samples, the startup chain, navigation and tab-change records)
// and a network log session. Off again: nothing new is written.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

let f: Ferrum | undefined;
test.afterEach(async () => { await f?.quit(); f = undefined; });

type Check = { run: Record<string, unknown>; kinds: Record<string, number> };
const list = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : []);

/** Loads two pages in a new tab and switches tabs once (navigation and tab-change records), then waits for samples. */
async function browse(ferrum: Ferrum) {
  const first = (await tabList(ferrum)).active!;
  const id = await call<number>(ferrum, "tab_new", { url: `${base}/netlog` });
  await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.title, { timeout: 30_000 }).toBe("netlog done");
  await go(ferrum, `${base}/landing?second`);
  await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.url, { timeout: 30_000 }).toBe(`${base}/landing?second`);
  await call(ferrum, "tab_activate", { id: first });
  await new Promise((r) => setTimeout(r, 3500)); // samples at 1 s; the recorder writes every second
}

/** Opens the settings screen, applies `set`, saves, closes. */
async function changeSettings(ferrum: Ferrum, set: (s: Ferrum["shell"]) => Promise<void>) {
  await ferrum.shell.click("#settings-btn");
  await expect(ferrum.shell.locator("#settings-panel")).toBeVisible();
  await set(ferrum.shell);
  await ferrum.shell.click("#settings-save");
  await expect(ferrum.shell.locator("#settings-status")).toHaveText("Saved");
  await ferrum.shell.click("#settings-close");
}

test("switching measuring and the network log on and off writes files or not", async () => {
  test.setTimeout(300_000);
  const data = dataDir("measuring-settings");
  const tel = path.join(data, "telemetry");
  const net = path.join(data, "netlogs");
  const userFile = path.join(data, "user-config.toml");
  const start = { data, userFileOnly: true, extraSettings: `[session]\nrestore_on_startup = false\nstartup_urls = [${JSON.stringify(`${base}/landing`)}]\n` };

  // 1. Defaults: both off, 14 days; nothing written.
  f = await launch("measuring-settings", start);
  await f.shell.click("#settings-btn");
  await expect(f.shell.locator("#set-telemetry")).not.toBeChecked();
  await expect(f.shell.locator("#set-netlog")).not.toBeChecked();
  await expect(f.shell.locator("#set-telemetry-days")).toHaveValue("14");
  await expect(f.shell.locator("#set-netlog-days")).toHaveValue("14");
  // a bad number of days is refused with a plain message, and nothing is saved
  await f.shell.fill("#set-telemetry-days", "5000");
  await f.shell.click("#settings-save");
  await expect(f.shell.locator("#settings-status")).toHaveText("Not saved");
  await expect(f.shell.locator("#settings-errors li")).toContainText(["Measuring files: keep them 0 (never delete) to 3650 days, not 5000."]);
  await f.shell.click("#settings-close");
  expect(await call(f, "log_folder", { kind: "telemetry" })).toEqual({ path: tel, exists: false });
  expect(await call(f, "log_folder", { kind: "network" })).toEqual({ path: net, exists: false });
  await browse(f);
  await f.quit();
  expect([fs.existsSync(tel), fs.existsSync(net)]).toEqual([false, false]);

  // 2. Switch both on (7 days for the measuring files): saved, applies at the next start, so still nothing written.
  f = await launch("measuring-settings", start);
  await changeSettings(f, async (s) => {
    await s.check("#set-telemetry");
    await s.check("#set-netlog");
    await s.fill("#set-telemetry-days", "7");
  });
  const saved = fs.readFileSync(userFile, "utf8");
  expect(saved).toMatch(/\[telemetry\][^[]*enabled = true[^[]*retention_days = 7/);
  expect(saved).toMatch(/\[network_log\][^[]*enabled = true/);
  expect(await call(f, "test_netlog")).toBeNull();
  await f.quit();
  expect(fs.existsSync(tel)).toBe(false);

  // 3. On: a measuring run and a network log session are written.
  f = await launch("measuring-settings", start);
  expect(await call(f, "test_netlog")).not.toBeNull();
  await browse(f);
  await f.quit();
  const runs = list(tel);
  expect(runs.length, runs.join(", ")).toBe(1);
  expect(runs[0]).toMatch(/^\d{8}-\d{6}-\d+\.0000\.jsonl$/); // finished: no .part left
  const sessions = list(net);
  expect(sessions.length).toBe(1);
  expect(list(path.join(net, sessions[0])).length).toBeGreaterThan(0);

  // 4. The measuring file passes the export checker; then switch both off again.
  f = await launch("measuring-settings", start);
  const c = await call<Check>(f, "test_check_export", { path: path.join(tel, runs[0]) });
  expect(c.run.os_build).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  expect(c.run.git_sha).toMatch(/^[0-9a-f]{7,40}$/);
  expect(c.run.machine_id).toBe("unrecorded");
  expect(c.run.sample_interval_ms).toBe(1000);
  expect(c.kinds.startup_mark).toBe(5);
  for (const k of ["process_sample", "tree_sample", "nav_timing", "lifecycle_transition"]) expect(c.kinds[k] ?? 0, k).toBeGreaterThan(0);
  await changeSettings(f, async (s) => {
    await s.uncheck("#set-telemetry");
    await s.uncheck("#set-netlog");
  });
  await f.quit(); // this start still had both on (the change applies at the next start), so it wrote its own files
  const before = [list(tel), list(net)];
  expect(before[0].length).toBe(2);

  // 5. Off again: nothing new is written.
  f = await launch("measuring-settings", start);
  expect(await call(f, "test_netlog")).toBeNull();
  await browse(f);
  await f.quit();
  expect([list(tel), list(net)]).toEqual(before);
  console.log(`MEASURING-SETTINGS: off: no files; on: run ${runs[0].replace(/-\d+\.0000/, "-<pid>.0000")} with ${JSON.stringify(c.kinds)}, one network log session; off again: nothing new (os_build ${c.run.os_build}, webview2 ${c.run.webview2_runtime})`);
});
