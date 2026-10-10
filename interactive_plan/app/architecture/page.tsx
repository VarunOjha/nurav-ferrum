// Architecture tab (owner-approved Architecture mockup, adr-0026): four groups behind a switcher. The
// Application group leads with a layered diagram of the Rust app built from plain HTML boxes (no
// graph, no sideways scrolling); every group lists its parts as short cards with what each one talks
// to. Every part opens its explainer. Reads architecture.json and roadmap.json.
import type { Metadata } from "next";
import GroupSwitcher from "@/components/portal/GroupSwitcher";
import PageHead from "@/components/portal/PageHead";
import Ref from "@/components/portal/Ref";
import RichText from "@/components/portal/RichText";
import type { Architecture } from "@/lib/portal/schemas.gen";
import { getPortal } from "@/lib/portal/server";
import { firstSentence, layerRows, layerShortName, roadmapRow, type Layer } from "@/lib/portal/view";

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
    <div className="card layers" data-testid="layer-diagram">
      <div className="layers-head">
        <h2 className="h3">The Ferrum app, layer by layer</h2>
        <p className="small text-2 lh">
          Top to bottom: what you see, our Rust engine, then what Microsoft and Windows provide. Click any box for a short explainer.
        </p>
        <ul className="legend" aria-label="Colour key">
          {(["trusted", "untrusted", "not ours"] as const).map((t) => (
            <li key={t}>
              <span className={`swatch ${trustClass(t)}`} aria-hidden="true" />
              {TRUST_LABEL[t]}
            </li>
          ))}
        </ul>
      </div>
      {layerRows(arch.layers).map((row) => (
        <div key={row.label} className="layer-row">
          <div className="layer-label">{row.label}</div>
          <div className="layer-boxes">
            {row.layers.flatMap((l) =>
              l.components.map((cid) => {
                const c = byId.get(cid);
                return (
                  <Ref key={cid} id={cid} variant="box">
                    <span className={`layer-box ${trustClass(l.trust)}`}>
                      <span className="strong">{c?.title ?? layerShortName(l)}</span>
                      <span className="small layer-box-text">{c ? firstSentence(c.summary) : l.summary}</span>
                      {l.trust === "untrusted" && <span className="small strong">Untrusted · sandboxed</span>}
                    </span>
                  </Ref>
                );
              }),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentCards({ items, byId, phaseName }: { items: Component[]; byId: Map<string, Component>; phaseName: (id: string) => string }) {
  if (items.length === 0) return <p className="note">No parts of its own: it is made of the tests and check scripts that each phase writes.</p>;
  return (
    <ul className="comp-grid">
      {items.map((c) => (
        <li key={c.id} className="card comp-card" data-component={c.id}>
          <div className="row-between">
            <Ref id={c.id} variant="inline">
              <span className="strong">{c.title}</span>
            </Ref>
            <span className="chip chip-later">{c.status}</span>
          </div>
          <p className="small text-2 lh">
            <RichText text={firstSentence(c.summary)} />
          </p>
          <div className="small muted">
            Built in{" "}
            <Ref id={c.phase} variant="inline">
              {phaseName(c.phase)}
            </Ref>
          </div>
          {c.connects.length > 0 && (
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
          )}
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
        <PageHead title="Architecture" summary={null} />
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
    return (
      <div key={g.id} className="stack-18">
        {g.id === "application" && <LayerDiagram arch={arch} byId={byId} />}
        <div className="stack-8">
          <h2 className="h3">{g.name}: what it is for</h2>
          <p className="lead">
            <RichText text={g.purpose} />
          </p>
          <Flow text={g.flow} />
        </div>
        <div className="stack-12">
          <h3 className="h3">Its parts and what they talk to</h3>
          <ComponentCards items={items} byId={byId} phaseName={phaseName} />
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
      <PageHead title="Architecture" summary={arch.summary} />
      <GroupSwitcher groups={groups} panels={panels} glances={glances} />
      {arch.footnote && (
        <p className="small muted" data-testid="arch-footnote">
          <RichText text={arch.footnote.text} />{" "}
          {arch.footnote.components.map((id) => (
            <Ref key={id} id={id} variant="chip">
              {byId.get(id)?.title ?? id}
            </Ref>
          ))}
        </p>
      )}
    </div>
  );
}
