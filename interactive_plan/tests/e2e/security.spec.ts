// security.spec (ip-testing §3, IP-9): the local-only guard of /api/approvals seen from outside the
// app (ip-approvals-api §3) and the read-only mode.
// - POST with Origin http://evil.example -> 403; POST with Host evil.example:3418 -> 403; text/plain ->
//   415; Sec-Fetch-Site cross-site -> 403; PUT/PATCH/DELETE -> not 2xx; no CORS headers on a preflight.
//   Every refusal leaves <tmp>/plan/approvals.json byte-identical.
// - PLAN_READONLY=1: a second `next start` of the same build on 127.0.0.1:3419 (playwright.config.ts)
//   shows the read-only banner, disables the approve buttons and answers a valid POST with 403 READ_ONLY.
// - Bind: neither server accepts connections on any non-loopback address of this machine (repeats IP-1
//   spike S3 from another interface's address, ip-approvals-api §3 item 1).
// - IP-9 review fixes: every route answers a spoofed Host with 403 (proxy.ts, DNS rebinding) and sends
//   X-Frame-Options DENY + CSP frame-ancestors 'none'; a page on another origin that frames the app and
//   clicks the approve button gets a blocked frame and sends no POST (clickjacking).
// Raw requests go through node:http so the Host header is exactly what the test sets.
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { expect, test } from "@playwright/test";
import { e2eEnv, FX, readOrNull } from "./helpers";

const PORT = 3418;
const RO_PORT = 3419;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const RO_ORIGIN = `http://127.0.0.1:${RO_PORT}`;

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** One HTTP request to 127.0.0.1:<port> with exactly these headers (Host included). */
function raw(port: number, method: string, urlPath: string, headers: Record<string, string>, body?: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h["Content-Length"] = String(Buffer.byteLength(body));
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers: h, setHost: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const errorCode = (r: RawResponse): string | undefined => {
  try {
    return (JSON.parse(r.body) as { error?: { code?: string } }).error?.code;
  } catch {
    return undefined;
  }
};

/** Current content hash of adr-0901 from the app's own GET (so a POST body is otherwise valid). */
async function seenHash(port: number): Promise<string> {
  const r = await raw(port, "GET", `/api/approvals?key=${FX.adr}`, { Host: `127.0.0.1:${port}` });
  expect(r.status).toBe(200);
  const view = JSON.parse(r.body) as { items: { key: string; current: { content_hash: string | null } }[] };
  const h = view.items.find((i) => i.key === FX.adr)?.current.content_hash;
  expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
  return h!;
}

const validBody = (hash: string) => JSON.stringify({ key: FX.adr, status: "approved", comment: "", seen_content_hash: hash });

let before: Buffer | null;
test.beforeAll(() => {
  before = readOrNull(e2eEnv().approvalsFile);
});
test.afterEach(() => {
  // no refusal below may write the temp approvals file
  const now = readOrNull(e2eEnv().approvalsFile);
  expect(now === null ? null : now.toString("base64")).toBe(before === null ? null : before.toString("base64"));
});

test.describe("guard (port 3418)", () => {
  test("POST with Origin http://evil.example -> 403 FORBIDDEN_ORIGIN", async () => {
    const body = validBody(await seenHash(PORT));
    const r = await raw(PORT, "POST", "/api/approvals", { Host: `127.0.0.1:${PORT}`, Origin: "http://evil.example", "Content-Type": "application/json" }, body);
    expect(r.status).toBe(403);
    expect(errorCode(r)).toBe("FORBIDDEN_ORIGIN");
  });

  test("POST with Host evil.example:3418 -> 403 (DNS rebinding); GET with that Host -> 403 too", async () => {
    const body = validBody(await seenHash(PORT));
    const post = await raw(PORT, "POST", "/api/approvals", { Host: `evil.example:${PORT}`, Origin: `http://evil.example:${PORT}`, "Content-Type": "application/json" }, body);
    expect(post.status).toBe(403);
    expect(errorCode(post)).toBe("FORBIDDEN_ORIGIN");
    const get = await raw(PORT, "GET", "/api/approvals", { Host: `evil.example:${PORT}` });
    expect(get.status).toBe(403);
    expect(errorCode(get)).toBe("FORBIDDEN_ORIGIN");
  });

  test("POST without Origin, or with Sec-Fetch-Site: cross-site -> 403", async () => {
    const body = validBody(await seenHash(PORT));
    const noOrigin = await raw(PORT, "POST", "/api/approvals", { Host: `127.0.0.1:${PORT}`, "Content-Type": "application/json" }, body);
    expect(noOrigin.status).toBe(403);
    const cross = await raw(
      PORT,
      "POST",
      "/api/approvals",
      { Host: `127.0.0.1:${PORT}`, Origin: ORIGIN, "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
      body,
    );
    expect(cross.status).toBe(403);
    expect(errorCode(cross)).toBe("FORBIDDEN_ORIGIN");
  });

  test("POST with Content-Type text/plain -> 415 (a form or no-cors fetch cannot reach the store)", async () => {
    const body = validBody(await seenHash(PORT));
    const r = await raw(PORT, "POST", "/api/approvals", { Host: `127.0.0.1:${PORT}`, Origin: ORIGIN, "Content-Type": "text/plain" }, body);
    expect(r.status).toBe(415);
    expect(errorCode(r)).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  test("PUT, PATCH and DELETE -> not 2xx", async () => {
    const body = validBody(await seenHash(PORT));
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const r = await raw(PORT, method, "/api/approvals", { Host: `127.0.0.1:${PORT}`, Origin: ORIGIN, "Content-Type": "application/json" }, body);
      expect(r.status, method).toBeGreaterThanOrEqual(400);
    }
  });

  test("a CORS preflight is not answered with Access-Control-Allow-* headers", async () => {
    const r = await raw(PORT, "OPTIONS", "/api/approvals", {
      Host: `127.0.0.1:${PORT}`,
      Origin: "http://evil.example",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    });
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
    expect(r.headers["access-control-allow-methods"]).toBeUndefined();
  });

  test("a well-formed same-origin request is accepted by the guard (control: the refusals above are the guard's)", async () => {
    // A stale seen hash: the guard lets it through and the store refuses it with 409, writing nothing.
    const r = await raw(
      PORT,
      "POST",
      "/api/approvals",
      { Host: `127.0.0.1:${PORT}`, Origin: ORIGIN, "Content-Type": "application/json" },
      validBody("sha256:" + "0".repeat(64)),
    );
    expect(r.status).toBe(409);
    expect(errorCode(r)).toBe("PAGE_CHANGED");
  });
});

test.describe("every route: Host allowlist and security headers (IP-9 review)", () => {
  const ROUTES = ["/", "/wiki", FX.rawPath, FX.adrPath, "/approvals", "/log", "/lint", "/search?q=a", "/decisions", "/roadmap", "/research", "/architecture", "/risks", `/go/${FX.adr}`, "/no-such-page", "/favicon.ico"];

  test("a spoofed Host (DNS rebinding) gets 403 on every page route and leaks no wiki content", async () => {
    for (const route of ROUTES) {
      const r = await raw(PORT, "GET", route, { Host: `attacker.example:${PORT}` });
      expect(r.status, route).toBe(403);
      expect(r.body, route).toMatch(/^403 FORBIDDEN_ORIGIN/);
      expect(r.body, route).not.toContain(FX.bodyWord);
      expect(r.headers["x-frame-options"], route).toBe("DENY");
    }
    // a loopback Host with the wrong port is refused too
    expect((await raw(PORT, "GET", "/wiki", { Host: "127.0.0.1:3417" })).status).toBe(403);
  });

  test("a static asset with a spoofed Host gets 403 as well", async ({ page }) => {
    await page.goto("/wiki");
    const asset = await page.evaluate(() => Array.from(document.scripts).map((s) => s.src).find((src) => src.includes("/_next/static/")) ?? null);
    expect(asset).not.toBeNull();
    const p = new URL(asset!).pathname;
    expect((await raw(PORT, "GET", p, { Host: `127.0.0.1:${PORT}` })).status).toBe(200);
    expect((await raw(PORT, "GET", p, { Host: `attacker.example:${PORT}` })).status).toBe(403);
  });

  test("loopback Hosts are served, with X-Frame-Options DENY and a same-origin CSP (control)", async () => {
    for (const host of [`127.0.0.1:${PORT}`, `localhost:${PORT}`]) {
      for (const route of ["/", FX.adrPath, "/api/approvals"]) {
        const r = await raw(PORT, "GET", route, { Host: host });
        expect(r.status, `${host}${route}`).toBe(200);
        expect(r.headers["x-frame-options"], route).toBe("DENY");
        const csp = String(r.headers["content-security-policy"]);
        for (const d of ["frame-ancestors 'none'", "img-src 'self' data:", "connect-src 'self'", "default-src 'self'"]) expect(csp, route).toContain(d);
      }
    }
  });

  test("clickjacking: another origin cannot frame the app, and a click on the frame sends no POST", async ({ page }) => {
    const attacker = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><html><body style="margin:0"><button id="bait" style="position:absolute;left:0;top:0;width:1360px;height:900px">Win a prize</button>` +
          `<iframe id="victim" src="${ORIGIN}${FX.adrView}" style="position:absolute;left:0;top:0;width:1360px;height:900px;opacity:0.01;border:0;z-index:2"></iframe></body></html>`,
      );
    });
    await new Promise<void>((resolve) => attacker.listen(0, "127.0.0.1", () => resolve()));
    const aport = (attacker.address() as net.AddressInfo).port;
    const posts: string[] = [];
    const frameDocs: { url: string; status: number }[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") posts.push(r.url());
    });
    page.on("response", (r) => {
      if (r.request().resourceType() === "document" && r.url().startsWith(ORIGIN)) frameDocs.push({ url: r.url(), status: r.status() });
    });
    try {
      await page.goto(`http://localhost:${aport}/`);
      await expect.poll(() => frameDocs.length).toBeGreaterThan(0);
      // The browser refused to render the framed document: the frame holds no app content at all.
      const frame = page.frames().find((f) => f !== page.mainFrame());
      expect(frame).toBeDefined();
      const appNodes = await frame!.evaluate(() => document.querySelectorAll("[data-testid='approve-bar'], .topbar").length).catch(() => 0);
      expect(appNodes).toBe(0);
      // Click everywhere the approve button could be.
      for (const [x, y] of [[200, 300], [400, 500], [680, 450], [100, 800]]) await page.mouse.click(x, y);
      await page.waitForLoadState("networkidle");
      expect(posts).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => attacker.close(() => resolve()));
    }
  });
});

test.describe("PLAN_READONLY=1 (port 3419, same build and fixture)", () => {
  test("the API reports readonly and refuses a valid POST with 403 READ_ONLY", async () => {
    const get = await raw(RO_PORT, "GET", "/api/approvals", { Host: `127.0.0.1:${RO_PORT}` });
    expect(get.status).toBe(200);
    expect((JSON.parse(get.body) as { readonly: boolean }).readonly).toBe(true);
    const body = validBody(await seenHash(RO_PORT));
    const r = await raw(RO_PORT, "POST", "/api/approvals", { Host: `127.0.0.1:${RO_PORT}`, Origin: RO_ORIGIN, "Content-Type": "application/json" }, body);
    expect(r.status).toBe(403);
    expect(errorCode(r)).toBe("READ_ONLY");
    // the body carried the current hash, so only the read-only mode refused it (both servers read the same fixture)
    expect((JSON.parse(body) as { seen_content_hash: string }).seen_content_hash).toBe(await seenHash(PORT));
  });

  test("the UI shows the read-only banner and every approve button is disabled with the reason", async ({ page }) => {
    await page.goto(`${RO_ORIGIN}${FX.adrView}`);
    await expect(page.locator(".banner").filter({ hasText: "Read-only mode" })).toBeVisible();
    const bar = page.locator(`[data-testid='approve-bar'][data-key='${FX.adr}']`);
    await expect(bar).toHaveAttribute("data-state", "PENDING");
    for (const name of ["Approve", "Request changes", "Reject"]) {
      await expect(bar.getByRole("button", { name, exact: true })).toBeDisabled();
    }
    await expect(bar.getByRole("textbox")).toBeDisabled();
    await expect(bar.getByTestId("approve-disabled")).toHaveText("Read-only mode (PLAN_READONLY=1): approvals are disabled.");
    // phase exit bars too
    await page.goto(`${RO_ORIGIN}/phases/phase-p2-fixture-review`);
    const buttons = page.locator("[data-testid='approve-bar'] button", { hasText: /^(Approve|Request changes|Reject)$/ });
    expect(await buttons.count()).toBeGreaterThan(0);
    for (const b of await buttons.all()) await expect(b).toBeDisabled();
  });

  test("the writable server shows no read-only banner (control)", async ({ page }) => {
    await page.goto(FX.adrView);
    await expect(page.locator(".banner").filter({ hasText: "Read-only mode" })).toHaveCount(0);
    await expect(page.locator(`[data-testid='approve-bar'][data-key='${FX.adr}']`).getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
  });
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
 * visible skip, so `npm run verify` on an offline machine is not red for a reason unrelated to the code. */
const REQUIRE_BIND_PROBE = process.env.IP_REQUIRE_BIND_PROBE === "1";

function noProbe(reason: string): void {
  if (REQUIRE_BIND_PROBE) expect(false, `${reason} (IP_REQUIRE_BIND_PROBE=1)`).toBe(true);
  test.info().annotations.push({ type: "skip-reason", description: reason });
  console.log(`bind probe: SKIPPED: ${reason}`);
  test.skip(true, reason);
}

test("bind: both servers accept 127.0.0.1 and refuse every non-loopback address of this machine", async () => {
  test.setTimeout(120_000);
  expect(await probe("127.0.0.1", PORT)).toBe("open");
  expect(await probe("127.0.0.1", RO_PORT)).toBe("open");
  const addrs = externalAddresses();
  console.log(`bind probe: non-loopback addresses: ${addrs.join(", ") || "none"}`);
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
    for (const [a, r] of ctlResults) console.log(`bind probe: control listener ${a} port ${ctlPort} -> ${r}`);
    reachable = ctlResults.filter(([, r]) => r === "open").map(([a]) => a);
  } finally {
    await new Promise<void>((resolve) => ctl.close(() => resolve()));
  }
  // At least the IPv4 LAN/vEthernet addresses must pass the control, or the check proves nothing.
  if (reachable.filter((a) => net.isIPv4(a)).length === 0) return noProbe("no IPv4 address passed the control probe");

  const results = await Promise.all(
    reachable.flatMap((a) => [PORT, RO_PORT].map(async (port) => [a, port, await probe(a, port)] as const)),
  );
  for (const [a, port, r] of results) console.log(`bind probe: ${a} port ${port} -> ${r}`);
  for (const [a, port, r] of results) expect(r, `${a}:${port}`).toBe("ECONNREFUSED");
});
