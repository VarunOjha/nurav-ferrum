// Decision detail (ip-routes-and-views §3.5): the approve bar, the required ADR sections (Context,
// Options considered, Decision, Consequences, Verification / evidence; a missing one is flagged), the
// supersession chain, the pages that list this ADR (backlinks from `decisions` / `related`) and the
// rendered body. An unknown or non-decision id gives 404; an invalid page shows its findings.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApproveBar from "@/components/ApproveBar";
import { StatusBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";
import { FindingsBanner, PageHeader, SourcesAndRelated } from "@/components/wiki/PageParts";
import { approveBarProps } from "@/lib/server/approveBar";
import { config, getApprovals, getIndex, getLint } from "@/lib/server/data";
import { adrSectionCheck, supersessionChain } from "@/lib/views/registers";
import { backlinkGroups } from "@/lib/wiki/backlinks";
import { linkTargetInfo } from "@/lib/wiki/load";
import { wikiHref } from "@/lib/wiki/routes";
import type { DecisionPage } from "@/lib/wiki/schemas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/decisions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = (await getIndex()).byId.get(decodeURIComponent(id));
  const title = p?.fm && "title" in p.fm ? p.fm.title : id;
  return { title };
}

export default async function DecisionRoute({ params }: PageProps<"/decisions/[id]">) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const idx = await getIndex();
  const page = idx.byId.get(id);
  const rawType = (page?.rawFm as { type?: unknown } | null)?.type;
  if (!page || (page.fm?.type !== "decision" && rawType !== "decision")) notFound();
  const [view, lint] = await Promise.all([getApprovals(), getLint().catch(() => null)]);
  const findings = lint ? lint.findings.filter((f) => f.path === page.repoPath) : page.findings;
  const info = linkTargetInfo(idx);
  const known = (x: string) => idx.byId.has(x) || /^Q-\d{3}$/.test(x);
  const titleOf = (x: string) => {
    const fm = (idx.byId.get(x)?.fm ?? null) as { title?: string } | null;
    return fm?.title ?? null;
  };

  if (!page.fm || page.fm.type !== "decision") {
    return (
      <article className="page">
        <FindingsBanner findings={findings} />
        <header className="page-header">
          <h1 className="page-title">{id}</h1>
          <p className="muted">
            This decision page does not validate, so the decision view cannot be built. <a href={wikiHref(page.path)}>Open it in the wiki browser</a>.
          </p>
        </header>
      </article>
    );
  }

  const fm = page.fm as DecisionPage;
  const item = view.items.find((i) => i.key === id);
  const bar = item ? await approveBarProps(item, "Page approval", config(), idx.bootstrapHash) : null;
  const sections = adrSectionCheck(page);
  const missing = sections.filter((s) => !s.present);
  const chain = supersessionChain(idx, id);
  const listing = backlinkGroups(idx, id).filter((g) => g.field === "decisions" || g.field === "related");

  return (
    <article className="page decision-page" data-adr={id}>
      <FindingsBanner findings={findings} />
      <PageHeader title={fm.title} id={id} type="decision" status={fm.status} updated={fm.updated} repoPath={page.repoPath} approvals={item ? [item] : []} approvable={fm.approvable} />
      <dl className="kv phase-facts">
        <div>
          <dt>Decided by</dt>
          <dd>{fm.decided_by === "owner" ? "owner-decided (confirm or overturn)" : "claude-proposed"}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd className="mono">{fm.date}</dd>
        </div>
        <div>
          <dt>Options</dt>
          <dd>{fm.options && fm.options.length ? fm.options.join(" · ") : <span className="muted">not listed</span>}</dd>
        </div>
      </dl>
      <p className="small">
        <a href={wikiHref(page.path)}>Open the page in the wiki browser</a> (frontmatter, all backlinks).
      </p>

      {bar ? <ApproveBar {...bar} /> : <p className="muted small">This decision page is not approvable.</p>}

      <div className="two-col">
        <section className="panel" aria-labelledby="sections-title">
          <h2 id="sections-title" className="panel-title">
            Required sections
          </h2>
          <ul className="plain-list" data-testid="adr-sections">
            {sections.map((s) => (
              <li key={s.section} data-present={s.present}>
                <span className={`chip chip-xs chip-${s.present ? "green" : "amber"}`}>{s.present ? "✓ present" : "✗ missing"}</span> {s.section}
              </li>
            ))}
          </ul>
          {missing.length > 0 && <p className="small">Missing or out of order (ADR-SECTIONS, SCHEMA §6.4): {missing.map((s) => s.section).join(", ")}.</p>}
        </section>

        <section className="panel" aria-labelledby="chain-title">
          <h2 id="chain-title" className="panel-title">
            Supersession chain
          </h2>
          {chain.length === 1 ? (
            <p className="muted small">Supersedes nothing and is not superseded.</p>
          ) : (
            <ol className="chain" data-testid="supersession-chain">
              {chain.map((c) => (
                <li key={c} aria-current={c === id ? "true" : undefined}>
                  {c === id ? (
                    <strong className="mono">{c}</strong>
                  ) : (
                    <a href={`/go/${encodeURIComponent(c)}`} className={known(c) ? "mono" : "mono link-missing"} title={known(c) ? undefined : "missing (REF-DANGLING)"}>
                      {c}
                    </a>
                  )}{" "}
                  {titleOf(c) ?? ""} <StatusBadge status={(idx.byId.get(c)?.fm as { status?: string } | null)?.status} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel" aria-labelledby="listed-title">
          <h2 id="listed-title" className="panel-title">
            Pages that list this ADR
          </h2>
          {listing.length === 0 ? (
            <p className="muted small">No page lists it in <code>decisions</code> or <code>related</code>.</p>
          ) : (
            <dl className="backlinks" data-testid="adr-backlinks">
              {listing.map((g) => (
                <div key={g.field} className="backlink-group" data-field={g.field}>
                  <dt>{g.field}</dt>
                  <dd>
                    <ul className="inline-list">
                      {g.ids.map((b) => (
                        <li key={b}>
                          <a href={`/go/${encodeURIComponent(b)}`} className="id-link">
                            {b}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <SourcesAndRelated sources={fm.sources} related={fm.related} exists={info.exists} known={known} />

      <section className="page-body" aria-label="Page text">
        <Markdown source={page.body} path={page.path} exists={info.exists} knownIds={new Set(idx.byId.keys())} />
      </section>
    </article>
  );
}
