//! Permission decisions (p4.5; adr-0015, threat model in `wiki/quality/qual-security-testing-plan.md` §7).
//!
//! A web page may ask for the camera, the microphone, the location, notifications, the clipboard and more. Ferrum
//! refuses **every** kind unless the user granted that kind to the page's site in settings (`[[sites]] permissions`).
//! Sites are compared by their registrable domain (`ferrum_core::profiles::site_key`, the same key per-site profiles
//! use), so a grant for `example.com` covers `www.example.com` but never `example.com.evil.test`. Only `https:` pages
//! can hold a grant; every `http:` page is refused, `localhost` included. Like [`crate::evaluate`], this is pure and
//! never panics.

use ferrum_core::config::{PermissionKind, SiteSettings};
use ferrum_core::profiles::site_key;
use url::Url;

/// Why a permission was allowed or refused. The names from [`PermissionRule::as_str`] go into the log.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionRule {
    /// The site has a grant for this kind.
    Granted,
    /// No grant for this kind (the default for every kind).
    NotGranted,
    /// The page is not an `https:` page with a site (unreadable, `http:`, `data:`, ...): never granted.
    NotSecureSite,
    /// WebView2 reported a kind Ferrum does not know: refused.
    UnknownKind,
}

impl PermissionRule {
    /// Stable name for logs and tests.
    pub fn as_str(self) -> &'static str {
        match self {
            PermissionRule::Granted => "permission-granted",
            PermissionRule::NotGranted => "permission-not-granted",
            PermissionRule::NotSecureSite => "permission-not-secure-site",
            PermissionRule::UnknownKind => "permission-unknown-kind",
        }
    }
}

/// The decision on one permission request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PermissionDecision {
    /// Whether the page gets the permission.
    pub allow: bool,
    /// Why.
    pub rule: PermissionRule,
}

/// The per-site grants, built from settings.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Grants {
    sites: Vec<(String, Vec<PermissionKind>)>,
}

impl Grants {
    /// The grants in the settings' `[[sites]]` entries.
    pub fn from_sites(sites: &[SiteSettings]) -> Grants {
        Grants {
            sites: sites
                .iter()
                .filter(|s| !s.permissions.is_empty())
                .map(|s| (s.site.clone(), s.permissions.clone()))
                .collect(),
        }
    }

    /// Decides a request for `kind` (`None`: a kind WebView2 reported that Ferrum does not know) by the page at
    /// `origin`.
    pub fn decide(&self, origin: &str, kind: Option<PermissionKind>) -> PermissionDecision {
        let refuse = |rule| PermissionDecision { allow: false, rule };
        let Some(kind) = kind else {
            return refuse(PermissionRule::UnknownKind);
        };
        let site = Url::parse(origin)
            .ok()
            .filter(|u| u.scheme() == "https")
            .and_then(|u| site_key(u.as_str()));
        let Some(site) = site else {
            return refuse(PermissionRule::NotSecureSite);
        };
        let granted = self
            .sites
            .iter()
            .any(|(s, kinds)| *s == site && kinds.contains(&kind));
        if granted {
            PermissionDecision {
                allow: true,
                rule: PermissionRule::Granted,
            }
        } else {
            refuse(PermissionRule::NotGranted)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use PermissionKind::*;

    fn grants() -> Grants {
        Grants::from_sites(&[
            SiteSettings {
                site: "example.com".into(),
                profile: None,
                permissions: vec![Camera, Notifications],
            },
            SiteSettings {
                site: "other.test".into(),
                profile: Some("work".into()),
                permissions: vec![],
            },
        ])
    }

    #[test]
    fn every_kind_is_refused_by_default() {
        let none = Grants::default();
        let refused = PermissionDecision {
            allow: false,
            rule: PermissionRule::NotGranted,
        };
        let decisions: Vec<_> = PermissionKind::ALL
            .iter()
            .map(|k| none.decide("https://example.com/", Some(*k)))
            .collect();
        assert_eq!(decisions, vec![refused; PermissionKind::ALL.len()]);
    }

    #[test]
    fn a_grant_covers_its_site_and_kind_only() {
        let g = grants();
        assert!(g.decide("https://example.com/", Some(Camera)).allow);
        assert!(
            g.decide("https://www.example.com:8443/", Some(Notifications))
                .allow
        );
        assert_eq!(
            g.decide("https://example.com/", Some(Microphone)).rule,
            PermissionRule::NotGranted
        );
        assert!(
            !g.decide("https://example.com.evil.test/", Some(Camera))
                .allow
        );
        assert!(!g.decide("https://other.test/", Some(Camera)).allow);
    }

    #[test]
    fn insecure_unreadable_and_unknown_requests_are_refused() {
        let g = grants();
        for o in [
            "http://example.com/",
            "not a url",
            "data:text/html,x",
            "https://",
        ] {
            let d = g.decide(o, Some(Camera));
            assert_eq!(
                (d.allow, d.rule),
                (false, PermissionRule::NotSecureSite),
                "{o}"
            );
        }
        assert_eq!(
            g.decide("https://example.com/", None).rule,
            PermissionRule::UnknownKind
        );
        let names = [
            PermissionRule::Granted,
            PermissionRule::NotGranted,
            PermissionRule::NotSecureSite,
            PermissionRule::UnknownKind,
        ]
        .map(PermissionRule::as_str);
        assert_eq!(
            names.iter().collect::<std::collections::HashSet<_>>().len(),
            4
        );
    }
}
