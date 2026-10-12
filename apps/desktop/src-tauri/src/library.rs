//! The library: history and bookmarks in one local SQLite file, `ferrum.db`, in Ferrum's data folder (P3 feature set,
//! p3.18, adr-0032; the store itself is `ferrum_core::store`). Every change is written at once in its own transaction,
//! so there is nothing to save on exit. Browsing data: it stays in the data folder and is never committed; the log
//! keeps no addresses. Self-test runs keep it in memory only (they use the real data folder).
//!
//! On the first start with `ferrum.db`, the old `history.json` (p3.7) is copied in once and renamed
//! `history.json.imported`; nothing is deleted.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use ferrum_core::store::{Store, StoreError};
use tauri::Manager;

/// The store and whether it is the file on disk.
pub struct Library {
    /// `ferrum.db` (none when the data folder is unknown).
    pub path: Option<PathBuf>,
    /// False when the store is in memory only (self-tests, or a file Ferrum could not use).
    pub on_disk: bool,
    store: Mutex<Store>,
}

impl Library {
    /// The store, locked for one operation.
    pub fn lock(&self) -> MutexGuard<'_, Store> {
        self.store.lock().unwrap_or_else(|p| p.into_inner())
    }
}

/// Opens the library for this run, next to the WebView2 data. A file from a newer Ferrum, or one SQLite cannot read,
/// is left alone (a damaged one is also copied aside) and the library is kept in memory for this run.
pub fn open(app: &tauri::App, data_dir: Option<PathBuf>) -> Library {
    let dir = data_dir.or_else(|| app.path().app_local_data_dir().ok());
    let path = dir.as_ref().map(|d| d.join("ferrum.db"));
    if std::env::var_os("FERRUM_SELFTEST").is_some() {
        return memory(path);
    }
    let Some(p) = path.clone() else {
        tracing::warn!(target: "ferrum::library", "no data folder: library kept in memory");
        return memory(None);
    };
    let is_new = !p.exists();
    match Store::open(&p) {
        Ok(mut store) => {
            if is_new && let Some(d) = &dir {
                import_old_history(&mut store, d);
            }
            Library {
                path: Some(p),
                on_disk: true,
                store: Mutex::new(store),
            }
        }
        Err(e @ StoreError::Newer(_)) => {
            tracing::warn!(target: "ferrum::library", error = %e, "library not used and not overwritten");
            memory(Some(p))
        }
        Err(e) => {
            let backup = ferrum_core::fsutil::backup_broken(&p)
                .map(|b| b.display().to_string())
                .unwrap_or_else(|be| format!("(no copy: {be})"));
            tracing::warn!(target: "ferrum::library", error = %e, backup = %backup, "library file not used");
            memory(Some(p))
        }
    }
}

fn memory(path: Option<PathBuf>) -> Library {
    Library {
        path,
        on_disk: false,
        store: Mutex::new(Store::in_memory()),
    }
}

/// Copies `history.json` (p3.7) into a new `ferrum.db` and renames it `history.json.imported`.
fn import_old_history(store: &mut Store, dir: &Path) {
    let old = dir.join("history.json");
    if !old.exists() {
        return;
    }
    match ferrum_core::history::load(&old) {
        Ok(h) => match store.import_history(&h) {
            Ok(n) => {
                let done = dir.join("history.json.imported");
                if let Err(e) = std::fs::rename(&old, &done) {
                    tracing::warn!(target: "ferrum::library", error = %e, "history.json imported but not renamed");
                }
                tracing::info!(target: "ferrum::library", entries = n, "history.json imported");
            }
            Err(e) => {
                tracing::warn!(target: "ferrum::library", error = %e, "history.json not imported")
            }
        },
        Err(e) => {
            tracing::warn!(target: "ferrum::library", error = %e, "history.json not readable; not imported")
        }
    }
}

/// Milliseconds since 1970.
pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
