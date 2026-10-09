/**
 * Host allowlist for every route (ip-approvals-api §3, IP-9 review fixes). proxy.ts calls this for
 * each request (pages, /_next assets and /api alike), so a DNS-rebinding page whose Host header is
 * not `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>` cannot read the wiki through the
 * app. Returns the 403 response, or null when the request may continue. Pure apart from building
 * a Response, so unit tests call it directly.
 */
import { envelope, ApprovalError } from "../approvals/errors";
import { checkHost } from "../approvals/guard";
import { securityHeaders } from "./policy";

export function hostGate(req: Pick<Request, "url" | "headers">, port: number, isDev = false): Response | null {
  const g = checkHost(req.headers, port);
  if (g.ok) return null;
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const h of securityHeaders(isDev)) headers.set(h.key, h.value);
  let pathname = "/";
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    // keep "/"
  }
  if (pathname.startsWith("/api/")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(envelope(new ApprovalError(g.code, g.message))), { status: g.status, headers });
  }
  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(`403 ${g.code}: ${g.message}\n`, { status: g.status, headers });
}
