// p5.15 (owner answer Q-229): nothing reaches a blocked site. With 127.0.0.1 blocked, a tab on localhost tries every
// way in: a typed address, a link, a redirect, a frame, an image and a fetch, each to its own /counted/<name> address
// on the blocked host. The test server counts requests per name across both host names (one server), so a later
// allowed visit to localhost/counted/<name> must show count:1 for each name: no refused request reached the server.
// Allowed requests still count. A second test gives a rough cost: the /netlog page loaded 30 times with the filter on
// and, in a debug-only test mode, off. Prints BLOCK-REQUESTS and BLOCK-COST lines.
import { test, expect, type Page } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const BLOCKED = "https://127.0.0.1:8443";
const SETTINGS = '[security]\nblocklist = ["=127.0.0.1"]\n';

/** The page of the tab whose address starts with `prefix`. */
async function pageOf(f: Ferrum, prefix: string): Promise<Page> {
  let p: Page | undefined;
  await expect.poll(() => (p = f.pages().find((x) => x.url().startsWith(prefix))) !== undefined, { timeout: 20_000 }).toBe(true);
  return p!;
}

test("no request reaches a blocked site, whatever the way in; allowed requests still do", async () => {
  test.setTimeout(150_000);
  const f = await launch("block-requests", { extraSettings: SETTINGS });
  try {
    const run = `r${process.pid}`;
    const name = (way: string) => `${run}-${way}`;
    const tab = await call<number>(f, "tab_new", { url: `${base}/landing` });
    await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === tab)?.loading, { timeout: 30_000 }).toBe(false);
    await call(f, "tab_activate", { id: tab });
    const settle = () => new Promise((r) => setTimeout(r, 1500));

    // 1. typed into the address bar
    await go(f, `${BLOCKED}/counted/${name("typed")}`);
    await settle();
    // 2. a link on an allowed page
    await go(f, `${base}/links/to?href=${encodeURIComponent(`${BLOCKED}/counted/${name("link")}`)}`);
    await (await pageOf(f, `${base}/links/to`)).click("#to");
    await settle();
    // 3. a redirect from an allowed page
    await go(f, `${base}/goto?url=${encodeURIComponent(`${BLOCKED}/counted/${name("redirect")}`)}`);
    await settle();
    // 4. a frame of the blocked site
    await go(f, `${base}/frame?src=${encodeURIComponent(`${BLOCKED}/counted/${name("frame")}`)}`);
    await settle();
    // 5. and 6. an image and a fetch made by an allowed page; 7. an allowed fetch, which must count
    await go(f, `${base}/landing?subresources`);
    const page = await pageOf(f, `${base}/landing?subresources`);
    const tried = await page.evaluate(async ([blocked, img, fetched, allowed]) => {
      const out: Record<string, string> = {};
      await new Promise<void>((done) => {
        const i = new Image();
        i.onload = () => { out.image = "loaded"; done(); };
        i.onerror = () => { out.image = "error"; done(); };
        i.src = `${blocked}/counted/${img}`;
      });
      out.fetch = await fetch(`${blocked}/counted/${fetched}`, { mode: "no-cors" }).then((r) => `status ${r.status} (${r.type})`, (e) => `error ${e}`);
      out.allowed = await fetch(`/counted/${allowed}`).then((r) => `status ${r.status}`, (e) => `error ${e}`);
      return out;
    }, [BLOCKED, name("image"), name("fetch"), name("allowed")] as const);
    await settle();

    // The counts, from an allowed visit to the same names (one server counts both host names).
    const counts: Record<string, string> = {};
    for (const way of ["typed", "link", "redirect", "frame", "image", "fetch", "allowed"]) {
      await go(f, `${base}/counted/${name(way)}`);
      const p = await pageOf(f, `${base}/counted/${name(way)}`);
      counts[way] = (await p.locator("#count").textContent()) ?? "";
    }
    console.log(`BLOCK-REQUESTS ${JSON.stringify({ counts, page_saw: tried })}`);
    for (const way of ["typed", "link", "redirect", "frame", "image", "fetch"]) expect(counts[way], way).toBe("count:1");
    expect(counts.allowed, "an allowed fetch reaches the server").toBe("count:2");
    expect(tried.allowed).toBe("status 200");
  } finally {
    await f.quit();
  }
});

async function loads(label: string, env: Record<string, string>) {
  const f = await launch(`block-requests-cost-${label}`, { extraSettings: SETTINGS, env });
  try {
    const tab = await call<number>(f, "tab_new", { url: `${base}/netlog?warm` });
    await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === tab)?.title, { timeout: 30_000 }).toBe("netlog done");
    await call(f, "tab_activate", { id: tab });
    const out: number[] = [];
    for (let i = 0; i < 30; i++) {
      const url = `${base}/netlog?n=${i}`;
      await go(f, url);
      let n: { final_uri: string; record: { load_ms: number | null } | null } | undefined;
      await expect.poll(async () => {
        n = await call<typeof n>(f, "test_nav_timing", { tab }).catch(() => undefined);
        return n?.final_uri === url && n.record?.load_ms != null;
      }, { timeout: 20_000, intervals: [50] }).toBe(true);
      out.push(n!.record!.load_ms!);
    }
    const sorted = [...out].sort((a, b) => a - b);
    return { run: label, loads: out.length, load_ms_median: sorted[15], load_ms_min: sorted[0], load_ms_max: sorted[29], load_ms: out };
  } finally {
    await f.quit();
  }
}

test("the request filter's cost: 30 loads with it on and off (rough)", async () => {
  test.setTimeout(240_000);
  const on = await loads("on", {});
  const off = await loads("off", { FERRUM_TEST_NO_REQUEST_FILTER: "1" });
  console.log(`BLOCK-COST ${JSON.stringify({ build: "debug", page: "/netlog (six requests)", order: "on then off", runs: [on, off] })}`);
});

test("control: with the filter switched off (debug test mode), the typed attempt reaches the server again", async () => {
  test.setTimeout(90_000);
  const f = await launch("block-requests-control", { extraSettings: SETTINGS, env: { FERRUM_TEST_NO_REQUEST_FILTER: "1" } });
  try {
    const n = `r${process.pid}-control`;
    const tab = await call<number>(f, "tab_new", { url: `${base}/landing` });
    await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === tab)?.loading, { timeout: 30_000 }).toBe(false);
    await call(f, "tab_activate", { id: tab });
    for (let i = 0; i < 3; i++) {
      await go(f, `${BLOCKED}/counted/${n}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
    await go(f, `${base}/counted/${n}`);
    const count = (await (await pageOf(f, `${base}/counted/${n}`)).locator("#count").textContent()) ?? "";
    console.log(`BLOCK-CONTROL filter off: after 3 refused typed tries the allowed visit shows ${count}`);
    expect(count, "the counter sees requests the page gate alone lets through").not.toBe("count:1");
  } finally {
    await f.quit();
  }
});
