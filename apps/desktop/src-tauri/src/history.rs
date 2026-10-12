//! The local browsing history (p3.7; kept in the library's SQLite file since p3.18, adr-0032): every page that loads
//! (web addresses only) is recorded with its title, written at once. `history_clear` forgets it all (entries, word
//! index, and the file is compacted so nothing of them stays inside). The log keeps no addresses.

use ferrum_core::history::Entry;
use tauri::{AppHandle, Manager};

use crate::library::{Library, now_ms};

/// Records that `url` loaded (web addresses only), with the title the page reported so far (pages often report their
/// title before they finish loading).
pub fn visited(app: &AppHandle, url: &str, title: &str) {
    if !(url.starts_with("https:") || url.starts_with("http:")) {
        return;
    }
    let lib = app.state::<Library>();
    let mut s = lib.lock();
    let r = s.visit(url, now_ms()).and_then(|()| {
        if title.is_empty() {
            Ok(false)
        } else {
            s.set_title(url, title)
        }
    });
    if let Err(e) = r {
        tracing::warn!(target: "ferrum::history", error = %e, "visit not recorded");
    }
}

/// Records the title of the page at `url`.
pub fn titled(app: &AppHandle, url: &str, title: &str) {
    if url.is_empty() {
        return;
    }
    if let Err(e) = app.state::<Library>().lock().set_title(url, title) {
        tracing::warn!(target: "ferrum::history", error = %e, "title not recorded");
    }
}

/// The history, newest first: up to `limit` (default 200, at most 1000) entries whose title or address has words
/// starting with every word of `query`.
#[tauri::command]
pub fn history_list(
    lib: tauri::State<'_, Library>,
    query: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<Entry>, String> {
    lib.lock()
        .history(
            query.as_deref().unwrap_or(""),
            limit.unwrap_or(200).min(1000),
        )
        .map_err(|e| e.to_string())
}

/// Forgets the whole history at once (entries, word index; the file is compacted). Bookmarks stay.
#[tauri::command]
pub fn history_clear(lib: tauri::State<'_, Library>) -> Result<(), String> {
    lib.lock().clear_history().map_err(|e| e.to_string())?;
    tracing::info!(target: "ferrum::history", "history cleared");
    Ok(())
}

/// Forgets every visit to one address (Shift+Delete on an address-bar suggestion, p3.20).
#[tauri::command]
pub fn history_remove(lib: tauri::State<'_, Library>, url: String) -> Result<usize, String> {
    lib.lock()
        .remove_history_url(&url)
        .map_err(|e| e.to_string())
}

/// What the address bar suggests from the library for `query` (p3.20): matching bookmarks and pages from the history
/// (each page once, newest first). Open tabs are matched by the shell, which has the tab list.
#[derive(Debug, serde::Serialize)]
pub struct Suggestions {
    /// Up to 3 bookmarks, best match first.
    pub bookmarks: Vec<ferrum_core::store::Bookmark>,
    /// Up to 8 pages from the history, newest first.
    pub history: Vec<Entry>,
}

/// Suggestions for the address bar (words of titles and addresses; nothing for an empty query).
#[tauri::command]
pub fn library_suggest(
    lib: tauri::State<'_, Library>,
    query: String,
) -> Result<Suggestions, String> {
    if query.trim().is_empty() {
        return Ok(Suggestions {
            bookmarks: Vec::new(),
            history: Vec::new(),
        });
    }
    let s = lib.lock();
    Ok(Suggestions {
        bookmarks: s.search_bookmarks(&query, 3).map_err(|e| e.to_string())?,
        history: s.suggest_history(&query, 8).map_err(|e| e.to_string())?,
    })
}
