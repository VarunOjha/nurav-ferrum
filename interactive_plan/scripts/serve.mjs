// Loopback launcher for the plan app (ip-spec §6, ip-approvals-api §3.1). Usage:
//   node scripts/serve.mjs dev|start [extra next args ...]
// Runs `next dev|start -H 127.0.0.1 -p <PLAN_PORT>` with this node, inheriting stdio and env.
// PLAN_PORT is read exactly as lib/config.ts reads it (digits only, default 3417), so the port the
// server binds is always the port the Host/Origin guard expects. -H/-p cannot be overridden.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_PORT = 3417;
export const HOST = "127.0.0.1";

/**
 * Same rule as getConfig() in lib/config.ts.
 * @param {Record<string, string | undefined>} [env]
 * @returns {number}
 */
export function planPort(env = process.env) {
  const raw = env.PLAN_PORT?.trim();
  return raw && /^[0-9]+$/.test(raw) ? Number(raw) : DEFAULT_PORT;
}

/**
 * Arguments for the next bin; refuses caller-supplied host/port flags.
 * @param {string | undefined} mode
 * @param {string[]} [extra]
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function nextArgs(mode, extra = [], env = process.env) {
  if (mode !== "dev" && mode !== "start") throw new Error(`serve: mode must be dev or start, got ${mode}`);
  const bad = extra.find((a) => /^(-H|-p|--hostname|--port)(=|$)/.test(a));
  if (bad) throw new Error(`serve: ${bad} is not allowed; the app always binds ${HOST} and PLAN_PORT`);
  return [mode, "-H", HOST, "-p", String(planPort(env)), ...extra];
}

function main() {
  const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [mode, ...extra] = process.argv.slice(2);
  let args;
  try {
    args = nextArgs(mode, extra);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const pkgDir = path.join(appDir, "node_modules", "next");
  const pkg = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.next;
  console.log(`plan app: next ${args.join(" ")} (http://${HOST}:${planPort()}/)`);
  const r = spawnSync(process.execPath, [path.join(pkgDir, rel), ...args], { stdio: "inherit", cwd: appDir });
  if (r.error) {
    console.error(`serve: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
