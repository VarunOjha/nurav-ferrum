/**
 * Root CLAUDE.md rendered below SCHEMA.md on the schema page (ip-data-contract §6.2): the schema
 * approval covers both files, so the owner sees the bootstrap text that the approval's
 * `bootstrap_hash` refers to, with the full hash.
 */
import { rebaseRootLinks } from "@/lib/wiki/mdlinks";
import Markdown from "./Markdown";

export default function BootstrapSection({
  source,
  hash,
  exists,
  knownIds,
}: {
  source: string;
  hash: string;
  exists: (wikiPath: string) => boolean;
  knownIds?: ReadonlySet<string>;
}) {
  return (
    <section className="panel bootstrap-section" aria-labelledby="bootstrap-title" data-testid="bootstrap-section">
      <h2 id="bootstrap-title" className="panel-title">
        Root <code>CLAUDE.md</code> (approved together with <code>schema</code>)
      </h2>
      <p className="muted small">
        SCHEMA §10.2: approving <code>schema</code> records <code>bootstrap_hash</code> = content hash of this file. Hash of the text shown
        below: <code className="hash-full" data-testid="bootstrap-hash">{hash}</code>
      </p>
      <div className="page-body">
        <Markdown source={rebaseRootLinks(source)} path="CLAUDE.md" exists={exists} knownIds={knownIds} />
      </div>
    </section>
  );
}
