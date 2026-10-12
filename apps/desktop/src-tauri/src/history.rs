//! The local browsing history (P3 task p3.7): every page that loads (web addresses only) is recorded with its title in
//! `history.json` in Ferrum's data folder (`ferrum_core::history`). Saved with the session saver about once a second
//! while it changes, and on exit; cleared at once (list and file) by `history_clear`. It is browsing data: it stays in
//! the data folder and is never committed; the log keeps only scheme and host. Self-test runs keep it in memory only
//! (they use the real data folder).

use std::path::PathBuf;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

use ferrum_core::history::{self, Entry, History};
use tauri::{AppHandle, Manager};

/// The history and where it is kept.
pub struct HistoryStore {
    /// `history.json` (none when the data folder is unknown).
    pub path: Option<PathBuf>,
    /// Written to disk (off for self-tests, or when the file is from a newer Ferrum).
    pub persist: AtomicBool,
    /// Changed since the last save.
    pub dirty: AtomicBool,
    /// The entries.
    pub data: Mutex<History>,
}

/// Loads the history for this run (next to the WebView2 data). An unreadable file is copied aside and an empty history
/// is used; a file from a newer Ferrum is left alone and not overwritten.
pub fn store(app: &tauri::App, data_dir: Option<PathBuf>) -> HistoryStore {
    let path = data_dir
        .or_else(|| app.path().app_local_data_dir().ok())
        .map(|d| d.join("history.json"));
    let mut persist = std::env::var_os("FERRUM_SELFTEST").is_none();
    let data = match (&path, persist) {
        (Some(p), true) => match history::load(p) {
            Ok(h) => h,
            Err(e) if e.contains("newer Ferrum") => {
                persist = false;
                tracing::warn!(target: "ferrum::history", error = %e, "history not used and not overwritten");
                History::default()
            }
            Err(e) => {
                let backup = ferrum_core::fsutil::backup_broken(p)
                    .map(|b| b.display().to_string())
                    .unwrap_or_else(|be| format!("(no copy: {be})"));
                tracing::warn!(target: "ferrum::history", error = %e, backup = %backup, "history file not used");
                History::default()
            }
        },
        _ => History::default(),
    };
    HistoryStore {
        path,
        persist: AtomicBool::new(persist),
        dirty: AtomicBool::new(false),
        data: Mutex::new(data),
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Records that `url` loaded (web addresses only), with the title the page reported so far (pages often report their
/// title before they finish loading).
pub fn visited(app: &AppHandle, url: &str, title: &str) {
    if !(url.starts_with("https:") || url.starts_with("http:")) {
        return;
    }
    let s = app.state::<HistoryStore>();
    {
        let mut h = s.data.lock().unwrap();
        h.visit(url, now_ms());
        if !title.is_empty() {
            h.set_title(url, title);
        }
    }
    s.dirty.store(true, Ordering::SeqCst);
}

/// Records the title of the page at `url`.
pub fn titled(app: &AppHandle, url: &str, title: &str) {
    let s = app.state::<HistoryStore>();
    if s.data.lock().unwrap().set_title(url, title) {
        s.dirty.store(true, Ordering::SeqCst);
    }
}

/// Writes the history now when it changed (called by the session saver and on exit).
pub fn save_if_dirty(app: &AppHandle) {
    let Some(s) = app.try_state::<HistoryStore>() else {
        return;
    };
    if s.dirty.swap(false, Ordering::SeqCst) {
        write(&s);
    }
}

fn write(s: &HistoryStore) {
    let (Some(path), true) = (&s.path, s.persist.load(Ordering::SeqCst)) else {
        return;
    };
    let snapshot = s.data.lock().unwrap().clone();
    if let Err(e) = history::save(path, &snapshot) {
        tracing::warn!(target: "ferrum::history", error = %e, "history not saved");
    }
}

/// The history, newest first: up to `limit` (default 200) entries matching `query` (address or title).
#[tauri::command]
pub fn history_list(
    store: tauri::State<'_, HistoryStore>,
    query: Option<String>,
    limit: Option<usize>,
) -> Vec<Entry> {
    store.data.lock().unwrap().search(
        query.as_deref().unwrap_or(""),
        limit.unwrap_or(200).min(1000),
    )
}

/// Forgets the whole history: the list and the file, at once.
#[tauri::command]
pub fn history_clear(store: tauri::State<'_, HistoryStore>) {
    store.data.lock().unwrap().clear();
    store.dirty.store(false, Ordering::SeqCst);
    write(&store);
    tracing::info!(target: "ferrum::history", "history cleared");
}
