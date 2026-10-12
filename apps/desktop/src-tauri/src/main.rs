//! Ferrum: the Tauri application. One window with the trusted shell (a Tauri child web view labelled `shell`,
//! holding the toolbar) above the content web view (a WebView2 controller Ferrum creates itself, adr-0029).
//! P2: p2.2 window and shell; p2.3 bridge locked to the shell; p2.4/p2.5 settings and address bar; p2.6 content view.
#![forbid(unsafe_code)]
#![windows_subsystem = "windows"]

mod content;
mod external;
mod selftest;

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use ferrum_core::config;
use tauri::{
    LogicalPosition, LogicalSize, Manager, Rect, WebviewBuilder, WebviewUrl, Window, WindowEvent,
};

use content::{AppConfig, ContentReady, EventLog, FocusState, ShellTitle};

/// Height of the shell toolbar band in logical pixels. The content area fills the rest; the shell never
/// overlaps it (spike S1: child views are drawn on top).
pub const TOOLBAR_H: f64 = 52.0;

/// Extra height (logical px) the shell currently needs below the toolbar for an information bar (0 = none).
/// The content view always starts below the whole shell band, so the two never overlap (spike S1).
#[derive(Default)]
pub struct ShellBand(pub std::sync::Mutex<f64>);

/// Current height of the shell band in logical pixels.
pub fn band_height<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> f64 {
    TOOLBAR_H + *app.state::<ShellBand>().0.lock().unwrap()
}

/// The shell asks for room below the toolbar (an information bar), or gives it back with 0. At most 240 px.
#[tauri::command]
fn shell_layout(window: Window, band: tauri::State<'_, ShellBand>, extra: f64) {
    *band.0.lock().unwrap() = extra.clamp(0.0, 240.0);
    let w = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = relayout(&w);
    });
}

/// True while the shell's error panel covers the content area (p2.8): the content view is hidden and the shell
/// gets the whole window, so error pages are drawn by the shell and never loaded into the content view.
#[derive(Default)]
pub struct Covered(pub std::sync::atomic::AtomicBool);

/// The shell shows (true) or removes (false) its full error panel.
#[tauri::command]
fn shell_cover(window: Window, covered: tauri::State<'_, Covered>, cover: bool) {
    covered.0.store(cover, Ordering::SeqCst);
    let w = window.clone();
    let _ = window.run_on_main_thread(move || {
        content::set_content_visible(!cover);
        let _ = relayout(&w);
    });
}

/// Closes Ferrum (the shell's quit action; the smoke tests use it to end the app cleanly instead of killing it).
#[tauri::command]
fn app_quit(app: tauri::AppHandle) {
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

/// Lays the shell band and the content view out for the window's current size (UI thread).
fn relayout(window: &Window) -> tauri::Result<()> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    if let Some(shell) = window.app_handle().get_webview("shell") {
        let covered = window
            .app_handle()
            .state::<Covered>()
            .0
            .load(Ordering::SeqCst);
        let height = if covered {
            size.height
        } else {
            band_height(window.app_handle())
        };
        shell.set_bounds(Rect {
            position: LogicalPosition::new(0.0, 0.0).into(),
            size: LogicalSize::new(size.width, height).into(),
        })?;
    }
    content::relayout(window);
    Ok(())
}

/// Settings: the user's `config.toml` in the app config folder, then `--config <path>` (experiment override).
fn load_config(app: &tauri::App) -> config::Loaded {
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
        Ok(l) => {
            for w in &l.warnings {
                eprintln!("[ferrum] settings: {w:?}");
            }
            l
        }
        Err(e) => {
            // Never start with half-read settings: fall back to the safe defaults and say so.
            eprintln!("[ferrum] settings not used ({e}); using the defaults");
            config::validate(config::Config::default()).expect("defaults are valid")
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(BridgeStats::default())
        .manage(ShellBand::default())
        .manage(Covered::default())
        .manage(external::PendingExternal::default())
        .manage(FocusState::default())
        .manage(EventLog::default())
        .manage(ShellTitle::default())
        .manage(ContentReady::default())
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
            content::shell_focused
        ])
        .setup(|app| {
            app.manage(AppConfig(load_config(app)));
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
                LogicalSize::new(size.width, TOOLBAR_H),
            )?;
            content::create(app.handle(), &window)?;
            match std::env::var("FERRUM_SELFTEST").as_deref() {
                Ok("ipc") => selftest::start_ipc(app.handle().clone(), size.width, size.height),
                Ok("nav") => selftest::start_nav(app.handle().clone()),
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
