// Roadmap tab (owner-approved Roadmap mockup): the three stages, then one compact row per phase. No
// dependencies and no timelines (owner feedback 2026-10-09). A phase name opens the phase popup;
// "Same in every phase" lists what every phase shares, once. Reads roadmap.json.
import type { Metadata } from "next";
import { OpenModalButton } from "@/components/portal/Modal";
import PageHead from "@/components/portal/PageHead";
import RichText from "@/components/portal/RichText";
import { phaseDialogId } from "@/lib/portal/dialogs";
import { getPortal } from "@/lib/portal/server";
import { ui } from "@/lib/portal/uiRefs";
import { phaseTone, stageRange, tasksLabel } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const { files } = await getPortal();
  const { roadmap, phases } = files;
  const hasPopup = new Set(phases.map((p) => p.id));

  return (
    <div className="page">
      <PageHead title="Roadmap" summary={roadmap?.summary ?? null} uiRef="RM-1" />
      {roadmap && (
        <>
          <section aria-label="Stages" className="stage-grid" data-testid="stages" {...ui("RM-2")}>
            {roadmap.stages.map((st, i) => (
              <div key={st.id} className={`card stage-card stage-${(i % 3) + 1}`} {...ui("RM-2", { index: i + 1, pos: "inside" })}>
                <div className="stage-label">
                  Stage {i + 1} · {st.name}
                </div>
                <div className="strong">{stageRange(roadmap, st)}</div>
                <p className="small text-2 lh">
                  <RichText text={st.summary} />
                </p>
              </div>
            ))}
          </section>

          <section aria-labelledby="phases-title" className="stack-12" {...ui("RM-3")}>
            <div className="row-between">
              <h2 id="phases-title" className="h2">
                Phases
              </h2>
              <span className="small muted">Click a phase name to open it in a popup</span>
            </div>
            <div className="table-wrap">
              <table className="table rtable roadmap-table" data-testid="roadmap-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-short">
                      Phase
                    </th>
                    <th scope="col" className="col-name">
                      Name
                    </th>
                    <th scope="col">Outcome in one line</th>
                    <th scope="col" className="col-status">
                      Status
                    </th>
                    <th scope="col" className="col-tasks">
                      Tasks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roadmap.phases.map((p) => {
                    const tone = phaseTone(p.status);
                    return (
                      <tr key={p.id} className={tone === "now" ? "row-now" : undefined}>
                        <td className="mono muted" data-label="Phase">
                          {p.short}
                        </td>
                        <th scope="row" data-label="Name" className="rtable-name">
                          {hasPopup.has(p.id) ? (
                            <OpenModalButton target={phaseDialogId(p.id)} className="link-btn" label={`${p.short} ${p.name}: open the phase popup`}>
                              {p.name}
                            </OpenModalButton>
                          ) : (
                            p.name
                          )}
                        </th>
                        <td className="text-2" data-label="Outcome">
                          <RichText text={p.one_line_goal} />
                        </td>
                        <td data-label="Status">
                          <span className={`chip chip-${tone}`}>{p.status}</span>
                        </td>
                        <td className="text-2" data-label="Tasks">
                          {tasksLabel(p.tasks_done, p.tasks_total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="every-phase" aria-labelledby="every-title" className="card stack-14" tabIndex={-1} {...ui("RM-4")}>
            <h2 id="every-title" className="h2">
              Same in every phase
            </h2>
            <ul className="every-grid">
              {roadmap.same_in_every_phase.map((s) => (
                <li key={s.id} className="stack-4">
                  <span className="strong">
                    <RichText text={s.title} />
                  </span>
                  <span className="small text-2 lh">
                    <RichText text={s.summary} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
