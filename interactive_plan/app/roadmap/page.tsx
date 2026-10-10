// Roadmap tab: placeholder until its view is built (next p0.17 step); reads plan/portal/roadmap.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Roadmap" };

export default async function Page() {
  const f = (await getPortal()).files.roadmap;
  return <TabPlaceholder title="Roadmap" summary={f?.summary ?? null} file="roadmap.json" />;
}
