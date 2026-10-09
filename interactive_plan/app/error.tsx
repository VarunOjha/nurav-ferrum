"use client";
// Error boundary (ip-routes-and-views §4): shows the error (which names the file when a loader or
// view error carries a path) instead of a blank page.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <article className="page narrow">
      <header className="page-header">
        <p className="eyebrow">Error</p>
        <h1 className="page-title">This view failed to render</h1>
      </header>
      <div className="banner banner-red" role="alert">
        <p>
          <code>{error.message || "unknown error"}</code>
        </p>
        {error.digest && <p className="small muted">digest {error.digest} (details in the server log)</p>}
      </div>
      <p>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
      </p>
    </article>
  );
}
