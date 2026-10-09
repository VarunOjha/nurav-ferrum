// Approvals inbox (ip-routes-and-views §3.11): one row per approvable key (pages + eligible #exit keys),
// "needs attention" by default, tabs per state and the current wave, grouped by phase, orphaned
// records, and a review mode (j/k) that shows the page beside its approve bar. No bulk approve.
import type { Metadata } from "next";
import Link from "next/link";
import ApproveBar from "@/components/ApproveBar";
import { ApprovalBadge, TypeBadge } from "@/components/Badges";
import Markdown from "@/components/Markdown";
import ReviewKeys from "@/components/ReviewKeys";
import type { ApprovalItem } from "@/lib/approvals/view";
import { approveBarProps } from "@/lib/server/approveBar";
import { config, getApprovals, getIndex } from "@/lib/server/data";
import { chooseTab, eligibleItems, filterItems, groupByPhase, lastDecision, reviewCursor, TABS, waveKeys, wavePhase, type TabId } from "@/lib/views/inbox";
import { linkTargetInfo } from "@/lib/wiki/load";
import { pageHref } from "@/lib/wiki/routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approvals" };

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

const href = (tab: TabId, extra: Record<string, string> = {}) => {
  const q = new URLSearchParams({ tab, ...extra });
  return `/approvals?${q.toString()}`;
};

function Row({ it, fmPhase, openHref }: { it: ApprovalItem; fmPhase: string | null; openHref: string }) {
  const last = lastDecision(it.record);
  const changed = it.state === "STALE" || it.state === "APPROVED_VOLATILE_DRIFT";
  return (
    <tr data-key={it.key} data-state={it.state}>
      <td>
        <a href={openHref} className="mono">
          {it.key}
        </a>
      </td>
      <td>
        <TypeBadge type={it.exit ? "milestone exit" : it.type} />
      </td>
      <td>{it.title ?? <span className="muted">untitled</span>}</td>
      <td className="mono small">{fmPhase ?? ""}</td>
      <td>
        <ApprovalBadge state={it.state} />
        {it.moved && <span className="muted small"> (moved)</span>}
      </td>
      <td className="small">
        {last ? (
          <>
            {last.status} <span className="muted">{last.timestamp}</span>
            {changed && <div className="muted">approved {last.timestamp}, content changed since</div>}
          </>
        ) : (
          <span className="muted">none</span>
        )}
      </td>
      <td className="small">{last?.comment ?? ""}</td>
    </tr>
  );
}

export default async function ApprovalsRoute({ searchParams }: PageProps<"/approvals">) {
  const sp = await searchParams;
  const [idx, view] = await Promise.all([getIndex(), getApprovals()]);
  const cfg = config();
  const eligible = eligibleItems(view.items);
  const wave = waveKeys(idx);
  const tab = chooseTab({ tab: one(sp.tab), state: one(sp.state) }, eligible, wave);
  const list = filterItems(eligible, tab, wave);
  const counts = Object.fromEntries(TABS.map((t) => [t.id, filterItems(eligible, t.id, wave).length])) as Record<TabId, number>;
  const review = one(sp.review) === "1";
  const fmPhase = (it: ApprovalItem) => {
    const fm = idx.byId.get(it.id)?.fm as { phase?: string; type?: string } | undefined;
    return fm?.type === "phase" ? it.id : (fm?.phase ?? null);
  };
  const openHref = (it: ApprovalItem) => {
    const p = idx.byId.get(it.id);
    return p ? pageHref(p) : `/go/${encodeURIComponent(it.id)}`;
  };

  const tabs = (
    <nav aria-label="Approval filters" className="tabs">
      <ul className="tab-list">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link href={href(t.id)} className="tab" aria-current={t.id === tab ? "page" : undefined} data-tab={t.id}>
              {t.label} <span className="tab-count">{counts[t.id]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  if (review) {
    const cur = reviewCursor(list.length, one(sp.i));
    const it = cur ? list[cur.i] : null;
    const page = it ? idx.byId.get(it.id) : undefined;
    const bar = it ? await approveBarProps(it, it.exit ? "Milestone exit" : "Page approval", cfg, idx.bootstrapHash) : null;
    const info = linkTargetInfo(idx);
    const prevHref = cur && cur.prev !== null ? href(tab, { review: "1", i: String(cur.prev) }) : null;
    const nextHref = cur && cur.next !== null ? href(tab, { review: "1", i: String(cur.next) }) : null;
    return (
      <article className="page page-wide">
        <header className="page-header">
          <p className="eyebrow">Approvals · review mode</p>
          <h1 className="page-title">{it ? (it.title ?? it.key) : "Nothing to review"}</h1>
          <p className="muted small">
            {cur ? `${cur.i + 1} of ${list.length}` : "0 items"} in “{TABS.find((t) => t.id === tab)!.label}” · <kbd>j</kbd> next · <kbd>k</kbd> previous ·{" "}
            <Link href={href(tab)}>back to the list</Link>
          </p>
        </header>
        {tabs}
        <ReviewKeys prev={prevHref} next={nextHref} />
        <div className="review-nav">
          {prevHref ? (
            <Link href={prevHref} className="btn btn-sm" rel="prev">
              ← Previous
            </Link>
          ) : (
            <span className="btn btn-sm" aria-disabled="true">
              ← Previous
            </span>
          )}
          {nextHref ? (
            <Link href={nextHref} className="btn btn-sm" rel="next">
              Next →
            </Link>
          ) : (
            <span className="btn btn-sm" aria-disabled="true">
              Next →
            </span>
          )}
        </div>
        {it && page && bar && (
          <div className="review-layout">
            <div className="review-page page-body">
              <p className="small">
                <a href={openHref(it)}>Open the full page view</a> · <code>{it.path}</code>
              </p>
              <Markdown source={page.body} path={page.path} exists={info.exists} knownIds={new Set(idx.byId.keys())} />
            </div>
            <aside className="review-side" aria-label="Approve bar">
              <ApproveBar {...bar} />
            </aside>
          </div>
        )}
      </article>
    );
  }

  const groups = groupByPhase(idx, list);
  const wp = wavePhase(idx);
  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Approvals</h1>
        <p className="muted">
          {eligible.length} approvable keys · approvals file <code>{view.file.path}</code>{" "}
          {!view.file.exists ? "(absent: every key is pending)" : view.file.valid ? "(valid)" : <strong className="text-red">(INVALID: every key shows as invalid)</strong>}
          {view.readonly && " · read-only mode"}
        </p>
        <p className="muted small">
          Every decision is one click on one page (no bulk approve, SCHEMA §10.1). “Current wave” = the dependency set of the entry gate of{" "}
          {wp ? <a href={`/go/${wp}`}>{wp}</a> : "the next phase"}.
        </p>
      </header>
      {tabs}
      <p className="small">
        {list.length > 0 ? (
          <Link href={href(tab, { review: "1", i: "0" })} className="btn btn-sm btn-primary">
            Review these {list.length} one by one
          </Link>
        ) : null}
      </p>
      {list.length === 0 ? (
        <p className="muted" data-testid="inbox-empty">
          Nothing in this tab.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.phase ?? "cross"} className="panel" aria-labelledby={`g-${g.phase ?? "cross"}`}>
            <h2 id={`g-${g.phase ?? "cross"}`} className="panel-title">
              {g.phase ? (
                <>
                  <a href={`/phases/${g.phase}`}>{g.title}</a> <code className="muted small">{g.phase}</code>
                </>
              ) : (
                g.title
              )}{" "}
              <span className="muted small">{g.items.length}</span>
            </h2>
            <div className="table-wrap">
              <table className="data-table inbox-table">
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Type</th>
                    <th scope="col">Title</th>
                    <th scope="col">Phase</th>
                    <th scope="col">State</th>
                    <th scope="col">Last decision</th>
                    <th scope="col">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((it) => (
                    <Row key={it.key} it={it} fmPhase={fmPhase(it)} openHref={openHref(it)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
      <section className="panel" aria-labelledby="orphans-title">
        <h2 id="orphans-title" className="panel-title">
          Orphaned approvals <span className="muted small">{view.orphans.length}</span>
        </h2>
        {view.orphans.length === 0 ? (
          <p className="muted small">None: every stored key resolves to an approvable page.</p>
        ) : (
          <ul className="plain-list" data-testid="orphans">
            {view.orphans.map((o) => (
              <li key={o.key}>
                <code>{o.key}</code> <ApprovalBadge state="INVALID" /> <span className="muted small">kept in approvals.json; never deleted</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
