// p0.11 verify (phase-p0-planning): "an integration test loading the real wiki/ reports zero FM-*
// errors". Read-only: it also proves that plan/approvals.json and the wiki files were not touched.
// Runs under `npm run lint:wiki` (vitest.lint.config.mts) and so in `npm run verify`, not under
// `npm test`: unit tests must not depend on wiki content (owner answer 2026-10-09, wave 0c item 3).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LintFinding } from "@/lib/wiki/findings";
import { checkLinks } from "@/lib/wiki/links";
import { clearWikiCache, linkTargetInfo, loadWiki, type WikiIndex } from "@/lib/wiki/load";
import { sourcePath } from "@/lib/wiki/schemas";
import { REAL_STATUS, REAL_WIKI, REPO_ROOT } from "../unit/helpers";

const APPROVALS = path.join(REPO_ROOT, "plan", "approvals.json");
const fingerprint = (p: string) =>
  existsSync(p) ? `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}` : "absent";

let idx: WikiIndex;
let before: { approvals: string; schema: string; status: string };
const fmt = (f: LintFinding) => `${f.severity.toUpperCase()} ${f.code} ${f.path}${f.line ? ":" + f.line : ""}  ${f.message}`;

beforeAll(async () => {
  before = {
    approvals: fingerprint(APPROVALS),
    schema: fingerprint(path.join(REAL_WIKI, "SCHEMA.md")),
    status: fingerprint(REAL_STATUS),
  };
  clearWikiCache();
  idx = await loadWiki({ wikiDir: REAL_WIKI, statusFile: REAL_STATUS, repoRoot: REPO_ROOT });
});

afterAll(() => {
  // The loader only reads: the real approvals file, SCHEMA.md and STATUS.md are unchanged.
  expect(fingerprint(APPROVALS)).toBe(before.approvals);
  expect(fingerprint(path.join(REAL_WIKI, "SCHEMA.md"))).toBe(before.schema);
  expect(fingerprint(REAL_STATUS)).toBe(before.status);
});

describe("real wiki/ (integration, read-only)", () => {
  it("loads every page and reports zero FM-* errors", () => {
    const all = idx.pages.flatMap((p) => p.findings);
    const fm = all.filter((f) => f.code.startsWith("FM-") && f.severity === "error");
    const summary = new Map<string, number>();
    for (const f of all) summary.set(`${f.severity} ${f.code}`, (summary.get(`${f.severity} ${f.code}`) ?? 0) + 1);
    console.log(
      `real wiki: ${idx.pages.length} files loaded (${idx.byId.size} ids), ${idx.log.length} log entries, ` +
        `${idx.openQuestions.length} open-question sections; loader findings by code: ` +
        (JSON.stringify(Object.fromEntries(summary)) || "{}"),
    );
    for (const f of all) console.log("  " + fmt(f));
    expect(fm.map(fmt)).toEqual([]);
  });

  it("reports zero other loader errors (FILE-ENCODING, ID-*, LOG-FORMAT, Q-FORMAT)", () => {
    const errs = idx.pages.flatMap((p) => p.findings).filter((f) => f.severity === "error" && !f.code.startsWith("FM-"));
    expect(errs.map(fmt)).toEqual([]);
  });

  it("parses STATUS.md, the log and the open-questions register", () => {
    expect(idx.status?.id).toBe("status-live");
    expect(idx.status?.current_phase).toMatch(/^phase-p[0-8]-/);
    expect(idx.statusNextAction).not.toBeNull();
    expect(idx.log.length).toBeGreaterThan(0);
    expect(idx.openQuestions.length).toBeGreaterThan(0);
    expect(idx.byId.get("schema")?.path).toBe("SCHEMA.md");
  });

  it("every `sources` path entry names an existing wiki file (SCHEMA §5.1, REF-DANGLING)", () => {
    const dangling: string[] = [];
    let checked = 0;
    for (const p of idx.pages) {
      if (p.kind === "raw-research" || p.kind === "raw") continue; // §6.13 exemption; raw files have no sources
      const fm = p.rawFm as { sources?: unknown } | null;
      if (!fm || !Array.isArray(fm.sources)) continue;
      for (const s of fm.sources) {
        const rel = typeof s === "string" ? sourcePath(s) : null;
        if (rel === null) continue;
        checked++;
        if (!existsSync(path.join(REAL_WIKI, ...rel.split("/")))) dangling.push(`${p.repoPath}: ${s}`);
      }
    }
    console.log(`real wiki: ${checked} sources path entries checked`);
    expect(checked).toBeGreaterThan(100);
    expect(dangling).toEqual([]);
  });

  it("the slug algorithm agrees with every heading anchor written in the real wiki", () => {
    const info = linkTargetInfo(idx);
    let anchored = 0;
    const misses: string[] = [];
    for (const p of idx.pages) {
      if (p.kind === "raw") continue;
      for (const f of checkLinks(p.links, p.repoPath, info, p.id ?? undefined)) {
        if (f.message.includes("no heading with anchor")) misses.push(fmt(f));
      }
      anchored += p.links.filter((l) => l.anchor && l.resolvedPath && info.slugs(l.resolvedPath)).length;
    }
    console.log(`real wiki: ${anchored} body links with a heading anchor into a loaded page checked`);
    expect(anchored).toBeGreaterThan(10);
    expect(misses).toEqual([]);
  });

  it("body links to missing files (informational; the REF-DANGLING rule is enforced by lint:wiki, IP-5)", () => {
    const info = linkTargetInfo(idx);
    const missing = idx.pages
      .filter((p) => p.kind !== "raw")
      .flatMap((p) => checkLinks(p.links, p.repoPath, info, p.id ?? undefined))
      .filter((f) => f.message.includes("missing file"));
    console.log(`real wiki: ${missing.length} body links to missing files`);
    for (const f of missing) console.log("  " + fmt(f));
  });
});
