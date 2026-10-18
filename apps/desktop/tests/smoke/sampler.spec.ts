// p5.3: the process sampler over Ferrum's real process set. Ferrum runs with one browser engine per site and two sites
// open; the test_sample hook reads every process of the set at a 500 ms interval for six moments. Each moment is either
// a tree sample (the sum over the set) with one process sample per member, or a sample gap; never a smaller number.
// The sums, the creation-time pairing, the never-dropping CPU series and the interval are checked here; the counters'
// accuracy against known amounts is p5.4.
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
const TICKS = 6;
const INTERVAL = 500;

type Rec = { type: string; t_ms: number; [k: string]: unknown };
type ProcessSample = Rec & {
  pid: number; pid_created_100ns: number; kind: string; private_commit_bytes: number; working_set_bytes: number;
  private_working_set_bytes: number | null; cpu_user_100ns: number; cpu_kernel_100ns: number; cycles: number | null;
};
type TreeSample = Rec & {
  process_count: number; private_commit_bytes: number; working_set_bytes: number; cpu_100ns: number; cycles: number | null;
};

let f: Ferrum | undefined;

test.beforeAll(async () => {
  f = await launch("sampler", { perSite: true, extraSettings: '[isolation]\nmode = "per-site-udf"\n' });
});

test.afterAll(async () => {
  await f?.quit();
});

test("the sampler sums Ferrum's processes at the chosen interval and never writes a smaller number", async () => {
  test.setTimeout(120_000);
  const ferrum = f!;
  for (const url of [`${A}/storage?p=1`, `${B}/storage?p=1`]) {
    const id = await call<number>(ferrum, "tab_new", { url });
    await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.loading === false,
      { timeout: 30_000 }).toBe(true);
  }
  const bad = await call(ferrum, "test_sample", { ticks: 1, intervalMs: 50 }).then(() => "accepted", (e) => String(e));
  expect(bad, "an interval below 100 ms is refused").toContain("outside");

  const out = await call<{ interval_ms: number; retries: number; records: Rec[] }>(ferrum, "test_sample",
    { ticks: TICKS, intervalMs: INTERVAL });
  expect(out.interval_ms).toBe(INTERVAL);
  const trees = out.records.filter((r) => r.type === "tree_sample") as TreeSample[];
  const gaps = out.records.filter((r) => r.type === "sample_gap");
  const procs = out.records.filter((r) => r.type === "process_sample") as ProcessSample[];
  expect(trees.length + gaps.length, "one tree or one gap per moment").toBe(TICKS);
  expect(trees.length, "most moments complete").toBeGreaterThanOrEqual(TICKS - 2);
  expect(out.records.every((r) => ["tree_sample", "sample_gap", "process_sample"].includes(r.type))).toBe(true);

  const ferrumPid = ferrum.proc.pid!;
  let lastCpu = 0;
  let lastT = -1;
  const spacing: number[] = [];
  const created = new Map<number, number>();
  for (const t of trees) {
    const mine = procs.filter((p) => p.t_ms === t.t_ms);
    expect(mine.length, `t=${t.t_ms}: one process sample per member`).toBe(t.process_count);
    expect(mine.filter((p) => p.kind === "host").map((p) => p.pid), "Ferrum itself is in every moment").toEqual([ferrumPid]);
    expect(mine.filter((p) => p.kind === "browser").length, "one browser per environment (shell and two sites)").toBe(3);
    expect(t.private_commit_bytes).toBe(mine.reduce((s, p) => s + p.private_commit_bytes, 0));
    expect(t.working_set_bytes).toBe(mine.reduce((s, p) => s + p.working_set_bytes, 0));
    for (const p of mine) {
      expect(p.private_commit_bytes, `${p.pid}`).toBeGreaterThan(0);
      expect(p.private_working_set_bytes, `${p.pid}: private working set`).not.toBeNull();
      expect(p.private_working_set_bytes!).toBeLessThanOrEqual(p.working_set_bytes);
      // a pid keeps its creation time for as long as it is the same process
      const seen = created.get(p.pid);
      if (seen !== undefined) expect(p.pid_created_100ns, `${p.pid} creation time`).toBe(seen);
      created.set(p.pid, p.pid_created_100ns);
    }
    expect(t.cpu_100ns, "the tree CPU never drops").toBeGreaterThanOrEqual(lastCpu);
    if (lastT >= 0) spacing.push(t.t_ms - lastT);
    lastCpu = t.cpu_100ns;
    lastT = t.t_ms;
  }
  // Each reading comes one interval after the one before, plus the time to list the set (a few milliseconds; 200 ms
  // more when the set had to be asked again).
  const sorted = [...spacing].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  expect(sorted[0], `spacing ${spacing.join(",")} ms`).toBeGreaterThanOrEqual(INTERVAL - 10);
  expect(median, `spacing ${spacing.join(",")} ms`).toBeGreaterThanOrEqual(INTERVAL - 50);
  expect(median, `spacing ${spacing.join(",")} ms`).toBeLessThanOrEqual(INTERVAL + 300);
  const peak = trees.reduce((m, t) => Math.max(m, t.private_commit_bytes), 0);
  const mib = (n: number) => (n / 1048576).toFixed(1);
  console.log(`SAMPLER: ${trees.length} moments summed, ${gaps.length} gaps, ${out.retries} set retries; ` +
    `processes ${trees.map((t) => t.process_count).join("/")}; private commit MiB ${trees.map((t) => mib(t.private_commit_bytes)).join("/")}; ` +
    `peak ${mib(peak)} MiB; CPU s ${(lastCpu / 1e7).toFixed(2)}; interval ${out.interval_ms} ms, spacing ${spacing.join(",")} ms`);
});
