// Questions tab: placeholder until its view is built (next p0.17 step); reads plan/portal/questions.json.
import type { Metadata } from "next";
import TabPlaceholder from "@/components/portal/TabPlaceholder";
import { getPortal } from "@/lib/portal/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Questions" };

export default async function Page() {
  const f = (await getPortal()).files.questions;
  return <TabPlaceholder title="Questions" summary={f?.summary ?? null} file="questions.json" />;
}
