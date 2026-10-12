//! The saved session (P3 task p3.5): the open tabs, written to `session.json` in Ferrum's data folder while Ferrum
//! runs and when it closes, and read back on the next start. Written atomically ([`crate::fsutil::write_atomic`]), so
//! a crash leaves the last complete save, never half of one. Never committed: it lists the sites the user had open.
//!
//! Known limit: each tab's back/forward history is not saved. WebView2 has no way to give a new view a history, so a
//! restored tab opens its last address with an empty history.

use std::path::Path;

use serde::{Deserialize, Serialize};

/// The session file format this Ferrum writes.
pub const VERSION: u32 = 1;

/// One saved tab.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SessionTab {
    /// The tab's address.
    pub url: String,
    /// Its title (shown in the strip until the page loads again).
    #[serde(default)]
    pub title: String,
    /// The WebView2 profile it used (informational; the profile is chosen again from the address on restore).
    #[serde(default)]
    pub profile: String,
}

/// The saved tab list.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Session {
    /// File format version.
    pub version: u32,
    /// When it was written (seconds since 1970).
    pub saved_at: u64,
    /// Position of the active tab in `tabs`.
    pub active: Option<usize>,
    /// The tabs in strip order.
    pub tabs: Vec<SessionTab>,
}

impl Session {
    /// A session of `tabs` with `active`, stamped with the current time.
    pub fn now(tabs: Vec<SessionTab>, active: Option<usize>) -> Self {
        Session {
            version: VERSION,
            saved_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            active: active.filter(|a| *a < tabs.len()),
            tabs,
        }
    }
}

/// Why a session file could not be used.
#[derive(Debug)]
pub enum SessionError {
    /// It exists but could not be read.
    Read(std::io::Error),
    /// It is not a session file this Ferrum understands.
    Invalid(String),
    /// It was written by a newer Ferrum.
    NewerVersion(u32),
}

impl std::fmt::Display for SessionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SessionError::Read(e) => write!(f, "session file not readable: {e}"),
            SessionError::Invalid(m) => write!(f, "session file not valid: {m}"),
            SessionError::NewerVersion(v) => write!(
                f,
                "session file version {v} is from a newer Ferrum (this one reads version {VERSION})"
            ),
        }
    }
}

impl std::error::Error for SessionError {}

/// Writes `session` to `path` atomically.
pub fn save(path: &Path, session: &Session) -> std::io::Result<()> {
    let text = serde_json::to_vec_pretty(session).map_err(std::io::Error::other)?;
    crate::fsutil::write_atomic(path, &text)
}

/// Reads the session at `path`: `Ok(None)` when there is none.
pub fn load(path: &Path) -> Result<Option<Session>, SessionError> {
    let text = match std::fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(SessionError::Read(e)),
    };
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| SessionError::Invalid(e.to_string()))?;
    match v.get("version").and_then(serde_json::Value::as_u64) {
        Some(n) if n > u64::from(VERSION) => {
            return Err(SessionError::NewerVersion(n.min(u64::from(u32::MAX)) as u32));
        }
        Some(_) => {}
        None => return Err(SessionError::Invalid("no version".into())),
    }
    let mut s: Session =
        serde_json::from_value(v).map_err(|e| SessionError::Invalid(e.to_string()))?;
    s.active = s.active.filter(|a| *a < s.tabs.len());
    Ok(Some(s))
}
