// Lint report (ip-routes-and-views §3.12): the same engine as `npm run lint:wiki` (lib/lint), findings
// grouped by severity and then by code, with file links, plus the exact command for future sessions.
import type { Metadata } from "next";
import CopyButton from "@/components/CopyButton";
import { getLint } from "@/lib/server/data";
import { groupFindings } from "@/lib/views/phase";
import { wikiHref } from "@/lib/wiki/routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lint" };

const COMMAND = "cd interactive_plan && npm run lint:wiki";
const SEV = {
  error: { label: "Errors", tone: "red" },
  warn: { label: "Warnings", tone: "amber" },
  info: { label: "Info", tone: "neutral" },
} as const;

/** Wiki files link to the wiki browser (the line number is shown as text); STATUS.md and other repo files are plain text. */
function fileHref(repoPath: string): string | null {
  if (!repoPath.startsWith("wiki/")) return null;
  return wikiHref(repoPath.slice("wiki/".length));
}

export default async function LintRoute() {
  let report: Awaited<ReturnType<typeof getLint>> | null = null;
  let failure: string | null = null;
  try {
    report = await getLint();
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  }
  const groups = report ? groupFindings(report.findings) : [];
  return (
    <article className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Wiki lint</h1>
        <p className="muted">
          Same rules as the command line (ip-wiki-lint). For future sessions: <code className="cmd">{COMMAND}</code>
          <CopyButton text={COMMAND} label="Copy the lint command" />
        </p>
      </header>
      {failure && (
        <p className="banner banner-red" role="alert">
          The lint run failed: {failure}
        </p>
      )}
      {report && (
        <>
          <p className="lint-summary" data-testid="lint-summary">
            <span className="chip chip-red chip-strong">{report.summary.errors} errors</span>{" "}
            <span className="chip chip-amber chip-strong">{report.summary.warnings} warnings</span>{" "}
            <span className="chip chip-neutral">{report.summary.info} info</span> <span className="muted small">over {report.summary.pages} pages</span>
          </p>
          <p className="muted small" data-testid="lint-git-note">
            This view never runs git (ip-wiki-lint §3): the git-backed checks of STALE-UPDATED and RAW-IMMUTABLE run only in{" "}
            <code>npm run lint:wiki</code>; here RAW-IMMUTABLE uses <code>wiki/raw/MANIFEST.sha256</code>.
          </p>
          {groups.length === 0 && <p className="muted">No findings.</p>}
          {groups.map((g) => (
            <section key={g.severity} className="panel" aria-labelledby={`sev-${g.severity}`} data-severity={g.severity}>
              <h2 id={`sev-${g.severity}`} className="panel-title">
                <span className={`chip chip-${SEV[g.severity].tone}`}>{SEV[g.severity].label}</span> <span className="muted small">{g.count}</span>
              </h2>
              {g.codes.map((c) => (
                <details key={c.code} className="lint-code" open={g.severity === "error"} data-code={c.code}>
                  <summary>
                    <code>{c.code}</code> <span className="muted small">{c.findings.length}</span>
                  </summary>
                  <ul className="findings-list">
                    {c.findings.map((f, i) => {
                      const h = fileHref(f.path);
                      return (
                        <li key={i} className={`finding finding-${f.severity}`}>
                          {h ? (
                            <a href={h} className="mono small">
                              {f.path}
                              {f.line ? `:${f.line}` : ""}
                            </a>
                          ) : (
                            <span className="mono small">
                              {f.path}
                              {f.line ? `:${f.line}` : ""}
                            </span>
                          )}{" "}
                          {f.message}
                          {f.hint && <span className="muted small"> ({f.hint})</span>}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
