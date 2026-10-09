/**
 * Local-only guard (ip-approvals-api §3). Pure: looks only at the request's method and headers.
 *
 * - Host (GET and POST): exactly `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>` (defeats
 *   DNS rebinding). proxy.ts applies the same Host check (checkHost) to every other route too.
 * - Origin (POST): present and equal to `http://` + Host; `Sec-Fetch-Site`, if present, must be
 *   `same-origin` (CSRF).
 * - Content type (POST): `application/json` only (415 otherwise); no CORS preflight is answered.
 * - Body size (POST): at most 16 KiB by Content-Length (400); the body reader enforces it again.
 */
import type { ApprovalErrorCode } from "./errors";

export const MAX_BODY_BYTES = 16 * 1024;

export type GuardResult = { ok: true } | { ok: false; status: number; code: ApprovalErrorCode; message: string };

const deny = (status: number, code: ApprovalErrorCode, message: string): GuardResult => ({
  ok: false,
  status,
  code,
  message,
});

export const allowedHosts = (port: number): string[] => [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];

/** Media type without parameters, lower-cased (`application/json; charset=utf-8` -> `application/json`). */
export const mediaType = (ct: string | null): string => (ct ?? "").split(";")[0].trim().toLowerCase();

/** Host allowlist only (every route, via proxy.ts; DNS rebinding). */
export function checkHost(headers: Pick<Headers, "get">, port: number): GuardResult {
  const host = headers.get("host");
  if (host === null || !allowedHosts(port).includes(host.toLowerCase())) {
    return deny(403, "FORBIDDEN_ORIGIN", `Host ${JSON.stringify(host)} is not a loopback host on port ${port}`);
  }
  return { ok: true };
}

export function checkLocal(req: Pick<Request, "method" | "headers">, port: number): GuardResult {
  const hg = checkHost(req.headers, port);
  if (!hg.ok) return hg;
  const host = req.headers.get("host") as string;
  if (req.method === "GET" || req.method === "HEAD") return { ok: true };

  const origin = req.headers.get("origin");
  if (origin === null) return deny(403, "FORBIDDEN_ORIGIN", "Origin header missing");
  if (origin.toLowerCase() !== `http://${host.toLowerCase()}`) {
    return deny(403, "FORBIDDEN_ORIGIN", `Origin ${JSON.stringify(origin)} does not match http://${host}`);
  }
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs !== null && sfs.toLowerCase() !== "same-origin") {
    return deny(403, "FORBIDDEN_ORIGIN", `Sec-Fetch-Site ${JSON.stringify(sfs)} is not same-origin`);
  }
  if (mediaType(req.headers.get("content-type")) !== "application/json") {
    return deny(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }
  const len = req.headers.get("content-length");
  if (len !== null) {
    if (!/^[0-9]+$/.test(len.trim())) return deny(400, "BAD_REQUEST", "invalid Content-Length");
    if (Number(len) > MAX_BODY_BYTES) return deny(400, "BAD_REQUEST", `body larger than ${MAX_BODY_BYTES} bytes`);
  }
  return { ok: true };
}

/** Reads the body as UTF-8 text, failing once more than `limit` bytes arrive (Content-Length can lie or be absent). */
export async function readBodyLimited(req: Request, limit = MAX_BODY_BYTES): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
