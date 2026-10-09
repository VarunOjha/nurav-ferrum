// Wiki lint over the REAL wiki (ip-wiki-lint §1; `npm run lint:wiki`, `npm run lint:wiki:json`).
// Prints the report (one finding per line, then the summary line), writes the JSON report when
// WIKI_LINT_JSON=1 (to WIKI_LINT_OUT, relative to interactive_plan/, default .lint/wiki-lint.json),
// and fails on any error (WIKI_LINT_STRICT=1: also on warnings). Inputs: PLAN_WIKI_DIR,
// PLAN_STATUS_FILE, PLAN_DATA_DIR, PLAN_REPO_ROOT (ip-spec §6). Read-only: it proves that
// approvals.json, SCHEMA.md, STATUS.md, index.md and log.md were not touched.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getConfig } from "@/lib/config";
import { buildLintContext, describeGit } from "@/lib/lint/context";
import { formatFinding, formatReport, runLint, toJson } from "@/lib/lint/run";
import type { LintContext, LintReport } from "@/lib/lint/types";
import { APP_DIR } from "../unit/helpers";

const cfg = getConfig(process.env, APP_DIR);
const watched = [cfg.approvalsFile, path.join(cfg.wikiDir, "SCHEMA.md"), cfg.statusFile, path.join(cfg.wikiDir, "index.md"), path.join(cfg.wikiDir, "log.md")];
const fingerprint = (p: string) =>
  existsSync(p) ? `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}` : "absent";

let ctx: LintContext;
let report: LintReport;
let before: string[];

beforeAll(async () => {
  before = watched.map(fingerprint);
  ctx = await buildLintContext(cfg);
  report = runLint(ctx);
});

afterAll(() => {
  expect(watched.map(fingerprint)).toEqual(before);
});

describe("wiki lint (real wiki, read-only)", () => {
  it("runs every rule and prints the report", () => {
    const rel = (p: string) => path.relative(cfg.repoRoot, p).split(path.sep).join("/") || ".";
    console.log(
      [
        `wiki lint: wiki ${rel(cfg.wikiDir)}, status ${rel(cfg.statusFile)}, approvals ${ctx.approvalsPath} (${ctx.approvals.exists ? (ctx.approvals.valid ? "valid" : "INVALID") : "absent"}), git ${describeGit(ctx.git)}, today ${ctx.today}`,
        formatReport(report),
      ].join("\n"),
    );
    if (process.env.WIKI_LINT_JSON === "1") {
      const out = path.resolve(APP_DIR, process.env.WIKI_LINT_OUT?.trim() || path.join(".lint", "wiki-lint.json"));
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(
        out,
        toJson(report, {
          generated_at: new Date().toISOString(),
          today: ctx.today,
          wiki_dir: rel(cfg.wikiDir),
          repo_root: path.basename(cfg.repoRoot),
          git: describeGit(ctx.git),
          approvals_file: { path: ctx.approvalsPath, exists: ctx.approvals.exists, valid: ctx.approvals.valid },
          node: process.version,
        }),
      );
      console.log(`JSON report written to ${path.relative(APP_DIR, out).split(path.sep).join("/")}`);
    }
    expect(report.summary.pages).toBeGreaterThan(100);
  });

  it("reports zero errors", () => {
    expect(report.findings.filter((f) => f.severity === "error").map(formatFinding)).toEqual([]);
  });

  it.runIf(process.env.WIKI_LINT_STRICT === "1")("reports zero warnings (WIKI_LINT_STRICT=1)", () => {
    expect(report.findings.filter((f) => f.severity === "warn").map(formatFinding)).toEqual([]);
  });
});
