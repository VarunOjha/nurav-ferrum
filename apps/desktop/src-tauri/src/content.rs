//! The tab web views (P2 task p2.6, P3 task p3.2): one WebView2 controller per tab, created by
//! `ferrum-webview-manager` from Tauri's environment (adr-0029) and placed in the content area the shell leaves free.
//! The tab list itself is `ferrum_core::tabs::Tabs` (p3.1). This module is safe Rust: all COM calls live in
//! `ferrum_webview_manager::webview2`, which runs on the UI thread (thread-locals `VIEWS` and `ENVIRONMENT`).
//!
//! Threading (Windows deadlock note, p3.10): a view is never created while a caller waits. Commands only change the
//! tab list and queue the WebView2 work on the UI thread (`run_on_main_thread`); WebView2 reports the new view through
//! a completion callback. The tab list's lock is never held while a view method runs, because WebView2 may raise
//! events (which update the list) inside such a call.

use std::rc::Rc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};

use ferrum_core::address::{Note, Outcome, Refusal, normalize, site};
use ferrum_core::config::{GoogleOauth, Loaded};
use ferrum_core::tabs::{Place, TabId, Tabs};
use ferrum_webview_manager::tab::{NavDecision, NavRequest, TabEvent, web_gate};
use ferrum_webview_manager::webview2::{ContentView, ENVIRONMENT, VIEWS, renderer_process_count};
use serde::Serialize;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};
use windows::Win32::Foundation::RECT;

use crate::external;

/// WebView2 profile of every tab while all sites share one profile (P2; per-site profiles arrive in p3.6, adr-0029).
pub const CONTENT_PROFILE: &str = "ferrum-default";

/// The address of an empty tab.
pub const BLANK: &str = "about:blank";

/// The loaded settings.
pub struct AppConfig(pub Loaded);

/// Where keyboard focus was last put on purpose (for restoring it after Alt+Tab).
#[derive(Default)]
pub struct FocusState {
    /// True when a page (tab view) had focus last; false when the shell did.
    pub content_last: AtomicBool,
}

/// Everything the tab views reported, as JSON, in order (read by the self-tests).
#[derive(Default)]
pub struct EventLog(pub Mutex<Vec<Value>>);

/// Shell web view title (the shell writes its received events there; read by the self-tests).
#[derive(Default)]
pub struct ShellTitle(pub Mutex<String>);

/// The main window's handle as a plain integer (the parent of every tab view).
#[derive(Default)]
pub struct MainHwnd(pub AtomicIsize);

/// The space the shell keeps for itself, in logical pixels: `top` (tab strip, toolbar, bars) and `left` (sidebar).
/// The shell reports it with `shell_layout`; tab views fill the rest, so the two never overlap (spike S1).
pub struct Insets(pub Mutex<(f64, f64)>);

impl Default for Insets {
    fn default() -> Self {
        Insets(Mutex::new((crate::DEFAULT_TOP, 0.0)))
    }
}

/// What the app knows about one tab.
#[derive(Debug, Clone, Default, Serialize)]
pub struct TabInfo {
    /// The address shown (the last one asked for or reported).
    pub url: String,
    /// The page title.
    pub title: String,
    /// The WebView2 profile the tab's view uses.
    pub profile: String,
    /// A page is loading.
    pub loading: bool,
    /// Back is possible.
    pub can_go_back: bool,
    /// Forward is possible.
    pub can_go_forward: bool,
    /// The shell's error panel covers this tab (its view is hidden).
    pub covered: bool,
    /// The tab's view exists.
    pub ready: bool,
    /// An address to load once the view exists.
    #[serde(skip)]
    pub pending: Option<String>,
}

/// The open tabs (p3.1 model) with the app's data per tab.
#[derive(Default)]
pub struct TabsState(pub Mutex<Tabs<TabInfo>>);

fn event_json(tab: u64, e: &TabEvent) -> Value {
    let mut v = match e {
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
    };
    v["tab"] = json!(tab);
    v
}

/// Writes the log line for a tab event (navigation outcomes and decisions; addresses as scheme and host only).
fn log_event(tab: u64, e: &TabEvent) {
    match e {
        TabEvent::NavigationStarting {
            uri,
            allowed: false,
            ..
        } => {
            tracing::info!(target: "ferrum::nav", tab, site = %site(uri), "navigation cancelled by the gate")
        }
        TabEvent::NavigationCompleted {
            uri,
            success,
            http_status,
            web_error_status,
            ..
        } => {
            if *success && *http_status < 400 {
                tracing::info!(target: "ferrum::nav", tab, site = %site(uri), http_status, "page loaded");
            } else {
                tracing::warn!(target: "ferrum::nav", tab, site = %site(uri), success, http_status, web_error_status, "page not loaded normally");
            }
        }
        TabEvent::NewWindowRequested {
            uri,
            user_initiated,
        } => {
            tracing::info!(target: "ferrum::nav", tab, site = %site(uri), user_initiated, "new window requested")
        }
        TabEvent::ExternalSchemeRequested { uri, .. } => {
            tracing::info!(target: "ferrum::nav", tab, site = %site(uri), "link to another app stopped by WebView2")
        }
        _ => {}
    }
}

/// The content area in physical pixels relative to the window's client area.
pub fn content_rect<R: Runtime>(window: &Window<R>) -> tauri::Result<RECT> {
    let size = window.inner_size()?;
    let scale = window.scale_factor()?;
    let (top, left) = *window.app_handle().state::<Insets>().0.lock().unwrap();
    let top = (top * scale).round() as i32;
    let left = ((left * scale).round() as i32).min(size.width as i32 - 1);
    Ok(RECT {
        left,
        top,
        right: size.width as i32,
        bottom: (size.height as i32).max(top + 1),
    })
}

/// The WebView2 profile a tab showing `url` uses. P3.2: one shared profile for every site.
pub fn profile_for(_app: &AppHandle, _url: &str) -> String {
    CONTENT_PROFILE.to_string()
}

/// The tab list as the shell shows it.
pub fn snapshot(app: &AppHandle) -> Value {
    let t = app.state::<TabsState>();
    let t = t.0.lock().unwrap();
    json!({
        "active": t.active().map(|a| a.0),
        "tabs": t.iter().map(|(id, i)| json!({
            "id": id.0, "url": i.url, "title": i.title, "loading": i.loading, "profile": i.profile,
            "can_go_back": i.can_go_back, "can_go_forward": i.can_go_forward, "covered": i.covered, "ready": i.ready,
        })).collect::<Vec<_>>(),
    })
}

/// Sends the tab list to the shell.
pub fn emit_tabs(app: &AppHandle) {
    let _ = app.emit_to("shell", "tabs", snapshot(app));
}

fn update(app: &AppHandle, id: u64, f: impl FnOnce(&mut TabInfo)) -> bool {
    let t = app.state::<TabsState>();
    let mut t = t.0.lock().unwrap();
    match t.get_mut(TabId(id)) {
        Some(info) => {
            f(info);
            true
        }
        None => false,
    }
}

/// The active tab's id.
pub fn active(app: &AppHandle) -> Option<u64> {
    app.state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .active()
        .map(|a| a.0)
}

/// True when the active tab's view exists.
pub fn active_ready(app: &AppHandle) -> bool {
    let t = app.state::<TabsState>();
    let t = t.0.lock().unwrap();
    t.active().and_then(|a| t.get(a)).is_some_and(|i| i.ready)
}

/// Opens a tab showing `url` (an already normalised address or `about:blank`) and returns its id. The view is created
/// later on the UI thread (never while the caller waits).
pub fn open_tab(app: &AppHandle, url: String, place: Place, activate: bool) -> u64 {
    let profile = profile_for(app, &url);
    let id = app.state::<TabsState>().0.lock().unwrap().open(
        TabInfo {
            url: url.clone(),
            profile: profile.clone(),
            ..TabInfo::default()
        },
        place,
        activate,
    );
    tracing::info!(target: "ferrum::tabs", tab = id.0, site = %site(&url), "tab opened");
    emit_tabs(app);
    create_view(app, id.0, profile, url);
    id.0
}

/// Queues the creation of the view of tab `id` in `profile`, which then loads `url`. If the tab already has a view
/// (a profile change), the old view is closed once the new one exists.
fn create_view(app: &AppHandle, id: u64, profile: String, url: String) {
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        let Some(env) = ENVIRONMENT.with(|e| e.borrow().clone()) else {
            tracing::error!(target: "ferrum::tabs", tab = id, "no WebView2 environment yet; view not created");
            return;
        };
        let Some(window) = h.get_window("main") else {
            return;
        };
        let rect = match content_rect(&window) {
            Ok(r) => r,
            Err(e) => {
                tracing::error!(target: "ferrum::tabs", tab = id, error = %e, "no content area; view not created");
                return;
            }
        };
        let hwnd = h.state::<MainHwnd>().0.load(Ordering::SeqCst);
        let res = ContentView::create(
            &env,
            hwnd,
            rect,
            &profile,
            // Developer tools only in debug builds (p2.12); the shell gets the same rule from Tauri.
            cfg!(debug_assertions),
            sink(&h, id),
            gate(&h, id),
            Box::new({
                let h = h.clone();
                let profile = profile.clone();
                move |view| match view {
                    Ok(view) => view_ready(&h, id, &profile, view, url),
                    Err(e) => {
                        tracing::error!(target: "ferrum::tabs", tab = id, error = %e, "tab view not created")
                    }
                }
            }),
        );
        if let Err(e) = res {
            tracing::error!(target: "ferrum::tabs", tab = id, error = %e, "tab view creation failed to start");
        }
    });
}

/// UI thread: WebView2 created the view of tab `id`.
fn view_ready(app: &AppHandle, id: u64, profile: &str, view: ContentView, url: String) {
    // The tab may have closed, or moved to another profile, while the view was being made.
    let wanted = {
        let t = app.state::<TabsState>();
        let mut t = t.0.lock().unwrap();
        match t.get_mut(TabId(id)) {
            Some(info) if info.profile == profile => {
                info.ready = true;
                Some(info.pending.take().unwrap_or(url))
            }
            _ => None,
        }
    };
    let Some(target) = wanted else {
        view.close();
        return;
    };
    let old = VIEWS.with(|m| m.borrow_mut().insert(id, view));
    if let Some(old) = old {
        old.close();
    }
    tracing::info!(target: "ferrum::tabs", tab = id, profile, "tab view created");
    shell_to_back(app);
    apply_visibility(app);
    VIEWS.with(|m| {
        if let Some(v) = m.borrow().get(&id)
            && let Err(e) = v.navigate(&target)
        {
            tracing::warn!(target: "ferrum::tabs", tab = id, error = %e, "page not opened");
        }
    });
    emit_tabs(app);
}

/// Keeps the shell's window below the tab views (it fills the window; see `webview2::send_to_back`).
fn shell_to_back(app: &AppHandle) {
    if let Some(shell) = app.get_webview("shell") {
        let _ = shell.with_webview(|pw| {
            if let Err(e) = ferrum_webview_manager::webview2::send_to_back(&pw.controller()) {
                tracing::warn!(target: "ferrum::tabs", error = %e, "shell not moved behind the tab views");
            }
        });
    }
}

/// The event sink of tab `id`'s view (UI thread).
fn sink(app: &AppHandle, id: u64) -> Rc<dyn Fn(TabEvent)> {
    let h = app.clone();
    Rc::new(move |e: TabEvent| {
        let mut list_changed = false;
        match &e {
            TabEvent::GotFocus => h
                .state::<FocusState>()
                .content_last
                .store(true, Ordering::SeqCst),
            TabEvent::NavigationStarting {
                uri, allowed: true, ..
            } => {
                list_changed = update(&h, id, |i| {
                    i.loading = true;
                    i.url = uri.clone();
                })
            }
            TabEvent::SourceChanged { uri } => {
                list_changed = update(&h, id, |i| i.url = uri.clone())
            }
            TabEvent::NavigationCompleted { uri, .. } => {
                list_changed = update(&h, id, |i| {
                    i.loading = false;
                    if !uri.is_empty() {
                        i.url = uri.clone();
                    }
                })
            }
            TabEvent::HistoryChanged {
                can_go_back,
                can_go_forward,
            } => {
                list_changed = update(&h, id, |i| {
                    i.can_go_back = *can_go_back;
                    i.can_go_forward = *can_go_forward;
                })
            }
            TabEvent::TitleChanged { title } => {
                list_changed = update(&h, id, |i| i.title = title.clone())
            }
            _ => {}
        }
        log_event(id, &e);
        let v = event_json(id, &e);
        h.state::<EventLog>().0.lock().unwrap().push(v.clone());
        let _ = h.emit_to("shell", "tab", v);
        if list_changed {
            emit_tabs(&h);
        }
        match &e {
            TabEvent::NewWindowRequested {
                uri,
                user_initiated,
            } => external::on_new_window(&h, id, uri, *user_initiated),
            TabEvent::ExternalSchemeRequested { uri, .. } => {
                let security = h.state::<AppConfig>().0.config.security.clone();
                external::on_page_navigation(&h, &security, uri);
            }
            _ => {}
        }
    })
}

/// The navigation gate of tab `id`'s view: web pages load; a link to another app is cancelled and offered to the
/// user (p2.10); Google sign-in is offered in the normal browser (p2.13); everything else is cancelled.
fn gate(app: &AppHandle, _id: u64) -> Rc<dyn Fn(&NavRequest) -> NavDecision> {
    let h = app.clone();
    let security = app.state::<AppConfig>().0.config.security.clone();
    Rc::new(move |r: &NavRequest| {
        let d = web_gate(&r.uri);
        if d == NavDecision::Cancel {
            external::on_page_navigation(&h, &security, &r.uri);
            return d;
        }
        // The setting has one value today (offer-system-browser, owner answer Q-109).
        let GoogleOauth::OfferSystemBrowser = security.google_oauth;
        if external::is_sign_in(&r.uri) {
            external::offer_sign_in(&h, &r.uri);
            return NavDecision::Cancel;
        }
        d
    })
}

/// UI thread: shows the active tab's view (unless the shell's error panel covers it) and hides every other one.
fn apply_visibility(app: &AppHandle) {
    let (active, covered) = {
        let t = app.state::<TabsState>();
        let t = t.0.lock().unwrap();
        let a = t.active();
        (
            a.map(|a| a.0),
            a.and_then(|a| t.get(a)).is_some_and(|i| i.covered),
        )
    };
    let rect = app.get_window("main").and_then(|w| content_rect(&w).ok());
    VIEWS.with(|m| {
        for (id, v) in m.borrow().iter() {
            let show = Some(*id) == active && !covered;
            if show && let Some(r) = rect {
                let _ = v.set_bounds(r);
            }
            let _ = v.set_visible(show);
        }
    });
}

/// Runs `f` with tab `id`'s view on the UI thread (no-op if the view does not exist).
pub fn with_view(app: &AppHandle, id: u64, f: impl FnOnce(&ContentView) + Send + 'static) {
    let _ = app.run_on_main_thread(move || {
        VIEWS.with(|m| {
            if let Some(v) = m.borrow().get(&id) {
                f(v);
            }
        })
    });
}

/// Runs `f` with the active tab's view on the UI thread (no-op without one).
pub fn with_content(app: &AppHandle, f: impl FnOnce(&ContentView) + Send + 'static) {
    if let Some(id) = active(app) {
        with_view(app, id, f);
    }
}

/// Loads `url` (already normalised) in tab `id`. A tab whose view is still being made loads it once it exists.
pub fn navigate_tab(app: &AppHandle, id: u64, url: String) {
    let profile = profile_for(app, &url);
    let mut new_view = false;
    let mut now = false;
    update(app, id, |i| {
        if i.profile != profile {
            // Another profile (p3.6): the tab gets a new view in that profile.
            i.profile = profile.clone();
            i.ready = false;
            i.pending = None;
            new_view = true;
        } else if i.ready {
            now = true;
        } else {
            i.pending = Some(url.clone());
        }
        i.url = url.clone();
    });
    if new_view {
        create_view(app, id, profile, url);
    } else if now {
        with_view(app, id, move |v| {
            let _ = v.navigate(&url);
        });
    }
}

/// Makes `id` the active tab.
pub fn activate(app: &AppHandle, id: u64) -> bool {
    let ok = app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .activate(TabId(id));
    if ok {
        after_switch(app);
    }
    ok
}

/// After the active tab changed: show it, hide the others, tell the shell, keep keyboard focus where it was.
fn after_switch(app: &AppHandle) {
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        apply_visibility(&h);
        restore_focus(&h);
    });
    emit_tabs(app);
}

/// Closes tab `id` and its view (all handlers released, COM-4). The neighbour becomes active (p3.1 rule).
pub fn close_tab(app: &AppHandle, id: u64) -> bool {
    let closed = app.state::<TabsState>().0.lock().unwrap().close(TabId(id));
    if closed.is_none() {
        return false;
    }
    tracing::info!(target: "ferrum::tabs", tab = id, "tab closed");
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        let view = VIEWS.with(|m| m.borrow_mut().remove(&id));
        if let Some(v) = view {
            v.close();
        }
        apply_visibility(&h);
        restore_focus(&h);
    });
    emit_tabs(app);
    true
}

/// Called on the UI thread when the window is resized or the shell's insets change.
pub fn relayout<R: Runtime>(window: &Window<R>) {
    if let Ok(rect) = content_rect(window) {
        VIEWS.with(|m| {
            for v in m.borrow().values() {
                let _ = v.set_bounds(rect);
            }
        });
    }
}

/// Covers (hides) or uncovers tab `id`'s view (the active tab when `None`) while the shell's error panel shows for it.
pub fn set_covered(app: &AppHandle, id: Option<u64>, cover: bool) {
    if let Some(id) = id.or_else(|| active(app)) {
        update(app, id, |i| i.covered = cover);
    }
    let h = app.clone();
    let _ = app.run_on_main_thread(move || apply_visibility(&h));
}

/// Called on the UI thread when the window becomes active: put keyboard focus back into the page if it was there
/// (spike S1 known issue: after Alt+Tab, typing did not reach the page until a click).
pub fn restore_focus<R: Runtime>(app: &AppHandle<R>) {
    if app
        .state::<FocusState>()
        .content_last
        .load(Ordering::SeqCst)
    {
        let id = app
            .state::<TabsState>()
            .0
            .lock()
            .unwrap()
            .active()
            .map(|a| a.0);
        if let Some(id) = id {
            VIEWS.with(|m| {
                if let Some(v) = m.borrow().get(&id) {
                    let _ = v.focus();
                }
            });
        }
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

/// The shell's address bar: normalise the input (ferrum-core) and load it in the active tab (a new tab when none is
/// open). Async, so it never runs on the UI thread while a view is made (p3.10).
#[tauri::command]
pub async fn tab_navigate(app: AppHandle, input: String) -> NavResult {
    let security = app.state::<AppConfig>().0.config.security.clone();
    match normalize(&input, &security) {
        Outcome::Navigate { url, note } => {
            let target = url.to_string();
            match active(&app) {
                Some(id) => navigate_tab(&app, id, target.clone()),
                None => {
                    open_tab(&app, target.clone(), Place::End, true);
                }
            }
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

/// A new tab (empty, or showing `url` after the same checks as the address bar) at the end, made active.
#[tauri::command]
pub async fn tab_new(app: AppHandle, url: Option<String>) -> Result<u64, String> {
    let target = match url.as_deref().map(str::trim) {
        None | Some("") | Some(BLANK) => BLANK.to_string(),
        Some(input) => {
            let security = app.state::<AppConfig>().0.config.security.clone();
            match normalize(input, &security) {
                Outcome::Navigate { url, .. } => url.to_string(),
                _ => return Err("not a web address".into()),
            }
        }
    };
    Ok(open_tab(&app, target, Place::End, true))
}

/// Closes a tab (the active one when `id` is missing).
#[tauri::command]
pub fn tab_close(app: AppHandle, id: Option<u64>) -> bool {
    match id.or_else(|| active(&app)) {
        Some(id) => close_tab(&app, id),
        None => false,
    }
}

/// Switches to a tab.
#[tauri::command]
pub fn tab_activate(app: AppHandle, id: u64) -> bool {
    activate(&app, id)
}

/// Moves a tab to another position in the strip.
#[tauri::command]
pub fn tab_move(app: AppHandle, id: u64, to: usize) -> bool {
    let ok = app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .move_to(TabId(id), to);
    if ok {
        emit_tabs(&app);
    }
    ok
}

/// Switches to the next tab to the right (wraps around).
#[tauri::command]
pub fn tab_next(app: AppHandle) {
    if app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .activate_next()
        .is_some()
    {
        after_switch(&app);
    }
}

/// Switches to the next tab to the left (wraps around).
#[tauri::command]
pub fn tab_previous(app: AppHandle) {
    if app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .activate_previous()
        .is_some()
    {
        after_switch(&app);
    }
}

/// Reopens the most recently closed tab (its last address, in a new view).
#[tauri::command]
pub async fn tab_reopen(app: AppHandle) -> Option<u64> {
    let (id, url, profile) = {
        let t = app.state::<TabsState>();
        let mut t = t.0.lock().unwrap();
        let id = t.reopen_closed()?;
        let info = t.get_mut(id)?;
        // A fresh view: reset what belonged to the old one.
        let url = info.url.clone();
        *info = TabInfo {
            url: url.clone(),
            title: info.title.clone(),
            profile: info.profile.clone(),
            ..TabInfo::default()
        };
        (id.0, url, info.profile.clone())
    };
    emit_tabs(&app);
    create_view(&app, id, profile, url);
    after_switch(&app);
    Some(id)
}

/// The tab list (the shell asks once at start; afterwards it follows the `tabs` event).
#[tauri::command]
pub fn tab_list(app: AppHandle) -> Value {
    snapshot(&app)
}

/// Back one page in the active tab (adr-0030).
#[tauri::command]
pub fn tab_back(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.go_back();
    });
}

/// Forward one page in the active tab (adr-0030).
#[tauri::command]
pub fn tab_forward(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.go_forward();
    });
}

/// Reload the active tab.
#[tauri::command]
pub fn tab_reload(app: AppHandle) {
    with_content(&app, |v| {
        let _ = v.reload();
    });
}

/// Stop loading in the active tab.
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

/// Test counters (debug builds only; a release build refuses): tabs in the list, views alive, and WebView2 renderer
/// processes (p3.2 check: after every tab closed, the views are gone and the renderer count falls back).
#[tauri::command]
pub async fn test_stats(app: AppHandle) -> Result<Value, String> {
    if !cfg!(debug_assertions) {
        return Err("not available in release builds".into());
    }
    let tabs = app.state::<TabsState>().0.lock().unwrap().len();
    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let views = VIEWS.with(|m| m.borrow().len());
        let shown: Vec<u64> = VIEWS.with(|m| {
            m.borrow()
                .iter()
                .filter(|(_, v)| v.is_visible().unwrap_or(false))
                .map(|(id, _)| *id)
                .collect()
        });
        let renderers = ENVIRONMENT.with(|e| {
            e.borrow()
                .as_ref()
                .map(|env| renderer_process_count(env).map_err(|e| e.to_string()))
        });
        let _ = tx.send((views, renderers, shown));
    })
    .map_err(|e| e.to_string())?;
    let (views, renderers, shown) = tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(std::time::Duration::from_secs(10))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    Ok(json!({
        "tabs": tabs,
        "views": views,
        "shown": shown,
        "renderers": match renderers {
            Some(Ok(n)) => json!(n),
            Some(Err(e)) => json!({"error": e}),
            None => Value::Null,
        },
    }))
}
