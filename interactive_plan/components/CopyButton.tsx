"use client";
/** Copies a short text (an id, a repo path) to the clipboard and announces it politely. */
import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label={label}
        title={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            /* clipboard unavailable (insecure context or denied): nothing to do */
          }
        }}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
          <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span className="copy-state">{done ? "Copied" : ""}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? `Copied ${text}` : ""}
      </span>
    </>
  );
}
