// Research tab: placeholder until its view is built (next p0.17 step); reads plan/portal/research.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Research" };

export default async function Page() {
  const f = (await getPortal()).files.research;
  return <TabPlaceholder title="Research" summary={f?.summary ?? null} file="research.json" />;
}
