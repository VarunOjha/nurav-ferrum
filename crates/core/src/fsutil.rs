//! Small file helpers shared by the settings file (p3.4) and the session file (p3.5).

use std::io::Write;
use std::path::{Path, PathBuf};

/// Writes `bytes` to `path` atomically: a temporary file next to it (flushed to disk) replaces `path` in one rename.
/// Readers see the old file or the new one, never half of one. Missing parent folders are created.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(dir) = path.parent().filter(|d| !d.as_os_str().is_empty()) {
        std::fs::create_dir_all(dir)?;
    }
    let tmp = sibling(path, &format!("tmp-{}", std::process::id()));
    {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&tmp, path).inspect_err(|_| {
        let _ = std::fs::remove_file(&tmp);
    })
}

/// Copies a file Ferrum could not read aside as `<name>.broken-<seconds since 1970>` and returns the copy's path.
pub fn backup_broken(path: &Path) -> std::io::Result<PathBuf> {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup = sibling(path, &format!("broken-{secs}"));
    std::fs::copy(path, &backup)?;
    Ok(backup)
}

/// `<path's file name>.<suffix>` in the same folder.
fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "file".into());
    path.with_file_name(format!("{name}.{suffix}"))
}
