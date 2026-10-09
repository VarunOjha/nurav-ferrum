/** Status, type and approval badges (ip-routes-and-views §2): colour plus a text label, always. */
import { approvalLabel, toneOf, type Tone } from "@/lib/ui/tone";

export function Chip({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <span className={`chip chip-${toneOf(status)}`} title={`status: ${status}`}>
      <span className="chip-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function TypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  return (
    <span className="chip chip-outline" title={`type: ${type}`}>
      {type}
    </span>
  );
}

export function ApprovalBadge({ state }: { state: string }) {
  const tone: Tone = state === "APPROVED_VOLATILE_DRIFT" ? "purple" : toneOf(state === "CHANGES_REQUESTED" ? "changes-requested" : state);
  return (
    <span className={`chip chip-${tone} chip-strong`} title={`approval: ${state}`}>
      {approvalLabel(state)}
    </span>
  );
}
