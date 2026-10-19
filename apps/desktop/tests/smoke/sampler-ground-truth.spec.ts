// p5.4 JavaScript probe: a Ferrum tab fills a buffer of a known size, and the tree's private commit (the headline
// memory series) must rise by about that much. The tolerance comes from crates/telemetry/tests/ground-truth-
// tolerances.json, committed before the first run. Three readings before and three after; the medians are compared, so
// one moving helper process does not decide the result.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { repo } from "./paths.ts";

const URL_A = "https://site-a.localhost:8443/storage?p=1";
const tol = JSON.parse(fs.readFileSync(path.join(repo, "crates", "telemetry", "tests", "ground-truth-tolerances.json"), "utf8"));
const MIB = 1048576;

type Rec = { type: string; private_commit_bytes?: number };

let f: Ferrum | undefined;

test.beforeAll(async () => {
  f = await launch("sampler-ground-truth");
});

test.afterAll(async () => {
  await f?.quit();
});

async function medianTree(ferrum: Ferrum): Promise<number> {
  const out = await call<{ records: Rec[] }>(ferrum, "test_sample", { ticks: 3, intervalMs: 500 });
  const values = out.records.filter((r) => r.type === "tree_sample").map((r) => r.private_commit_bytes!).sort((a, b) => a - b);
  expect(values.length, "at least two complete readings").toBeGreaterThanOrEqual(2);
  return values[Math.floor(values.length / 2)];
}

test("a tab that fills a known-size buffer raises the tree's private commit by about that much", async () => {
  test.setTimeout(120_000);
  const ferrum = f!;
  const id = await call<number>(ferrum, "tab_new", { url: URL_A });
  await expect.poll(async () => (await tabList(ferrum)).tabs.find((t) => t.id === id)?.loading === false,
    { timeout: 30_000 }).toBe(true);
  const page = ferrum.pages().find((p) => p.url() === URL_A)!;
  await new Promise((r) => setTimeout(r, 2000)); // let the fresh tab settle
  const before = await medianTree(ferrum);
  const mib: number = tol.js_probe.mib;
  const filled = await page.evaluate((n) => {
    const buf = new Uint8Array(n * 1048576);
    buf.fill(1);
    (globalThis as any).__groundTruth = buf;
    return buf.length;
  }, mib);
  expect(filled).toBe(mib * MIB);
  const after = await medianTree(ferrum);
  const delta = (after - before) / MIB;
  const { min, max } = tol.js_probe.tree_private_commit_delta_mib;
  console.log(`JS-PROBE: buffer ${mib} MiB; tree private commit median ${(before / MIB).toFixed(1)} -> ` +
    `${(after / MIB).toFixed(1)} MiB, delta ${delta.toFixed(1)} MiB (allowed ${min} to ${max})`);
  expect(delta).toBeGreaterThanOrEqual(min);
  expect(delta).toBeLessThanOrEqual(max);
  // keep the buffer alive until after the readings
  expect(await page.evaluate(() => (globalThis as any).__groundTruth.length)).toBe(mib * MIB);
});
