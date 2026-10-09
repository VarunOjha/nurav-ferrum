/**
 * Status colour families (ip-routes-and-views §2). Every badge also prints its text label, so colour
 * is never the only signal.
 */
export type Tone = "neutral" | "blue" | "amber" | "green" | "red" | "purple";

const TONES: Record<string, Tone> = {
  // neutral
  planned: "neutral",
  draft: "neutral",
  proposed: "neutral",
  open: "neutral",
  pending: "neutral",
  designed: "neutral",
  defined: "neutral",
  // blue
  ready: "blue",
  "in-progress": "blue",
  review: "blue",
  mitigating: "blue",
  investigating: "blue",
  testing: "blue",
  running: "blue",
  preregistered: "blue",
  active: "blue",
  // amber
  "gate-review": "amber",
  blocked: "amber",
  "changes-requested": "amber",
  changes_requested: "amber",
  stale: "amber",
  "awaiting-owner": "amber",
  partial: "amber",
  inconclusive: "amber",
  outdated: "amber",
  // green
  done: "green",
  accepted: "green",
  approved: "green",
  resolved: "green",
  verified: "green",
  implemented: "green",
  validated: "green",
  supported: "green",
  answered: "green",
  complete: "green",
  analyzed: "green",
  final: "green",
  // red
  rejected: "red",
  realized: "red",
  invalid: "red",
  aborted: "red",
  "not-supported": "red",
  // purple
  approved_volatile_drift: "purple",
};

export function toneOf(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  return TONES[status.toLowerCase()] ?? "neutral";
}

/** Effective approval state label (SCHEMA §10.3; APPROVED_VOLATILE_DRIFT has its own wording). */
export function approvalLabel(state: string): string {
  if (state === "APPROVED_VOLATILE_DRIFT") return "approved – bookkeeping changed";
  return state.toLowerCase().replace(/_/g, " ");
}

/** Log op chip colours (ip-routes-and-views §3.10). */
export const OP_TONES: Record<string, Tone> = {
  ingest: "blue",
  query: "neutral",
  lint: "amber",
  decide: "purple",
  handoff: "neutral",
  resume: "neutral",
  gate: "amber",
  code: "green",
  approval: "green",
  schema: "purple",
  correct: "red",
  plan: "blue",
};
