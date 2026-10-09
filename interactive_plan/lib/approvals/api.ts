/**
 * Request -> Response adapter for /api/approvals (ip-approvals-api §1-§3). app/api/approvals/route.ts
 * only binds these to the config from the environment; tests call them directly with Request
 * objects and temp directories (ip-testing §1.5).
 */
import type { PlanConfig } from "../config";
import { ApprovalError, envelope } from "./errors";
import { checkLocal, readBodyLimited, MAX_BODY_BYTES } from "./guard";
import { submit, type StoreDeps } from "./store";
import { getView } from "./view";

export type ApiConfig = Pick<
  PlanConfig,
  "wikiDir" | "statusFile" | "repoRoot" | "dataDir" | "approvalsFile" | "appendLog" | "readonly" | "port"
>;

const NO_STORE = { "Cache-Control": "no-store" };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE },
  });

const fail = (e: ApprovalError) => json(e.status, envelope(e));

export async function handleGet(req: Request, cfg: ApiConfig): Promise<Response> {
  const g = checkLocal(req, cfg.port);
  if (!g.ok) return fail(new ApprovalError(g.code, g.message));
  const u = new URL(req.url);
  const view = await getView(cfg, {
    key: u.searchParams.get("key"),
    state: u.searchParams.get("state"),
    phase: u.searchParams.get("phase"),
  });
  return json(200, view);
}

export async function handlePost(req: Request, cfg: ApiConfig, deps: StoreDeps = {}): Promise<Response> {
  // §2.1 step 1: guard; step 2: read-only mode.
  const g = checkLocal(req, cfg.port);
  if (!g.ok) return fail(new ApprovalError(g.code, g.message));
  if (cfg.readonly) return fail(new ApprovalError("READ_ONLY", "PLAN_READONLY=1: approvals are disabled"));
  // Step 3: body (size-limited) and zod validation.
  const text = await readBodyLimited(req);
  if (text === null) return fail(new ApprovalError("BAD_REQUEST", `body larger than ${MAX_BODY_BYTES} bytes`));
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (e) {
    return fail(new ApprovalError("BAD_REQUEST", `body is not valid JSON: ${(e as Error).message}`));
  }
  try {
    const r = await submit(body, cfg, deps);
    const out: Record<string, unknown> = { item: r.item };
    if (cfg.appendLog) out.log_appended = r.log_appended;
    if (r.warnings.length) out.warnings = r.warnings;
    return json(200, out);
  } catch (e) {
    if (e instanceof ApprovalError) return fail(e);
    console.error("[approvals] unexpected error", e);
    return fail(new ApprovalError("WRITE_FAILED", `unexpected error: ${String(e)}`));
  }
}
