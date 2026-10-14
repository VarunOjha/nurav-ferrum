// p4.18 (owner answer Q-225): SmartScreen is on in every Ferrum environment. (1) In each isolation mode, with two sites
// open, the command line of every browser process Ferrum started (the shell's environment and, under per-site-udf, each
// site's) has Ferrum's switches and not `msSmartScreenProtection`; only the switches are printed, never the whole command
// line (it holds the data folder's path). (2) Microsoft's SmartScreen demo phishing page
// (raw/research/smartscreen-webview2.md, 4.2) is opened and what the tab shows is recorded as observed: a missing
// warning is printed, not hidden, and does not fail the test (the Windows setting can switch SmartScreen off, note 3.2).
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
const DEMO = "https://demo.smartscreen.msft.net/phishingdemo.html";

type Inventory = { mode: string; environments: string[]; processes: { pid: number; kind: string; environment: string }[] };

async function openSite(f: Ferrum, url: string): Promise<number> {
  const id = await call<number>(f, "tab_new", { url });
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === id)?.title ?? "", { timeout: 30_000 })
    .toMatch(/^stored /);
  return id;
}

/** Command lines of the given processes (Windows), by pid. */
function commandLines(pids: number[]): Map<number, string> {
  const script = `Get-CimInstance Win32_Process -Filter "ProcessId=${pids.join(" OR ProcessId=")}" | ` +
    `ForEach-Object { "$($_.ProcessId)\`t$($_.CommandLine)" }`;
  const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  const m = new Map<number, string>();
  for (const line of out.split(/\r?\n/).filter(Boolean)) {
    const [pid, ...rest] = line.split("\t");
    m.set(Number(pid), rest.join("\t"));
  }
  return m;
}

/** The values of one switch (`--name=value`), all occurrences, in order. */
const switchValues = (cmd: string, name: string) =>
  [...cmd.matchAll(new RegExp(`--${name}=("[^"]*"|\\S+)`, "g"))].map((x) => x[1]!.replace(/^"|"$/g, ""));

for (const mode of ["shared", "per-site", "per-site-udf"] as const) {
  test(`mode ${mode}: no browser process has SmartScreen switched off`, async () => {
    const f = await launch(`smartscreen-${mode}`, { perSite: true, extraSettings: `[isolation]\nmode = "${mode}"\n` });
    try {
      await openSite(f, `${A}/storage?auto=read`);
      await openSite(f, `${B}/storage?auto=read`);
      const inv = await call<Inventory>(f, "test_processes");
      const browsers = inv.processes.filter((p) => p.kind === "browser");
      expect(browsers.length).toBe(mode === "per-site-udf" ? 3 : 1);
      const lines = commandLines(browsers.map((p) => p.pid));
      const seen = browsers.map((p) => {
        const cmd = lines.get(p.pid) ?? "";
        expect(cmd, `command line of browser process ${p.pid}`).not.toBe("");
        return {
          environment: p.environment,
          disable_features: switchValues(cmd, "disable-features"),
          autoplay_policy: switchValues(cmd, "autoplay-policy"),
          smartscreen_off: cmd.includes("msSmartScreenProtection"),
        };
      });
      console.log("SMARTSCREEN-ARGS " + JSON.stringify({ mode, environments: inv.environments, browsers: seen }));
      for (const s of seen) {
        expect(s.smartscreen_off, `${s.environment}: msSmartScreenProtection on the command line`).toBe(false);
        const features = s.disable_features.flatMap((v) => v.split(","));
        expect(features, `${s.environment}: Edge-menu switches kept`).toEqual(expect.arrayContaining(["msWebOOUI", "msPdfOOUI"]));
        expect(s.autoplay_policy, `${s.environment}: autoplay switch kept`).toContain("no-user-gesture-required");
      }
    } finally {
      await f.quit();
    }
  });
}

for (const mode of ["per-site", "per-site-udf"] as const) {
  test(`mode ${mode}: Microsoft's SmartScreen demo phishing page, as observed`, async () => {
    const f = await launch(`smartscreen-demo-${mode}`, { perSite: true, extraSettings: `[isolation]
mode = "${mode}"
` });
    try {
      const id = await call<number>(f, "tab_new", { url: DEMO });
      // Wait until the tab has a title and has stopped loading, then a little longer for a warning page to settle.
      // The tab is read through Ferrum (its title and Ferrum's own error panel in the shell), never the blocked page
      // itself: reading a warning page over the debugging connection hung in the first run.
      const tab = async () => (await tabList(f)).tabs.find((t) => t.id === id);
      await expect.poll(async () => { const t = await tab(); return Boolean(t?.title) && !t?.loading; }, { timeout: 45_000 })
        .toBe(true);
      await new Promise((r) => setTimeout(r, 3000));
      const t = await tab();
      // Ferrum's own "could not be loaded" panel, if it covers the tab (shown for a failed load of the active tab).
      const panel = f.shell.locator("#error-panel");
      const panelShown = await panel.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
      const observed = {
        mode,
        tab_title: t?.title ?? null,
        tab_url: t?.url ?? null,
        ferrum_error_panel: panelShown ? (await panel.innerText({ timeout: 5000 }).catch(() => "")).replace(/\s+/g, " ").trim() : null,
        warning_seen: /Reported Unsafe Site|Navigation Blocked/i.test(t?.title ?? ""),
      };
      console.log("SMARTSCREEN-DEMO " + JSON.stringify(observed));
    } finally {
      await f.quit();
    }
  });
}
