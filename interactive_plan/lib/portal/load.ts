/**
 * Portal data layer (adr-0023, adr-0024): reads ONLY plan/portal/*.json (plus plan/approvals.json for
 * the read-only approval labels) and validates every file with the zod schemas generated from
 * plan/portal/schema/ (scripts/gen-portal-schemas.mjs). Nothing here writes.
 *
 * A missing or invalid file never crashes a page: it becomes a `problem` with a plain message, and the
 * pages show what they can. Results are memoised on the files' size and modification time, so a page
 * view re-reads only after Claude changed a file.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { readApprovals, type ApprovalsRead } from "../approvals/file";
import type { PlanConfig } from "../config";
import {
  ArchitectureFile,
  DecisionsFile,
  LogFile,
  OverviewFile,
  PhaseFile,
  QuestionsFile,
  RefsFile,
  ResearchFile,
  RisksFile,
  RoadmapFile,
  type Architecture,
  type Decisions,
  type Log,
  type Overview,
  type Phase,
  type Questions,
  type Refs,
  type Research,
  type Risks,
  type Roadmap,
} from "./schemas.gen";

/** The part of plan/portal/pipeline.json the portal uses (that file has no JSON Schema of its own). */
export const PipelineFile = z.looseObject({
  skip_keys: z.array(z.string()),
  id_patterns: z.array(z.looseObject({ kind: z.string(), regex: z.string().min(1) })).min(1),
});
export type Pipeline = z.infer<typeof PipelineFile>;

export interface PortalFiles {
  overview: Overview | null;
  roadmap: Roadmap | null;
  /** In roadmap order (file-name order when the roadmap is unreadable). */
  phases: Phase[];
  decisions: Decisions | null;
  risks: Risks | null;
  research: Research | null;
  architecture: Architecture | null;
  questions: Questions | null;
  log: Log | null;
  refs: Refs | null;
  pipeline: Pipeline | null;
}

export interface PortalProblem {
  /** Path relative to plan/portal/. */
  file: string;
  message: string;
}

export interface Portal {
  files: PortalFiles;
  problems: PortalProblem[];
  approvals: ApprovalsRead;
}

const SINGLE = {
  overview: ["overview.json", OverviewFile],
  roadmap: ["roadmap.json", RoadmapFile],
  decisions: ["decisions.json", DecisionsFile],
  risks: ["risks.json", RisksFile],
  research: ["research.json", ResearchFile],
  architecture: ["architecture.json", ArchitectureFile],
  questions: ["questions.json", QuestionsFile],
  log: ["log.json", LogFile],
  refs: ["refs.json", RefsFile],
  pipeline: ["pipeline.json", PipelineFile],
} as const;

/** First few zod issues in plain words: "where_we_are.0.state: at most 240 characters". */
export function describeIssues(error: z.ZodError, max = 3): string {
  const parts = error.issues.slice(0, max).map((i) => `${i.path.length ? i.path.join(".") : "(whole file)"}: ${i.message}`);
  const more = error.issues.length > max ? ` (and ${error.issues.length - max} more)` : "";
  return parts.join("; ") + more;
}

/** Reads and validates one JSON file. Pure apart from the read. */
export function readPortalFile<T>(dir: string, rel: string, schema: z.ZodType<T>): { data: T | null; problem: PortalProblem | null } {
  let text: string;
  try {
    text = readFileSync(path.join(dir, rel), "utf8");
  } catch (e) {
    const missing = (e as NodeJS.ErrnoException).code === "ENOENT";
    return { data: null, problem: { file: rel, message: missing ? "the file is missing" : `the file cannot be read (${String(e)})` } };
  }
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^﻿/, ""));
  } catch (e) {
    return { data: null, problem: { file: rel, message: `not valid JSON (${(e as Error).message})` } };
  }
  const r = schema.safeParse(json);
  if (!r.success) return { data: null, problem: { file: rel, message: `does not match its shape: ${describeIssues(r.error)}` } };
  return { data: r.data, problem: null };
}

function listPhaseFiles(dir: string): string[] {
  try {
    return readdirSync(path.join(dir, "phases"))
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

/** Reads every portal file. Never throws. */
export async function loadPortalUncached(cfg: Pick<PlanConfig, "portalDir" | "approvalsFile">): Promise<Portal> {
  const dir = cfg.portalDir;
  const problems: PortalProblem[] = [];
  const one = <K extends keyof typeof SINGLE>(key: K) => {
    const [rel, schema] = SINGLE[key];
    const r = readPortalFile(dir, rel, schema as z.ZodType<unknown>);
    if (r.problem) problems.push(r.problem);
    return r.data as PortalFiles[K];
  };
  const files: PortalFiles = {
    overview: one("overview"),
    roadmap: one("roadmap"),
    phases: [],
    decisions: one("decisions"),
    risks: one("risks"),
    research: one("research"),
    architecture: one("architecture"),
    questions: one("questions"),
    log: one("log"),
    refs: one("refs"),
    pipeline: one("pipeline"),
  };
  const wanted = files.roadmap ? files.roadmap.phases.map((p) => `phases/${p.id}.json`) : listPhaseFiles(dir).map((f) => `phases/${f}`);
  for (const rel of wanted) {
    const r = readPortalFile(dir, rel, PhaseFile);
    if (r.problem) problems.push(r.problem);
    if (r.data) files.phases.push(r.data);
  }
  const approvals = await readApprovals(cfg.approvalsFile);
  return { files, problems, approvals };
}

/** Size + mtime of every file the loader reads; a change re-reads everything. */
function signature(cfg: Pick<PlanConfig, "portalDir" | "approvalsFile">): string {
  const paths = [...Object.values(SINGLE).map(([rel]) => path.join(cfg.portalDir, rel)), cfg.approvalsFile];
  for (const f of listPhaseFiles(cfg.portalDir)) paths.push(path.join(cfg.portalDir, "phases", f));
  return paths
    .map((p) => {
      try {
        const s = statSync(p);
        return `${p}:${s.size}:${s.mtimeMs}`;
      } catch {
        return `${p}:absent`;
      }
    })
    .join("|");
}

let memo: { sig: string; portal: Promise<Portal> } | null = null;

/** loadPortalUncached, memoised on the files' size and modification time. */
export function loadPortal(cfg: Pick<PlanConfig, "portalDir" | "approvalsFile">): Promise<Portal> {
  const sig = signature(cfg);
  if (memo && memo.sig === sig) return memo.portal;
  const portal = loadPortalUncached(cfg);
  memo = { sig, portal };
  return portal;
}
