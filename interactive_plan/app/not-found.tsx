// 404 for the read-only portal.
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <section className="card stack-14">
        <h1 className="h1">Page not found</h1>
        <p className="lead">
          This address is not part of the portal. Start from the <Link href="/">Overview</Link>.
        </p>
      </section>
    </div>
  );
}
