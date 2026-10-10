// Guard: the portal is read-only (adr-0023). After the E2E run, plan/approvals.json, every
// plan/portal JSON file, wiki/log.md and STATUS.md must be unchanged (same mtime and sha256);
// otherwise the run fails.
import path from "node:path";
import { fingerprint } from "./helpers";

export default async function globalTeardown(): Promise<void> {
  const guard = JSON.parse(process.env.PLAN_E2E_GUARD ?? "[]") as [string, string][];
  if (guard.length === 0) throw new Error("E2E guard: no fingerprints were recorded");
  const changed = guard.filter(([p, before]) => fingerprint(p) !== before).map(([p]) => p);
  if (changed.length) throw new Error(`E2E guard: real files changed during the run: ${changed.join(", ")}`);
  console.log(`E2E guard: ${guard.length} real files unchanged (${guard.filter(([, f]) => f === "absent").map(([p]) => path.basename(p) + " absent").join(", ") || "all present"})`);
}
