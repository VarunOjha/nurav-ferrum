// ip-testing §1.2: schema validation per page type (SCHEMA §5-§8).
import { beforeAll, describe, expect, it } from "vitest";
import type { WikiIndex } from "@/lib/wiki/load";
import {
  allowedTypesForPath,
  checkIdAndPath,
  ID_PATTERNS,
  idMatchesType,
  isSourceEntry,
  PAGE_TYPES,
  SCHEMAS,
  sourcePath,
  STATUS_ENUMS,
  validateFrontmatter,
  type PageType,
} from "@/lib/wiki/schemas";
import { codes, loadMini } from "./helpers";

/** SCHEMA §5.1 common required fields. */
const COMMON = ["id", "type", "title", "status", "updated", "sources", "related", "approvable"];
/** SCHEMA §6 required extras per type, written out independently of lib/wiki/schemas.ts. */
const REQUIRED: Record<PageType, string[]> = {
  overview: COMMON,
  component: [...COMMON, "path", "crate", "trust_level", "phase_introduced", "responsibilities", "connects"],
  phase: [
    ...COMMON,
    "milestone",
    "order",
    "depends_on",
    "est_sessions",
    "entry_criteria",
    "deliverables",
    "tasks",
    "test_gate",
    "exit_criteria",
    "risks",
    "decisions",
    "experiments",
  ],
  decision: [...COMMON, "date", "decided_by", "supersedes"],
  risk: [...COMMON, "likelihood", "impact", "mitigation", "spike", "owner_phase"],
  "research-question": [...COMMON, "question", "hypotheses"],
  hypothesis: [...COMMON, "rq", "prediction", "null_hypothesis", "metrics", "experiments"],
  experiment: [...COMMON, "hypotheses", "workloads", "configurations", "metrics", "trials", "analysis", "phase"],
  metric: [...COMMON, "unit", "definition", "boundary_start", "boundary_end", "method", "tool", "normalization", "support"],
  workload: [...COMMON, "workload_kind", "master_prompt_ref", "parameters", "fixture_path"],
  quality: [...COMMON, "scope", "test_kinds", "tooling"],
  operations: [...COMMON, "audience", "trigger"],
  handoff: [...COMMON, "session", "phase", "next_action", "uncommitted", "open_questions"],
  glossary: COMMON,
  index: COMMON,
  log: COMMON,
  schema: COMMON,
  status: [...COMMON, "session", "current_phase", "current_task", "next_action", "blocked_on", "last_handoff"],
  "research-note": ["id", "type", "title", "updated", "sources"],
};

/** Enum fields per type (path, invalid value) beyond `status`. */
const ENUM_FIELDS: Partial<Record<PageType, [string[], unknown][]>> = {
  component: [
    [["trust_level"], "semi-trusted"],
    [["connects", "0", "kind"], "carrier-pigeon"],
  ],
  phase: [[["milestone"], "M8"]],
  decision: [[["decided_by"], "someone"]],
  experiment: [[["trials", "order"], "alphabetical"]],
  metric: [[["support"], "maybe"]],
  workload: [[["workload_kind"], "remote"]],
  quality: [[["test_kinds", "0"], "fuzz"]],
  operations: [[["audience"], "everyone"]],
  overview: [[["audience"], "everyone"]],
};

let mini: WikiIndex;
const sample: Partial<Record<PageType, Record<string, unknown>>> = {};

beforeAll(async () => {
  mini = await loadMini();
  for (const p of mini.pages) {
    const t = (p.rawFm as { type?: string } | null)?.type as PageType | undefined;
    // components: take the shell (it has a non-empty `connects`)
    if (t && (!sample[t] || p.id === "comp-fixture-shell")) sample[t] = structuredClone(p.rawFm as Record<string, unknown>);
  }
});

function setAt(obj: Record<string, unknown>, p: string[], v: unknown) {
  let cur: Record<string, unknown> = obj;
  for (const k of p.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[p[p.length - 1]] = v;
}

describe.each([...PAGE_TYPES])("type %s", (type) => {
  const fx = () => structuredClone(sample[type]!);

  it("has a minimal valid fixture in mini-wiki that passes with no findings", () => {
    expect(sample[type], `mini-wiki has no ${type} page`).toBeDefined();
    const r = validateFrontmatter(fx(), "wiki/x.md");
    expect(r.findings).toEqual([]);
    expect(r.fm).not.toBeNull();
    expect(r.type).toBe(type);
  });

  it("the schema's required keys equal SCHEMA §5.1 + §6", () => {
    const shape = SCHEMAS[type].shape as Record<string, { safeParse(v: unknown): { success: boolean } }>;
    const required = Object.keys(shape).filter((k) => !shape[k].safeParse(undefined).success);
    expect(required.sort()).toEqual([...REQUIRED[type]].sort());
  });

  it.each(REQUIRED[type].filter((k) => k !== "type"))("removing `%s` -> FM-MISSING", (key) => {
    const o = fx();
    delete o[key];
    const r = validateFrontmatter(o, "wiki/x.md");
    expect(codes(r.findings)).toEqual(["FM-MISSING"]);
    expect(r.findings[0].message).toContain(`\`${key}\``);
    expect(r.fm).toBeNull();
  });

  if (type !== "research-note") {
    it("an invalid status -> FM-ENUM", () => {
      const o = fx();
      o.status = "not-a-status";
      const r = validateFrontmatter(o, "wiki/x.md");
      expect(codes(r.findings)).toEqual(["FM-ENUM"]);
      expect(r.fm).toBeNull();
    });
    it("every status in the enum is accepted", () => {
      for (const s of STATUS_ENUMS[type]) {
        const o = fx();
        o.status = s;
        expect(validateFrontmatter(o, "wiki/x.md").findings).toEqual([]);
      }
    });
  }

  it.each(ENUM_FIELDS[type] ?? [])("enum field %j with an invalid value -> FM-ENUM", (p, bad) => {
    const o = fx();
    setAt(o, p, bad);
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-ENUM"]);
  });

  it("an unknown key -> FM-UNKNOWN-KEY (warn) and nothing more", () => {
    const o = fx();
    o.colour = "blue";
    const r = validateFrontmatter(o, "wiki/x.md");
    expect(r.findings.map((f) => [f.code, f.severity])).toEqual([["FM-UNKNOWN-KEY", "warn"]]);
    expect(r.fm).not.toBeNull();
  });
});

describe("type field", () => {
  it("missing type -> FM-MISSING; unknown type -> FM-ENUM", () => {
    expect(codes(validateFrontmatter({ id: "x" }, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
    expect(codes(validateFrontmatter({ id: "x", type: "blog" }, "wiki/x.md").findings)).toEqual(["FM-ENUM"]);
  });
  it("a non-object frontmatter is treated as empty", () => {
    expect(codes(validateFrontmatter(null, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
    expect(codes(validateFrontmatter(["a"], "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
});

describe("other field rules", () => {
  // SCHEMA §5.1 / owner answer 2026-10-09 (wave 0c items 1 and 2).
  it("sources: https:// URLs and wiki-relative paths (any wiki file) are accepted", () => {
    const o = structuredClone(sample.decision!);
    o.sources = ["raw/a.md", "https://example.com", "SCHEMA.md", "raw/research/x.md#3-section", "decisions/adr-0001-x.md"];
    expect(validateFrontmatter(o, "wiki/x.md").findings).toEqual([]);
  });
  it.each([
    ["http://example.com"],
    ["https://"],
    ["/abs/raw/a.md"],
    ["../STATUS.md"],
    ["raw/../SCHEMA.md"],
    ["./raw/a.md"],
    ["raw//a.md"],
    ["raw\\a.md"],
    ["C:/wiki/raw/a.md"],
    ["file:raw/a.md"],
    ["crate source (downloaded from static.crates.io): tauri-2.12.1"],
    ["#only-anchor"],
    [""],
  ])("sources entry %j on a wiki page -> FM-MISSING", (s) => {
    const o = structuredClone(sample.decision!);
    o.sources = [s];
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("raw research notes are exempt from the sources format: any list of strings", () => {
    const o = structuredClone(sample["research-note"]!);
    o.sources = ["crate source (downloaded from static.crates.io): tauri-2.12.1, wry-0.57.0", "https://x.org"];
    expect(validateFrontmatter(o, "wiki/raw/research/x.md").findings).toEqual([]);
    o.sources = [1];
    expect(codes(validateFrontmatter(o, "wiki/raw/research/x.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("isSourceEntry / sourcePath", () => {
    expect(isSourceEntry("SCHEMA.md")).toBe(true);
    expect(isSourceEntry("https://a.b/c d")).toBe(false);
    expect(sourcePath("raw/a.md#x")).toBe("raw/a.md");
    expect(sourcePath("SCHEMA.md")).toBe("SCHEMA.md");
    expect(sourcePath("https://a.b/raw/a.md")).toBeNull();
    expect(sourcePath("../x.md")).toBeNull();
  });
  it("updated must be YYYY-MM-DD", () => {
    const o = structuredClone(sample.decision!);
    o.updated = "2026-1-8";
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("a malformed id -> ID-PATTERN", () => {
    const o = structuredClone(sample.decision!);
    o.id = "ADR_1";
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["ID-PATTERN"]);
  });
  it("risk likelihood/impact are integers 1-5; spike is a task id or null", () => {
    const o = structuredClone(sample.risk!);
    o.likelihood = 6;
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
    const o2 = structuredClone(sample.risk!);
    o2.spike = null;
    expect(validateFrontmatter(o2, "wiki/x.md").findings).toEqual([]);
    o2.spike = "p9.1";
    expect(codes(validateFrontmatter(o2, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("phase order is an integer 0-8 and task ids match pN.M", () => {
    const o = structuredClone(sample.phase!);
    o.order = 9;
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
    const o2 = structuredClone(sample.phase!);
    (o2.tasks as { id: string }[])[0].id = "p0-1";
    expect(codes(validateFrontmatter(o2, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("STATUS blocked_on accepts ids and Q-NNN; current_task may be null", () => {
    const o = structuredClone(sample.status!);
    o.blocked_on = ["phase-p1-foundation", "Q-123"];
    o.current_task = null;
    expect(validateFrontmatter(o, "STATUS.md").findings).toEqual([]);
    o.blocked_on = ["Q-12"];
    expect(codes(validateFrontmatter(o, "STATUS.md").findings)).toEqual(["FM-MISSING"]);
  });
  it("unverified[].verify_in must be a phase id", () => {
    const o = structuredClone(sample.experiment!);
    o.unverified = [{ claim: "x", verify_in: "p1" }];
    expect(codes(validateFrontmatter(o, "wiki/x.md").findings)).toEqual(["FM-MISSING"]);
  });
});

describe("id patterns (SCHEMA §8)", () => {
  const cases: [PageType, string[], string[]][] = [
    ["phase", ["phase-p0-planning", "phase-p8-research-paper"], ["phase-p9-x", "phase-p1", "p1-foundation"]],
    ["component", ["comp-app-shell"], ["component-x", "comp-", "comp_x"]],
    ["decision", ["adr-0001", "adr-0901"], ["adr-1", "adr-00001", "adr-0001-x"]],
    ["risk", ["risk-r01", "risk-r123"], ["risk-r1", "risk-01"]],
    ["research-question", ["rq-01", "rq-91"], ["rq-1", "rq-x"]],
    ["hypothesis", ["hyp-01"], ["hyp-1", "hypothesis-01"]],
    ["experiment", ["exp-startup"], ["experiment-x", "exp_x"]],
    ["metric", ["metric-private-bytes"], ["metric", "m-x"]],
    ["workload", ["wl-static-info"], ["workload-x"]],
    ["overview", ["ov-project"], ["overview-x"]],
    ["quality", ["qual-test-strategy"], ["quality-x"]],
    ["operations", ["ops-resume", "ip-data-contract"], ["op-x", "ipx"]],
    ["handoff", ["handoff-2026-10-08-s01", "handoff-2026-10-08-s123"], ["handoff-2026-10-08", "handoff-26-10-08-s01", "handoff-2026-10-08-s1"]],
    ["research-note", ["research-llm-wiki-pattern"], ["llm-wiki-pattern"]],
    ["glossary", ["glossary"], ["glossary-x"]],
    ["index", ["index"], ["index-x"]],
    ["log", ["log"], ["logs"]],
    ["schema", ["schema"], ["schemas"]],
    ["status", ["status-live"], ["status"]],
  ];
  it("covers every page type", () => {
    expect(cases.map((c) => c[0]).sort()).toEqual([...PAGE_TYPES].sort());
    expect(Object.keys(ID_PATTERNS).sort()).toEqual([...PAGE_TYPES].sort());
  });
  it.each(cases)("%s: valid and invalid examples", (type, good, bad) => {
    for (const id of good) expect(idMatchesType(id, type), id).toBe(true);
    for (const id of bad) expect(idMatchesType(id, type), id).toBe(false);
  });

  it("basename rule: basename == id or starts with id + '-'", () => {
    expect(checkIdAndPath("decision", "adr-0007", "decisions/adr-0007-child-webviews.md", "w")).toEqual([]);
    expect(checkIdAndPath("decision", "adr-0007", "decisions/adr-0007.md", "w")).toEqual([]);
    expect(codes(checkIdAndPath("decision", "adr-0007", "decisions/adr-0008-x.md", "w"))).toEqual(["ID-PATTERN"]);
    expect(codes(checkIdAndPath("decision", "adr-0007", "decisions/adr-00070.md", "w"))).toEqual(["ID-PATTERN"]);
  });
  it("basename exceptions: SCHEMA.md, STATUS.md, research notes without the research- prefix", () => {
    expect(checkIdAndPath("schema", "schema", "SCHEMA.md", "w")).toEqual([]);
    expect(checkIdAndPath("status", "status-live", "../STATUS.md", "STATUS.md", true)).toEqual([]);
    expect(checkIdAndPath("research-note", "research-llm-wiki-pattern", "raw/research/llm-wiki-pattern.md", "w")).toEqual([]);
    expect(checkIdAndPath("research-note", "research-x", "raw/research/research-x.md", "w")).toEqual([]);
    expect(codes(checkIdAndPath("research-note", "research-x", "raw/research/y.md", "w"))).toEqual(["ID-PATTERN"]);
  });
  it("id pattern failure and basename failure are both reported", () => {
    expect(codes(checkIdAndPath("decision", "adr-7", "decisions/adr-0007.md", "w"))).toEqual(["ID-PATTERN", "ID-PATTERN"]);
  });
});

describe("directory <-> type (SCHEMA §4.1, FM-TYPE-DIR)", () => {
  const ok: [string, PageType][] = [
    ["overview/ov-project.md", "overview"],
    ["overview/glossary.md", "glossary"],
    ["overview/sub/ov-x.md", "overview"],
    ["architecture/ov-architecture.md", "overview"],
    ["architecture/components/comp-x.md", "component"],
    ["phases/phase-p1-x.md", "phase"],
    ["decisions/adr-0001-x.md", "decision"],
    ["risks/risk-r01-x.md", "risk"],
    ["risks/ov-risk-register.md", "overview"],
    ["research/ov-research-x.md", "overview"],
    ["research/questions/rq-01.md", "research-question"],
    ["research/hypotheses/hyp-01.md", "hypothesis"],
    ["research/experiments/exp-x.md", "experiment"],
    ["research/metrics/metric-x.md", "metric"],
    ["research/workloads/wl-x.md", "workload"],
    ["quality/qual-x.md", "quality"],
    ["operations/ops-x.md", "operations"],
    ["operations/handoffs/handoff-2026-10-08-s01.md", "handoff"],
    ["interactive-plan/ip-spec.md", "operations"],
    ["interactive-plan/ov-x.md", "overview"],
    ["raw/research/note.md", "research-note"],
    ["SCHEMA.md", "schema"],
    ["index.md", "index"],
    ["log.md", "log"],
  ];
  const bad: [string, PageType][] = [
    ["phases/adr-0001.md", "decision"],
    ["overview/sub/glossary.md", "glossary"],
    ["research/questions/ov-x.md", "overview"],
    ["research/hyp-01.md", "hypothesis"],
    ["operations/handoffs/ops-x.md", "operations"],
    ["decisions/ov-x.md", "overview"],
    ["raw/research/sub/note.md", "research-note"],
    ["raw/note.md", "research-note"],
    ["other.md", "overview"],
    ["phases/status.md", "status"],
  ];
  it.each(ok)("%s allows %s", (p, t) => expect(allowedTypesForPath(p).has(t)).toBe(true));
  it.each(bad)("%s rejects %s", (p, t) => {
    expect(allowedTypesForPath(p).has(t)).toBe(false);
    expect(codes(checkIdAndPath(t, undefined, p, "wiki/" + p))).toEqual(["FM-TYPE-DIR"]);
  });
  it("STATUS.md allows only status", () => {
    expect([...allowedTypesForPath("../STATUS.md", true)]).toEqual(["status"]);
  });
});
