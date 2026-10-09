// Golden rule tests (ip-testing §2; ip-wiki-lint §5). broken-wiki: every file whose name carries
// `--CODE[--CODE...]` triggers exactly those codes (errors and warnings), every other file none,
// except the explicitly listed index.md / log.md / ov-open-questions.md findings. mini-wiki: clean.
// The approval-dependent rules run against temp copies with in-memory approvals; nothing here
// reads or writes the real plan/approvals.json (fingerprinted before and after).
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Approvals } from "@/lib/approvals/model";
import { buildLintContext } from "@/lib/lint/context";
import { gateReport } from "@/lib/lint/gateReport";
import { folderLabel, folderOf, INDEX_LINE, rawFileLabel } from "@/lib/lint/rules/indexRule";
import { mermaidNodeCount, NUMBER_UNIT } from "@/lib/lint/rules/integrity";
import { LOADER_CODES } from "@/lib/lint/rules/refs";
import { compareFindings, formatFinding, formatReport, formatSummary, RULES, runLint, toJson } from "@/lib/lint/run";
import type { LintContext, LintReport } from "@/lib/lint/types";
import { localDate, paragraphs } from "@/lib/lint/util";
import { SEVERITY, type LintFinding } from "@/lib/wiki/findings";
import { clearWikiCache, type WikiIndex } from "@/lib/wiki/load";
import { realApprovalsFingerprint, recordFor, tempMiniWiki, type TempWiki } from "./approvals-helpers";
import { BROKEN_WIKI, FIXTURES, MINI_STATUS, MINI_WIKI } from "./helpers";

const TODAY = "2026-10-09";
const NO_APPROVALS = path.join(FIXTURES, "no-plan", "approvals.json");

async function lintFixture(wikiDir: string, statusFile: string): Promise<{ ctx: LintContext; report: LintReport }> {
  clearWikiCache();
  const ctx = await buildLintContext({ wikiDir, statusFile, repoRoot: FIXTURES, approvalsFile: NO_APPROVALS }, { git: false, today: TODAY });
  return { ctx, report: runLint(ctx) };
}

/** Codes encoded in a file name: `<name>--CODE[--CODE...].<ext>`. */
const namedCodes = (p: string) => path.posix.basename(p).replace(/\.[^.]+$/, "").split("--").slice(1).sort();
const codeSet = (fs: LintFinding[]) => [...new Set(fs.map((f) => f.code))].sort();

const realBefore = realApprovalsFingerprint();
afterAll(() => expect(realApprovalsFingerprint()).toBe(realBefore));

describe("rule registry", () => {
  it("every lint code has exactly one rule, and every rule's default severity is the SEVERITY table's", () => {
    const codes = RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort()).toEqual(Object.keys(SEVERITY).sort());
    for (const r of RULES) expect(r.severity, r.code).toBe(SEVERITY[r.code]);
    for (const c of LOADER_CODES) expect(codes).toContain(c);
  });
});

describe("broken-wiki (golden)", () => {
  let ctx: LintContext;
  let report: LintReport;
  beforeAll(async () => {
    ({ ctx, report } = await lintFixture(BROKEN_WIKI, path.join(BROKEN_WIKI, "no-STATUS.md")));
  });
  const at = (p: string) => report.findings.filter((f) => f.path === "wiki/" + p && f.severity !== "info");

  it("each file named --CODE triggers exactly the codes in its name (pages and raw files)", () => {
    const named = [...ctx.idx.files].filter((f) => !f.endsWith("/") && path.posix.basename(f).includes("--"));
    expect(named.length).toBe(52);
    for (const f of named) expect(codeSet(at(f)), f).toEqual(namedCodes(f));
    // every lint code except the ones only reachable through approvals.json or git has a named fixture
    const covered = new Set(named.flatMap(namedCodes));
    const viaApprovalsOrGit = ["APPROVAL-STALE", "APPROVAL-INVALID", "RAW-IMMUTABLE", "SCHEMA-SPLIT", "LOG-FORMAT", "Q-FORMAT", "Q-BLOCK-UNGATED"];
    for (const c of Object.keys(SEVERITY)) if (!viaApprovalsOrGit.includes(c)) expect(covered.has(c), c).toBe(true);
  });

  it("index.md, log.md and ov-open-questions.md give exactly their expected findings", () => {
    expect(at("index.md").map((f) => [f.code, f.line])).toEqual([
      ["INDEX-MISSING", 67],
      ["INDEX-MISSING", 68],
      ["INDEX-MISSING", 69],
    ]);
    expect(at("log.md").map((f) => [f.code, f.line])).toEqual([
      ["LOG-FORMAT", 19],
      ["LOG-FORMAT", 23],
      ["LOG-FORMAT", 30],
    ]);
    expect(at("overview/ov-open-questions.md").map((f) => [f.severity, f.code])).toEqual([
      ["error", "Q-FORMAT"],
      ["error", "Q-FORMAT"],
      ["error", "Q-FORMAT"],
      ["error", "Q-FORMAT"],
      ["warn", "Q-BLOCK-UNGATED"],
    ]);
  });

  it("every other file is clean", () => {
    const special = new Set(["wiki/index.md", "wiki/log.md", "wiki/overview/ov-open-questions.md"]);
    const others = report.findings.filter(
      (f) => f.severity !== "info" && !special.has(f.path) && !path.posix.basename(f.path).includes("--"),
    );
    expect(others.map(formatFinding)).toEqual([]);
  });

  it("finding details: counts, lines and messages of the multi-finding rules", () => {
    const of = (code: string) => report.findings.filter((f) => f.code === code && f.severity !== "info");
    expect(of("PHASE-ORDER").map((f) => [path.posix.basename(f.path), f.message])).toEqual([
      ["phase-p1-broken-cycle--PHASE-ORDER.md", "depends on phase-p2-broken-cycle whose order 2 is not lower than 1"],
      ["phase-p1-broken-cycle--PHASE-ORDER.md", "phase-p1-broken-cycle is on a depends_on cycle"],
      ["phase-p2-broken-cycle--PHASE-ORDER.md", "phase-p2-broken-cycle is on a depends_on cycle"],
      ["phase-p3-broken-dup--PHASE-ORDER.md", "order 4 differs from the N in phase-p3-broken-dup"],
      ["phase-p3-broken-dup--PHASE-ORDER.md", "task id p3.1 is defined 2 times (phase-p3-broken-dup, phase-p3-broken-dup)"],
    ]);
    expect(of("UNV-PASTDUE")).toHaveLength(2); // the inline tag and the frontmatter entry
    expect(of("UNV-NOPHASE").map((f) => f.line)).toEqual([15]); // not the inline-code quotes, not the fence
    expect(of("INT-NUMBER-NOSRC").map((f) => f.message)).toEqual([
      '"250 ms" with no raw/bench/ or raw/evidence/ link in the same paragraph (heuristic; needs a disposition)',
    ]);
    expect(of("MERMAID-RULES").map((f) => f.message)).toEqual([
      "mermaid block: HTML in a label (line 17); click directive (line 18) (SCHEMA §14)",
    ]); // the classDiagram <<trait>> block is clean
    expect(of("REF-DANGLING").map((f) => f.message)).toEqual([
      "body link adr-0999-does-not-exist.md points to a missing file",
      "body link #no-such-heading: no heading with anchor #no-such-heading",
      "sources → raw/missing-source.md names a missing file",
      "unverified[].verify_in → phase-p5-nowhere is not a phase page",
      "integrity tag names phase-p5-nowhere, which is not a phase page",
      "spike → p1.99 matches no phase task",
    ]);
    expect(of("ADR-CHAIN").map((f) => f.id)).toEqual(["adr-0970", "adr-0971", "adr-0973"]);
    expect(of("STALE-UPDATED").map((f) => f.severity)).toEqual(["error"]);
    expect(of("CONTRADICTION")[0].message).toContain("names no Q-NNN");
  });

  it("info lines: manual SCHEMA-SPLIT and semantic-contradiction reminders, git rules skipped", () => {
    expect(report.findings.filter((f) => f.severity === "info").map((f) => [f.code, f.path])).toEqual([
      ["SCHEMA-SPLIT", "CLAUDE.md"],
      ["CONTRADICTION", "wiki/"],
      ["STALE-UPDATED", "wiki/"],
      ["RAW-IMMUTABLE", "wiki/raw/"],
    ]);
  });

  it("summary and report format", () => {
    expect(report.summary).toEqual({ errors: 49, warnings: 20, info: 4, pages: 58 });
    const text = formatReport(report).split("\n");
    expect(text[text.length - 1]).toBe("lint: 49 errors, 20 warnings, 4 info (pages: 58)");
    expect(text[0]).toMatch(/^ERROR [A-Z-]+ wiki\/\S+ {2}\S/);
    expect(text).toContain("ERROR LOG-FORMAT wiki/log.md:19  entry dated 2026-10-01 follows an entry dated 2026-10-02");
    // sorted by severity, then path, then line
    const sorted = [...report.findings].sort(compareFindings);
    expect(report.findings).toEqual(sorted);
    const sev = report.findings.map((f) => f.severity);
    expect(sev.indexOf("warn")).toBeGreaterThan(sev.lastIndexOf("error"));
    expect(sev.indexOf("info")).toBeGreaterThan(sev.lastIndexOf("warn"));
  });

  it("JSON report", () => {
    const j = JSON.parse(
      toJson(report, {
        generated_at: "2026-10-09T00:00:00.000Z",
        today: TODAY,
        wiki_dir: "wiki",
        repo_root: "x",
        git: "unavailable",
        approvals_file: { path: "plan/approvals.json", exists: false, valid: true },
        node: "v24",
      }),
    );
    expect(j).toMatchObject({ schema_version: 1, clean: false, summary: report.summary, today: TODAY });
    expect(j.findings).toHaveLength(report.findings.length);
    expect(j.counts_by_code["error INDEX-MISSING"]).toBe(5);
    expect(j.rules).toHaveLength(RULES.length);
  });
});

describe("mini-wiki (clean)", () => {
  it("zero errors and zero warnings; only the info lines", async () => {
    const { report } = await lintFixture(MINI_WIKI, MINI_STATUS);
    expect(report.findings.filter((f) => f.severity !== "info").map(formatFinding)).toEqual([]);
    expect(report.summary).toMatchObject({ errors: 0, warnings: 0, info: 4 });
  });
});

describe("approval-dependent rules (temp mini-wiki copy, in-memory approvals)", () => {
  let t: TempWiki;
  beforeAll(() => {
    t = tempMiniWiki();
  });
  afterAll(() => t.cleanup());

  async function lint(approvals: Approvals | ((idx: WikiIndex) => Approvals), opts: { valid?: boolean; current?: string } = {}) {
    const idx = await t.load();
    if (opts.current && idx.status) idx.status = { ...idx.status, current_phase: opts.current };
    const a = typeof approvals === "function" ? approvals(idx) : approvals;
    const ctx: LintContext = {
      idx,
      approvals: { exists: true, valid: opts.valid ?? true, error: opts.valid === false ? "invalid JSON: x" : null, approvals: a },
      today: TODAY,
      git: { kind: "unavailable", reason: "test" },
      manifest: null,
      approvalsPath: "plan/approvals.json",
    };
    return runLint(ctx).findings;
  }
  const codesOf = (fs: LintFinding[], code: string) => fs.filter((f) => f.code === code).map((f) => [f.severity, f.path, f.message]);

  it("APPROVAL-STALE: warn for a page of the current or next phase's dependency set, info otherwise", async () => {
    const before = await t.load();
    const approvals: Approvals = {
      "adr-0901": recordFor(before.byId.get("adr-0901")!),
      "risk-r91": recordFor(before.byId.get("risk-r91")!),
    };
    t.edit("decisions/adr-0901-fixture-decision.md", "One shell.\n", "One shell, edited.\n");
    t.edit("risks/risk-r91-fixture-risk.md", "\n# ", "\nEdited.\n\n# ");
    try {
      const fs = await lint(approvals);
      expect(codesOf(fs, "APPROVAL-STALE")).toEqual([
        ["warn", "wiki/decisions/adr-0901-fixture-decision.md", "approval of adr-0901 is STALE (in the dependency set of the current or next phase: re-approve before dependent work)"],
        ["info", "wiki/risks/risk-r91-fixture-risk.md", "approval of risk-r91 is STALE"],
      ]);
    } finally {
      t.edit("decisions/adr-0901-fixture-decision.md", "One shell, edited.\n", "One shell.\n");
      t.edit("risks/risk-r91-fixture-risk.md", "\nEdited.\n\n# ", "\n# ");
    }
    expect(codesOf(await lint(approvals), "APPROVAL-STALE")).toEqual([]);
  });

  it("APPROVAL-INVALID: orphaned keys, non-approvable pages, #exit on a non-phase, an invalid file", async () => {
    const fs = await lint((idx) => ({
      "adr-0999": recordFor(idx.byId.get("adr-0901")!),
      "ov-fixture-project#exit": recordFor(idx.byId.get("ov-fixture-project")!),
      log: recordFor(idx.byId.get("log")!),
    }));
    expect(codesOf(fs, "APPROVAL-INVALID").map((x) => x[2])).toEqual([
      "approval key adr-0999: no page has this id (SCHEMA §10.3)",
      "approval key log: the page is not approvable (SCHEMA §10.3)",
      "approval key ov-fixture-project#exit: #exit keys exist only for phases (SCHEMA §10.3)",
    ]);
    const bad = await lint({}, { valid: false });
    expect(codesOf(bad, "APPROVAL-INVALID")).toEqual([
      ["warn", "plan/approvals.json", "approvals file is invalid (invalid JSON: x); every state reads INVALID"],
    ]);
  });

  it("STATUS-APPROVED and ADR-CHAIN accepted: an approval of the current content satisfies them", async () => {
    t.edit("overview/ov-fixture-project.md", "status: review", "status: approved");
    t.edit("decisions/adr-0901-fixture-decision.md", "status: proposed", "status: accepted");
    try {
      const none = await lint({});
      expect(codesOf(none, "STATUS-APPROVED").map((x) => x[1])).toEqual(["wiki/overview/ov-fixture-project.md"]);
      expect(codesOf(none, "ADR-CHAIN").map((x) => x[1])).toEqual(["wiki/decisions/adr-0901-fixture-decision.md"]);
      const ok = await lint((idx) => ({
        "ov-fixture-project": recordFor(idx.byId.get("ov-fixture-project")!),
        "adr-0901": recordFor(idx.byId.get("adr-0901")!),
      }));
      expect(codesOf(ok, "STATUS-APPROVED")).toEqual([]);
      expect(codesOf(ok, "ADR-CHAIN")).toEqual([]);
      const rejected = await lint((idx) => ({ "adr-0901": recordFor(idx.byId.get("adr-0901")!, { status: "rejected" }) }));
      expect(codesOf(rejected, "ADR-CHAIN")).toHaveLength(1);
    } finally {
      t.edit("overview/ov-fixture-project.md", "status: approved", "status: review");
      t.edit("decisions/adr-0901-fixture-decision.md", "status: accepted", "status: proposed");
    }
  });

  it("PHASE-DONE-NO-EXIT clears with an approved #exit; UNV-PASTDUE by order of STATUS.current_phase", async () => {
    t.edit("phases/phase-p0-fixture-plan.md", "status: in-progress", "status: done");
    try {
      expect(codesOf(await lint({}), "PHASE-DONE-NO-EXIT").map((x) => x[1])).toEqual(["wiki/phases/phase-p0-fixture-plan.md"]);
      const ok = await lint((idx) => ({ "phase-p0-fixture-plan#exit": recordFor(idx.byId.get("phase-p0-fixture-plan")!) }));
      expect(codesOf(ok, "PHASE-DONE-NO-EXIT")).toEqual([]);
    } finally {
      t.edit("phases/phase-p0-fixture-plan.md", "status: done", "status: in-progress");
    }
    // exp-fixture-startup names phase-p1-fixture-build (order 1): due while current is p0 or p1, past due once current is later.
    expect(codesOf(await lint({}, { current: "phase-p1-fixture-build" }), "UNV-PASTDUE")).toEqual([]);
    t.edit("research/experiments/exp-fixture-startup.md", "UNVERIFIED[phase-p1-fixture-build]", "UNVERIFIED[phase-p0-fixture-plan]");
    t.edit("research/experiments/exp-fixture-startup.md", "verify_in: phase-p1-fixture-build", "verify_in: phase-p0-fixture-plan");
    try {
      expect(codesOf(await lint({}), "UNV-PASTDUE")).toEqual([]);
      const past = codesOf(await lint({}, { current: "phase-p1-fixture-build" }), "UNV-PASTDUE");
      expect(past.map((x) => x[2])).toEqual([
        "unverified[].verify_in phase-p0-fixture-plan: phase-p0-fixture-plan (order 0) is before the current phase phase-p1-fixture-build (order 1)",
        "inline tag names phase-p0-fixture-plan: phase-p0-fixture-plan (order 0) is before the current phase phase-p1-fixture-build (order 1)",
      ]);
    } finally {
      t.edit("research/experiments/exp-fixture-startup.md", "UNVERIFIED[phase-p0-fixture-plan]", "UNVERIFIED[phase-p1-fixture-build]");
      t.edit("research/experiments/exp-fixture-startup.md", "verify_in: phase-p0-fixture-plan", "verify_in: phase-p1-fixture-build");
    }
  });

  it("log.md tags are history: no UNV-PASTDUE / UNV-MIRROR there", async () => {
    t.edit("log.md", "- result: loader written", "- result: loader written; UNVERIFIED[phase-p0-fixture-plan] noted");
    t.edit("phases/phase-p0-fixture-plan.md", "status: in-progress", "status: done");
    try {
      const fs = await lint({});
      expect(fs.filter((f) => f.path === "wiki/log.md").map((f) => f.code)).toEqual([]);
    } finally {
      t.edit("log.md", "- result: loader written; UNVERIFIED[phase-p0-fixture-plan] noted", "- result: loader written");
      t.edit("phases/phase-p0-fixture-plan.md", "status: done", "status: in-progress");
    }
  });
});

describe("gate report (ip-wiki-lint §4)", () => {
  let t: TempWiki;
  beforeAll(() => {
    t = tempMiniWiki();
  });
  afterAll(() => t.cleanup());
  const input = (approvals: Approvals, valid = true) => ({ exists: true, valid, error: valid ? null : "bad", approvals, path: "plan/approvals.json" });

  it("prints the checklist and the state of every id of the dependency set; blocked without approvals", async () => {
    const idx = await t.load();
    const r = gateReport(idx, input({}), "phase-p1-fixture-build", "GATE_PHASE");
    expect(r.ok).toBe(false);
    const lines = r.text.split("\n");
    expect(lines[0]).toBe("gate: entry of phase-p1-fixture-build (GATE_PHASE), SCHEMA §9.7");
    expect(lines).toContain("[x] the phase page exists and is valid");
    expect(lines.some((l) => l.startsWith("[ ] 1. every depends_on phase has status done"))).toBe(true);
    expect(lines.some((l) => l.startsWith("[ ] 3. no open Q-NNN blocks an id of the dependency set: Q-901"))).toBe(true);
    expect(lines).toContain(`dependency set (${r.gate.dependencySet.length}):`);
    for (const id of r.gate.dependencySet) expect(r.text).toMatch(new RegExp(`^  ${id} +PENDING`, "m"));
    expect(lines[lines.length - 1]).toMatch(/^result: BLOCKED: /);
  });

  it("passes when every item holds; an invalid approvals.json fails closed; unknown phase", async () => {
    t.edit("phases/phase-p0-fixture-plan.md", "status: in-progress", "status: done");
    t.edit("overview/ov-open-questions.md", "- status: open\n- answer: none yet", "- status: answered\n- answer: none yet");
    try {
      const idx = await t.load();
      const p1 = idx.byId.get("phase-p1-fixture-build")!;
      const set = gateReport(idx, input({}), p1.id!, "x").gate.dependencySet;
      const all: Approvals = { "phase-p0-fixture-plan#exit": recordFor(idx.byId.get("phase-p0-fixture-plan")!) };
      for (const id of set) all[id] = recordFor(idx.byId.get(id)!);
      const ok = gateReport(idx, input(all), p1.id!, "x");
      expect(ok.text.split("\n").filter((l) => l.startsWith("[ ]"))).toEqual([]);
      expect(ok.ok).toBe(true);
      expect(ok.text.endsWith("result: PASSED")).toBe(true);
      expect(gateReport(idx, input(all, false), p1.id!, "x").ok).toBe(false);
      const unknown = gateReport(idx, input({}), "phase-p7-nowhere", "x");
      expect(unknown.ok).toBe(false);
      expect(unknown.text).toContain("[ ] the phase page exists and is valid: phase-p7-nowhere (no such page)");
    } finally {
      t.edit("phases/phase-p0-fixture-plan.md", "status: done", "status: in-progress");
      t.edit("overview/ov-open-questions.md", "- status: answered\n- answer: none yet", "- status: open\n- answer: none yet");
    }
  });
});

describe("helpers", () => {
  it("index line regex, folder labels, raw labels", () => {
    expect(INDEX_LINE.test("- [adr-0007](decisions/adr-0007-child-webviews.md) | proposed | Child WebViews | Trusted shell")).toBe(true);
    expect(INDEX_LINE.test("- [Adr](x.md) | proposed | t | s")).toBe(false);
    expect(folderLabel("evidence/phase-p0-planning/")).toBe("evidence-phase-p0-planning");
    expect(folderLabel("bench/Run 01_A!/")).toBe("bench-run-01-a");
    expect(rawFileLabel("raw/00-master-prompt.md")).toBe("00-master-prompt");
    expect(rawFileLabel("raw/assets/fig.v2.png")).toBe("fig.v2");
    expect(folderOf("raw/evidence/p/x/y.txt")).toBe("raw/evidence/p/");
    expect(folderOf("raw/bench/x.txt")).toBe("direct");
    expect(folderOf("raw/owner/x.md")).toBeNull();
  });

  it("number+unit heuristic", () => {
    for (const s of ["took 250 ms", "10%", "1.5 GiB", "60 fps", "3 s later", "12 J"]) expect(NUMBER_UNIT.test(s), s).toBe(true);
    for (const s of ["3 sessions", "p0.8 status", "M1 W", "v24 and", "phase-p5 s"]) expect(NUMBER_UNIT.test(s), s).toBe(false);
  });

  it("mermaid node counting (flowchart, stateDiagram; null for other kinds)", () => {
    expect(mermaidNodeCount(["flowchart LR", '  a["A"] --> b["B"]', "  b -->|label| c", "  subgraph S [Sub]", "  c -.-> d", "  end"])).toBe(4);
    expect(mermaidNodeCount(["stateDiagram-v2", "  [*] --> ACTIVE", "  ACTIVE --> IDLE: idle for 5 min", "  IDLE --> [*]"])).toBe(2);
    expect(mermaidNodeCount(["sequenceDiagram", "  A->>B: hi"])).toBeNull();
    const big = ["flowchart TB", ...Array.from({ length: 31 }, (_, i) => `  n${i} --> n${i + 1}`)];
    expect(mermaidNodeCount(big)).toBe(32);
  });

  it("paragraphs and local date", () => {
    expect(paragraphs("a\nb\n\nc\n", 10)).toEqual([
      { text: "a\nb", line: 10 },
      { text: "c", line: 13 },
    ]);
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("formatFinding / formatSummary", () => {
    expect(formatFinding({ code: "ORPHAN", severity: "warn", path: "wiki/x.md", message: "m" })).toBe("WARN ORPHAN wiki/x.md  m");
    expect(formatFinding({ code: "REF-DANGLING", severity: "error", path: "wiki/x.md", line: 3, message: "m" })).toBe("ERROR REF-DANGLING wiki/x.md:3  m");
    expect(formatSummary({ errors: 1, warnings: 2, info: 3, pages: 4 })).toBe("lint: 1 errors, 2 warnings, 3 info (pages: 4)");
  });
});
