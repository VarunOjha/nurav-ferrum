// Git-backed rules (ip-wiki-lint §3): STALE-UPDATED and RAW-IMMUTABLE. (1) collectGit over an
// injected fake exec (parsing, MANIFEST append rule, unavailable / no-commit states); (2) a real
// temporary git repository (path with a space) with committed and uncommitted raw changes;
// (3) the MANIFEST.sha256 fallback before any commit exists. Never touches the real repo.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildLintContext } from "@/lib/lint/context";
import { checkManifest, collectGit, isAppendOnly, manifestHash, type GitExec } from "@/lib/lint/git";
import { rawImmutable, staleUpdated } from "@/lib/lint/rules/gitRules";
import { runLint } from "@/lib/lint/run";
import type { GitState } from "@/lib/lint/types";
import { clearWikiCache } from "@/lib/wiki/load";
import { realApprovalsFingerprint } from "./approvals-helpers";

const realBefore = realApprovalsFingerprint();
afterAll(() => expect(realApprovalsFingerprint()).toBe(realBefore));

const ROOT = path.resolve("C:/repo");
function fakeGit(map: Record<string, { ok?: boolean; stdout?: string; stderr?: string }>): { exec: GitExec; calls: string[] } {
  const calls: string[] = [];
  const exec: GitExec = async (args) => {
    const key = args.filter((a) => a !== "-c" && a !== "core.quotePath=false").join(" ");
    calls.push(key);
    const r = map[key];
    if (!r) return { ok: false, stdout: "", stderr: `unexpected: ${key}` };
    return { ok: r.ok ?? true, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  };
  return { exec, calls };
}

const LOG_DATES = "log --format=%x00%cs --name-only -- wiki STATUS.md";
const LOG_RAW = "log -M --format=%x00%H --name-status --diff-filter=MRD -- wiki/raw";
const STATUS = "status --porcelain=v1 --untracked-files=no -- wiki/raw";

describe("isAppendOnly", () => {
  it("allows appended lines only (EOL-insensitive)", () => {
    expect(isAppendOnly("a\nb\n", "a\nb\nc\n")).toBe(true);
    expect(isAppendOnly("a\r\nb\r\n", "a\nb\nc\n")).toBe(true);
    expect(isAppendOnly("a\nb\n", "a\nb\n")).toBe(true);
    expect(isAppendOnly("", "a\n")).toBe(true);
    expect(isAppendOnly("a\nb\n", "a\nX\nc\n")).toBe(false);
    expect(isAppendOnly("a\nb", "a\nbc\n")).toBe(false); // the last line itself changed
  });
});

describe("collectGit (fake exec)", () => {
  const base = {
    "rev-parse --show-toplevel": { stdout: ROOT.split(path.sep).join("/") + "\n" },
    "rev-parse --verify -q HEAD": { stdout: "abc\n" },
  };

  it("parses last commit dates (newest first wins), raw history and working-tree changes", async () => {
    const { exec } = fakeGit({
      ...base,
      [LOG_DATES]: { stdout: "\x002026-10-09\n\nwiki/a.md\nSTATUS.md\n\x002026-10-08\n\nwiki/a.md\nwiki/b.md\n" },
      [LOG_RAW]: {
        stdout:
          "\x00c3\n\nM\twiki/raw/MANIFEST.sha256\n\x00c2\n\nM\twiki/raw/x.md\nR100\twiki/raw/old.md\twiki/raw/new.md\nD\twiki/raw/gone.md\n\x00c1\n\nM\twiki/raw/MANIFEST.sha256\n",
      },
      "show c3^:wiki/raw/MANIFEST.sha256": { stdout: "h1  a\n" },
      "show c3:wiki/raw/MANIFEST.sha256": { stdout: "h1  a\nh2  b\n" },
      "show c1^:wiki/raw/MANIFEST.sha256": { stdout: "h0  z\n" },
      "show c1:wiki/raw/MANIFEST.sha256": { stdout: "hX  z\n" },
      [STATUS]: { stdout: " M wiki/raw/y.md\nR  wiki/raw/p.md -> wiki/raw/q.md\n M wiki/raw/MANIFEST.sha256\n" },
      "show HEAD:wiki/raw/MANIFEST.sha256": { stdout: "h1  a\nh2  b\n" },
    });
    const g = await collectGit(ROOT, { exec, readFile: () => "h1  a\r\nh2  b\r\nh3  c\r\n" });
    expect(g.kind).toBe("ok");
    if (g.kind !== "ok") return;
    expect([...g.facts.lastCommitDate]).toEqual([
      ["wiki/a.md", "2026-10-09"],
      ["STATUS.md", "2026-10-09"],
      ["wiki/b.md", "2026-10-08"],
    ]);
    expect(g.facts.rawHistoryChanges).toEqual([
      { commit: "c2", status: "M", path: "wiki/raw/x.md" },
      { commit: "c2", status: "R100", path: "wiki/raw/new.md", detail: "renamed from wiki/raw/old.md" },
      { commit: "c2", status: "D", path: "wiki/raw/gone.md" },
      { commit: "c1", status: "M", path: "wiki/raw/MANIFEST.sha256", detail: "MANIFEST.sha256 changed other than by appending lines" },
    ]);
    expect(g.facts.rawWorkingChanges).toEqual([
      { status: "M", path: "wiki/raw/y.md" },
      { status: "R", path: "wiki/raw/q.md", detail: "renamed from wiki/raw/p.md" },
    ]);
  });

  it("a working-tree MANIFEST change that is not an append is reported", async () => {
    const { exec } = fakeGit({
      ...base,
      [LOG_DATES]: { stdout: "" },
      [LOG_RAW]: { stdout: "" },
      [STATUS]: { stdout: " M wiki/raw/MANIFEST.sha256\n" },
      "show HEAD:wiki/raw/MANIFEST.sha256": { stdout: "h1  a\n" },
    });
    const g = await collectGit(ROOT, { exec, readFile: () => "h9  a\n" });
    expect(g.kind === "ok" && g.facts.rawWorkingChanges).toEqual([
      { status: "M", path: "wiki/raw/MANIFEST.sha256", detail: "MANIFEST.sha256 changed other than by appending lines" },
    ]);
  });

  it("unavailable: git fails, or the repo root is not the top level; no-commits: no HEAD", async () => {
    expect((await collectGit(ROOT, { exec: fakeGit({}).exec })).kind).toBe("unavailable");
    const nested = await collectGit(ROOT, { exec: fakeGit({ "rev-parse --show-toplevel": { stdout: "C:/elsewhere\n" } }).exec });
    expect(nested).toMatchObject({ kind: "unavailable" });
    expect((nested as { reason: string }).reason).toContain("is not the git top level");
    const fresh = fakeGit({ "rev-parse --show-toplevel": base["rev-parse --show-toplevel"], "rev-parse --verify -q HEAD": { ok: false } });
    expect(await collectGit(ROOT, { exec: fresh.exec })).toEqual({ kind: "no-commits" });
  });
});

/** Real git in a temp repo; committer dates pinned so %cs is deterministic. */
describe("git-backed rules on a real temporary repository", () => {
  let root: string;
  const git = (args: string[], date = "2026-10-09T12:00:00") =>
    execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], {
      cwd: root,
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
      encoding: "utf8",
    });
  const page = (id: string, updated: string) =>
    `---\nid: ${id}\ntype: overview\ntitle: "T"\nstatus: draft\nupdated: ${updated}\nsources: []\nrelated: []\napprovable: false\n---\n\n# T\n`;
  const write = (rel: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  };
  const lintIt = async () => {
    clearWikiCache();
    const ctx = await buildLintContext(
      { wikiDir: path.join(root, "wiki"), statusFile: path.join(root, "STATUS.md"), repoRoot: root, approvalsFile: path.join(root, "plan", "approvals.json") },
      { today: "2026-10-10" },
    );
    return { ctx, findings: runLint(ctx, [staleUpdated, rawImmutable]).findings };
  };

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "ip5 git repo "));
    git(["init", "-q", "-b", "main"]);
    write("wiki/overview/ov-old.md", page("ov-old", "2026-10-01"));
    write("wiki/overview/ov-new.md", page("ov-new", "2026-10-09"));
    write("wiki/raw/a.md", "# a\n");
    write("wiki/raw/b.md", "# b\n");
    write("wiki/raw/c.md", "# c\n");
    write("wiki/raw/MANIFEST.sha256", "1".repeat(64) + "  a.md\n");
    git(["add", "-A"]);
    git(["commit", "-q", "-m", "init"], "2026-10-08T12:00:00");
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("clean history: no RAW-IMMUTABLE; STALE-UPDATED warns where updated < last commit date", async () => {
    git(["commit", "-q", "--allow-empty", "-m", "noop"]);
    write("wiki/overview/ov-new.md", page("ov-new", "2026-10-09") + "\nmore\n");
    git(["add", "-A"]);
    git(["commit", "-q", "-m", "edit ov-new"]);
    const { ctx, findings } = await lintIt();
    expect(ctx.git.kind).toBe("ok");
    expect(findings.map((f) => [f.severity, f.code, f.path])).toEqual([
      ["warn", "STALE-UPDATED", "wiki/overview/ov-old.md"],
    ]);
    expect(findings[0].message).toBe("updated 2026-10-01 is older than the last commit of the file (2026-10-08)");
  });

  it("MANIFEST appends are allowed; edits, renames and deletions of raw files are errors; uncommitted ones too", async () => {
    appendFileSync(path.join(root, "wiki/raw/MANIFEST.sha256"), "2".repeat(64) + "  b.md\n");
    git(["add", "-A"]);
    git(["commit", "-q", "-m", "append manifest"]);
    expect((await lintIt()).findings.filter((f) => f.code === "RAW-IMMUTABLE")).toEqual([]);

    write("wiki/raw/a.md", "# a changed\n");
    git(["mv", "wiki/raw/b.md", "wiki/raw/b2.md"]);
    git(["rm", "-q", "wiki/raw/c.md"]);
    git(["add", "-A"]);
    git(["commit", "-q", "-m", "tamper"]);
    write("wiki/raw/b2.md", "# b edited in the working tree\n");
    appendFileSync(path.join(root, "wiki/raw/MANIFEST.sha256"), "3".repeat(64) + "  d.md\n"); // uncommitted append: fine
    const raw = (await lintIt()).findings.filter((f) => f.code === "RAW-IMMUTABLE");
    expect(raw.map((f) => [f.severity, f.path, f.message.replace(/commit [0-9a-f]{7}/, "commit X")])).toEqual([
      ["error", "wiki/raw/a.md", "commit X modified a raw file"],
      ["error", "wiki/raw/b2.md", "commit X renamed a raw file (renamed from wiki/raw/b.md)"],
      ["error", "wiki/raw/b2.md", "uncommitted change (M) to a tracked raw file"],
      ["error", "wiki/raw/c.md", "commit X deleted a raw file"],
    ]);
  });

  it("future `updated` is an error even with git", async () => {
    write("wiki/overview/ov-future.md", page("ov-future", "2026-10-11"));
    const f = (await lintIt()).findings.filter((x) => x.path === "wiki/overview/ov-future.md");
    expect(f.map((x) => [x.severity, x.message])).toEqual([["error", "updated 2026-10-11 is in the future (today 2026-10-10)"]]);
  });
});

describe("RAW-IMMUTABLE manifest fallback (no git history)", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "ip5 manifest "));
    mkdirSync(path.join(dir, "raw", "owner"), { recursive: true });
    writeFileSync(path.join(dir, "raw", "a.md"), "line\r\n"); // CRLF on disk: hashed LF-normalised
    writeFileSync(path.join(dir, "raw", "owner", "b.md"), "b\n");
    writeFileSync(
      path.join(dir, "raw", "MANIFEST.sha256"),
      `${manifestHash(Buffer.from("line\n"))}  a.md\n${"0".repeat(64)}  owner/b.md\n${"1".repeat(64)}  gone.md\nnot a manifest line\n`,
    );
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("reports changed and missing files and malformed lines; info line names the fallback", () => {
    const manifest = checkManifest(dir);
    expect(manifest.entries.map((e) => [e.path, e.actual === null ? "missing" : e.actual === e.expected ? "ok" : "changed"])).toEqual([
      ["a.md", "ok"],
      ["owner/b.md", "changed"],
      ["gone.md", "missing"],
    ]);
    const git: GitState = { kind: "no-commits" };
    const out = rawImmutable.run({ git, manifest } as never);
    expect(out.map((f) => [f.severity, f.path])).toEqual([
      ["error", "wiki/raw/owner/b.md"],
      ["error", "wiki/raw/gone.md"],
      ["error", "wiki/raw/MANIFEST.sha256"],
      ["info", "wiki/raw/"],
    ]);
    expect(checkManifest(path.join(dir, "nowhere"))).toEqual({ present: false, entries: [], malformed: [] });
  });
});
