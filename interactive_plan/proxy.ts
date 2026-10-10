// Next 16 proxy (formerly middleware): on every route, the loopback Host allowlist (DNS rebinding)
// and reads only (GET and HEAD; the portal is read-only, adr-0023). No matcher: it runs for pages and
// /_next assets alike. The port is PLAN_PORT (lib/config.ts), the same one the server binds.
// Scope: the guarantee covers the production server (`next start`, which scripts/start-portal.ps1 and
// the browser tests use). Under `next dev` only, Next's own overlay endpoints (/__nextjs_*) answer
// before this proxy runs, so they skip the Host and method checks; Next guards them with its own
// Origin check (observed by the 2026-10-09 review). Owner-facing instructions use the production path.
import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { hostGate } from "@/lib/security/hostGate";

export function proxy(request: NextRequest) {
  return hostGate(request, getConfig().port, process.env.NODE_ENV === "development") ?? NextResponse.next();
}
