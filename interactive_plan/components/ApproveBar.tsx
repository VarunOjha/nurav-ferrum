"use client";
/**
 * Approve bar (ip-routes-and-views §3.4): effective state, stored decision and history, current short
 * hashes, an optional "Diff since approval", and the Approve / Request changes / Reject buttons with a
 * comment. It POSTs to /api/approvals with the hash rendered on the page (`seen_content_hash`), so a
 * file changed on disk since the page was rendered is refused (409 PAGE_CHANGED). This is the only
 * caller of the write API: one explicit owner click per decision (SCHEMA §10.1).
 */
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { DiffLine } from "@/lib/approvals/diff";
import { approvalLabel, toneOf, type Tone } from "@/lib/ui/tone";

export type Decision = "approved" | "changes-requested" | "rejected";

export interface ApproveBarRecord {
  status?: string;
  comment?: string;
  timestamp?: string;
  history?: { status?: string; comment?: string; timestamp?: string }[];
}

export interface ApproveBarProps {
  /** Approval key: a page id or `<phase-id>#exit`. */
  itemKey: string;
  /** Heading of the bar, e.g. "Page approval" or "Milestone exit". */
  label: string;
  /** Effective state (SCHEMA §10.3). */
  state: string;
  record: ApproveBarRecord | null;
  contentHash: string | null;
  scopeHash: string | null;
  /** Key `schema` only: content hash of root CLAUDE.md as rendered (ip-data-contract §6.2). */
  bootstrapHash?: string | null;
  readonly: boolean;
  /** For STALE / APPROVED_VOLATILE_DRIFT: the changed lines since the approved snapshot, or a note why there are none. */
  diff?: { lines: DiffLine[] | null; note: string | null } | null;
}

export const PAGE_CHANGED_MESSAGE = "This page changed since you loaded it – reload to review the new version";
export const COMMENT_REQUIRED_MESSAGE = "A comment is required for Request changes and Reject.";

const DECISION_TEXT: Record<Decision, string> = {
  approved: "Approve",
  "changes-requested": "Request changes",
  rejected: "Reject",
};

const short = (h: string | null) => (h ? h.replace(/^sha256:/, "").slice(0, 12) : "none");

function stateTone(state: string): Tone {
  if (state === "APPROVED_VOLATILE_DRIFT") return "purple";
  return toneOf(state === "CHANGES_REQUESTED" ? "changes-requested" : state);
}

/** Why the buttons are disabled, or null when they are enabled. */
export function disabledReason(p: Pick<ApproveBarProps, "state" | "readonly" | "contentHash" | "itemKey" | "bootstrapHash">): string | null {
  if (p.readonly) return "Read-only mode (PLAN_READONLY=1): approvals are disabled.";
  if (p.state === "INVALID") return "This key is INVALID (page not approvable, unhashable, or approvals.json invalid): fix that first, then reload.";
  if (!p.contentHash) return "The page cannot be hashed, so it cannot be approved.";
  if (p.itemKey === "schema" && !p.bootstrapHash) return "Root CLAUDE.md is missing, so `schema` cannot be approved (no bootstrap hash).";
  return null;
}

export default function ApproveBar(props: ApproveBarProps) {
  const { itemKey, label, record, contentHash, scopeHash, bootstrapHash, diff } = props;
  const router = useRouter();
  const uid = useId();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [result, setResult] = useState<{ state: string; forHash: string | null } | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // After a successful POST the bar shows the returned state until the refreshed props arrive.
  const state = result && result.forHash === contentHash ? result.state : props.state;
  const reason = disabledReason(props);
  const disabled = reason !== null || busy !== null;
  const history = Array.isArray(record?.history) ? record!.history! : [];
  const commentId = `${uid}-comment`;
  const errId = `${uid}-err`;

  async function decide(decision: Decision) {
    setError(null);
    if (decision !== "approved" && comment.trim() === "") {
      setCommentError(true);
      setError(COMMENT_REQUIRED_MESSAGE);
      return;
    }
    setCommentError(false);
    setBusy(decision);
    try {
      const body: Record<string, string> = { key: itemKey, status: decision, comment, seen_content_hash: contentHash ?? "" };
      if (itemKey === "schema" && bootstrapHash) body.seen_bootstrap_hash = bootstrapHash;
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let json: { item?: { state?: string }; error?: { code?: string; message?: string }; warnings?: { code: string; message: string }[] } = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      if (res.ok && json.item?.state) {
        const newState = json.item.state;
        setResult({ state: newState, forHash: contentHash });
        setComment("");
        const warn = json.warnings?.length ? ` (warning: ${json.warnings.map((w) => w.code).join(", ")})` : "";
        setAnnounce(`${label} for ${itemKey} recorded: ${approvalLabel(newState)}${warn}`);
        router.refresh();
      } else if (res.status === 409 && json.error?.code === "PAGE_CHANGED") {
        setError(PAGE_CHANGED_MESSAGE);
      } else {
        const code = json.error?.code ?? `HTTP ${res.status}`;
        setError(`${code}: ${json.error?.message ?? "the decision was not recorded"}`);
      }
    } catch (e) {
      setError(`The decision was not recorded: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="approve-bar" data-testid="approve-bar" data-key={itemKey} data-state={state} aria-label={`${label}: ${itemKey}`}>
      <div className="approve-head">
        <h2 className="approve-title">{label}</h2>
        <span className={`chip chip-${stateTone(state)} chip-strong`} data-testid="approve-state" title={`approval: ${state}`}>
          {approvalLabel(state)}
        </span>
        <code className="muted small">{itemKey}</code>
      </div>

      <dl className="approve-facts small">
        {record?.status ? (
          <div>
            <dt>Last decision</dt>
            <dd>
              {record.status} <span className="muted">{record.timestamp}</span>
              {record.comment ? <q className="approve-comment">{record.comment}</q> : null}
            </dd>
          </div>
        ) : (
          <div>
            <dt>Last decision</dt>
            <dd className="muted">none yet</dd>
          </div>
        )}
        <div>
          <dt>Current hashes</dt>
          <dd>
            content <code data-testid="hash-content">{short(contentHash)}</code> · scope <code>{short(scopeHash)}</code>
            {itemKey === "schema" && (
              <>
                {" "}
                · CLAUDE.md <code>{short(bootstrapHash ?? null)}</code>
              </>
            )}
          </dd>
        </div>
      </dl>

      {(state === "STALE" || state === "APPROVED_VOLATILE_DRIFT") && (
        <p className="approve-note small">
          Approved {record?.timestamp ?? ""},{" "}
          {state === "STALE" ? "content changed since: review again." : "only bookkeeping fields (status/updated) changed since."}
        </p>
      )}

      {history.length > 0 && (
        <details className="approve-history small">
          <summary>History ({history.length})</summary>
          <ol>
            {history.map((h, i) => (
              <li key={i}>
                {h.status} <span className="muted">{h.timestamp}</span>
                {h.comment ? <q className="approve-comment">{h.comment}</q> : null}
              </li>
            ))}
          </ol>
        </details>
      )}

      {diff && (state === "STALE" || state === "APPROVED_VOLATILE_DRIFT") && (
        <div className="approve-diff">
          <button type="button" className="btn btn-sm" aria-expanded={showDiff} onClick={() => setShowDiff((v) => !v)}>
            Diff since approval
          </button>
          {showDiff &&
            (diff.lines ? (
              diff.lines.length ? (
                <pre className="diff" data-testid="approve-diff">
                  {diff.lines.map((l, i) => (
                    <span key={i} className={l.op === "add" ? "diff-add" : "diff-del"}>
                      {l.op === "add" ? `+${String(l.newLine).padStart(4)} ` : `-${String(l.oldLine).padStart(4)} `}
                      {l.text}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              ) : (
                <p className="muted small">No line differs after line-ending normalisation.</p>
              )
            ) : (
              <p className="muted small">{diff.note}</p>
            ))}
        </div>
      )}

      <div className="approve-form">
        <label htmlFor={commentId} className="small">
          Comment <span className="muted">(required for Request changes and Reject)</span>
        </label>
        <textarea
          id={commentId}
          className="approve-textarea"
          rows={2}
          maxLength={4000}
          value={comment}
          disabled={reason !== null}
          aria-invalid={commentError || undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => {
            setComment(e.target.value);
            if (commentError && e.target.value.trim() !== "") setCommentError(false);
          }}
        />
        <div className="approve-buttons">
          {(Object.keys(DECISION_TEXT) as Decision[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`btn btn-sm ${d === "approved" ? "btn-primary" : d === "rejected" ? "btn-danger" : ""}`}
              disabled={disabled}
              aria-describedby={reason ? `${uid}-reason` : undefined}
              onClick={() => decide(d)}
            >
              {busy === d ? `${DECISION_TEXT[d]}…` : DECISION_TEXT[d]}
            </button>
          ))}
        </div>
        {reason && (
          <p id={`${uid}-reason`} className="approve-disabled small" data-testid="approve-disabled">
            {reason}
          </p>
        )}
        {error && (
          <p id={errId} className="approve-error small" role="alert">
            {error}
          </p>
        )}
        <p className="approve-live small" aria-live="polite" data-testid="approve-live">
          {announce}
        </p>
      </div>
    </section>
  );
}
