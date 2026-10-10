"use client";
/**
 * The filter of the Log mockup: All, Has decisions, Has approvals. The server renders every entry with
 * data-has-decisions / data-has-approvals; this only sets data-filter on the list, and CSS hides the
 * entries that do not match. The count is announced politely.
 */
import { useState } from "react";
import { ui } from "@/lib/portal/uiRefs";

type Filter = "all" | "decisions" | "approvals";

const OPTIONS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "decisions", label: "Has decisions" },
  { id: "approvals", label: "Has approvals" },
];

export default function LogFilter({ counts, children }: { counts: Record<Filter, number>; children: React.ReactNode }) {
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <>
      <div className="row-between" {...ui("LO-2")}>
        <p className="small muted" aria-live="polite" data-testid="log-count">
          Showing {counts[filter]} of {counts.all} entries, newest first
        </p>
        <div role="group" aria-label="Filter" className="pill-row">
          {OPTIONS.map((o) => (
            <button key={o.id} type="button" className="pill" aria-pressed={filter === o.id} onClick={() => setFilter(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="log-list" data-filter={filter}>
        {children}
      </div>
    </>
  );
}
