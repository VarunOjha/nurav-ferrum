//! Recognises the start of a Google sign-in (OAuth 2.0 authorization request) so Ferrum can offer the user's normal
//! browser instead (adr-0015, owner answer Q-109, task p2.13). Google forbids such requests from embedded browsers;
//! Ferrum never works around that (no user-agent change). Pure: no I/O, no global state.
//!
//! Source of the address: `wiki/raw/research/google-oauth-endpoint.md` (Google's discovery document gives the
//! authorization endpoint `https://accounts.google.com/o/oauth2/v2/auth`). Ferrum matches the path family
//! `/o/oauth2/` on that host.

use url::Url;

/// Host of Google's OAuth 2.0 authorization endpoint.
pub const GOOGLE_HOST: &str = "accounts.google.com";
/// Path family of the authorization endpoint.
pub const GOOGLE_PATH_PREFIX: &str = "/o/oauth2/";

/// An extra address that counts as a sign-in start, for tests (the app passes one only in debug builds).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestPattern {
    /// Host to match exactly (for example `localhost`).
    pub host: String,
    /// Path prefix to match.
    pub path_prefix: String,
}

/// What a navigation target is, for the sign-in policy.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SignIn {
    /// Google's OAuth authorization endpoint (or the test pattern).
    Google,
}

/// Returns `Some(SignIn::Google)` when `url` starts a Google sign-in. Only web addresses are considered; the host is
/// compared after URL parsing, so `https://accounts.google.com@example.org/o/oauth2/` (host example.org) and
/// `https://accounts.google.com.example.org/…` do not match.
pub fn classify(url: &str, test: Option<&TestPattern>) -> Option<SignIn> {
    let u = Url::parse(url).ok()?;
    if u.scheme() != "https" && u.scheme() != "http" {
        return None;
    }
    let host = u.host_str()?;
    let path = u.path();
    if host.eq_ignore_ascii_case(GOOGLE_HOST) && path.starts_with(GOOGLE_PATH_PREFIX) {
        return Some(SignIn::Google);
    }
    if let Some(t) = test
        && host.eq_ignore_ascii_case(&t.host)
        && path.starts_with(&t.path_prefix)
    {
        return Some(SignIn::Google);
    }
    None
}
