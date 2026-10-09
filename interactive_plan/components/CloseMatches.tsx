"use client";
/**
 * 404 helper (ip-routes-and-views §1): lists ids close to the last segment of the requested path, by
 * edit distance. not-found.tsx receives no props, so the requested path comes from usePathname().
 */
import { usePathname } from "next/navigation";
import { closeMatches } from "@/lib/wiki/routes";

export default function CloseMatches({ ids }: { ids: string[] }) {
  const pathname = usePathname() ?? "";
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  let query = last;
  try {
    query = decodeURIComponent(last);
  } catch {
    /* keep raw */
  }
  query = query.replace(/\.md$/, "");
  const unique = closeMatches(ids, query, 6);
  return (
    <section aria-labelledby="close-matches">
      <h2 id="close-matches" className="section-title">
        Close matches
      </h2>
      {unique.length === 0 ? (
        <p className="muted">No id is close to “{query || "/"}”.</p>
      ) : (
        <ul className="link-list">
          {unique.map((id) => (
            <li key={id}>
              <a href={`/go/${encodeURIComponent(id)}`} className="mono">
                {id}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
