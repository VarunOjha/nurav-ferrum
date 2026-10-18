// security.spec: the read-only portal seen from outside (adr-0023; kept from IP-9 and adapted in p0.17).
// - Every route answers a spoofed Host with 403 (proxy.ts, DNS rebinding) and sends X-Frame-Options
//   DENY + a same-origin CSP; loopback Hosts are served.
// - Nothing writes: the approvals API of v1 is gone (404), and every method other than GET and HEAD
//   gets 405 on every route.
// - Framing: a page on another origin cannot show the portal in a frame (clickjacking).
// - No request leaves this computer: every request a page makes goes to the portal itself (fonts are
//   self-hosted).
// - Bind: the server accepts 127.0.0.1 and refuses every non-loopback address of this machine
//   (addresses are printed as masked labels, adr-0027).
// Raw requests go through node:http so the Host header is exactly what the test sets.
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { expect, test } from "@playwright/test";
import { PORT, raw } from "./helpers";
import { addressLabeler, loadMaskMap } from "./mask-labels";

const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROUTES = ["/", "/roadmap", "/architecture", "/decisions", "/research", "/security", "/questions", "/log", "/no-such-page", "/favicon.ico"];

test.describe("every route: Host allowlist and security headers", () => {
  test("a spoofed Host (DNS rebinding) gets 403 on every route and leaks no portal text", async () => {
    for (const route of ROUTES) {
      const r = await raw(PORT, "GET", route, { Host: `attacker.example:${PORT}` });
      expect(r.status, route).toBe(403);
      expect(r.body, route).toMatch(/^403 FORBIDDEN_ORIGIN/);
      expect(r.body, route).not.toContain("Where we are");
      expect(r.headers["x-frame-options"], route).toBe("DENY");
    }
    // a loopback Host with the wrong port is refused too
    expect((await raw(PORT, "GET", "/", { Host: "127.0.0.1:3417" })).status).toBe(403);
  });

  test("a static asset with a spoofed Host gets 403 as well", async ({ page }) => {
    await page.goto("/");
    const asset = await page.evaluate(() => Array.from(document.scripts).map((s) => s.src).find((src) => src.includes("/_next/static/")) ?? null);
    expect(asset).not.toBeNull();
    const p = new URL(asset!).pathname;
    expect((await raw(PORT, "GET", p, { Host: `127.0.0.1:${PORT}` })).status).toBe(200);
    expect((await raw(PORT, "GET", p, { Host: `attacker.example:${PORT}` })).status).toBe(403);
  });

  test("loopback Hosts are served, with X-Frame-Options DENY and a same-origin CSP (control)", async () => {
    for (const host of [`127.0.0.1:${PORT}`, `localhost:${PORT}`]) {
      for (const route of ["/", "/log"]) {
        const r = await raw(PORT, "GET", route, { Host: host });
        expect(r.status, `${host}${route}`).toBe(200);
        expect(r.headers["x-frame-options"], route).toBe("DENY");
        const csp = String(r.headers["content-security-policy"]);
        for (const d of ["frame-ancestors 'none'", "font-src 'self'", "connect-src 'self'", "default-src 'self'"]) expect(csp, route).toContain(d);
      }
    }
  });
});

test.describe("read-only", () => {
  test("the approvals API of v1 is gone and every method except GET and HEAD is refused", async () => {
    const host = { Host: `127.0.0.1:${PORT}` };
    expect((await raw(PORT, "GET", "/api/approvals", host)).status).toBe(404);
    expect((await raw(PORT, "HEAD", "/", host)).status).toBe(200);
    const body = JSON.stringify({ key: "schema", status: "approved", comment: "" });
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      for (const route of ["/api/approvals", "/", "/log"]) {
        const r = await raw(PORT, method, route, { ...host, Origin: ORIGIN, "Content-Type": "application/json" }, body);
        expect(r.status, `${method} ${route}`).toBe(405);
        expect(r.body, `${method} ${route}`).toMatch(/^405 READ_ONLY/);
        expect(r.headers["access-control-allow-origin"], `${method} ${route}`).toBeUndefined();
      }
    }
  });

  test("the page says it is read-only and offers no approve button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("readonly-badge")).toHaveText(/Read-only · steer in Claude Code/);
    await expect(page.getByRole("button", { name: /^(Approve|Reject|Request changes)$/ })).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
  });
});

test("no request leaves this computer (fonts and scripts are served by the portal itself)", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol === "data:" || u.protocol === "blob:") return;
    if (u.origin !== ORIGIN) outside.push(r.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("phase-cards").getByRole("button").first().click();
  await page.keyboard.press("Escape");
  await page.goto("/log");
  await page.waitForLoadState("networkidle");
  expect(outside).toEqual([]);
  // The Plex fonts really are in use (self-hosted through next/font).
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(/Plex|plexSans|plex_sans/i);
});

test("clickjacking: another origin cannot frame the portal", async ({ page }) => {
  const attacker = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body><iframe id="victim" src="${ORIGIN}/" style="width:1200px;height:800px"></iframe></body></html>`);
  });
  await new Promise<void>((resolve) => attacker.listen(0, "127.0.0.1", () => resolve()));
  const aport = (attacker.address() as net.AddressInfo).port;
  const frameDocs: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "document" && r.url().startsWith(ORIGIN)) frameDocs.push({ url: r.url(), status: r.status() });
  });
  try {
    await page.goto(`http://localhost:${aport}/`);
    await expect.poll(() => frameDocs.length).toBeGreaterThan(0);
    // The browser refused to render the framed document: the frame holds no portal content at all.
    const frame = page.frames().find((f) => f !== page.mainFrame());
    expect(frame).toBeDefined();
    const nodes = await frame!.evaluate(() => document.querySelectorAll(".topbar, [data-testid='phase-cards']").length).catch(() => 0);
    expect(nodes).toBe(0);
  } finally {
    await new Promise<void>((resolve) => attacker.close(() => resolve()));
  }
});

/** Non-loopback addresses of this machine (IPv4 and IPv6, link-local IPv6 with its scope). */
function externalAddresses(): string[] {
  const out: string[] = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.internal) continue;
      if (a.family === "IPv6" && a.address.toLowerCase().startsWith("fe80")) out.push(`${a.address.split("%")[0]}%${a.scopeid ?? name}`);
      else out.push(a.address);
    }
  }
  return out;
}

/** "open" if a TCP connection is accepted within 6 s, else the error code ("ECONNREFUSED", "timeout", ...).
 * Windows retries a refused connect for about 2 s before reporting ECONNREFUSED, hence the 6 s budget. */
function probe(host: string, port: number): Promise<string> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (r: string) => {
      s.destroy();
      resolve(r);
    };
    s.setTimeout(6000, () => done("timeout"));
    s.on("connect", () => done("open"));
    s.on("error", (e: NodeJS.ErrnoException) => done(e.code ?? e.message));
  });
}

/** IP_REQUIRE_BIND_PROBE=1 (gate runs) turns "nothing to probe from" into a failure; otherwise it is a
 * visible skip, so a run on an offline machine is not red for a reason unrelated to the code. */
const REQUIRE_BIND_PROBE = process.env.IP_REQUIRE_BIND_PROBE === "1";

function noProbe(reason: string): void {
  if (REQUIRE_BIND_PROBE) expect(false, `${reason} (IP_REQUIRE_BIND_PROBE=1)`).toBe(true);
  test.info().annotations.push({ type: "skip-reason", description: reason });
  console.log(`bind probe: SKIPPED: ${reason}`);
  test.skip(true, reason);
}

test("bind: the server accepts 127.0.0.1 and refuses every non-loopback address of this machine", async () => {
  test.setTimeout(120_000);
  expect(await probe("127.0.0.1", PORT)).toBe("open");
  const addrs = externalAddresses();
  // Evidence is committed: print masked labels, never the real addresses (adr-0027).
  const label = addressLabeler(loadMaskMap());
  console.log(`bind probe: non-loopback addresses: ${addrs.map(label).join(", ") || "none"}`);
  if (addrs.length === 0) return noProbe("this machine has no non-loopback address to probe from");

  // Control: a throwaway listener on every interface (:: dual-stack) must be reachable on each address,
  // so a refusal below means "not listening there", not "this address is unreachable from here".
  const ctl = net.createServer((c) => c.destroy());
  await new Promise<void>((resolve, reject) => {
    ctl.once("error", reject);
    ctl.listen({ host: "::", port: 0, ipv6Only: false }, () => resolve());
  });
  const ctlPort = (ctl.address() as net.AddressInfo).port;
  let reachable: string[];
  try {
    const ctlResults = await Promise.all(addrs.map(async (a) => [a, await probe(a, ctlPort)] as const));
    for (const [a, r] of ctlResults) console.log(`bind probe: control listener ${label(a)} port ${ctlPort} -> ${r}`);
    reachable = ctlResults.filter(([, r]) => r === "open").map(([a]) => a);
  } finally {
    await new Promise<void>((resolve) => ctl.close(() => resolve()));
  }
  if (reachable.filter((a) => net.isIPv4(a)).length === 0) return noProbe("no IPv4 address passed the control probe");

  const results = await Promise.all(reachable.map(async (a) => [a, await probe(a, PORT)] as const));
  for (const [a, r] of results) console.log(`bind probe: ${label(a)} port ${PORT} -> ${r}`);
  for (const [a, r] of results) expect(r, `${label(a)}:${PORT}`).toBe("ECONNREFUSED");
});
