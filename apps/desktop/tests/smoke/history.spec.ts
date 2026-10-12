// p3.7: the global history records pages that loaded (newest first, with titles), can be searched, and clearing it
// empties the list and the file at once; the back and forward buttons follow the active tab's own history.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

type Entry = { url: string; title: string; visited_at: number };
let f: Ferrum;
test.beforeAll(async () => { f = await launch("history"); });
test.afterAll(async () => { await f?.quit(); });

const list = (query?: string) => call<Entry[]>(f, "history_list", { query: query ?? null, limit: null });
const file = () => {
  const p = path.join(f.data, "history.json");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};
const visit = async (url: string) => {
  await go(f, url);
  await expect.poll(async () => (await list())[0]?.url).toBe(url);
};

test("visits are recorded newest first with their titles, searchable, and saved to the data folder", async () => {
  await visit(`${base}/landing?h=1`);
  await visit(`${base}/counted/history2`);
  await visit(`${base}/landing?h=3`);
  await go(f, "https://127.0.0.1:1/"); // a failed load is not history
  await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
  await expect.poll(async () => (await list()).map((e) => e.url)).toEqual([
    `${base}/landing?h=3`, `${base}/counted/history2`, `${base}/landing?h=1`,
  ]);
  await expect.poll(async () => (await list()).map((e) => e.title)).toEqual(["Landing", "Counted history2", "Landing"]);
  expect((await list("COUNTED")).map((e) => e.url)).toEqual([`${base}/counted/history2`]);
  await expect.poll(file, { timeout: 10_000 }).toContain(`${base}/counted/history2`);
});

test("back and forward follow the active tab", async () => {
  // The first tab has pages behind it; a new tab has none.
  const first = (await tabList(f)).tabs[0]!.id;
  await go(f, `${base}/landing?h=back`);
  await expect(f.shell.locator("#back")).toBeEnabled();
  const second = await call<number>(f, "tab_new", { url: `${base}/landing?h=new` });
  await expect.poll(async () => (await tabList(f)).active).toBe(second);
  await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing?h=new`);
  await expect(f.shell.locator("#back")).toBeDisabled();
  await call(f, "tab_activate", { id: first });
  await expect(f.shell.locator("#back")).toBeEnabled();
  await call(f, "tab_close", { id: second });
});

test("clearing empties the list and the file at once", async () => {
  expect((await list()).length).toBeGreaterThan(0);
  await call(f, "history_clear");
  expect(await list()).toEqual([]);
  const saved = file();
  expect(saved).not.toContain("localhost");
  expect(JSON.parse(saved).entries).toEqual([]);
});
