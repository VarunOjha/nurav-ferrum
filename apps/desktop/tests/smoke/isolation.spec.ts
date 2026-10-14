// p4.7: what separate profiles really keep apart, tested rather than assumed. The test sites are names under localhost
// (site-a.localhost, site-b.localhost; on the test server's certificate). A cookie, localStorage and IndexedDB written by
// site A in its own profile are not visible to the same site in another profile (and come back when the site returns
// to its own profile, so the empty read was the profile, not lost data). Clearing site A's data leaves site B's alone.
// A private tab sees none of a site's normal data, and its own data is gone once the private tabs close. The process
// inventory records what the profiles share (printed for the evidence file).
import { test, expect, type Page } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
type Stored = { cookie: string; local: string; idb: string };
const EMPTY: Stored = { cookie: "", local: "", idb: "" };
const all = (v: string): Stored => ({ cookie: v, local: v, idb: v });

let f: Ferrum;
test.beforeAll(async () => { f = await launch("isolation", { perSite: true }); });
test.afterAll(async () => { await f?.quit(); });

const pageAt = async (url: string): Promise<Page> => {
  await expect.poll(() => f.pages().some((p) => p.url() === url), { timeout: 20_000 }).toBe(true);
  const p = f.pages().find((p) => p.url() === url)!;
  await expect(p.locator("#storage")).toBeVisible();
  return p;
};
/** Opens `url` in a new tab (private if asked) and returns the tab id and its page. */
const openTab = async (url: string, priv = false): Promise<[number, Page]> => {
  const id = await call<number>(f, priv ? "tab_new_private" : "tab_new", { url });
  return [id, await pageAt(url)];
};
const read = (p: Page) => p.evaluate(() => (window as any).store.read()) as Promise<Stored>;
const write = (p: Page, v: string) => p.evaluate((x) => (window as any).store.write(x), v);
const close = async (id: number) => {
  await call(f, "tab_close", { id });
  await expect.poll(async () => (await tabList(f)).tabs.some((t) => t.id === id)).toBe(false);
};
type View = Record<string, unknown> & { sites: { site: string; profile: string; permissions?: string[] }[] };
const setSiteProfile = async (site: string, profile: string | null) => {
  const v = await call<View>(f, "settings_get");
  v.sites = v.sites.filter((s) => s.site !== site);
  if (profile) v.sites.push({ site, profile });
  await call(f, "settings_set", { input: v });
};

test("a site's cookie, localStorage and IndexedDB stay in its own profile", async () => {
  const [a1, pa] = await openTab(`${A}/storage?w=1`);
  await write(pa, "A1");
  expect(await read(pa)).toEqual(all("A1"));
  await close(a1);
  // The same site in another profile ("other") sees none of it.
  await setSiteProfile("site-a.localhost", "other");
  const [a2, pa2] = await openTab(`${A}/storage?w=2`);
  expect((await tabList(f)).tabs.find((t) => t.id === a2)?.profile).toBe("user-other");
  expect(await read(pa2)).toEqual(EMPTY);
  await close(a2);
  // Back in its own profile, the data is there again: the empty read above was the other profile.
  await setSiteProfile("site-a.localhost", null);
  const [a3, pa3] = await openTab(`${A}/storage?w=3`);
  expect(await read(pa3)).toEqual(all("A1"));
  await close(a3);
});

test("clearing site A's data leaves site B's intact", async () => {
  const [b1, pb] = await openTab(`${B}/storage?c=1`);
  await write(pb, "B1");
  await close(b1);
  const [a1, pa] = await openTab(`${A}/storage?c=1`);
  expect(await read(pa)).toEqual(all("A1"));
  // Refused while a tab of the site is open.
  const refused = await call(f, "site_data_clear", { site: "site-a.localhost" }).then(() => "ok", (e: unknown) => String(e));
  expect(refused).toContain("Close the tabs");
  await close(a1);
  await call(f, "site_data_clear", { site: "site-a.localhost" });
  const [a2, pa2] = await openTab(`${A}/storage?c=2`);
  expect(await read(pa2)).toEqual(EMPTY);
  await close(a2);
  const [b2, pb2] = await openTab(`${B}/storage?c=2`);
  expect(await read(pb2)).toEqual(all("B1"));
  await close(b2);
});

test("a private tab sees no normal data, is kept out of the history, and forgets its own data", async () => {
  const [b1, pb] = await openTab(`${B}/storage?p=0`);
  expect(await read(pb)).toEqual(all("B1"));
  await close(b1);
  const [p1, pp] = await openTab(`${B}/storage?p=1`, true);
  const t = (await tabList(f)).tabs.find((x) => x.id === p1) as { profile: string; private?: boolean };
  expect(t.profile).toBe("ferrum-private");
  expect(await read(pp)).toEqual(EMPTY);
  await write(pp, "P1");
  expect(await read(pp)).toEqual(all("P1"));
  await f.shell.waitForTimeout(1000);
  const hist = await call<{ url: string }[]>(f, "history_list", { query: null, limit: null });
  expect(hist.some((h) => h.url.includes("storage?p=1"))).toBe(false);
  await close(p1);
  await f.shell.waitForTimeout(3000); // WebView2 drops InPrivate data when the profile's last InPrivate view is gone
  const [p2, pp2] = await openTab(`${B}/storage?p=2`, true);
  expect(await read(pp2)).toEqual(EMPTY);
  await close(p2);
});

test("process inventory: what two site profiles share", async () => {
  const [a, pa] = await openTab(`${A}/storage?i=1`);
  const [b, pb] = await openTab(`${B}/storage?i=1`);
  void pa; void pb;
  const inv = await call<{ tabs: { id: number; url: string; profile: string }[]; processes: { pid: number; kind: string; frames: string[] }[] }>(f, "test_processes");
  console.log("PROCESS-INVENTORY " + JSON.stringify(inv));
  const kinds = (k: string) => inv.processes.filter((p) => p.kind === k);
  expect(kinds("browser").length).toBe(1); // one browser process for every profile
  const host = (site: string) => kinds("renderer").filter((p) => p.frames.some((u) => u.startsWith(site))).map((p) => p.pid);
  expect(host(A).length).toBeGreaterThan(0);
  expect(host(B).length).toBeGreaterThan(0);
  expect(host(A).filter((pid) => host(B).includes(pid))).toEqual([]); // no renderer hosts both profiles' pages
  await close(a);
  await close(b);
});
