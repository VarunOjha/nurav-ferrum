// GET /api/script?path=scripts/verify/<file>.ps1 - the text of one check script, read-only, for the
// script popup. Only scripts the portal text names are served (lib/portal/scripts.ts); everything else
// is 404 with a plain message. Other methods are refused by proxy.ts (405) before they get here.
import { getConfig } from "@/lib/config";
import { readNamedScript } from "@/lib/portal/scripts";
import { getNamedScripts } from "@/lib/portal/server";

export const dynamic = "force-dynamic";

const TEXT = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const rel = new URL(request.url).searchParams.get("path") ?? "";
  const r = readNamedScript(getConfig().repoRoot, rel, await getNamedScripts());
  if (r.ok) return new Response(r.text, { status: 200, headers: TEXT });
  const why =
    r.reason === "too-big" ? "This script is too big to show here. Open it in an editor instead." : "This script is not one the portal shows, or it does not exist yet.";
  return new Response(why, { status: 404, headers: TEXT });
}
