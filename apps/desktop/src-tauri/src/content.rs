//! The content web view (P2 task p2.6): a WebView2 controller created by `ferrum-webview-manager` from Tauri's
//! environment (adr-0029), placed below the shell toolbar. This module is safe Rust: all COM calls live in
//! `ferrum_webview_manager::webview2`, which runs on the UI thread (thread-local `CONTENT`).

use std::rc::Rc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

use ferrum_core::address::{Note, Outcome, Refusal, normalize, site};
use ferrum_core::config::{GoogleOauth, Loaded};
use ferrum_webview_manager::tab::{NavDecision, TabEvent, p2_gate};
use ferrum_webview_manager::webview2::{CONTENT, ContentView};
use serde::Serialize;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};
use windows::Win32::Foundation::RECT;

use crate::band_height;
use crate::external;

/// WebView2 profile of the content view (one profile in P2; one per site in P3, adr-0029).
pub const CONTENT_PROFILE: &str = "ferrum-default";

/// The loaded settings.
pub struct AppConfig(pub Loaded);

/// Where keyboard focus was last put on purpose (for restoring it after Alt+Tab).
#[derive(Default)]
pub struct FocusState {
    /// True when the page (content view) had focus last; false when the shell did.
    pub content_last: AtomicBool,
}

/// Everything the content view reported, as JSON, in order (read by the self-tests).
#[derive(Default)]
pub struct EventLog(pub Mutex<Vec<Value>>);

/// Shell web view title (the shell writes its received events there; read by the self-tests).
#[derive(Default)]
pub struct ShellTitle(pub Mutex<String>);

/// Set once the content view exists.
#[derive(Default)]
pub struct ContentReady(pub AtomicBool);

fn event_json(e: &TabEvent) -> Value {
    match e {
        TabEvent::NavigationStarting {
            id,
            uri,
            user_initiated,
            redirected,
            allowed,
        } => json!({
            "kind": "navigation-starting", "id": id, "uri": uri, "user_initiated": user_initiated,
            "redirected": redirected, "allowed": allowed }),
        TabEvent::SourceChanged { uri } => json!({"kind": "source-changed", "uri": uri}),
        TabEvent::NavigationCompleted {
            id,
            uri,
            success,
            http_status,
            web_error_status,
        } => json!({
            "kind": "navigation-completed", "id": id, "uri": uri, "success": success, "http_status": http_status,
            "web_error_status": web_error_status }),
        TabEvent::HistoryChanged {
            can_go_back,
            can_go_forward,
        } => json!({
            "kind": "history-changed", "can_go_back": can_go_back, "can_go_forward": can_go_forward }),
        TabEvent::TitleChanged { title } => json!({"kind": "title-changed", "title": title}),
        TabEvent::GotFocus => json!({"kind": "got-focus"}),
        TabEvent::NewWindowRequested {
            uri,
            user_initiated,
        } => json!({"kind": "new-window", "uri": uri, "user_initiated": user_initiated}),
        TabEvent::ExternalSchemeRequested {
            uri,
            user_initiated,
        } => json!({"kind": "external-scheme", "uri": uri, "user_initiated": user_initiated}),
    }
}

/// Writes the log line for a tab event (navigation outcomes and decisions; addresses as scheme and host only).
fn log_event(e: &TabEvent) {
    match e {
        TabEvent::NavigationStarting {
            uri,
            allowed: false,
            ..
        } => {
            tracing::info!(target: "ferrum::nav", site = %site(uri), "navigation cancelled by the gate")
        }
        TabEvent::NavigationCompleted {
            uri,
            success,
            http_status,
            web_error_status,
            ..
        } => {
            if *success && *http_status < 400 {
                tracing::info!(target: "ferrum::nav", site = %site(uri), http_status, "page loaded");
            } else {
                tracing::warn!(target: "ferrum::nav", site = %site(uri), success, http_status, web_error_status, "page not loaded normally");
            }
        }
        TabEvent::NewWindowRequested {
            uri,
            user_initiated,
        } => {
            tracing::info!(target: "ferrum::nav", site = %site(uri), user_initiated, "new window requested")
        }
        TabEvent::ExternalSchemeRequested { uri, .. } => {
            tracing::info!(target: "ferrum::nav", site = %site(uri), "link to another app stopped by WebView2")
        }
        _ => {}
    }
}

/// The content area in physical pixels relative to the window's client area.
pub fn content_rect<R: Runtime>(window: &Window<R>) -> tauri::Result<RECT> {
    let size = window.inner_size()?;
    let top = (band_height(window.app_handle()) * window.scale_factor()?).round() as i32;
    Ok(RECT {
        left: 0,
        top,
        right: size.width as i32,
        bottom: (size.height as i32).max(top + 1),
    })
}

/// Creates the content view (call from `setup`; the work runs on the UI thread through the shell's `with_webview`).
pub fn create(app: &AppHandle, window: &Window) -> tauri::Result<()> {
    let rect = content_rect(window)?;
    let hwnd = window.hwnd()?.0 as isize; // plain integer so the closure is Send
    let start = app
        .state::<AppConfig>()
        .0
        .config
        .session
        .startup_urls
        .first()
        .cloned()
        .unwrap_or_else(|| "about:blank".to_string());
    let shell = app
        .get_webview("shell")
        .ok_or(tauri::Error::WebviewNotFound)?;
    let handle = app.clone();
    shell.with_webview(move |pw| {
        let h2 = handle.clone();
        let sink = Rc::new(move |e: TabEvent| {
            if e == TabEvent::GotFocus {
                h2.state::<FocusState>()
                    .content_last
                    .store(true, Ordering::SeqCst);
            }
            log_event(&e);
            let v = event_json(&e);
            h2.state::<EventLog>().0.lock().unwrap().push(v.clone());
            let _ = h2.emit_to("shell", "tab", v);
            match &e {
                TabEvent::NewWindowRequested {
                    uri,
                    user_initiated,
                } => external::on_new_window(&h2, uri, *user_initiated),
                TabEvent::ExternalSchemeRequested { uri, .. } => {
                    let security = h2.state::<AppConfig>().0.config.security.clone();
                    external::on_page_navigation(&h2, &security, uri);
                }
                _ => {}
            }
        });
        // Navigation gate: web pages load; a link to another app is cancelled and offered to the user (p2.10);
        // everything else is cancelled.
        let h4 = handle.clone();
        let security = handle.state::<AppConfig>().0.config.security.clone();
        let gate = Rc::new(move |uri: &str| {
            let d = p2_gate(uri);
            if d == NavDecision::Cancel {
                external::on_page_navigation(&h4, &security, uri);
                return d;
            }
            // Google sign-in (p2.13): not loaded here; the shell offers the normal browser. The setting has one
            // value today (offer-system-browser, owner answer Q-109).
            let GoogleOauth::OfferSystemBrowser = security.google_oauth;
            if external::is_sign_in(uri) {
                external::offer_sign_in(&h4, uri);
                return NavDecision::Cancel;
            }
            d
        });
        let h3 = handle.clone();
        let res = ContentView::create(
            &pw.environment(),
            hwnd,
            rect,
            CONTENT_PROFILE,
            // Developer tools only in debug builds (p2.12); the shell gets the same rule from Tauri.
            cfg!(debug_assertions),
            sink,
            gate,
            Box::new(move |view| match view {
                Ok(view) => {
                    tracing::info!(target: "ferrum::content", profile = CONTENT_PROFILE, "content view created");
                    if let Err(e) = view.navigate(&start) {
                        tracing::warn!(target: "ferrum::content", error = %e, "start page not opened");
                    }
                    CONTENT.with(|c| *c.borrow_mut() = Some(view));
                    h3.state::<ContentReady>().0.store(true, Ordering::SeqCst);
                }
                Err(e) => tracing::error!(target: "ferrum::content", error = %e, "content view not created"),
            }),
        );
        if let Err(e) = res {
            tracing::error!(target: "ferrum::content", error = %e, "content view creation failed to start");
        }
    })
}

/// Runs `f` with the content view on the UI thread (no-op until the view exists).
pub fn with_content(app: &AppHandle, f: impl FnOnce(&ContentView) + Send + 'static) {
    let _ = app.run_on_main_thread(move || {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                f(v);
            }
        })
    });
}

/// Called on the UI thread when the window is resized.
pub fn relayout<R: Runtime>(window: &Window<R>) {
    if let Ok(rect) = content_rect(window) {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.set_bounds(rect);
            }
        });
    }
}

/// Shows or hides the content view (UI thread).
pub fn set_content_visible(visible: bool) {
    CONTENT.with(|c| {
        if let Some(v) = c.borrow().as_ref() {
            let _ = v.set_visible(visible);
        }
    });
}

/// Called on the UI thread when the window becomes active: put keyboard focus back into the page if it was there
/// (spike S1 known issue: after Alt+Tab, typing did not reach the page until a click).
pub fn restore_focus<R: Runtime>(app: &AppHandle<R>) {
    if app
        .state::<FocusState>()
        .content_last
        .load(Ordering::SeqCst)
    {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.focus();
            }
        });
    }
}

/// Result of `tab_navigate`, for the shell.
#[derive(Serialize)]
pub struct NavResult {
    /// "navigate", "confirm" or "refused".
    pub outcome: &'static str,
    /// The address that will be loaded (or needs confirmation).
    pub url: Option<String>,
    /// "upgraded-from-http" or "insecure-http".
    pub note: Option<&'static str>,
    /// Why the input was refused.
    pub reason: Option<String>,
}

/// The shell's address bar: normalise the input (ferrum-core) and navigate the content view.
#[tauri::command]
pub fn tab_navigate(app: AppHandle, cfg: tauri::State<'_, AppConfig>, input: String) -> NavResult {
    match normalize(&input, &cfg.0.config.security) {
        Outcome::Navigate { url, note } => {
            let target = url.to_string();
            let t2 = target.clone();
            with_content(&app, move |v| {
                let _ = v.navigate(&t2);
            });
            NavResult {
                outcome: "navigate",
                url: Some(target),
                note: note.map(|n| match n {
                    Note::UpgradedFromHttp => "upgraded-from-http",
                    Note::InsecureHttp => "insecure-http",
                }),
                reason: None,
            }
        }
        // Links to other apps: the shell asks first (p2.10); nothing is launched here.
        Outcome::Confirm { url } => {
            external::request(&app, url.to_string());
            NavResult {
                outcome: "confirm",
                url: Some(url.to_string()),
                note: None,
                reason: None,
            }
        }
        Outcome::Refuse(r) => NavResult {
            outcome: "refused",
            url: None,
            note: None,
            reason: Some(match r {
                Refusal::Empty => "empty".into(),
                Refusal::NotAnAddress => "not-an-address".into(),
                Refusal::Malformed => "malformed".into(),
                Refusal::ForbiddenScheme(s) => format!("forbidden-scheme:{s}"),
                Refusal::ExternalDenied(s) => format!("external-denied:{s}"),
            }),
        },
    }
}

/// Back one page (adr-0030).
#[tauri::command]
pub fn tab_back(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.go_back();
    });
}

/// Forward one page (adr-0030).
#[tauri::command]
pub fn tab_forward(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.go_forward();
    });
}

/// Reload the page.
#[tauri::command]
pub fn tab_reload(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.reload();
    });
}

/// Stop loading.
#[tauri::command]
pub fn tab_stop(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.stop();
    });
}

/// The shell tells the app that the user put focus in the toolbar (so Alt+Tab back does not steal it).
#[tauri::command]
pub fn shell_focused(focus: tauri::State<'_, FocusState>) {
    focus.content_last.store(false, Ordering::SeqCst);
}
