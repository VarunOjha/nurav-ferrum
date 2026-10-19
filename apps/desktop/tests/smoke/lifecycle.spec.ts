// p5.8: a lifecycle_transition record each time a tab is shown or hidden, opened or closed. Two tabs; the test
// switches between them and closes one. Every record must pass the export checker, and each tab's records must follow
// its real states (shown = active, hidden = background).
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

type Transition = { type: string; t_ms: number; tab: number; from: string | null; to: string | null; trigger: string; policy: null; guard: null };
type Log = { records: Transition[]; refused: string[] };

let f: Ferrum;
test.beforeAll(async () => {
  f = await launch("lifecycle", {
    extraSettings: `[session]\nrestore_on_startup = false\nstartup_urls = [${JSON.stringify(`${base}/landing?tab=a`)}]\n`,
  });
});
test.afterAll(async () => { await f?.quit(); });

const log = () => call<Log>(f, "test_lifecycle");
const of = (l: Log, tab: number) => l.records.filter((r) => r.tab === tab).map((r) => `${r.from ?? "new"}>${r.to ?? "gone"}:${r.trigger}`);

test("switching and closing tabs writes hide and show records that pass the format check", async () => {
  test.setTimeout(120_000);
  await expect.poll(async () => (await tabList(f)).tabs.length === 1 && !(await tabList(f)).tabs[0].loading, { timeout: 30_000 }).toBe(true);
  const a = (await tabList(f)).tabs[0].id;
  await expect.poll(async () => of(await log(), a), { timeout: 15_000 }).toEqual(["new>active:opened"]);

  // a second tab opens in front: a is hidden, b opens shown
  const b = await call<number>(f, "tab_new", { url: `${base}/landing?tab=b` });
  await expect.poll(async () => of(await log(), b), { timeout: 30_000 }).toEqual(["new>active:opened"]);
  expect(of(await log(), a)).toEqual(["new>active:opened", "active>background:user_switch"]);

  // the user switches back to a, then to b again
  expect(await call<boolean>(f, "tab_activate", { id: a })).toBe(true);
  await expect.poll(async () => of(await log(), a).length, { timeout: 10_000 }).toBe(3);
  expect(await call<boolean>(f, "tab_activate", { id: b })).toBe(true);
  await expect.poll(async () => of(await log(), b).length, { timeout: 10_000 }).toBe(3);

  // closing b shows a again
  expect(await call<boolean>(f, "tab_close", { id: b })).toBe(true);
  await expect.poll(async () => of(await log(), b).length, { timeout: 10_000 }).toBe(4);
  await expect.poll(async () => of(await log(), a).length, { timeout: 10_000 }).toBe(5);

  const l = await log();
  expect(l.refused).toEqual([]);
  expect(of(l, a)).toEqual([
    "new>active:opened", "active>background:user_switch", "background>active:user_switch",
    "active>background:user_switch", "background>active:user_switch",
  ]);
  expect(of(l, b)).toEqual([
    "new>active:opened", "active>background:user_switch", "background>active:user_switch", "active>gone:closed",
  ]);
  for (const r of l.records) {
    expect(r.type).toBe("lifecycle_transition");
    expect([r.policy, r.guard]).toEqual([null, null]);
  }
  const times = l.records.map((r) => r.t_ms);
  expect(times).toEqual([...times].sort((x, y) => x - y));
  console.log(`LIFECYCLE: ${l.records.length} records, none refused:\n${l.records.map((r) =>
    `  ${r.t_ms} ms tab ${r.tab === a ? "a" : "b"}: ${r.from ?? "(new)"} -> ${r.to ?? "(closed)"} (${r.trigger})`).join("\n")}`);
});
