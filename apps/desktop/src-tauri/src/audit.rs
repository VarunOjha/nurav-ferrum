//! The security audit log (P4 task p4.9; master prompt §4; test SEC-14 in `wiki/quality/qual-security-testing-plan.md`).
//!
//! Every action Ferrum refuses becomes one JSON line in `audit.jsonl`, in the same folder as `ferrum.jsonl`:
//!
//! ```json
//! {"time":"2026-10-13T20:30:01.123Z","tab":3,"origin":"https://ads.example","action":"page","rule":"blocklist","decision":"deny"}
//! ```
//!
//! Exactly these six fields, nothing else: `origin` is the scheme and host (and port) only, never the path, query or
//! fragment, and never any page content, typed text, cookie or form data. `tab` is 0 when no tab is involved. When the
//! file would grow past [`MAX_BYTES`] it is renamed to `audit.1.jsonl` (older ones to `.2`, `.3`; the oldest is
//! deleted), so the log stays small. Writing never blocks a decision: a failed write is reported once in the app log.

use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use ferrum_core::address::site;
use serde_json::json;

/// Largest size of `audit.jsonl` before it is rotated.
pub const MAX_BYTES: u64 = 1024 * 1024;
/// Rotated files kept (`audit.1.jsonl` … `audit.3.jsonl`).
pub const KEEP: u32 = 3;
/// The file name.
pub const FILE: &str = "audit.jsonl";

struct Writer {
    dir: PathBuf,
    max: u64,
    file: Option<File>,
    failed: bool,
}

static AUDIT: OnceLock<Mutex<Writer>> = OnceLock::new();

/// Starts the audit log in `dir` (created if needed). Returns the file's path. Later calls keep the first folder.
pub fn init(dir: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dir).map_err(|e| format!("audit folder {}: {e}", dir.display()))?;
    let w = AUDIT.get_or_init(|| {
        Mutex::new(Writer {
            dir: dir.to_path_buf(),
            max: MAX_BYTES,
            file: None,
            failed: false,
        })
    });
    Ok(w.lock().unwrap().dir.join(FILE))
}

/// One refused action. Does nothing before [`init`] (unit tests of other modules).
pub fn record(tab: u64, action: &str, uri: &str, rule: &str) {
    let Some(w) = AUDIT.get() else { return };
    let line = line(now_ms(), tab, &origin(uri), action, rule);
    let mut w = w.lock().unwrap();
    if let Err(e) = w.append(&line)
        && !w.failed
    {
        w.failed = true;
        tracing::error!(target: "ferrum::audit", error = %e, "audit log not written");
    }
}

/// The origin as the audit log keeps it: scheme and host (and port) only; `(typed)` for text from the address bar.
pub fn origin(uri: &str) -> String {
    if uri.is_empty() {
        return "(typed)".to_string();
    }
    site(uri)
}

/// One audit line (without the final newline).
pub fn line(time_ms: u128, tab: u64, origin: &str, action: &str, rule: &str) -> String {
    json!({
        "time": rfc3339_ms(time_ms),
        "tab": tab,
        "origin": origin,
        "action": action,
        "rule": rule,
        "decision": "deny",
    })
    .to_string()
}

impl Writer {
    fn append(&mut self, line: &str) -> std::io::Result<()> {
        let path = self.dir.join(FILE);
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        if size > 0 && size + line.len() as u64 + 1 > self.max {
            self.file = None;
            rotate(&self.dir)?;
        }
        if self.file.is_none() {
            self.file = Some(OpenOptions::new().create(true).append(true).open(&path)?);
        }
        let f = self.file.as_mut().expect("opened above");
        writeln!(f, "{line}")?;
        f.flush()
    }
}

/// `audit.jsonl` becomes `audit.1.jsonl`; `.1` becomes `.2`, and so on; the oldest beyond [`KEEP`] is deleted.
fn rotate(dir: &Path) -> std::io::Result<()> {
    let name = |i: u32| dir.join(format!("audit.{i}.jsonl"));
    let _ = std::fs::remove_file(name(KEEP));
    for i in (1..KEEP).rev() {
        if name(i).exists() {
            std::fs::rename(name(i), name(i + 1))?;
        }
    }
    std::fs::rename(dir.join(FILE), name(1))
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// `YYYY-MM-DDTHH:MM:SS.mmmZ` (UTC) for milliseconds since 1970.
pub fn rfc3339_ms(ms: u128) -> String {
    let secs = (ms / 1000) as i64;
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!(
        "{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}.{:03}Z",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60,
        ms % 1000
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_line_has_exactly_the_six_fields_and_no_path_or_query() {
        let l = line(
            1_760_387_401_123,
            3,
            &origin("https://ads.example:8443/secret/path?token=SECRET#frag"),
            "page",
            "blocklist",
        );
        let v: serde_json::Value = serde_json::from_str(&l).unwrap();
        let keys: Vec<_> = v.as_object().unwrap().keys().cloned().collect();
        assert_eq!(
            keys,
            ["action", "decision", "origin", "rule", "tab", "time"]
        );
        assert_eq!(v["origin"], "https://ads.example:8443");
        assert_eq!(v["decision"], "deny");
        assert!(!l.contains("secret") && !l.contains("SECRET") && !l.contains("frag"));
        assert_eq!(origin(""), "(typed)");
        assert_eq!(origin("ms-msdt:/id x"), "ms-msdt:");
    }

    #[test]
    fn times_are_utc_rfc3339() {
        assert_eq!(rfc3339_ms(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(rfc3339_ms(951_782_400_000), "2000-02-29T00:00:00.000Z");
        assert_eq!(rfc3339_ms(1_760_387_401_123), "2025-10-13T20:30:01.123Z");
        assert_eq!(rfc3339_ms(4_102_444_799_999), "2099-12-31T23:59:59.999Z");
    }

    #[test]
    fn the_file_rotates_and_keeps_three_old_files() {
        let dir = std::env::temp_dir().join(format!("ferrum-audit-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut w = Writer {
            dir: dir.clone(),
            max: 300,
            file: None,
            failed: false,
        };
        let l = line(0, 1, "https://a.example", "page", "blocklist");
        for _ in 0..40 {
            w.append(&l).unwrap();
        }
        let size = std::fs::metadata(dir.join(FILE)).unwrap().len();
        assert!(size <= 300, "{size}");
        for i in 1..=KEEP {
            assert!(dir.join(format!("audit.{i}.jsonl")).exists(), "{i}");
        }
        assert!(!dir.join(format!("audit.{}.jsonl", KEEP + 1)).exists());
        let text = std::fs::read_to_string(dir.join(FILE)).unwrap();
        assert!(text.lines().all(|x| x == l));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
