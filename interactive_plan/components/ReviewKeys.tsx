"use client";
/**
 * Review-mode keys (ip-routes-and-views §3.11): `j` = next item, `k` = previous item. Ignored while
 * typing in a field, or with a modifier key, so the approve-bar comment box keeps working.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReviewKeys({ prev, next }: { prev: string | null; next: string | null }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const href = e.key === "j" ? next : e.key === "k" ? prev : null;
      if (href) {
        e.preventDefault();
        router.push(href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}
