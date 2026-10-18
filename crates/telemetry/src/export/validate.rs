//! The checker for export files (p5.1): it accepts what the writer produces and refuses anything damaged, so a
//! truncated, edited or mislabelled file never reaches the analysis.

use std::fmt;
use std::io::BufRead;
use std::path::Path;

use super::records::{GapReason, NavTiming, Record, RunMeta, SCHEMA_VERSION};

/// Why a file or record was refused. `line` is 1-based; 0 means the file as a whole.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationError {
    /// The line the problem is on (0 = the whole file).
    pub line: usize,
    /// What is wrong, in words.
    pub reason: String,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.line == 0 {
            write!(f, "{}", self.reason)
        } else {
            write!(f, "line {}: {}", self.line, self.reason)
        }
    }
}

impl std::error::Error for ValidationError {}

fn err(line: usize, reason: impl Into<String>) -> ValidationError {
    ValidationError {
        line,
        reason: reason.into(),
    }
}

/// What a valid file holds.
#[derive(Debug, Clone, PartialEq)]
pub struct FileSummary {
    /// The run line.
    pub run: RunMeta,
    /// The records after the run line, in file order.
    pub records: Vec<Record>,
}

fn is_hex(s: &str) -> bool {
    s.bytes()
        .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// True for a run id the writer accepts: 1 to 64 letters, digits, `-` or `_`.
pub fn is_valid_run_id(id: &str) -> bool {
    (1..=64).contains(&id.len())
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Checks the run line's values (the shape is checked by parsing).
pub fn validate_run(run: &RunMeta) -> Result<(), String> {
    if run.schema_version != SCHEMA_VERSION {
        return Err(format!(
            "schema_version {} is not {SCHEMA_VERSION}",
            run.schema_version
        ));
    }
    if !is_valid_run_id(&run.run_id) {
        return Err(format!(
            "run_id {:?} is not 1 to 64 letters, digits, - or _",
            run.run_id
        ));
    }
    if !(7..=40).contains(&run.git_sha.len()) || !is_hex(&run.git_sha) {
        return Err(format!(
            "git_sha {:?} is not 7 to 40 lower-case hex characters",
            run.git_sha
        ));
    }
    let hex = run.config_sha256.strip_prefix("sha256:").unwrap_or("");
    if hex.len() != 64 || !is_hex(hex) {
        return Err(format!(
            "config_sha256 {:?} is not sha256: and 64 lower-case hex characters",
            run.config_sha256
        ));
    }
    for (name, value) in [
        ("ferrum_version", &run.ferrum_version),
        ("os_build", &run.os_build),
        ("webview2_runtime", &run.webview2_runtime),
        ("machine_id", &run.machine_id),
    ] {
        if value.trim().is_empty() {
            return Err(format!("{name} is empty"));
        }
    }
    if run.sample_interval_ms == Some(0) {
        return Err("sample_interval_ms is 0".into());
    }
    Ok(())
}

fn validate_nav(n: &NavTiming) -> Result<(), String> {
    if !n.start_ms.is_finite() || n.start_ms < 0.0 {
        return Err(format!("start_ms {} is not a finite time >= 0", n.start_ms));
    }
    for (name, v) in [
        ("response_ms", n.response_ms),
        ("dom_content_loaded_ms", n.dom_content_loaded_ms),
        ("load_ms", n.load_ms),
        ("complete_ms", n.complete_ms),
    ] {
        if let Some(v) = v
            && (!v.is_finite() || v < 0.0)
        {
            return Err(format!("{name} {v} is not a finite offset >= 0"));
        }
    }
    Ok(())
}

/// Checks one record's values. The run line has its own rules ([`validate_run`]).
pub fn validate_record(record: &Record) -> Result<(), String> {
    match record {
        Record::Run(run) => validate_run(run),
        Record::ProcessSample(s) => {
            if s.pid == 0 {
                Err("pid 0 is not a process".into())
            } else {
                Ok(())
            }
        }
        Record::TreeSample(s) => {
            if s.process_count == 0 {
                Err("process_count is 0".into())
            } else {
                Ok(())
            }
        }
        Record::SampleGap(g) => match (g.reason, g.missing) {
            (GapReason::SetRefused, None) => Ok(()),
            (GapReason::SetRefused, Some(_)) => Err("missing must be null for set_refused".into()),
            (GapReason::CountersUnreadable, Some(n)) if n > 0 => Ok(()),
            (GapReason::CountersUnreadable, _) => {
                Err("missing must be at least 1 for counters_unreadable".into())
            }
        },
        Record::StartupMark(_) => Ok(()),
        Record::NavTiming(n) => validate_nav(n),
    }
}

/// Parses one line strictly: unknown fields, wrong types and unknown record types are refused.
pub fn parse_line(text: &str) -> Result<Record, String> {
    serde_json::from_str::<Record>(text).map_err(|e| e.to_string())
}

/// Checks a whole export stream: the run line first and only there, every line a valid record, and the run clock
/// never going backwards. [`validate_bytes`] adds the check for a final line break.
pub fn validate_reader(reader: impl BufRead) -> Result<FileSummary, ValidationError> {
    let mut run: Option<RunMeta> = None;
    let mut records = Vec::new();
    let mut last_t = 0u64;
    let mut lines = 0usize;
    for (i, line) in reader.lines().enumerate() {
        let n = i + 1;
        lines = n;
        let text = line.map_err(|e| err(n, format!("cannot read (not UTF-8?): {e}")))?;
        if text.is_empty() {
            return Err(err(n, "empty line"));
        }
        let record = parse_line(&text).map_err(|e| err(n, e))?;
        validate_record(&record).map_err(|e| err(n, e))?;
        match (&run, record) {
            (None, Record::Run(meta)) => run = Some(meta),
            (None, other) => {
                return Err(err(
                    n,
                    format!(
                        "the first line must be the run line, found {}",
                        other.kind()
                    ),
                ));
            }
            (Some(_), Record::Run(_)) => return Err(err(n, "a second run line")),
            (Some(_), other) => {
                let t = other.t_ms().unwrap_or(last_t);
                if t < last_t {
                    return Err(err(
                        n,
                        format!("t_ms {t} is earlier than the line before ({last_t})"),
                    ));
                }
                last_t = t;
                records.push(other);
            }
        }
    }
    match run {
        Some(run) => Ok(FileSummary { run, records }),
        None if lines == 0 => Err(err(0, "the file is empty")),
        None => Err(err(0, "no run line")),
    }
}

/// Checks the bytes of one export file (see [`validate_reader`]); also requires the final line break.
pub fn validate_bytes(bytes: &[u8]) -> Result<FileSummary, ValidationError> {
    if bytes.is_empty() {
        return Err(err(0, "the file is empty"));
    }
    if !bytes.ends_with(b"\n") {
        let line = bytes.iter().filter(|&&b| b == b'\n').count() + 1;
        return Err(err(line, "the last line has no line break (file cut off?)"));
    }
    validate_reader(&bytes[..bytes.len() - 1])
}

/// The file name the writer gives file `seq` of run `run_id`.
pub fn file_name(run_id: &str, seq: u32) -> String {
    format!("{run_id}.{seq:04}.jsonl")
}

/// Checks one finished export file on disk: its content, and that its name matches its run line (an unfinished
/// `.part` file is refused).
pub fn validate_file(path: &Path) -> Result<FileSummary, ValidationError> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| err(0, "the path has no file name"))?;
    if name.ends_with(".part") {
        return Err(err(
            0,
            "an unfinished .part file (the writer did not finish it)",
        ));
    }
    let bytes =
        std::fs::read(path).map_err(|e| err(0, format!("cannot read {}: {e}", path.display())))?;
    let summary = validate_bytes(&bytes)?;
    let expected = file_name(&summary.run.run_id, summary.run.file_seq);
    if name != expected {
        return Err(err(
            0,
            format!("the file is named {name}, its run line says {expected}"),
        ));
    }
    Ok(summary)
}
