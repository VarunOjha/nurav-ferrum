// Launches Ferrum for a smoke test and connects Playwright over CDP (adr-0031). Ferrum is closed with the shell's
// app_quit command (and FERRUM_EXIT_AFTER as a safety net), never killed.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, chromium, type Browser, type Page } from "@playwright/test";
import { ferrumExe, cdpPort, dataDir } from "./paths.ts";

export type Ferrum = {
  proc: ChildProcess;
  browser: Browser;
  shell: Page;
  /** The page of the only open tab view (throws when several tab views are open: use `pages()` then). */
  readonly content: Page;
  /** Every open tab view's page (not the shell). */
  pages: () => Page[];
  data: string;
  quit: () => Promise<void>;
};

/** Writes a settings file for the run and returns its path. */
export function settings(data: string, extra = "", perSite = false): string {
  const p = path.join(data, "config.toml");
  // Tests written before per-site profiles (P2, and P3 tests not about profiles) run with one shared profile, as P2
  // did; the p3.6 tests ask for per-site profiles, Ferrum's default.
  const isolation = perSite ? "" : '[isolation]\nmode = "shared"\n';
  fs.writeFileSync(p, `version = 2\n[storage]\ndata_dir = ${JSON.stringify(data)}\n${isolation}${extra}`);
  return p;
}

async function waitCdp(ms: number): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Ferrum's CDP endpoint did not appear");
}

export type LaunchOptions = {
  data?: string;
  extraSettings?: string;
  env?: Record<string, string>;
  /** Put the run's settings in the user settings file only (no --config override), so settings saved by Ferrum's
   * settings screen apply after a restart (p3.14). */
  userFileOnly?: boolean;
  /** Use per-site profiles (Ferrum's default); otherwise the run shares one profile. */
  perSite?: boolean;
  /** Extra command-line arguments (default: `--user-config <data>/user-config.toml`, never the real settings file). */
  args?: string[];
  /** Extra environment that depends on the run's data folder (for example a mock launcher's log file). */
  envFromData?: (data: string) => Record<string, string>;
};

export async function launch(name: string, opts: LaunchOptions = {}): Promise<Ferrum> {
  const data = opts.data ?? dataDir(name);
  const config = settings(data, opts.extraSettings ?? "", opts.perSite ?? false);
  const userFile = path.join(data, "user-config.toml");
  if (opts.userFileOnly && !fs.existsSync(userFile)) fs.copyFileSync(config, userFile);
  // The user settings file is the run's own (never the real one in %APPDATA%), unless the test names another.
  const args = opts.args ?? ["--user-config", userFile];
  const proc = spawn(ferrumExe, [...(opts.userFileOnly ? [] : ["--config", config]), ...args], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${cdpPort}`,
      FERRUM_EXIT_AFTER: "600",
      ...(opts.env ?? {}),
      ...(opts.envFromData?.(data) ?? {}),
    },
    // The app's own messages go to app.log in the run's data folder (for diagnosing a failed run).
    stdio: ["ignore", fs.openSync(path.join(data, "app.log"), "a"), fs.openSync(path.join(data, "app.log"), "a")],
  });
  await waitCdp(30_000);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
  const all = () => browser.contexts().flatMap((c) => c.pages()).filter((p) => !p.isClosed());
  // Wait until the shell has loaded and the first tab's view exists (while it starts, the shell's address is briefly
  // about:blank like a tab view's, so tab views are only counted once the shell is known).
  let shell: Page | undefined;
  for (let i = 0; i < 120; i++) {
    shell = all().find((p) => p.url().startsWith("http://tauri.localhost"));
    if (shell && all().length >= 2) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!shell || all().length < 2) throw new Error("shell or first tab view not found over CDP");
  // Then until the shell's start-up has run to the end (its key and button handlers are in place); on a busy PC a key
  // pressed earlier would be lost.
  await shell.waitForSelector("html[data-ready]", { state: "attached", timeout: 30_000 });
  const tabPages = () => all().filter((p) => p !== shell);
  const quit = async () => {
    await shell!.evaluate(() => (window as any).__TAURI_INTERNALS__.invoke("app_quit")).catch(() => {});
    await gone(proc, browser);
  };
  return {
    proc, browser, shell: shell!, data, quit, pages: tabPages,
    get content(): Page {
      const p = tabPages();
      if (p.length !== 1) throw new Error(`${p.length} tab views are open; pick one with pages()`);
      return p[0]!;
    },
  };
}

/** Waits until Ferrum's process has ended and WebView2's debugging port is free (so the next launch cannot connect to
 * the old instance, and the data folder is no longer in use). Ferrum is never killed. */
async function gone(proc: ChildProcess, browser: Browser): Promise<void> {
  await browser.close().catch(() => {}); // over CDP this only disconnects
  await new Promise<void>((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) return resolve();
    const t = setTimeout(resolve, 15_000);
    proc.once("exit", () => { clearTimeout(t); resolve(); });
  });
  for (let i = 0; i < 60; i++) {
    const up = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then(() => true, () => false);
    if (!up) break;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Waits for a Ferrum that ended by itself (for example after test_crash). */
export const waitGone = (f: Ferrum) => gone(f.proc, f.browser);

/** Types into the shell's address bar and presses Enter. */
export async function go(f: Ferrum, input: string): Promise<void> {
  await f.shell.fill("#address", input);
  await f.shell.press("#address", "Enter");
}

/** Opens `url` like go() and waits until the visit is in history (the next go() would otherwise cancel the load). */
export async function visit(f: Ferrum, url: string): Promise<void> {
  await go(f, url);
  await expect
    .poll(async () => (await call<{ url: string }[]>(f, "history_list", { query: null, limit: null })).some((e) => e.url === url), { timeout: 15_000 })
    .toBe(true);
}

/** Calls an app command from the shell (the only web view allowed to). */
export function call<T = unknown>(f: Ferrum, cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  return f.shell.evaluate(([c, a]) => (window as any).__TAURI_INTERNALS__.invoke(c, a), [cmd, args] as const) as Promise<T>;
}

export type TabList = { active: number | null; tabs: { id: number; url: string; title: string; loading: boolean; profile: string }[] };

/** The app's tab list. */
export const tabList = (f: Ferrum) => call<TabList>(f, "tab_list");

/**
 * Presses real keys (Windows SendKeys syntax: ^ Ctrl, + Shift, % Alt, {TAB}, {F5}, ...) while Ferrum is the active
 * window. Real keys are needed for keys pressed inside a page: CDP key events go straight to the page and never reach
 * WebView2's accelerator-key hook (observed in p3.3). Throws when Ferrum is not in front (nothing is sent then).
 */
export function realKeys(f: Ferrum, keys: string): void {
  const script =
    "Add-Type -Name U -Namespace FerrumKeys -MemberDefinition '[DllImport(\"user32.dll\")] public static extern System.IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint p);';" +
    "$p = 0; [void][FerrumKeys.U]::GetWindowThreadProcessId([FerrumKeys.U]::GetForegroundWindow(), [ref]$p);" +
    `if ($p -ne ${f.proc.pid}) { 'NOT-FRONT' } else { (New-Object -ComObject WScript.Shell).SendKeys($env:FERRUM_KEYS); 'SENT' }`;
  const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { env: { ...process.env, FERRUM_KEYS: keys } })
    .toString()
    .trim();
  if (out !== "SENT") throw new Error(`Ferrum was not the active window, so the keys ${keys} were not sent (${out})`);
}
