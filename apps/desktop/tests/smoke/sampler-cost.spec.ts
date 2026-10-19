// p5.5 in-app cost of the sampler (rough): Ferrum runs with one browser engine per site and two sites open (17
// processes, as in p5.2 and p5.3). Three runs of the test_sample hook: a 20 s baseline with only two readings, then 20
// readings 100 ms apart, then 20 readings 1000 ms apart. Reported per run: how long listing the set took (it asks each
// browser engine for its processes) and the CPU time per second of Ferrum's own process and of the whole set. Idle pages
// still do some work, so this is a rough picture; no limits, no comparison (phase-p5-telemetry).
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const SITES = ["https://site-a.localhost:8443/storage?p=1", "https://site-b.localhost:8443/storage?p=1"];

type Rec = { type: string; t_ms: number; kind?: string; cpu_user_100ns?: number; cpu_kernel_100ns?: number; cpu_100ns?: number };
type Out = { interval_ms: number; retries: number; list_ms: number[]; records: Rec[] };

let f: Ferrum | undefined;

test.beforeAll(async () => {
  f = await launch("sampler-cost", { perSite: true, extraSettings: '[isolation]\nmode = "per-site-udf"\n' });
});

test.afterAll(async () => {
  await f?.quit();
});

function summary(label: string, out: Out) {
  const trees = out.records.filter((r) => r.type === "tree_sample");
  const hosts = out.records.filter((r) => r.type === "process_sample" && r.kind === "host");
  const span = (a: Rec[]) => (a[a.length - 1].t_ms - a[0].t_ms) / 1000;
  const hostCpu = (r: Rec) => r.cpu_user_100ns! + r.cpu_kernel_100ns!;
  const sorted = [...out.list_ms].sort((a, b) => a - b);
  return {
    run: label,
    interval_ms: out.interval_ms,
    readings: trees.length,
    gaps: out.records.filter((r) => r.type === "sample_gap").length,
    retries: out.retries,
    list_ms_median: sorted[Math.floor(sorted.length / 2)],
    list_ms_max: sorted[sorted.length - 1],
    host_cpu_ms_per_s: (hostCpu(hosts[hosts.length - 1]) - hostCpu(hosts[0])) / 1e4 / span(hosts),
    tree_cpu_ms_per_s: (trees[trees.length - 1].cpu_100ns! - trees[0].cpu_100ns!) / 1e4 / span(trees),
  };
}

test("the sampler's in-app cost at 100 ms and 1000 ms, against a baseline", async () => {
  test.setTimeout(180_000);
  const ferrum = f!;
  for (const url of SITES) {
    const id = await call<number>(ferrum, "tab_new", { url });
    await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.loading === false,
      { timeout: 30_000 }).toBe(true);
  }
  await new Promise((r) => setTimeout(r, 3000)); // let the fresh tabs settle
  const runs = [];
  for (const [label, ticks, intervalMs] of [["baseline", 2, 20_000], ["100 ms", 20, 100], ["1000 ms", 20, 1000]] as const) {
    const out = await call<Out>(ferrum, "test_sample", { ticks, intervalMs });
    const s = summary(label, out);
    expect(s.readings, `${label}: at least two complete readings`).toBeGreaterThanOrEqual(2);
    runs.push(s);
  }
  console.log(`SAMPLER-COST-APP ${JSON.stringify({ set: "Ferrum, per-site-udf, two sites", build: "debug", runs })}`);
});
