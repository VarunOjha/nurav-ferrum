// p4.8: websites cannot reach Ferrum's own controls. A tab's page has no bridge to the app at all, and a tab never
// loads Ferrum's own pages (tauri.localhost, tauri:, ipc.localhost): typed, by link or by window.open, each attempt is
// refused and logged with the rule app-origin (or, for the tauri: scheme, the same rule). The shell's own bridge still
// works (positive control).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, audited, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

type LogLine = { target: string; fields: Record<string, unknown> };
const appOriginLog = (f: Ferrum) => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return 0;
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LogLine; } catch { return null; } })
    .filter((l) => l?.target === "ferrum::policy" && l.fields.message === "navigation denied" && l.fields.rule === "app-origin").length;
};
// p4.9: a refusal counts only when the security audit log (schema-checked) has it too.
const appOriginDenials = (f: Ferrum) => Math.min(appOriginLog(f), audited(f, { rule: "app-origin" }));
const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const open = async (f: Ferrum, sel: string) => {
  await go(f, `${base}/links/app-origin`);
  await expect.poll(() => href(f)).toBe(`${base}/links/app-origin`);
  await expect(f.content.locator(sel)).toBeVisible();
};
const noTabOnApp = async (f: Ferrum) => {
  for (const t of (await tabList(f)).tabs) expect(t.url).not.toMatch(/tauri\.localhost|^tauri:|ipc\.localhost/);
};

let f: Ferrum;
test.beforeAll(async () => { f = await launch("app-origin"); });
test.afterAll(async () => { await f?.quit(); });

test("a tab's page has no bridge to the app; the shell's does", async () => {
  await open(f, "#app-http");
  expect(await f.content.evaluate(() => typeof (window as any).__TAURI_INTERNALS__)).toBe("undefined");
  expect(await f.content.evaluate(() => typeof (window as any).ipc)).toBe("undefined");
  expect(await call<string>(f, "app_ping")).toBeTruthy();
});

test("links to Ferrum's own pages are refused and logged", async () => {
  for (const sel of ["#app-http", "#app-scheme", "#app-ipc"]) {
    await open(f, sel);
    const before = appOriginDenials(f);
    await f.content.click(sel, { noWaitAfter: true });
    await expect.poll(() => appOriginDenials(f), { message: sel }).toBeGreaterThan(before);
    await expect.poll(() => href(f)).toBe(`${base}/links/app-origin`);
    await noTabOnApp(f);
  }
});

test("a pop-up to Ferrum's own page opens nothing and is logged", async () => {
  await open(f, "#app-open");
  const before = appOriginDenials(f);
  await f.content.click("#app-open");
  await expect.poll(() => appOriginDenials(f)).toBeGreaterThan(before);
  expect((await tabList(f)).tabs.length).toBe(1);
  await noTabOnApp(f);
});

test("typing Ferrum's own address in the address bar does not load it in the tab", async () => {
  await open(f, "#app-http");
  const before = appOriginDenials(f);
  await go(f, "http://tauri.localhost/index.html");
  await expect.poll(() => appOriginDenials(f)).toBeGreaterThan(before);
  await expect.poll(() => href(f)).toBe(`${base}/links/app-origin`);
  await noTabOnApp(f);
});

test("the shell itself cannot be led to a website (threat T03)", async () => {
  const shellUrl = f.shell.url();
  await f.shell.evaluate((u) => { location.href = u; }, `${base}/landing`).catch(() => {});
  await f.shell.waitForTimeout(1500);
  expect(f.shell.url()).toBe(shellUrl);
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  expect(fs.readFileSync(p, "utf8")).toContain("shell-app-only");
  expect(audited(f, { tab: 0, action: "shell", rule: "shell-app-only" })).toBeGreaterThan(0);
  expect(await call<string>(f, "app_ping")).toBeTruthy(); // the shell still works
});
