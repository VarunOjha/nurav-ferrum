// Next 16 proxy (formerly middleware): on every route, the loopback Host allowlist (DNS rebinding)
// and reads only (GET and HEAD; the portal is read-only, adr-0023). No matcher: it runs for pages and
// /_next assets alike. The port is PLAN_PORT (lib/config.ts), the same one the server binds.
import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { hostGate } from "@/lib/security/hostGate";

export function proxy(request: NextRequest) {
  return hostGate(request, getConfig().port, process.env.NODE_ENV === "development") ?? NextResponse.next();
}
