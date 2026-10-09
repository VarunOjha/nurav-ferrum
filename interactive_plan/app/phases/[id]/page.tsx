// Phase detail (ip-routes-and-views §3.4): header, entry-gate checklist, entry criteria, deliverables,
// tasks, test gate (commands, manual checks, evidence ✓/✗), exit criteria, risks, decisions,
// experiments, components, the rendered body, and two approve bars (the page, and the milestone exit
// once the phase is in gate-review or done).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApproveBar from "@/components/ApproveBar";
import { ApprovalBadge, StatusBadge } from "@/components/Badges";
import CopyButton from "@/components/CopyButton";
import Markdown from "@/components/Markdown";
import { FindingsBanner, PageHeader, SourcesAndRelated } from "@/components/wiki/PageParts";
import type { ApprovalItem } from "@/lib/approvals/view";
import { CHECK_TEXT } from "@/lib/lint/gateReport";
import { approveBarProps } from "@/lib/server/approveBar";
import { config, getApprovals, getApprovalsFile, getIndex, getLint } from "@/lib/server/data";
import { approvalsMap } from "@/lib/views/dashboard";
import { evidenceChecks, exitBarVisible, riskScore } from "@/lib/views/phase";
import { entryGate } from "@/lib/wiki/gates";
import { linkTargetInfo, type WikiIndex } from "@/lib/wiki/load";
import { wikiHref } from "@/lib/wiki/routes";
import type { PhasePage } from "@/lib/wiki/schemas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/phases/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = (await getIndex()).byId.get(decodeURIComponent(id));
  const title = p?.fm && "title" in p.fm ? p.fm.title : id;
  return { title };
}

function IdRef({ idx, id }: { idx: WikiIndex; id: string }) {
  const ok = idx.byId.has(id) || /^Q-\d{3}$/.test(id);
  return (
    <a href={`/go/${encodeURIComponent(id)}`} className={ok ? "id-link" : "id-link link-missing"} title={ok ? undefined : "missing (REF-DANGLING)"}>
      {id}
    </a>
  );
}

function List({ items, empty = "none" }: { items: readonly string[]; empty?: string }) {
  if (items.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <ul className="plain-list">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="panel-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

const pageTitleOf = (idx: WikiIndex, id: string) => {
  const p = idx.byId.get(id);
  const fm = (p?.fm ?? p?.rawFm ?? null) as { title?: unknown } | null;
  return typeof fm?.title === "string" ? fm.title : null;
};

export default async function PhaseRoute({ params }: PageProps<"/phases/[id]">) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const idx = await getIndex();
  const page = idx.byId.get(id);
  const rawType = (page?.rawFm as { type?: unknown } | null)?.type;
  if (!page || (page.fm?.type !== "phase" && rawType !== "phase")) notFound();
  const cfg = config();
  const [view, file, lint] = await Promise.all([getApprovals(), getApprovalsFile(), getLint().catch(() => null)]);
  const findings = lint ? lint.findings.filter((f) => f.path === page.repoPath) : page.findings;
  const itemOf = (key: string): ApprovalItem | undefined => view.items.find((i) => i.key === key);
  const info = linkTargetInfo(idx);
  const known = (x: string) => idx.byId.has(x) || /^Q-\d{3}$/.test(x);

  if (!page.fm || page.fm.type !== "phase") {
    return (
      <article className="page">
        <FindingsBanner findings={findings} />
        <header className="page-header">
          <h1 className="page-title">{pageTitleOf(idx, id) ?? id}</h1>
          <p className="muted">
            This phase page does not validate, so the phase view cannot be built. <a href={wikiHref(page.path)}>Open it in the wiki browser</a>.
          </p>
        </header>
      </article>
    );
  }

  const ph = page.fm as PhasePage;
  const gate = entryGate(idx, approvalsMap(file), id);
  const pageItem = itemOf(id);
  const exitItem = itemOf(`${id}#exit`);
  const showExit = !!exitItem && exitBarVisible(ph.status, exitItem.record !== null);
  const [pageBar, exitBar] = await Promise.all([
    pageItem ? approveBarProps(pageItem, "Page approval", cfg, idx.bootstrapHash) : null,
    exitItem && showExit ? approveBarProps(exitItem, "Milestone exit", cfg, idx.bootstrapHash) : null,
  ]);
  const evidence = evidenceChecks(id, ph.test_gate.evidence, idx.files);

  return (
    <article className="page phase-page" data-phase={id}>
      <FindingsBanner findings={findings} />
      <PageHeader
        title={ph.title}
        id={id}
        type="phase"
        status={ph.status}
        updated={ph.updated}
        repoPath={page.repoPath}
        approvals={[pageItem, exitItem].filter((x): x is ApprovalItem => !!x)}
        approvable={ph.approvable}
      />
      <dl className="kv phase-facts">
        <div>
          <dt>Milestone</dt>
          <dd>{ph.milestone ?? "none"}</dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd className="mono">P{ph.order}</dd>
        </div>
        <div>
          <dt>Est. sessions</dt>
          <dd className="mono">{ph.est_sessions}</dd>
        </div>
        <div>
          <dt>Depends on</dt>
          <dd>
            {ph.depends_on.length === 0 ? (
              <span className="muted">nothing</span>
            ) : (
              <ul className="inline-list">
                {ph.depends_on.map((d) => (
                  <li key={d}>
                    <IdRef idx={idx} id={d} />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      <p className="small">
        <a href={wikiHref(page.path)}>Open the page in the wiki browser</a> (frontmatter, backlinks).
      </p>

      <div className="approve-row">
        {pageBar ? <ApproveBar {...pageBar} /> : <p className="muted small">This phase page is not approvable.</p>}
        {exitBar ? (
          <ApproveBar {...exitBar} />
        ) : (
          <section className="approve-bar approve-bar-closed" aria-label="Milestone exit" data-testid="exit-closed">
            <h2 className="approve-title">Milestone exit</h2>
            <p className="muted small">
              The exit approval (<code>{id}#exit</code>) opens when the phase reaches <code>gate-review</code> (status now: {ph.status}). Claude sets
              that status after the exit gate evidence is saved (SCHEMA §9.7).
            </p>
          </section>
        )}
      </div>

      <Section id="gate-title" title="Entry gate checklist">
        <ul className="gate-list" data-testid="entry-gate">
          {gate.items.map((it) => (
            <li key={it.check} className={it.ok ? "gate-ok" : "gate-fail"} data-check={it.check} data-ok={it.ok}>
              <span className={`chip chip-xs chip-${it.ok ? "green" : "amber"}`}>{it.ok ? "✓ ok" : "✗ open"}</span> {CHECK_TEXT[it.check] ?? it.check}
              {!it.ok && (
                <ul className="gate-details small">
                  {it.details.map((d) => (
                    <li key={d.id}>
                      {/^[a-z0-9][a-z0-9.-]*$|^Q-\d{3}$/.test(d.id) ? <IdRef idx={idx} id={d.id} /> : <code>{d.id}</code>} <span className="muted">{d.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {!file.valid && <p className="banner banner-red small">plan/approvals.json is invalid: the gate fails closed until it is fixed.</p>}
        {gate.bootstrapException && (
          <p className="muted small">P0 bootstrap exception (SCHEMA §9.7): no approval-based entry gate for this phase; the items above are informative.</p>
        )}
        <p className="small">
          Result:{" "}
          <strong data-testid="gate-result">{gate.ok && file.valid ? (gate.bootstrapException ? "passes (bootstrap exception)" : "passes") : "blocked"}</strong>
          <span className="muted">
            {" "}
            · dependency set {gate.dependencySet.length} ids · same check as <code>npm run gate</code> with <code>GATE_PHASE={id}</code>
          </span>
        </p>
      </Section>

      <div className="two-col">
        <Section id="entry-title" title="Entry criteria">
          <List items={ph.entry_criteria} />
        </Section>
        <Section id="deliv-title" title="Deliverables">
          <List items={ph.deliverables} />
        </Section>
      </div>

      <Section id="tasks-title" title={`Tasks (${ph.tasks.length})`}>
        {ph.tasks.length === 0 ? (
          <p className="muted small">none</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-testid="tasks">
              <thead>
                <tr>
                  <th scope="col">Id</th>
                  <th scope="col">Title</th>
                  <th scope="col">Verify</th>
                </tr>
              </thead>
              <tbody>
                {ph.tasks.map((t) => (
                  <tr key={t.id} id={`task-${t.id}`}>
                    <td className="mono">{t.id}</td>
                    <td>{t.title}</td>
                    <td className="small">{t.verify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="testgate-title" title="Test gate">
        <h3 className="section-title">Automated</h3>
        {ph.test_gate.automated.length === 0 ? (
          <p className="muted small">none</p>
        ) : (
          <ul className="cmd-list">
            {ph.test_gate.automated.map((c, i) => (
              <li key={i}>
                <code className="cmd">{c}</code>
                <CopyButton text={c} label={`Copy command ${c}`} />
              </li>
            ))}
          </ul>
        )}
        <h3 className="section-title">Manual</h3>
        <List items={ph.test_gate.manual} />
        <h3 className="section-title">Evidence</h3>
        {evidence.length === 0 ? (
          <p className="muted small">none listed</p>
        ) : (
          <ul className="plain-list" data-testid="evidence">
            {evidence.map((e) => (
              <li key={e.entry} data-exists={e.exists}>
                <span className={`chip chip-xs chip-${e.exists ? "green" : "red"}`}>{e.exists ? "✓ present" : "✗ missing"}</span>{" "}
                {e.exists ? (
                  <a href={wikiHref(e.path)} className="mono small">
                    {e.entry}
                  </a>
                ) : (
                  <span className="mono small">{e.entry}</span>
                )}
                {e.outside && <span className="muted small"> (outside raw/evidence/{id}/)</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="exit-title" title="Exit criteria">
        <List items={ph.exit_criteria} />
      </Section>

      <div className="two-col">
        <Section id="risks-title" title={`Risks (${ph.risks.length})`}>
          {ph.risks.length === 0 ? (
            <p className="muted small">none</p>
          ) : (
            <ul className="plain-list">
              {ph.risks.map((r) => {
                const fm = idx.byId.get(r)?.fm as { type?: string; likelihood?: number; impact?: number; title?: string; status?: string } | undefined;
                const score = fm?.type === "risk" && fm.likelihood && fm.impact ? riskScore(fm.likelihood, fm.impact) : null;
                return (
                  <li key={r}>
                    <IdRef idx={idx} id={r} /> {fm?.title ?? ""}{" "}
                    {score !== null && (
                      <span className="chip chip-xs chip-outline" title={`likelihood ${fm!.likelihood} × impact ${fm!.impact}`}>
                        L{fm!.likelihood}×I{fm!.impact} = {score}
                      </span>
                    )}{" "}
                    <StatusBadge status={fm?.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <Section id="decisions-title" title={`Decisions (${ph.decisions.length})`}>
          {ph.decisions.length === 0 ? (
            <p className="muted small">none</p>
          ) : (
            <ul className="plain-list">
              {ph.decisions.map((d) => {
                const it = itemOf(d);
                const fm = idx.byId.get(d)?.fm as { title?: string; status?: string } | undefined;
                return (
                  <li key={d}>
                    <IdRef idx={idx} id={d} /> {fm?.title ?? ""} <StatusBadge status={fm?.status} /> {it && <ApprovalBadge state={it.state} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <Section id="exp-title" title={`Experiments (${ph.experiments.length})`}>
          {ph.experiments.length === 0 ? (
            <p className="muted small">none</p>
          ) : (
            <ul className="plain-list">
              {ph.experiments.map((x) => (
                <li key={x}>
                  <IdRef idx={idx} id={x} /> {pageTitleOf(idx, x) ?? ""}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section id="comp-title" title={`Components (${(ph.components ?? []).length})`}>
          {(ph.components ?? []).length === 0 ? (
            <p className="muted small">none listed</p>
          ) : (
            <ul className="plain-list">
              {(ph.components ?? []).map((c) => (
                <li key={c}>
                  <IdRef idx={idx} id={c} /> {pageTitleOf(idx, c) ?? ""}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <SourcesAndRelated sources={ph.sources} related={ph.related} exists={info.exists} known={known} />

      <section className="page-body" aria-label="Page text">
        <Markdown source={page.body} path={page.path} exists={info.exists} knownIds={new Set(idx.byId.keys())} />
      </section>
    </article>
  );
}
