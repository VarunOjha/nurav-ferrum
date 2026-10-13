//! Local HTTPS fixture server for Ferrum's navigation tests (P2 task p2.1). Test support only, never shipped.
//!
//! Every page is deterministic. The routes are listed in [`ROUTES`] and served by [`router`]. TLS uses a leaf
//! certificate for `localhost` / `127.0.0.1` / `::1`, signed at start-up by a local development CA that lives
//! outside the repository ([`ca`]). The CA is **name-constrained** to those loopback names, so it cannot vouch
//! for any real website even if its key leaked (owner decision Q-202, 2026-10-11).
#![forbid(unsafe_code)]

pub mod ca;

use std::time::Duration;

use axum::Router;
use axum::extract::{Path, Query};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::routing::get;

/// One documented fixture route: path, expected status code (for a request without following redirects) and purpose.
pub struct Route {
    /// Request path (with query, if the route needs one).
    pub path: &'static str,
    /// Status code the server answers with.
    pub status: u16,
    /// What the page is for.
    pub purpose: &'static str,
}

/// The documented routes (README and the p2.1 check script list the same table).
pub const ROUTES: &[Route] = &[
    Route {
        path: "/",
        status: 200,
        purpose: "index listing every fixture",
    },
    Route {
        path: "/landing",
        status: 200,
        purpose: "plain target page for redirects and links",
    },
    Route {
        path: "/redirect/301",
        status: 301,
        purpose: "permanent redirect to /landing",
    },
    Route {
        path: "/redirect/302",
        status: 302,
        purpose: "found redirect to /landing",
    },
    Route {
        path: "/redirect/303",
        status: 303,
        purpose: "see-other redirect to /landing",
    },
    Route {
        path: "/redirect/307",
        status: 307,
        purpose: "temporary redirect (method kept) to /landing",
    },
    Route {
        path: "/redirect/308",
        status: 308,
        purpose: "permanent redirect (method kept) to /landing",
    },
    Route {
        path: "/redirect/chain",
        status: 301,
        purpose: "chain: 301 to /redirect/302, then /landing",
    },
    Route {
        path: "/redirect/loop",
        status: 302,
        purpose: "redirects to itself forever (loop)",
    },
    Route {
        path: "/links/blank",
        status: 200,
        purpose: "target=_blank link and a window.open button",
    },
    Route {
        path: "/links/popup",
        status: 200,
        purpose: "opens a window from script alone, without a click (pop-up)",
    },
    Route {
        path: "/links/google",
        status: 200,
        purpose: "a sign-in link to the test-only Google sign-in pattern (/oauth-test/o/oauth2/v2/auth)",
    },
    Route {
        path: "/links/schemes",
        status: 200,
        purpose: "mailto: and custom-scheme (ferrum-test:) links",
    },
    Route {
        path: "/cookie/set",
        status: 200,
        purpose: "sets cookie fixture=1 (Secure, HttpOnly, SameSite=Lax)",
    },
    Route {
        path: "/cookie/read",
        status: 200,
        purpose: "shows the Cookie header the browser sent",
    },
    Route {
        path: "/slow?ms=2000",
        status: 200,
        purpose: "answers after a delay (ms, at most 30000)",
    },
    Route {
        path: "/status/404",
        status: 404,
        purpose: "not-found error page",
    },
    Route {
        path: "/ipc-probe",
        status: 200,
        purpose: "tries Ferrum's app bridge (app command, event listen, event emit); reports in the title",
    },
    Route {
        path: "/counted/a",
        status: 200,
        purpose: "counts its own requests per name; shows count:N (back/forward/reload tests)",
    },
    Route {
        path: "/cookie/set-persistent",
        status: 200,
        purpose: "sets cookie keep=1 for one day (persistence across restarts)",
    },
    Route {
        path: "/status/500",
        status: 500,
        purpose: "server error page",
    },
    Route {
        path: "/cookie/set-none",
        status: 200,
        purpose: "sets cookie third=1 (SameSite=None, one day): readable from frames on other sites (p3.6)",
    },
    Route {
        path: "/frame?src=/cookie/read",
        status: 200,
        purpose: "shows the https address in src (or a path on this site) in a frame (p3.6)",
    },
    Route {
        path: "/links/to?href=/landing",
        status: 200,
        purpose: "one link to the https address in href (or a path on this site) (p3.6)",
    },
    Route {
        path: "/download/file?bytes=65536",
        status: 200,
        purpose: "a download of N deterministic bytes (at most 50 MB), named fixture-N.bin (p3.8)",
    },
    Route {
        path: "/download/fail",
        status: 200,
        purpose: "a download that breaks off: announces 1 MB, sends 4 KB, then the connection ends (p3.8)",
    },
    Route {
        path: "/busy",
        status: 200,
        purpose: "a page whose script runs a never-ending loop 200 ms after load (p3.9)",
    },
    Route {
        path: "/links/download",
        status: 200,
        purpose: "a link that opens a download in a new window (target=_blank to /download/file?bytes=300000) (p3.16)",
    },
    Route {
        path: "/icon",
        status: 200,
        purpose: "a page with its own site icon (/icon.png, a 16x16 orange square) (p3.16)",
    },
    Route {
        path: "/icon.png",
        status: 200,
        purpose: "the site icon of /icon (PNG) (p3.16)",
    },
    Route {
        path: "/goto?url=/landing",
        status: 302,
        purpose: "a redirect (302) to the https address in url (or a path on this site), for example another host (p4.3)",
    },
    Route {
        path: "/links/open?href=/landing",
        status: 200,
        purpose: "a button that opens the https address in href (or a path on this site) with window.open (p4.3)",
    },
    Route {
        path: "/links/risky",
        status: 200,
        purpose: "links of types Ferrum always refuses (ms-msdt:, search-ms:), for the p4.4 tests; harmless inside Ferrum",
    },
];

/// The bytes of `/download/file?bytes=N`: byte `i` is `(31 * i + 7) mod 251`, so any client can check them.
pub fn download_bytes(n: usize) -> Vec<u8> {
    (0..n).map(|i| ((31 * i + 7) % 251) as u8).collect()
}

/// An address a fixture may point to: an `https:` address or a path on this site, with characters that could end
/// the HTML attribute escaped.
fn safe_target(s: &str) -> Option<String> {
    let ok = s.starts_with("https://") || (s.starts_with('/') && !s.starts_with("//"));
    ok.then(|| {
        s.replace('&', "&amp;")
            .replace('"', "&quot;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
    })
}

#[derive(serde::Deserialize)]
struct Target {
    src: Option<String>,
    href: Option<String>,
    url: Option<String>,
}

async fn frame(Query(q): Query<Target>) -> Response {
    match q.src.as_deref().and_then(safe_target) {
        Some(src) => page(
            "Frame",
            &format!(
                "<iframe id=\"frame\" src=\"{src}\" style=\"width:90%;height:300px\"></iframe>"
            ),
        )
        .into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            page("Bad frame", "<p>src must be https or a path.</p>"),
        )
            .into_response(),
    }
}

async fn goto(Query(q): Query<Target>) -> Response {
    // safe_target escapes for HTML; a Location header needs the address as given, so check it the same way.
    match q.url.as_deref().filter(|u| safe_target(u).is_some()) {
        Some(url) => (StatusCode::FOUND, [(header::LOCATION, url.to_string())]).into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            page("Bad redirect", "<p>url must be https or a path.</p>"),
        )
            .into_response(),
    }
}

async fn links_open(Query(q): Query<Target>) -> Response {
    match q.href.as_deref().and_then(safe_target) {
        Some(href) => page(
            "Open",
            &format!(
                "<p><button id=\"open\" data-href=\"{href}\" onclick=\"window.open(this.dataset.href)\">Open {href} in a new window</button></p>"
            ),
        )
        .into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            page("Bad link", "<p>href must be https or a path.</p>"),
        )
            .into_response(),
    }
}

async fn links_to(Query(q): Query<Target>) -> Response {
    match q.href.as_deref().and_then(safe_target) {
        Some(href) => page(
            "Link",
            &format!("<p><a id=\"to\" href=\"{href}\">{href}</a></p>"),
        )
        .into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            page("Bad link", "<p>href must be https or a path.</p>"),
        )
            .into_response(),
    }
}

async fn cookie_set_none() -> Response {
    let mut r = page(
        "Cross-site cookie set",
        "<p>The cookie third=1 was set (SameSite=None).</p>",
    )
    .into_response();
    r.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_static("third=1; Path=/; Max-Age=86400; Secure; SameSite=None"),
    );
    r
}

#[derive(serde::Deserialize)]
struct Bytes {
    bytes: Option<usize>,
}

async fn download_file(Query(q): Query<Bytes>) -> Response {
    let n = q.bytes.unwrap_or(65536).min(50 * 1024 * 1024);
    let disposition = format!("attachment; filename=\"fixture-{n}.bin\"");
    let mut r = download_bytes(n).into_response();
    let h = r.headers_mut();
    h.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    if let Ok(v) = HeaderValue::from_str(&disposition) {
        h.insert(header::CONTENT_DISPOSITION, v);
    }
    r
}

/// The body of `/download/fail`: 4 KB, a pause, then an error, so the connection ends in the middle of the download.
struct BrokenBody {
    step: u8,
    sleep: Option<std::pin::Pin<Box<tokio::time::Sleep>>>,
}

impl futures_core::Stream for BrokenBody {
    type Item = Result<bytes::Bytes, std::io::Error>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        use std::task::Poll;
        match self.step {
            0 => {
                self.step = 1;
                Poll::Ready(Some(Ok(bytes::Bytes::from(download_bytes(4096)))))
            }
            1 => {
                let sleep = self.sleep.get_or_insert_with(|| {
                    Box::pin(tokio::time::sleep(Duration::from_millis(300)))
                });
                match sleep.as_mut().poll(cx) {
                    Poll::Pending => Poll::Pending,
                    Poll::Ready(()) => {
                        self.step = 2;
                        Poll::Ready(Some(Err(std::io::Error::other(
                            "fixture: download broken off on purpose",
                        ))))
                    }
                }
            }
            _ => Poll::Ready(None),
        }
    }
}

async fn download_fail() -> Response {
    // Headers announce 1 MB; the body sends 4 KB, then fails: the server ends the connection mid-download.
    let mut r = axum::body::Body::from_stream(BrokenBody {
        step: 0,
        sleep: None,
    })
    .into_response();
    let h = r.headers_mut();
    h.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    h.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"fixture-fail.bin\""),
    );
    h.insert(header::CONTENT_LENGTH, HeaderValue::from_static("1048576"));
    r
}

async fn busy() -> Html<String> {
    page(
        "Busy page",
        "<p id=\"busy\">This page keeps its script busy forever.</p>\
         <script>setTimeout(function () { for (;;) {} }, 200);</script>",
    )
}

fn page(title: &str, body: &str) -> Html<String> {
    Html(format!(
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>{title}</title>\
         <style>body{{font:16px system-ui,sans-serif;padding:24px}}</style></head><body><h1>{title}</h1>{body}</body></html>"
    ))
}

async fn index() -> Html<String> {
    let rows: String = ROUTES
        .iter()
        .map(|r| {
            format!(
                "<li><a href=\"{p}\">{p}</a> ({s}): {d}</li>",
                p = r.path,
                s = r.status,
                d = r.purpose
            )
        })
        .collect();
    page("Ferrum fixtures", &format!("<ul>{rows}</ul>"))
}

async fn links_download() -> Html<String> {
    page(
        "Download link",
        "<p><a id=\"dl\" href=\"/download/file?bytes=300000\" target=\"_blank\">Download a file (opens a new window)</a></p>",
    )
}

async fn icon_page() -> Html<String> {
    Html(
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Icon</title>\
         <link rel=\"icon\" type=\"image/png\" href=\"/icon.png\"></head><body><h1 id=\"icon\">Icon</h1></body></html>"
            .to_string(),
    )
}

async fn icon_png() -> Response {
    (
        [(header::CONTENT_TYPE, HeaderValue::from_static("image/png"))],
        &include_bytes!("../assets/icon.png")[..],
    )
        .into_response()
}

async fn landing() -> Html<String> {
    page(
        "Landing",
        "<p id=\"landing\">You arrived at the landing page.</p>",
    )
}

async fn redirect(Path(code): Path<String>) -> Response {
    let to = "/landing";
    match code.as_str() {
        "301" => (StatusCode::MOVED_PERMANENTLY, [(header::LOCATION, to)]).into_response(),
        "302" => (StatusCode::FOUND, [(header::LOCATION, to)]).into_response(),
        "303" => Redirect::to(to).into_response(),
        "307" => Redirect::temporary(to).into_response(),
        "308" => Redirect::permanent(to).into_response(),
        "chain" => (
            StatusCode::MOVED_PERMANENTLY,
            [(header::LOCATION, "/redirect/302")],
        )
            .into_response(),
        "loop" => (StatusCode::FOUND, [(header::LOCATION, "/redirect/loop")]).into_response(),
        _ => (
            StatusCode::NOT_FOUND,
            page("Unknown redirect", "<p>No such redirect fixture.</p>"),
        )
            .into_response(),
    }
}

async fn links_blank() -> Html<String> {
    page(
        "New windows",
        "<p><a id=\"blank\" href=\"/landing\" target=\"_blank\">Open the landing page in a new window</a></p>\
         <p><button id=\"open\" onclick=\"window.open('/landing')\">window.open('/landing')</button></p>",
    )
}

async fn links_popup() -> Html<String> {
    page(
        "Pop-up",
        "<p id=\"popup\">This page tries to open /landing in a new window without a click.</p>         <script>addEventListener('load', function () { setTimeout(function () { window.open('/landing'); }, 800); });</script>",
    )
}

async fn links_google() -> Html<String> {
    page(
        "Sign in",
        "<p><a id=\"google\" href=\"/oauth-test/o/oauth2/v2/auth?client_id=fixture&amp;response_type=code\">         Sign in with Google (test pattern)</a></p>",
    )
}

/// Served only if a browser loads the test sign-in address anyway (Ferrum must not: p2.13).
async fn oauth_test() -> Html<String> {
    page(
        "Test sign-in page",
        "<p id=\"oauth-test\">This page should never load inside Ferrum.</p>",
    )
}

async fn links_schemes() -> Html<String> {
    page(
        "Other apps",
        "<p><a id=\"mailto\" href=\"mailto:test@example.invalid\">mailto:test@example.invalid</a></p>\
         <p><a id=\"custom\" href=\"ferrum-test:hello\">ferrum-test:hello</a></p>",
    )
}

async fn links_risky() -> Html<String> {
    page(
        "Risky links",
        "<p><a id=\"msdt\" href=\"ms-msdt:/id%20PCWDiagnostic\">ms-msdt link</a></p>\
         <p><a id=\"searchms\" href=\"search-ms:query=fixture\">search-ms link</a></p>",
    )
}

async fn cookie_set() -> Response {
    let mut r = page("Cookie set", "<p>The cookie fixture=1 was set.</p>").into_response();
    r.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_static("fixture=1; Path=/; Secure; HttpOnly; SameSite=Lax"),
    );
    r
}

async fn cookie_read(headers: HeaderMap) -> Html<String> {
    let cookie = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let shown = if cookie.is_empty() {
        "(none)".to_string()
    } else {
        cookie.replace('<', "&lt;")
    };
    page(
        "Cookie read",
        &format!("<p>Cookie header: <code id=\"cookie\">{shown}</code></p>"),
    )
}

#[derive(serde::Deserialize)]
struct SlowQuery {
    ms: Option<u64>,
}

async fn slow(Query(q): Query<SlowQuery>) -> Html<String> {
    let ms = q.ms.unwrap_or(2000).min(30_000);
    tokio::time::sleep(Duration::from_millis(ms)).await;
    page("Slow page", &format!("<p>Answered after {ms} ms.</p>"))
}

/// Script for /ipc-probe: tries the Tauri bridge if present and reports in the title (it cannot use the bridge).
const IPC_PROBE: &str = r#"<p id="r">probing</p><script>
(async () => {
  const t = window.__TAURI_INTERNALS__;
  const r = { bridge: typeof t !== "undefined", ipc: typeof window.ipc !== "undefined" };
  async function tryCall(cmd, args) {
    try { const v = await t.invoke(cmd, args || {}); return { ok: true, value: String(v) }; }
    catch (e) { return { ok: false, error: String(e) }; }
  }
  if (r.bridge) {
    r.app_command = await tryCall("app_ping");
    r.event_listen = await tryCall("plugin:event|listen", { event: "ferrum-probe", target: { kind: "Any" }, handler: 1 });
    r.event_emit = await tryCall("plugin:event|emit", { event: "ferrum-probe", payload: "x" });
    r.settings_command = await tryCall("settings_set", { input: { startup_urls: ["https://evil.example/"], restore_on_startup: false, sites: [], download_folder: "" } });
    // The P3 feature set's commands (bookmarks, history, backup, appearance): a website may call none of them.
    r.bookmark_command = await tryCall("bookmark_add", { url: "https://evil.example/", title: "x", folder: null });
    r.history_command = await tryCall("history_list", { query: "" });
    r.suggest_command = await tryCall("library_suggest", { query: "a" });
    r.backup_command = await tryCall("backup_export", { path: "C:\\evil.ferrum-backup", passphrase: "0123456789abcdef" });
    r.appearance_command = await tryCall("appearance_set", { bookmarksBar: false });
  }
  document.getElementById("r").textContent = JSON.stringify(r);
  document.title = "IPC-PROBE:" + JSON.stringify(r);
})();
</script>"#;

async fn ipc_probe() -> Html<String> {
    page("IPC probe", IPC_PROBE)
}

static COUNTS: std::sync::OnceLock<std::sync::Mutex<std::collections::HashMap<String, u64>>> =
    std::sync::OnceLock::new();

async fn counted(Path(name): Path<String>) -> Html<String> {
    let n = {
        let mut m = COUNTS.get_or_init(Default::default).lock().unwrap();
        let c = m.entry(name.clone()).or_insert(0);
        *c += 1;
        *c
    };
    let safe: String = name.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    page(
        &format!("Counted {safe}"),
        &format!("<p id=\"count\">count:{n}</p>"),
    )
}

async fn cookie_set_persistent() -> Response {
    let mut r = page(
        "Persistent cookie set",
        "<p>The cookie keep=1 was set for one day.</p>",
    )
    .into_response();
    r.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_static("keep=1; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=Lax"),
    );
    r
}

/// Set by [`serve`]: lets a test stop the server cleanly with `GET /__shutdown` (no kill needed).
static SHUTDOWN: std::sync::OnceLock<axum_server::Handle<std::net::SocketAddr>> =
    std::sync::OnceLock::new();

async fn shutdown() -> Html<String> {
    if let Some(h) = SHUTDOWN.get() {
        h.graceful_shutdown(Some(Duration::from_secs(2)));
    }
    page("Stopping", "<p>The fixture server is stopping.</p>")
}

async fn status(Path(code): Path<u16>) -> Response {
    match code {
        404 => (
            StatusCode::NOT_FOUND,
            page("Not found", "<p>Fixture 404 page.</p>"),
        )
            .into_response(),
        500 => (
            StatusCode::INTERNAL_SERVER_ERROR,
            page("Server error", "<p>Fixture 500 page.</p>"),
        )
            .into_response(),
        _ => (
            StatusCode::BAD_REQUEST,
            page("Unknown status", "<p>Only 404 and 500 exist.</p>"),
        )
            .into_response(),
    }
}

/// The fixture routes as an axum router (no TLS; see [`serve`]).
pub fn router() -> Router {
    Router::new()
        .route("/", get(index))
        .route("/landing", get(landing))
        .route("/redirect/{code}", get(redirect))
        .route("/links/blank", get(links_blank))
        .route("/links/popup", get(links_popup))
        .route("/links/google", get(links_google))
        .route("/oauth-test/{*rest}", get(oauth_test))
        .route("/links/schemes", get(links_schemes))
        .route("/cookie/set", get(cookie_set))
        .route("/cookie/read", get(cookie_read))
        .route("/slow", get(slow))
        .route("/ipc-probe", get(ipc_probe))
        .route("/counted/{name}", get(counted))
        .route("/cookie/set-persistent", get(cookie_set_persistent))
        .route("/__shutdown", get(shutdown))
        .route("/status/{code}", get(status))
        .route("/cookie/set-none", get(cookie_set_none))
        .route("/frame", get(frame))
        .route("/links/to", get(links_to))
        .route("/download/file", get(download_file))
        .route("/download/fail", get(download_fail))
        .route("/busy", get(busy))
        .route("/links/download", get(links_download))
        .route("/icon", get(icon_page))
        .route("/icon.png", get(icon_png))
        .route("/goto", get(goto))
        .route("/links/open", get(links_open))
        .route("/links/risky", get(links_risky))
}

/// Serves the fixtures over HTTPS on `addr` until `exit_after` has passed (or forever when `None`).
/// The server stops by itself; it never needs to be killed.
pub async fn serve(
    addr: std::net::SocketAddr,
    tls: std::sync::Arc<rustls::ServerConfig>,
    exit_after: Option<Duration>,
) -> std::io::Result<()> {
    let handle = axum_server::Handle::new();
    let _ = SHUTDOWN.set(handle.clone());
    if let Some(after) = exit_after {
        let h = handle.clone();
        tokio::spawn(async move {
            tokio::time::sleep(after).await;
            h.graceful_shutdown(Some(Duration::from_secs(2)));
        });
    }
    axum_server::bind_rustls(
        addr,
        axum_server::tls_rustls::RustlsConfig::from_config(tls),
    )
    .handle(handle)
    .serve(router().into_make_service())
    .await
}
