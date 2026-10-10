/**
 * Git facts for the git-backed rules (ip-wiki-lint §3). The only lint code that spawns a process:
 * `git` through execFile with fixed argument lists, cwd = repo root. Used by the lint CLI (vitest
 * runner), never inside the web server's request path. Every call is read-only.
 *
 * Batched instead of one process per file: one `git log --name-only` gives the last commit date of
 * every path, one `git log --diff-filter=MRD --name-status` gives every modification, rename or
 * deletion under wiki/raw/ (equivalent to the per-file `--follow` check for M and D; a rename shows as
 * R on the new path). MANIFEST.sha256 is append-only (SCHEMA §3.1): a change that only adds lines is
 * allowed, anything else is reported.
 *
 * Sanctioned masking edits (SCHEMA §3.1, adr-0027): `tools/raw-sanctioned-edits.tsv` lists
 * `<sha256 of the LF-normalised new content>\t<path under wiki/raw/>\t<authority>`. A modification of a
 * raw file whose resulting content has a listed hash is not reported, and neither is a MANIFEST.sha256
 * change that only replaces the hash on that file's line with a listed hash (plus appended lines).
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { normalizeEol } from "../wiki/frontmatter";
import type { GitFacts, GitState, ManifestCheck } from "./types";

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}
export type GitExec = (args: string[], cwd: string) => Promise<ExecResult>;

export const execGit: GitExec = (args, cwd) =>
  new Promise((resolve) => {
    execFile("git", args, { cwd, maxBuffer: 256 * 1024 * 1024, windowsHide: true, encoding: "utf8" }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") }),
    );
  });

export const MANIFEST_PATH = "wiki/raw/MANIFEST.sha256";
export const SANCTIONS_PATH = "tools/raw-sanctioned-edits.tsv";

/** Sanctioned post-creation hashes per raw path (relative to wiki/raw/). */
export type Sanctions = Map<string, Set<string>>;

/** Parses tools/raw-sanctioned-edits.tsv (`#` comments and blank lines ignored; malformed lines skipped). */
export function parseSanctions(text: string | null): Sanctions {
  const out: Sanctions = new Map();
  for (const line of (text ?? "").split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\t([^\t]+)\t\S/.exec(line);
    if (!m) continue;
    out.set(m[2], (out.get(m[2]) ?? new Set()).add(m[1]));
  }
  return out;
}

/**
 * Is `now` the manifest `base` with some lines' hashes replaced by sanctioned hashes for the same path,
 * plus zero or more appended lines? (LF-normalised; every other change is reported.)
 */
export function isSanctionedManifestChange(base: string, now: string, sanctions: Sanctions): boolean {
  const n = (s: string) => normalizeEol(Buffer.from(s, "utf8")).toString("utf8");
  const a = n(base);
  const b = n(now);
  if (a !== "" && !a.endsWith("\n")) return false;
  const al = a.split("\n").slice(0, -1);
  const bl = b.split("\n");
  if (bl[bl.length - 1] === "") bl.pop();
  if (bl.length < al.length) return false;
  const re = /^([0-9a-f]{64}) {2}(\S.*)$/;
  return al.every((line, i) => {
    if (line === bl[i]) return true;
    const x = re.exec(line);
    const y = re.exec(bl[i]);
    return !!x && !!y && x[2] === y[2] && (sanctions.get(y[2])?.has(y[1]) ?? false);
  });
}

const execGitBytes = (spec: string, cwd: string): Promise<Buffer | null> =>
  new Promise((resolve) => {
    execFile("git", ["show", spec], { cwd, maxBuffer: 256 * 1024 * 1024, windowsHide: true, encoding: "buffer" }, (err, stdout) =>
      resolve(err ? null : (stdout as Buffer)),
    );
  });
const posix = (p: string) => p.split(path.sep).join("/");
/** Same directory? Resolves symlinks and Windows 8.3 short names (os.tmpdir() may return an 8.3 short name such as `C:\Users\ABCDEF~1`). */
function samePath(a: string, b: string): boolean {
  const real = (p: string) => {
    try {
      return realpathSync.native(path.resolve(p));
    } catch {
      return path.resolve(p);
    }
  };
  const [x, y] = [real(a), real(b)];
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

/** Is `appended` the text of `base` plus zero or more extra lines (after LF normalisation)? */
export function isAppendOnly(base: string, appended: string): boolean {
  const n = (s: string) => normalizeEol(Buffer.from(s, "utf8")).toString("utf8");
  const a = n(base);
  const b = n(appended);
  return b.startsWith(a) && (a === "" || a.endsWith("\n"));
}

/** Parses `git log --format=%x00<x> --name-only|--name-status` output into commits with their file lines. */
function commits(stdout: string): { head: string; files: string[] }[] {
  const out: { head: string; files: string[] }[] = [];
  for (const chunk of stdout.split("\0").slice(1)) {
    const lines = chunk.split("\n");
    out.push({ head: lines[0].trim(), files: lines.slice(1).map((l) => l.replace(/\r$/, "")).filter((l) => l.trim() !== "") });
  }
  return out;
}

/**
 * Collects the git facts for the wiki of `repoRoot`. `kind: "unavailable"` when git is missing, the
 * directory is not a work tree, or the repo root is not the git top level (fixture wikis inside this
 * repo must never be judged by the repo's history).
 */
export async function collectGit(
  repoRoot: string,
  opts: {
    exec?: GitExec;
    readFile?: (abs: string) => string | null;
    readBytes?: (abs: string) => Buffer | null;
    showBytes?: (spec: string, cwd: string) => Promise<Buffer | null>;
  } = {},
): Promise<GitState> {
  const exec = opts.exec ?? execGit;
  const read = opts.readFile ?? ((abs: string) => (existsSync(abs) ? readFileSync(abs, "utf8") : null));
  const readBytes = opts.readBytes ?? ((abs: string) => (existsSync(abs) ? readFileSync(abs) : null));
  const showBytes = opts.showBytes ?? execGitBytes;
  const sanctions = parseSanctions(read(path.join(repoRoot, ...SANCTIONS_PATH.split("/"))));
  const rawRel = (p: string) => p.replace(/^wiki\/raw\//, "");
  const sanctioned = (p: string, bytes: Buffer | null) => bytes !== null && (sanctions.get(rawRel(p))?.has(manifestHash(bytes)) ?? false);
  const top = await exec(["rev-parse", "--show-toplevel"], repoRoot);
  if (!top.ok) return { kind: "unavailable", reason: `git rev-parse failed (${top.stderr.trim() || "git missing or not a repository"})` };
  if (!samePath(top.stdout.trim(), repoRoot)) {
    return { kind: "unavailable", reason: `the repo root ${posix(repoRoot)} is not the git top level ${top.stdout.trim()}` };
  }
  const head = await exec(["rev-parse", "--verify", "-q", "HEAD"], repoRoot);
  if (!head.ok) return { kind: "no-commits" };

  const facts: GitFacts = { lastCommitDate: new Map(), rawHistoryChanges: [], rawWorkingChanges: [] };
  const q = ["-c", "core.quotePath=false"];

  const dates = await exec([...q, "log", "--format=%x00%cs", "--name-only", "--", "wiki", "STATUS.md"], repoRoot);
  if (!dates.ok) return { kind: "unavailable", reason: `git log failed: ${dates.stderr.trim()}` };
  for (const c of commits(dates.stdout)) for (const f of c.files) if (!facts.lastCommitDate.has(f)) facts.lastCommitDate.set(f, c.head);

  const hist = await exec([...q, "log", "-M", "--format=%x00%H", "--name-status", "--diff-filter=MRD", "--", "wiki/raw"], repoRoot);
  if (!hist.ok) return { kind: "unavailable", reason: `git log failed: ${hist.stderr.trim()}` };
  for (const c of commits(hist.stdout)) {
    for (const line of c.files) {
      const [status, ...paths] = line.split("\t");
      const p = paths[paths.length - 1];
      if (status === "M" && p === MANIFEST_PATH) {
        const before = await exec(["show", `${c.head}^:${MANIFEST_PATH}`], repoRoot);
        const after = await exec(["show", `${c.head}:${MANIFEST_PATH}`], repoRoot);
        if (before.ok && after.ok && (isAppendOnly(before.stdout, after.stdout) || isSanctionedManifestChange(before.stdout, after.stdout, sanctions))) continue;
        facts.rawHistoryChanges.push({ commit: c.head, status, path: p, detail: "MANIFEST.sha256 changed other than by appending lines" });
        continue;
      }
      if (status === "M" && sanctions.has(rawRel(p)) && sanctioned(p, await showBytes(`${c.head}:${p}`, repoRoot))) continue;
      facts.rawHistoryChanges.push({ commit: c.head, status, path: p, ...(paths.length > 1 ? { detail: `renamed from ${paths[0]}` } : {}) });
    }
  }

  const st = await exec([...q, "status", "--porcelain=v1", "--untracked-files=no", "--", "wiki/raw"], repoRoot);
  if (!st.ok) return { kind: "unavailable", reason: `git status failed: ${st.stderr.trim()}` };
  for (const raw of st.stdout.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.trim() === "") continue;
    const status = line.slice(0, 2).trim();
    const rest = line.slice(3);
    const arrow = rest.indexOf(" -> ");
    const p = arrow >= 0 ? rest.slice(arrow + 4) : rest;
    if (p === MANIFEST_PATH && status === "M") {
      const base = await exec(["show", `HEAD:${MANIFEST_PATH}`], repoRoot);
      const now = read(path.join(repoRoot, ...MANIFEST_PATH.split("/")));
      if (base.ok && now !== null && (isAppendOnly(base.stdout, now) || isSanctionedManifestChange(base.stdout, now, sanctions))) continue;
      facts.rawWorkingChanges.push({ status, path: p, detail: "MANIFEST.sha256 changed other than by appending lines" });
      continue;
    }
    if (status === "M" && sanctions.has(rawRel(p)) && sanctioned(p, readBytes(path.join(repoRoot, ...p.split("/"))))) continue;
    facts.rawWorkingChanges.push({ status, path: p, ...(arrow >= 0 ? { detail: `renamed from ${rest.slice(0, arrow)}` } : {}) });
  }
  return { kind: "ok", facts };
}

/** sha256 hex of LF-normalised bytes (SCHEMA §3.1 manifest hash, §10.2 N). */
export const manifestHash = (bytes: Uint8Array): string => createHash("sha256").update(normalizeEol(bytes)).digest("hex");

/** Reads wiki/raw/MANIFEST.sha256 and hashes every file it names (RAW-IMMUTABLE fallback before any commit). */
export function checkManifest(wikiDir: string): ManifestCheck {
  const file = path.join(wikiDir, "raw", "MANIFEST.sha256");
  if (!existsSync(file)) return { present: false, entries: [], malformed: [] };
  const out: ManifestCheck = { present: true, entries: [], malformed: [] };
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((text, i) => {
      if (text.trim() === "") return;
      const m = /^([0-9a-f]{64}) {2}(\S.*)$/.exec(text);
      if (!m) {
        out.malformed.push({ line: i + 1, text });
        return;
      }
      const abs = path.join(wikiDir, "raw", ...m[2].split("/"));
      out.entries.push({ path: m[2], expected: m[1], actual: existsSync(abs) ? manifestHash(readFileSync(abs)) : null, line: i + 1 });
    });
  return out;
}
