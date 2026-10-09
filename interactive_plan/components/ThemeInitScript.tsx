"use client";
/**
 * The pre-paint theme script (ip-routes-and-views §4). Server-rendered as a normal inline script, so
 * it runs before first paint. When React renders the root layout on the client (a 404 from
 * notFound() re-renders it there), the element is a data block (`type="text/plain"`): a script that
 * React creates on the client never runs anyway, and React only warns ("Encountered a script tag
 * while rendering React component") for executable script types. suppressHydrationWarning covers
 * the type attribute differing between the server HTML and the client render.
 */
import { THEME_INIT_SCRIPT } from "./themeScript";

export default function ThemeInitScript() {
  const onServer = typeof window === "undefined";
  return <script type={onServer ? undefined : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
