// Shared E2E helpers. The browser tests run the production build against the REAL plan/ folder: the
// portal only reads (adr-0023), and global-teardown.ts fails the run if any guarded real file changed.
// Tests read the same JSON the portal reads to know what to expect, so they do not break when Claude
// rewrites the portal text.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

export const PORT = 3418;
export const APP_DIR = path.resolve(__dirname, "..", "..");
export const REPO_ROOT = path.resolve(APP_DIR, "..");
export const PORTAL_DIR = path.join(REPO_ROOT, "plan", "portal");

/** Real files that must be byte-identical (and keep their mtime) after the run. */
export function guardedFiles(): string[] {
  const out = [path.join(REPO_ROOT, "plan", "approvals.json"), path.join(REPO_ROOT, "wiki", "log.md"), path.join(REPO_ROOT, "STATUS.md")];
  for (const f of readdirSync(PORTAL_DIR)) if (f.endsWith(".json")) out.push(path.join(PORTAL_DIR, f));
  for (const f of readdirSync(path.join(PORTAL_DIR, "phases"))) if (f.endsWith(".json")) out.push(path.join(PORTAL_DIR, "phases", f));
  return out;
}

export function fingerprint(p: string): string {
  if (!existsSync(p)) return "absent";
  return `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}`;
}

/** Records the guard fingerprints once, in the Playwright main process (workers inherit the env). */
export function recordGuard(): void {
  if (process.env.PLAN_E2E_GUARD) return;
  process.env.PLAN_E2E_GUARD = JSON.stringify(guardedFiles().map((p) => [p, fingerprint(p)]));
}

/** One portal JSON file, parsed (relative to plan/portal/). */
export function portalJson<T = Record<string, unknown>>(rel: string): T {
  return JSON.parse(readFileSync(path.join(PORTAL_DIR, rel), "utf8").replace(/^﻿/, "")) as T;
}

export interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** One HTTP request to 127.0.0.1:<port> with exactly these headers (Host included). */
export function raw(port: number, method: string, urlPath: string, headers: Record<string, string>, body?: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h["Content-Length"] = String(Buffer.byteLength(body));
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers: h, setHost: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}
