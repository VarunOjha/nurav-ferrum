// p3.4: start-up sites open as tabs in the order of the settings file (the first one active); a user settings file
// that cannot be read leaves a backup copy and Ferrum starts with the defaults; a file from a newer Ferrum is never
// touched. (Each run uses its own user settings file through --user-config, never the real one.)
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

let f: Ferrum | undefined;
test.afterEach(async () => { await f?.quit(); f = undefined; });

const logText = (data: string) => {
  const p = path.join(data, "logs", "ferrum.jsonl");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};

test("start-up sites open as tabs, in order, the first active", async () => {
  const sites = [1, 2, 3].map((n) => `${base}/landing?start=${n}`);
  f = await launch("startup", { extraSettings: `[session]\nstartup_urls = ${JSON.stringify(sites)}\n` });
  await expect.poll(async () => (await tabList(f!)).tabs.map((t) => t.url)).toEqual(sites);
  const l = await tabList(f);
  expect(l.active).toBe(l.tabs[0]!.id);
  await expect(f.shell.locator(".tab")).toHaveCount(3);
  await expect(f.shell.locator("#address")).toHaveValue(sites[0]!);
});

test("an unreadable user settings file is backed up; Ferrum starts with the defaults", async () => {
  const data = dataDir("startup-broken");
  const user = path.join(data, "user-config.toml");
  const broken = '[session\nstartup_urls = ["https://localhost:8443/landing?broken"\n';
  fs.writeFileSync(user, broken);
  f = await launch("startup-broken", { data, args: ["--user-config", user] });
  await expect.poll(async () => (await tabList(f!)).tabs.map((t) => t.url)).toEqual(["about:blank"]);
  const backups = fs.readdirSync(data).filter((n) => n.startsWith("user-config.toml.broken-"));
  expect(backups.length).toBe(1);
  expect(fs.readFileSync(path.join(data, backups[0]!), "utf8")).toBe(broken);
  expect(fs.readFileSync(user, "utf8")).toBe(broken); // the original is left as it was
  expect(logText(data)).toContain("a copy was kept as");
});

test("a settings file from a newer Ferrum is left untouched", async () => {
  const data = dataDir("startup-newer");
  const user = path.join(data, "user-config.toml");
  const newer = `version = 99\n[session]\nstartup_urls = ["${base}/landing?newer"]\n`;
  fs.writeFileSync(user, newer);
  f = await launch("startup-newer", { data, args: ["--user-config", user] });
  await expect.poll(async () => (await tabList(f!)).tabs.map((t) => t.url)).toEqual(["about:blank"]);
  expect(fs.readFileSync(user, "utf8")).toBe(newer);
  expect(fs.readdirSync(data).filter((n) => n.includes(".broken-"))).toEqual([]);
  expect(logText(data)).toContain("newer Ferrum");
});
