// The Host allowlist on every route (proxy.ts ->
// hostGate; kept from IP-9 for the read-only portal of p0.17), the response security headers (no framing, same-origin subresources) and the loopback
// launcher used by every server npm script (scripts/serve.mjs follows PLAN_PORT like lib/config.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/lib/config";
import { hostGate } from "@/lib/security/hostGate";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/policy";
import { nextArgs, planPort } from "../../scripts/serve.mjs";

const req = (url: string, host: string | null) => {
  const headers = new Headers();
  if (host !== null) headers.set("host", host);
  return { url, headers };
};

describe("hostGate (every route)", () => {
  it.each(["127.0.0.1:3417", "localhost:3417", "[::1]:3417", "LOCALHOST:3417"])("lets %s through", (host) => {
    expect(hostGate(req("http://127.0.0.1:3417/wiki/SCHEMA.md", host), 3417)).toBeNull();
  });

  it.each([
    ["attacker.example:3417", "/"],
    ["attacker.example:3417", "/wiki/raw/owner/2026-10-08-s01-wave0.md"],
    ["127.0.0.1:3418", "/approvals"],
    ["127.0.0.1", "/log"],
    ["192.168.1.10:3417", "/_next/static/chunks/x.js"],
  ])("refuses Host %s on %s with 403 text and the security headers", async (host, p) => {
    const r = hostGate(req(`http://127.0.0.1:3417${p}`, host), 3417)!;
    expect(r.status).toBe(403);
    expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(await r.text()).toMatch(/^403 FORBIDDEN_ORIGIN/);
  });

  it("refuses a missing Host", () => {
    expect(hostGate(req("http://127.0.0.1:3417/", null), 3417)!.status).toBe(403);
  });

  it("answers former /api/ paths with the same plain 403 (the portal has no API)", async () => {
    const r = hostGate(req("http://127.0.0.1:3417/api/approvals", "evil.example:3417"), 3417)!;
    expect(r.status).toBe(403);
    expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await r.text()).toMatch(/^403 FORBIDDEN_ORIGIN/);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "post"])("refuses %s from a loopback Host with 405 (the portal only reads)", async (method) => {
    const r = hostGate({ ...req("http://127.0.0.1:3417/", "127.0.0.1:3417"), method }, 3417)!;
    expect(r.status).toBe(405);
    expect(r.headers.get("allow")).toBe("GET, HEAD");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(await r.text()).toMatch(/^405 READ_ONLY/);
  });

  it.each(["GET", "HEAD", "get"])("lets %s through", (method) => {
    expect(hostGate({ ...req("http://127.0.0.1:3417/", "127.0.0.1:3417"), method }, 3417)).toBeNull();
  });

  it("checks the Host before the method", () => {
    expect(hostGate({ ...req("http://127.0.0.1:3417/", "evil.example:3417"), method: "POST" }, 3417)!.status).toBe(403);
  });

  it("tolerates an unparsable URL", () => {
    expect(hostGate(req("not a url", "evil:1"), 3417)!.status).toBe(403);
  });
});

describe("security headers", () => {
  it("refuse framing and keep subresources same-origin", () => {
    const csp = contentSecurityPolicy(false);
    for (const d of ["frame-ancestors 'none'", "default-src 'self'", "img-src 'self' data:", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(csp).toContain(d);
    }
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:/);
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
    const h = Object.fromEntries(securityHeaders(false).map((x) => [x.key, x.value]));
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });
});

describe("scripts/serve.mjs (every server npm script binds loopback on PLAN_PORT)", () => {
  it.each([
    [{}, 3417],
    [{ PLAN_PORT: "4000" }, 4000],
    [{ PLAN_PORT: " 4001 " }, 4001],
    [{ PLAN_PORT: "abc" }, 3417],
    [{ PLAN_PORT: "" }, 3417],
  ])("PLAN_PORT %j -> %i, the same port lib/config.ts guards", (env, port) => {
    expect(planPort(env)).toBe(port);
    expect(getConfig(env, process.cwd()).port).toBe(port);
    expect(nextArgs("start", [], env)).toEqual(["start", "-H", "127.0.0.1", "-p", String(port)]);
  });

  it("refuses another mode and caller-supplied host or port flags", () => {
    expect(() => nextArgs("build", [], {})).toThrow(/mode/);
    for (const bad of ["-H", "-p", "--hostname=0.0.0.0", "--port"]) expect(() => nextArgs("dev", [bad], {})).toThrow(/not allowed/);
    expect(nextArgs("dev", ["--turbopack"], {})).toEqual(["dev", "-H", "127.0.0.1", "-p", "3417", "--turbopack"]);
  });

  it("package.json: every script that starts a server goes through serve.mjs", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (/\bnext (dev|start)\b/.test(cmd)) throw new Error(`script ${name} starts next directly: ${cmd}`);
    }
    for (const name of ["dev", "dev:local", "start", "start:local"]) expect(pkg.scripts[name]).toContain("node scripts/serve.mjs");
  });
});
