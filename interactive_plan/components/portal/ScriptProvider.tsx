"use client";
/**
 * The script popup. Any <ScriptButton path> calls `open(path)`; one modal <dialog> shows the real
 * check script, read from the repo through GET /api/script (only scripts the portal text names), with
 * the command that runs it. Read-only: the portal never runs anything. Native <dialog> + showModal(),
 * so it stacks on top of a phase popup; Esc or Close returns focus to the button that opened it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isCheckScript, runCommand } from "@/lib/portal/scriptCommand";
import { popupContext, ui } from "@/lib/portal/uiRefs";

type Load = { state: "loading" } | { state: "ok"; text: string } | { state: "error"; message: string };

interface ScriptContextValue {
  open: (path: string, opener?: HTMLElement | null) => void;
}

const ScriptContext = createContext<ScriptContextValue>({ open: () => {} });

export function useScripts(): ScriptContextValue {
  return useContext(ScriptContext);
}

export default function ScriptProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const [path, setPath] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const open = useCallback((p: string, opener?: HTMLElement | null) => {
    const d = dialogRef.current;
    if (!d) return;
    openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPath(p);
    if (!d.open) d.showModal();
  }, []);

  // Fetch the script text whenever the shown path changes (cached for the life of the page).
  useEffect(() => {
    if (path === null) return;
    const hit = cache.current.get(path);
    if (hit !== undefined) {
      setLoad({ state: "ok", text: hit });
      return;
    }
    setLoad({ state: "loading" });
    const ctl = new AbortController();
    fetch(`/api/script?path=${encodeURIComponent(path)}`, { signal: ctl.signal })
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || `The portal answered ${r.status}.`);
        cache.current.set(path, text);
        setLoad({ state: "ok", text });
      })
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return;
        setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => ctl.abort();
  }, [path]);

  useEffect(() => {
    if (path !== null && dialogRef.current?.open) headingRef.current?.focus();
  }, [path]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClose = () => {
      setPath(null);
      const o = openerRef.current;
      openerRef.current = null;
      if (o && o.isConnected) o.focus();
    };
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

  const value = useMemo(() => ({ open }), [open]);
  const name = path?.split("/").pop() ?? "";

  return (
    <ScriptContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className="modal script-dialog"
        aria-labelledby="script-dialog-title"
        data-testid="script-dialog"
        data-ui-context={popupContext("SC", name)}
      >
        <div className="modal-panel">
          <div className="phase-head" {...ui("SC-1", { pos: "edge" })}>
            <div className="phase-head-text">
              <div className="eyebrow">{path && isCheckScript(path) ? "Check script" : "Script"} · read-only copy from the repo</div>
              <h2 id="script-dialog-title" ref={headingRef} tabIndex={-1} className="script-title">
                {name}
              </h2>
              {path && <div className="mono small muted">{path}</div>}
            </div>
            <button type="button" className="icon-btn icon-btn-lg" aria-label="Close" onClick={() => dialogRef.current?.close()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
          </div>
          <div className="phase-body script-body">
            {path && (
              <div className="stack-8" {...ui("SC-2")}>
                <div className="small strong">To run it, open PowerShell 7 in the repo folder and type:</div>
                <pre className="code-block code-sm">{runCommand(path)}</pre>
                {isCheckScript(path) ? (
                  <p className="small muted lh" data-testid="script-note">
                    It explains itself at the top, then prints PASS, FAIL or NOT READY for each step. It changes nothing unless you add
                    -SaveEvidence.
                  </p>
                ) : (
                  <p className="small muted lh" data-testid="script-note">
                    Read its explanation at the top before you run it: it says what the script does, what it changes and how to stop it.
                  </p>
                )}
              </div>
            )}
            <div {...ui("SC-3", { pos: "right" })}>
              <div aria-live="polite" aria-busy={load.state === "loading"}>
                {load.state === "loading" && <p className="muted">Loading the script…</p>}
                {load.state === "error" && (
                  <p className="note" role="alert">
                    {load.message}
                  </p>
                )}
                {load.state === "ok" && (
                  <pre className="code-block script-code" tabIndex={0} aria-label={`Contents of ${name}`} data-testid="script-text">
                    {load.text}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </ScriptContext.Provider>
  );
}

/** A button that opens the script popup for one script (the "Check script" cells of the mockup). */
export function ScriptButton({ path, children, className }: { path: string; children?: React.ReactNode; className?: string }) {
  const { open } = useScripts();
  const name = path.split("/").pop() ?? path;
  return (
    <button
      type="button"
      className={className ?? "script-chip"}
      aria-haspopup="dialog"
      data-script={path}
      title={`Read ${name}`}
      onClick={(e) => open(path, e.currentTarget)}
    >
      {children ?? name}
    </button>
  );
}
