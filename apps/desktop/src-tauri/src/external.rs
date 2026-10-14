//! Links to other apps and new windows (P2 task p2.10). Nothing is handed to Windows without the user's click in
//! the shell: the app remembers the one link it asked about, and `external_open_confirm` opens only that link,
//! after checking it again with `ferrum_core::address`.

use std::sync::Mutex;

use ferrum_core::address::{Outcome, normalize, site};
use ferrum_core::config::{NewWindow, Security};
use ferrum_core::oauth::{TestPattern, classify};
use ferrum_security::{Context, Verdict};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use ferrum_core::tabs::Place;

use crate::content::{AppConfig, navigate_tab, open_tab};

/// When each tab last opened a new tab for a page (pop-up rate limit, see `on_new_window`).
#[derive(Default)]
pub struct PopupTimes(pub Mutex<std::collections::HashMap<u64, std::time::Instant>>);

/// The other-site link the shell is asking about, with its tab (p3.6, at most one).
#[derive(Default)]
pub struct PendingCrossSite(pub Mutex<Option<(u64, String)>>);

/// A page in tab `tab` (on `from`) leads to `uri`, which belongs to another site's profile: the shell asks whether to
/// move the tab there (owner answer Q-209). Nothing moves without the user's click.
pub fn ask_cross_site(app: &AppHandle, tab: u64, uri: &str, from: &str) {
    tracing::info!(target: "ferrum::profiles", tab, from = %site(from), to = %site(uri), "asking before moving a tab to another site's profile");
    *app.state::<PendingCrossSite>().0.lock().unwrap() = Some((tab, uri.to_string()));
    let to_site = ferrum_core::profiles::site_key(uri).unwrap_or_default();
    let from_site = ferrum_core::profiles::site_key(from).unwrap_or_default();
    let h = app.clone();
    let uri = uri.to_string();
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to(
            "shell",
            "link",
            json!({"kind": "cross-site", "tab": tab, "uri": uri, "to": to_site, "from": from_site}),
        );
    });
}

/// The user clicked Continue on the other-site bar: the tab moves to that site's profile and loads the address.
#[tauri::command]
pub async fn cross_site_confirm(app: AppHandle, uri: String) -> Result<(), String> {
    let asked = app.state::<PendingCrossSite>().0.lock().unwrap().take();
    match asked {
        Some((tab, u)) if u == uri => {
            tracing::info!(target: "ferrum::profiles", tab, to = %site(&uri), "tab moved to another site's profile");
            navigate_tab(&app, tab, uri);
            Ok(())
        }
        _ => Err("not the link Ferrum asked about".into()),
    }
}

/// The user clicked Cancel on the other-site bar: the tab stays where it is.
#[tauri::command]
pub fn cross_site_cancel(app: AppHandle) {
    app.state::<PendingCrossSite>().0.lock().unwrap().take();
}

/// The link the shell is currently asking about (at most one).
#[derive(Default)]
pub struct PendingExternal(pub Mutex<Option<String>>);

/// Asks the shell to confirm opening `url` in another app. The message is posted, so the shell sees it after the
/// navigation event that triggered it. Every request passes the navigation policy first (p4.4): a link type that is
/// always refused, or missing from the settings' list, is never offered; it is logged and noted on tab `tab`'s toolbar.
pub fn request(app: &AppHandle, tab: u64, url: String) {
    let d = crate::policy::decide(
        &crate::policy::current(app),
        tab,
        Context::TopLevel,
        &url,
        None,
    );
    if d.verdict == Verdict::Deny {
        blocked(app, tab, &url, d.rule.as_str(), false);
        return;
    }
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

/// Tells the shell something tab `tab` asked for was blocked (shown as that tab's toolbar status). `why` is the
/// policy rule's name (for example `blocklist`) or `pop-up`; `frame` says it was a frame inside the page.
pub fn blocked(app: &AppHandle, tab: u64, uri: &str, why: &str, frame: bool) {
    let h = app.clone();
    let (uri, why) = (uri.to_string(), why.to_string());
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to(
            "shell",
            "link",
            json!({"kind": "blocked", "tab": tab, "uri": uri, "why": why, "frame": frame}),
        );
    });
}

/// A page-started navigation to a non-web address (called from the navigation gate, which cancels it): links to
/// other apps are offered to the user; everything else stays blocked.
pub fn on_page_navigation(app: &AppHandle, tab: u64, security: &Security, uri: &str) {
    if let Outcome::Confirm { url } = normalize(uri, security) {
        request(app, tab, url.to_string());
    }
}

/// A page in tab `tab` asked for a new window (WebView2 opened none).
///
/// The policy decides first (p4.3): a refused address opens nothing (logged with its rule, noted on the toolbar), a
/// link to another app is offered on the confirmation bar, and an upgraded `http:` address continues as `https:`.
///
/// New tab (default since P3): the address opens in a new tab next to the active one, which becomes active. One tab
/// may open at most one new tab per second; further requests are blocked with a toolbar note. The limit does not use
/// WebView2's user-initiated flag, which reported a script-only pop-up as user-initiated in the P2 and P3 smoke runs;
/// a real pop-up policy belongs to the P4 policy engine. Same view: the address loads in the page's own view, gesture or not. A page can already change its own address
/// by script, so this gives it nothing new (and does not depend on WebView2's user-initiated flag, which the p2.10
/// smoke runs found unreliable for script pop-ups). System browser: a click opens the browser; anything else is
/// offered on the confirmation bar first, so nothing leaves Ferrum silently.
pub fn on_new_window(app: &AppHandle, tab: u64, uri: &str, user_initiated: bool) {
    let security = app.state::<AppConfig>().get().security;
    let from = app
        .state::<crate::content::TabsState>()
        .0
        .lock()
        .unwrap()
        .get(ferrum_core::tabs::TabId(tab))
        .map(|i| i.url.clone())
        .unwrap_or_default();
    let d = crate::policy::decide(
        &crate::policy::current(app),
        tab,
        Context::NewWindow,
        uri,
        (!from.is_empty()).then_some(from.as_str()),
    );
    let upgraded;
    let uri = match &d.verdict {
        Verdict::Deny => return blocked(app, tab, uri, d.rule.as_str(), false),
        Verdict::Upgrade(u) => {
            upgraded = u.clone();
            upgraded.as_str()
        }
        Verdict::Allow | Verdict::AllowInsecure | Verdict::Confirm => uri,
    };
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
                    crate::audit::record(tab, "new-window", uri, "pop-up-rate-limit");
                    blocked(app, tab, uri, "pop-up", false);
                }
            }
            NewWindow::SameView => navigate_tab(app, tab, url.to_string()),
            NewWindow::SystemBrowser if user_initiated => {
                if let Err(e) = launch(url.as_str()) {
                    tracing::warn!(target: "ferrum::external", error = %e, "system browser not opened");
                }
            }
            NewWindow::SystemBrowser => request(app, tab, url.to_string()),
        },
        Outcome::Confirm { url } => request(app, tab, url.to_string()),
        Outcome::Refuse(_) => blocked(app, tab, uri, "new-window", false),
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
    // no command shell is involved. UNVERIFIED[phase-p3-tabs-sessions] (not reported in the owner's first P2 round): confirmed by the owner's manual mailto
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
    app: AppHandle,
    pending: tauri::State<'_, PendingExternal>,
    cfg: tauri::State<'_, AppConfig>,
    uri: String,
) -> Result<(), String> {
    let asked = pending.0.lock().unwrap().take();
    if asked.as_deref() != Some(uri.as_str()) {
        tracing::warn!(target: "ferrum::external", site = %site(&uri), "confirmation refused: not the link Ferrum asked about");
        crate::audit::record(0, "link-to-app-confirm", &uri, "not-the-link-asked-about");
        return Err("not the link Ferrum asked about".into());
    }
    // Checked again at the click (p4.4): the settings may have changed while the bar was showing.
    let d = crate::policy::decide(
        &crate::policy::current(&app),
        0,
        Context::TopLevel,
        &uri,
        None,
    );
    if d.verdict == Verdict::Deny {
        return Err("this link may not be opened outside Ferrum".into());
    }
    if is_sign_in(&uri) {
        // A Google sign-in the app offered (the address is opened exactly as the page asked for it).
        return launch(&uri);
    }
    match normalize(&uri, &cfg.get().security) {
        Outcome::Confirm { url } => launch(url.as_str()),
        // A web page offered for the system browser (new_window = system-browser, see on_new_window).
        Outcome::Navigate { url, .. }
            if cfg.get().security.new_window == NewWindow::SystemBrowser =>
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
