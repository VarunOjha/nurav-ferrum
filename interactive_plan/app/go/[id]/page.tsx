// /go/<id> (ip-routes-and-views §1): redirects a page id (or Q-NNN, or a task id pN.M) to its view;
// an unknown id is a 404 listing close matches (app/not-found.tsx).
import { notFound, redirect } from "next/navigation";
import { getIndex } from "@/lib/server/data";
import { goTarget } from "@/lib/wiki/routes";

export const dynamic = "force-dynamic";

export default async function Go({ params }: PageProps<"/go/[id]">) {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const target = goTarget(await getIndex(), decoded);
  if (!target) notFound();
  redirect(target);
}
