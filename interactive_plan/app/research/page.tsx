// Research tab: the research plan in short sections (questions, predictions, experiments,
// measurements, test pages). Each item shows one line; its title opens a popup with the details, and
// every id inside opens its explainer (owner feedback 2026-10-09: "Whole research section tooo
// verbose"). Nothing is measured yet, and the text says so. Reads research.json and roadmap.json.
import type { Metadata } from "next";
import DetailPopup, { type DetailField } from "@/components/portal/DetailPopup";
import { OpenModalButton } from "@/components/portal/Modal";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { detailDialogId } from "@/lib/portal/dialogs";
import type { Research } from "@/lib/portal/schemas.gen";
import { getPortal } from "@/lib/portal/server";
import { roadmapRow } from "@/lib/portal/view";
import { ui, type UiRefId } from "@/lib/portal/uiRefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Research" };

interface Item {
  id: string;
  title: string;
  summary: string;
  status: string;
  related: string[];
}

interface Section<T extends Item> {
  key: string;
  /** Its Ref-mode id (lib/portal/uiRefs.ts). */
  uiRef: UiRefId;
  title: string;
  intro: string;
  kind: string;
  items: T[];
  /** One extra line under the title in the list (optional). */
  line?: (i: T) => string | null;
  /** Small text on the right of the row (optional). */
  side?: (i: T) => React.ReactNode;
  fields: (i: T) => DetailField[];
  meta?: (i: T) => React.ReactNode;
  compact?: boolean;
}

function ItemTitle({ item, kind }: { item: Item; kind: string }) {
  return (
    <OpenModalButton target={detailDialogId(item.id)} className="link-btn row-title" label={`${item.title}: open the ${kind.toLowerCase()}`}>
      {item.title}
    </OpenModalButton>
  );
}

function SectionView<T extends Item>({ s }: { s: Section<T> }) {
  return (
    <section id={s.key} aria-labelledby={`${s.key}-title`} className="stack-12 research-section" data-section={s.key} tabIndex={-1} {...ui(s.uiRef)}>
      <div className="stack-4">
        <h2 id={`${s.key}-title`} className="h2">
          {s.title} ({s.items.length})
        </h2>
        <p className="small text-2 lh">{s.intro}</p>
      </div>
      {s.compact ? (
        <ul className="tile-grid">
          {s.items.map((i) => (
            <li key={i.id} className="tile" data-item={i.id}>
              <ItemTitle item={i} kind={s.kind} />
              {s.side && <span className="small muted">{s.side(i)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="row-list">
          {s.items.map((i) => {
            const line = s.line?.(i) ?? null;
            return (
              <li key={i.id} className="row-item" data-item={i.id}>
                <div className="stack-4 row-main">
                  <ItemTitle item={i} kind={s.kind} />
                  {line && (
                    <span className="small text-2">
                      <RichText text={line} />
                    </span>
                  )}
                </div>
                <div className="row-side">
                  {s.side && <span className="small muted">{s.side(i)}</span>}
                  <span className="chip chip-later">{i.status}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Popups<T extends Item>({ s }: { s: Section<T> }) {
  return (
    <>
      {s.items.map((i) => (
        <DetailPopup key={i.id} id={i.id} kind={s.kind} title={i.title} status={i.status} tone="later" meta={s.meta?.(i)} fields={s.fields(i)} related={i.related} />
      ))}
    </>
  );
}

export default async function ResearchPage() {
  const { files } = await getPortal();
  const r: Research | null = files.research;
  const phaseLabel = (id: string) => {
    const row = roadmapRow(files.roadmap, id);
    return row ? `${row.short} · ${row.name}` : id;
  };

  const questions: Section<Research["questions"][number]> = {
    key: "questions",
    uiRef: "RE-3",
    title: "Questions we want to answer",
    intro: "The research questions. Each one is answered by the experiments below, once there is data.",
    kind: "Research question",
    items: r?.questions ?? [],
    line: (i) => i.question,
    fields: (i) => [
      { label: "The question", text: i.question },
      { label: "How we answer it", text: i.summary },
    ],
  };
  const hypotheses: Section<Research["hypotheses"][number]> = {
    key: "predictions",
    uiRef: "RE-4",
    title: "What we expect to find",
    intro: "Our predictions, written down before any test runs.",
    kind: "Prediction",
    items: r?.hypotheses ?? [],
    fields: (i) => [
      { label: "We expect", text: i.prediction },
      { label: "What counts", text: i.summary },
    ],
  };
  const experiments: Section<Research["experiments"][number]> = {
    key: "experiments",
    uiRef: "RE-5",
    title: "Experiments",
    intro: "The tests that will produce the data. None has run yet.",
    kind: "Experiment",
    items: r?.experiments ?? [],
    side: (i) => (
      <Ref id={i.phase} variant="inline">
        {phaseLabel(i.phase)}
      </Ref>
    ),
    meta: (i) => <>Runs in {phaseLabel(i.phase)}</>,
    fields: (i) => [{ label: "What we run, compare and measure", text: i.summary }],
  };
  const metrics: Section<Research["metrics"][number]> = {
    key: "measurements",
    uiRef: "RE-6",
    title: "Measurements",
    intro: "What we record in each test. Click one to see exactly what it means.",
    kind: "Measurement",
    items: r?.metrics ?? [],
    compact: true,
    side: (i) => i.unit,
    meta: (i) => <>Unit: {i.unit}</>,
    fields: (i) => [{ label: "What it measures", text: i.summary }],
  };
  const workloads: Section<Research["workloads"][number]> = {
    key: "test-pages",
    uiRef: "RE-7",
    title: "Test pages and tasks",
    intro: "The same pages and tasks run on every browser, so the comparison is fair.",
    kind: "Test workload",
    items: r?.workloads ?? [],
    compact: true,
    fields: (i) => [{ label: "What it is", text: i.summary }],
  };
  const nav = [questions, hypotheses, experiments, metrics, workloads].map((s) => ({ key: s.key, title: s.title, count: s.items.length }));

  return (
    <div className="page">
      <PageHead title="Research" summary={r?.summary ?? null} uiRef="RE-1">
        <nav aria-label="Research sections" className="pill-row" {...ui("RE-2")}>
          {nav.map((s) => (
            <a key={s.key} href={`#${s.key}`} className="pill">
              {s.title} ({s.count})
            </a>
          ))}
        </nav>
      </PageHead>
      <SectionView s={questions} />
      <SectionView s={hypotheses} />
      <SectionView s={experiments} />
      <SectionView s={metrics} />
      <SectionView s={workloads} />
      <Popups s={questions} />
      <Popups s={hypotheses} />
      <Popups s={experiments} />
      <Popups s={metrics} />
      <Popups s={workloads} />
    </div>
  );
}
