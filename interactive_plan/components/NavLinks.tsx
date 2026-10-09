"use client";
/** Primary navigation with the active section marked (aria-current). */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV } from "@/lib/ui/nav";

export default function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="nav">
      <ul className="nav-list">
        {NAV.map((n) => (
          <li key={n.href}>
            {n.ready ? (
              <Link href={n.href} className="nav-link" aria-current={isActive(n.href, pathname) ? "page" : undefined}>
                {n.label}
              </Link>
            ) : (
              <span className="nav-link nav-link-disabled" aria-disabled="true" title={`${n.label}: arrives in build step ${n.step}`}>
                {n.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
