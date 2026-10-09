// /search?q=&type= (ip-routes-and-views §3.9): ranked full-text results with type/status badges,
// highlighted snippets and a type filter.
import type { Metadata } from "next";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { getIndex } from "@/lib/server/data";
import { pageHref } from "@/lib/wiki/routes";
import { buildSearchIndex, search, typeCounts, type SearchField } from "@/lib/wiki/search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

const FIELD_LABEL: Record<SearchField, string> = {
  id: "exact id",
  title: "title / id",
  alias: "alias",
  tag: "tag",
  heading: "heading",
  body: "text",
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const type = one(sp.type).trim() || null;
  const idx = await getIndex();
  const docs = buildSearchIndex(idx);
  const all = q ? search(docs, q) : [];
  const hits = type ? all.filter((h) => (h.doc.type ?? (h.doc.kind === "raw" ? "raw" : "other")) === type) : all;
  const facets = typeCounts(all);
  const qs = (t: string | null) => "/search?q=" + encodeURIComponent(q) + (t ? "&type=" + encodeURIComponent(t) : "");

  return (
    <article className="page narrow-wide">
      <header className="page-header">
        <h1 className="page-title">Search</h1>
        <form method="get" action="/search" className="search-form" role="search" aria-label="Search the wiki">
          <label htmlFor="search-q" className="sr-only">
            Query
          </label>
          <input id="search-q" name="q" type="search" defaultValue={q} placeholder="id, title, tag, heading or any word" />
          {type && <input type="hidden" name="type" value={type} />}
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <p className="muted small">Ranking: exact id, then title, alias or tag, heading, then body text. Case-insensitive.</p>
      </header>

      {q === "" ? (
        <p className="muted">Type a query above, or press / anywhere to use the search box in the top bar.</p>
      ) : (
        <>
          <nav aria-label="Filter by type" className="facets">
            <a href={qs(null)} className="facet" aria-current={type === null ? "true" : undefined}>
              All <span className="facet-count">{all.length}</span>
            </a>
            {facets.map(([t, n]) => (
              <a key={t} href={qs(t)} className="facet" aria-current={type === t ? "true" : undefined}>
                {t} <span className="facet-count">{n}</span>
              </a>
            ))}
          </nav>
          <p className="result-count" aria-live="polite">
            {hits.length} result{hits.length === 1 ? "" : "s"} for <strong>“{q}”</strong>
            {type ? ` in ${type}` : ""}
          </p>
          <ol className="results">
            {hits.slice(0, 200).map((h) => {
              const p = idx.byPath.get(h.doc.path);
              const href = p ? pageHref(p) : "#";
              return (
                <li key={h.doc.path} className="result" data-field={h.field}>
                  <div className="result-head">
                    <a href={href} className="result-title">
                      {h.doc.title}
                    </a>
                    <TypeBadge type={h.doc.type ?? (h.doc.kind === "raw" ? "raw" : null)} />
                    <StatusBadge status={h.doc.status} />
                    <span className="chip chip-xs chip-neutral" title="matched field">
                      {FIELD_LABEL[h.field]}
                    </span>
                  </div>
                  <div className="result-path mono small muted">
                    {h.doc.id ? <span>{h.doc.id} · </span> : null}wiki/{h.doc.path}
                  </div>
                  {h.snippet && (
                    <p className="result-snippet">
                      {h.snippet.before}
                      <mark>{h.snippet.match}</mark>
                      {h.snippet.after}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {hits.length > 200 && <p className="muted small">Showing the first 200 results.</p>}
        </>
      )}
    </article>
  );
}
