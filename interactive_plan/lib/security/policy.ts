/**
 * Response security headers for every route (ip-approvals-api §3.3, IP-9 review fixes). Pure, so
 * next.config.ts, proxy.ts and the unit tests share one definition.
 *
 * - Framing is refused (`X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`): another origin
 *   cannot load the app in an invisible frame and click the approve button (clickjacking turns
 *   the same-origin guard into a write).
 * - Images, fonts, fetches and every other subresource are same-origin (`'self'`, plus `data:` for
 *   images and fonts), so a Mermaid label or any other rendered content cannot make the browser
 *   contact another host (ip-spec: no outbound requests at runtime).
 * - Scripts: `'self'` and `'unsafe-inline'` (Next's inline RSC payload and the pre-paint theme
 *   script); `'unsafe-eval'` only under `next dev`, where React needs it.
 */
export function contentSecurityPolicy(isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export interface HeaderPair {
  key: string;
  value: string;
}

export function securityHeaders(isDev: boolean): HeaderPair[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
}
