//! The network log (P5 task p5.9; adr-0008; owner's Q-114 answer): one JSON line per response a tab received, and per
//! request Ferrum refused, in `<data dir>/<[network_log] dir>/<session>/netlog.NNNN.jsonl`. Off unless
//! `[network_log] enabled = true`; the record type, the writer, rotation and deletion of old sessions are in
//! `ferrum-network-logger`. Metadata only: the capture (webview-manager) hands on no header, cookie or body.
//!
//! Writing never blocks a page: a failed write is reported once in the app log and the record is dropped.

use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use ferrum_core::address::site;
use ferrum_core::config::NetworkLog;
use ferrum_network_logger::{NetLog, NetRecord, ResourceType, prune, rfc3339_ms, session_name};

struct Writer {
    log: NetLog,
    failed: bool,
}

static LOG: OnceLock<Mutex<Writer>> = OnceLock::new();

/// Which check refused a request: the navigation check (the gate) or the request filter (p5.15).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Refuser {
    Navigation,
    Request,
}

/// How long after the first check's record the other check's record of the same refusal may come (run clock, ms).
const TWIN_MS: u64 = 2_000;
/// The most refusals remembered for pairing.
const TWINS_KEPT: usize = 32;

/// Recent refusals, so that one refused request gives one line (owner answer Q-231): a refused page or frame is seen
/// by both the navigation check and the request filter, in either order.
struct Twins(VecDeque<(u64, String, Refuser, u64)>);

impl Twins {
    /// Whether a refusal of `uri` in tab `tab` by `by` at `t_ms` is written: not when the other check wrote the same
    /// tab and address within `TWIN_MS` (that record is then used up, so a later refusal is written again).
    fn first(&mut self, tab: u64, uri: &str, by: Refuser, t_ms: u64) -> bool {
        self.0.retain(|e| t_ms.saturating_sub(e.3) <= TWIN_MS);
        if let Some(i) = self
            .0
            .iter()
            .position(|e| e.0 == tab && e.1 == uri && e.2 != by)
        {
            self.0.remove(i);
            return false;
        }
        if self.0.len() == TWINS_KEPT {
            self.0.pop_front();
        }
        self.0.push_back((tab, uri.to_string(), by, t_ms));
        true
    }
}

static TWINS: Mutex<Twins> = Mutex::new(Twins(VecDeque::new()));

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Starts the log in `data_dir` when the settings switch it on, after deleting this log's session folders older than
/// the retention time. Returns the session folder, or `None` when the log is off. Later calls keep the first log.
pub fn init(data_dir: &Path, settings: &NetworkLog) -> Result<Option<PathBuf>, String> {
    if !settings.enabled {
        return Ok(None);
    }
    if let Some(w) = LOG.get() {
        return Ok(Some(w.lock().unwrap().log.folder().to_path_buf()));
    }
    let root = data_dir.join(&settings.dir);
    let session = session_name(now_ms(), std::process::id());
    match prune(&root, now_ms(), settings.retention_days, &session) {
        Ok(gone) if !gone.is_empty() => {
            tracing::info!(target: "ferrum::netlog", folders = gone.len(), days = settings.retention_days, "old network log sessions deleted")
        }
        Ok(_) => {}
        Err(e) => {
            tracing::warn!(target: "ferrum::netlog", error = %e, "old network logs not checked")
        }
    }
    let log = NetLog::open(
        &root,
        &session,
        u64::from(settings.rotate_mb) * 1024 * 1024,
        settings.max_files,
    )
    .map_err(|e| format!("network log folder {}: {e}", root.display()))?;
    let folder = log.folder().to_path_buf();
    let _ = LOG.set(Mutex::new(Writer { log, failed: false }));
    tracing::info!(target: "ferrum::netlog", "network log on");
    Ok(Some(folder))
}

/// Whether the log is on (new tab views then report their responses).
pub fn enabled() -> bool {
    LOG.get().is_some()
}

/// The running session's folder, when the log is on.
pub fn folder() -> Option<PathBuf> {
    LOG.get()
        .map(|w| w.lock().unwrap().log.folder().to_path_buf())
}

fn write(r: NetRecord) {
    let Some(w) = LOG.get() else { return };
    let mut w = w.lock().unwrap();
    if let Err(e) = w.log.write(&r)
        && !w.failed
    {
        w.failed = true;
        tracing::error!(target: "ferrum::netlog", error = %e, "network log not written");
    }
}

/// One response of tab `tab` (profile `profile`), at `t_ms` on the run clock.
#[allow(clippy::too_many_arguments)]
pub fn response(
    tab: u64,
    profile: &str,
    t_ms: u64,
    uri: &str,
    method: &str,
    status: i32,
    fetch_dest: Option<&str>,
    content_length: Option<u64>,
) {
    if !enabled() {
        return;
    }
    write(NetRecord {
        ts: rfc3339_ms(now_ms()),
        t_ms,
        tab,
        profile: profile.to_string(),
        site: site(uri),
        url: uri.to_string(),
        method: method.to_string(),
        status: u16::try_from(status).ok(),
        resource_type: fetch_dest.map(ResourceType::from_fetch_dest),
        content_length,
        policy_decision: "allowed".into(),
    });
}

/// A request Ferrum refused (nothing was sent), with the rule that refused it (as in the audit log) and the check that
/// refused it. The other check's record of the same refusal is not written again.
pub fn blocked(tab: u64, profile: &str, t_ms: u64, uri: &str, rule: &str, by: Refuser) {
    if !enabled() || uri.is_empty() || !TWINS.lock().unwrap().first(tab, uri, by, t_ms) {
        return;
    }
    write(NetRecord {
        ts: rfc3339_ms(now_ms()),
        t_ms,
        tab,
        profile: profile.to_string(),
        site: site(uri),
        url: uri.to_string(),
        method: String::new(),
        status: None,
        resource_type: None,
        content_length: None,
        policy_decision: format!("blocked:{rule}"),
    });
}

#[cfg(test)]
mod tests {
    use super::{Refuser, TWINS_KEPT, Twins};
    use std::collections::VecDeque;

    #[test]
    fn one_line_per_refused_request() {
        let mut t = Twins(VecDeque::new());
        let a = "https://blocked.example/";
        // the navigation check and the request filter see the same page, in either order: one line
        assert!(t.first(1, a, Refuser::Navigation, 100));
        assert!(!t.first(1, a, Refuser::Request, 150));
        assert!(t.first(1, a, Refuser::Request, 200));
        assert!(!t.first(1, a, Refuser::Navigation, 250));
        // the same check twice (an image asked for twice): two lines
        assert!(t.first(1, a, Refuser::Request, 300));
        assert!(t.first(1, a, Refuser::Request, 310));
        // another tab, or too late: its own line
        assert!(t.first(2, a, Refuser::Navigation, 320));
        assert!(t.first(3, a, Refuser::Navigation, 400));
        assert!(t.first(3, a, Refuser::Request, 400 + 2_001));
        // the memory stays bounded
        for i in 0..100 {
            t.first(
                9,
                &format!("https://x{i}.example/"),
                Refuser::Request,
                5_000,
            );
        }
        assert!(t.0.len() <= TWINS_KEPT);
    }
}
