//! Backup and restore (P3 feature set, p3.21, adr-0032): export bookmarks and history to one passphrase-locked file
//! (`ferrum_core::backup`), and import such a file: look inside first, then merge or replace. Only the trusted shell
//! may call these commands. The passphrase is never stored or logged; Ferrum's own copies of it and of the key are
//! wiped after use (the copy in the request from the shell is not under Ferrum's control). The slow key
//! derivation runs off the main thread. Replace first writes a dated copy of `ferrum.db` beside it.

use std::path::{Path, PathBuf};

use ferrum_core::backup::{self, BackupError, EXTENSION, MAX_FILE};
use ferrum_core::store::ImportReport;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use zeroize::Zeroizing;

use crate::library::{Library, now_ms};

/// What a backup holds (the preview before an import, and the result of an export).
#[derive(Debug, Serialize)]
pub struct BackupSummary {
    /// Number of bookmarks.
    pub bookmarks: usize,
    /// Number of history entries.
    pub history: usize,
    /// When it was made (ms since 1970).
    pub created_at: u64,
    /// The file.
    pub path: String,
}

/// The result of an import.
#[derive(Debug, Serialize)]
pub struct ImportResult {
    /// What was added.
    #[serde(flatten)]
    pub report: ImportReport,
    /// The copy of the library made before a replace (empty for a merge).
    pub saved_copy: String,
}

/// `YYYY-MM-DD` (UTC) for `ms` since 1970.
fn date(ms: u64) -> String {
    // Civil date from days since 1970 (H. Hinnant's algorithm).
    let z = (ms / 86_400_000) as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Checks a backup file path typed in the shell: a full path ending in `.ferrum-backup`.
fn backup_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path.trim());
    if !p.is_absolute() {
        return Err("Give the full path of the file, for example C:\\Users\\you\\Downloads\\my.ferrum-backup.".into());
    }
    if p.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case(EXTENSION))
        != Some(true)
    {
        return Err(format!("The file name must end in .{EXTENSION}."));
    }
    Ok(p)
}

fn read_backup(p: &Path) -> Result<Vec<u8>, String> {
    let meta = std::fs::metadata(p).map_err(|e| format!("Cannot open the file: {e}"))?;
    if meta.len() > MAX_FILE {
        return Err(BackupError::TooLarge.to_string());
    }
    std::fs::read(p).map_err(|e| format!("Cannot read the file: {e}"))
}

async fn off_main<T: Send + 'static>(
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("the backup task stopped: {e}"))?
}

/// A suggested file for a new backup: the download folder, `ferrum-backup-<date>.ferrum-backup`, never an existing file.
#[tauri::command]
pub fn backup_suggest_path(app: AppHandle) -> String {
    let dir = crate::downloads::folder(&app).unwrap_or_default();
    let name = format!("ferrum-backup-{}.{EXTENSION}", date(now_ms()));
    crate::downloads::target(&dir, &name, |p| p.exists())
        .display()
        .to_string()
}

/// Writes every bookmark and the whole history to a new backup file locked with `passphrase` (at least 12
/// characters). An existing file is never replaced.
#[tauri::command]
pub async fn backup_export(
    app: AppHandle,
    path: String,
    passphrase: String,
) -> Result<BackupSummary, String> {
    let passphrase = Zeroizing::new(passphrase);
    let p = backup_path(&path)?;
    if p.exists() {
        return Err("A file with this name exists already; choose another name.".into());
    }
    if !p.parent().is_some_and(|d| d.is_dir()) {
        return Err("The folder does not exist.".into());
    }
    off_main(move || {
        let contents = app.state::<Library>().lock().export(now_ms()).map_err(|e| e.to_string())?;
        let sealed = backup::seal(&contents, &passphrase).map_err(|e| e.to_string())?;
        // Never over an existing file, even one that appeared during the slow key derivation (P3 self-scan).
        ferrum_core::fsutil::write_new(&p, &sealed).map_err(|e| match e.kind() {
            std::io::ErrorKind::AlreadyExists => "A file with this name exists already; choose another name.".to_string(),
            _ => format!("Cannot write the file: {e}"),
        })?;
        tracing::info!(target: "ferrum::backup", bookmarks = contents.bookmarks.len(), history = contents.history.len(), "backup exported");
        Ok(BackupSummary {
            bookmarks: contents.bookmarks.len(),
            history: contents.history.len(),
            created_at: contents.created_at,
            path: p.display().to_string(),
        })
    })
    .await
}

/// Opens a backup with `passphrase` and says what is inside. Nothing changes.
#[tauri::command]
pub async fn backup_preview(path: String, passphrase: String) -> Result<BackupSummary, String> {
    let passphrase = Zeroizing::new(passphrase);
    let p = backup_path(&path)?;
    off_main(move || {
        let c = backup::open(&read_backup(&p)?, &passphrase).map_err(|e| e.to_string())?;
        Ok(BackupSummary {
            bookmarks: c.bookmarks.len(),
            history: c.history.len(),
            created_at: c.created_at,
            path: p.display().to_string(),
        })
    })
    .await
}

/// Imports a backup: `replace` empties bookmarks and history first (after a dated copy of `ferrum.db`), otherwise the
/// backup is merged (entries already here are skipped). A file that fails any check changes nothing.
#[tauri::command]
pub async fn backup_import(
    app: AppHandle,
    path: String,
    passphrase: String,
    replace: bool,
) -> Result<ImportResult, String> {
    let passphrase = Zeroizing::new(passphrase);
    let p = backup_path(&path)?;
    off_main(move || {
        let c = backup::open(&read_backup(&p)?, &passphrase).map_err(|e| e.to_string())?;
        let lib = app.state::<Library>();
        let mut saved_copy = String::new();
        if replace
            && lib.on_disk
            && let Some(db) = &lib.path
        {
            let copy = db.with_file_name(format!("ferrum.db.before-import-{}", now_ms() / 1000));
            lib.lock().copy_to(&copy).map_err(|e| {
                format!("No copy of your library could be made, so nothing was replaced: {e}")
            })?;
            saved_copy = copy.display().to_string();
        }
        let report = lib.lock().import(&c, replace).map_err(|e| e.to_string())?;
        tracing::info!(target: "ferrum::backup", replace, bookmarks = report.bookmarks, history = report.history, skipped = report.skipped, "backup imported");
        Ok(ImportResult { report, saved_copy })
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates() {
        assert_eq!(date(0), "1970-01-01");
        assert_eq!(date(1_791_835_357_000), "2026-10-12");
        assert_eq!(date(951_782_400_000), "2000-02-29");
    }

    #[test]
    fn backup_paths_are_full_and_end_in_ferrum_backup() {
        assert!(backup_path("C:\\x\\a.ferrum-backup").is_ok());
        assert!(backup_path("a.ferrum-backup").is_err());
        assert!(backup_path("C:\\x\\a.txt").is_err());
        assert!(backup_path("C:\\x\\a").is_err());
    }
}
