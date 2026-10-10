/**
 * Request gate for every route (adr-0023: the portal is read-only and local-only). proxy.ts calls this
 * for each request (pages and /_next assets alike):
 * - Host allowlist: a DNS-rebinding page whose Host header is not `127.0.0.1:<port>`,
 *   `localhost:<port>` or `[::1]:<port>` cannot read the plan through the portal (403).
 * - Reads only: any method other than GET and HEAD is refused with 405. The portal has no write route
 *   (the approvals POST API of v1 was removed in p0.17) and no server actions.
 * Returns the refusal, or null when the request may continue. Pure apart from building a Response,
 * so unit tests call it directly.
 */
import { securityHeaders } from "./policy";

export const allowedHosts = (port: number): string[] => [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
export const ALLOWED_METHODS = ["GET", "HEAD"] as const;

/** True when the Host header names this machine's loopback interface on the portal's port. */
export function isAllowedHost(host: string | null, port: number): boolean {
  return host !== null && allowedHosts(port).includes(host.toLowerCase());
}

function refuse(status: number, code: string, message: string, isDev: boolean, extra: Record<string, string> = {}): Response {
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", ...extra });
  for (const h of securityHeaders(isDev)) headers.set(h.key, h.value);
  return new Response(`${status} ${code}: ${message}\n`, { status, headers });
}

export function hostGate(req: Pick<Request, "url" | "headers"> & { method?: string }, port: number, isDev = false): Response | null {
  const host = req.headers.get("host");
  if (!isAllowedHost(host, port)) return refuse(403, "FORBIDDEN_ORIGIN", `Host ${JSON.stringify(host)} is not a loopback host on port ${port}`, isDev);
  const method = (req.method ?? "GET").toUpperCase();
  if (!(ALLOWED_METHODS as readonly string[]).includes(method)) {
    return refuse(405, "READ_ONLY", `the portal only reads; ${method} is not accepted`, isDev, { Allow: ALLOWED_METHODS.join(", ") });
  }
  return null;
}
