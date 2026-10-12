//! Bookmarks (P3 feature set, p3.19, adr-0032): kept in the library's SQLite file (`library.rs`). Only the trusted
//! shell may call these commands (capability `shell.json`); websites have no bridge at all. Only `http`/`https`
//! addresses are accepted (`ferrum_core::store::check_url`). The bookmarks bar shows the "Favourites bar" folder; its
//! visibility is `[appearance] bookmarks_bar` in the settings file.

use ferrum_core::config;
use ferrum_core::store::{BAR_FOLDER, Bookmark};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::UserConfigPath;
use crate::content::AppConfig;
use crate::library::{Library, now_ms};

/// Every bookmark, the bookmarks bar's folder first, then by folder name and position.
#[tauri::command]
pub fn bookmark_list(lib: tauri::State<'_, Library>) -> Result<Vec<Bookmark>, String> {
    lib.lock().bookmarks().map_err(|e| e.to_string())
}

/// The bookmark for `url`, if there is one (the star in the address bar).
#[tauri::command]
pub fn bookmark_for(
    lib: tauri::State<'_, Library>,
    url: String,
) -> Result<Option<Bookmark>, String> {
    lib.lock().bookmark_for(&url).map_err(|e| e.to_string())
}

/// Adds a bookmark at the end of `folder` (the bookmarks bar when none).
#[tauri::command]
pub fn bookmark_add(
    lib: tauri::State<'_, Library>,
    url: String,
    title: String,
    folder: Option<String>,
) -> Result<Bookmark, String> {
    let b = lib
        .lock()
        .add_bookmark(&url, &title, folder.as_deref(), now_ms())
        .map_err(|e| e.to_string())?;
    tracing::info!(target: "ferrum::bookmarks", id = b.id, "bookmark added");
    Ok(b)
}

/// Renames a bookmark and/or moves it to the end of another folder.
#[tauri::command]
pub fn bookmark_update(
    lib: tauri::State<'_, Library>,
    id: i64,
    title: Option<String>,
    folder: Option<String>,
) -> Result<Bookmark, String> {
    lib.lock()
        .update_bookmark(id, title.as_deref(), folder.as_deref())
        .map_err(|e| e.to_string())
}

/// Moves a bookmark to position `index` in its folder.
#[tauri::command]
pub fn bookmark_move(lib: tauri::State<'_, Library>, id: i64, index: usize) -> Result<(), String> {
    lib.lock()
        .move_bookmark(id, index)
        .map_err(|e| e.to_string())
}

/// Deletes a bookmark. True when it existed.
#[tauri::command]
pub fn bookmark_remove(lib: tauri::State<'_, Library>, id: i64) -> Result<bool, String> {
    let gone = lib.lock().remove_bookmark(id).map_err(|e| e.to_string())?;
    if gone {
        tracing::info!(target: "ferrum::bookmarks", id, "bookmark removed");
    }
    Ok(gone)
}

/// What the shell needs to draw itself (p3.19; p3.22 adds the theme).
#[derive(Debug, Clone, Serialize)]
pub struct AppearanceView {
    /// Show the bookmarks bar.
    pub bookmarks_bar: bool,
    /// The folder the bookmarks bar shows.
    pub bar_folder: &'static str,
}

/// The current appearance settings.
#[tauri::command]
pub fn appearance_get(app: AppHandle) -> AppearanceView {
    let c = app.state::<AppConfig>().get();
    AppearanceView {
        bookmarks_bar: c.appearance.bookmarks_bar,
        bar_folder: BAR_FOLDER,
    }
}

/// Changes appearance settings given (others stay) and saves them to the user settings file.
#[tauri::command]
pub fn appearance_set(
    app: AppHandle,
    bookmarks_bar: Option<bool>,
) -> Result<AppearanceView, String> {
    let mut next = app.state::<AppConfig>().get();
    if let Some(b) = bookmarks_bar {
        next.appearance.bookmarks_bar = b;
    }
    let Some(path) = app.state::<UserConfigPath>().0.clone() else {
        return Err("Ferrum does not know where its settings file is.".into());
    };
    let loaded = config::validate(next).map_err(|e| e.to_string())?;
    config::save(&path, &loaded.config).map_err(|e| e.to_string())?;
    *app.state::<AppConfig>().0.write().unwrap() = loaded;
    tracing::info!(target: "ferrum::config", ?bookmarks_bar, "appearance saved");
    Ok(appearance_get(app))
}
