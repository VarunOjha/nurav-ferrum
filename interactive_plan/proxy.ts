// Next 16 proxy (formerly middleware): the loopback Host allowlist on every route, not only on
// /api/approvals (ip-approvals-api §3; DNS rebinding). No matcher: it runs for pages, /_next assets
// and the API alike. The port is PLAN_PORT (lib/config.ts), the same one the server binds.
import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { hostGate } from "@/lib/security/hostGate";

export function proxy(request: NextRequest) {
  return hostGate(request, getConfig().port, process.env.NODE_ENV === "development") ?? NextResponse.next();
}
