// p5.10: a rough pilot of what the network log costs (adr-0008 asks for an on/off check; the real A/B check is P6's).
// Two launches, the log off and then on; in each, the /netlog page (six requests) is loaded 30 times in one tab. Per
// load: the page's load time (nav_timing hook, p5.7); per run: CPU time of Ferrum's own process and of all its
// processes (test_sample hook, p5.3), divided by the loads. Debug build, fixed order (off first), one run each: no
// limits, no comparison claim. Prints one NETLOG-COST line.
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const LOADS = 30;
type Nav = { final_uri: string; record: { nav_id: number; load_ms: number | null; complete_ms: number | null } | null };
type Sample = { records: { type: string; kind?: string; cpu_user_100ns?: number; cpu_kernel_100ns?: number; cpu_100ns?: number }[] };

async function cpu(f: Ferrum): Promise<{ host_100ns: number; tree_100ns: number }> {
  const s = await call<Sample>(f, "test_sample", { ticks: 1, intervalMs: 100 });
  const host = s.records.find((r) => r.type === "process_sample" && r.kind === "host")!;
  const tree = s.records.find((r) => r.type === "tree_sample")!;
  return { host_100ns: host.cpu_user_100ns! + host.cpu_kernel_100ns!, tree_100ns: tree.cpu_100ns! };
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function run(label: string, on: boolean) {
  const f = await launch(`network-log-cost-${label}`, { extraSettings: on ? "[network_log]\nenabled = true\n" : "" });
  try {
    expect((await call<string | null>(f, "test_netlog")) !== null).toBe(on);
    const tab = await call<number>(f, "tab_new", { url: `${base}/netlog?warm` });
    await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === tab)?.title, { timeout: 30_000 }).toBe("netlog done");
    await call(f, "tab_activate", { id: tab });
    await new Promise((r) => setTimeout(r, 2000));
    const before = await cpu(f);
    const t0 = Date.now();
    const load: number[] = [];
    for (let i = 0; i < LOADS; i++) {
      const url = `${base}/netlog?n=${i}`;
      await go(f, url);
      let n: Nav | undefined;
      await expect.poll(async () => {
        n = await call<Nav>(f, "test_nav_timing", { tab }).catch(() => undefined);
        return n?.final_uri === url && n.record?.load_ms != null;
      }, { timeout: 20_000, intervals: [50] }).toBe(true);
      load.push(n!.record!.load_ms!);
    }
    const wall = (Date.now() - t0) / 1000;
    const after = await cpu(f);
    return {
      run: label, log: on, loads: LOADS, wall_s: wall,
      load_ms_median: median(load), load_ms_min: Math.min(...load), load_ms_max: Math.max(...load),
      host_cpu_ms_per_load: (after.host_100ns - before.host_100ns) / 1e4 / LOADS,
      tree_cpu_ms_per_load: (after.tree_100ns - before.tree_100ns) / 1e4 / LOADS,
      load_ms: load,
    };
  } finally {
    await f.quit();
  }
}

test("network log on and off: page load time and CPU per load (rough pilot)", async () => {
  test.setTimeout(360_000);
  const off = await run("off", false);
  const on = await run("on", true);
  console.log(`NETLOG-COST ${JSON.stringify({ build: "debug", page: "/netlog (six requests)", order: "off then on", runs: [off, on] })}`);
});
