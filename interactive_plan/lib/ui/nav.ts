/**
 * Top-bar navigation (ip-routes-and-views §2). `ready: false` entries are routes of later build
 * steps; they render as disabled labels, never as links to a 404 (decided 2026-10-09, IP-6). The step
 * that builds a route flips its flag.
 */
export interface NavItem {
  href: string;
  label: string;
  ready: boolean;
  /** Build step that adds the route (for the disabled tooltip). */
  step?: string;
}

export const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", ready: true },
  { href: "/roadmap", label: "Roadmap", ready: false, step: "IP-8" },
  { href: "/architecture", label: "Architecture", ready: false, step: "IP-8" },
  { href: "/decisions", label: "Decisions", ready: false, step: "IP-8" },
  { href: "/risks", label: "Risks", ready: false, step: "IP-8" },
  { href: "/research", label: "Research", ready: false, step: "IP-8" },
  { href: "/wiki", label: "Wiki", ready: true },
  { href: "/log", label: "Log", ready: true },
  { href: "/approvals", label: "Approvals", ready: false, step: "IP-7" },
  { href: "/lint", label: "Lint", ready: false, step: "IP-7" },
];

/** Is `href` the active section for `pathname`? */
export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
