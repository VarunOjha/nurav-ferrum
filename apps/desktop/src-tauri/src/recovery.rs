//! Recovery from failed WebView2 processes (P4 task p4.10; master prompt §4 "Renderer crash recovery").
//!
//! - **A tab's page process ends or hangs** (WebView2 `ProcessFailed`, renderer kinds): the tab is marked crashed, the
//!   shell covers it with its panel ("This page stopped working", Reload), and Reload loads the tab's last address
//!   again in the same view, which starts a new page process. Other tabs and the shell are separate processes and keep
//!   running. A frame's process or a helper process (GPU, utility) is only logged: WebView2 restarts helpers itself.
//! - **The browser process ends** (`BrowserProcessExited` with kind failed): every view is gone, the shell's too, and
//!   none can be made again in this run (Tauri created the environment). The session is saved and Ferrum starts again,
//!   so the session restore of p3.5 brings the tabs back. A second browser failure within [`RESTART_WINDOW_SECS`] of
//!   such a restart ends Ferrum instead of restarting again (no restart loop).
//! - **Test hook** (debug builds only): `test_crash_tab` lets one tab load one of the browser's own crash pages once
//!   (`edge://kill` ends the tab's page process: the method of spike S3). Release builds have no way to load them:
//!   every `edge:` address is refused by the navigation policy.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use ferrum_webview_manager::tab::ProcessFailure;
use tauri::AppHandle;

/// The browser's own pages that end one of its processes on purpose (the test hook's only choices).
pub const CRASH_PAGES: [&str; 3] = [
    "edge://kill",
    "edge://gpucrash",
    "edge://inducebrowsercrashforrealz",
];

/// Environment variable a restarted Ferrum receives: the time (seconds since 1970) of the restart.
pub const RESTARTED_AT: &str = "FERRUM_RECOVERY_RESTARTED_AT";

/// A browser failure sooner than this after a recovery restart ends Ferrum instead.
pub const RESTART_WINDOW_SECS: u64 = 60;

/// The tab and crash page the test hook allowed once.
static ARMED: Mutex<Option<(u64, String)>> = Mutex::new(None);

/// Set when Ferrum should start again once it has closed (after a browser failure).
static RESTART: AtomicBool = AtomicBool::new(false);

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// True for one of the crash pages, in debug builds only.
pub fn is_crash_page(uri: &str) -> bool {
    cfg!(debug_assertions) && CRASH_PAGES.contains(&uri.trim_end_matches('/'))
}

/// The navigation gate asks: may tab `tab` load `uri` because the test hook allowed it? True once (debug builds only).
pub fn take_armed(tab: u64, uri: &str) -> bool {
    if !is_crash_page(uri) {
        return false;
    }
    let mut a = ARMED.lock().unwrap();
    match a.as_ref() {
        Some((t, p)) if *t == tab && p == uri.trim_end_matches('/') => {
            *a = None;
            true
        }
        _ => false,
    }
}

/// Logs a failed process of tab `tab`.
pub fn on_process_failed(tab: u64, failure: ProcessFailure, reason: i32, exit_code: i32) {
    if failure.page_lost() {
        tracing::warn!(target: "ferrum::recovery", tab, failure = failure.as_str(), reason, exit_code, "page process failed; tab marked crashed");
    } else {
        tracing::info!(target: "ferrum::recovery", tab, failure = failure.as_str(), reason, exit_code, "helper or frame process failed");
    }
}

/// Whether a browser failure now should restart Ferrum, given the restart time this run was started with (if any).
pub fn should_restart(restarted_at: Option<u64>, now: u64) -> bool {
    restarted_at.is_none_or(|t| now.saturating_sub(t) >= RESTART_WINDOW_SECS)
}

/// UI thread: the browser process of Ferrum's environment ended. A normal end is only logged; a failure saves the
/// session and closes Ferrum, which then starts again (see [`restart_if_wanted`]) unless it already restarted moments
/// ago.
pub fn browser_exited(app: &AppHandle, failed: bool) {
    if !failed {
        tracing::info!(target: "ferrum::recovery", "browser process ended normally");
        return;
    }
    crate::session::save_now(app);
    let restarted_at = std::env::var(RESTARTED_AT)
        .ok()
        .and_then(|v| v.parse::<u64>().ok());
    if should_restart(restarted_at, now_secs()) {
        tracing::error!(target: "ferrum::recovery", "browser process failed; Ferrum restarts and restores the tabs");
        RESTART.store(true, Ordering::SeqCst);
        app.exit(0);
    } else {
        tracing::error!(target: "ferrum::recovery", "browser process failed again right after a restart; Ferrum closes");
        app.exit(1);
    }
}

/// Called last when Ferrum closes: starts Ferrum again with the same arguments if a browser failure asked for it.
pub fn restart_if_wanted() {
    if !RESTART.load(Ordering::SeqCst) {
        return;
    }
    let exe = match std::env::current_exe() {
        Ok(e) => e,
        Err(e) => {
            tracing::error!(target: "ferrum::recovery", error = %e, "Ferrum not restarted: own program not found");
            return;
        }
    };
    match std::process::Command::new(exe)
        .args(std::env::args_os().skip(1))
        .env(RESTARTED_AT, now_secs().to_string())
        .spawn()
    {
        Ok(_) => tracing::info!(target: "ferrum::recovery", "Ferrum started again"),
        Err(e) => tracing::error!(target: "ferrum::recovery", error = %e, "Ferrum not restarted"),
    }
}

/// Test hook (debug builds only): lets tab `id` (the active one when missing) load `page`, one of [`CRASH_PAGES`],
/// once, and loads it. `edge://kill` ends the tab's page process (spike S3).
#[tauri::command]
pub fn test_crash_tab(app: AppHandle, id: Option<u64>, page: String) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("not available in release builds".into());
    }
    if !CRASH_PAGES.contains(&page.as_str()) {
        return Err(format!("not a crash page: {page}"));
    }
    let id = id
        .or_else(|| crate::content::active(&app))
        .ok_or("no tab")?;
    *ARMED.lock().unwrap() = Some((id, page.clone()));
    tracing::warn!(target: "ferrum::recovery", tab = id, page = %page, "test crash");
    crate::content::with_view(&app, id, move |v| {
        if let Err(e) = v.navigate(&page) {
            tracing::warn!(target: "ferrum::recovery", error = %e, "crash page not opened");
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crash_pages_pass_the_gate_once_and_only_for_the_armed_tab() {
        *ARMED.lock().unwrap() = Some((7, "edge://kill".into()));
        assert!(!take_armed(8, "edge://kill"));
        assert!(!take_armed(7, "edge://gpucrash"));
        assert!(!take_armed(7, "https://example.com/"));
        assert!(take_armed(7, "edge://kill/"));
        assert!(!take_armed(7, "edge://kill/"), "allowed once only");
        assert!(!is_crash_page("edge://settings"));
    }

    #[test]
    fn a_second_browser_failure_right_after_a_restart_does_not_restart_again() {
        assert!(should_restart(None, 1_000));
        assert!(!should_restart(
            Some(1_000),
            1_000 + RESTART_WINDOW_SECS - 1
        ));
        assert!(should_restart(Some(1_000), 1_000 + RESTART_WINDOW_SECS));
    }
}
