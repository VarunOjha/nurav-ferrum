// p4.10: recovery from failed page processes. The debug-only test hook test_crash_tab lets one tab load the browser's
// own edge://kill page once, which ends that tab's page process (the method of spike S3; no kill command is used).
// The tab is then marked crashed and the shell covers it with "This page stopped working"; another site's tab and
// the shell keep working; Reload loads the page again in a new process. Outside the hook, crash pages are refused.
// The browser engine itself is ended the same way (edge://inducebrowsercrashforrealz): every view is gone, the shell's
// too, so Ferrum saves its tabs, closes and starts again by itself, and the session restore brings the tabs back.
import fs from "node:fs";
import path from "node:path";
import { test, expect, chromium } from "@playwright/test";
import { launch, reattach, go, call, audited, type Ferrum } from "./ferrum.ts";
import { base, cdpPort, dataDir } from "./paths.ts";

type Tab = { id: number; url: string; crashed: boolean };
type Tabs = { active: number | null; tabs: Tab[] };
const tabs = (f: Ferrum) => call<Tabs>(f, "tab_list");
const tabById = async (f: Ferrum, id: number) => (await tabs(f)).tabs.find((t) => t.id === id);
const pageAt = (f: Ferrum, url: string) => f.pages().find((p) => p.url() === url);
const logLines = (f: Ferrum, message: string) => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return [] as Record<string, unknown>[];
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as { fields: Record<string, unknown> }; } catch { return null; } })
    .filter((l) => l?.fields.message === message).map((l) => l!.fields);
};

const A = `${base}/landing?crash=a`;
const A2 = `${base}/landing?crash=a2`;
const B = "https://site-b.localhost:8443/landing?crash=b";

test.describe("a tab's page process fails", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("crash-recovery"); });
  test.afterAll(async () => { await f?.quit(); });

  test("a crashed tab shows the crash panel, the rest keeps working, and Reload brings the page back", async () => {
    // Tab B (another site, so another page process) first, then tab A, active.
    await go(f, B);
    await expect.poll(() => pageAt(f, B) !== undefined).toBe(true);
    const a = await call<number>(f, "tab_new", { url: A });
    await expect.poll(async () => (await tabById(f, a))?.url).toBe(A);
    await expect.poll(() => pageAt(f, A) !== undefined).toBe(true);
    expect((await tabs(f)).active).toBe(a);

    // A second tab of the same site, in the background: it may share tab A's page process.
    const a2 = await call<number>(f, "tab_new", { url: A2 });
    await expect.poll(() => pageAt(f, A2) !== undefined).toBe(true);
    await call(f, "tab_activate", { id: a });
    type Inventory = { processes: { pid: number; kind: string; frames: string[] }[] };
    const inv = await call<Inventory>(f, "test_processes");
    const hostOf = (url: string) => inv.processes.find((p) => p.kind === "renderer" && p.frames.includes(url))?.pid;
    const shared = hostOf(A) !== undefined && hostOf(A) === hostOf(A2);
    console.log(`CRASH-SHARED tab A and tab A2 ${shared ? "share" : "do not share"} a page process`);

    await call(f, "test_crash_tab", { id: a, page: "edge://kill" });
    await expect.poll(async () => (await tabById(f, a))?.crashed, { timeout: 15_000 }).toBe(true);
    // Every tab whose page ran in that process is reported as crashed too, not hidden (SEC-10); the others are not.
    await expect.poll(async () => (await tabById(f, a2))?.crashed).toBe(shared);
    // The tab keeps its real address (the crash page never becomes it).
    expect((await tabById(f, a))?.url).toBe(A);
    // The shell covers the tab and says what happened, with a Reload button.
    await expect(f.shell.locator("#error-panel")).toBeVisible();
    await expect(f.shell.locator("#error-panel")).toHaveAttribute("data-kind", "crashed");
    await expect(f.shell.locator("#error-title")).toHaveText("This page stopped working");
    await expect(f.shell.locator("#error-retry")).toHaveText("Reload");
    // The log names the failure.
    expect(logLines(f, "page process failed; tab marked crashed").some((l) => l.failure === "renderer-exited" && l.tab === a)).toBe(true);
    // The shell still answers, and the other site's tab still runs its page.
    expect(await call<string>(f, "app_ping")).toBeTruthy();
    expect(await pageAt(f, B)!.evaluate(() => 6 * 7)).toBe(42);
    expect((await tabs(f)).tabs.find((t) => t.url === B)?.crashed).toBe(false);

    // Reload: the page loads again in a new page process; the panel goes away.
    await f.shell.click("#error-retry");
    await expect.poll(async () => (await tabById(f, a))?.crashed, { timeout: 15_000 }).toBe(false);
    await expect(f.shell.locator("#error-panel")).toBeHidden();
    // The test robot keeps treating its old handle on the tab as crashed, so it looks at the tab afresh.
    const fresh = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    try {
      const p = fresh.contexts().flatMap((c) => c.pages()).find((x) => x.url() === A);
      expect(p, "the reloaded tab's page").toBeTruthy();
      expect(await p!.evaluate(() => [document.readyState, 6 * 7])).toEqual(["complete", 42]);
    } finally {
      await fresh.close(); // over CDP this only disconnects
    }
    expect(logLines(f, "crashed tab reloaded").length).toBeGreaterThan(0);
});

test("crash pages are refused outside the debug test hook", async () => {
  const before = (await tabs(f)).active!;
  await go(f, "edge://kill");
  await f.shell.waitForTimeout(1500);
  expect((await tabById(f, before))?.crashed).toBe(false);
  expect(audited(f, { action: "page", origin: "edge://kill", rule: "scheme-forbidden" })).toBeGreaterThan(0);
  await expect(call(f, "test_crash_tab", { page: "edge://settings" })).rejects.toThrow(/not a crash page/);
  expect(await call<string>(f, "app_ping")).toBeTruthy();
});
});

const savedUrls = (data: string) => {
  try {
    return (JSON.parse(fs.readFileSync(path.join(data, "session.json"), "utf8")).tabs as { url: string }[]).map((t) => t.url);
  } catch {
    return [];
  }
};

test.describe("the browser engine fails", () => {
  let g: Ferrum | undefined;
  test.afterEach(async () => { await g?.quit(); g = undefined; });

  test("Ferrum starts again by itself and brings the tabs back", async () => {
    const data = dataDir("crash-browser");
    const sites = [`${base}/landing?engine=1`, "https://site-b.localhost:8443/landing?engine=2"];
    const first = await launch("crash-browser", { data });
    g = first;
    for (const t of (await tabs(first)).tabs) await call(first, "tab_close", { id: t.id });
    for (const s of sites) await call(first, "tab_new", { url: s });
    await expect.poll(() => savedUrls(data), { timeout: 10_000 }).toEqual(sites);
    g = undefined;
    // The shell goes down with the engine, so the call itself gets no answer.
    await call(first, "test_crash_tab", { page: "edge://inducebrowsercrashforrealz" }).catch(() => {});
    await new Promise<void>((r) => (first.proc.exitCode !== null ? r() : first.proc.once("exit", () => r())));
    await first.browser.close().catch(() => {});
    expect(first.proc.exitCode).toBe(0); // Ferrum closed itself in order to start again (not a crash of Ferrum)
    const log = () => fs.readFileSync(path.join(data, "logs", "ferrum.jsonl"), "utf8");
    expect(log()).toContain("browser process failed; Ferrum restarts and restores the tabs");
    g = await reattach(first);
    await expect.poll(async () => (await tabs(g!)).tabs.map((t) => t.url)).toEqual(sites);
    // The restored tabs load their pages in the new engine.
    for (const s of sites) {
      await expect.poll(async () => g!.pages().find((p) => p.url() === s)?.evaluate(() => document.readyState).catch(() => "")).toBe("complete");
    }
    expect(log()).toContain("Ferrum started again");
    expect(await call<string>(g, "app_ping")).toBeTruthy();
});
});