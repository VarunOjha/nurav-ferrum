//! Links to other apps and new windows (P2 task p2.10). Nothing is handed to Windows without the user's click in
//! the shell: the app remembers the one link it asked about, and `external_open_confirm` opens only that link,
//! after checking it again with `ferrum_core::address`.

use std::sync::Mutex;

use ferrum_core::address::{Outcome, normalize, site};
use ferrum_core::config::{NewWindow, Security};
use ferrum_core::oauth::{TestPattern, classify};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use ferrum_core::tabs::Place;

use crate::content::{AppConfig, navigate_tab, open_tab};

/// When each tab last opened a new tab for a page (pop-up rate limit, see `on_new_window`).
#[derive(Default)]
pub struct PopupTimes(pub Mutex<std::collections::HashMap<u64, std::time::Instant>>);

/// The link the shell is currently asking about (at most one).
#[derive(Default)]
pub struct PendingExternal(pub Mutex<Option<String>>);

/// Asks the shell to confirm opening `url` in another app. The message is posted, so the shell sees it after the
/// navigation event that triggered it.
pub fn request(app: &AppHandle, url: String) {
    tracing::info!(target: "ferrum::external", site = %site(&url), "asking before opening outside Ferrum");
    *app.state::<PendingExternal>().0.lock().unwrap() = Some(url.clone());
    let scheme = url.split(':').next().unwrap_or("").to_string();
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to(
            "shell",
            "link",
            json!({"kind": "external-request", "uri": url, "scheme": scheme}),
        );
    });
}

/// The extra address that counts as a Google sign-in start in debug builds (the smoke test's fixture link); none
/// in release builds.
pub fn sign_in_test_pattern() -> Option<TestPattern> {
    if cfg!(debug_assertions) {
        Some(TestPattern {
            host: "localhost".into(),
            path_prefix: "/oauth-test/".into(),
        })
    } else {
        None
    }
}

/// True when `uri` starts a Google sign-in (p2.13).
pub fn is_sign_in(uri: &str) -> bool {
    classify(uri, sign_in_test_pattern().as_ref()).is_some()
}

/// Offers to open a Google sign-in in the user's normal browser (owner answer Q-109): the shell shows a bar with
/// "Open in browser"; nothing opens without that click. Ferrum never changes its user agent or works around
/// Google's rule against embedded browsers (adr-0015).
pub fn offer_sign_in(app: &AppHandle, uri: &str) {
    tracing::info!(target: "ferrum::external", site = %site(uri), "Google sign-in offered in the normal browser");
    *app.state::<PendingExternal>().0.lock().unwrap() = Some(uri.to_string());
    let h = app.clone();
    let uri = uri.to_string();
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to(
            "shell",
            "link",
            json!({"kind": "sign-in-offer", "uri": uri}),
        );
    });
}

/// Tells the shell something tab `tab` asked for was blocked (shown as that tab's toolbar status).
fn blocked(app: &AppHandle, tab: u64, uri: &str, why: &str) {
    let h = app.clone();
    let (uri, why) = (uri.to_string(), why.to_string());
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to(
            "shell",
            "link",
            json!({"kind": "blocked", "tab": tab, "uri": uri, "why": why}),
        );
    });
}

/// A page-started navigation to a non-web address (called from the navigation gate, which cancels it): links to
/// other apps are offered to the user; everything else stays blocked.
pub fn on_page_navigation(app: &AppHandle, security: &Security, uri: &str) {
    if let Outcome::Confirm { url } = normalize(uri, security) {
        request(app, url.to_string());
    }
}

/// A page in tab `tab` asked for a new window (WebView2 opened none).
///
/// New tab (default since P3): the address opens in a new tab next to the active one, which becomes active. One tab
/// may open at most one new tab per second; further requests are blocked with a toolbar note. The limit does not use
/// WebView2's user-initiated flag, which reported a script-only pop-up as user-initiated in the P2 and P3 smoke runs;
/// a real pop-up policy belongs to the P4 policy engine. Same view: the address loads in the page's own view, gesture or not. A page can already change its own address
/// by script, so this gives it nothing new (and does not depend on WebView2's user-initiated flag, which the p2.10
/// smoke runs found unreliable for script pop-ups). System browser: a click opens the browser; anything else is
/// offered on the confirmation bar first, so nothing leaves Ferrum silently.
pub fn on_new_window(app: &AppHandle, tab: u64, uri: &str, user_initiated: bool) {
    let security = app.state::<AppConfig>().0.config.security.clone();
    match normalize(uri, &security) {
        Outcome::Navigate { url, .. } => match security.new_window {
            NewWindow::NewTab => {
                let now = std::time::Instant::now();
                let allowed = {
                    let times = app.state::<PopupTimes>();
                    let mut times = times.0.lock().unwrap();
                    let recent = times.get(&tab).is_some_and(|t| {
                        now.duration_since(*t) < std::time::Duration::from_secs(1)
                    });
                    if !recent {
                        times.insert(tab, now);
                    }
                    !recent
                };
                if allowed {
                    open_tab(app, url.to_string(), Place::AfterActive, true);
                } else {
                    tracing::info!(target: "ferrum::external", tab, site = %site(uri), "pop-up blocked (rate limit)");
                    blocked(app, tab, uri, "pop-up");
                }
            }
            NewWindow::SameView => navigate_tab(app, tab, url.to_string()),
            NewWindow::SystemBrowser if user_initiated => {
                if let Err(e) = launch(url.as_str()) {
                    tracing::warn!(target: "ferrum::external", error = %e, "system browser not opened");
                }
            }
            NewWindow::SystemBrowser => request(app, url.to_string()),
        },
        Outcome::Confirm { url } => request(app, url.to_string()),
        Outcome::Refuse(_) => blocked(app, tab, uri, "new-window"),
    }
}

/// Hands `url` to Windows (default browser or app for its scheme). In debug builds, `FERRUM_LAUNCHER_LOG` replaces
/// the launch with a line in that file (smoke tests; nothing opens).
fn launch(url: &str) -> Result<(), String> {
    tracing::info!(target: "ferrum::external", site = %site(url), "opening outside Ferrum");
    #[cfg(debug_assertions)]
    if let Ok(log) = std::env::var("FERRUM_LAUNCHER_LOG") {
        use std::io::Write;
        let mut f = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log)
            .map_err(|e| e.to_string())?;
        return writeln!(f, "{url}").map_err(|e| e.to_string());
    }
    // url.dll's FileProtocolHandler opens an address with its registered handler; the address is one argument,
    // no command shell is involved. UNVERIFIED[phase-p2-minimal-container]: confirmed by the owner's manual mailto
    // check at the exit review.
    std::process::Command::new("rundll32.exe")
        .arg("url.dll,FileProtocolHandler")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// The user clicked Open on the shell's confirmation bar.
#[tauri::command]
pub fn external_open_confirm(
    pending: tauri::State<'_, PendingExternal>,
    cfg: tauri::State<'_, AppConfig>,
    uri: String,
) -> Result<(), String> {
    let asked = pending.0.lock().unwrap().take();
    if asked.as_deref() != Some(uri.as_str()) {
        tracing::warn!(target: "ferrum::external", site = %site(&uri), "confirmation refused: not the link Ferrum asked about");
        return Err("not the link Ferrum asked about".into());
    }
    if is_sign_in(&uri) {
        // A Google sign-in the app offered (the address is opened exactly as the page asked for it).
        return launch(&uri);
    }
    match normalize(&uri, &cfg.0.config.security) {
        Outcome::Confirm { url } => launch(url.as_str()),
        // A web page offered for the system browser (new_window = system-browser, see on_new_window).
        Outcome::Navigate { url, .. }
            if cfg.0.config.security.new_window == NewWindow::SystemBrowser =>
        {
            launch(url.as_str())
        }
        _ => Err("this link may not be opened outside Ferrum".into()),
    }
}

/// The user clicked Cancel (or the bar went away).
#[tauri::command]
pub fn external_cancel(pending: tauri::State<'_, PendingExternal>) {
    tracing::info!(target: "ferrum::external", "user cancelled");
    pending.0.lock().unwrap().take();
}
