"use client";
/** The top tabs of the Main mockup (Layout A), with the current tab marked (aria-current="page"). */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveTab, TABS } from "@/lib/portal/tabs";

export default function TopNav({ waiting }: { waiting: number }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Sections" className="tabs">
      <ul className="tabs-list">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="tab" aria-current={isActiveTab(t.href, pathname) ? "page" : undefined}>
              {t.label}
              {t.href === "/questions" && waiting > 0 && (
                <span className="tab-badge" aria-label={`${waiting} waiting for you`}>
                  {waiting}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
