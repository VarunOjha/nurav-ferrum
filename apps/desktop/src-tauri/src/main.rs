//! Ferrum: the Tauri application. One window with the trusted shell (a Tauri child web view labelled `shell`, the
//! size of the window) and one tab web view per tab (WebView2 controllers Ferrum creates itself, adr-0029), placed in
//! the content area the shell leaves free (they are drawn above it).
//! P2: p2.2 window and shell; p2.3 bridge locked to the shell; p2.4/p2.5 settings and address bar; p2.6 content view.
//! P3: p3.2 one view per tab.
#![forbid(unsafe_code)]
#![windows_subsystem = "windows"]

mod content;
mod external;
mod logging;
mod selftest;
mod shortcuts;

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use ferrum_core::tabs::Place;
use std::time::Duration;

use ferrum_core::config;
use tauri::{
    LogicalPosition, LogicalSize, Manager, Rect, WebviewBuilder, WebviewUrl, Window, WindowEvent,
};

use content::{AppConfig, EventLog, FocusState, Insets, MainHwnd, ShellTitle, TabsState};

/// Height of the P2 toolbar in logical pixels (the self-test's probe view is placed below it).
pub const TOOLBAR_H: f64 = 52.0;

/// The shell's top band until it reports its real size: tab strip (36 px) plus toolbar.
pub const DEFAULT_TOP: f64 = 36.0 + TOOLBAR_H;

/// The shell reports the space it keeps for itself (logical px): `top` for the tab strip, toolbar and bars, `left`
/// for the sidebar. Tab views fill the rest, so the shell never draws under a page. Clamped to sane ranges.
#[tauri::command]
fn shell_layout(window: Window, insets: tauri::State<'_, Insets>, top: f64, left: f64) {
    let clamp = |v: f64, max: f64| {
        if v.is_finite() {
            v.clamp(0.0, max)
        } else {
            0.0
        }
    };
    *insets.0.lock().unwrap() = (clamp(top, 400.0), clamp(left, 600.0));
    let w = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = relayout(&w);
    });
}

/// The shell shows (true) or removes (false) its full error panel for tab `tab` (the active one when missing): the
/// tab's view is hidden meanwhile, so error pages are drawn by the shell and never loaded into a tab view (p2.8).
#[tauri::command]
fn shell_cover(app: tauri::AppHandle, cover: bool, tab: Option<u64>) {
    content::set_covered(&app, tab, cover);
}

/// Closes Ferrum (the shell's quit action; the smoke tests use it to end the app cleanly instead of killing it).
#[tauri::command]
fn app_quit(app: tauri::AppHandle) {
    tracing::info!(target: "ferrum::app", "quit");
    app.exit(0);
}

/// Counts how often the shell reached the app through the bridge (positive control of the p2.3 test).
#[derive(Default)]
pub struct BridgeStats {
    /// Successful `app_ping` calls.
    pub pings: AtomicU64,
}

/// Harmless probe command: lets the shell confirm the bridge works for it. Only the shell's capability grants it
/// (`allow-app-ping`); any other web view is refused by the ACL.
#[tauri::command]
fn app_ping(stats: tauri::State<'_, BridgeStats>) -> &'static str {
    stats.pings.fetch_add(1, Ordering::SeqCst);
    "pong"
}

/// Lays the shell (the whole window) and the tab views (the content area) out for the window's size (UI thread).
fn relayout(window: &Window) -> tauri::Result<()> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    if let Some(shell) = window.app_handle().get_webview("shell") {
        shell.set_bounds(Rect {
            position: LogicalPosition::new(0.0, 0.0).into(),
            size: LogicalSize::new(size.width, size.height).into(),
        })?;
    }
    content::relayout(window);
    Ok(())
}

/// Settings: the user's `config.toml` in the app config folder, then `--config <path>` (experiment override).
/// Returns the settings and, if they could not be used, why (logged once logging has started).
fn load_config(app: &tauri::App) -> (config::Loaded, Option<String>) {
    let user = app
        .path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("config.toml"));
    let args: Vec<String> = std::env::args().collect();
    let over = args
        .iter()
        .position(|a| a == "--config")
        .and_then(|i| args.get(i + 1))
        .map(PathBuf::from);
    match config::load(user.as_deref(), over.as_deref()) {
        Ok(l) => (l, None),
        Err(e) => {
            // Never start with half-read settings: fall back to the safe defaults and say so.
            let defaults = config::validate(config::Config::default()).expect("defaults are valid");
            (defaults, Some(e.to_string()))
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(BridgeStats::default())
        .manage(Insets::default())
        .manage(MainHwnd::default())
        .manage(TabsState::default())
        .manage(external::PendingExternal::default())
        .manage(external::PopupTimes::default())
        .manage(FocusState::default())
        .manage(EventLog::default())
        .manage(ShellTitle::default())
        .invoke_handler(tauri::generate_handler![
            app_ping,
            app_quit,
            shell_layout,
            shell_cover,
            external::external_open_confirm,
            external::external_cancel,
            content::tab_navigate,
            content::tab_back,
            content::tab_forward,
            content::tab_reload,
            content::tab_stop,
            content::tab_new,
            content::tab_close,
            content::tab_activate,
            content::tab_move,
            content::tab_next,
            content::tab_previous,
            content::tab_reopen,
            content::tab_list,
            content::test_stats,
            content::test_focus,
            content::shell_focused
        ])
        .setup(|app| {
            let (loaded, config_error) = load_config(app);
            // Logs: <data_dir>/logs when a data folder is configured, else the app's log folder (p2.14).
            let log_dir = match &loaded.config.storage.data_dir {
                Some(d) => Some(d.join("logs")),
                None => app.path().app_log_dir().ok(),
            };
            let log_file = log_dir.as_deref().map(logging::init);
            tracing::info!(
                target: "ferrum::app",
                version = env!("CARGO_PKG_VERSION"),
                build = if cfg!(debug_assertions) { "debug" } else { "release" },
                config_hash = %config::hash(&loaded.config),
                "start"
            );
            if let Some(Err(e)) = &log_file {
                // Nowhere to log to: say it on stderr (only visible when started from a terminal).
                eprintln!("[ferrum] logging not started: {e}");
            }
            for w in &loaded.warnings {
                tracing::warn!(target: "ferrum::config", warning = ?w, "settings warning");
            }
            if let Some(e) = config_error {
                tracing::warn!(target: "ferrum::config", error = %e, "settings not used; using the defaults");
            }
            app.manage(AppConfig(loaded));
            // Test hook: FERRUM_EXIT_AFTER=<seconds> makes the app close itself (automated checks never kill it).
            if let Some(secs) = std::env::var("FERRUM_EXIT_AFTER")
                .ok()
                .and_then(|s| s.parse::<u64>().ok())
            {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(secs));
                    handle.exit(0);
                });
            }
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("Ferrum")
                .inner_size(1280.0, 800.0)
                .min_inner_size(480.0, 320.0)
                .build()?;
            let size = window
                .inner_size()?
                .to_logical::<f64>(window.scale_factor()?);
            let handle = app.handle().clone();
            let mut shell = WebviewBuilder::new("shell", WebviewUrl::App("index.html".into()))
                .on_document_title_changed(move |_wv, t| {
                    *handle.state::<ShellTitle>().0.lock().unwrap() = t;
                });
            // A configured data folder (settings [storage] data_dir) holds the WebView2 data of the shell and, since
            // the content view is created from the same environment (adr-0029), of the pages too (p2.11).
            if let Some(dir) = app.state::<AppConfig>().0.config.storage.data_dir.clone() {
                shell = shell.data_directory(dir);
            }
            window.add_child(
                shell,
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, size.height),
            )?;
            app.state::<MainHwnd>()
                .0
                .store(window.hwnd()?.0 as isize, Ordering::SeqCst);
            // Tab views come from the shell's WebView2 environment (adr-0029): save it on the UI thread, then open the
            // start tab (the first start page, or an empty tab).
            let shell_view = app
                .get_webview("shell")
                .ok_or(tauri::Error::WebviewNotFound)?;
            let handle = app.handle().clone();
            shell_view.with_webview(move |pw| {
                ferrum_webview_manager::webview2::save_environment(&pw.environment());
                // The shell fills the window; tab views must be drawn above it.
                if let Err(e) = ferrum_webview_manager::webview2::send_to_back(&pw.controller()) {
                    tracing::warn!(target: "ferrum::app", error = %e, "shell not moved behind the tab views");
                }
                let start = handle
                    .state::<AppConfig>()
                    .0
                    .config
                    .session
                    .startup_urls
                    .first()
                    .cloned()
                    .unwrap_or_else(|| content::BLANK.to_string());
                content::open_tab(&handle, start, Place::End, true);
            })?;
            match std::env::var("FERRUM_SELFTEST").as_deref() {
                Ok("ipc") => selftest::start_ipc(app.handle().clone(), size.width, size.height),
                Ok("nav") => selftest::start_nav(app.handle().clone()),
                Ok("devtools") => selftest::start_devtools(app.handle().clone()),
                #[cfg(debug_assertions)]
                Ok("panic") => selftest::start_panic(app.handle().clone()),
                _ => {}
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::Resized(_) => {
                let _ = relayout(window);
            }
            WindowEvent::Focused(true) => content::restore_focus(window.app_handle()),
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("Ferrum failed to start");
}
