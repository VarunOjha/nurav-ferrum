/** The portal's top tabs (Main mockup, Layout A; owner decision 2026-10-09). */
export interface Tab {
  href: string;
  label: string;
}

export const TABS: readonly Tab[] = [
  { href: "/", label: "Overview" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/architecture", label: "Architecture" },
  { href: "/decisions", label: "Decisions" },
  { href: "/research", label: "Research" },
  { href: "/security", label: "Security" },
  { href: "/questions", label: "Questions" },
  { href: "/log", label: "Log" },
];

/** Is `href` the current tab for `pathname`? */
export function isActiveTab(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
