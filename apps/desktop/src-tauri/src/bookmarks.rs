//! Bookmarks (P3 feature set, p3.19, adr-0032): kept in the library's SQLite file (`library.rs`). Only the trusted
//! shell may call these commands (capability `shell.json`); websites have no bridge at all. Only `http`/`https`
//! addresses are accepted (`ferrum_core::store::check_url`). The bookmarks bar shows the "Favourites bar" folder; its
//! visibility is `[appearance] bookmarks_bar` in the settings file.

use ferrum_core::config::{self, Accent, Density, Theme};
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

/// What the shell needs to draw itself (p3.19 bookmarks bar; p3.22 theme, accent, density; adr-0033).
#[derive(Debug, Clone, Serialize)]
pub struct AppearanceView {
    /// Show the bookmarks bar.
    pub bookmarks_bar: bool,
    /// The folder the bookmarks bar shows.
    pub bar_folder: &'static str,
    /// The theme's name.
    pub theme: Theme,
    /// The accent colour's name.
    pub accent: Accent,
    /// "roomy" or "compact".
    pub density: Density,
}

/// The current appearance settings.
#[tauri::command]
pub fn appearance_get(app: AppHandle) -> AppearanceView {
    let a = app.state::<AppConfig>().get().appearance;
    AppearanceView {
        bookmarks_bar: a.bookmarks_bar,
        bar_folder: BAR_FOLDER,
        theme: a.theme,
        accent: a.accent,
        density: a.density,
    }
}

/// A setting's value by its name in the settings file ("graphite", "violet", "compact"); unknown names are refused.
fn named<T: serde::de::DeserializeOwned>(what: &str, name: &str) -> Result<T, String> {
    serde_json::from_value(serde_json::Value::String(name.to_string()))
        .map_err(|_| format!("unknown {what}: {name}"))
}

/// Changes the appearance settings given (the others stay) and saves them to the user settings file.
#[tauri::command]
pub fn appearance_set(
    app: AppHandle,
    bookmarks_bar: Option<bool>,
    theme: Option<String>,
    accent: Option<String>,
    density: Option<String>,
) -> Result<AppearanceView, String> {
    let mut next = app.state::<AppConfig>().get();
    let a = &mut next.appearance;
    if let Some(b) = bookmarks_bar {
        a.bookmarks_bar = b;
    }
    if let Some(t) = &theme {
        a.theme = named("theme", t)?;
    }
    if let Some(c) = &accent {
        a.accent = named("accent colour", c)?;
    }
    if let Some(d) = &density {
        a.density = named("density", d)?;
    }
    let Some(path) = app.state::<UserConfigPath>().0.clone() else {
        return Err("Ferrum does not know where its settings file is.".into());
    };
    let loaded = config::validate(next).map_err(|e| e.to_string())?;
    config::save(&path, &loaded.config).map_err(|e| e.to_string())?;
    *app.state::<AppConfig>().0.write().unwrap() = loaded;
    tracing::info!(target: "ferrum::config", ?bookmarks_bar, ?theme, ?accent, ?density, "appearance saved");
    Ok(appearance_get(app))
}
