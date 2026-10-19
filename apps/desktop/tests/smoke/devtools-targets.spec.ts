// p5.12 (spike follow-up, inputs for P6 and P7): how Ferrum's tab web views appear as DevTools targets on the
// benchmark debugging port, which renderer process draws each tab and frame, and whether the WebView2 processes are
// children of Ferrum. Run in the per-site mode (one browser engine, a profile per site) and in the per-site-udf mode
// (an engine per site). Nothing is asserted beyond "every tab has a renderer": the findings are recorded as found.
// Prints one TARGETS-JSON line per mode.
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { base, cdpPort } from "./paths.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
const TABS = [
  `${A}/landing?t=a1`,
  `${A}/landing?t=a2`,
  `${B}/landing?t=b1`,
  `${base}/frame?src=${encodeURIComponent(`${B}/landing?t=frame`)}`,
];

type Proc = { pid: number; kind: string; frames: string[]; environment: string };
type Procs = { tabs: { id: number; url: string; profile: string }[]; mode: string; processes: Proc[]; set: { host_pid: number; members: { pid: number }[] } | null };
type Target = { id: string; type: string; url: string; title: string };

/** Parent process of each pid (Windows). */
function parents(pids: number[]): Map<number, number> {
  const script = `Get-CimInstance Win32_Process -Filter "ProcessId=${pids.join(" OR ProcessId=")}" | ` +
    `ForEach-Object { "$($_.ProcessId)\`t$($_.ParentProcessId)" }`;
  const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  return new Map(out.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t").map(Number) as [number, number]));
}

for (const mode of ["per-site", "per-site-udf"] as const) {
  test(`targets, renderers and parents in the ${mode} mode`, async () => {
    test.setTimeout(150_000);
    let f: Ferrum | undefined;
    try {
      f = await launch(`devtools-targets-${mode}`, {
        perSite: true,
        extraSettings: `[isolation]\nmode = "${mode}"\n[session]\nrestore_on_startup = false\nstartup_urls = []\n`,
      });
      const ids: number[] = [];
      for (const url of TABS) ids.push(await call<number>(f, "tab_new", { url }));
      await expect.poll(async () => (await tabList(f!)).tabs.filter((t) => ids.includes(t.id) && !t.loading).length,
        { timeout: 60_000 }).toBe(TABS.length);
      await new Promise((r) => setTimeout(r, 2000));

      // 1. what the debugging port lists
      const targets = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()) as Target[];
      const short = (u: string) => u.replace(A, "site-a").replace(B, "site-b").replace(base, "localhost");
      const listed = targets.map((t) => ({ type: t.type, url: short(t.url) }));

      // 2. which renderer draws each tab and its frame (frames per renderer, as WebView2 reports them)
      let p: Procs | undefined;
      await expect.poll(async () => { p = await call<Procs>(f!, "test_processes"); return p.set !== null; }, { timeout: 20_000 }).toBe(true);
      const renderers = p!.processes.filter((x) => x.kind === "renderer");
      const rendererOf = (u: string) => renderers.filter((r) => r.frames.includes(u)).map((r) => r.pid);
      const tabs = TABS.map((u, i) => ({ tab: i + 1, url: short(u), profile: p!.tabs.find((t) => t.id === ids[i])?.profile,
        renderers: rendererOf(u) }));
      const frame = { url: short(`${B}/landing?t=frame`), renderers: rendererOf(`${B}/landing?t=frame`) };
      for (const t of tabs) expect(t.renderers.length, JSON.stringify(t)).toBeGreaterThan(0);
      const shared = renderers.filter((r) => TABS.filter((u) => r.frames.includes(u)).length > 1)
        .map((r) => ({ pid: r.pid, tabs: TABS.filter((u) => r.frames.includes(u)).map(short) }));

      // 3. parents: which process started each WebView2 process
      const host = p!.set!.host_pid;
      const all = p!.processes.map((x) => x.pid);
      const par = parents([host, ...all]);
      const browsers = p!.processes.filter((x) => x.kind === "browser").map((x) => x.pid);
      const byKind = p!.processes.map((x) => ({ pid: x.pid, kind: x.kind, environment: x.environment,
        parent: par.get(x.pid) === host ? "ferrum" : browsers.includes(par.get(x.pid) ?? -1) ? "browser" : `other (${par.get(x.pid)})` }));

      const out = {
        mode, build: "debug", port_targets: listed, tabs, frame, shared_renderers: shared,
        renderer_count: renderers.length, environments: [...new Set(p!.processes.map((x) => x.environment))],
        parents: byKind,
      };
      console.log(`TARGETS-JSON ${JSON.stringify(out)}`);
    } finally {
      await f?.quit();
    }
  });
}
