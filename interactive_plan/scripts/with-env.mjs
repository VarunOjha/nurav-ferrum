// Cross-platform env shim (ip-wiki-lint §1: no cross-env dependency). Usage:
//   node scripts/with-env.mjs NAME=value [NAME=value ...] -- <package-bin> [args ...]
// Sets the variables and runs the bin of a locally installed package (resolved from its
// package.json "bin" field) with this node, inheriting stdio; exits with the child's exit code.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
if (sep < 1 || sep === argv.length - 1) {
  console.error("usage: node scripts/with-env.mjs NAME=value [...] -- <package-bin> [args ...]");
  process.exit(2);
}
const env = { ...process.env };
for (const kv of argv.slice(0, sep)) {
  const eq = kv.indexOf("=");
  if (eq < 1) {
    console.error(`with-env: not NAME=value: ${kv}`);
    process.exit(2);
  }
  env[kv.slice(0, eq)] = kv.slice(eq + 1);
}
const [bin, ...args] = argv.slice(sep + 1);
const pkgDir = path.join(appDir, "node_modules", bin);
const pkg = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[bin];
if (!rel) {
  console.error(`with-env: package ${bin} has no bin named ${bin}`);
  process.exit(2);
}
const r = spawnSync(process.execPath, [path.join(pkgDir, rel), ...args], { stdio: "inherit", env, cwd: appDir });
if (r.error) {
  console.error(`with-env: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
