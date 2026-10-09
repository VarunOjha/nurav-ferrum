// GET/POST /api/approvals (ip-approvals-api). The only write path of the app; a thin adapter over
// lib/approvals/api.ts. No other methods, no OPTIONS handler and no CORS headers (§2.2, §3).
import { handleGet, handlePost } from "@/lib/approvals/api";
import { getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request): Promise<Response> {
  return handleGet(req, getConfig());
}

export function POST(req: Request): Promise<Response> {
  return handlePost(req, getConfig());
}
