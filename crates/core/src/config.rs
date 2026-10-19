//! Ferrum's configuration model (P2 task p2.4, P3 task p3.4; design: `wiki/architecture/ov-arch-configuration.md`).
//!
//! P2 implements the subset the minimal container needs: start page, the navigation posture of adr-0015, what new
//! windows do, and the data folder. Settings are TOML (owner decision Q-214). Unknown keys are rejected
//! (`deny_unknown_fields`), so a typo fails loudly instead of silently falling back to a default.
//!
//! Layers, low to high: built-in defaults, the user's `config.toml`, an experiment override file. A missing file
//! means "use the layer below".
//!
//! Versions (p3.4): the file carries `version` ([`VERSION`] today). A file without it is version 1 (the P2 format)
//! and is migrated when read; a file from a newer Ferrum is refused with a clear error (and never overwritten).
//! [`save`] writes atomically (a temporary file, then a rename), so a crash never leaves half a file.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// What Ferrum does with `http:` addresses (adr-0015).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum HttpPolicy {
    /// Rewrite `http:` to `https:` before navigating (the default up to settings version 2).
    Upgrade,
    /// Keep `http:` and show the "not secure" warning (default from settings version 3, owner answer Q-112).
    #[default]
    Warn,
}

/// What Ferrum does with links to other apps (`mailto:`, custom schemes; adr-0015).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ExternalSchemes {
    /// Ask the user in the shell before handing the link to Windows (default).
    #[default]
    Confirm,
    /// Never hand such links to Windows.
    Deny,
}

/// What Ferrum does when a page opens a new window (`target=_blank`, `window.open`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum NewWindow {
    /// Open it in a new tab next to the page's tab (default since P3).
    #[default]
    NewTab,
    /// Load the new window's address in the same view (the P2 default).
    SameView,
    /// Open it in the user's normal browser.
    SystemBrowser,
}

/// Google sign-in handling (owner decision Q-109): never worked around; the only mode offers the system browser.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum GoogleOauth {
    /// Show a bar with an "Open in browser" button; nothing opens without the user's click.
    #[default]
    OfferSystemBrowser,
}

/// `[session]`: what Ferrum shows at start.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Session {
    /// Pages opened at start, as tabs in this order (p3.4). Empty means one empty tab.
    pub startup_urls: Vec<String>,
    /// Reopen the tabs of the last run (p3.5) when there are any; otherwise the start-up pages. On by default since
    /// settings version 2 (it did nothing in P2).
    pub restore_on_startup: bool,
}

impl Default for Session {
    fn default() -> Self {
        Session {
            startup_urls: Vec::new(),
            restore_on_startup: true,
        }
    }
}

/// `[security]`: the navigation posture (adr-0015).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Security {
    /// `http:` handling.
    pub http_policy: HttpPolicy,
    /// Links to other apps.
    pub external_schemes: ExternalSchemes,
    /// Google sign-in handling.
    pub google_oauth: GoogleOauth,
    /// New windows.
    pub new_window: NewWindow,
    /// Sites that never load (adr-0015 rule 2; owner answer Q-113: empty until the user adds sites). One rule per
    /// entry: `example.com` blocks the site and its subdomains, `=www.example.com` that host only. The rule syntax is
    /// checked by `ferrum_security::RuleList` when the settings are loaded or saved.
    pub blocklist: Vec<String>,
    /// Sites that override a less specific block rule, and the only sites allowed in allowlist-only mode.
    pub allowlist: Vec<String>,
    /// Only sites on the allowlist may load.
    pub allowlist_only: bool,
    /// The only link types to other apps that may be offered (scheme names such as `mailto`); empty means any type,
    /// always with the user's click (owner answer Q-224). Checked by the app when settings are loaded or saved.
    pub external_allowlist: Vec<String>,
}

/// How sites are kept apart (adr-0010, adr-0029; p3.6, p4.15). Read when Ferrum starts: a change applies after a
/// restart. The three modes are the benchmark configurations cfg-ferrum-profile-per-site, cfg-ferrum-shared-profile
/// and cfg-ferrum-udf-per-site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum IsolationMode {
    /// One WebView2 profile per site (its registrable domain, owner answer Q-111): cookies and storage stay apart
    /// (default from settings version 2). All profiles share one user data folder and one browser process.
    #[default]
    PerSite,
    /// One profile for every site (the P2 behaviour; also a benchmark configuration).
    Shared,
    /// One WebView2 user data folder per site (p4.15): each site's profile lives in its own folder with its own
    /// WebView2 environment, so its own browser process and helper processes. Empty and private tabs stay in the
    /// shell's folder.
    PerSiteUdf,
}

impl IsolationMode {
    /// The settings value (`per-site`, `shared`, `per-site-udf`).
    pub fn name(self) -> &'static str {
        match self {
            IsolationMode::PerSite => "per-site",
            IsolationMode::Shared => "shared",
            IsolationMode::PerSiteUdf => "per-site-udf",
        }
    }
}

/// `[isolation]`: keeping sites apart.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Isolation {
    /// Per-site profiles, one shared profile, or a user data folder per site.
    pub mode: IsolationMode,
}

/// `[[sites]]`: settings for one site (p3.6).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct SiteSettings {
    /// The site: a registrable domain such as `example.com` (lower case, no scheme).
    pub site: String,
    /// Use this named profile instead of the site's own one (sites with the same name share it, for example two
    /// domains of one sign-in system): 1 to 40 lower-case letters, digits, `-` or `_`.
    #[serde(default)]
    pub profile: Option<String>,
    /// Permissions this site may use (p4.5, adr-0015). Every kind not listed here is refused: a site gets nothing
    /// sensitive (camera, microphone, location, notifications, clipboard reading, ...) unless the user grants it here.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub permissions: Vec<PermissionKind>,
    /// Permissions this site may never use (p4.20, adr-0034): the user answered "Never allow". Refused without a
    /// question. A kind cannot be in both lists.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub never: Vec<PermissionKind>,
    /// Questions the user closed without answering (p4.20, adr-0034): after [`QUIET_AFTER_CLOSES`] in a row the site
    /// asks no more for that kind until `quiet_until`.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub closed: Vec<ClosedQuestion>,
}

/// After this many closed questions in a row for one kind, a site is quiet for [`QUIET_SECONDS`] (adr-0034).
pub const QUIET_AFTER_CLOSES: u32 = 3;
/// How long a site stays quiet: 7 days (adr-0034).
pub const QUIET_SECONDS: u64 = 7 * 24 * 60 * 60;

/// `[[sites.closed]]`: a site's closed questions for one kind (p4.20).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClosedQuestion {
    /// The kind asked for.
    pub kind: PermissionKind,
    /// Questions closed in a row (an answer starts again from 0).
    pub count: u32,
    /// No question before this time (seconds since 1970, UTC); 0 = not quiet.
    #[serde(default)]
    pub quiet_until: u64,
}

/// A permission a web page can ask for (the kinds WebView2 reports, p4.5).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PermissionKind {
    /// The camera.
    Camera,
    /// The microphone.
    Microphone,
    /// The device's location.
    Geolocation,
    /// Showing notifications.
    Notifications,
    /// Reading the clipboard.
    ClipboardRead,
    /// Motion and other sensors.
    OtherSensors,
    /// Starting several downloads without a click each.
    MultipleAutomaticDownloads,
    /// Reading and writing files the user picks.
    FileReadWrite,
    /// Playing media with sound before a click.
    Autoplay,
    /// Listing the fonts on the PC.
    LocalFonts,
    /// Full access to MIDI devices.
    MidiSystemExclusiveMessages,
    /// Placing windows across screens.
    WindowManagement,
}

impl PermissionKind {
    /// Every kind, in a fixed order.
    pub const ALL: [PermissionKind; 12] = [
        PermissionKind::Camera,
        PermissionKind::Microphone,
        PermissionKind::Geolocation,
        PermissionKind::Notifications,
        PermissionKind::ClipboardRead,
        PermissionKind::OtherSensors,
        PermissionKind::MultipleAutomaticDownloads,
        PermissionKind::FileReadWrite,
        PermissionKind::Autoplay,
        PermissionKind::LocalFonts,
        PermissionKind::MidiSystemExclusiveMessages,
        PermissionKind::WindowManagement,
    ];

    /// The kinds Ferrum asks the user about (p4.20, adr-0034); every other kind is refused unless granted in settings.
    pub const ASKED: [PermissionKind; 5] = [
        PermissionKind::Camera,
        PermissionKind::Microphone,
        PermissionKind::Geolocation,
        PermissionKind::Notifications,
        PermissionKind::ClipboardRead,
    ];

    /// Whether Ferrum asks the user about this kind ([`PermissionKind::ASKED`]).
    pub fn asked(self) -> bool {
        PermissionKind::ASKED.contains(&self)
    }

    /// The settings name (`camera`, `clipboard-read`, ...).
    pub fn name(self) -> &'static str {
        match self {
            PermissionKind::Camera => "camera",
            PermissionKind::Microphone => "microphone",
            PermissionKind::Geolocation => "geolocation",
            PermissionKind::Notifications => "notifications",
            PermissionKind::ClipboardRead => "clipboard-read",
            PermissionKind::OtherSensors => "other-sensors",
            PermissionKind::MultipleAutomaticDownloads => "multiple-automatic-downloads",
            PermissionKind::FileReadWrite => "file-read-write",
            PermissionKind::Autoplay => "autoplay",
            PermissionKind::LocalFonts => "local-fonts",
            PermissionKind::MidiSystemExclusiveMessages => "midi-system-exclusive-messages",
            PermissionKind::WindowManagement => "window-management",
        }
    }

    /// The kind with this settings name.
    pub fn from_name(name: &str) -> Option<PermissionKind> {
        PermissionKind::ALL.into_iter().find(|k| k.name() == name)
    }
}

/// `[downloads]`: where downloads go (p3.8).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Downloads {
    /// The folder downloads are saved in. `None` = the Windows Downloads folder.
    pub folder: Option<PathBuf>,
}

/// `[telemetry]`: Ferrum's own measuring (p5.11; owner's Q-230 answer: off unless switched on): memory and CPU of its
/// processes, startup and navigation timing and tab state changes, written as export files (no web addresses).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Telemetry {
    /// Whether the measuring writes files (off by default; benchmark runs switch it on).
    pub enabled: bool,
    /// The export folder, relative to the data folder.
    pub dir: PathBuf,
    /// Milliseconds between process readings (100 to 60000).
    pub sample_interval_ms: u32,
    /// Run files older than this many days are deleted at start (0 = never; at most 3650).
    pub retention_days: u32,
    /// Which machine-inventory record describes this PC (written in each run line).
    pub machine_id: String,
}

impl Default for Telemetry {
    fn default() -> Self {
        Telemetry {
            enabled: false,
            dir: PathBuf::from("telemetry"),
            sample_interval_ms: 1000,
            retention_days: 14,
            machine_id: "unrecorded".into(),
        }
    }
}

/// `[network_log]`: the local log of each tab's requests (p5.9; adr-0008, metadata only; owner's Q-114 answer: full
/// addresses, off unless switched on, files older than 14 days deleted).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct NetworkLog {
    /// Whether the log is written (off by default; benchmark runs switch it on).
    pub enabled: bool,
    /// The log folder, relative to the data folder; one subfolder per app session.
    pub dir: PathBuf,
    /// A session's file size, in MiB, at which the next file starts (1 to 1024).
    pub rotate_mb: u32,
    /// Files kept per session (1 to 1000); beyond that the session's oldest file is deleted.
    pub max_files: u32,
    /// Session folders older than this many days are deleted at start (0 = never; at most 3650).
    pub retention_days: u32,
}

impl Default for NetworkLog {
    fn default() -> Self {
        NetworkLog {
            enabled: false,
            dir: PathBuf::from("netlogs"),
            rotate_mb: 50,
            max_files: 20,
            retention_days: 14,
        }
    }
}

/// A theme: a named set of colours for light and dark (adr-0033). The shell holds the colours; a new theme is a new
/// name here and its colour record in the shell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum Theme {
    /// Dark and metallic, neutral brushed grey (the owner's pick).
    #[default]
    Graphite,
}

/// The accent colour, applied on top of any theme.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum Accent {
    /// Orange (Ferrum's own).
    #[default]
    Orange,
    /// Blue.
    Blue,
    /// Green.
    Green,
    /// Violet.
    Violet,
}

/// How much room the browser's controls take.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum Density {
    /// Bigger click targets.
    #[default]
    Roomy,
    /// More room for pages.
    Compact,
}

/// `[appearance]`: how the shell looks (P3 feature set: p3.19 bookmarks bar; p3.22 theme, accent, density; adr-0033).
/// Light or dark follows Windows; it is not a setting.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Appearance {
    /// Show the bookmarks bar under the toolbar (Ctrl+Shift+B toggles it).
    pub bookmarks_bar: bool,
    /// The theme.
    pub theme: Theme,
    /// The accent colour.
    pub accent: Accent,
    /// Roomy or compact.
    pub density: Density,
}

impl Default for Appearance {
    fn default() -> Self {
        Appearance {
            bookmarks_bar: true,
            theme: Theme::default(),
            accent: Accent::default(),
            density: Density::default(),
        }
    }
}

/// `[storage]`: where Ferrum keeps its data.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Storage {
    /// Folder for the WebView2 user data (cookies, cache). `None` = the app's local data folder.
    pub data_dir: Option<PathBuf>,
}

/// The settings file format this Ferrum writes.
pub const VERSION: u32 = 4;

fn version_one() -> u32 {
    1
}

/// The effective configuration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Config {
    /// Settings file format (a file without it is version 1, the P2 format).
    #[serde(default = "version_one")]
    pub version: u32,
    /// Start-up pages.
    pub session: Session,
    /// Navigation posture.
    pub security: Security,
    /// Data folder.
    pub storage: Storage,
    /// Keeping sites apart.
    pub isolation: Isolation,
    /// Per-site settings.
    pub sites: Vec<SiteSettings>,
    /// Downloads.
    pub downloads: Downloads,
    /// How the shell looks.
    pub appearance: Appearance,
    /// Ferrum's own measuring (p5.11).
    pub telemetry: Telemetry,
    /// The network log (p5.9).
    pub network_log: NetworkLog,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            version: VERSION,
            session: Session::default(),
            security: Security::default(),
            storage: Storage::default(),
            isolation: Isolation::default(),
            sites: Vec::new(),
            downloads: Downloads::default(),
            appearance: Appearance::default(),
            telemetry: Telemetry::default(),
            network_log: NetworkLog::default(),
        }
    }
}

/// Something in the configuration that is accepted but worth telling the user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Warning {
    /// An `http:` start page was rewritten to `https:` (http_policy = "upgrade").
    StartUrlUpgraded {
        /// The address as written.
        from: String,
        /// The address used.
        to: String,
    },
    /// An `http:` start page is kept as written (http_policy = "warn"); the user sees a warning when it loads.
    StartUrlInsecure(String),
}

/// Why a configuration could not be used.
#[derive(Debug)]
pub enum ConfigError {
    /// The file exists but could not be read.
    Read {
        /// The file.
        path: PathBuf,
        /// The reason.
        source: std::io::Error,
    },
    /// The file is not valid TOML for this schema (unknown key, wrong type, bad value).
    Parse {
        /// The file.
        path: PathBuf,
        /// The parser's message.
        message: String,
    },
    /// The file was written by a newer Ferrum (its `version` is higher than [`VERSION`]).
    NewerVersion {
        /// The file.
        path: PathBuf,
        /// Its version.
        found: u32,
    },
    /// The file could not be written.
    Write {
        /// The file.
        path: PathBuf,
        /// The reason.
        source: std::io::Error,
    },
    /// A `[[sites]]` entry is not usable.
    InvalidSite {
        /// The entry's site.
        site: String,
        /// Why it was refused.
        reason: String,
    },
    /// A setting's value is out of range (p5.9: `[network_log]`).
    InvalidValue {
        /// The setting, as `section.key`.
        key: String,
        /// Why it was refused.
        reason: String,
    },
    /// A start page is not a usable address.
    InvalidStartUrl {
        /// The address as written.
        url: String,
        /// Why it was refused.
        reason: String,
    },
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::Read { path, source } => {
                write!(f, "cannot read {}: {source}", path.display())
            }
            ConfigError::Parse { path, message } => {
                write!(f, "invalid settings in {}: {message}", path.display())
            }
            ConfigError::NewerVersion { path, found } => write!(
                f,
                "{} is settings version {found}, from a newer Ferrum (this one reads up to version {VERSION}); \
                 it was left unchanged and the defaults are used",
                path.display()
            ),
            ConfigError::Write { path, source } => {
                write!(f, "cannot write {}: {source}", path.display())
            }
            ConfigError::InvalidSite { site, reason } => {
                write!(f, "site settings for {site:?} refused: {reason}")
            }
            ConfigError::InvalidStartUrl { url, reason } => {
                write!(f, "start page {url:?} refused: {reason}")
            }
            ConfigError::InvalidValue { key, reason } => {
                write!(f, "setting {key} refused: {reason}")
            }
        }
    }
}

impl std::error::Error for ConfigError {}

/// A loaded configuration plus anything worth telling the user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Loaded {
    /// The effective configuration (start pages already normalised).
    pub config: Config,
    /// Accepted-but-notable items.
    pub warnings: Vec<Warning>,
}

/// Parses one TOML layer. Each layer is a complete configuration; missing keys take their defaults. A version-1 file
/// is migrated ([`migrate_v1`], then [`migrate_v2`], then [`migrate_v3`]); a file newer than [`VERSION`] is refused.
pub fn parse(text: &str, origin: &Path) -> Result<Config, ConfigError> {
    let bad = |message: String| ConfigError::Parse {
        path: origin.to_path_buf(),
        message,
    };
    let mut table: toml::Table = toml::from_str(text).map_err(|e| bad(e.message().to_string()))?;
    let version = match table.get("version") {
        None => 1,
        Some(toml::Value::Integer(v)) if *v >= 1 && *v <= i64::from(u32::MAX) => *v as u32,
        Some(_) => return Err(bad("version must be a whole number from 1".into())),
    };
    if version > VERSION {
        return Err(ConfigError::NewerVersion {
            path: origin.to_path_buf(),
            found: version,
        });
    }
    if version == 1 {
        migrate_v1(&mut table);
    }
    if version <= 2 {
        migrate_v2(&mut table);
    }
    if version <= 3 {
        migrate_v3(&mut table);
    }
    table
        .try_into::<Config>()
        .map_err(|e| bad(e.message().to_string()))
}

/// Version 1 (P2) to version 2 (P3). Three defaults changed; a version-1 file that does not choose keeps what it had
/// in P2, because the new defaults would change its behaviour: new windows stay in the same view (the new default is
/// a new tab), the previous session is not restored (P2 never restored one), and all sites share one profile (the
/// new default is a profile per site, which would hide the cookies the user already has).
pub fn migrate_v1(table: &mut toml::Table) {
    // (The version is set by migrate_v2, which every version-1 file passes through next.)
    let isolation = table
        .entry("isolation")
        .or_insert_with(|| toml::Value::Table(toml::Table::new()));
    if let toml::Value::Table(iso) = isolation {
        iso.entry("mode")
            .or_insert_with(|| toml::Value::String("shared".into()));
    }
    let session = table
        .entry("session")
        .or_insert_with(|| toml::Value::Table(toml::Table::new()));
    if let toml::Value::Table(ses) = session {
        ses.entry("restore_on_startup")
            .or_insert(toml::Value::Boolean(false));
    }
    let security = table
        .entry("security")
        .or_insert_with(|| toml::Value::Table(toml::Table::new()));
    if let toml::Value::Table(sec) = security {
        sec.entry("new_window")
            .or_insert_with(|| toml::Value::String("same-view".into()));
    }
}

/// Version 2 (P3) to version 3 (P4). The `http_policy` default changed from upgrade to warn (owner answer Q-112); a
/// version-2 file that does not choose keeps upgrade, as for version 1. The new site lists start empty.
pub fn migrate_v2(table: &mut toml::Table) {
    let security = table
        .entry("security")
        .or_insert_with(|| toml::Value::Table(toml::Table::new()));
    if let toml::Value::Table(sec) = security {
        sec.entry("http_policy")
            .or_insert_with(|| toml::Value::String("upgrade".into()));
    }
    table.insert("version".into(), toml::Value::Integer(i64::from(VERSION)));
}

/// Version 3 (P4) to version 4 (p4.20, adr-0034). Two per-site lists are new (`never`, `closed`); they start empty, so
/// nothing changes. Only the version number moves on, so an older Ferrum refuses the file clearly instead of failing on
/// a key it does not know.
pub fn migrate_v3(table: &mut toml::Table) {
    table.insert("version".into(), toml::Value::Integer(i64::from(VERSION)));
}

/// Writes `config` to `path` atomically ([`crate::fsutil::write_atomic`]): readers see the old file or the new one,
/// never half of one.
pub fn save(path: &Path, config: &Config) -> Result<(), ConfigError> {
    let mut out = config.clone();
    out.version = VERSION;
    let text = format!(
        "# Ferrum settings (written by Ferrum; edit with care, unknown keys are refused).\n{}",
        canonical(&out)
    );
    crate::fsutil::write_atomic(path, text.as_bytes()).map_err(|source| ConfigError::Write {
        path: path.to_path_buf(),
        source,
    })
}

/// Copies an unreadable settings file aside as `<name>.broken-<seconds since 1970>` and returns the copy's path, so
/// nothing the user wrote is lost when Ferrum falls back to the defaults.
pub fn backup_broken(path: &Path) -> std::io::Result<PathBuf> {
    crate::fsutil::backup_broken(path)
}

fn read_layer(path: &Path) -> Result<Option<Config>, ConfigError> {
    match std::fs::read_to_string(path) {
        Ok(text) => parse(&text, path).map(Some),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(ConfigError::Read {
            path: path.to_path_buf(),
            source: e,
        }),
    }
}

/// Loads the effective configuration: built-in defaults, then `user` (if it exists), then `override_file` (if
/// given and it exists; the higher layer replaces the lower one as a whole), then validates it.
pub fn load(user: Option<&Path>, override_file: Option<&Path>) -> Result<Loaded, ConfigError> {
    let mut config = Config::default();
    for layer in [user, override_file].into_iter().flatten() {
        if let Some(c) = read_layer(layer)? {
            config = c;
        }
    }
    validate(config)
}

/// Validates start pages per adr-0015: `https:` is used as is; `http:` is upgraded or kept with a warning
/// according to `http_policy`; `about:blank` is allowed; every other scheme (file:, data:, javascript:, ...) is
/// refused.
pub fn validate(mut config: Config) -> Result<Loaded, ConfigError> {
    let mut warnings = Vec::new();
    let mut out = Vec::with_capacity(config.session.startup_urls.len());
    for raw in &config.session.startup_urls {
        let trimmed = raw.trim();
        if trimmed == "about:blank" {
            out.push(trimmed.to_string());
            continue;
        }
        let url = url::Url::parse(trimmed).map_err(|e| ConfigError::InvalidStartUrl {
            url: raw.clone(),
            reason: e.to_string(),
        })?;
        match url.scheme() {
            "https" => out.push(url.to_string()),
            "http" => match config.security.http_policy {
                HttpPolicy::Upgrade => {
                    let mut up = url.clone();
                    // Changing http -> https on a parsed http URL cannot fail (both are special schemes).
                    let _ = up.set_scheme("https");
                    warnings.push(Warning::StartUrlUpgraded {
                        from: url.to_string(),
                        to: up.to_string(),
                    });
                    out.push(up.to_string());
                }
                HttpPolicy::Warn => {
                    warnings.push(Warning::StartUrlInsecure(url.to_string()));
                    out.push(url.to_string());
                }
            },
            other => {
                return Err(ConfigError::InvalidStartUrl {
                    url: raw.clone(),
                    reason: format!(
                        "scheme {other:?} is not allowed for a start page (only https, or http per http_policy)"
                    ),
                });
            }
        }
    }
    config.session.startup_urls = out;
    let mut seen = std::collections::HashSet::new();
    for s in &config.sites {
        let bad = |reason: &str| ConfigError::InvalidSite {
            site: s.site.clone(),
            reason: reason.into(),
        };
        // The entry must name a site as Ferrum computes it (its registrable domain), or it would never match.
        let as_site = crate::profiles::site_key(&format!("https://{}/", s.site));
        if s.site.is_empty() || as_site.as_deref() != Some(s.site.as_str()) {
            return Err(bad(
                "not a site; use its main domain in lower case, for example example.com",
            ));
        }
        if !seen.insert(s.site.clone()) {
            return Err(bad("listed twice"));
        }
        if let Some(p) = &s.profile
            && !crate::profiles::valid_user_label(p)
        {
            return Err(bad(
                "profile must be 1 to 40 lower-case letters, digits, - or _",
            ));
        }
        // p4.20: an answer is either "allow" or "never", and one closed-question record per kind.
        if let Some(k) = s.permissions.iter().find(|k| s.never.contains(k)) {
            return Err(bad(&format!(
                "permission {} is both allowed and never allowed",
                k.name()
            )));
        }
        let mut kinds = std::collections::HashSet::new();
        if let Some(c) = s.closed.iter().find(|c| !kinds.insert(c.kind)) {
            return Err(bad(&format!(
                "closed questions for {} are listed twice",
                c.kind.name()
            )));
        }
    }
    let plain_dir = |d: &std::path::Path| {
        d.components().count() > 0
            && d.components()
                .all(|c| matches!(c, std::path::Component::Normal(_)))
    };
    let tm = &config.telemetry;
    let bad = |key: &str, reason: &str| ConfigError::InvalidValue {
        key: format!("telemetry.{key}"),
        reason: reason.into(),
    };
    if !(100..=60_000).contains(&tm.sample_interval_ms) {
        return Err(bad("sample_interval_ms", "must be 100 to 60000"));
    }
    if tm.retention_days > 3650 {
        return Err(bad("retention_days", "must be 0 (never delete) to 3650"));
    }
    if !plain_dir(&tm.dir) {
        return Err(bad(
            "dir",
            "must be a folder name inside the data folder (no drive, no .., not empty)",
        ));
    }
    let id_ok = |s: &str| {
        (1..=64).contains(&s.len())
            && s.bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.')
    };
    if !id_ok(&tm.machine_id) {
        return Err(bad(
            "machine_id",
            "must be 1 to 64 letters, digits, '.', '-' or '_'",
        ));
    }
    let n = &config.network_log;
    let bad = |key: &str, reason: &str| ConfigError::InvalidValue {
        key: format!("network_log.{key}"),
        reason: reason.into(),
    };
    if !(1..=1024).contains(&n.rotate_mb) {
        return Err(bad("rotate_mb", "must be 1 to 1024"));
    }
    if !(1..=1000).contains(&n.max_files) {
        return Err(bad("max_files", "must be 1 to 1000"));
    }
    if n.retention_days > 3650 {
        return Err(bad("retention_days", "must be 0 (never delete) to 3650"));
    }
    if !plain_dir(&n.dir) {
        return Err(bad(
            "dir",
            "must be a folder name inside the data folder (no drive, no .., not empty)",
        ));
    }
    Ok(Loaded { config, warnings })
}

/// Canonical TOML of a configuration (field order fixed by the types).
pub fn canonical(config: &Config) -> String {
    toml::to_string(config).unwrap_or_default()
}

/// `sha256:<hex>` of the canonical TOML; recorded with telemetry and benchmark trials (`config_sha256`).
pub fn hash(config: &Config) -> String {
    let digest = Sha256::digest(canonical(config).as_bytes());
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    format!("sha256:{hex}")
}
