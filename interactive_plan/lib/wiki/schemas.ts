/**
 * Typed frontmatter model (ip-data-contract §4). Every constant mirrors wiki/SCHEMA.md one to one;
 * tests/unit/schema-sync.test.ts parses SCHEMA.md and fails when the two drift (SCHEMA §15).
 */
import { z } from "zod";
import { finding, type LintFinding } from "./findings";

// ---------------------------------------------------------------------------------------------
// Constants copied from SCHEMA.md
// ---------------------------------------------------------------------------------------------

/** SCHEMA §5.1 `type` enum, plus `research-note` (raw only, §6.13). `status` is STATUS.md only. */
export const PAGE_TYPES = [
  "overview",
  "component",
  "phase",
  "decision",
  "risk",
  "research-question",
  "hypothesis",
  "experiment",
  "metric",
  "workload",
  "quality",
  "operations",
  "handoff",
  "glossary",
  "index",
  "log",
  "schema",
  "status",
  "research-note",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

/** SCHEMA §6.2 `connects[].kind`. */
export const EDGE_KINDS = [
  "rust-api",
  "tauri-ipc",
  "tauri-event",
  "webview2-com",
  "cdp",
  "process-spawn",
  "file-io",
  "network",
  "os-api",
  "data-export",
] as const;

/** SCHEMA §6.1-§6.16 status enums per type (`research-note` has no status, §6.13). */
export const STATUS_ENUMS = {
  overview: ["draft", "review", "approved", "outdated"],
  component: ["planned", "in-progress", "implemented", "verified", "deprecated"],
  phase: ["planned", "ready", "in-progress", "gate-review", "done", "blocked"],
  decision: ["proposed", "accepted", "superseded", "rejected"],
  risk: ["open", "mitigating", "resolved", "realized", "tolerated"],
  "research-question": ["open", "investigating", "answered", "dropped"],
  hypothesis: ["draft", "preregistered", "testing", "supported", "not-supported", "inconclusive", "withdrawn"],
  experiment: ["designed", "ready", "running", "complete", "analyzed", "aborted"],
  metric: ["proposed", "defined", "validated", "retired"],
  workload: ["proposed", "implemented", "validated", "retired"],
  quality: ["draft", "active", "retired"],
  operations: ["draft", "active", "retired"],
  glossary: ["draft", "active"],
  handoff: ["final", "partial"],
  index: ["active"],
  log: ["active"],
  schema: ["draft", "review", "approved"],
  status: ["active", "blocked", "awaiting-owner"],
} as const satisfies Record<Exclude<PageType, "research-note">, readonly string[]>;

/** SCHEMA §8 id patterns per page type (regex sources, anchored). */
export const ID_PATTERNS: Readonly<Record<PageType, readonly string[]>> = {
  phase: ["^phase-p[0-8]-[a-z0-9-]+$"],
  component: ["^comp-[a-z0-9-]+$"],
  decision: ["^adr-[0-9]{4}$"],
  risk: ["^risk-r[0-9]{2,}$"],
  "research-question": ["^rq-[0-9]{2,}$"],
  hypothesis: ["^hyp-[0-9]{2,}$"],
  experiment: ["^exp-[a-z0-9-]+$"],
  metric: ["^metric-[a-z0-9-]+$"],
  workload: ["^wl-[a-z0-9-]+$"],
  overview: ["^ov-[a-z0-9-]+$"],
  quality: ["^qual-[a-z0-9-]+$"],
  operations: ["^ops-[a-z0-9-]+$", "^ip-[a-z0-9-]+$"],
  handoff: ["^handoff-[0-9]{4}-[0-9]{2}-[0-9]{2}-s[0-9]{2,}$"],
  "research-note": ["^research-[a-z0-9-]+$"],
  glossary: ["^glossary$"],
  index: ["^index$"],
  log: ["^log$"],
  schema: ["^schema$"],
  status: ["^status-live$"],
};
/** SCHEMA §8 "singletons" row. */
export const SINGLETON_IDS = ["index", "log", "schema", "glossary", "status-live"] as const;
/** SCHEMA §8 non-page id patterns. */
export const TASK_ID_PATTERN = "^p[0-8]\\.[0-9]+$";
export const CFG_ID_PATTERN = "^cfg-[a-z0-9-]+$";
export const QUESTION_ID_PATTERN = "^Q-[0-9]{3}$";

const compiled = new Map<string, RegExp>();
function re(src: string): RegExp {
  let r = compiled.get(src);
  if (!r) {
    r = new RegExp(src);
    compiled.set(src, r);
  }
  return r;
}
export function idMatchesType(id: string, type: PageType): boolean {
  return ID_PATTERNS[type].some((p) => re(p).test(id));
}

/** SCHEMA §6.11 `test_kinds`. */
export const QUALITY_TEST_KINDS = [
  "unit",
  "integration",
  "e2e",
  "security",
  "benchmark-validation",
  "build",
  "lint",
  "manual",
  "ci",
] as const;
export const TRUST_LEVELS = ["trusted", "untrusted", "external"] as const;
export const MILESTONES = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"] as const;
export const AUDIENCES = ["owner", "claude", "both"] as const;
export const DECIDED_BY = ["owner", "claude-proposed"] as const;
export const METRIC_SUPPORT = ["supported", "unsupported", "unverified"] as const;
export const WORKLOAD_KINDS = ["synthetic-local", "public-real-world"] as const;
export const TRIAL_ORDERS = ["randomized", "counterbalanced"] as const;

// ---------------------------------------------------------------------------------------------
// SCHEMA §4.1: allowed types per directory (FM-TYPE-DIR)
// ---------------------------------------------------------------------------------------------

/**
 * Types allowed for a wiki-relative path (forward slashes). `isStatusFile` marks root STATUS.md.
 * Encodes SCHEMA §4.1 literally: each directory's own type; `overview` anywhere under overview/,
 * architecture/ and interactive-plan/, and directly in research/ and risks/; `glossary` only at
 * overview/glossary.md; the three root singletons by file name; research-note only in raw/research/.
 */
export function allowedTypesForPath(wikiPath: string, isStatusFile = false): Set<PageType> {
  const out = new Set<PageType>();
  if (isStatusFile) {
    out.add("status");
    return out;
  }
  const parts = wikiPath.split("/");
  const file = parts[parts.length - 1];
  const dirs = parts.slice(0, -1);
  const top = dirs[0];
  if (dirs.length === 0) {
    if (file === "SCHEMA.md") out.add("schema");
    if (file === "index.md") out.add("index");
    if (file === "log.md") out.add("log");
    return out;
  }
  if (top === "raw") {
    if (dirs.length === 2 && dirs[1] === "research") out.add("research-note");
    return out;
  }
  if (top === "overview" || top === "architecture" || top === "interactive-plan") out.add("overview");
  if (top === "overview" && wikiPath === "overview/glossary.md") out.add("glossary");
  if (top === "architecture" && dirs[1] === "components" && dirs.length === 2) out.add("component");
  if (top === "interactive-plan") out.add("operations");
  if (top === "phases" && dirs.length === 1) out.add("phase");
  if (top === "decisions" && dirs.length === 1) out.add("decision");
  if (top === "risks" && dirs.length === 1) {
    out.add("risk");
    out.add("overview");
  }
  if (top === "quality" && dirs.length === 1) out.add("quality");
  if (top === "operations") {
    if (dirs[1] === "handoffs") {
      if (dirs.length === 2) out.add("handoff");
    } else {
      out.add("operations");
    }
  }
  if (top === "research") {
    if (dirs.length === 1) out.add("overview");
    const sub: Record<string, PageType> = {
      questions: "research-question",
      hypotheses: "hypothesis",
      experiments: "experiment",
      metrics: "metric",
      workloads: "workload",
    };
    if (dirs.length === 2 && sub[dirs[1]]) out.add(sub[dirs[1]]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// zod schemas (SCHEMA §5-§6)
// ---------------------------------------------------------------------------------------------

export const Id = z.string().regex(/^[a-z0-9][a-z0-9.-]*$/);
export const Date10 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/**
 * SCHEMA §5.1 `sources` entry (owner answer 2026-10-09, raw/owner/2026-10-09-s01-wave0c.md item 1): an
 * absolute https:// URL, or a path relative to wiki/ (any wiki file, e.g. `SCHEMA.md`, not only raw/).
 * A path has no leading `/`, no `..` or `.` segment, no backslash, no whitespace and no `:` (so no
 * scheme); an optional `#anchor` is allowed. Whether the file exists is REF-DANGLING (lint), not zod.
 */
export function isWikiRelativePath(s: string): boolean {
  const pathPart = s.split("#", 1)[0];
  if (pathPart === "" || /[\\\s:]/.test(s) || pathPart.startsWith("/")) return false;
  return pathPart.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
}
export function isSourceEntry(s: string): boolean {
  return /^https:\/\/[^\s/]+\S*$/.test(s) || isWikiRelativePath(s);
}
/** The wiki-relative file a `sources` entry names (anchor dropped), or null for a URL / malformed entry. */
export function sourcePath(s: string): string | null {
  return !s.startsWith("https://") && isWikiRelativePath(s) ? s.split("#", 1)[0] : null;
}
export const Source = z
  .string()
  .refine(isSourceEntry, "must be an https:// URL or a path relative to wiki/ (SCHEMA §5.1)");
export const TaskId = z.string().regex(re(TASK_ID_PATTERN));
export const QuestionId = z.string().regex(re(QUESTION_ID_PATTERN));
export const PhaseIdRef = z.string().regex(/^phase-p[0-8]-[a-z0-9-]+$/);
const Unverified = z.object({ claim: z.string(), verify_in: PhaseIdRef });
const Sha = z.string().regex(/^[0-9a-f]{7,40}$/);

/** §5.2 optional fields, shared by every type (research notes included). */
const optionalCommon = {
  phase: Id.optional(),
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
  unverified: z.array(Unverified).optional(),
  superseded_by: Id.optional(),
  aliases: z.array(z.string()).optional(),
  last_verified_commit: Sha.optional(),
};

function base<T extends Exclude<PageType, "research-note">>(type: T) {
  return z.looseObject({
    id: Id,
    type: z.literal(type),
    title: z.string().min(1),
    status: z.enum(STATUS_ENUMS[type]),
    updated: Date10,
    sources: z.array(Source),
    related: z.array(Id),
    approvable: z.boolean(),
    ...optionalCommon,
  });
}

export const Edge = z.object({
  to: Id,
  label: z.string(),
  kind: z.enum(EDGE_KINDS),
  crosses_trust_boundary: z.boolean(),
});

export const OverviewSchema = base("overview").extend({ audience: z.enum(AUDIENCES).optional() });

export const ComponentSchema = base("component").extend({
  path: z.string().nullable(),
  crate: z.string().nullable(),
  trust_level: z.enum(TRUST_LEVELS),
  phase_introduced: Id,
  responsibilities: z.array(z.string()),
  connects: z.array(Edge),
  interfaces: z.array(z.string()).optional(),
  shipped: z.boolean().optional(),
  unsafe_code: z.boolean().optional(),
  external_version: z.string().optional(),
});

export const Task = z.object({ id: TaskId, title: z.string(), verify: z.string() });

export const PhaseSchema = base("phase").extend({
  milestone: z.enum(MILESTONES).nullable(),
  order: z.number().int().min(0).max(8),
  depends_on: z.array(Id),
  est_sessions: z.number().int().min(1),
  entry_criteria: z.array(z.string()),
  deliverables: z.array(z.string()),
  tasks: z.array(Task),
  test_gate: z.object({
    automated: z.array(z.string()),
    manual: z.array(z.string()),
    evidence: z.array(z.string()),
  }),
  exit_criteria: z.array(z.string()),
  risks: z.array(Id),
  decisions: z.array(Id),
  experiments: z.array(Id),
  components: z.array(Id).optional(),
});

export const DecisionSchema = base("decision").extend({
  date: Date10,
  decided_by: z.enum(DECIDED_BY),
  supersedes: z.array(Id),
  options: z.array(z.string()).optional(),
});

export const RiskSchema = base("risk").extend({
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  mitigation: z.string(),
  spike: TaskId.nullable(),
  owner_phase: Id,
  trigger: z.string().optional(),
  fallback: z.string().optional(),
  /** §6.5: "If the score is stored, it MUST match" (checked by lint RISK-SCORE). */
  score: z.number().int().optional(),
});

export const ResearchQuestionSchema = base("research-question").extend({
  question: z.string(),
  hypotheses: z.array(Id),
  paper_section: z.string().optional(),
});

export const HypothesisSchema = base("hypothesis").extend({
  rq: Id,
  prediction: z.string(),
  null_hypothesis: z.string(),
  metrics: z.array(Id),
  experiments: z.array(Id),
  practical_threshold: z.string().optional(),
});

export const ExperimentSchema = base("experiment").extend({
  hypotheses: z.array(Id),
  workloads: z.array(Id),
  configurations: z.array(z.string().regex(re(CFG_ID_PATTERN))),
  metrics: z.array(Id),
  trials: z.object({
    target: z.number().int(),
    warmup: z.number().int(),
    order: z.enum(TRIAL_ORDERS),
  }),
  analysis: z.string(),
  phase: Id,
  results_ref: z.array(z.string()).optional(),
  fairness_controls: z.array(z.string()).optional(),
});

export const MetricSchema = base("metric").extend({
  unit: z.string(),
  definition: z.string(),
  boundary_start: z.string(),
  boundary_end: z.string(),
  method: z.string(),
  tool: z.string(),
  normalization: z.string(),
  support: z.enum(METRIC_SUPPORT),
});

export const WorkloadSchema = base("workload").extend({
  workload_kind: z.enum(WORKLOAD_KINDS),
  master_prompt_ref: z.number().int().min(1).max(10).nullable(),
  parameters: z.record(z.string(), z.unknown()),
  fixture_path: z.string(),
  equivalence_check: z.string().optional(),
});

export const QualitySchema = base("quality").extend({
  scope: z.array(Id),
  test_kinds: z.array(z.enum(QUALITY_TEST_KINDS)),
  tooling: z.array(z.string()),
});

export const OperationsSchema = base("operations").extend({
  audience: z.enum(AUDIENCES),
  trigger: z.string(),
});

export const HandoffSchema = base("handoff").extend({
  session: z.string().regex(/^s[0-9]{2,}$/),
  phase: Id,
  next_action: z.string(),
  uncommitted: z.array(z.string()),
  open_questions: z.array(QuestionId),
});

export const GlossarySchema = base("glossary");
export const IndexSchema = base("index");
export const LogSchema = base("log");
export const SchemaPageSchema = base("schema");

export const StatusLiveSchema = base("status").extend({
  session: z.string().regex(/^s[0-9]{2,}$/),
  current_phase: Id,
  current_task: TaskId.nullable(),
  next_action: z.string(),
  blocked_on: z.array(z.union([Id, QuestionId])),
  last_handoff: Id.nullable(),
});

/** §6.13: id, type, title, updated, sources only; no status or approvable (raw is immutable); sources = any strings. */
export const ResearchNoteSchema = z.looseObject({
  id: Id,
  type: z.literal("research-note"),
  title: z.string().min(1),
  updated: Date10,
  // §6.13: raw notes are immutable and exempt from the §5.1 format rule (wave 0c item 2).
  sources: z.array(z.string()),
  ...optionalCommon,
});

export const SCHEMAS = {
  overview: OverviewSchema,
  component: ComponentSchema,
  phase: PhaseSchema,
  decision: DecisionSchema,
  risk: RiskSchema,
  "research-question": ResearchQuestionSchema,
  hypothesis: HypothesisSchema,
  experiment: ExperimentSchema,
  metric: MetricSchema,
  workload: WorkloadSchema,
  quality: QualitySchema,
  operations: OperationsSchema,
  handoff: HandoffSchema,
  glossary: GlossarySchema,
  index: IndexSchema,
  log: LogSchema,
  schema: SchemaPageSchema,
  status: StatusLiveSchema,
  "research-note": ResearchNoteSchema,
} as const satisfies Record<PageType, z.ZodType>;

export const PageSchema = z.discriminatedUnion("type", [
  OverviewSchema,
  ComponentSchema,
  PhaseSchema,
  DecisionSchema,
  RiskSchema,
  ResearchQuestionSchema,
  HypothesisSchema,
  ExperimentSchema,
  MetricSchema,
  WorkloadSchema,
  QualitySchema,
  OperationsSchema,
  HandoffSchema,
  GlossarySchema,
  IndexSchema,
  LogSchema,
  SchemaPageSchema,
  StatusLiveSchema,
  ResearchNoteSchema,
]);

export type Page = z.infer<typeof PageSchema>;
export type PhasePage = z.infer<typeof PhaseSchema>;
export type ComponentPage = z.infer<typeof ComponentSchema>;
export type DecisionPage = z.infer<typeof DecisionSchema>;
export type StatusLive = z.infer<typeof StatusLiveSchema>;

/** Top-level keys each type defines (for FM-UNKNOWN-KEY). */
export const KNOWN_KEYS: Readonly<Record<PageType, ReadonlySet<string>>> = Object.fromEntries(
  (Object.keys(SCHEMAS) as PageType[]).map((t) => [t, new Set(Object.keys(SCHEMAS[t].shape))]),
) as unknown as Record<PageType, ReadonlySet<string>>;

// ---------------------------------------------------------------------------------------------
// Validation -> findings
// ---------------------------------------------------------------------------------------------

function valueAt(obj: unknown, p: readonly PropertyKey[]): unknown {
  let cur: unknown = obj;
  for (const k of p) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[k];
  }
  return cur;
}

function isPageType(v: unknown): v is PageType {
  return typeof v === "string" && (PAGE_TYPES as readonly string[]).includes(v);
}

export interface ValidationResult {
  fm: Page | null;
  type: PageType | null;
  findings: LintFinding[];
}

/**
 * Validates parsed YAML frontmatter against the schema for its `type`.
 * Mapping of zod issues to SCHEMA §9.3 codes:
 * - a required field that is absent                    -> FM-MISSING
 * - an enum or literal value outside its set            -> FM-ENUM
 * - `id` failing the generic id regex                   -> ID-PATTERN
 * - any other invalid value (wrong type, bad format)    -> FM-MISSING ("required field has no valid value")
 * Unknown top-level keys -> FM-UNKNOWN-KEY (warn) and nothing more. Per-type id patterns and the
 * basename rule are checked by `checkIdAndPath`.
 */
export function validateFrontmatter(raw: unknown, repoPath: string): ValidationResult {
  const findings: LintFinding[] = [];
  const obj = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const id = typeof obj.id === "string" ? obj.id : undefined;
  const t = obj.type;
  if (t === undefined) {
    findings.push(finding("FM-MISSING", repoPath, "missing required field `type`", { id }));
    return { fm: null, type: null, findings };
  }
  if (!isPageType(t)) {
    findings.push(
      finding("FM-ENUM", repoPath, `type ${JSON.stringify(t)} is not one of ${PAGE_TYPES.join(", ")}`, { id }),
    );
    return { fm: null, type: null, findings };
  }
  const schema = SCHEMAS[t];
  for (const k of Object.keys(obj)) {
    if (!KNOWN_KEYS[t].has(k)) {
      findings.push(finding("FM-UNKNOWN-KEY", repoPath, `key \`${k}\` is not defined for type ${t}`, { id }));
    }
  }
  const res = schema.safeParse(obj);
  if (res.success) return { fm: res.data as Page, type: t, findings };
  for (const issue of res.error.issues) {
    const p = issue.path.map(String).join(".");
    const v = valueAt(obj, issue.path);
    if (v === undefined) {
      findings.push(finding("FM-MISSING", repoPath, `missing required field \`${p}\` (type ${t})`, { id }));
    } else if (issue.code === "invalid_value") {
      findings.push(finding("FM-ENUM", repoPath, `\`${p}\`: ${JSON.stringify(v)} is not allowed (${issue.message})`, { id }));
    } else if (issue.path.length === 1 && issue.path[0] === "id") {
      findings.push(finding("ID-PATTERN", repoPath, `id ${JSON.stringify(v)} is not a valid id`, { id }));
    } else {
      findings.push(
        finding("FM-MISSING", repoPath, `\`${p}\` has no valid value: ${issue.message} (got ${JSON.stringify(v)})`, { id }),
      );
    }
  }
  return { fm: null, type: t, findings };
}

/**
 * FM-TYPE-DIR and ID-PATTERN (per-type regex + basename rule, SCHEMA §5.1/§8) for a page whose
 * type is known. `wikiPath` is wiki-relative; STATUS.md passes isStatusFile.
 */
export function checkIdAndPath(
  type: PageType,
  id: string | undefined,
  wikiPath: string,
  repoPath: string,
  isStatusFile = false,
): LintFinding[] {
  const out: LintFinding[] = [];
  const allowed = allowedTypesForPath(wikiPath, isStatusFile);
  if (!allowed.has(type)) {
    const list = [...allowed].join(", ") || "none";
    out.push(finding("FM-TYPE-DIR", repoPath, `type ${type} is not allowed here (allowed: ${list})`, { id }));
  }
  if (id === undefined) return out;
  if (!idMatchesType(id, type)) {
    out.push(finding("ID-PATTERN", repoPath, `id ${id} does not match ${ID_PATTERNS[type].join(" or ")}`, { id }));
  }
  const file = wikiPath.split("/").pop() ?? "";
  const baseName = file.replace(/\.md$/, "");
  const special = (wikiPath === "SCHEMA.md" && id === "schema") || (isStatusFile && id === "status-live");
  const researchNote = type === "research-note" && "research-" + baseName === id;
  if (!special && !researchNote && baseName !== id && !baseName.startsWith(id + "-")) {
    out.push(finding("ID-PATTERN", repoPath, `basename ${baseName} does not start with id ${id}`, { id }));
  }
  return out;
}
