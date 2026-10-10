// Log tab: placeholder until its view is built (next p0.17 step); reads plan/portal/log.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

export default async function Page() {
  const f = (await getPortal()).files.log;
  return <TabPlaceholder title="Log" summary={f?.summary ?? null} file="log.json" />;
}
