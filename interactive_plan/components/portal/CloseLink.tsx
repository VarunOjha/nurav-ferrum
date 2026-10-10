"use client";
/**
 * A link inside a popup: it closes the popup it sits in, then navigates. The phase popups live in the
 * layout, so without this a popup would stay open on top of the next tab.
 */
import Link from "next/link";

export default function CloseLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={className} onClick={(e) => e.currentTarget.closest("dialog")?.close()}>
      {children}
    </Link>
  );
}
