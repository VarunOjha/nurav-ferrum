/** The heading of a tab: its one h1 and the plain-language summary from its portal file. */
import RichText from "./RichText";

export default function PageHead({ title, summary, children }: { title: string; summary: string | null; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="stack-4">
        <h1 className="h1">{title}</h1>
        {summary ? (
          <p className="lead">
            <RichText text={summary} />
          </p>
        ) : (
          <p className="muted">The text for this tab could not be read (see the note at the top of the page).</p>
        )}
      </div>
      {children}
    </div>
  );
}
