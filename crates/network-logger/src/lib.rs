//! Local log of the network requests each tab makes (p5.9; adr-0008, owner's Q5 and Q-114 answers).
//!
//! Design: the component page `wiki/architecture/components/comp-network-logger.md`. This crate is the safe sink: the
//! record type ([`NetRecord`]), its checks ([`validate`]), and the writer ([`NetLog`]) that appends one JSON line per
//! record to `<root>/<session>/netlog.NNNN.jsonl`, one folder per app session, rotating by size. [`prune`] deletes
//! Ferrum's own session folders older than the retention time (14 days by default, Q-114). The capture itself lives in
//! `ferrum-webview-manager` (`WebResourceResponseReceived`), which hands over only the fields below.
//!
//! **Metadata only.** A record has exactly the fields of [`NetRecord`]: no header, cookie, request or response body
//! field exists, and unknown fields are refused when a file is read back. The full address is kept (Q-114); the log
//! is off unless switched on.
#![forbid(unsafe_code)]

use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// The record format's version (written in no field; files are read with this crate's types).
pub const SCHEMA_VERSION: u32 = 1;

/// What kind of resource a response was for, from the request's `Sec-Fetch-Dest` (the header itself is not kept).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    /// A page (`document`).
    Document,
    /// A frame's page (`iframe`, `frame`).
    Frame,
    /// A stylesheet (`style`).
    Stylesheet,
    /// A script (`script`).
    Script,
    /// An image (`image`).
    Image,
    /// A font (`font`).
    Font,
    /// Audio, video or a text track.
    Media,
    /// A request made by script (`empty`: fetch, XMLHttpRequest, beacon).
    Fetch,
    /// A worker's script.
    Worker,
    /// A web app manifest.
    Manifest,
    /// Any other destination.
    Other,
}

impl ResourceType {
    /// The type for a `Sec-Fetch-Dest` value.
    pub fn from_fetch_dest(dest: &str) -> ResourceType {
        match dest.to_ascii_lowercase().as_str() {
            "document" => ResourceType::Document,
            "iframe" | "frame" | "fencedframe" => ResourceType::Frame,
            "style" | "xslt" => ResourceType::Stylesheet,
            "script" => ResourceType::Script,
            "image" => ResourceType::Image,
            "font" => ResourceType::Font,
            "audio" | "video" | "track" => ResourceType::Media,
            "empty" => ResourceType::Fetch,
            "worker" | "sharedworker" | "serviceworker" => ResourceType::Worker,
            "manifest" => ResourceType::Manifest,
            _ => ResourceType::Other,
        }
    }
}

/// One network log line. Exactly these fields; absent values are written as `null`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NetRecord {
    /// Wall-clock time, `YYYY-MM-DDTHH:MM:SS.mmmZ` (UTC).
    pub ts: String,
    /// Milliseconds since Ferrum's process was created (the run clock of the telemetry export).
    pub t_ms: u64,
    /// The tab (0 when no tab is involved).
    pub tab: u64,
    /// The tab's browser profile (`shared`, a site's profile, or the private one).
    pub profile: String,
    /// Scheme and host (and port) of the address.
    pub site: String,
    /// The full address (Q-114).
    pub url: String,
    /// The request method (`GET`, `POST`, ...); empty for a refused navigation, which sent no request.
    pub method: String,
    /// The HTTP status; `null` when there was no response (a refused navigation).
    pub status: Option<u16>,
    /// What the response was for, when the request said so.
    pub resource_type: Option<ResourceType>,
    /// The response's declared size in bytes (`Content-Length`), when given.
    pub content_length: Option<u64>,
    /// `allowed`, or `blocked:<rule>` for a navigation Ferrum refused.
    pub policy_decision: String,
}

/// The field names of a record, in order (a test checks this list against the type).
pub const FIELDS: [&str; 11] = [
    "ts",
    "t_ms",
    "tab",
    "profile",
    "site",
    "url",
    "method",
    "status",
    "resource_type",
    "content_length",
    "policy_decision",
];

/// Checks one record's values.
pub fn validate(r: &NetRecord) -> Result<(), String> {
    if !is_rfc3339_ms(&r.ts) {
        return Err(format!("ts {:?} is not YYYY-MM-DDTHH:MM:SS.mmmZ", r.ts));
    }
    if r.url.is_empty() {
        return Err("url is empty".into());
    }
    let blocked = match r.policy_decision.strip_prefix("blocked:") {
        Some(rule)
            if !rule.is_empty()
                && rule.bytes().all(|b| {
                    b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_'
                }) =>
        {
            true
        }
        Some(_) => {
            return Err(format!(
                "policy_decision {:?} has no rule",
                r.policy_decision
            ));
        }
        None if r.policy_decision == "allowed" => false,
        None => {
            return Err(format!(
                "policy_decision {:?} is not allowed or blocked:<rule>",
                r.policy_decision
            ));
        }
    };
    match (blocked, r.status) {
        (true, Some(_)) => Err("a blocked navigation has no response status".into()),
        (false, None) => Err("an allowed record has a response status".into()),
        (false, Some(s)) if !(100..=599).contains(&s) => {
            Err(format!("status {s} is not an HTTP status"))
        }
        _ => Ok(()),
    }
}

fn is_rfc3339_ms(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 24
        && b.iter().enumerate().all(|(i, c)| match i {
            4 | 7 => *c == b'-',
            10 => *c == b'T',
            13 | 16 => *c == b':',
            19 => *c == b'.',
            23 => *c == b'Z',
            _ => c.is_ascii_digit(),
        })
}

/// Parses one line strictly (unknown fields and wrong types are refused) and checks it.
pub fn parse_line(line: &str) -> Result<NetRecord, String> {
    let r: NetRecord = serde_json::from_str(line).map_err(|e| e.to_string())?;
    validate(&r)?;
    Ok(r)
}

/// `YYYY-MM-DDTHH:MM:SS.mmmZ` (UTC) for milliseconds since 1970.
pub fn rfc3339_ms(ms: u64) -> String {
    let (y, m, d, rem) = civil(ms);
    format!(
        "{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}.{:03}Z",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60,
        ms % 1000
    )
}

/// The session folder name for an app start: `YYYYMMDD-HHMMSS-<pid>` (UTC), so names sort by time and two
/// instances started in the same second do not share a folder.
pub fn session_name(start_unix_ms: u64, pid: u32) -> String {
    let (y, m, d, rem) = civil(start_unix_ms);
    format!(
        "{y:04}{m:02}{d:02}-{:02}{:02}{:02}-{pid}",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60
    )
}

/// The start time (milliseconds since 1970, whole seconds) of a session folder name; `None` for any other name.
pub fn session_start_ms(name: &str) -> Option<u64> {
    let (date, rest) = name.split_once('-')?;
    let (time, pid) = rest.split_once('-')?;
    if date.len() != 8
        || time.len() != 6
        || pid.is_empty()
        || !pid.bytes().all(|b| b.is_ascii_digit())
    {
        return None;
    }
    if !date.bytes().chain(time.bytes()).all(|b| b.is_ascii_digit()) {
        return None;
    }
    let n = |s: &str| s.parse::<i64>().ok();
    let (y, m, d) = (n(&date[..4])?, n(&date[4..6])?, n(&date[6..])?);
    let (hh, mm, ss) = (n(&time[..2])?, n(&time[2..4])?, n(&time[4..])?);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) || hh > 23 || mm > 59 || ss > 59 {
        return None;
    }
    // Days since 1970 from a civil date (Howard Hinnant's algorithm).
    let yy = if m <= 2 { y - 1 } else { y };
    let era = yy.div_euclid(400);
    let yoe = yy - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146_097 + doe - 719_468;
    u64::try_from((days * 86_400 + hh * 3600 + mm * 60 + ss) * 1000).ok()
}

/// Civil date and seconds of the day for milliseconds since 1970 (Howard Hinnant's algorithm).
fn civil(ms: u64) -> (i64, i64, i64, i64) {
    let secs = (ms / 1000) as i64;
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m, d, rem)
}

/// The file name of a session's file number `n`.
pub fn file_name(n: u32) -> String {
    format!("netlog.{n:04}.jsonl")
}

fn file_number(name: &str) -> Option<u32> {
    let n = name.strip_prefix("netlog.")?.strip_suffix(".jsonl")?;
    (n.len() == 4 && n.bytes().all(|b| b.is_ascii_digit()))
        .then(|| n.parse().ok())
        .flatten()
}

/// The writer of one app session's log.
#[derive(Debug)]
pub struct NetLog {
    dir: PathBuf,
    rotate_bytes: u64,
    max_files: u32,
    seq: u32,
    size: u64,
    file: File,
}

impl NetLog {
    /// Creates `<root>/<session>/` and its first file. `rotate_bytes` is the size at which a new file starts;
    /// `max_files` how many files the session keeps (the oldest of the session is deleted beyond that).
    pub fn open(
        root: &Path,
        session: &str,
        rotate_bytes: u64,
        max_files: u32,
    ) -> std::io::Result<NetLog> {
        if session_start_ms(session).is_none() {
            return Err(std::io::Error::other(format!(
                "{session:?} is not a session folder name"
            )));
        }
        let dir = root.join(session);
        std::fs::create_dir_all(&dir)?;
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(dir.join(file_name(0)))?;
        let size = file.metadata()?.len();
        Ok(NetLog {
            dir,
            rotate_bytes: rotate_bytes.max(1),
            max_files: max_files.max(1),
            seq: 0,
            size,
            file,
        })
    }

    /// The session's folder.
    pub fn folder(&self) -> &Path {
        &self.dir
    }

    /// Appends one record (checked first). Starts a new file when this one would pass the rotation size.
    pub fn write(&mut self, r: &NetRecord) -> Result<(), String> {
        validate(r)?;
        let line = serde_json::to_string(r).map_err(|e| e.to_string())?;
        let len = line.len() as u64 + 1;
        if self.size > 0 && self.size + len > self.rotate_bytes {
            self.rotate().map_err(|e| e.to_string())?;
        }
        writeln!(self.file, "{line}").map_err(|e| e.to_string())?;
        self.file.flush().map_err(|e| e.to_string())?;
        self.size += len;
        Ok(())
    }

    /// Starts the next file; deletes the session's oldest file beyond `max_files`.
    pub fn rotate(&mut self) -> std::io::Result<()> {
        self.file.sync_all()?;
        self.seq += 1;
        self.file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.dir.join(file_name(self.seq)))?;
        self.size = 0;
        if self.seq >= self.max_files {
            let _ = std::fs::remove_file(self.dir.join(file_name(self.seq - self.max_files)));
        }
        Ok(())
    }
}

/// Deletes the session folders under `root` that started more than `retention_days` before `now_unix_ms`, except
/// `keep` (the running session). Only folders named like a session are touched, and in them only `netlog.NNNN.jsonl`
/// files; a folder is removed only once it is empty, so nothing Ferrum did not write is ever deleted. Returns the
/// folders removed. `retention_days` 0 means never delete.
pub fn prune(
    root: &Path,
    now_unix_ms: u64,
    retention_days: u32,
    keep: &str,
) -> std::io::Result<Vec<PathBuf>> {
    let mut removed = vec![];
    if retention_days == 0 || !root.is_dir() {
        return Ok(removed);
    }
    let limit = u64::from(retention_days) * 86_400_000;
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some(start) = session_start_ms(&name) else {
            continue;
        };
        if name == keep
            || !entry.file_type()?.is_dir()
            || now_unix_ms.saturating_sub(start) <= limit
        {
            continue;
        }
        for f in std::fs::read_dir(entry.path())? {
            let f = f?;
            if f.file_type()?.is_file() && file_number(&f.file_name().to_string_lossy()).is_some() {
                std::fs::remove_file(f.path())?;
            }
        }
        if std::fs::remove_dir(entry.path()).is_ok() {
            removed.push(entry.path());
        }
    }
    removed.sort();
    Ok(removed)
}

#[cfg(test)]
mod tests;
