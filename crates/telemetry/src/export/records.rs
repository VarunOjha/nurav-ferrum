//! The record types of export schema v1 (p5.1). One JSON object per line; the `type` field names the record.
//!
//! Every file starts with one [`RunMeta`] line, so any number in it can be traced to the exact setup that made it
//! (code version, Windows build, WebView2 runtime, settings fingerprint, machine). Unknown fields are refused, so a
//! typo or a newer writer is caught instead of being read silently.
//!
//! Version rule: v1 may gain record types while P5 is in progress (p5.8 adds lifecycle transitions); it is frozen at
//! the P5 exit gate. After that any change bumps [`SCHEMA_VERSION`].

use serde::{Deserialize, Serialize};

/// The version every file of this schema carries in its run line.
pub const SCHEMA_VERSION: u32 = 1;

/// One line of an export file.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Record {
    /// The run label; the first line of every file and nowhere else.
    Run(RunMeta),
    /// The counters of one process at one moment.
    ProcessSample(ProcessSample),
    /// The sum over the whole attributed process set at one moment (the headline series).
    TreeSample(TreeSample),
    /// One startup boundary.
    StartupMark(StartupMark),
    /// The timing of one finished navigation.
    NavTiming(NavTiming),
}

impl Record {
    /// The record's `type` value, also the name of its CSV file.
    pub fn kind(&self) -> &'static str {
        match self {
            Record::Run(_) => "run",
            Record::ProcessSample(_) => "process_sample",
            Record::TreeSample(_) => "tree_sample",
            Record::StartupMark(_) => "startup_mark",
            Record::NavTiming(_) => "nav_timing",
        }
    }

    /// Milliseconds since the run started (the run clock), for every record but the run line.
    pub fn t_ms(&self) -> Option<u64> {
        match self {
            Record::Run(_) => None,
            Record::ProcessSample(r) => Some(r.t_ms),
            Record::TreeSample(r) => Some(r.t_ms),
            Record::StartupMark(r) => Some(r.t_ms),
            Record::NavTiming(r) => Some(r.t_ms),
        }
    }
}

/// The run label (experiment metadata, master prompt section 4).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RunMeta {
    /// Always [`SCHEMA_VERSION`] for files written by this code.
    pub schema_version: u32,
    /// Letters, digits, `-` and `_`, 1 to 64 characters; also the start of each file name.
    pub run_id: String,
    /// 0 for the first file of the run, then 1, 2, ... after each rotation.
    pub file_seq: u32,
    /// Wall-clock time the run started, milliseconds since 1970-01-01 UTC. `t_ms` values count from here.
    pub started_unix_ms: u64,
    /// Ferrum's version (the workspace version).
    pub ferrum_version: String,
    /// The git commit Ferrum was built from: 7 to 40 lower-case hex characters.
    pub git_sha: String,
    /// True when the build had uncommitted changes.
    pub git_dirty: bool,
    /// Windows build, for example `10.0.26200.1234`.
    pub os_build: String,
    /// The WebView2 runtime version in use (four-part).
    pub webview2_runtime: String,
    /// Fingerprint of the effective settings: `sha256:` and 64 lower-case hex characters (ov-arch-configuration).
    pub config_sha256: String,
    /// Which machine-inventory record describes the PC (for example `p1.2-environment`).
    pub machine_id: String,
    /// The sampling interval, when the run samples processes.
    pub sample_interval_ms: Option<u32>,
}

/// What a process is, as WebView2 reports it (never guessed from the executable name, risk-r05).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProcessKind {
    /// Ferrum's own process.
    Host,
    /// The browser engine's main process.
    Browser,
    /// A page process.
    Renderer,
    /// The graphics process.
    Gpu,
    /// A helper process (network, storage, audio and others).
    Utility,
    /// Anything else WebView2 reports.
    Other,
}

/// The counters of one process at one moment.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProcessSample {
    /// Milliseconds since the run started.
    pub t_ms: u64,
    /// Process id.
    pub pid: u32,
    /// The process creation time (Windows FILETIME, 100 ns units); with `pid` it names one process even if Windows
    /// reuses the id later.
    pub pid_created_100ns: u64,
    /// What the process is.
    pub kind: ProcessKind,
    /// Private commit (`PrivateUsage`), the headline memory counter.
    pub private_commit_bytes: u64,
    /// Working set (secondary: shared pages are counted in every process that uses them).
    pub working_set_bytes: u64,
    /// Private working set, when the counter is available.
    pub private_working_set_bytes: Option<u64>,
    /// Page faults since the process started.
    pub page_faults: u64,
    /// User-mode CPU time since the process started (100 ns units).
    pub cpu_user_100ns: u64,
    /// Kernel-mode CPU time since the process started (100 ns units).
    pub cpu_kernel_100ns: u64,
    /// CPU cycles since the process started, when available.
    pub cycles: Option<u64>,
}

/// The sum over the whole attributed process set at one moment. Peaks are read from this series, never added up from
/// per-process peaks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TreeSample {
    /// Milliseconds since the run started.
    pub t_ms: u64,
    /// How many processes the sum covers.
    pub process_count: u32,
    /// Sum of private commit.
    pub private_commit_bytes: u64,
    /// Sum of working set (over-counts shared pages).
    pub working_set_bytes: u64,
    /// Sum of user and kernel CPU time (100 ns units).
    pub cpu_100ns: u64,
    /// Sum of CPU cycles, when available for every process.
    pub cycles: Option<u64>,
}

/// The startup boundaries, in the order they happen (owner's Q-115 answer: no "time to interactive").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StartupMarkKind {
    /// Ferrum's process was created.
    ProcessCreated,
    /// The window became visible.
    WindowVisible,
    /// The shell drew its first frame.
    ShellFirstPaint,
    /// The first tab drew its first content.
    TabFirstContentfulPaint,
    /// The first tab drew its largest content.
    TabLargestContentfulPaint,
}

/// One startup boundary.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StartupMark {
    /// Milliseconds since the run started.
    pub t_ms: u64,
    /// Which boundary.
    pub mark: StartupMarkKind,
    /// The tab, for the two tab boundaries.
    pub tab: Option<u64>,
}

/// Whether a navigation stayed on the site of the page before it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OriginRelation {
    /// Same origin as the previous page.
    SameOrigin,
    /// Another origin.
    CrossOrigin,
}

/// How a navigation ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NavOutcome {
    /// The page finished loading.
    Completed,
    /// The load failed.
    Failed,
    /// Ferrum or the user stopped it.
    Cancelled,
}

/// The timing of one finished navigation. Offsets are milliseconds after `start_ms`, absent when that point was never
/// reached.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NavTiming {
    /// When the record was written, milliseconds since the run started.
    pub t_ms: u64,
    /// The tab.
    pub tab: u64,
    /// The navigation, unique within the tab.
    pub nav_id: u64,
    /// Navigation start on the run clock (milliseconds, fractions allowed).
    pub start_ms: f64,
    /// First response byte.
    pub response_ms: Option<f64>,
    /// DOMContentLoaded.
    pub dom_content_loaded_ms: Option<f64>,
    /// The load event.
    pub load_ms: Option<f64>,
    /// Navigation completed (WebView2 NavigationCompleted).
    pub complete_ms: Option<f64>,
    /// Same or other origin.
    pub origin: OriginRelation,
    /// How many redirects the navigation followed.
    pub redirect_count: u32,
    /// How it ended.
    pub outcome: NavOutcome,
}
