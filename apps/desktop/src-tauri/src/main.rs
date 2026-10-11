//! Ferrum: the Tauri application. One window with the trusted shell (a Tauri child web view labelled
//! `shell`, holding the toolbar) above the content area. P2 task p2.2 creates the window and the shell; p2.3 locks
//! the app bridge down; the content web view (a WebView2 controller Ferrum creates itself, adr-0029) follows in p2.6.
#![forbid(unsafe_code)]
#![windows_subsystem = "windows"]

mod selftest;

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use tauri::{
    LogicalPosition, LogicalSize, Manager, Rect, WebviewBuilder, WebviewUrl, Window, WindowEvent,
};

/// Height of the shell toolbar band in logical pixels. The content area fills the rest; the shell never
/// overlaps it (spike S1: child views are drawn on top).
pub const TOOLBAR_H: f64 = 52.0;

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

/// Lays the shell band out for the window's current size.
fn relayout(window: &Window) -> tauri::Result<()> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    if let Some(shell) = window.app_handle().get_webview("shell") {
        shell.set_bounds(Rect {
            position: LogicalPosition::new(0.0, 0.0).into(),
            size: LogicalSize::new(size.width, TOOLBAR_H).into(),
        })?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(BridgeStats::default())
        .invoke_handler(tauri::generate_handler![app_ping])
        .setup(|app| {
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
            window.add_child(
                WebviewBuilder::new("shell", WebviewUrl::App("index.html".into())),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, TOOLBAR_H),
            )?;
            if std::env::var("FERRUM_SELFTEST").as_deref() == Ok("ipc") {
                selftest::start_ipc(app.handle().clone(), size.width, size.height);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Resized(_) = event {
                let _ = relayout(window);
            }
        })
        .run(tauri::generate_context!())
        .expect("Ferrum failed to start");
}
