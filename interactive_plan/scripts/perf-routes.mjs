#!/usr/bin/env node
// IP-9 route timing (ip-build-plan IP-9, ip-spec §5 item 5). App evidence only, never a Ferrum result.
//
// Starts the existing production build (`next build` must have run) with `next start -H 127.0.0.1`
// on PERF_PORT (default 3420) against the REAL wiki, with PLAN_READONLY=1 and PLAN_APPEND_LOG=0, so
// the app cannot write anything. For each route it measures the time from sending the request to the
// last byte of the response (server render + transfer over loopback):
//   - warm: 1 warm-up request (discarded), then 5 runs; the median is the reported number
//   - lint-cold: 1 request after the layout's 10 s lint memo expired (the memo makes warm runs cheaper)
// It also records the server's very first request, the first-load JS of each page (the
// /_next/static scripts referenced by the initial HTML, raw and gzip bytes), checks PLAN_READONLY
// (a POST answers 403 READ_ONLY) and that the real plan/approvals.json, wiki/log.md and STATUS.md are
// unchanged (mtime + sha256) and that no plan/ directory was created.
//
// Usage: node scripts/perf-routes.mjs            (prints the report; exit 1 on a failed check)
// Target (ip-spec §5): every route under 500 ms server-side with a wiki of 300 pages.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(APP_DIR, "..");
const PORT = Number(process.env.PERF_PORT ?? 3420);
const BASE = `http://127.0.0.1:${PORT}`;
const RUNS = 5;
const TARGET_MS = 500;
const LINT_TTL_MS = 10_000;
const GRAPH_ROUTES = new Set(["/architecture", "/roadmap", "/research"]);

const ROUTES = [
  "/",
  "/architecture",
  "/roadmap",
  "/phases/phase-p0-planning",
  "/decisions",
  "/decisions/adr-0016",
  "/risks",
  "/research",
  "/wiki",
  "/wiki/SCHEMA.md",
  "/wiki/index.md",
  "/wiki/log.md",
  "/search?q=approval",
  "/log",
  "/approvals",
  "/lint",
  "/api/approvals",
];

const GUARDED = [path.join(REPO, "plan", "approvals.json"), path.join(REPO, "wiki", "log.md"), path.join(REPO, "STATUS.md")];
const fingerprint = (p) =>
  existsSync(p) ? `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}` : "absent";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const ms = (x) => `${x.toFixed(1)} ms`;

async function timed(route, init) {
  const t0 = performance.now();
  const res = await fetch(BASE + route, { redirect: "manual", ...init });
  const body = Buffer.from(await res.arrayBuffer());
  return { ms: performance.now() - t0, status: res.status, body };
}

function countMd(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countMd(path.join(dir, e.name));
    else if (e.name.endsWith(".md")) n++;
  }
  return n;
}

function firstLoadJs(html) {
  const srcs = [...new Set([...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]))];
  let raw = 0;
  let gz = 0;
  for (const s of srcs) {
    const f = path.join(APP_DIR, ".next", "static", ...s.slice("/_next/static/".length).split("/"));
    const b = readFileSync(f);
    raw += b.length;
    gz += gzipSync(b, { level: 9 }).length;
  }
  return { files: srcs.length, raw, gz };
}

async function main() {
  const failures = [];
  if (!existsSync(path.join(APP_DIR, ".next", "BUILD_ID"))) throw new Error("no production build: run `npm run build` first");
  const before = GUARDED.map(fingerprint);
  const planDirBefore = existsSync(path.join(REPO, "plan"));

  const env = { ...process.env, PLAN_READONLY: "1", PLAN_APPEND_LOG: "0", PLAN_PORT: String(PORT) };
  for (const k of ["PLAN_REPO_ROOT", "PLAN_WIKI_DIR", "PLAN_DATA_DIR", "PLAN_STATUS_FILE"]) delete env[k]; // defaults = the real repo
  const nextBin = path.join(APP_DIR, "node_modules", "next", "dist", "bin", "next");
  const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(PORT)], { cwd: APP_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
  let serverErr = "";
  server.stderr.on("data", (d) => (serverErr += d));
  server.stdout.on("data", () => undefined);
  try {
    // readiness: a TCP-level probe of a cheap static asset, so the first page render is still measured
    const t0 = Date.now();
    for (;;) {
      try {
        const r = await fetch(`${BASE}/favicon.ico`);
        await r.arrayBuffer();
        break;
      } catch {
        if (Date.now() - t0 > 60_000) throw new Error(`server did not start: ${serverErr}`);
        await sleep(250);
      }
    }

    const pages = countMd(path.join(REPO, "wiki"));
    console.log("== Environment");
    console.log(`date: ${new Date().toISOString()}`);
    console.log(`machine: ${os.cpus()[0]?.model ?? "?"} (${os.cpus().length} logical CPUs), ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB RAM, ${os.type()} ${os.release()}`);
    console.log(`node ${process.version}; next ${JSON.parse(readFileSync(path.join(APP_DIR, "node_modules", "next", "package.json"), "utf8")).version}; server: next start -H 127.0.0.1 -p ${PORT}, PLAN_READONLY=1, PLAN_APPEND_LOG=0`);
    console.log(`wiki: real repo wiki/, ${pages} .md files (the ip-spec §5 target assumes 300 pages)`);
    console.log(`method: time from request to last response byte over loopback (fetch), sequential; warm = 1 warm-up + ${RUNS} runs, median reported; lint-cold = 1 request after the 10 s lint memo expired`);
    console.log("");

    const first = await timed("/");
    console.log(`== First request after server start: GET / -> ${first.status} in ${ms(first.ms)} (wiki load + parse + lint, all cold)`);
    if (first.status !== 200) failures.push(`first GET / -> ${first.status}`);
    console.log("");

    const rows = [];
    for (const route of ROUTES) {
      const warm = await timed(route);
      const runs = [];
      let status = warm.status;
      for (let i = 0; i < RUNS; i++) {
        const r = await timed(route);
        runs.push(r.ms);
        if (r.status !== 200) status = r.status;
      }
      const js = route.startsWith("/api/") ? null : firstLoadJs(warm.body.toString("utf8"));
      rows.push({ route, status, warmup: warm.ms, runs, med: median(runs), max: Math.max(...runs), js });
      if (status !== 200) failures.push(`${route} -> ${status}`);
    }

    // lint-cold: wait past the memo TTL before each request
    for (const row of rows) {
      await sleep(LINT_TTL_MS + 500);
      const r = await timed(row.route);
      row.cold = r.ms;
      if (r.status !== 200) failures.push(`${row.route} (lint-cold) -> ${r.status}`);
    }

    console.log(`== Server render timing per route (real wiki; target < ${TARGET_MS} ms, ip-spec §5)`);
    console.log(["route", "status", "median(5)", "min", "max", "warm-up", "lint-cold", "runs", "< target"].join(" | "));
    for (const r of rows) {
      const ok = r.med < TARGET_MS;
      console.log(
        [r.route, r.status, ms(r.med), ms(Math.min(...r.runs)), ms(r.max), ms(r.warmup), ms(r.cold), r.runs.map((x) => x.toFixed(1)).join(", "), ok ? "yes" : "NO"].join(" | "),
      );
    }
    const over = rows.filter((r) => r.med >= TARGET_MS).map((r) => r.route);
    const overCold = rows.filter((r) => r.cold >= TARGET_MS).map((r) => r.route);
    console.log(`summary: ${rows.length} routes; median >= ${TARGET_MS} ms: ${over.length ? over.join(", ") : "none"}; lint-cold >= ${TARGET_MS} ms: ${overCold.length ? overCold.join(", ") : "none"}; slowest median ${ms(Math.max(...rows.map((r) => r.med)))}, slowest lint-cold ${ms(Math.max(...rows.map((r) => r.cold)))}`);
    console.log("");

    console.log("== First-load JS (scripts referenced by the initial HTML; graph and mermaid code loads later, client-only)");
    console.log(["route", "kind", "files", "raw bytes", "gzip -9 bytes"].join(" | "));
    for (const r of rows.filter((x) => x.js)) {
      console.log([r.route, GRAPH_ROUTES.has(r.route) ? "graph" : "non-graph", r.js.files, r.js.raw, r.js.gz].join(" | "));
    }
    const ng = rows.filter((x) => x.js && !GRAPH_ROUTES.has(x.route));
    console.log(`summary: non-graph routes first-load JS max ${Math.max(...ng.map((x) => x.js.gz))} bytes gzip (${Math.max(...ng.map((x) => x.js.raw))} raw); ip-spec §5 sets no number ("stays small")`);
    console.log("");

    console.log("== PLAN_READONLY=1 check (real wiki)");
    const post = await fetch(`${BASE}/api/approvals`, {
      method: "POST",
      headers: { Origin: BASE, "Content-Type": "application/json" },
      body: "{}",
    });
    const postBody = await post.text();
    let code = null;
    try {
      code = JSON.parse(postBody).error?.code ?? null;
    } catch {
      code = null;
    }
    console.log(`POST /api/approvals (same-origin, body {}) -> ${post.status} ${code}`);
    if (post.status !== 403 || code !== "READ_ONLY") failures.push(`readonly POST -> ${post.status} ${code}`);
    const get = await (await fetch(`${BASE}/api/approvals`)).json();
    console.log(`GET /api/approvals -> readonly: ${get.readonly}, file exists: ${get.file.exists}, items: ${get.items.length}`);
    if (get.readonly !== true) failures.push("GET readonly is not true");
    const html = await (await fetch(`${BASE}/decisions/adr-0016`)).text();
    const banner = html.includes("Read-only mode");
    const disabledButtons = (html.match(/<button[^>]*disabled=""[^>]*>(Approve|Request changes|Reject)<\/button>/g) ?? []).length;
    console.log(`GET /decisions/adr-0016 -> read-only banner: ${banner}, disabled approve-bar buttons in the server HTML: ${disabledButtons}`);
    if (!banner || disabledButtons !== 3) failures.push(`readonly UI: banner ${banner}, disabled buttons ${disabledButtons}`);
  } finally {
    server.kill();
    await sleep(500);
  }

  const after = GUARDED.map(fingerprint);
  console.log("");
  console.log("== Real files");
  GUARDED.forEach((p, i) => {
    const same = before[i] === after[i];
    console.log(`${path.relative(REPO, p).split(path.sep).join("/")}: ${before[i] === "absent" ? "absent" : "present"} before, ${after[i] === "absent" ? "absent" : "present"} after, ${same ? "unchanged" : "CHANGED"}`);
    if (!same) failures.push(`${p} changed`);
  });
  const planDirAfter = existsSync(path.join(REPO, "plan"));
  console.log(`plan/ directory: ${planDirBefore ? "present" : "absent"} before, ${planDirAfter ? "present" : "absent"} after`);
  if (planDirAfter !== planDirBefore) failures.push("plan/ directory created or removed");

  console.log("");
  console.log(failures.length ? `RESULT: FAIL (${failures.join("; ")})` : "RESULT: checks passed (timings are app evidence only; compare with the target above)");
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
