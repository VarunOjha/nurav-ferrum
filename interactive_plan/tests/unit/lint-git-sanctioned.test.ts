// RAW-IMMUTABLE sanctioned masking edits (SCHEMA §3.1, adr-0027): tools/raw-sanctioned-edits.tsv lists
// the content hashes a raw file may have after a sanctioned edit. collectGit must skip exactly those
// modifications (history and working tree) and the matching MANIFEST.sha256 hash replacements, and keep
// reporting everything else. Fake exec only; never touches the real repo.
import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectGit, isSanctionedManifestChange, manifestHash, parseSanctions, type GitExec } from "@/lib/lint/git";

const ROOT = path.resolve("C:/repo");
const LOG_DATES = "log --format=%x00%cs --name-only -- wiki STATUS.md";
const LOG_RAW = "log -M --format=%x00%H --name-status --diff-filter=MRD -- wiki/raw";
const STATUS = "status --porcelain=v1 --untracked-files=no -- wiki/raw";

const MASKED = Buffer.from("RUN <USERPROFILE>/x\n");
const H_MASKED = manifestHash(MASKED);
const H_OTHER = manifestHash(Buffer.from("something else\n"));
const H_OLD = "a".repeat(64);
const TSV = `# comment\n${H_MASKED}\tevidence/e.txt\traw/owner/x.md (masking, adr-0027)\nnot a line\n`;

function fakeGit(map: Record<string, { ok?: boolean; stdout?: string }>): GitExec {
  return async (args) => {
    const key = args.filter((a) => a !== "-c" && a !== "core.quotePath=false").join(" ");
    const r = map[key];
    return r ? { ok: r.ok ?? true, stdout: r.stdout ?? "", stderr: "" } : { ok: false, stdout: "", stderr: `unexpected: ${key}` };
  };
}

describe("parseSanctions", () => {
  it("reads hash TAB path TAB authority lines and skips comments and malformed lines", () => {
    const s = parseSanctions(TSV);
    expect([...s.keys()]).toEqual(["evidence/e.txt"]);
    expect(s.get("evidence/e.txt")?.has(H_MASKED)).toBe(true);
    expect(parseSanctions(null).size).toBe(0);
  });
});

describe("isSanctionedManifestChange", () => {
  const s = parseSanctions(TSV);
  const base = `${H_OLD}  evidence/e.txt\n${H_OLD}  owner/o.md\n`;
  it("accepts a hash replaced by a sanctioned hash on the same path, plus appended lines", () => {
    expect(isSanctionedManifestChange(base, `${H_MASKED}  evidence/e.txt\n${H_OLD}  owner/o.md\n${H_OLD}  owner/new.md\n`, s)).toBe(true);
    expect(isSanctionedManifestChange(base, base.replace(/\n/g, "\r\n"), s)).toBe(true);
  });
  it("rejects unlisted hashes, other paths, removed or reordered lines", () => {
    expect(isSanctionedManifestChange(base, `${H_OTHER}  evidence/e.txt\n${H_OLD}  owner/o.md\n`, s)).toBe(false);
    expect(isSanctionedManifestChange(base, `${H_OLD}  evidence/e.txt\n${H_MASKED}  owner/o.md\n`, s)).toBe(false);
    expect(isSanctionedManifestChange(base, `${H_MASKED}  evidence/e.txt\n`, s)).toBe(false);
    expect(isSanctionedManifestChange(base, `${H_OLD}  owner/o.md\n${H_MASKED}  evidence/e.txt\n`, s)).toBe(false);
  });
});

describe("collectGit with sanctioned edits", () => {
  const base = {
    "rev-parse --show-toplevel": { stdout: ROOT.split(path.sep).join("/") + "\n" },
    "rev-parse --verify -q HEAD": { stdout: "abc\n" },
    [LOG_DATES]: { stdout: "" },
  };
  const readFile = (abs: string) => (abs.endsWith("raw-sanctioned-edits.tsv") ? TSV : null);

  it("skips a committed and an uncommitted sanctioned edit and its manifest line; reports the rest", async () => {
    const exec = fakeGit({
      ...base,
      [LOG_RAW]: { stdout: "\x00c2\n\nM\twiki/raw/MANIFEST.sha256\nM\twiki/raw/evidence/e.txt\nM\twiki/raw/evidence/f.txt\n\x00c1\n\nM\twiki/raw/evidence/e.txt\n" },
      "show c2^:wiki/raw/MANIFEST.sha256": { stdout: `${H_OLD}  evidence/e.txt\n` },
      "show c2:wiki/raw/MANIFEST.sha256": { stdout: `${H_MASKED}  evidence/e.txt\n` },
      [STATUS]: { stdout: " M wiki/raw/evidence/e.txt\n M wiki/raw/evidence/g.txt\n" },
    });
    const showBytes = async (spec: string) => (spec === "c2:wiki/raw/evidence/e.txt" ? MASKED : Buffer.from("old content\n"));
    const g = await collectGit(ROOT, { exec, readFile, showBytes, readBytes: () => MASKED });
    expect(g.kind).toBe("ok");
    if (g.kind !== "ok") return;
    // c2 e.txt: sanctioned; c2 f.txt: not listed; c1 e.txt: content hash not listed -> reported.
    expect(g.facts.rawHistoryChanges).toEqual([
      { commit: "c2", status: "M", path: "wiki/raw/evidence/f.txt" },
      { commit: "c1", status: "M", path: "wiki/raw/evidence/e.txt" },
    ]);
    expect(g.facts.rawWorkingChanges).toEqual([{ status: "M", path: "wiki/raw/evidence/g.txt" }]);
  });

  it("an uncommitted edit of a listed path with an unlisted hash is still reported", async () => {
    const exec = fakeGit({ ...base, [LOG_RAW]: { stdout: "" }, [STATUS]: { stdout: " M wiki/raw/evidence/e.txt\n" } });
    const g = await collectGit(ROOT, { exec, readFile, readBytes: () => Buffer.from("tampered\n") });
    expect(g.kind === "ok" && g.facts.rawWorkingChanges).toEqual([{ status: "M", path: "wiki/raw/evidence/e.txt" }]);
  });
});
