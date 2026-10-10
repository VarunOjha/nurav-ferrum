/** The heading of a tab: its one h1 and the plain-language summary from its portal file. */
import { ui, type UiRefId } from "@/lib/portal/uiRefs";
import RichText from "./RichText";

export default function PageHead({
  title,
  summary,
  uiRef,
  children,
}: {
  title: string;
  summary: string | null;
  /** Its Ref-mode id (lib/portal/uiRefs.ts). */
  uiRef: UiRefId;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head" {...ui(uiRef)}>
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
