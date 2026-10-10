// Portal shell (Layout A of the owner-approved Main mockup, 2026-10-09): brand, top tabs, the
// "Read-only · steer in Claude Code" badge, the theme toggle, a data-problem banner, the global
// reference popup and script popup, and one phase popup per phase (so every tab and every phase id
// can open it), and the Ref button (Ref mode: names every block for layout feedback). The portal reads only plan/portal/*.json and plan/approvals.json (adr-0023,
// adr-0024); nothing in it writes. Fonts are self-hosted (app/fonts.ts): no external requests.
import type { Metadata } from "next";
import Link from "next/link";
import PhasePopup from "@/components/portal/PhasePopup";
import RefMode from "@/components/portal/RefMode";
import RefProvider from "@/components/portal/RefProvider";
import ScriptProvider from "@/components/portal/ScriptProvider";
import TopNav from "@/components/portal/TopNav";
import ThemeInitScript from "@/components/ThemeInitScript";
import ThemeToggle from "@/components/ThemeToggle";
import { getPortal, getRefData } from "@/lib/portal/server";
import { ui } from "@/lib/portal/uiRefs";
import { plexMono, plexSans } from "./fonts";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Ferrum · Plan Portal", template: "%s · Ferrum Plan Portal" },
  description: "Read-only portal: where the Ferrum project stands, in plain words. Steer it in Claude Code.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [portal, refData] = await Promise.all([getPortal(), getRefData()]);
  const waiting = portal.files.overview?.questions_for_you.items.length ?? 0;
  return (
    <html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <RefProvider data={refData} phaseIds={portal.files.phases.map((p) => p.id)}>
          <ScriptProvider>
          <header className="topbar">
            <div className="topbar-inner">
              <div className="brand-wrap" {...ui("HD-1", { pos: "below" })}>
                <Link href="/" className="brand" aria-label="Ferrum Plan Portal, overview">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="brand-mark">
                    <path d="M4 20 L12 4 L20 20 Z" />
                    <path d="M8 14 H16" />
                  </svg>
                  Ferrum <span className="brand-sub">· Plan Portal</span>
                </Link>
              </div>
              <TopNav waiting={waiting} />
              <div className="topbar-tools">
                <div className="readonly-badge" data-testid="readonly-badge" {...ui("HD-3", { pos: "below" })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11 V7 a4 4 0 0 1 8 0 V11" />
                  </svg>
                  Read-only · steer in Claude Code
                </div>
                <RefMode />
                <div className="theme-wrap" {...ui("HD-5", { pos: "below" })}>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          {portal.problems.length > 0 && (
            <div className="banner" role="alert" data-testid="data-problems" {...ui("HD-6")}>
              <strong>Part of the portal text could not be read.</strong> The pages show what they can. Tell Claude: “the portal shows a data
              error”.
              <ul>
                {portal.problems.map((p) => (
                  <li key={p.file}>
                    <code>plan/portal/{p.file}</code>: {p.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <main id="main" className="main" tabIndex={-1}>
            {children}
          </main>
          {portal.files.phases.map((ph) => (
            <PhasePopup
              key={ph.id}
              phase={ph}
              sameInEveryPhase={portal.files.roadmap?.same_in_every_phase ?? []}
              approvals={portal.approvals}
            />
          ))}
          </ScriptProvider>
        </RefProvider>
      </body>
    </html>
  );
}
