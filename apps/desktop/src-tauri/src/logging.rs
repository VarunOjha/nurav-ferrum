//! Structured logs (task p2.14): one JSON object per line in `ferrum.jsonl`, in the app's log folder (or
//! `<data_dir>/logs` when settings `[storage] data_dir` is set). Addresses are logged as scheme and host only
//! (`ferrum_core::address::site`): the log is not a browsing history. A panic is written to the log as an
//! `error` event with `panic = true` before the default handler runs.

use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Starts logging to `<dir>/ferrum.jsonl` (appending) and installs the panic hook. Returns the file's path.
pub fn init(dir: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dir).map_err(|e| format!("log folder {}: {e}", dir.display()))?;
    let path = dir.join("ferrum.jsonl");
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("log file {}: {e}", path.display()))?;
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_writer(Mutex::new(file))
        .with_target(true)
        .with_current_span(false)
        .with_span_list(false)
        .with_max_level(tracing::Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).map_err(|e| e.to_string())?;
    install_panic_hook();
    Ok(path)
}

fn install_panic_hook() {
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let message = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "(no message)".to_string());
        let location = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_default();
        tracing::error!(target: "ferrum::panic", panic = true, %location, panic_message = %message, "panic");
        default(info);
    }));
}
