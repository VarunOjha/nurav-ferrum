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
use ferrum_security::{Context, Verdict};
use ferrum_webview_manager::tab::{NavDecision, NavRequest, TabEvent};
use ferrum_webview_manager::webview2::{
    ContentView, ENVIRONMENT, Handlers, VIEWS, renderer_process_count,
};
use serde::Serialize;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};
use windows::Win32::Foundation::RECT;

use crate::external;

/// The address of an empty tab.
pub const BLANK: &str = "about:blank";

/// The WebView2 profile of private tabs (p4.7). Its views are InPrivate: nothing they store is kept after the last
/// private tab closes, and they never share data with a site's normal profile.
pub const PRIVATE_PROFILE: &str = "ferrum-private";

/// The settings in effect. Behind a lock because the settings screen (p3.14) changes them while Ferrum runs.
pub struct AppConfig(pub std::sync::RwLock<Loaded>);

impl AppConfig {
    /// The settings in effect now.
    pub fn get(&self) -> ferrum_core::config::Config {
        self.0.read().unwrap().config.clone()
    }
}

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
    /// A private tab (p4.7): InPrivate view in its own profile; not in the history, not saved in the session.
    pub private: bool,
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
        TabEvent::FrameNavigationStarting {
            id,
            uri,
            redirected,
            allowed,
        } => json!({
            "kind": "frame-navigation-starting", "id": id, "uri": uri, "redirected": redirected, "allowed": allowed }),
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
        TabEvent::PermissionRequested { uri, kind, allowed } => {
            json!({"kind": "permission", "uri": uri, "permission": kind, "allowed": allowed})
        }
        // The site icon as a data address the shell's image may show (its CSP allows `data:` images only).
        TabEvent::FaviconChanged { png } => json!({"kind": "favicon", "icon": icon_data_url(png)}),
        // Downloads go to the shell as their own `download` messages (downloads.rs).
        TabEvent::DownloadStarted { download, .. }
        | TabEvent::DownloadProgress { download, .. }
        | TabEvent::DownloadFinished { download, .. } => {
            json!({"kind": "download", "download": download})
        }
    };
    v["tab"] = json!(tab);
    v
}

/// `data:image/png;base64,...` for an icon's PNG bytes; empty for no icon.
fn icon_data_url(png: &[u8]) -> String {
    use base64::Engine;
    if png.is_empty() {
        return String::new();
    }
    format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(png)
    )
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

/// The WebView2 profile a tab showing `url` uses (p3.6): its site's own profile, a profile named in `[[sites]]`, or
/// the shared one (no site yet, or isolation off).
pub fn profile_for(app: &AppHandle, url: &str) -> String {
    ferrum_core::profiles::profile_for_url(&app.state::<AppConfig>().get(), url)
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
            "private": i.private,
        })).collect::<Vec<_>>(),
    })
}

/// Sends the tab list to the shell and marks the session for saving (p3.5).
pub fn emit_tabs(app: &AppHandle) {
    let _ = app.emit_to("shell", "tabs", snapshot(app));
    crate::session::mark_dirty(app);
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

/// Whether tab `id` is a private tab (p4.7).
pub fn is_private(app: &AppHandle, id: u64) -> bool {
    app.state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .get(TabId(id))
        .is_some_and(|i| i.private)
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
    open_tab_as(app, url, place, activate, false)
}

/// Opens a tab like [`open_tab`]; `private` makes it a private tab (p4.7).
pub fn open_tab_as(
    app: &AppHandle,
    url: String,
    place: Place,
    activate: bool,
    private: bool,
) -> u64 {
    let profile = if private {
        PRIVATE_PROFILE.to_string()
    } else {
        profile_for(app, &url)
    };
    let id = app.state::<TabsState>().0.lock().unwrap().open(
        TabInfo {
            url: url.clone(),
            profile: profile.clone(),
            private,
            ..TabInfo::default()
        },
        place,
        activate,
    );
    tracing::info!(target: "ferrum::tabs", tab = id.0, site = %site(&url), private, "tab opened");
    emit_tabs(app);
    create_view(app, id.0, profile, url);
    id.0
}

/// Queues the creation of the view of tab `id` in `profile`, which then loads `url`. If the tab already has a view
/// (a profile change), the old view is closed once the new one exists.
fn create_view(app: &AppHandle, id: u64, profile: String, url: String) {
    let private = is_private(app, id);
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
            private,
            // Developer tools only in debug builds (p2.12); the shell gets the same rule from Tauri.
            cfg!(debug_assertions),
            Handlers {
                sink: sink(&h, id),
                gate: gate(&h, id),
                keys: crate::shortcuts::filter(&h),
                downloads: crate::downloads::chooser(&h),
                permissions: crate::policy::permission_filter(&h, id),
            },
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
            TabEvent::NavigationCompleted {
                uri,
                success,
                http_status,
                ..
            } => {
                let mut title = String::new();
                let mut private = false;
                list_changed = update(&h, id, |i| {
                    i.loading = false;
                    title = i.title.clone();
                    private = i.private;
                    if !uri.is_empty() {
                        i.url = uri.clone();
                    }
                });
                // A page that loaded goes into the history (p3.7); failed loads, error pages and private tabs (p4.7)
                // do not.
                if *success && *http_status < 400 && !private {
                    crate::history::visited(&h, uri, &title);
                }
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
                let mut url = String::new();
                let mut private = false;
                list_changed = update(&h, id, |i| {
                    i.title = title.clone();
                    url = i.url.clone();
                    private = i.private;
                });
                if !private {
                    crate::history::titled(&h, &url, title);
                }
            }
            _ => {}
        }
        if let Some(msg) = crate::downloads::shell_message(&h, id, &e) {
            crate::downloads::emit(&h, msg);
            return;
        }
        if matches!(e, TabEvent::DownloadProgress { .. }) {
            return; // throttled progress
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
                let security = h.state::<AppConfig>().get().security;
                external::on_page_navigation(&h, id, &security, uri);
            }
            _ => {}
        }
    })
}

/// The navigation gate of tab `id`'s view (p4.3: every navigation passes the policy engine, adr-0015). The page's own
/// navigations, each redirect hop and each frame are decided by `crate::policy` from the settings in effect now:
/// a refused address is cancelled, logged with its rule and noted on the tab's toolbar; a link to another app is
/// cancelled and offered to the user (p2.10); an `http:` address under `http_policy = "upgrade"` is cancelled and
/// opened again as `https:`. For the page itself, Google sign-in is then offered in the normal browser (p2.13), and
/// with per-site profiles (p3.6) a page that leads to another site's profile is stopped: an empty tab moves at once;
/// otherwise the shell asks first (owner answer Q-209) and the tab moves only if the user agrees. A redirect stays in
/// the tab's profile (the server, not the page, chose it; moving mid-redirect would break sign-in flows).
fn gate(app: &AppHandle, id: u64) -> Rc<dyn Fn(&NavRequest) -> NavDecision> {
    let h = app.clone();
    Rc::new(move |r: &NavRequest| {
        let context = if r.frame {
            Context::Frame
        } else if r.redirected {
            Context::Redirect
        } else {
            Context::TopLevel
        };
        let (current, from) = {
            let t = h.state::<TabsState>();
            let t = t.0.lock().unwrap();
            match t.get(TabId(id)) {
                Some(i) => (i.profile.clone(), i.url.clone()),
                None => return NavDecision::Cancel,
            }
        };
        // The tab's page started it (used for `blob:` addresses, which only their own origin may open).
        let initiator = (!from.is_empty()).then_some(from.as_str());
        let d = crate::policy::decide(&crate::policy::current(&h), id, context, &r.uri, initiator);
        match d.verdict {
            Verdict::Deny => {
                external::blocked(&h, id, &r.uri, d.rule.as_str(), r.frame);
                return NavDecision::Cancel;
            }
            Verdict::Confirm => {
                let security = h.state::<AppConfig>().get().security;
                external::on_page_navigation(&h, id, &security, &r.uri);
                return NavDecision::Cancel;
            }
            Verdict::Upgrade(url) => {
                if !r.frame {
                    let h2 = h.clone();
                    let _ = h.run_on_main_thread(move || navigate_tab(&h2, id, url));
                }
                return NavDecision::Cancel;
            }
            Verdict::Allow | Verdict::AllowInsecure => {}
        }
        if r.frame {
            return NavDecision::Allow;
        }
        // The setting has one value today (offer-system-browser, owner answer Q-109).
        let GoogleOauth::OfferSystemBrowser = h.state::<AppConfig>().get().security.google_oauth;
        if external::is_sign_in(&r.uri) {
            external::offer_sign_in(&h, &r.uri);
            return NavDecision::Cancel;
        }
        // A private tab stays in the private profile whatever site it shows (p4.7).
        let target = if current == PRIVATE_PROFILE {
            current.clone()
        } else {
            profile_for(&h, &r.uri)
        };
        if target == current || r.redirected {
            return NavDecision::Allow;
        }
        let uri = r.uri.clone();
        if current == ferrum_core::profiles::SHARED_PROFILE {
            // An empty tab (no site yet): nothing to lose, so it moves to the site's profile at once.
            let h2 = h.clone();
            let _ = h.run_on_main_thread(move || navigate_tab(&h2, id, uri));
        } else {
            external::ask_cross_site(&h, id, &uri, &from);
        }
        NavDecision::Cancel
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
    let profile = if is_private(app, id) {
        PRIVATE_PROFILE.to_string()
    } else {
        profile_for(app, &url)
    };
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
    let security = app.state::<AppConfig>().get().security;
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
            external::request(&app, active(&app).unwrap_or(0), url.to_string());
            NavResult {
                outcome: "confirm",
                url: Some(url.to_string()),
                note: None,
                reason: None,
            }
        }
        Outcome::Refuse(r) => {
            // The reason only: what was typed is not logged (it may be a search, not an address).
            tracing::info!(target: "ferrum::policy", context = "address-bar", reason = ?r, "typed address refused");
            let rule = match &r {
                Refusal::Empty => "typed-empty",
                Refusal::NotAnAddress => "typed-not-an-address",
                Refusal::Malformed => "typed-malformed",
                Refusal::ForbiddenScheme(_) => "typed-forbidden-scheme",
                Refusal::ExternalDenied(_) => "typed-external-denied",
            };
            // What was typed is not kept: the origin is "(typed)".
            crate::audit::record(active(&app).unwrap_or(0), "address-bar", "", rule);
            NavResult {
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
            }
        }
    }
}

/// A new tab (empty, or showing `url` after the same checks as the address bar) at the end, made active.
#[tauri::command]
pub async fn tab_new(app: AppHandle, url: Option<String>) -> Result<u64, String> {
    let target = match url.as_deref().map(str::trim) {
        None | Some("") | Some(BLANK) => BLANK.to_string(),
        Some(input) => {
            let security = app.state::<AppConfig>().get().security;
            match normalize(input, &security) {
                Outcome::Navigate { url, .. } => url.to_string(),
                _ => return Err("not a web address".into()),
            }
        }
    };
    Ok(open_tab(&app, target, Place::End, true))
}

/// Opens a private tab (p4.7, Ctrl+Shift+N): an InPrivate view in the private profile; its pages are not in the
/// history and the tab is not saved in the session. `url` as for `tab_new`.
#[tauri::command]
pub async fn tab_new_private(app: AppHandle, url: Option<String>) -> Result<u64, String> {
    let target = match url.as_deref().map(str::trim) {
        None | Some("") | Some(BLANK) => BLANK.to_string(),
        Some(input) => {
            let security = app.state::<AppConfig>().get().security;
            match normalize(input, &security) {
                Outcome::Navigate { url, .. } => url.to_string(),
                _ => return Err("not a web address".into()),
            }
        }
    };
    Ok(open_tab_as(&app, target, Place::End, true, true))
}

/// Deletes everything stored for `site` (cookies, storage, cache, permissions) in that site's own profile, and
/// nothing else (p4.7). Refused while a tab of that site is open (its page could write the data again at once) and for
/// sites in the shared or private profile. Shell only.
#[tauri::command]
pub async fn site_data_clear(app: AppHandle, site: String) -> Result<(), String> {
    let site = site.trim().to_ascii_lowercase();
    let profile = profile_for(&app, &format!("https://{site}/"));
    if profile == ferrum_core::profiles::SHARED_PROFILE {
        return Err(
            "This site has no profile of its own (sites share one profile in these settings)."
                .into(),
        );
    }
    let open = app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .iter()
        .any(|(_, i)| i.profile == profile);
    if open {
        return Err(format!("Close the tabs of {site} first."));
    }
    let hwnd = app.state::<MainHwnd>().0.load(Ordering::SeqCst);
    let (tx, rx) = std::sync::mpsc::channel();
    let p = profile.clone();
    app.run_on_main_thread(move || {
        let Some(env) = ENVIRONMENT.with(|e| e.borrow().clone()) else {
            let _ = tx.send(Err("no WebView2 environment yet".to_string()));
            return;
        };
        let t2 = tx.clone();
        let started = ferrum_webview_manager::webview2::clear_profile(
            &env,
            hwnd,
            &p,
            Box::new(move |r| {
                let _ = t2.send(r.map_err(|e| e.to_string()));
            }),
        );
        if let Err(e) = started {
            let _ = tx.send(Err(e.to_string()));
        }
    })
    .map_err(|e| e.to_string())?;
    let r = tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(std::time::Duration::from_secs(30))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|_| "WebView2 did not answer in time".to_string())?;
    match &r {
        Ok(()) => {
            tracing::info!(target: "ferrum::profiles", site = %site, profile = %profile, "site data cleared")
        }
        Err(e) => {
            tracing::warn!(target: "ferrum::profiles", site = %site, error = %e, "site data not cleared")
        }
    }
    r
}

/// Test hook (debug builds only): every WebView2 process with its kind and, for renderers, the addresses of the frames
/// it hosts, plus each tab's profile, so a test can see which processes the profiles share (p4.7).
#[tauri::command]
pub async fn test_processes(app: AppHandle) -> Result<Value, String> {
    if !cfg!(debug_assertions) {
        return Err("not available in release builds".into());
    }
    let tabs: Vec<Value> = {
        let t = app.state::<TabsState>();
        let t = t.0.lock().unwrap();
        t.iter()
            .map(|(id, i)| json!({"id": id.0, "url": i.url, "profile": i.profile, "private": i.private}))
            .collect()
    };
    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let Some(env) = ENVIRONMENT.with(|e| e.borrow().clone()) else {
            let _ = tx.send(Err("no WebView2 environment yet".to_string()));
            return;
        };
        let t2 = tx.clone();
        if let Err(e) = ferrum_webview_manager::webview2::process_inventory(
            &env,
            Box::new(move |r| {
                let _ = t2.send(r.map_err(|e| e.to_string()));
            }),
        ) {
            let _ = tx.send(Err(e.to_string()));
        }
    })
    .map_err(|e| e.to_string())?;
    let list = tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(std::time::Duration::from_secs(10))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|_| "WebView2 did not answer in time".to_string())??;
    Ok(json!({
        "tabs": tabs,
        "processes": list.iter().map(|p| json!({"pid": p.pid, "kind": p.kind, "frames": p.frames})).collect::<Vec<_>>(),
    }))
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
pub fn activate_next(app: &AppHandle) {
    let moved = app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .activate_next()
        .is_some();
    if moved {
        after_switch(app);
    }
}

/// Switches to the next tab to the left (wraps around).
pub fn activate_previous(app: &AppHandle) {
    let moved = app
        .state::<TabsState>()
        .0
        .lock()
        .unwrap()
        .activate_previous()
        .is_some();
    if moved {
        after_switch(app);
    }
}

/// Switches to the next tab to the right (wraps around).
#[tauri::command]
pub fn tab_next(app: AppHandle) {
    activate_next(&app);
}

/// Switches to the next tab to the left (wraps around).
#[tauri::command]
pub fn tab_previous(app: AppHandle) {
    activate_previous(&app);
}

/// Reopens the most recently closed tab (its last address, in a new view).
#[tauri::command]
pub async fn tab_reopen(app: AppHandle) -> Option<u64> {
    reopen(&app)
}

/// Reopens the most recently closed tab (its last address, in a new view) and makes it active.
pub fn reopen(app: &AppHandle) -> Option<u64> {
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
            private: info.private,
            ..TabInfo::default()
        };
        (id.0, url, info.profile.clone())
    };
    emit_tabs(app);
    create_view(app, id, profile, url);
    after_switch(app);
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

/// Test helper (debug builds only; a release build refuses): brings Ferrum's window to the front and puts keyboard
/// focus in the active tab's page (`target = "content"`) or in the shell (`"shell"`), so a test can press real keys.
#[tauri::command]
pub fn test_focus(app: AppHandle, target: String) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("not available in release builds".into());
    }
    if let Some(w) = app.get_window("main") {
        w.set_focus().map_err(|e| e.to_string())?;
    }
    match target.as_str() {
        "content" => {
            app.state::<FocusState>()
                .content_last
                .store(true, Ordering::SeqCst);
            with_content(&app, |v| {
                let _ = v.focus();
            });
            Ok(())
        }
        "shell" => {
            crate::shortcuts::focus_address(&app);
            Ok(())
        }
        other => Err(format!("unknown focus target {other:?}")),
    }
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
