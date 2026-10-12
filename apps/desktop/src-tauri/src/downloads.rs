//! Basic downloads (P3 task p3.8): WebView2 reports each download before it starts (`webview2::Handlers::downloads`);
//! Ferrum saves it in the download folder (`[downloads] folder`, else the Windows Downloads folder) under the name
//! WebView2 suggests (never a path from the site: only the file name is used, and an existing file is never replaced:
//! `name (1).ext`, `name (2).ext`, ...). Progress, completion and failure go to the shell (event `download`). Risky
//! file types and "ask where to save" are P4 work (adr-0015).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use ferrum_core::address::site;
use ferrum_webview_manager::tab::TabEvent;
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager};

use crate::content::AppConfig;

/// File paths already given to a download in this run (two downloads at once never get the same file, even before
/// either file exists on disk).
#[derive(Default)]
pub struct Reserved(pub Mutex<std::collections::HashSet<PathBuf>>);

/// The download currently running for each address. WebView2 starts a new download for each retry of a download
/// that broke off (observed in p3.8: six attempts, only the last one reported its end), so a new download of an
/// address that is still running replaces the older one in the shell's list.
#[derive(Default)]
pub struct Running(pub Mutex<HashMap<String, u64>>);

/// When each download last reported progress to the shell (progress is sent at most every 200 ms).
#[derive(Default)]
pub struct ProgressTimes(pub Mutex<HashMap<u64, Instant>>);

/// The folder downloads go to.
pub fn folder(app: &AppHandle) -> Option<PathBuf> {
    app.state::<AppConfig>()
        .0
        .config
        .downloads
        .folder
        .clone()
        .or_else(|| app.path().download_dir().ok())
}

/// `dir` joined with the file name of `suggested` (only the name: a site cannot choose the folder), made unique so an
/// existing file (or one `taken` says is in use) is never replaced.
pub fn target(dir: &Path, suggested: &str, taken: impl Fn(&Path) -> bool) -> PathBuf {
    let name = Path::new(suggested)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|n| !n.is_empty() && n != "." && n != "..")
        .unwrap_or_else(|| "download".to_string());
    let first = dir.join(&name);
    if !first.exists() && !taken(&first) {
        return first;
    }
    let (stem, ext) = match name.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (name.clone(), String::new()),
    };
    (1..10_000)
        .map(|i| dir.join(format!("{stem} ({i}){ext}")))
        .find(|p| !p.exists() && !taken(p))
        .unwrap_or(first)
}

/// The download chooser of a tab view (UI thread): the file to save to, or `None` (refused) when no folder exists.
pub fn chooser(app: &AppHandle) -> ferrum_webview_manager::webview2::DownloadFilter {
    let h = app.clone();
    std::rc::Rc::new(move |uri: &str, suggested: &str| {
        let Some(dir) = folder(&h) else {
            tracing::warn!(target: "ferrum::downloads", site = %site(uri), "download refused: no download folder");
            return None;
        };
        if let Err(e) = std::fs::create_dir_all(&dir) {
            tracing::warn!(target: "ferrum::downloads", error = %e, "download refused: folder not usable");
            return None;
        }
        let reserved = h.state::<Reserved>();
        let mut reserved = reserved.0.lock().unwrap();
        let path = target(&dir, suggested, |p| reserved.contains(p));
        reserved.insert(path.clone());
        Some(path.to_string_lossy().into_owned())
    })
}

/// Turns a tab view's download event into the shell's `download` message (`None` for other events and for progress
/// that comes too soon after the last).
pub fn shell_message(app: &AppHandle, tab: u64, e: &TabEvent) -> Option<Value> {
    let file = |p: &str| {
        Path::new(p)
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default()
    };
    match e {
        TabEvent::DownloadStarted {
            download,
            uri,
            path,
            total,
        } => {
            tracing::info!(target: "ferrum::downloads", tab, download, site = %site(uri), total, "download started");
            let replaces = app
                .state::<Running>()
                .0
                .lock()
                .unwrap()
                .insert(uri.clone(), *download);
            Some(
                json!({"kind": "started", "download": download, "tab": tab, "file": file(path), "path": path,
                        "total": total, "received": 0, "replaces": replaces}),
            )
        }
        TabEvent::DownloadProgress {
            download,
            received,
            total,
        } => {
            let now = Instant::now();
            let times = app.state::<ProgressTimes>();
            let mut times = times.0.lock().unwrap();
            let due = times
                .get(download)
                .is_none_or(|t| now.duration_since(*t) >= Duration::from_millis(200));
            if !due && received != total {
                return None;
            }
            times.insert(*download, now);
            Some(
                json!({"kind": "progress", "download": download, "received": received, "total": total}),
            )
        }
        TabEvent::DownloadFinished {
            download,
            completed,
            interrupt_reason,
            path,
            received,
        } => {
            app.state::<ProgressTimes>()
                .0
                .lock()
                .unwrap()
                .remove(download);
            app.state::<Running>()
                .0
                .lock()
                .unwrap()
                .retain(|_, d| d != download);
            if *completed {
                tracing::info!(target: "ferrum::downloads", download, received, "download completed");
            } else {
                tracing::warn!(target: "ferrum::downloads", download, received, interrupt_reason, "download failed");
            }
            Some(
                json!({"kind": if *completed { "completed" } else { "failed" }, "download": download,
                        "file": file(path), "path": path, "received": received, "reason": interrupt_reason}),
            )
        }
        _ => None,
    }
}

/// Sends a download message to the shell.
pub fn emit(app: &AppHandle, msg: Value) {
    let _ = app.emit_to("shell", "download", msg);
}
