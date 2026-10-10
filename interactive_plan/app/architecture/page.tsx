// Architecture tab: placeholder until its view is built (next p0.17 step); reads plan/portal/architecture.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Architecture" };

export default async function Page() {
  const f = (await getPortal()).files.architecture;
  return <TabPlaceholder title="Architecture" summary={f?.summary ?? null} file="architecture.json" />;
}
