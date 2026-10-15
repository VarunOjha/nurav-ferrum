// p4.11, master prompt section 11 item 4 (SEC-04): Ferrum keeps the browser's same-origin protections as shipped. A page
// on site A tries to reach site B: read a frame of B, read B's response with and without CORS, and see B's cookie. The
// browser must refuse every read. The browser processes Ferrum started must have no switch that weakens web security or
// site isolation. The test server sends no CORS headers, so B never invites A.
import { test, expect } from "@playwright/test";
import { launch, call, tabList, commandLines, switchValues, type Ferrum } from "./ferrum.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";

let f: Ferrum;
test.beforeAll(async () => {
  f = await launch("cross-origin", { perSite: true });
});
test.afterAll(async () => { await f?.quit(); });

/** Opens `url` in a new tab, waits until it has loaded and returns its page (per-site mode: reachable over CDP). */
async function openPage(url: string) {
  const id = await call<number>(f, "tab_new", { url });
  await expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === id)?.loading === false, { timeout: 30_000 }).toBe(true);
  let page;
  await expect.poll(() => (page = f.pages().find((p) => p.url() === url)) !== undefined, { timeout: 15_000 }).toBe(true);
  return page!;
}

test("a page cannot read another site's frame, responses or cookies", async () => {
  // Site B sets a cookie its own script can read.
  const b = await openPage(`${B}/landing`);
  await b.evaluate(() => { document.cookie = "b_secret=1; Path=/; Secure; SameSite=Lax"; });
  expect(await b.evaluate(() => document.cookie)).toContain("b_secret=1");

  const a = await openPage(`${A}/landing`);
  const r = await a.evaluate(async (other) => {
    const out: Record<string, unknown> = {};
    // A frame of B: its document is out of reach.
    const frame = document.createElement("iframe");
    frame.src = `${other}/landing`;
    await new Promise<void>((done) => { frame.onload = () => done(); document.body.append(frame); });
    out.frameContentDocument = frame.contentDocument === null ? "null" : "readable";
    try { void frame.contentWindow!.document.title; out.frameDocument = "readable"; }
    catch (e) { out.frameDocument = (e as Error).name; }
    // B's response, CORS mode: refused (B sends no CORS header).
    try { await (await fetch(`${other}/landing`)).text(); out.corsFetch = "readable"; }
    catch (e) { out.corsFetch = (e as Error).name; }
    // B's response, no-cors mode: an opaque response, no status, no body.
    const opaque = await fetch(`${other}/landing`, { mode: "no-cors" });
    out.noCorsType = opaque.type;
    out.noCorsStatus = opaque.status;
    out.noCorsBody = (await opaque.text()).length;
    // B's cookie is not A's.
    out.cookieSeen = document.cookie.includes("b_secret");
    return out;
  }, B);
  console.log("CROSS-ORIGIN " + JSON.stringify(r));
  expect(r).toEqual({
    frameContentDocument: "null",
    frameDocument: "SecurityError",
    corsFetch: "TypeError",
    noCorsType: "opaque",
    noCorsStatus: 0,
    noCorsBody: 0,
    cookieSeen: false,
  });
});

test("no browser process runs with a switch that weakens web security or site isolation", async () => {
  const inv = await call<{ processes: { pid: number; kind: string }[] }>(f, "test_processes");
  const browsers = inv.processes.filter((p) => p.kind === "browser");
  expect(browsers.length).toBeGreaterThan(0);
  const lines = commandLines(browsers.map((p) => p.pid));
  for (const p of browsers) {
    const cmd = lines.get(p.pid) ?? "";
    expect(cmd, `command line of browser process ${p.pid}`).not.toBe("");
    for (const weak of ["--disable-web-security", "--disable-site-isolation-trials", "--allow-running-insecure-content",
      "--ignore-certificate-errors", "--allow-file-access-from-files", "--disable-features=IsolateOrigins"]) {
      expect(cmd.includes(weak), `${weak} on browser process ${p.pid}`).toBe(false);
    }
    const disabled = switchValues(cmd, "disable-features").flatMap((v) => v.split(","));
    for (const feature of ["IsolateOrigins", "site-per-process", "SitePerProcess", "msSmartScreenProtection"]) {
      expect(disabled, `${feature} disabled on browser process ${p.pid}`).not.toContain(feature);
    }
  }
  console.log("CROSS-ORIGIN-ARGS " + JSON.stringify({ browsers: browsers.length, checked: "no weakening switch" }));
});
