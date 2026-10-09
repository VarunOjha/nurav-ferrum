/**
 * Gate report (ip-wiki-lint §4; `npm run gate`): the SCHEMA §9.7 entry-gate checklist of one phase
 * (lib/wiki/gates.ts entryGate) plus the effective approval state of every id in its dependency set.
 * Pure: reads the WikiIndex and the approvals passed in; never writes anything.
 */
import { countsAsApproved, stateOf } from "../approvals/state";
import { entryGate, type EntryGate } from "../wiki/gates";
import type { WikiIndex } from "../wiki/load";
import type { ApprovalsInput } from "./types";

export interface GateReport {
  gate: EntryGate;
  /** False when the gate fails, or when approvals.json is invalid (fail closed, even for the bootstrap phase). */
  ok: boolean;
  text: string;
}

export const CHECK_TEXT: Record<string, string> = {
  "phase-exists": "the phase page exists and is valid",
  "dependencies-done": "1. every depends_on phase has status done and an approved #exit",
  "dependency-set-approved": "2. every id of the dependency set counts as approved",
  "no-blocking-questions": "3. no open Q-NNN blocks an id of the dependency set",
  "no-unregistered-contradictions": "4. no unregistered CONTRADICTION blockquote on a page of the set",
};

export function gateReport(
  idx: Pick<WikiIndex, "byId" | "pages" | "openQuestions" | "bootstrapHash" | "status">,
  approvals: ApprovalsInput & { path: string },
  phaseId: string,
  source: string,
): GateReport {
  const gate = entryGate(idx, approvals.approvals, phaseId);
  const lines: string[] = [];
  lines.push(`gate: entry of ${phaseId} (${source}), SCHEMA §9.7`);
  lines.push(
    `approvals: ${approvals.path} ${!approvals.exists ? "absent (every key PENDING)" : approvals.valid ? "valid" : `INVALID (${approvals.error ?? "?"}): fail closed`}`,
  );
  if (gate.dependencySet.length > 0) lines.push(`[x] ${CHECK_TEXT["phase-exists"]}`);
  for (const it of gate.items) {
    lines.push(`[${it.ok ? "x" : " "}] ${CHECK_TEXT[it.check] ?? it.check}${it.ok ? "" : ": " + it.details.map((d) => `${d.id} (${d.detail})`).join(", ")}`);
  }
  if (gate.dependencySet.length > 0) {
    lines.push(`dependency set (${gate.dependencySet.length}):`);
    const w = Math.max(...gate.dependencySet.map((id) => id.length));
    for (const id of gate.dependencySet) {
      const s = stateOf(id, approvals.approvals, idx);
      lines.push(`  ${id.padEnd(w)}  ${s}${countsAsApproved(s) ? "" : "  (does not count as approved)"}`);
    }
  }
  if (gate.bootstrapException) {
    lines.push("P0 bootstrap exception (SCHEMA §9.7): no approval-based entry gate; the items above are informative.");
  }
  const ok = gate.ok && approvals.valid;
  const failing = gate.items.filter((i) => !i.ok).flatMap((i) => i.ids);
  lines.push(ok ? `result: PASSED${gate.bootstrapException ? " (bootstrap exception)" : ""}` : `result: BLOCKED: ${approvals.valid ? failing.join(", ") : "approvals.json invalid"}`);
  return { gate, ok, text: lines.join("\n") };
}
