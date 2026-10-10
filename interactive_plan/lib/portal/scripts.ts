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

/** One block of a script header, ready to show without the script's hard line breaks. */
export interface HeaderPart {
  /** "Why", "How to run", ... for a `Label : text` field; null for free text and list items. */
  label: string | null;
  text: string;
  /** Indentation of the block in the header (list items under a heading are indented). */
  indent: number;
}

/** Fields whose continuation lines are separate commands, so their line breaks are kept. */
const KEEP_LINES = new Set(["How to run"]);
const FIELD = /^([A-Z][A-Za-z' ]{0,24}?)\s*:\s+(\S.*)$/;
const LIST = /^(\d+\.|-)\s+/;

/**
 * Splits a scriptHeader() text into fields ("Why : ...") and paragraphs, and joins the lines the
 * script wraps at 110 characters, so a narrow popup can reflow them (the hard breaks plus the column
 * indentation read badly once the browser wraps them again).
 */
export function headerParts(header: string): HeaderPart[] {
  const parts: (HeaderPart & { cont: number })[] = [];
  let cur: (HeaderPart & { cont: number }) | null = null;
  for (const line of header.split("\n")) {
    if (line.trim() === "") {
      cur = null;
      continue;
    }
    const indent = /^ */.exec(line)![0].length;
    const body = line.slice(indent);
    // The first line is the one-line summary (.SYNOPSIS), never a field.
    const field = indent === 0 && parts.length > 0 ? FIELD.exec(body) : null;
    if (field) {
      cur = { label: field[1].trim(), text: field[2].trim(), indent: 0, cont: line.indexOf(field[2]) };
      parts.push(cur);
      continue;
    }
    if (cur && indent >= cur.cont && !LIST.test(body)) {
      cur.text += (cur.label && KEEP_LINES.has(cur.label) ? "\n" : " ") + body.trim();
      continue;
    }
    const marker = LIST.exec(body);
    // A wrapped list item continues under its text; a wrapped paragraph continues at its own indent.
    cur = { label: null, text: body.trim(), indent, cont: indent + (marker ? marker[0].length : 0) };
    parts.push(cur);
  }
  return parts.map(({ label, text, indent }) => ({ label, text, indent }));
}

/** Header fields the phase popup leaves out: the command is shown once above it, and the "For Claude" notes are technical. */
export const OWNER_HIDDEN_FIELDS: ReadonlySet<string> = new Set(["How to run", "For Claude"]);

/**
 * headerParts() without the fields in OWNER_HIDDEN_FIELDS: what the owner reads inline in the phase
 * popup. "For Claude" is the last section of a header, so everything after it (lists of planned
 * commands in draft scripts) is left out too; the full script popup still shows all of it.
 */
export function ownerHeaderParts(header: string): HeaderPart[] {
  const parts = headerParts(header);
  const cut = parts.findIndex((p) => p.label === "For Claude");
  return (cut < 0 ? parts : parts.slice(0, cut)).filter((p) => p.label === null || !OWNER_HIDDEN_FIELDS.has(p.label));
}
