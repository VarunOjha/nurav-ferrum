//! Which WebView2 profile a page uses (P3 task p3.6, adr-0029, adr-0010).
//!
//! A *site* is the registrable domain of the page's host (owner answer Q-111: "main domain"): `mail.example.com` and
//! `docs.example.com` are both `example.com`; `example.co.uk` stays `example.co.uk` because `co.uk` is a public
//! suffix. The Public Suffix List comes from the `psl` crate, which compiles the list into the program (source note:
//! `wiki/raw/research/p3-profiles-psl.md`). A host that is itself a suffix (for example `localhost`) and an IP address
//! are their own site.
//!
//! Profile names follow Microsoft's documented rules for `ProfileName`: at most 64 characters; letters, digits and
//! `# @ $ ( ) + - _ ~ .` and space; not ending in a period or space; case-insensitive.

use sha2::{Digest, Sha256};

/// The profile shared by every page when isolation is off, and by tabs with no site yet (an empty tab).
pub const SHARED_PROFILE: &str = "ferrum-default";

/// The site of `url`: the registrable domain of an `http:`/`https:` host (lower case), the host itself when it has
/// none, or the IP address. `None` for anything else (`about:blank`, other schemes, unparsable input).
pub fn site_key(url: &str) -> Option<String> {
    let u = url::Url::parse(url).ok()?;
    if !matches!(u.scheme(), "http" | "https") {
        return None;
    }
    match u.host()? {
        url::Host::Domain(d) => {
            let host = d.trim_end_matches('.').to_ascii_lowercase();
            if host.is_empty() {
                return None;
            }
            Some(psl::domain_str(&host).map(str::to_string).unwrap_or(host))
        }
        url::Host::Ipv4(ip) => Some(ip.to_string()),
        url::Host::Ipv6(ip) => Some(format!("[{ip}]")),
    }
}

/// Whether `name` is a valid WebView2 profile name (Microsoft's documented rules).
pub fn valid_profile_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 64
        && !name.ends_with('.')
        && !name.ends_with(' ')
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "#@$()+-_~. ".contains(c))
}

/// The profile of a site: `site-<site>`, or `site-h-<24 hex digits of its SHA-256>` when that is not a valid name
/// (too long, or an IPv6 address with `[` and `:`). Stable: the same site always gets the same profile.
pub fn profile_for_site(site: &str) -> String {
    let plain = format!("site-{site}");
    if valid_profile_name(&plain) {
        return plain;
    }
    let digest = Sha256::digest(site.as_bytes());
    let hex: String = digest.iter().take(12).map(|b| format!("{b:02x}")).collect();
    format!("site-h-{hex}")
}

/// Whether `label` may name a user's own profile in the settings (`[[sites]] profile = "..."`): 1 to 40 lower-case
/// letters, digits, `-` or `_`.
pub fn valid_user_label(label: &str) -> bool {
    (1..=40).contains(&label.len())
        && label
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_')
}

/// The WebView2 profile of a user's named profile (`user-<label>`), kept apart from the per-site names.
pub fn profile_for_label(label: &str) -> String {
    format!("user-{label}")
}

/// The profile a page at `url` uses under `config` (p3.6): with per-site isolation, the profile named for its site
/// in `[[sites]]`, else the site's own profile; the shared profile for a page without a site (`about:blank`) and when
/// isolation is off.
pub fn profile_for_url(config: &crate::config::Config, url: &str) -> String {
    use crate::config::IsolationMode;
    match config.isolation.mode {
        IsolationMode::Shared => SHARED_PROFILE.to_string(),
        IsolationMode::PerSite => match site_key(url) {
            None => SHARED_PROFILE.to_string(),
            Some(site) => config
                .sites
                .iter()
                .find(|s| s.site == site)
                .and_then(|s| s.profile.as_deref())
                .map(profile_for_label)
                .unwrap_or_else(|| profile_for_site(&site)),
        },
    }
}
