/**
 * Theme state shared by ThemeToggle and the re-theming client components (ip-routes-and-views §4).
 * The choice lives in localStorage (guarded with try/catch) and in `data-theme` on <html>; "system"
 * removes the attribute so `prefers-color-scheme` applies. The inline script in app/layout.tsx applies
 * the stored choice before first paint.
 */
"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./themeScript";

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const EVENT = "ferrum-theme-change";

export function readChoice(): ThemeChoice {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setChoice(choice: ThemeChoice): void {
  const html = document.documentElement;
  if (choice === "system") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", choice);
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

function effectiveTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  mq?.addEventListener?.("change", cb);
  const mo = typeof MutationObserver === "function" ? new MutationObserver(cb) : null;
  mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
    mq?.removeEventListener?.("change", cb);
    mo?.disconnect();
  };
}

/** The stored choice ("system" on the server and before hydration). */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system");
}

/** The theme in effect (choice, else the OS preference). */
export function useEffectiveTheme(): Theme {
  return useSyncExternalStore(subscribe, effectiveTheme, () => "light");
}
