// p5.2 (risk-r05): Ferrum counts exactly its own processes. Another WebView2 app (the S1 spike from P1) runs beside
// Ferrum, so the PC has two sets of msedgewebview2.exe processes with the same name. Ferrum's set comes from WebView2's
// own lists for Ferrum's environments (never from the executable name). It is compared with a Windows process snapshot:
// every process in the set is Ferrum or below Ferrum in the parent tree; every WebView2 process below Ferrum is in the
// set (crash reporters excepted: WebView2 does not list them, for every product alike); no process of the other app is.
// Ferrum runs with one browser engine per site and two sites open, so the set spans three environments. The S1 app
// ends by itself (FERRUM_SPIKE_EXIT_AFTER); nothing is killed.
// Observed in the first runs (2026-10-18): right after a site's tab finished loading, that site's environment can
// return an empty list for a moment; Ferrum then refuses the set (no browser process listed) instead of under-counting,
// and the next round, 2 s later, is complete. The rounds below allow for that.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { repo } from "./paths.ts";

const S1 = path.join(repo, "spikes", "s1-multiwebview", "src-tauri", "target", "debug", "ferrum-spike-s1.exe");
const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
const S1_LIFETIME_S = 75;

type Proc = { pid: number; parent: number; name: string; created: string; cmd: string };
type Member = { pid: number; kind: string; source: string };
type Inventory = {
  environments: string[];
  processes: { pid: number; kind: string; environment: string }[];
  set: { host_pid: number; members: Member[] } | null;
  set_error: string | null;
};

/** Every process on the PC (Win32_Process): id, parent id, name, creation time, command line. */
function snapshot(): Map<number, Proc> {
  const script = "Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; " +
    "parent = $_.ParentProcessId; name = $_.Name; created = $_.CreationDate.ToUniversalTime().ToString('o'); " +
    "cmd = [string]$_.CommandLine } } | ConvertTo-Json -Compress";
  const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", maxBuffer: 64 << 20 });
  return new Map((JSON.parse(out) as Proc[]).map((p) => [p.pid, p]));
}

/** The processes below `root` in the parent tree. A child must be younger than its parent, so a reused parent id is
 * not mistaken for the real parent. */
function descendants(all: Map<number, Proc>, root: number): Set<number> {
  const out = new Set<number>();
  const queue = [root];
  while (queue.length) {
    const p = queue.shift()!;
    const parent = all.get(p);
    for (const c of all.values()) {
      if (c.parent === p && c.pid !== p && !out.has(c.pid) && (!parent || c.created >= parent.created)) {
        out.add(c.pid);
        queue.push(c.pid);
      }
    }
  }
  return out;
}

const isWebView2 = (p: Proc | undefined) => p?.name.toLowerCase() === "msedgewebview2.exe";
const isCrashpad = (p: Proc | undefined) => !!p && /--type=crashpad-handler/.test(p.cmd);

let s1: ChildProcess | undefined;
let f: Ferrum | undefined;

test.beforeAll(async () => {
  test.setTimeout(150_000);
  if (!fs.existsSync(S1)) throw new Error(`The S1 spike app is not built: ${S1} (the p5.2 check builds it)`);
  // The other WebView2 app: its own data folder (its app id), no debugging port, ends by itself.
  const env = { ...process.env, FERRUM_SPIKE_MODE: "manual", FERRUM_SPIKE_EXIT_AFTER: String(S1_LIFETIME_S) };
  delete env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS;
  s1 = spawn(S1, [], { env, stdio: "ignore" });
  await expect.poll(() => [...descendants(snapshot(), s1!.pid!)].filter((p) => isWebView2(snapshot().get(p))).length,
    { timeout: 30_000, message: "the S1 app's WebView2 processes appear" }).toBeGreaterThan(1);
  f = await launch("process-set", { perSite: true, extraSettings: '[isolation]\nmode = "per-site-udf"\n' });
});

test.afterAll(async () => {
  await f?.quit();
  // S1 ends by itself after its lifetime; wait for it (bounded) so the next test starts on a quiet PC.
  if (s1 && s1.exitCode === null) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, (S1_LIFETIME_S + 20) * 1000);
      s1!.once("exit", () => { clearTimeout(t); resolve(); });
    });
  }
});

test("Ferrum's process set holds all of Ferrum's WebView2 processes and none of another WebView2 app", async () => {
  test.setTimeout(120_000);
  const ferrum = f!;
  for (const url of [`${A}/storage?p=1`, `${B}/storage?p=1`]) {
    const id = await call<number>(ferrum, "tab_new", { url });
    await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.loading === false,
      { timeout: 30_000 }).toBe(true);
  }
  const ferrumPid = ferrum.proc.pid!;
  const s1Pid = s1!.pid!;
  // Processes start and end all the time (helpers come and go), so the set and the snapshot are compared until one
  // round agrees, at most five rounds. Each round: the set, the snapshot, the set again; a process counts as Ferrum's
  // if either set has it.
  let report = "";
  let problems: string[] = ["not compared yet"];
  for (let round = 1; round <= 5 && problems.length; round++) {
    const before = await call<Inventory>(ferrum, "test_processes");
    const all = snapshot();
    const after = await call<Inventory>(ferrum, "test_processes");
    if (!before.set || !after.set) {
      const bad = before.set ? after : before;
      problems = [`the set was refused: ${bad.set_error}`];
      console.log(`PROCESS-SET round ${round}: refused (${bad.set_error}); WebView2 lists: ` +
        bad.processes.map((p) => `${p.environment}:${p.pid}:${p.kind}`).join(" "));
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    const set = new Map<number, Member>();
    for (const m of [...before.set.members, ...after.set.members]) set.set(m.pid, m);
    const underFerrum = descendants(all, ferrumPid);
    const underS1 = descendants(all, s1Pid);
    const webview2UnderFerrum = [...underFerrum].filter((p) => isWebView2(all.get(p)));
    const crashpad = webview2UnderFerrum.filter((p) => isCrashpad(all.get(p)));
    problems = [];
    if (before.set.host_pid !== ferrumPid) problems.push(`host pid ${before.set.host_pid} is not Ferrum's ${ferrumPid}`);
    let fromOther = 0;
    for (const [pid, m] of set) {
      const alive = all.has(pid);
      if (pid === s1Pid || underS1.has(pid)) fromOther++;
      if (alive && pid !== ferrumPid && !underFerrum.has(pid)) problems.push(`${pid} (${m.kind}) is in the set but not below Ferrum`);
      if (pid === s1Pid || underS1.has(pid)) problems.push(`${pid} (${m.kind}) belongs to the other app`);
    }
    for (const pid of webview2UnderFerrum) {
      if (!set.has(pid) && !isCrashpad(all.get(pid))) problems.push(`${pid} is a WebView2 process below Ferrum but not in the set`);
    }
    const s1WebView2 = [...underS1].filter((p) => isWebView2(all.get(p))).length;
    if (s1WebView2 === 0) problems.push("the other app has no WebView2 process (the test would prove nothing)");
    const kinds = new Map<string, number>();
    for (const m of set.values()) kinds.set(m.kind, (kinds.get(m.kind) ?? 0) + 1);
    report = `PROCESS-SET round ${round}: Ferrum set ${set.size} (${[...kinds].map(([k, n]) => `${k} ${n}`).join(", ")}) ` +
      `over environments ${after.environments.join(", ")}; WebView2 below Ferrum ${webview2UnderFerrum.length} ` +
      `(crash reporters ${crashpad.length}, not listed by WebView2); other app's WebView2 processes ${s1WebView2}, in set ${fromOther}`;
    console.log(report + (problems.length ? `; problems: ${problems.join("; ")}` : ""));
  }
  expect(problems).toEqual([]);
});
