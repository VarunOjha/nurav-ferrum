// Child process for the cross-process store test (ip-testing §1.4). Run with plain `node` (Node 24
// strips TypeScript types); a resolve hook adds the `.ts` extension the lib's relative imports omit.
//
//   node approvals-child.mjs '<json>'   json = { mode, storeUrl, cfg, jobs | readFile, readEveryMs, goFile, doneFile }
//
// writer: waits for goFile, then runs its jobs ({key, status, comment, seen}) one after another
//         through store.submit() and prints one JSON result line.
// reader: waits for goFile, then reads approvalsFile every readEveryMs until doneFile exists, counting
//         reads that fail to parse (a torn write would show up here) and prints one JSON line.
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (e) {
      const relative = specifier.startsWith(".") || specifier.startsWith("file:");
      if (relative && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(specifier + ".ts", context);
      throw e;
    }
  },
});

const arg = JSON.parse(process.argv[2]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

while (!existsSync(arg.goFile)) await sleep(5);

if (arg.mode === "writer") {
  const { submit } = await import(arg.storeUrl);
  const out = { mode: "writer", pid: process.pid, ok: 0, okComments: [], errors: [], renameRetries: 0, retryCodes: {} };
  for (const job of arg.jobs) {
    try {
      const r = await submit(
        { key: job.key, status: job.status, comment: job.comment, seen_content_hash: job.seen },
        arg.cfg,
      );
      out.ok++;
      out.okComments.push(job.comment);
      out.renameRetries += r.rename_attempts - 1;
      out.maxAttempts = Math.max(out.maxAttempts ?? 1, r.rename_attempts);
      for (const code of r.rename_retry_codes) out.retryCodes[code] = (out.retryCodes[code] ?? 0) + 1;
    } catch (e) {
      out.errors.push(e && e.code ? `${e.code}: ${e.message}` : String(e));
    }
  }
  process.stdout.write(JSON.stringify(out) + "\n");
} else {
  const out = { mode: "reader", pid: process.pid, reads: 0, missing: 0, torn: 0, readErrors: [] };
  while (!existsSync(arg.doneFile)) {
    try {
      const text = readFileSync(arg.readFile, "utf8");
      out.reads++;
      try {
        const j = JSON.parse(text);
        if (j.schema_version !== 1 || typeof j.approvals !== "object") out.torn++;
      } catch {
        out.torn++;
      }
    } catch (e) {
      if (e.code === "ENOENT") out.missing++;
      else out.readErrors.push(e.code ?? String(e));
    }
    await sleep(arg.readEveryMs ?? 1);
  }
  process.stdout.write(JSON.stringify(out) + "\n");
}
