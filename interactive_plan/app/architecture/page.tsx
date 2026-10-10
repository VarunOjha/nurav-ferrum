// Architecture tab (owner-approved Architecture mockup, adr-0026): four groups behind a switcher. The
// Application group leads with a layered diagram of the Rust app built from plain HTML boxes (no
// graph, no sideways scrolling) and a "How to read this" side panel, as in the mockup. Each box opens
// a popup for that part: what it does, when it is built (or, for parts that are not ours, from when we
// use it) and what it talks to. The other groups list their parts as one short line each, opening the
// same popup. Connections live only in the popups, so the page stays about one screen high (review
// 2026-10-09: the owner found long lists of connections hard to navigate). Reads architecture.json and
// roadmap.json.
import type { Metadata } from "next";
import DetailPopup from "@/components/portal/DetailPopup";
import GroupSwitcher from "@/components/portal/GroupSwitcher";
import { OpenModalButton } from "@/components/portal/Modal";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import { detailDialogId } from "@/lib/portal/dialogs";
import type { Architecture } from "@/lib/portal/schemas.gen";
import { getPortal } from "@/lib/portal/server";
import { ui } from "@/lib/portal/uiRefs";
import { firstSentence, layerRows, layerShortName, partWhen, roadmapRow, type Layer } from "@/lib/portal/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Architecture" };

type Component = Architecture["components"][number];

const TRUST_LABEL: Record<Layer["trust"], string> = {
  trusted: "Trusted: our code",
  untrusted: "Untrusted: the open web",
  "not ours": "Not ours: Microsoft and Windows",
};

const trustClass = (t: Layer["trust"]) => `trust-${t.replace(" ", "-")}`;

function Flow({ text }: { text: string }) {
  return (
    <p className="flow">
      <RichText text={text} />
    </p>
  );
}

function LayerDiagram({ arch, byId }: { arch: Architecture; byId: Map<string, Component> }) {
  return (
    <div className="card layers" data-testid="layer-diagram" {...ui("AR-3")}>
      <h2 className="h3">The Ferrum app, layer by layer</h2>
      {layerRows(arch.layers).map((row, i) => (
        <div key={row.label} className="layer-row" {...ui("AR-3", { index: i + 1 })}>
          <div className="layer-label">{row.label}</div>
          <div className="layer-boxes">
            {row.layers.flatMap((l) =>
              l.components.map((cid) => {
                const c = byId.get(cid);
                const name = c?.title ?? layerShortName(l);
                return (
                  // No label override: the box's visible text (name and first sentence) is its accessible name.
                  <OpenModalButton key={cid} target={detailDialogId(cid)} className="ref ref-box">
                    <span className={`layer-box ${trustClass(l.trust)}`} data-part={cid}>
                      <span className="strong">{name}</span>
                      <span className="small layer-box-text">{c ? firstSentence(c.summary) : l.summary}</span>
                      {l.trust === "untrusted" && <span className="small strong">Untrusted · sandboxed</span>}
                    </span>
                  </OpenModalButton>
                );
              }),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function HowToRead({ purpose, flow }: { purpose: string; flow: string }) {
  return (
    <aside className="card arch-side stack-12" aria-labelledby="how-to-read" data-testid="how-to-read" {...ui("AR-4")}>
      <h2 id="how-to-read" className="h3">
        How to read this
      </h2>
      <p className="small text-2 lh">
        Top to bottom: what you see, our Rust engine, then what Microsoft and Windows provide. Each layer only talks to the layer next to it.
        Click any box for a popup: what the part does, when it is built and what it talks to.
      </p>
      <ul className="legend legend-stack" aria-label="Colour key">
        {(["trusted", "untrusted", "not ours"] as const).map((t) => (
          <li key={t}>
            <span className={`swatch ${trustClass(t)}`} aria-hidden="true" />
            {TRUST_LABEL[t]}
          </li>
        ))}
      </ul>
      <div className="stack-8">
        <h3 className="eyebrow">What it is for</h3>
        <p className="small text-2 lh">
          <RichText text={purpose} />
        </p>
        <Flow text={flow} />
      </div>
    </aside>
  );
}

/** One short line per part (the groups without a diagram); each opens the part's popup. */
function PartList({ items }: { items: Component[] }) {
  if (items.length === 0) return <p className="note">No parts of its own: it is made of the tests and check scripts that each phase writes.</p>;
  return (
    <ul className="row-list" data-testid="part-list">
      {items.map((c) => (
        <li key={c.id} className="row-item part-row" data-component={c.id}>
          <div className="stack-4 row-main">
            <OpenModalButton target={detailDialogId(c.id)} className="link-btn row-title" label={`${c.title}: open this part`}>
              {c.title}
            </OpenModalButton>
            <span className="small text-2">
              <RichText text={firstSentence(c.summary)} />
            </span>
          </div>
          <div className="row-side">
            <span className={`chip ${c.ours ? "chip-later" : "chip-done"}`}>{c.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ArchitecturePage() {
  const { files } = await getPortal();
  const arch = files.architecture;
  if (!arch) {
    return (
      <div className="page">
        <PageHead title="Architecture" summary={null} uiRef="AR-1" />
      </div>
    );
  }
  const byId = new Map(arch.components.map((c) => [c.id, c]));
  const phaseName = (id: string) => {
    const r = roadmapRow(files.roadmap, id);
    return r ? `${r.short} · ${r.name}` : id;
  };

  const groups = arch.groups.map((g) => ({ id: g.id, label: g.name }));
  const panels = arch.groups.map((g) => {
    const items = g.components.map((id) => byId.get(id)).filter((c): c is Component => c !== undefined);
    if (g.id === "application") {
      return (
        <div key={g.id} className="arch-main">
          <LayerDiagram arch={arch} byId={byId} />
          <HowToRead purpose={g.purpose} flow={g.flow} />
        </div>
      );
    }
    return (
      <div key={g.id} className="stack-18">
        <div className="stack-8" {...ui("AR-5")}>
          <h2 className="h3">{g.name}: what it is for</h2>
          <p className="lead">
            <RichText text={g.purpose} />
          </p>
          <Flow text={g.flow} />
        </div>
        <div className="stack-12" {...ui("AR-6")}>
          <h3 className="h3">Its parts</h3>
          <PartList items={items} />
        </div>
      </div>
    );
  });
  const glances = arch.groups.map((g) => (
    <div key={g.id} className="stack-8">
      <p className="small text-2 lh">
        <RichText text={g.purpose} />
      </p>
      <Flow text={g.flow} />
    </div>
  ));

  return (
    <div className="page">
      <PageHead title="Architecture" summary={arch.summary} uiRef="AR-1" />
      <GroupSwitcher groups={groups} panels={panels} glances={glances} />
      {arch.footnote && (
        <p className="small muted" data-testid="arch-footnote" {...ui("AR-8")}>
          <RichText text={arch.footnote.text} />{" "}
          {arch.footnote.components.map((id) => (
            <Ref key={id} id={id} variant="chip">
              {byId.get(id)?.title ?? id}
            </Ref>
          ))}
        </p>
      )}
      {arch.components.map((c) => {
        const when = partWhen(c, phaseName(c.phase));
        return (
          <DetailPopup
            key={c.id}
            id={c.id}
            kind="Part of the system"
            title={c.title}
            status={c.status}
            tone={c.ours ? "later" : "done"}
            meta={<span data-testid="part-when">{when}</span>}
            fields={[{ label: "What it does", text: c.summary }]}
            related={c.related}
            extra={
              c.connects.length > 0 ? (
                <div className="stack-8">
                  <div className="eyebrow">What it talks to</div>
                  <ul className="connects" aria-label={`What ${c.title} talks to`}>
                    {c.connects.map((x, i) => (
                      <li key={i} className="small">
                        <span aria-hidden="true" className="muted">
                          {"→ "}
                        </span>
                        <Ref id={x.to} variant="inline">
                          {byId.get(x.to)?.title ?? x.to}
                        </Ref>
                        {": "}
                        <RichText text={x.what} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
