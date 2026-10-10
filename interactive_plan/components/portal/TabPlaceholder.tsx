/**
 * Temporary body of a tab whose view is built in the next p0.17 step (owner-approved mockups:
 * Roadmap, Architecture, Log; Decisions, Research and Questions follow the same style). It already
 * shows the file's plain-language title and summary, so the tab is never empty.
 */
import Link from "next/link";
import RichText from "./RichText";

export default function TabPlaceholder({ title, summary, file }: { title: string; summary: string | null; file: string }) {
  return (
    <div className="page">
      <section className="card stack-14">
        <h1 className="h1">{title}</h1>
        {summary ? (
          <p className="lead">
            <RichText text={summary} />
          </p>
        ) : (
          <p className="muted">The text for this tab (plan/portal/{file}) could not be read.</p>
        )}
        <p className="note" data-testid="tab-coming">
          This view is being rebuilt from your chosen mockup and arrives in the next step. Until then, the{" "}
          <Link href="/">Overview</Link> shows where we are, and every phase opens from there.
        </p>
      </section>
    </div>
  );
}
