// p5.7: one nav_timing record per finished navigation. The host counts redirect hops and times start and completion from
// WebView2's events; the page's own Navigation Timing entry (read by the host in an isolated world, never sent by page
// script) gives first response, DOMContentLoaded and load. Uses the P2 redirect fixtures (301, 302, 303, 307, 308 and a
// two-hop chain), a redirect to another site and plain same-site and other-site loads.
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const B = "https://site-b.localhost:8443";

type NavRecord = {
  type: string; t_ms: number; tab: number; nav_id: number; start_ms: number;
  response_ms: number | null; dom_content_loaded_ms: number | null; load_ms: number | null; complete_ms: number | null;
  origin: "same_origin" | "cross_origin"; redirect_count: number; outcome: string;
};
type NavTiming = {
  final_uri: string; host_redirects: number;
  page: { name: string; type: string; redirect_count: number } | null;
  record: NavRecord | null; error: string | null;
};

let f: Ferrum;
let tab: number;
const lines: string[] = [];

test.beforeAll(async () => {
  // start on the other site, so the first measured load comes from a known page
  f = await launch("nav-timing", {
    extraSettings: `[session]
restore_on_startup = false
startup_urls = [${JSON.stringify(`${B}/landing`)}]
`,
  });
  await expect.poll(async () => {
    const t = (await tabList(f)).tabs;
    return t.length === 1 && t[0].url === `${B}/landing` && !t[0].loading;
  }, { timeout: 30_000 }).toBe(true);
  tab = (await tabList(f)).tabs[0].id;
});
test.afterAll(async () => {
  console.log(`NAVTIMING:\n${lines.join("\n")}`);
  await f?.quit();
});

/** Loads `input` in the tab and returns the record of the navigation that ended on `final`, once its load is in. */
async function load(input: string, final: string): Promise<NavTiming> {
  const before = (await call<NavTiming>(f, "test_nav_timing", { tab }).catch(() => null))?.record?.nav_id;
  await go(f, input);
  let got: NavTiming | undefined;
  await expect.poll(async () => {
    got = await call<NavTiming>(f, "test_nav_timing", { tab }).catch(() => undefined);
    return got !== undefined && got.final_uri === final && got.record !== null && got.record.nav_id !== before
      && got.record.load_ms !== null;
  }, { timeout: 30_000 }).toBe(true);
  const r = got!.record!;
  expect(got!.error).toBeNull();
  expect(r.tab).toBe(tab);
  expect(r.outcome).toBe("completed");
  // ordered: start on the run clock, then first response, DOMContentLoaded and load on the page's own clock
  expect(r.start_ms).toBeGreaterThan(0);
  expect(r.response_ms!).toBeGreaterThan(0);
  expect(r.dom_content_loaded_ms!).toBeGreaterThanOrEqual(r.response_ms!);
  expect(r.load_ms!).toBeGreaterThanOrEqual(r.dom_content_loaded_ms!);
  expect(r.complete_ms!).toBeGreaterThan(0);
  expect(r.t_ms).toBeGreaterThanOrEqual(Math.floor(r.start_ms + r.complete_ms!));
  expect(got!.page!.name).toBe(final);
  lines.push(`${input.replace(base, "").replace(B, "site-b")} -> ${final.replace(base, "").replace(B, "site-b")}: `
    + `${r.origin}, redirects ${r.redirect_count} (page says ${got!.page!.redirect_count}), start ${r.start_ms.toFixed(1)}, `
    + `response +${r.response_ms!.toFixed(1)}, DOMContentLoaded +${r.dom_content_loaded_ms!.toFixed(1)}, `
    + `load +${r.load_ms!.toFixed(1)}, completed +${r.complete_ms!.toFixed(1)} ms`);
  return got!;
}

test("redirect count, origin label and timestamp order of each navigation", async () => {
  test.setTimeout(180_000);
  const landing = `${base}/landing`;
  // from the start page on the other site: another origin
  let n = await load(landing, landing);
  expect(n.record!.origin).toBe("cross_origin");
  expect(n.record!.redirect_count).toBe(0);

  for (const [kind, hops] of [["301", 1], ["302", 1], ["303", 1], ["307", 1], ["308", 1], ["chain", 2]] as const) {
    n = await load(`${base}/redirect/${kind}`, landing);
    expect(n.record!.redirect_count, kind).toBe(hops);
    expect(n.record!.origin, kind).toBe("same_origin");
    expect(n.page!.redirect_count, `${kind}: the page counts the same-site hops too`).toBe(hops);
  }

  // a redirect to another site: the host still counts it; the page may not (Navigation Timing hides other-origin hops)
  n = await load(`${base}/goto?url=${encodeURIComponent(`${B}/landing`)}`, `${B}/landing`);
  expect(n.record!.redirect_count).toBe(1);
  expect(n.record!.origin).toBe("cross_origin");
  expect(n.page!.redirect_count).toBeLessThanOrEqual(1);

  // plain loads: back to the first site (another origin), then a second page there (same origin)
  n = await load(landing, landing);
  expect([n.record!.origin, n.record!.redirect_count]).toEqual(["cross_origin", 0]);
  n = await load(`${base}/`, `${base}/`);
  expect([n.record!.origin, n.record!.redirect_count]).toEqual(["same_origin", 0]);
});
