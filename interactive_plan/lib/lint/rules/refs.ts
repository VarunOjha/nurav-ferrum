/**
 * Loader-reported codes, REF-DANGLING, REF-RECIPROCAL and ORPHAN (ip-wiki-lint §2; SCHEMA §9.3).
 */
import { finding, SEVERITY, type LintFinding } from "../../wiki/findings";
import { checkLinks, frontmatterRefs, TASK_REF_FIELDS } from "../../wiki/links";
import { linkTargetInfo, type WikiIndex } from "../../wiki/load";
import { QUESTION_ID_PATTERN, sourcePath } from "../../wiki/schemas";
import type { LintContext, Rule } from "../types";
import { fmObj, isPage, isSingleton, taskIds } from "../util";

/**
 * Codes the loader and its parsers (frontmatter, schemas, log, open questions) attach to pages
 * (ip-data-contract §2-§5). The lint reports them as they are; one rule per code.
 */
export const LOADER_CODES = [
  "FILE-ENCODING",
  "FM-MISSING",
  "FM-ENUM",
  "FM-TYPE-DIR",
  "FM-UNKNOWN-KEY",
  "FM-VOLATILE",
  "FM-YAML-SUBSET",
  "ID-PATTERN",
  "ID-DUP",
  "LOG-FORMAT",
  "Q-FORMAT",
] as const;

export const loaderRules: Rule[] = LOADER_CODES.map((code) => ({
  code,
  severity: SEVERITY[code],
  run: (ctx: LintContext) => ctx.idx.pages.flatMap((p) => p.findings.filter((f) => f.code === code)),
}));

const QUESTION_ID = new RegExp(QUESTION_ID_PATTERN);

/** Does a wiki-relative path name an existing file (or directory)? */
function wikiFileExists(idx: WikiIndex, rel: string): boolean {
  return idx.files.has(rel) || idx.files.has(rel + "/");
}

export const refDangling: Rule = {
  code: "REF-DANGLING",
  severity: "error",
  run({ idx }) {
    const out: LintFinding[] = [];
    const tasks = taskIds(idx);
    const questions = new Set(idx.openQuestions.map((q) => q.id));
    const info = linkTargetInfo(idx);
    for (const p of idx.pages) {
      if (!isPage(p)) continue;
      const fm = fmObj(p);
      for (const r of frontmatterRefs(fm)) {
        const ok = idx.byId.has(r.id) || (r.field === "blocked_on" && QUESTION_ID.test(r.id) && questions.has(r.id));
        if (!ok) out.push(finding("REF-DANGLING", p.repoPath, `${r.field} → ${r.id} does not resolve`, { id: p.id }));
      }
      for (const f of TASK_REF_FIELDS) {
        const v = fm[f];
        if (typeof v === "string" && !tasks.has(v)) {
          out.push(finding("REF-DANGLING", p.repoPath, `${f} → ${v} matches no phase task`, { id: p.id }));
        }
      }
      // SCHEMA §5.1: sources path entries must exist; raw research notes are exempt (§6.13).
      if (p.kind !== "raw-research" && Array.isArray(fm.sources)) {
        for (const s of fm.sources) {
          const rel = typeof s === "string" ? sourcePath(s) : null;
          if (rel !== null && !wikiFileExists(idx, rel)) {
            out.push(finding("REF-DANGLING", p.repoPath, `sources → ${s} names a missing file`, { id: p.id }));
          }
        }
      }
      // Phases named by integrity tags and by the frontmatter `unverified` list (decided 2026-10-09, IP-5).
      if (p.kind === "wiki" || p.kind === "status") {
        for (const t of p.unverifiedTags) {
          if (idx.byId.get(t.phase)?.fm?.type !== "phase") {
            out.push(finding("REF-DANGLING", p.repoPath, `integrity tag names ${t.phase}, which is not a phase page`, { id: p.id, line: t.line }));
          }
        }
        const u = Array.isArray(fm.unverified) ? fm.unverified : [];
        for (const x of u) {
          const v = x !== null && typeof x === "object" ? (x as Record<string, unknown>).verify_in : undefined;
          if (typeof v === "string" && idx.byId.get(v)?.fm?.type !== "phase") {
            out.push(finding("REF-DANGLING", p.repoPath, `unverified[].verify_in → ${v} is not a phase page`, { id: p.id }));
          }
        }
      }
      // Body links. index.md lines are checked by INDEX-MISSING (one finding per broken line, not two).
      if (p.path !== "index.md") out.push(...checkLinks(p.links, p.repoPath, info, p.id));
    }
    return out;
  },
};

type Fm = Record<string, unknown>;
const list = (fm: Fm, key: string): string[] =>
  Array.isArray(fm[key]) ? (fm[key] as unknown[]).filter((x): x is string => typeof x === "string") : [];

/** Valid pages of a type, by id. */
function byType(idx: Pick<WikiIndex, "pages" | "byId">, type: string): Map<string, Fm> {
  const out = new Map<string, Fm>();
  for (const p of idx.pages) if (p.fm?.type === type && idx.byId.get(p.fm.id) === p) out.set(p.fm.id, p.fm as Fm);
  return out;
}

/**
 * REF-RECIPROCAL findings (rq.hypotheses <-> hyp.rq, hyp.experiments <-> exp.hypotheses). Exported so
 * the /research view lists the same mismatches as the lint (ip-routes-and-views §3.8, IP-8).
 */
export function reciprocalFindings(idx: Pick<WikiIndex, "pages" | "byId">): LintFinding[] {
  const out: LintFinding[] = [];
  const rqs = byType(idx, "research-question");
  const hyps = byType(idx, "hypothesis");
  const exps = byType(idx, "experiment");
  const at = (id: string) => idx.byId.get(id)!.repoPath;
  // rq.hypotheses <-> hyp.rq
  for (const [rq, fm] of rqs) {
    for (const h of list(fm, "hypotheses")) {
      const hfm = hyps.get(h);
      if (hfm && hfm.rq !== rq) {
        out.push(finding("REF-RECIPROCAL", at(rq), `${rq} lists hypothesis ${h}, but ${h}.rq is ${String(hfm.rq)}`, { id: rq }));
      }
    }
  }
  for (const [h, fm] of hyps) {
    const rq = typeof fm.rq === "string" ? fm.rq : null;
    const rfm = rq ? rqs.get(rq) : undefined;
    if (rq && rfm && !list(rfm, "hypotheses").includes(h)) {
      out.push(finding("REF-RECIPROCAL", at(h), `${h}.rq is ${rq}, but ${rq}.hypotheses does not list ${h}`, { id: h }));
    }
    // hyp.experiments <-> exp.hypotheses
    for (const e of list(fm, "experiments")) {
      const efm = exps.get(e);
      if (efm && !list(efm, "hypotheses").includes(h)) {
        out.push(finding("REF-RECIPROCAL", at(h), `${h} lists experiment ${e}, but ${e}.hypotheses does not list ${h}`, { id: h }));
      }
    }
  }
  for (const [e, fm] of exps) {
    for (const h of list(fm, "hypotheses")) {
      const hfm = hyps.get(h);
      if (hfm && !list(hfm, "experiments").includes(e)) {
        out.push(finding("REF-RECIPROCAL", at(e), `${e} lists hypothesis ${h}, but ${h}.experiments does not list ${e}`, { id: e }));
      }
    }
  }
  return out;
}

export const refReciprocal: Rule = {
  code: "REF-RECIPROCAL",
  severity: "error",
  run: ({ idx }) => reciprocalFindings(idx),
};

/** Ids citing each wiki-relative path in their `sources` (a citation is an inbound reference too). */
function sourceCiters(idx: WikiIndex): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const p of idx.pages) {
    if (!isPage(p)) continue;
    const s = fmObj(p).sources;
    if (!Array.isArray(s)) continue;
    for (const e of s) {
      const rel = typeof e === "string" ? sourcePath(e) : null;
      if (rel === null) continue;
      let set = out.get(rel);
      if (!set) out.set(rel, (set = new Set()));
      set.add(p.id);
    }
  }
  return out;
}

/** Links from index.md and log.md do not count (everything is in the index; ip-wiki-lint §2). */
const NOT_INBOUND = new Set(["index", "log"]);

export const orphan: Rule = {
  code: "ORPHAN",
  severity: "warn",
  run({ idx }) {
    const out: LintFinding[] = [];
    const citers = sourceCiters(idx);
    for (const p of idx.pages) {
      if (!isPage(p) || isSingleton(p.id) || p.kind === "status") continue;
      if (idx.byId.get(p.id) !== p) continue; // duplicate id: ID-DUP covers it
      const inbound = new Set<string>([...(idx.backlinks.get(p.id) ?? []), ...(citers.get(p.path) ?? [])]);
      for (const x of NOT_INBOUND) inbound.delete(x);
      inbound.delete(p.id);
      if (inbound.size === 0) {
        out.push(finding("ORPHAN", p.repoPath, `${p.id} has no inbound reference from another page`, { id: p.id }));
      }
    }
    return out;
  },
};
