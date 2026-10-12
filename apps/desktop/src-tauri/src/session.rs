//! Session restore (P3 task p3.5): the open tabs are saved to `session.json` in Ferrum's data folder (`[storage]
//! data_dir`, else `%LOCALAPPDATA%\dev.ferrum.desktop`) about once a second while they change, and when Ferrum closes;
//! on the next start they are opened again (`[session] restore_on_startup`, on by default). Writes are atomic
//! (`ferrum_core::fsutil::write_atomic`), so a crash leaves the last complete save. The file lists the sites the user
//! had open, so it stays in the data folder and is never committed. Each tab's back/forward history is not restored
//! (WebView2 cannot give a new view a history).
//!
//! The built-in self-tests (`FERRUM_SELFTEST`) run against the real data folder, so the session is neither read nor
//! written then: test pages must never appear as the user's restored tabs.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use ferrum_core::session::{self, Session, SessionError, SessionTab};
use tauri::{AppHandle, Manager};

use crate::content::{AppConfig, TabsState};

/// Where the session is kept and whether it needs saving.
pub struct SessionStore {
    /// `session.json` (none when the data folder is unknown).
    pub path: Option<PathBuf>,
    /// Saving and restoring are on (off for self-tests, or when the file is from a newer Ferrum).
    pub enabled: AtomicBool,
    /// The tab list changed since the last save.
    pub dirty: AtomicBool,
}

/// The session store for this run: next to the WebView2 data.
pub fn store(app: &tauri::App, data_dir: Option<PathBuf>) -> SessionStore {
    let dir = data_dir.or_else(|| app.path().app_local_data_dir().ok());
    SessionStore {
        path: dir.map(|d| d.join("session.json")),
        enabled: AtomicBool::new(std::env::var_os("FERRUM_SELFTEST").is_none()),
        dirty: AtomicBool::new(false),
    }
}

/// The tab list changed: the saver writes it within about a second.
pub fn mark_dirty(app: &AppHandle) {
    if let Some(s) = app.try_state::<SessionStore>() {
        s.dirty.store(true, Ordering::SeqCst);
    }
}

/// The current tab list as a session.
fn snapshot(app: &AppHandle) -> Session {
    let t = app.state::<TabsState>();
    let t = t.0.lock().unwrap();
    let active = t.active().and_then(|a| t.index_of(a));
    let tabs = t
        .iter()
        .map(|(_, i)| SessionTab {
            url: i.url.clone(),
            title: i.title.clone(),
            profile: i.profile.clone(),
        })
        .collect();
    Session::now(tabs, active)
}

/// Writes the session now (no-op when saving is off).
pub fn save_now(app: &AppHandle) {
    let Some(store) = app.try_state::<SessionStore>() else {
        return;
    };
    let Some(path) = &store.path else { return };
    if !store.enabled.load(Ordering::SeqCst) {
        return;
    }
    store.dirty.store(false, Ordering::SeqCst);
    let s = snapshot(app);
    match session::save(path, &s) {
        Ok(()) => tracing::debug!(target: "ferrum::session", tabs = s.tabs.len(), "session saved"),
        Err(e) => tracing::warn!(target: "ferrum::session", error = %e, "session not saved"),
    }
}

/// Saves the session about once a second while it changes (a background thread for the life of the app).
pub fn start_saver(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(1000));
            let dirty = app
                .try_state::<SessionStore>()
                .is_some_and(|s| s.dirty.load(Ordering::SeqCst));
            if dirty {
                save_now(&app);
            }
            crate::history::save_if_dirty(&app);
        }
    });
}

/// The tabs to open at start, as (address, active): the last session when restoring is on and one was saved, else
/// the start-up pages (an empty tab when there are none).
pub fn start_tabs(app: &AppHandle) -> Vec<(String, bool)> {
    let cfg = &app.state::<AppConfig>().0.config.session;
    if cfg.restore_on_startup
        && let Some(saved) = read(app)
        && !saved.tabs.is_empty()
    {
        tracing::info!(target: "ferrum::session", tabs = saved.tabs.len(), "restoring the last session");
        let active = saved.active.unwrap_or(0);
        return saved
            .tabs
            .into_iter()
            .enumerate()
            .map(|(i, t)| (t.url, i == active))
            .collect();
    }
    let mut urls = cfg.startup_urls.clone();
    if urls.is_empty() {
        urls.push(crate::content::BLANK.to_string());
    }
    urls.into_iter()
        .enumerate()
        .map(|(i, u)| (u, i == 0))
        .collect()
}

/// Reads the saved session. An unreadable file is copied aside and ignored; a file from a newer Ferrum is left
/// alone and saving is switched off for this run, so it is never overwritten.
fn read(app: &AppHandle) -> Option<Session> {
    let store = app.state::<SessionStore>();
    if !store.enabled.load(Ordering::SeqCst) {
        return None;
    }
    let path = store.path.as_ref()?;
    match session::load(path) {
        Ok(s) => s,
        Err(SessionError::NewerVersion(v)) => {
            store.enabled.store(false, Ordering::SeqCst);
            tracing::warn!(target: "ferrum::session", version = v, "session file from a newer Ferrum: not restored, not overwritten");
            None
        }
        Err(e) => {
            let backup = ferrum_core::fsutil::backup_broken(path)
                .map(|b| b.display().to_string())
                .unwrap_or_else(|be| format!("(no copy: {be})"));
            tracing::warn!(target: "ferrum::session", error = %e, backup = %backup, "session file not used");
            None
        }
    }
}

/// Test helper (debug builds only; a release build refuses): ends Ferrum at once, the way a crash would (no exit
/// handlers, no last save), so the crash-restore test needs no kill command.
#[tauri::command]
pub fn test_crash() -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("not available in release builds".into());
    }
    tracing::warn!(target: "ferrum::app", "test crash (process abort)");
    std::process::abort();
}
