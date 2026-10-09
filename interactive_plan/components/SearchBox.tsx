"use client";
/**
 * Top-bar search (ip-routes-and-views §2, §3.9): `/` focuses it, suggestions (ids and titles) appear
 * as you type, Enter goes to /search, an exact id match (or a chosen suggestion) jumps to /go/[id].
 * Without JavaScript it is a plain GET form to /search.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { suggest, type Suggestion } from "@/lib/wiki/search";

export default function SearchBox({ items, initial = "" }: { items: Suggestion[]; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => suggest(items, q), [items, q]);
  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (target: string) => {
    setOpen(false);
    router.push(target);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (open && active >= 0 && results[active]) return go("/go/" + encodeURIComponent(results[active].id));
    if (v === "") return;
    if (ids.has(v)) return go("/go/" + encodeURIComponent(v));
    go("/search?q=" + encodeURIComponent(v));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const expanded = open && results.length > 0;
  return (
    <form role="search" action="/search" method="get" className="searchbox" onSubmit={submit}>
      <label htmlFor={listId + "-input"} className="sr-only">
        Search the wiki
      </label>
      <svg className="searchbox-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        id={listId + "-input"}
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search ids, titles, text"
        value={q}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      <kbd className="searchbox-kbd" aria-hidden="true">
        /
      </kbd>
      <ul id={listId} role="listbox" className="searchbox-list" hidden={!expanded} aria-label="Suggestions">
        {results.map((r, i) => (
          <li
            key={r.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className="searchbox-option"
            onMouseDown={(e) => {
              e.preventDefault();
              go("/go/" + encodeURIComponent(r.id));
            }}
          >
            <span className="mono">{r.id}</span>
            <span className="searchbox-option-title">{r.title}</span>
          </li>
        ))}
      </ul>
    </form>
  );
}
