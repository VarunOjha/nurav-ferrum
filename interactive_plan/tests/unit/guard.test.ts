// ip-testing §1.5: the local-only guard header matrix (ip-approvals-api §3). Pure, no fs.
import { describe, expect, it } from "vitest";
import { checkLocal, MAX_BODY_BYTES, mediaType, readBodyLimited } from "@/lib/approvals/guard";

const P = 3417;
const req = (method: string, headers: Record<string, string>) =>
  ({ method, headers: new Headers(headers) }) as Pick<Request, "method" | "headers">;
const post = (over: Record<string, string | null> = {}) => {
  const h: Record<string, string> = {
    host: `127.0.0.1:${P}`,
    origin: `http://127.0.0.1:${P}`,
    "content-type": "application/json",
  };
  for (const [k, v] of Object.entries(over)) {
    if (v === null) delete h[k];
    else h[k] = v;
  }
  return req("POST", h);
};
const result = (r: ReturnType<typeof checkLocal>) => (r.ok ? "ok" : `${r.status} ${r.code}`);

describe("Host (GET and POST)", () => {
  it.each(["127.0.0.1", "localhost", "[::1]", "LOCALHOST"])("%s:<port> is accepted", (h) => {
    expect(result(checkLocal(req("GET", { host: `${h}:${P}` }), P))).toBe("ok");
    expect(result(checkLocal(post({ host: `${h}:${P}`, origin: `http://${h}:${P}` }), P))).toBe("ok");
  });

  it.each([
    ["wrong port", `127.0.0.1:${P + 1}`],
    ["no port", "127.0.0.1"],
    ["foreign host", `evil.example:${P}`],
    ["rebinding name", `attacker.localhost.evil:${P}`],
    ["LAN address", `192.168.1.10:${P}`],
    ["0.0.0.0", `0.0.0.0:${P}`],
  ])("%s -> 403", (_n, host) => {
    expect(result(checkLocal(req("GET", { host }), P))).toBe("403 FORBIDDEN_ORIGIN");
    expect(result(checkLocal(post({ host, origin: `http://${host}` }), P))).toBe("403 FORBIDDEN_ORIGIN");
  });

  it("missing Host -> 403", () => {
    expect(result(checkLocal(req("GET", {}), P))).toBe("403 FORBIDDEN_ORIGIN");
    expect(result(checkLocal(post({ host: null }), P))).toBe("403 FORBIDDEN_ORIGIN");
  });

  it("GET needs no Origin (same-origin GETs often omit it)", () => {
    expect(result(checkLocal(req("GET", { host: `localhost:${P}` }), P))).toBe("ok");
  });
});

describe("Origin and Sec-Fetch-Site (POST)", () => {
  it.each([
    ["missing", { origin: null }],
    ["null", { origin: "null" }],
    ["different origin", { origin: "http://evil.example" }],
    ["https scheme", { origin: `https://127.0.0.1:${P}` }],
    ["other loopback name", { origin: `http://localhost:${P}` }],
    ["other port", { origin: `http://127.0.0.1:${P + 1}` }],
    ["matching origin but Sec-Fetch-Site cross-site", { "sec-fetch-site": "cross-site" }],
    ["matching origin but Sec-Fetch-Site same-site", { "sec-fetch-site": "same-site" }],
    ["matching origin but Sec-Fetch-Site none", { "sec-fetch-site": "none" }],
  ])("%s -> 403", (_n, over) => {
    expect(result(checkLocal(post(over), P))).toBe("403 FORBIDDEN_ORIGIN");
  });

  it("matching origin with Sec-Fetch-Site same-origin, or without it, is accepted", () => {
    expect(result(checkLocal(post({ "sec-fetch-site": "same-origin" }), P))).toBe("ok");
    expect(result(checkLocal(post(), P))).toBe("ok");
  });
});

describe("Content-Type and size (POST)", () => {
  it.each([
    ["application/json", "ok"],
    ["application/json; charset=utf-8", "ok"],
    ["Application/JSON", "ok"],
    ["text/plain", "415 UNSUPPORTED_MEDIA_TYPE"],
    ["text/plain;charset=UTF-8", "415 UNSUPPORTED_MEDIA_TYPE"],
    ["multipart/form-data; boundary=x", "415 UNSUPPORTED_MEDIA_TYPE"],
    ["application/x-www-form-urlencoded", "415 UNSUPPORTED_MEDIA_TYPE"],
    ["application/json-patch+json", "415 UNSUPPORTED_MEDIA_TYPE"],
  ])("%s -> %s", (ct, want) => {
    expect(result(checkLocal(post({ "content-type": ct }), P))).toBe(want);
  });

  it("missing Content-Type -> 415", () => {
    expect(result(checkLocal(post({ "content-type": null }), P))).toBe("415 UNSUPPORTED_MEDIA_TYPE");
  });

  it("Content-Length over 16 KiB -> 400; exactly 16 KiB is accepted", () => {
    expect(result(checkLocal(post({ "content-length": String(MAX_BODY_BYTES + 1) }), P))).toBe("400 BAD_REQUEST");
    expect(result(checkLocal(post({ "content-length": String(MAX_BODY_BYTES) }), P))).toBe("ok");
    expect(result(checkLocal(post({ "content-length": "abc" }), P))).toBe("400 BAD_REQUEST");
  });

  it("the body reader stops after 16 KiB even without Content-Length", async () => {
    const big = new Request("http://127.0.0.1/", { method: "POST", body: "x".repeat(MAX_BODY_BYTES + 1) });
    expect(await readBodyLimited(big)).toBeNull();
    const ok = new Request("http://127.0.0.1/", { method: "POST", body: "y".repeat(MAX_BODY_BYTES) });
    expect(await readBodyLimited(ok)).toBe("y".repeat(MAX_BODY_BYTES));
  });

  it("mediaType strips parameters and lower-cases", () => {
    expect(mediaType(" Application/Json ; charset=utf-8")).toBe("application/json");
    expect(mediaType(null)).toBe("");
  });
});
