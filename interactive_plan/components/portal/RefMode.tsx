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
 * a MutationObserver adds them to blocks that appear later (a tab change, a popup's new content). The
 * bar lives in a small host element that moves into the topmost open popup, because a modal popup makes
 * the rest of the page inert. The choice is kept per viewer in localStorage (wrapped in try/catch).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { chipText, copyText, layoutMap, prefixOf, scopeLabel, uiLabel, type UiRefId } from "@/lib/portal/uiRefs";

export const REF_MODE_KEY = "ferrum-portal-ref-mode";
const CHIP = "ui-ref-chip";
const DESCRIPTION = "Show the names of the blocks on this page so you can refer to them in feedback";

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLDialogElement>(null);
  const clearTimer = useRef<number | null>(null);

  const turn = useCallback((next: boolean) => {
    store(next);
    if (!next) {
      setStatus("");
      mapRef.current?.close();
      // A focused label or bar button disappears: give focus back to the Ref button.
      const a = document.activeElement;
      if (a instanceof HTMLElement && (a.classList.contains(CHIP) || a.closest(".ui-ref-bar"))) buttonRef.current?.focus();
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

    // Open popups, in the order they were opened (the last one is on top).
    const openDialogs: HTMLDialogElement[] = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")];
    const placeBar = () => {
      const top = [...openDialogs].reverse().find((d) => d.open && d.isConnected);
      const target = top ?? document.body;
      if (host.parentElement !== target) target.appendChild(host);
    };

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
      for (const el of document.querySelectorAll<HTMLElement>("[data-ui-ref]")) {
        if (el.querySelector(`:scope > .${CHIP}`)) continue;
        const ref = el.getAttribute("data-ui-ref") ?? "";
        const label = uiLabel(ref, el.getAttribute("data-ui-index"), el.getAttribute("data-ui-item"));
        if (!label) continue;
        const b = document.createElement("button");
        b.type = "button";
        b.className = CHIP;
        b.setAttribute("data-ui-chip", label.id);
        b.setAttribute("data-ui-prefix", prefixOf(ref));
        b.textContent = chipText(label);
        b.title = "Copy this name for your feedback";
        b.addEventListener("click", onChip);
        el.insertBefore(b, el.firstChild);
      }
    };

    let frame = 0;
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type !== "attributes" || !(r.target instanceof HTMLDialogElement)) continue;
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
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });

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
      if (frame) window.cancelAnimationFrame(frame);
      for (const c of document.querySelectorAll(`.${CHIP}`)) c.remove();
      html.removeAttribute("data-ref-mode");
      host.remove();
    };
  }, [on, turn, announce]);

  const openMap = () => {
    const d = mapRef.current;
    if (d && !d.open) d.showModal();
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
              <strong>Ref mode:</strong> click a label to copy it.
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
      {mounted && createPortal(<LayoutMap dialogRef={mapRef} />, document.body)}
    </>
  );
}

/** The Layout map popup: every block id and its name, by header, tab and popup. */
function LayoutMap({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
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
  return (
    <dialog ref={dialogRef} className="modal layout-map" aria-labelledby="layout-map-title" data-testid="layout-map">
      <div className="modal-panel">
        <div className="phase-head">
          <div className="phase-head-text">
            <h2 id="layout-map-title" className="phase-title">
              Layout map
            </h2>
            <p className="phase-summary">
              Every block of the portal with its fixed name. Use the id and name in your feedback, for example “Overview › OV-3 What
              happens next”. An id with “.1”, “.2” after it is one of several items that look the same. Ref mode adds a little
              space above each block so the labels fit; turn it off to see the real spacing.
            </p>
          </div>
          <button type="button" className="icon-btn icon-btn-lg" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </div>
        <div className="phase-body layout-map-body">
          {groups.map((g) => (
            <section key={g.prefix} aria-labelledby={`layout-map-${g.prefix}`} className="stack-8 layout-map-group" data-map-group={g.prefix}>
              <h3 id={`layout-map-${g.prefix}`} className="h3">
                {g.label}
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
                    <tr key={r.id} data-map-id={r.id}>
                      <td className="mono">{r.id}</td>
                      <td>
                        {r.name}
                        {r.item && <span className="muted"> · each item: {r.item}</span>}
                      </td>
                    </tr>
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
