// Guard (ip-testing §3): the real plan/approvals.json, wiki/log.md and STATUS.md must be unchanged
// (same mtime and sha256) after the E2E run; otherwise the run fails. Then the temp fixture copy is
// removed (PLAN_E2E_KEEP=1 keeps it for debugging).
import { rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fingerprint } from "./setup-env";

export default async function globalTeardown(): Promise<void> {
  const guard = JSON.parse(process.env.PLAN_E2E_GUARD ?? "[]") as [string, string][];
  const changed = guard.filter(([p, before]) => fingerprint(p) !== before).map(([p]) => p);
  const root = process.env.PLAN_E2E_ROOT;
  if (root && process.env.PLAN_E2E_KEEP !== "1" && path.resolve(root).startsWith(path.join(os.tmpdir(), "ferrum plan e2e"))) {
    rmSync(root, { recursive: true, force: true });
  }
  if (guard.length === 0) throw new Error("E2E guard: no fingerprints were recorded");
  if (changed.length) throw new Error(`E2E guard: real files changed during the run: ${changed.join(", ")}`);
  console.log(`E2E guard: ${guard.length} real files unchanged (${guard.map(([p, f]) => `${path.basename(p)} ${f === "absent" ? "absent" : "same mtime+sha256"}`).join(", ")})`);
}
