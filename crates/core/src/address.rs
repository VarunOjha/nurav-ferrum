//! Address-bar input normalisation (P2 task p2.5): a pure function from what the user typed to what Ferrum may do.
//!
//! Rules (adr-0015 and the P2 settings, [`crate::config::Security`]):
//! - `https:` addresses are loaded; `http:` ones are upgraded to `https:` or loaded with a warning (`http_policy`).
//! - Input without a scheme (`example.org/x`, `localhost:8443`, `[::1]:8443`, `bücher.example`) gets `https://`.
//! - `javascript:`, `data:`, `file:`, `blob:`, `view-source:` and malformed input are **never** loaded.
//! - Other schemes (`mailto:`, `tel:`, custom app schemes) leave the browser: they need the user's confirmation
//!   (`external_schemes = "confirm"`) or are refused (`"deny"`).
//! - Plain words are refused: P2 has no search engine.
//!
//! Malformed input never yields a navigation.

use url::Url;

use crate::config::{ExternalSchemes, HttpPolicy, Security};

/// Something worth telling the user about an address that will be loaded.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Note {
    /// The typed `http:` address was upgraded to `https:`.
    UpgradedFromHttp,
    /// The address is plain `http:` (kept because `http_policy = "warn"`): show a "not secure" warning.
    InsecureHttp,
}

/// Why typed input is not loaded.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Refusal {
    /// Nothing was typed.
    Empty,
    /// Not an address (for example plain words). P2 has no search engine.
    NotAnAddress,
    /// Looks like an address but cannot be parsed.
    Malformed,
    /// A scheme that is never loaded from the address bar (`javascript:`, `data:`, `file:`, ...).
    ForbiddenScheme(String),
    /// A link to another app, and the settings say to deny those.
    ExternalDenied(String),
}

/// What Ferrum does with the input.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// Load this address in the content view.
    Navigate {
        /// The normalised address.
        url: Url,
        /// Optional user-facing note.
        note: Option<Note>,
    },
    /// The address leaves the browser (another app): ask the user before handing it to Windows.
    Confirm {
        /// The address to hand over after confirmation.
        url: Url,
    },
    /// Do not navigate.
    Refuse(Refusal),
}

/// Schemes never loaded from the address bar.
const FORBIDDEN: &[&str] = &[
    "javascript",
    "data",
    "file",
    "blob",
    "view-source",
    "vbscript",
];

/// Splits off a scheme if the input clearly has one. `localhost:8443` or `example.org:8080/x` are *not* schemes
/// (host and port); `mailto:a@b`, `ferrum-test:hello` and `https://x` are.
fn explicit_scheme(input: &str) -> Option<&str> {
    let (candidate, rest) = input.split_once(':')?;
    let valid = !candidate.is_empty()
        && candidate
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_alphabetic())
        && candidate
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'));
    if !valid {
        return None;
    }
    if rest.starts_with("//") {
        return Some(candidate);
    }
    // "host:port..." is not a scheme: a dotted candidate, "localhost", or digits right after the colon.
    let looks_like_port = rest.chars().next().is_some_and(|c| c.is_ascii_digit());
    if candidate.contains('.') || candidate.eq_ignore_ascii_case("localhost") || looks_like_port {
        return None;
    }
    Some(candidate)
}

/// A domain is plausible when it is `localhost` or has at least two labels, each 1 to 63 characters long and not
/// starting or ending with `-` (so `example..org`, `.example`, `-a.example` are refused).
fn domain_is_plausible(d: &str) -> bool {
    if d.eq_ignore_ascii_case("localhost") {
        return true;
    }
    let labels: Vec<&str> = d.split('.').collect();
    labels.len() >= 2
        && labels
            .iter()
            .all(|l| !l.is_empty() && l.len() <= 63 && !l.starts_with('-') && !l.ends_with('-'))
}

fn host_is_plausible(url: &Url) -> bool {
    match url.host() {
        Some(url::Host::Domain(d)) => domain_is_plausible(d),
        Some(url::Host::Ipv4(_)) | Some(url::Host::Ipv6(_)) => true,
        None => false,
    }
}

fn web(url: Url, security: &Security) -> Outcome {
    match url.scheme() {
        "https" => Outcome::Navigate { url, note: None },
        "http" => match security.http_policy {
            HttpPolicy::Upgrade => {
                let mut up = url;
                // http -> https on a parsed http URL cannot fail (both are special schemes).
                let _ = up.set_scheme("https");
                Outcome::Navigate {
                    url: up,
                    note: Some(Note::UpgradedFromHttp),
                }
            }
            HttpPolicy::Warn => Outcome::Navigate {
                url,
                note: Some(Note::InsecureHttp),
            },
        },
        _ => Outcome::Refuse(Refusal::Malformed),
    }
}

/// Turns address-bar input into an [`Outcome`]. Pure: no I/O, no clock, no global state.
pub fn normalize(input: &str, security: &Security) -> Outcome {
    let text = input.trim();
    if text.is_empty() {
        return Outcome::Refuse(Refusal::Empty);
    }
    if let Some(scheme) = explicit_scheme(text) {
        let scheme = scheme.to_ascii_lowercase();
        if FORBIDDEN.contains(&scheme.as_str()) {
            return Outcome::Refuse(Refusal::ForbiddenScheme(scheme));
        }
        if text.chars().any(char::is_whitespace) && (scheme == "http" || scheme == "https") {
            return Outcome::Refuse(Refusal::Malformed);
        }
        let Ok(url) = Url::parse(text) else {
            return Outcome::Refuse(Refusal::Malformed);
        };
        return match scheme.as_str() {
            "http" | "https" => {
                if host_is_plausible(&url) {
                    web(url, security)
                } else {
                    Outcome::Refuse(Refusal::Malformed)
                }
            }
            "about" if text.eq_ignore_ascii_case("about:blank") => {
                Outcome::Navigate { url, note: None }
            }
            "about" => Outcome::Refuse(Refusal::ForbiddenScheme(scheme)),
            _ => match security.external_schemes {
                ExternalSchemes::Confirm => Outcome::Confirm { url },
                ExternalSchemes::Deny => Outcome::Refuse(Refusal::ExternalDenied(scheme)),
            },
        };
    }
    // No scheme: plain words are not addresses (P2 has no search engine).
    if text.chars().any(char::is_whitespace) {
        return Outcome::Refuse(Refusal::NotAnAddress);
    }
    let Ok(url) = Url::parse(&format!("https://{text}")) else {
        return Outcome::Refuse(Refusal::Malformed);
    };
    if !host_is_plausible(&url) {
        // A dotted name that fails the label rules is a broken address; an undotted word is just not an address.
        return Outcome::Refuse(if text.contains('.') {
            Refusal::Malformed
        } else {
            Refusal::NotAnAddress
        });
    }
    Outcome::Navigate { url, note: None }
}

/// The part of an address that Ferrum's log keeps: `scheme://host[:port]` for web addresses, only `scheme:` for
/// others (for example `mailto:`), `"(not an address)"` when it does not parse. No path, query or fragment: the log
/// must not become a browsing history (task p2.14).
pub fn site(uri: &str) -> String {
    match Url::parse(uri) {
        Ok(u) => match u.host_str() {
            Some(h) => match u.port() {
                Some(p) => format!("{}://{}:{}", u.scheme(), h, p),
                None => format!("{}://{}", u.scheme(), h),
            },
            None => format!("{}:", u.scheme()),
        },
        Err(_) => "(not an address)".to_string(),
    }
}
