// 404 (ip-routes-and-views §1): lists close matches by edit distance on ids.
import Link from "next/link";
import { connection } from "next/server";
import CloseMatches from "@/components/CloseMatches";
import { getIndex } from "@/lib/server/data";

export default async function NotFound() {
  // Render per request (never prerendered at build time): the wiki changes while the app runs.
  await connection();
  let ids: string[] = [];
  try {
    ids = [...(await getIndex()).byId.keys()].sort();
  } catch {
    ids = [];
  }
  return (
    <article className="page narrow">
      <header className="page-header">
        <p className="eyebrow">404</p>
        <h1 className="page-title">Not found</h1>
        <p className="muted">No page, id or file matches this address.</p>
      </header>
      <CloseMatches ids={ids} />
      <p className="small">
        Try <Link href="/search">search</Link> or browse the <Link href="/wiki">wiki</Link>.
      </p>
    </article>
  );
}
