"use client";
/**
 * The global reference popup. Any <Ref id> on any page calls `open(id)`; one modal <dialog> shows the
 * refs.json explainer (kind, title, status, summary) and buttons for the related ids, which open in
 * the same dialog (a Back button returns). Native <dialog> + showModal(): focus moves into the dialog,
 * the rest of the page is inert, Esc closes it; on close, focus returns to the button that opened it.
 * For a phase id, a button opens the full phase popup (rendered once in the layout) in its place.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { phaseDialogId } from "@/lib/portal/dialogs";
import { friendlyId, popupKind, resolveRef, type RefData, type RefInfo } from "@/lib/portal/refs";
import { openModal } from "./Modal";

interface RefContextValue {
  data: RefData;
  open: (id: string, opener?: HTMLElement | null) => void;
}

const EMPTY: RefData = { entries: {}, aliases: {} };
const RefContext = createContext<RefContextValue>({ data: EMPTY, open: () => {} });

export function useRefs(): RefContextValue {
  return useContext(RefContext);
}

export default function RefProvider({
  data,
  phaseIds,
  children,
}: {
  data: RefData;
  /** Phases that have a phase popup on every page. */
  phaseIds: readonly string[];
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [stack, setStack] = useState<string[]>([]);

  const open = useCallback((id: string, opener?: HTMLElement | null) => {
    const d = dialogRef.current;
    if (!d) return;
    if (d.open) {
      setStack((s) => (s[s.length - 1] === id ? s : [...s, id]));
      return;
    }
    openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setStack([id]);
    d.showModal();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  // After every content change, put focus on the title so screen readers announce the new explainer.
  const current = stack[stack.length - 1];
  useEffect(() => {
    if (current !== undefined && dialogRef.current?.open) headingRef.current?.focus();
  }, [current, stack.length]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClose = () => {
      setStack([]);
      const o = openerRef.current;
      openerRef.current = null;
      if (o && o.isConnected) o.focus();
    };
    // A click on the backdrop (the dialog element itself, outside its panel) closes it.
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener("close", onClose);
    d.addEventListener("click", onClick);
    return () => {
      d.removeEventListener("close", onClose);
      d.removeEventListener("click", onClick);
    };
  }, []);

  const value = useMemo(() => ({ data, open }), [data, open]);
  const info: RefInfo | null = current === undefined ? null : resolveRef(data, current);
  const phasePopup = info && info.kind === "phase" && phaseIds.includes(info.id) ? info.id : null;

  // Swap the small explainer for the full phase popup; focus later returns to the original opener.
  const openPhase = useCallback((id: string) => {
    const opener = openerRef.current;
    openerRef.current = null;
    dialogRef.current?.close();
    openModal(phaseDialogId(id), opener);
  }, []);

  return (
    <RefContext.Provider value={value}>
      {children}
      <dialog ref={dialogRef} className="ref-dialog" aria-labelledby="ref-dialog-title" data-testid="ref-dialog">
        <div className="ref-dialog-panel">
          <div className="ref-dialog-head">
            <div className="ref-dialog-kind">
              {/* Kind in words plus the short name the owner knows ("Decision 19", "P1"), never the internal slug. */}
              {info ? popupKind(info).head : "Reference"}
              {info && popupKind(info).extra && <span className="ref-dialog-id">{popupKind(info).extra}</span>}
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
          </div>
          <h2 id="ref-dialog-title" ref={headingRef} tabIndex={-1} className="ref-dialog-title">
            {info ? info.title : current !== undefined ? `No explainer for ${current}` : ""}
          </h2>
          {info ? (
            <>
              <p className="ref-dialog-summary">{info.summary}</p>
              {info.status && (
                <p className="ref-dialog-status">
                  <span className="muted">Status:</span> {info.status}
                </p>
              )}
              {phasePopup && (
                <button type="button" className="primary-btn" data-open-phase={phasePopup} onClick={() => openPhase(phasePopup)}>
                  Open the whole phase: tasks, checks and gate →
                </button>
              )}
              {info.related.length > 0 && (
                <div className="ref-dialog-related">
                  <div className="eyebrow">Related</div>
                  <ul>
                    {info.related.map((rid) => {
                      const r = resolveRef(data, rid);
                      return (
                        <li key={rid}>
                          <button type="button" className="ref-related" data-ref-id={rid} onClick={() => open(rid)}>
                            <span className="ref-related-title">{r ? r.title : rid}</span>
                            {r && friendlyId(r.id, r.kind) && !r.title.startsWith(friendlyId(r.id, r.kind)!) && (
                              <span className="ref-related-id">{friendlyId(r.id, r.kind)}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            current !== undefined && <p className="ref-dialog-summary">The portal text has no explainer for this id yet. Tell Claude: “{current} has no explainer”.</p>
          )}
          {stack.length > 1 && (
            <button type="button" className="text-btn" onClick={() => setStack((s) => s.slice(0, -1))}>
              ← Back to {resolveRef(data, stack[stack.length - 2])?.title ?? stack[stack.length - 2]}
            </button>
          )}
        </div>
      </dialog>
    </RefContext.Provider>
  );
}
