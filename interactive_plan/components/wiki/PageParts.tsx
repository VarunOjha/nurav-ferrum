/**
 * Page shell pieces for page-backed views (ip-routes-and-views §2, §3.7): findings banner, header
 * (title, id + copy, badges, updated, approval), source/related links, frontmatter panel, backlinks.
 */
import { ApprovalBadge, StatusBadge, TypeBadge } from "@/components/Badges";
import CopyButton from "@/components/CopyButton";
import type { ApprovalItem } from "@/lib/approvals/view";
import type { LintFinding } from "@/lib/wiki/findings";
import type { BacklinkGroup } from "@/lib/wiki/backlinks";
import { REF_FIELDS } from "@/lib/wiki/links";
import { wikiHref } from "@/lib/wiki/routes";
import { sourcePath } from "@/lib/wiki/schemas";

const SEV_LABEL = { error: "error", warn: "warning", info: "info" } as const;

export function FindingsBanner({ findings }: { findings: LintFinding[] }) {
  if (findings.length === 0) return null;
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const tone = errors ? "red" : warns ? "amber" : "grey";
  return (
    <section className={`findings banner-${tone}`} aria-label="Lint findings for this page">
      <details open={errors > 0}>
        <summary>
          <strong>{errors ? "Schema / lint errors" : warns ? "Lint warnings" : "Lint notes"}</strong>{" "}
          <span className="muted">
            {errors} error{errors === 1 ? "" : "s"}, {warns} warning{warns === 1 ? "" : "s"}, {findings.length - errors - warns} info
          </span>
        </summary>
        <ul className="findings-list">
          {findings.map((f, i) => (
            <li key={i} className={`finding finding-${f.severity}`}>
              <span className={`chip chip-xs chip-${f.severity === "error" ? "red" : f.severity === "warn" ? "amber" : "neutral"}`}>
                {SEV_LABEL[f.severity]}
              </span>{" "}
              <code>{f.code}</code>
              {f.line ? <span className="muted"> line {f.line}</span> : null} {f.message}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function PageHeader({
  title,
  id,
  type,
  status,
  updated,
  repoPath,
  approvals,
  approvable,
}: {
  title: string;
  id: string | null;
  type: string | null;
  status: string | null;
  updated: string | null;
  repoPath: string;
  approvals: ApprovalItem[];
  approvable: boolean;
}) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      <div className="page-meta">
        {id && (
          <span className="page-id">
            <code>{id}</code>
            <CopyButton text={id} label={`Copy id ${id}`} />
          </span>
        )}
        <TypeBadge type={type} />
        <StatusBadge status={status} />
        {updated && <span className="muted small">updated {updated}</span>}
        {approvals.map((a) => (
          <span key={a.key} className="approval-pill">
            <span className="muted small">{a.exit ? "exit" : "approval"}</span> <ApprovalBadge state={a.state} />
          </span>
        ))}
        {!approvable && id && <span className="muted small">not approvable</span>}
      </div>
      <p className="editor-hint small">
        <span className="muted">Open in editor:</span> <code>{repoPath}</code>
        <CopyButton text={repoPath} label={`Copy path ${repoPath}`} />
      </p>
    </header>
  );
}

function IdLink({ id, known }: { id: string; known: (id: string) => boolean }) {
  const ok = known(id);
  return (
    <a href={`/go/${encodeURIComponent(id)}`} className={ok ? "id-link" : "id-link link-missing"} title={ok ? undefined : "missing (REF-DANGLING)"}>
      {id}
    </a>
  );
}

export function SourcesAndRelated({
  sources,
  related,
  exists,
  known,
}: {
  sources: string[];
  related: string[];
  exists: (wikiPath: string) => boolean;
  known: (id: string) => boolean;
}) {
  if (sources.length === 0 && related.length === 0) return null;
  return (
    <dl className="refs">
      {sources.length > 0 && (
        <>
          <dt>Sources</dt>
          <dd>
            <ul className="inline-list">
              {sources.map((s) => {
                if (/^https:\/\//.test(s)) {
                  return (
                    <li key={s}>
                      <a href={s} rel="noreferrer noopener" target="_blank" className="ext-link">
                        {s}
                      </a>
                    </li>
                  );
                }
                const p = sourcePath(s);
                if (p === null) {
                  return (
                    <li key={s}>
                      <span className="mono link-unsafe" title="not a wiki path or https URL">
                        {s}
                      </span>
                    </li>
                  );
                }
                const ok = exists(p);
                const anchor = s.includes("#") ? s.slice(s.indexOf("#") + 1) : null;
                return (
                  <li key={s}>
                    <a href={wikiHref(p, anchor)} className={ok ? "mono" : "mono link-missing"} title={ok ? undefined : "missing (REF-DANGLING)"}>
                      {s}
                    </a>
                  </li>
                );
              })}
            </ul>
          </dd>
        </>
      )}
      {related.length > 0 && (
        <>
          <dt>Related</dt>
          <dd>
            <ul className="inline-list">
              {related.map((r) => (
                <li key={r}>
                  <IdLink id={r} known={known} />
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}
    </dl>
  );
}

const REF_SET = new Set<string>(REF_FIELDS);

function Value({ field, v, known }: { field: string; v: unknown; known: (id: string) => boolean }) {
  if (v === null || v === undefined) return <span className="muted">null</span>;
  if (typeof v === "string") {
    if (REF_SET.has(field) && /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(v)) return <IdLink id={v} known={known} />;
    return <span>{v}</span>;
  }
  if (typeof v === "number" || typeof v === "boolean") return <code>{String(v)}</code>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="muted">[]</span>;
    return (
      <ul className="fm-list">
        {v.map((x, i) => (
          <li key={i}>
            <Value field={field} v={x} known={known} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object") {
    return (
      <dl className="fm-obj">
        {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <Value field={field === "connects" && k === "to" ? "related" : k} v={x} known={known} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(v)}</span>;
}

export function FrontmatterPanel({ rawFm, yamlText, known }: { rawFm: unknown; yamlText: string | null; known: (id: string) => boolean }) {
  if (!rawFm || typeof rawFm !== "object") return null;
  const entries = Object.entries(rawFm as Record<string, unknown>);
  return (
    <section className="panel fm-panel" aria-labelledby="fm-title">
      <details>
        <summary>
          <h2 id="fm-title" className="panel-title">
            Frontmatter <span className="muted small">{entries.length} fields</span>
          </h2>
        </summary>
        <div className="table-wrap">
          <table className="fm-table">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">
                    <code>{k}</code>
                  </th>
                  <td>
                    <Value field={k} v={v} known={known} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {yamlText !== null && (
          <details className="raw-yaml">
            <summary>Raw YAML</summary>
            <pre>
              <code>{yamlText}</code>
            </pre>
          </details>
        )}
      </details>
    </section>
  );
}

export function Backlinks({ groups, known }: { groups: BacklinkGroup[]; known: (id: string) => boolean }) {
  return (
    <section className="panel" aria-labelledby="backlinks-title">
      <h2 id="backlinks-title" className="panel-title">
        Backlinks
      </h2>
      {groups.length === 0 ? (
        <p className="muted small">No page refers to this one.</p>
      ) : (
        <dl className="backlinks">
          {groups.map((g) => (
            <div key={g.field} className="backlink-group" data-field={g.field}>
              <dt>{g.field}</dt>
              <dd>
                <ul className="inline-list">
                  {g.ids.map((id) => (
                    <li key={id}>
                      <IdLink id={id} known={known} />
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
