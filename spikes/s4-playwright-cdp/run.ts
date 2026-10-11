// P1 spike S4 (throw-away, never shipped): can one Playwright harness drive spike S1 (Tauri + WebView2,
// several child web views) and Chrome / Edge through the same CDP path (risk-r06)?
//
// Run with Node 24 (built-in TypeScript type stripping): `npm run check`. Writes out/results.json and
// targets.json. Nothing is killed: spike S1 exits by itself (FERRUM_SPIKE_EXIT_AFTER), and the browsers
// started here are closed with the CDP command Browser.close (their own graceful shutdown).
import { chromium, type Browser, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const here = import.meta.dirname;
const repo = path.resolve(here, "..", "..");
const outDir = path.join(here, "out");
fs.mkdirSync(outDir, { recursive: true });

type Feature = { feature: string; ok: boolean; detail: string };
type Target = { id: string; type: string; url: string; title: string; role: string };
type Probe = {
  product: string;
  version: string;
  connected: boolean;
  targets: Target[];
  pages_seen_by_playwright: string[];
  navigated: boolean;
  paint: { name: string; startTime: number }[];
  features: Feature[];
  error?: string;
};

// --- local fixture (loopback HTTP) ---------------------------------------------------------------
const fixtureHtml = `<!doctype html><html><head><meta charset="utf-8"><title>S4 fixture</title>
<style>body{font:16px system-ui;background:#f4f1e8;padding:24px}</style></head>
<body><h1>Spike S4 fixture</h1><p>Local page for the test robot.</p>
<input id="in" placeholder="type here"><button id="b" onclick="document.getElementById('r').textContent='clicked'">Click</button>
<p id="r"></p><img src="/dot.svg" width="40" height="40" alt=""><script>fetch('/data.json').then(r=>r.json()).then(j=>{document.title='S4 fixture '+j.v})</script>
</body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === "/dot.svg") {
    res.writeHead(200, { "content-type": "image/svg+xml" });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#2980b9"/></svg>');
  } else if (req.url === "/data.json") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"v":"from-server"}');
  } else {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  }
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const port = (server.address() as { port: number }).port;
const fixtureUrl = `http://127.0.0.1:${port}/fixture.html`;

// --- helpers ---------------------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(cdpPort: number, ms: number): Promise<{ Browser: string } | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (r.ok) return (await r.json()) as { Browser: string };
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  return null;
}

function roleOf(url: string, product: string): string {
  if (product !== "ferrum-spike-s1") return url.startsWith("http://127.0.0.1") ? "fixture page" : "browser page";
  const m = /tab\.html\?n=(\d)/.exec(url);
  if (m) return `tab-${m[1]}`;
  if (url.startsWith("http://127.0.0.1")) return "tab navigated to fixture";
  if (url.startsWith("http://tauri.localhost/")) return "shell";
  return "other";
}

async function rawTargets(cdpPort: number, product: string): Promise<Target[]> {
  const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
  const list = (await r.json()) as { id: string; type: string; url: string; title: string }[];
  return list.map((t) => ({ id: t.id, type: t.type, url: t.url, title: t.title, role: roleOf(t.url, product) }));
}

async function feature(list: Feature[], name: string, fn: () => Promise<string>): Promise<void> {
  try {
    const detail = await Promise.race([fn(), sleep(15000).then(() => { throw new Error("timeout 15 s"); })]);
    list.push({ feature: name, ok: true, detail });
  } catch (e) {
    list.push({ feature: name, ok: false, detail: String(e instanceof Error ? e.message : e).split("\n")[0] });
  }
}

async function probe(product: string, cdpPort: number, pick: (pages: Page[]) => Page | undefined): Promise<Probe> {
  const p: Probe = { product, version: "", connected: false, targets: [], pages_seen_by_playwright: [], navigated: false, paint: [], features: [] };
  const v = await waitForCdp(cdpPort, 30000);
  if (!v) {
    p.error = `no CDP endpoint on port ${cdpPort} within 30 s`;
    return p;
  }
  p.version = v.Browser;
  let browser: Browser | undefined;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    p.connected = true;
    await sleep(1500);
    const pages = browser.contexts().flatMap((c) => c.pages());
    p.pages_seen_by_playwright = pages.map((pg) => pg.url());
    const page = pick(pages) ?? (await browser.contexts()[0].newPage());
    await page.goto(fixtureUrl, { waitUntil: "load" });
    p.navigated = page.url().startsWith(fixtureUrl);
    await sleep(500);
    p.paint = await page.evaluate(() =>
      performance.getEntriesByType("paint").map((e) => ({ name: e.name, startTime: e.startTime })),
    );
    p.targets = await rawTargets(cdpPort, product);
    const f = p.features;
    await feature(f, "evaluate", async () => `title = ${await page.evaluate(() => document.title)}`);
    await feature(f, "click", async () => {
      await page.click("#b");
      return `result text = ${await page.textContent("#r")}`;
    });
    await feature(f, "keyboard type", async () => {
      await page.fill("#in", "");
      await page.type("#in", "abc");
      return `input value = ${await page.inputValue("#in")}`;
    });
    await feature(f, "screenshot", async () => `${(await page.screenshot()).length} bytes PNG`);
    await feature(f, "network events (page.on response)", async () => {
      const seen: string[] = [];
      page.on("response", (r) => seen.push(`${r.status()} ${new URL(r.url()).pathname}`));
      await page.reload({ waitUntil: "load" });
      await sleep(300);
      return seen.join(", ") || "none seen";
    });
    await feature(f, "request interception (page.route)", async () => {
      await page.route("**/data.json", (route) => route.fulfill({ contentType: "application/json", body: '{"v":"routed"}' }));
      await page.reload({ waitUntil: "load" });
      await sleep(500);
      const t = await page.title();
      await page.unroute("**/data.json");
      if (!t.includes("routed")) throw new Error(`title after routing = ${t}`);
      return `title = ${t}`;
    });
    await feature(f, "CDP session (Performance.getMetrics)", async () => {
      const s = await page.context().newCDPSession(page);
      const m = (await s.send("Performance.enable"), await s.send("Performance.getMetrics")) as { metrics: unknown[] };
      await s.detach();
      return `${m.metrics.length} metrics returned`;
    });
    await feature(f, "history back", async () => {
      await page.goBack({ waitUntil: "load" });
      return `url after back = ${page.url()}`;
    });
    await feature(f, "new page in the default context", async () => {
      const np = await browser!.contexts()[0].newPage();
      const u = np.url();
      await np.close();
      return `opened (${u}) and closed`;
    });
    await feature(f, "new isolated context", async () => {
      const ctx = await browser!.newContext();
      await ctx.close();
      return "created and closed";
    });
  } catch (e) {
    p.error = String(e instanceof Error ? e.message : e).split("\n")[0];
  } finally {
    if (browser) await browser.close().catch(() => {}); // over CDP this only disconnects
  }
  return p;
}

// What the robot sees in a tab that is hidden (Tauri hide()): visibility, paint entries, screenshot.
async function hiddenTabCheck(cdpPort: number): Promise<Record<string, unknown>> {
  const r: Record<string, unknown> = {};
  let browser: Browser | undefined;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const page = browser.contexts().flatMap((c) => c.pages()).find((pg) => pg.url().includes("tab.html?n=2"));
    if (!page) return { error: "tab 2 not found" };
    await page.goto(fixtureUrl, { waitUntil: "load" });
    await sleep(500);
    r.navigated = page.url().startsWith(fixtureUrl);
    r.visibility = await page.evaluate(() => document.visibilityState);
    r.paint = await page.evaluate(() => performance.getEntriesByType("paint").map((e) => e.name));
    r.screenshot = await page
      .screenshot({ timeout: 5000 })
      .then((b) => `${b.length} bytes`)
      .catch((e: unknown) => `failed: ${String(e instanceof Error ? e.message : e).split("\n")[0]}`);
  } catch (e) {
    r.error = String(e instanceof Error ? e.message : e).split("\n")[0];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return r;
}

async function gracefulClose(cdpPort: number): Promise<string> {
  // CDP Browser.close: the browser's own shutdown (like its window's close button), not a kill.
  try {
    const b = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const s = await b.newBrowserCDPSession();
    await s.send("Browser.close").catch(() => {});
    return "Browser.close sent";
  } catch (e) {
    return `close failed: ${String(e)}`;
  }
}

function waitExit(child: ChildProcess, ms: number): Promise<number | null | "still running"> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve(child.exitCode);
    const t = setTimeout(() => resolve("still running"), ms);
    child.once("exit", (code) => {
      clearTimeout(t);
      resolve(code);
    });
  });
}

// --- 1. spike S1 (Ferrum model) ------------------------------------------------------------------
const results: Record<string, unknown> = { fixture: fixtureUrl, started: new Date().toISOString() };
const s1exe = path.join(repo, "spikes", "s1-multiwebview", "src-tauri", "target", "debug", "ferrum-spike-s1.exe");
const s1 = spawn(s1exe, [], {
  env: { ...process.env, FERRUM_SPIKE_MODE: "manual", FERRUM_SPIKE_EXIT_AFTER: "75", WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222" },
  stdio: "ignore",
});
await sleep(4000); // let the shell create its three tabs
// The robot drives the visible tab (tab 1); the hidden tab 2 is checked separately below.
const ferrum = await probe("ferrum-spike-s1", 9222, (pages) => pages.find((pg) => pg.url().includes("tab.html?n=1")));
results.ferrum = ferrum;
results.ferrum_hidden_tab = await hiddenTabCheck(9222);
results.ferrum_exit = await waitExit(s1, 60000);
fs.writeFileSync(path.join(here, "targets.json"), JSON.stringify(ferrum.targets, null, 2) + "\n");

// --- 2. Chrome for Testing and Edge, fresh profiles, same CDP path --------------------------------
const cft = fs.globSync?.(".browsers/chrome/*/chrome-win64/chrome.exe", { cwd: here })[0];
const browsers: [string, string | undefined, number][] = [
  ["chrome-for-testing", cft ? path.join(here, cft) : undefined, 9223],
  ["edge", path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"), 9224],
];
for (const [name, exe, cdpPort] of browsers) {
  if (!exe || !fs.existsSync(exe)) {
    results[name] = { product: name, error: `executable not found: ${exe}` };
    continue;
  }
  const profile = path.join(here, "profiles", `${name}-${Date.now()}`);
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(exe, [`--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  const r = await probe(name, cdpPort, (pages) => pages[0]);
  results[name] = r;
  results[`${name}_close`] = await gracefulClose(cdpPort);
  results[`${name}_exit`] = await waitExit(child, 20000);
}

server.close();
results.finished = new Date().toISOString();
results.host = { node: process.version, platform: os.platform(), elevated: "checked separately" };
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2) + "\n");

const ok = ferrum.connected && ferrum.navigated && ferrum.targets.length >= 2 && ferrum.paint.length > 0;
console.log(`S4 ${ok ? "PASS" : "FAIL"}: ferrum connected=${ferrum.connected} targets=${ferrum.targets.length} navigated=${ferrum.navigated} paint=${ferrum.paint.length}`);
process.exitCode = ok ? 0 : 1;
