// p3.14: the settings screen in the shell. Changing start-up sites, a per-site profile and the download folder saves the
// user settings file and takes effect (profiles and the folder at once, start-up sites at the next start); after a
// restart the changes are still there; invalid input is refused with plain messages and the file stays as it was. The
// run keeps everything in its own user settings file (no override), as a real install does. (That pages cannot call
// the settings commands is shown by the p2.3 IPC test, which now also tries settings_set.)
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

const A = "https://site-a.localhost:8443";
let f: Ferrum | undefined;
test.afterEach(async () => { await f?.quit(); f = undefined; });

const shown = async () => (await call<{ shown: number[] }>(f!, "test_stats")).shown;

test("change settings, see them take effect, restart, still there", async () => {
  const data = dataDir("settings");
  const folder = path.join(data, "chosen-downloads");
  fs.mkdirSync(folder, { recursive: true });
  const userFile = path.join(data, "user-config.toml");
  f = await launch("settings", { data, perSite: true, userFileOnly: true });
  await go(f, `${base}/landing?before`);
  await expect.poll(async () => (await tabList(f!)).tabs[0]!.url).toBe(`${base}/landing?before`);

  await f.shell.click("#settings-btn");
  await expect(f.shell.locator("#settings-panel")).toBeVisible();
  await expect.poll(shown).toEqual([]); // the page is hidden while the settings show
  await f.shell.fill("#set-startup", `${base}/landing?start=1\n\n${base}/landing?start=2`);
  await f.shell.uncheck("#set-restore");
  await f.shell.click("#set-add-site");
  await f.shell.locator("#set-sites .set-site").last().fill("site-a.localhost");
  await f.shell.locator("#set-sites .set-profile").last().fill("work");
  await f.shell.fill("#set-folder", folder);
  await f.shell.click("#settings-save");
  await expect(f.shell.locator("#settings-status")).toHaveText("Saved");
  await expect(f.shell.locator("#settings-errors li")).toHaveCount(0);
  const saved = fs.readFileSync(userFile, "utf8");
  expect(saved).toContain("version = 4"); // p4.20: settings version 4
  expect(saved).toContain(`${base}/landing?start=2`);
  expect(saved).toContain('profile = "work"');
  await f.shell.click("#settings-close");
  await expect(f.shell.locator("#settings-panel")).toBeHidden();
  await expect.poll(shown).toEqual([(await tabList(f)).active]);

  // In effect at once: the named profile for site-a, and the chosen download folder.
  const id = await call<number>(f, "tab_new", { url: `${A}/landing` });
  await expect.poll(async () => (await tabList(f!)).tabs.find((t) => t.id === id)?.profile).toBe("user-work");
  await go(f, `${base}/download/file?bytes=1000`);
  await expect.poll(() => fs.existsSync(path.join(folder, "fixture-1000.bin")), { timeout: 20_000 }).toBe(true);

  // After a restart: the start-up sites open (restore is off) and the settings are unchanged.
  await f.quit();
  f = await launch("settings", { data, perSite: true, userFileOnly: true });
  await expect.poll(async () => (await tabList(f!)).tabs.map((t) => t.url)).toEqual([
    `${base}/landing?start=1`, `${base}/landing?start=2`,
  ]);
  const v = await call<{ sites: { site: string; profile: string }[]; download_folder: string; restore_on_startup: boolean }>(f, "settings_get");
  expect(v.sites).toEqual([{ site: "site-a.localhost", profile: "work", permissions: [], never: [] }]); // p4.5, p4.20: answers travel with the row
  expect(v.download_folder).toBe(folder);
  expect(v.restore_on_startup).toBe(false);
});

test("invalid input is refused with plain messages; the file is unchanged", async () => {
  const data = dataDir("settings-bad");
  const userFile = path.join(data, "user-config.toml");
  f = await launch("settings-bad", { data, perSite: true, userFileOnly: true });
  const before = fs.readFileSync(userFile, "utf8");
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press("Control+,"); // the settings shortcut
  await expect(f.shell.locator("#settings-panel")).toBeVisible();
  await f.shell.fill("#set-startup", "not a web address at all");
  await f.shell.click("#set-add-site");
  await f.shell.locator("#set-sites .set-site").last().fill("www.example.com");
  await f.shell.fill("#set-folder", path.join(data, "does-not-exist"));
  await f.shell.click("#settings-save");
  await expect(f.shell.locator("#settings-status")).toHaveText("Not saved");
  const errors = await f.shell.locator("#settings-errors li").allTextContents();
  expect(errors.some((e) => e.includes("is not a web address"))).toBe(true);
  expect(errors.some((e) => e.includes("does not exist"))).toBe(true);
  expect(errors.some((e) => e.includes("not a site"))).toBe(true);
  expect(fs.readFileSync(userFile, "utf8")).toBe(before);
  const v = await call<{ startup_urls: string[]; sites: unknown[] }>(f, "settings_get");
  expect(v.startup_urls).toEqual([]);
  expect(v.sites).toEqual([]);
});
