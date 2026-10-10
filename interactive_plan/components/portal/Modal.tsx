"use client";
/**
 * A large popup (the phase popup of the Phase-Modal mockup). The content is rendered on the server and
 * passed as children; <OpenModalButton target> opens it. Native <dialog> + showModal(): the page
 * behind is inert, Esc or the close button or a backdrop click closes it, and focus returns to the
 * button that opened it.
 */
import { useEffect, useRef } from "react";

const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

export function OpenModalButton({
  target,
  className,
  children,
  label,
}: {
  target: string;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-label={label}
      data-opens={target}
      onClick={(e) => {
        const d = document.getElementById(target);
        if (!(d instanceof HTMLDialogElement) || d.open) return;
        openers.set(d, e.currentTarget);
        d.showModal();
      }}
    >
      {children}
    </button>
  );
}

export default function Modal({
  id,
  labelledBy,
  className,
  children,
}: {
  id: string;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => {
      const o = openers.get(d);
      openers.delete(d);
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
  return (
    <dialog ref={ref} id={id} aria-labelledby={labelledBy} className={`modal ${className ?? ""}`}>
      <div className="modal-panel">{children}</div>
    </dialog>
  );
}

/** The close button inside a Modal (closes the nearest dialog). */
export function CloseModalButton() {
  return (
    <button type="button" className="icon-btn icon-btn-lg" aria-label="Close" onClick={(e) => e.currentTarget.closest("dialog")?.close()}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 6 L18 18 M18 6 L6 18" />
      </svg>
    </button>
  );
}
