// p5.10: which kinds of request the network log sees (WebResourceResponseReceived of the tab's view). With the log on,
// one tab visits pages that make each kind of request; for each kind the test notes whether the log has an entry and
// which. Only the kinds p5.9 already showed (page, other-site frame, page fetch, sub-resources) are asserted; the rest
// is recorded as found, covered or not, for the coverage table on comp-network-logger. Prints one COVERAGE-JSON line.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const B = "https://site-b.localhost:8443";
type Rec = { tab: number; url: string; method: string; status: number | null; resource_type: string | null; t_ms: number };

let f: Ferrum;
test.beforeAll(async () => { f = await launch("network-log-coverage", { extraSettings: "[network_log]\nenabled = true\n" }); });
test.afterAll(async () => { await f?.quit(); });

function readLog(folder: string): Rec[] {
  return fs.readdirSync(folder).filter((n) => /^netlog\.\d{4}\.jsonl$/.test(n)).sort()
    .flatMap((n) => fs.readFileSync(path.join(folder, n), "utf8").split("\n").filter((l) => l))
    .map((l) => JSON.parse(l) as Rec);
}

test("coverage of the network log, kind by kind", async () => {
  test.setTimeout(180_000);
  const folder = (await call<string | null>(f, "test_netlog"))!;
  expect(folder).not.toBeNull();
  const tab = await call<number>(f, "tab_new", { url: `${base}/netlog` });
  const title = (want: string | RegExp) =>
    expect.poll(async () => (await tabList(f)).tabs.find((t) => t.id === tab)?.title, { timeout: 30_000 }).toMatch(want);
  const settle = () => new Promise((r) => setTimeout(r, 2000));
  let mark = 0; // records before the current step
  const step = () => readLog(folder).slice(mark);
  const rows: { kind: string; how: string; covered: boolean; entries: string[] }[] = [];
  const note = (kind: string, how: string, recs: Rec[]) => {
    rows.push({ kind, how, covered: recs.length > 0,
      entries: recs.map((r) => `${r.method} ${r.url.replace(base, "").replace(B, "site-b")} ${r.status} ${r.resource_type}`) });
  };
  const of = (recs: Rec[], u: string) => recs.filter((r) => r.url === u && r.tab === tab);

  // 1. a page with its sub-resources, a frame of another site and a fetch (as in p5.9)
  await title("netlog done");
  await settle();
  let s = step();
  note("top-level page", "the /netlog document", of(s, `${base}/netlog`));
  note("sub-resources", "stylesheet, script, image of /netlog", [...of(s, `${base}/netlog/style.css`), ...of(s, `${base}/netlog/app.js`), ...of(s, `${base}/icon.png`)]);
  note("frame of another site", "site-b /landing in an iframe", of(s, `${B}/landing`));
  note("fetch from the page", "/netlog/data.json", of(s, `${base}/netlog/data.json`));
  expect(rows.every((r) => r.covered), JSON.stringify(rows)).toBe(true);

  // 2. the same page again: sub-resources may come from the browser's cache
  mark = readLog(folder).length;
  await go(f, `${base}/landing`);
  await title("Landing");
  await go(f, `${base}/netlog`);
  await title("netlog done");
  await settle();
  s = step();
  note("sub-resources on a second visit", "stylesheet, script, image of /netlog again (the cache may serve them; the log cannot tell)",
    [...of(s, `${base}/netlog/style.css`), ...of(s, `${base}/netlog/app.js`), ...of(s, `${base}/icon.png`)]);

  // 3. a redirect chain: each hop's response, or only the last
  mark = readLog(folder).length;
  await go(f, `${base}/redirect/chain`);
  await title("Landing");
  await settle();
  s = step();
  note("redirect hop 1 (301)", "/redirect/chain", of(s, `${base}/redirect/chain`));
  note("redirect hop 2 (302)", "/redirect/302", of(s, `${base}/redirect/302`));
  note("redirect target", "/landing after the chain", of(s, `${base}/landing`));

  // 4. a request that gets no response at all
  mark = readLog(folder).length;
  await go(f, `${base}/netlog/no-response`);
  await title("no-response done");
  await settle();
  s = step();
  note("request with no response", "fetch to a port nobody listens on", of(s, "https://localhost:1/nothing"));

  // 5. a service worker: its own script, what it fetches, what it answers, and what it passes on
  mark = readLog(folder).length;
  await go(f, `${base}/sw/page`);
  await title("sw done");
  await settle();
  s = step();
  const any = (u: string) => s.filter((r) => r.url === u); // a worker's requests may carry another tab number
  note("service worker script", "/sw/sw.js", any(`${base}/sw/sw.js`));
  note("request made by the service worker", "/sw/from-worker.json (fetched when it installs)", any(`${base}/sw/from-worker.json`));
  note("request answered by the service worker", "/sw/via-worker.json (no network)", any(`${base}/sw/via-worker.json`));
  note("request passed on by the service worker", "/sw/passthrough.json", any(`${base}/sw/passthrough.json`));

  const tabs = [...new Set(readLog(folder).map((r) => r.tab))];
  console.log(`COVERAGE-JSON ${JSON.stringify({ build: "debug", tab, tabs_seen: tabs, rows })}`);
  for (const r of rows) console.log(`COVERAGE: ${r.covered ? "covered    " : "not covered"} ${r.kind}: ${r.entries.join("; ") || "(no entry)"}`);
});
