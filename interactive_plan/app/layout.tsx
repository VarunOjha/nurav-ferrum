// Global layout (ip-routes-and-views §2): top bar (name, nav, search, theme toggle, pending-approvals
// counter), global banners (invalid approvals.json, lint errors, read-only mode) and the theme
// script that runs before first paint (§4). System fonts only; no external requests.
import type { Metadata } from "next";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import SearchBox from "@/components/SearchBox";
import ThemeToggle from "@/components/ThemeToggle";
import { THEME_INIT_SCRIPT } from "@/components/themeScript";
import { config, getApprovals, getIndex, getLint } from "@/lib/server/data";
import { suggestionList, type Suggestion } from "@/lib/wiki/search";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ferrum plan", template: "%s · Ferrum plan" },
  description: "Local planning tool for the Ferrum wiki: browse, search, review and approve.",
};

async function shellData() {
  const cfg = config();
  const out = {
    readonly: cfg.readonly,
    pending: null as number | null,
    approvalsInvalid: null as string | null,
    lintErrors: null as number | null,
    loadError: null as string | null,
    suggestions: [] as Suggestion[],
  };
  try {
    const [idx, view] = await Promise.all([getIndex(), getApprovals()]);
    out.suggestions = suggestionList(idx);
    out.pending = view.counts.PENDING + view.counts.STALE + view.counts.CHANGES_REQUESTED;
    if (view.file.exists && !view.file.valid) out.approvalsInvalid = view.file.error ?? "invalid file";
  } catch (e) {
    out.loadError = e instanceof Error ? e.message : String(e);
  }
  try {
    out.lintErrors = (await getLint()).summary.errors;
  } catch {
    out.lintErrors = null;
  }
  return out;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const d = await shellData();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-row">
              <Link href="/" className="brand" aria-label="Ferrum plan, dashboard">
                <span className="brand-mark" aria-hidden="true">
                  Fe
                </span>
                <span className="brand-name">Ferrum plan</span>
              </Link>
              <div className="topbar-tools">
                <SearchBox items={d.suggestions} />
                {d.pending !== null && (
                  <span className="pending-counter" title="Approvals needing attention: pending + stale + changes requested">
                    <span className="pending-count">{d.pending}</span>
                    <span className="pending-label">to review</span>
                  </span>
                )}
                <ThemeToggle />
              </div>
            </div>
            <NavLinks />
          </div>
        </header>
        <div className="banners">
          {d.loadError && (
            <div className="banner banner-red" role="alert">
              <strong>Wiki could not be loaded.</strong> {d.loadError}
            </div>
          )}
          {d.approvalsInvalid && (
            <div className="banner banner-red" role="alert">
              <strong>plan/approvals.json is invalid.</strong> Every approval shows as INVALID until it is fixed: {d.approvalsInvalid}
            </div>
          )}
          {d.lintErrors !== null && d.lintErrors > 0 && (
            <div className="banner banner-amber">
              <strong>
                Wiki lint: {d.lintErrors} error{d.lintErrors === 1 ? "" : "s"}.
              </strong>{" "}
              Run <code>cd interactive_plan &amp;&amp; npm run lint:wiki</code> for the report.
            </div>
          )}
          {d.readonly && (
            <div className="banner banner-grey">
              <strong>Read-only mode</strong> (PLAN_READONLY=1): approvals are disabled.
            </div>
          )}
        </div>
        <main id="main" className="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="footer">
          <p>
            Local planning tool. Reads <code>wiki/</code> at request time; the wiki is the source of truth.
          </p>
        </footer>
      </body>
    </html>
  );
}
