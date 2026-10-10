// Decisions tab: placeholder until its view is built (next p0.17 step); reads plan/portal/decisions.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decisions" };

export default async function Page() {
  const f = (await getPortal()).files.decisions;
  return <TabPlaceholder title="Decisions" summary={f?.summary ?? null} file="decisions.json" />;
}
