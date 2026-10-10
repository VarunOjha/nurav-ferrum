/**
 * Read-only access to the PowerShell check scripts that the portal text names (owner feedback
 * 2026-10-09: "have a script that does that, I will review the script"). The portal shows them so the
 * owner can read each script before running it.
 *
 * Only a script that the portal JSON itself names can be read (a task's or a gate's `script`, or the
 * next action's script). The path must also stay inside <repo>/scripts/, end in .ps1 and be at most
 * MAX_SCRIPT_BYTES long. Anything else is "not available", never an error with file-system details.
 * Nothing here writes.
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import type { PortalFiles } from "./load";

/** Biggest script the portal will show (the largest check script today is about 20 KB). */
export const MAX_SCRIPT_BYTES = 256 * 1024;

/** Same shape rule as the JSON Schema `script_path`, narrowed to the scripts/ folder. */
const SCRIPT_PATH_RX = /^scripts\/(?!.*\.\.)[A-Za-z0-9._/-]+\.ps1$/;

/** Every script path the portal text names, in a stable order. */
export function namedScripts(files: Pick<PortalFiles, "phases" | "overview">): string[] {
  const out = new Set<string>();
  for (const ph of files.phases) {
    for (const t of ph.tasks) if (t.script) out.add(t.script);
    if (ph.test_gate.script) out.add(ph.test_gate.script);
  }
  const next = files.overview?.next_action.script?.path;
  if (next) out.add(next);
  return [...out].filter((p) => SCRIPT_PATH_RX.test(p)).sort();
}

export type ScriptRead = { ok: true; path: string; text: string } | { ok: false; reason: "not-named" | "missing" | "too-big" };

/**
 * Reads one named script. `rel` is a repo-relative path with forward slashes. The real path (links
 * resolved) must still lie inside <repoRoot>/scripts.
 */
export function readNamedScript(repoRoot: string, rel: string, named: readonly string[]): ScriptRead {
  if (!SCRIPT_PATH_RX.test(rel) || !named.includes(rel)) return { ok: false, reason: "not-named" };
  let real: string;
  let scriptsRoot: string;
  try {
    scriptsRoot = realpathSync(path.join(repoRoot, "scripts"));
    real = realpathSync(path.join(repoRoot, ...rel.split("/")));
  } catch {
    return { ok: false, reason: "missing" };
  }
  const inside = path.relative(scriptsRoot, real);
  if (inside === "" || inside.startsWith("..") || path.isAbsolute(inside)) return { ok: false, reason: "not-named" };
  try {
    const st = statSync(real);
    if (!st.isFile()) return { ok: false, reason: "missing" };
    if (st.size > MAX_SCRIPT_BYTES) return { ok: false, reason: "too-big" };
    return { ok: true, path: rel, text: readFileSync(real, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n") };
  } catch {
    return { ok: false, reason: "missing" };
  }
}

/**
 * The plain explanation at the top of a check script: the text inside its first `<# ... #>` block,
 * without the indentation every line shares. Null when the script has no such block.
 */
export function scriptHeader(text: string): string | null {
  const m = /<#([\s\S]*?)#>/.exec(text);
  if (!m) return null;
  // PowerShell help keywords (.SYNOPSIS, .DESCRIPTION) are markup, not explanation.
  const lines = m[1]
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*\.[A-Z]+\s*$/.test(l));
  while (lines.length && lines[0].trim() === "") lines.shift();
  const indents = lines.filter((l) => l.trim() !== "").map((l) => /^ */.exec(l)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  const body = lines.map((l) => l.slice(cut)).join("\n").trim();
  return body === "" ? null : body;
}
