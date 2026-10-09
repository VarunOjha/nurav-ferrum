/**
 * "Diff since approval" for an inbox row (ip-routes-and-views §3.11): a collapsible line diff between
 * the approval snapshot and the current file, or the no-snapshot note with the git command. Server
 * component (a native <details>, works without JS); the ApproveBar has the same view on page views.
 */
import type { SnapshotDiff } from "@/lib/server/snapshot";

export default function SnapshotDiffView({ diff, itemKey }: { diff: SnapshotDiff; itemKey: string }) {
  return (
    <details className="inbox-diff small" data-testid="inbox-diff" data-key={itemKey}>
      <summary>Diff since approval</summary>
      {diff.lines ? (
        diff.lines.length ? (
          <pre className="diff">
            {diff.lines.map((l, i) => (
              <span key={i} className={l.op === "add" ? "diff-add" : "diff-del"}>
                {l.op === "add" ? `+${String(l.newLine).padStart(4)} ` : `-${String(l.oldLine).padStart(4)} `}
                {l.text}
                {"\n"}
              </span>
            ))}
          </pre>
        ) : (
          <p className="muted">No line differs after line-ending normalisation.</p>
        )
      ) : (
        <p className="muted" data-testid="inbox-diff-note">
          {diff.note}
        </p>
      )}
    </details>
  );
}
