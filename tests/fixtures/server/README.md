# fixture-server (P2 task p2.1)

Local HTTPS server with fixed test pages for Ferrum's navigation tests. Test support only, never shipped.
P6 benchmark workloads may reuse it.

```powershell
cargo run -p fixture-server -- routes                         # documented routes and status codes
cargo run -p fixture-server -- ca init                        # create the local development CA (once)
cargo run -p fixture-server -- serve --port 8443 --exit-after 600   # https://localhost:8443/, stops by itself
cargo test --locked -p fixture-server                         # routes, HTTPS, CA name limit
```

## Local development certificate authority (owner decision Q-202, 2026-10-11)

- Lives outside the repository: `%LOCALAPPDATA%\Ferrum\dev-ca\` (`ca-cert.pem`, `ca-key.pem`), or `FERRUM_DEV_CA_DIR`.
  The key is never committed.
- **Name-constrained** to `localhost`, `127.0.0.0/8` and `::1`: a certificate it signs for any other host is rejected
  (`NameConstraintViolation`, tested in `tests/tls.rs`).
- Installed by the owner into his **user** Root store with his own confirmation:
  `certutil -user -addstore Root "%LOCALAPPDATA%\Ferrum\dev-ca\ca-cert.pem"` (done 2026-10-11). Removing it later
  (`certutil -user -delstore Root <serial>`) is a delete: only with the owner's consent.
- Ferrum's own certificate checks are never weakened. Windows curl needs `--ssl-revoke-best-effort` for these local
  pages, because a private CA has no revocation server; that flag is for test probes only.

## Routes

`fixture-server routes` prints them; they are defined once in `src/lib.rs` (`ROUTES`): index, landing, redirects
301/302/303/307/308, a redirect chain and a loop, `target=_blank` and `window.open`, `mailto:` and `ferrum-test:` links,
cookie set/read (Secure, HttpOnly, SameSite=Lax), a slow page (`/slow?ms=`, at most 30 s), 404 and 500 pages, and
(p4.3) a redirect to any https address or path (`/goto?url=`) and a button that opens one with `window.open`
(`/links/open?href=`); (p4.4) links of types Ferrum always refuses (`/links/risky`); (p4.5) a page whose script asks for each permission kind (`/perm`).
