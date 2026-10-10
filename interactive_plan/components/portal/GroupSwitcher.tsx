"use client";
/**
 * The four-group switcher of the Architecture mockup. The server renders every group's panel; this
 * only shows one at a time (toggle buttons with aria-pressed), plus "at a glance" cards for the other
 * groups, each with a button that switches to it. The choice is kept in the address (#group-<id>), so
 * a reload keeps it.
 */
import { useEffect, useState } from "react";

export interface GroupTab {
  id: string;
  label: string;
}

const hashId = (id: string) => `group-${id}`;

export default function GroupSwitcher({ groups, panels, glances }: { groups: GroupTab[]; panels: React.ReactNode[]; glances: React.ReactNode[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fromHash = () => {
      const i = groups.findIndex((g) => `#${hashId(g.id)}` === window.location.hash);
      if (i >= 0) setCurrent(i);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [groups]);

  const choose = (i: number) => {
    setCurrent(i);
    window.history.replaceState(window.history.state, "", `#${hashId(groups[i].id)}`);
  };

  return (
    <>
      <div role="group" aria-label="Architecture groups" className="pill-row" data-testid="group-switcher">
        {groups.map((g, i) => (
          <button key={g.id} type="button" className="pill pill-lg" aria-pressed={i === current} aria-controls={`panel-${g.id}`} onClick={() => choose(i)}>
            {i + 1} · {g.label}
          </button>
        ))}
      </div>
      {groups.map((g, i) => (
        <section key={g.id} id={`panel-${g.id}`} aria-label={`${g.label} group`} hidden={i !== current} className="stack-18" data-group={g.id}>
          {panels[i]}
        </section>
      ))}
      <section aria-labelledby="glance-title" className="stack-12">
        <h2 id="glance-title" className="h3">
          The other groups at a glance
        </h2>
        <ul className="glance-grid">
          {groups.map((g, i) =>
            i === current ? null : (
              <li key={g.id} className="card glance-card">
                <div className="strong">{g.label}</div>
                {glances[i]}
                <button type="button" className="secondary-btn" onClick={() => choose(i)}>
                  Show {g.label}
                </button>
              </li>
            ),
          )}
        </ul>
      </section>
    </>
  );
}
