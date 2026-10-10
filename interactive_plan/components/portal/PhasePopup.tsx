/**
 * The phase popup (owner-approved Phase-Modal mockup): header with status and approvals, step order,
 * tasks table (id, title, what & why as a thought chain, how we check, check script), the test gate
 * in plain words with its table and gate script, and what is the same in every phase. Server
 * component; Modal (client) only opens and closes it.
 */
import Link from "next/link";
import type { ApprovalsRead } from "@/lib/approvals/file";
import type { Phase, Roadmap } from "@/lib/portal/schemas.gen";
import { approvalLabel, phaseTone } from "@/lib/portal/view";
import Modal, { CloseModalButton } from "./Modal";
import Ref from "./Ref";
import RichText from "./RichText";

export const phaseDialogId = (id: string) => `phase-dialog-${id}`;

const runCommand = (script: string) => `pwsh -NoProfile -File ${script}`;

function ScriptCell({ script }: { script: string | null }) {
  if (!script) return <span className="muted">Not written yet</span>;
  const name = script.split("/").pop() ?? script;
  return (
    <code className="script-chip" title={`Run in PowerShell 7 from the repo folder: ${runCommand(script)}`}>
      {name}
    </code>
  );
}

export default function PhasePopup({
  phase,
  sameInEveryPhase,
  approvals,
}: {
  phase: Phase;
  sameInEveryPhase: Roadmap["same_in_every_phase"];
  approvals: ApprovalsRead;
}) {
  const titleId = `${phaseDialogId(phase.id)}-title`;
  const tone = phaseTone(phase.status);
  const planApproval = approvalLabel(approvals, phase.id, phase.source.content_hash);
  const exitApproval = approvalLabel(approvals, `${phase.id}#exit`, phase.source.content_hash);
  return (
    <Modal id={phaseDialogId(phase.id)} labelledBy={titleId} className="phase-modal">
      <div className="phase-head">
        <div className="phase-head-text">
          <div className="phase-head-meta">
            <span className="mono muted">{phase.short}</span>
            <span className={`chip chip-${tone}`}>{phase.status}</span>
            <span className="muted small">
              {phase.progress.done} of {phase.progress.total} tasks done
            </span>
          </div>
          <h2 id={titleId} className="phase-title">
            {phase.title}
          </h2>
          <p className="phase-summary">
            <RichText text={phase.summary} />
          </p>
          <p className="small muted" data-testid="phase-approvals">
            Your approval of this plan: <strong>{planApproval}</strong> · Your approval to finish it: <strong>{exitApproval}</strong>
          </p>
        </div>
        <CloseModalButton />
      </div>

      <div className="phase-body">
        <section className="stack-12" aria-labelledby={`${titleId}-steps`}>
          <h3 id={`${titleId}-steps`} className="h3">
            Step order
          </h3>
          <ol className="steps">
            {phase.step_order.map((s, i) => (
              <li key={i} className="step">
                <span className="step-pill">
                  {i + 1} · {s}
                </span>
                {i < phase.step_order.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="step-arrow">
                    <path d="M5 12 H19 M13 6 L19 12 L13 18" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="stack-12" aria-labelledby={`${titleId}-tasks`}>
          <div className="row-between">
            <h3 id={`${titleId}-tasks`} className="h3">
              Tasks
            </h3>
            <span className="small muted">Each check script is kept in the repo so it can be re-run any time</span>
          </div>
          <div className="table-wrap">
            <table className="table tasks-table">
              <thead>
                <tr>
                  <th scope="col" className="col-id">
                    Id
                  </th>
                  <th scope="col" className="col-title">
                    Title
                  </th>
                  <th scope="col">What &amp; why</th>
                  <th scope="col" className="col-check">
                    How we check
                  </th>
                  <th scope="col" className="col-script">
                    Check script
                  </th>
                </tr>
              </thead>
              <tbody>
                {phase.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Ref id={t.id} variant="code" />
                    </td>
                    <td className="strong">
                      <RichText text={t.title} />
                    </td>
                    <td className="text-2">
                      <RichText text={t.chain} />
                    </td>
                    <td className="text-2">
                      <RichText text={t.check} />
                    </td>
                    <td>
                      <ScriptCell script={t.script} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="split">
          <div className="split-main stack-12">
            <h3 className="h3">Test gate: when is {phase.short} finished?</h3>
            <p className="text-2 lh">
              <RichText text={phase.test_gate.explanation} />
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Check</th>
                    <th scope="col">Proves</th>
                  </tr>
                </thead>
                <tbody>
                  {phase.test_gate.rows.map((g, i) => (
                    <tr key={i}>
                      <td className="strong">
                        <RichText text={g.check} />
                      </td>
                      <td className="text-2">
                        <RichText text={g.proves} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="split-main stack-12">
            <div className="row-between">
              <h3 className="h3">Gate script</h3>
              {phase.test_gate.script && <span className="mono small muted">{phase.test_gate.script}</span>}
            </div>
            {phase.test_gate.script ? (
              <>
                <pre className="code-block">
                  {`# Run from the repo folder in PowerShell 7\n${runCommand(phase.test_gate.script)}\n\n# Ends with PASS (exit 0), FAIL (exit 1)\n# or NOT READY (exit 2: waiting on you or on earlier work)`}
                </pre>
                <p className="small muted">The script explains each step at its top. It changes nothing unless you add -SaveEvidence.</p>
              </>
            ) : (
              <p className="muted">Not written yet.</p>
            )}
          </div>
        </section>

        {sameInEveryPhase.length > 0 && (
          <section className="same-strip" aria-label="Same in every phase">
            <span className="strong">Same in every phase:</span>
            {sameInEveryPhase.map((s, i) => (
              <span key={s.id} className="same-item">
                {i > 0 && (
                  <span aria-hidden="true" className="dot">
                    ·
                  </span>
                )}
                <span title={s.summary}>{s.title}</span>
              </span>
            ))}
            <Link href="/roadmap" className="push-right">
              How every phase works →
            </Link>
          </section>
        )}
      </div>
    </Modal>
  );
}
