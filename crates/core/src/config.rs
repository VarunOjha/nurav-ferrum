//! Ferrum's configuration model (P2 task p2.4; design: `wiki/architecture/ov-arch-configuration.md`).
//!
//! P2 implements the subset the minimal container needs: start page, the navigation posture of adr-0015, what new
//! windows do, and the data folder. Settings are TOML (owner decision Q-214). Unknown keys are rejected
//! (`deny_unknown_fields`), so a typo fails loudly instead of silently falling back to a default.
//!
//! Layers, low to high: built-in defaults, the user's `config.toml`, an experiment override file. A missing file
//! means "use the layer below".

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// What Ferrum does with `http:` addresses (adr-0015).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum HttpPolicy {
    /// Rewrite `http:` to `https:` before navigating (default).
    #[default]
    Upgrade,
    /// Keep `http:` but warn the user.
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

/// What Ferrum does when a page opens a new window (`target=_blank`, `window.open`) in P2 (no tabs yet).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum NewWindow {
    /// Load the new window's address in the same view (default).
    #[default]
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
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Session {
    /// Pages opened at start (P2 shows the first). Empty means a blank page.
    pub startup_urls: Vec<String>,
    /// Restore the previous session instead (P3; ignored in P2).
    pub restore_on_startup: bool,
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
    /// New windows in P2.
    pub new_window: NewWindow,
}

/// `[storage]`: where Ferrum keeps its data.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Storage {
    /// Folder for the WebView2 user data (cookies, cache). `None` = the app's local data folder.
    pub data_dir: Option<PathBuf>,
}

/// The effective configuration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields, default)]
pub struct Config {
    /// Start-up pages.
    pub session: Session,
    /// Navigation posture.
    pub security: Security,
    /// Data folder.
    pub storage: Storage,
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
            ConfigError::InvalidStartUrl { url, reason } => {
                write!(f, "start page {url:?} refused: {reason}")
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

/// Parses one TOML layer. Each layer is a complete configuration; missing keys take their defaults.
pub fn parse(text: &str, origin: &Path) -> Result<Config, ConfigError> {
    toml::from_str(text).map_err(|e| ConfigError::Parse {
        path: origin.to_path_buf(),
        message: e.message().to_string(),
    })
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
