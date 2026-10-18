// Security tab (owner request 2026-10-18: "put the threat model there", to read it before the P4
// sign-off): Ferrum's threat model in plain words. Who might attack, each threat with its protection
// and whether a saved test proves it, what Ferrum does not protect against, and where trust changes
// inside Ferrum. Read-only like every tab. Reads security.json (translated from section 7 of the
// security testing plan page).
import type { Metadata } from "next";
import PageHead from "@/components/portal/PageHead";
import RichText from "@/components/portal/RichText";
import { getPortal } from "@/lib/portal/server";
import { ui } from "@/lib/portal/uiRefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Security" };

const TONE = { Tested: "done", Partly: "now", Planned: "later", "Not enforced": "blocked" } as const;

export default async function SecurityPage() {
  const { files } = await getPortal();
  const sec = files.security;
  const count = (state: keyof typeof TONE) => sec?.threats.filter((t) => t.state === state).length ?? 0;

  return (
    <div className="page">
      <PageHead title="Security" summary={sec?.summary ?? null} uiRef="SE-1" />
      {sec && (
        <>
          <section aria-label="What the states mean" className="card stack-8" data-testid="security-words" {...ui("SE-2")}>
            <p className="small text-2 lh">
              <RichText text={sec.words} />
            </p>
            <div className="chip-row">
              {(Object.keys(TONE) as (keyof typeof TONE)[]).map((s) => (
                <span key={s} className={`chip chip-${TONE[s]}`}>
                  {s}: {count(s)}
                </span>
              ))}
            </div>
          </section>

          <section aria-labelledby="who-title" className="stack-12" {...ui("SE-3")}>
            <h2 id="who-title" className="h2">
              Who might attack
            </h2>
            <div className="table-wrap">
              <table className="table rtable" data-testid="security-adversaries">
                <thead>
                  <tr>
                    <th scope="col">Who</th>
                    <th scope="col">Covered?</th>
                    <th scope="col">What Ferrum relies on</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.adversaries.map((a) => (
                    <tr key={a.code}>
                      <th scope="row" data-label="Who" className="rtable-name">
                        <RichText text={a.who} />
                      </th>
                      <td data-label="Covered?">
                        <RichText text={a.in_scope} />
                      </td>
                      <td data-label="What Ferrum relies on">
                        <RichText text={a.relies_on} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="threats-title" className="stack-12" {...ui("SE-4")}>
            <h2 id="threats-title" className="h2">
              Threats and how Ferrum handles them
            </h2>
            <div className="table-wrap">
              <table className="table rtable" data-testid="security-threats">
                <thead>
                  <tr>
                    <th scope="col">Threat</th>
                    <th scope="col">Protection</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.threats.map((t) => (
                    <tr key={t.code} data-threat={t.code} data-state={t.state}>
                      <th scope="row" data-label="Threat" className="rtable-name">
                        <RichText text={t.threat} />
                      </th>
                      <td data-label="Protection">
                        <RichText text={t.protection} />
                      </td>
                      <td data-label="State">
                        <span className={`chip chip-${TONE[t.state]}`}>{t.state}</span>
                        {t.note && (
                          <div className="small muted lh">
                            <RichText text={t.note} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="not-title" className="stack-12" {...ui("SE-5")}>
            <h2 id="not-title" className="h2">
              What Ferrum does not protect against
            </h2>
            <div className="card">
              <ul className="stack-8" data-testid="security-not-enforced">
                {sec.not_enforced.map((n) => (
                  <li key={n} className="lh">
                    <RichText text={n} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="edges-title" className="stack-12" {...ui("SE-6")}>
            <h2 id="edges-title" className="h2">
              Where trust changes inside Ferrum
            </h2>
            <div className="table-wrap">
              <table className="table rtable" data-testid="security-boundaries">
                <thead>
                  <tr>
                    <th scope="col">Between</th>
                    <th scope="col">What guards it</th>
                    <th scope="col">Tested?</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.boundaries.map((b) => (
                    <tr key={b.code}>
                      <th scope="row" data-label="Between" className="rtable-name">
                        <RichText text={b.between} />
                      </th>
                      <td data-label="What guards it">
                        <RichText text={b.guard} />
                      </td>
                      <td data-label="Tested?">
                        <span className={`chip ${b.tested ? "chip-done" : "chip-blocked"}`}>{b.tested ? "Tested" : "Not enforced"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
