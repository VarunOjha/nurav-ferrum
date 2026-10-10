/**
 * The phase popup (owner-approved Phase-Modal mockup): header with status and approvals, step order,
 * tasks table (id, title, what & why as a thought chain, how we check, check script), the test gate
 * in plain words with its table and gate script, and what is the same in every phase. Server
 * component, rendered once per phase in the layout so every tab (and every phase id) can open it;
 * Modal (client) only opens and closes it. Script buttons open the script popup with the real file.
 */
import type { ApprovalsRead } from "@/lib/approvals/file";
import { phaseDialogId } from "@/lib/portal/dialogs";
import type { Phase, Roadmap } from "@/lib/portal/schemas.gen";
import { runCommand } from "@/lib/portal/scriptCommand";
import { getScriptHeader } from "@/lib/portal/server";
import { approvalLabel, phaseTone } from "@/lib/portal/view";
import CloseLink from "./CloseLink";
import Modal, { CloseModalButton } from "./Modal";
import Ref from "./Ref";
import RichText from "./RichText";
import { ScriptButton } from "./ScriptProvider";

export { phaseDialogId };

function ScriptCell({ script }: { script: string | null }) {
  if (!script) return <span className="muted">Not written yet</span>;
  return <ScriptButton path={script} />;
}

export default async function PhasePopup({
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
  const gateHeader = phase.test_gate.script ? await getScriptHeader(phase.test_gate.script) : null;
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
                <pre className="code-block code-sm">{`# Run from the repo folder in PowerShell 7
${runCommand(phase.test_gate.script)}`}</pre>
                {gateHeader && (
                  <pre className="code-block gate-header" tabIndex={0} aria-label="What the gate script says about itself" data-testid="gate-header">
                    {gateHeader}
                  </pre>
                )}
                <div className="row-between">
                  <span className="small muted">It changes nothing unless you add -SaveEvidence.</span>
                  <ScriptButton path={phase.test_gate.script} className="secondary-btn">
                    Read the whole gate script
                  </ScriptButton>
                </div>
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
            <CloseLink href="/roadmap#every-phase" className="push-right">
              How every phase works →
            </CloseLink>
          </section>
        )}
      </div>
    </Modal>
  );
}
