//! Small file helpers shared by the settings file (p3.4) and the session file (p3.5).

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

/// Makes each temporary file name unique within the process, so two saves at the same moment (the session saver and
/// the save on exit) never share one temporary file (P3 self-scan, 2026-10-13).
static NEXT_TMP: AtomicU64 = AtomicU64::new(0);

/// Writes `bytes` to `path` atomically: a temporary file next to it (flushed to disk) replaces `path` in one rename.
/// Readers see the old file or the new one, never half of one. Missing parent folders are created.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(dir) = path.parent().filter(|d| !d.as_os_str().is_empty()) {
        std::fs::create_dir_all(dir)?;
    }
    let n = NEXT_TMP.fetch_add(1, Ordering::Relaxed);
    let tmp = sibling(path, &format!("tmp-{}-{n}", std::process::id()));
    {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&tmp, path).inspect_err(|_| {
        let _ = std::fs::remove_file(&tmp);
    })
}

/// Writes `bytes` to a new file at `path`; fails with `AlreadyExists` instead of replacing a file that is there. A
/// file left half-written by an error is removed.
pub fn write_new(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut f = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    let written = f.write_all(bytes).and_then(|()| f.sync_all());
    drop(f); // closed first: Windows cannot remove a file that is still open
    if written.is_err() {
        let _ = std::fs::remove_file(path);
    }
    written
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

#[cfg(test)]
mod tests {
    use super::*;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("ferrum-fsutil-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn write_new_never_replaces_a_file() {
        let p = dir("new").join("a.bin");
        write_new(&p, b"first").unwrap();
        let e = write_new(&p, b"second").unwrap_err();
        assert_eq!(e.kind(), std::io::ErrorKind::AlreadyExists);
        assert_eq!(std::fs::read(&p).unwrap(), b"first");
    }

    #[test]
    fn saves_at_the_same_moment_each_leave_a_whole_file() {
        let p = dir("race").join("session.json");
        let handles: Vec<_> = (0..8)
            .map(|i| {
                let p = p.clone();
                std::thread::spawn(move || {
                    for _ in 0..50 {
                        write_atomic(&p, format!("writer {i} whole").as_bytes()).unwrap();
                    }
                })
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }
        let text = std::fs::read_to_string(&p).unwrap();
        assert!(
            text.starts_with("writer ") && text.ends_with(" whole"),
            "{text:?}"
        );
    }
}
