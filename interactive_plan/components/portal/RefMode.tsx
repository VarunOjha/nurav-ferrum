"use client";
/**
 * Ref mode (owner request 2026-10-10, option "Outline + labels + copy"). The "Ref" button in the
 * header switches it on and off. While it is on:
 * - every block marked with `data-ui-ref` (lib/portal/uiRefs.ts) on the page and in any open popup gets
 *   a dashed outline (CSS, `html[data-ref-mode]`) and a small label button "OV-3 · What happens next";
 * - clicking a label copies "Overview › OV-3 What happens next" (or "Phase popup (P1) › PH-3 Tasks
 *   table") to the clipboard and says "Copied" in a polite live region;
 * - a small bar offers "List all" (the Layout map popup: every id and name) and "Turn off";
 * - Esc (with no popup open) or the Ref button turns it off.
 * The labels are plain DOM buttons added next to React's own children and removed when the mode ends;
 * a MutationObserver adds them to blocks that appear later (a tab change, a popup's new content, a log
 * filter). The labels and outlines take no layout space (app/globals.css), so the owner sees the real
 * layout. Blocks that repeat without their own suffix (log entries) are labelled once: on the first one
 * that is visible now; the others get `data-ui-dup`. The header pieces show only their id (the full
 * name is in the tooltip and the accessible name), so the header keeps its one-row arrangement.
 * The bar lives in a small host element that moves into the topmost open popup, because a modal popup
 * makes the rest of the page inert (not into the Layout map, which is a list, not a part of the page);
 * when it moves, an old "Copied" message is cleared. Its height is measured into --ref-bar-h so the page
 * and the popups leave room for it at the end. The choice is kept per viewer in localStorage (try/catch).
 */
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { chipText, copyText, layoutMap, prefixOf, scopeLabel, uiLabel, UI_SCOPES, type UiPrefix, type UiRefId } from "@/lib/portal/uiRefs";

export const REF_MODE_KEY = "ferrum-portal-ref-mode";
const CHIP = "ui-ref-chip";
const DESCRIPTION = "Show the names of the blocks on this page so you can refer to them in feedback";
const MAP_ID = "layout-map";

const EVENT = "ferrum-ref-mode-change";
/** The choice for this page when storage is unavailable (private window, blocked site data). */
let memory = false;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(REF_MODE_KEY) === "on";
  } catch {
    return memory;
  }
}

function store(on: boolean): void {
  memory = on;
  try {
    if (on) window.localStorage.setItem(REF_MODE_KEY, "on");
    else window.localStorage.removeItem(REF_MODE_KEY);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const noSubscribe = () => () => {};

/** The element the bar renders into; created once on the client and moved between page and popups. */
let barHost: HTMLDivElement | null = null;
function getBarHost(): HTMLDivElement {
  if (!barHost) {
    barHost = document.createElement("div");
    barHost.className = "ui-ref-bar-host";
  }
  return barHost;
}

/** Where a block sits, in words: its popup ("Phase popup (P1)") or its tab or the header. */
function contextOf(block: HTMLElement, ref: UiRefId): string {
  const dialog = block.closest("dialog");
  const ctx = dialog?.getAttribute("data-ui-context");
  if (ctx) return ctx;
  return scopeLabel(ref);
}

/** The first element inside `root` that can take focus and stays after Ref mode ends, or null. */
function firstFocusable(root: HTMLElement): HTMLElement | null {
  const all = root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
  // Not a label or a bar button: they are about to disappear.
  return [...all].find((el) => !el.classList.contains(CHIP) && !el.closest(".ui-ref-bar")) ?? null;
}

/** The topmost open popup other than the Layout map, or null. */
function topDialog(): HTMLDialogElement | null {
  const open = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].filter((d) => d.id !== MAP_ID);
  return open[open.length - 1] ?? null;
}

/** The Layout map group of what the owner looks at now: the open popup, else the tab. */
function currentGroup(): UiPrefix | null {
  const scope = topDialog() ?? document.querySelector("main") ?? document.body;
  const el = scope.querySelector<HTMLElement>("[data-ui-ref]");
  return el ? prefixOf(el.getAttribute("data-ui-ref") ?? "") : null;
}

async function writeClipboard(text: string, near: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: a hidden text area next to the label (inside the open popup, so it is not inert).
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.className = "sr-only";
    (near.parentElement ?? document.body).appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    near.focus();
    return ok;
  }
}

export default function RefMode() {
  // Off on the server and during hydration; then the stored choice.
  const on = useSyncExternalStore(subscribe, readStored, () => false);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [status, setStatus] = useState("");
  const [mapGroup, setMapGroup] = useState<UiPrefix | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLDialogElement>(null);
  const clearTimer = useRef<number | null>(null);

  const turn = useCallback((next: boolean) => {
    store(next);
    if (!next) {
      setStatus("");
      mapRef.current?.close();
      // A focused label or bar button disappears: give focus back. With a popup still open the Ref
      // button is behind it (inert), so focus stays in the popup, on its first button (Close).
      const a = document.activeElement;
      if (a instanceof HTMLElement && (a.classList.contains(CHIP) || a.closest(".ui-ref-bar"))) {
        const d = topDialog();
        if (d) (firstFocusable(d) ?? d).focus();
        else buttonRef.current?.focus();
      }
    }
  }, []);

  const announce = useCallback((text: string) => {
    setStatus(text);
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setStatus(""), 8000);
  }, []);

  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    html.setAttribute("data-ref-mode", "on");
    const host = getBarHost();

    // Open popups, in the order they were opened (the last one is on top). The Layout map is left out:
    // the bar stays where it was, so closing the map gives focus back to List all.
    const openDialogs: HTMLDialogElement[] = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].filter((d) => d.id !== MAP_ID);
    const placeBar = () => {
      const top = [...openDialogs].reverse().find((d) => d.open && d.isConnected);
      const target = top ?? document.body;
      if (host.parentElement === target) return;
      const moved = host.parentElement !== null;
      target.appendChild(host);
      // A "Copied" message is about the place it was said in: clear it when the bar moves.
      if (moved) setStatus("");
    };

    // The bar's height, so the page and the popups leave room for it at the end (app/globals.css).
    const ro = new ResizeObserver(() => {
      const bar = host.querySelector<HTMLElement>(".ui-ref-bar");
      html.style.setProperty("--ref-bar-h", `${Math.ceil(bar?.getBoundingClientRect().height ?? 0)}px`);
    });
    ro.observe(host);

    const onChip = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const chip = e.currentTarget as HTMLElement;
      const block = chip.parentElement;
      const ref = block?.getAttribute("data-ui-ref") ?? "";
      const label = uiLabel(ref, block?.getAttribute("data-ui-index"), block?.getAttribute("data-ui-item"));
      if (!block || !label) return;
      const text = copyText(contextOf(block, ref as UiRefId), label);
      void writeClipboard(text, chip).then((ok) => announce(ok ? `Copied: ${text}` : `Could not copy. The name is: ${text}`));
    };

    const scan = () => {
      const seen = new Set<string>();
      for (const el of document.querySelectorAll<HTMLElement>("[data-ui-ref]")) {
        const ref = el.getAttribute("data-ui-ref") ?? "";
        const label = uiLabel(ref, el.getAttribute("data-ui-index"), el.getAttribute("data-ui-item"));
        if (!label) continue;
        // The same id more than once (log entries): label only the first one that is visible now.
        const key = `${label.id}|${el.closest("dialog")?.id ?? ""}`;
        const visible = el.getClientRects().length > 0;
        const dup = !visible || seen.has(key);
        if (!dup) seen.add(key);
        if (dup !== el.hasAttribute("data-ui-dup")) el.toggleAttribute("data-ui-dup", dup);
        if (el.querySelector(`:scope > .${CHIP}`)) continue;
        const full = chipText(label);
        const b = document.createElement("button");
        b.type = "button";
        b.className = CHIP;
        b.setAttribute("data-ui-chip", label.id);
        b.setAttribute("data-ui-prefix", prefixOf(ref));
        if (prefixOf(ref) === "HD") {
          // The header pieces sit close together: their labels show the id only, so the header keeps its
          // real one-row arrangement. The full name is in the tooltip and the accessible name.
          b.textContent = label.id;
          b.setAttribute("aria-label", full);
          b.title = `${full} (click to copy)`;
        } else {
          b.textContent = full;
          b.title = "Copy this name for your feedback";
        }
        b.addEventListener("click", onChip);
        el.insertBefore(b, el.firstChild);
      }
    };

    let frame = 0;
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type !== "attributes" || !(r.target instanceof HTMLDialogElement) || r.target.id === MAP_ID) continue;
        const d = r.target;
        const i = openDialogs.indexOf(d);
        if (i >= 0) openDialogs.splice(i, 1);
        if (d.open) openDialogs.push(d);
      }
      if (!frame)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          scan();
          placeBar();
        });
    });
    scan();
    placeBar();
    // "open": popups. "data-filter", "hidden": the log filter and the group switcher hide blocks.
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "data-filter", "hidden"] });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Esc first closes an open popup (the browser does that); only with no popup open does it end Ref mode.
      if (document.querySelector("dialog[open]")) return;
      turn(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      mo.disconnect();
      ro.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      for (const c of document.querySelectorAll(`.${CHIP}`)) c.remove();
      for (const el of document.querySelectorAll("[data-ui-dup]")) el.removeAttribute("data-ui-dup");
      html.removeAttribute("data-ref-mode");
      html.style.removeProperty("--ref-bar-h");
      host.remove();
    };
  }, [on, turn, announce]);

  const openMap = () => {
    const d = mapRef.current;
    if (!d || d.open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const group = currentGroup();
    setMapGroup(group);
    d.showModal();
    // Start at the group of the tab or popup the owner is looking at.
    window.requestAnimationFrame(() => {
      const sec = group ? d.querySelector<HTMLElement>(`[data-map-group="${group}"]`) : null;
      if (sec) sec.scrollIntoView({ block: "start" });
    });
    // Give focus back to the button that opened the map (List all) when it closes.
    d.addEventListener(
      "close",
      () => {
        if (opener?.isConnected) opener.focus();
      },
      { once: true },
    );
  };

  return (
    <>
      <div className="ref-toggle-wrap" data-ui-ref="HD-4" data-ui-pos="below">
        <button
          ref={buttonRef}
          type="button"
          className="ref-toggle"
          aria-pressed={on}
          aria-describedby="ref-toggle-desc"
          title={DESCRIPTION}
          data-testid="ref-toggle"
          data-ready={mounted ? "" : undefined}
          onClick={() => turn(!on)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 3" />
            <path d="M7 8 H13" />
          </svg>
          Ref
        </button>
        <span id="ref-toggle-desc" className="sr-only">
          {DESCRIPTION}
        </span>
      </div>
      {on &&
        mounted &&
        createPortal(
          <div className="ui-ref-bar" role="region" aria-label="Ref mode" data-testid="ref-bar">
            <span className="ui-ref-bar-text">
              <strong>Ref mode</strong>
              <span className="ui-ref-bar-hint">: click a label to copy it.</span>
            </span>
            <span className="ui-ref-bar-actions">
              <button type="button" className="ui-ref-bar-btn" onClick={openMap} aria-haspopup="dialog">
                List all
              </button>
              <button type="button" className="ui-ref-bar-btn" onClick={() => turn(false)}>
                Turn off
              </button>
            </span>
            <p className="ui-ref-status" role="status" data-testid="ref-status">
              {status}
            </p>
          </div>,
          getBarHost(),
        )}
      {mounted && createPortal(<LayoutMap dialogRef={mapRef} current={mapGroup} />, document.body)}
    </>
  );
}

/** The Layout map popup: every block id and its name, by header, tab and popup, with jump links. */
function LayoutMap({ dialogRef, current }: { dialogRef: React.RefObject<HTMLDialogElement | null>; current: UiPrefix | null }) {
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, [dialogRef]);
  const groups = layoutMap();
  // The jump links scroll inside the popup (the page address does not change).
  const jump = (e: React.MouseEvent, prefix: UiPrefix) => {
    e.preventDefault();
    dialogRef.current?.querySelector<HTMLElement>(`[data-map-group="${prefix}"]`)?.scrollIntoView({ block: "start" });
  };
  return (
    <dialog ref={dialogRef} id={MAP_ID} className="modal layout-map" aria-labelledby="layout-map-title" data-testid="layout-map">
      <div className="modal-panel">
        <div className="phase-head">
          <div className="phase-head-text">
            <h2 id="layout-map-title" className="phase-title">
              Layout map
            </h2>
            <p className="phase-summary">
              Every block of the portal with its fixed name. Use the id and name in your feedback, for example “Overview › OV-3 What
              happens next”. An id with “.1”, “.2” after it is one of several items that look the same; they are listed under their
              group. The header labels show only the id: point at one to see its name. Ref mode moves nothing on the page, so the
              spacing you see is the real spacing.
            </p>
            <nav aria-label="Jump to" data-testid="layout-map-jump">
              <ul className="layout-map-jump">
                {groups.map((g) => (
                  <li key={g.prefix}>
                    <a href={`#layout-map-${g.prefix}`} aria-current={g.prefix === current ? "true" : undefined} onClick={(e) => jump(e, g.prefix)}>
                      {g.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <button type="button" className="icon-btn icon-btn-lg" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </div>
        <div className="phase-body layout-map-body">
          {groups.map((g) => (
            <section
              key={g.prefix}
              aria-labelledby={`layout-map-${g.prefix}`}
              className={`stack-8 layout-map-group${g.prefix === current ? " is-current" : ""}`}
              data-map-group={g.prefix}
            >
              <h3 id={`layout-map-${g.prefix}`} className="h3">
                {g.label}
                {g.prefix === current && <span className="muted small"> · {UI_SCOPES[g.prefix].scope === "popup" ? "the open popup" : "this tab"}</span>}
              </h3>
              <table className="table layout-map-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-short">
                      Id
                    </th>
                    <th scope="col">Block</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <Fragment key={r.id}>
                      <tr data-map-id={r.id}>
                        <td className="mono">{r.id}</td>
                        <td>
                          {r.name}
                          {r.item && r.items.length === 0 && (
                            <span className="muted">
                              {" "}
                              · each item: {r.item}
                              {r.numbering && <>, {r.numbering}</>}
                            </span>
                          )}
                        </td>
                      </tr>
                      {r.items.map((it) => (
                        <tr key={it.id} data-map-item={it.id} className="layout-map-items">
                          <td className="mono">{it.id}</td>
                          <td>{it.name}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
