//! Permission decisions (p4.5, p4.20; adr-0015, adr-0034, threat model in `wiki/quality/qual-security-testing-plan.md`
//! §7).
//!
//! A web page may ask for the camera, the microphone, the location, notifications, the clipboard and more. Nothing is
//! allowed until the user chose it: a kind the site was granted in settings (`[[sites]] permissions`, "Always allow")
//! or allowed in this tab for now ("Allow this time") is allowed; for the five kinds in
//! [`PermissionKind::ASKED`] Ferrum otherwise **asks** the user (p4.20, adr-0034); everything else is refused.
//! No question, a refusal at once, for: a page that is not `https:` (`localhost` included), a frame of another site
//! than the tab's page, a kind the site has as "never" (`[[sites]] never`), a kind refused in this tab for now, and a
//! site that is quiet after closed questions (`[[sites]] closed`).
//!
//! Sites are compared by their registrable domain (`ferrum_core::profiles::site_key`, the same key per-site profiles
//! use), so a grant for `example.com` covers `www.example.com` but never `example.com.evil.test`. Like
//! [`crate::evaluate`], this is pure and never panics.

use ferrum_core::config::{PermissionKind, SiteSettings};
use ferrum_core::profiles::site_key;
use url::Url;

/// Why a permission was allowed, refused or asked about. The names from [`PermissionRule::as_str`] go into the log.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionRule {
    /// The site has a grant for this kind ("Always allow").
    Granted,
    /// Allowed in this tab for now ("Allow this time").
    AllowedOnce,
    /// No grant for this kind, and Ferrum does not ask about it.
    NotGranted,
    /// The page is not an `https:` page with a site (unreadable, `http:`, `data:`, ...): never granted.
    NotSecureSite,
    /// WebView2 reported a kind Ferrum does not know: refused.
    UnknownKind,
    /// A frame of another site than the tab's page asked: refused without a question.
    OtherSiteFrame,
    /// The site has this kind as "never" ("Never allow").
    Never,
    /// Refused in this tab for now ("Block" in a private tab).
    BlockedOnce,
    /// The site is quiet for this kind after closed questions.
    Quiet,
    /// Nothing decides it: the user is asked.
    Ask,
}

impl PermissionRule {
    /// Stable name for logs and tests.
    pub fn as_str(self) -> &'static str {
        match self {
            PermissionRule::Granted => "permission-granted",
            PermissionRule::AllowedOnce => "permission-allowed-once",
            PermissionRule::NotGranted => "permission-not-granted",
            PermissionRule::NotSecureSite => "permission-not-secure-site",
            PermissionRule::UnknownKind => "permission-unknown-kind",
            PermissionRule::OtherSiteFrame => "permission-other-site-frame",
            PermissionRule::Never => "permission-never",
            PermissionRule::BlockedOnce => "permission-blocked-once",
            PermissionRule::Quiet => "permission-quiet",
            PermissionRule::Ask => "permission-ask",
        }
    }
}

/// What happens to one permission request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionVerdict {
    /// The page gets it.
    Allow,
    /// The page is refused.
    Deny,
    /// The user is asked; the request waits for the answer.
    Ask,
}

/// The decision on one permission request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PermissionDecision {
    /// Allowed, refused or asked.
    pub verdict: PermissionVerdict,
    /// Why.
    pub rule: PermissionRule,
}

impl PermissionDecision {
    /// Whether the page gets the permission now.
    pub fn allow(&self) -> bool {
        self.verdict == PermissionVerdict::Allow
    }
}

/// What the tab knows when a request comes in.
#[derive(Debug, Clone, Copy, Default)]
pub struct PermissionContext<'a> {
    /// The address of the tab's page (the top page, not the frame).
    pub page: &'a str,
    /// Now, in seconds since 1970 (UTC), for quiet times.
    pub now: u64,
    /// This tab's answers for now ("Allow this time", private "Block"): kind and whether it was allowed. They hold
    /// for the tab's current site only; the caller forgets them when the tab leaves the site.
    pub once: &'a [(PermissionKind, bool)],
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SiteAnswers {
    site: String,
    allow: Vec<PermissionKind>,
    never: Vec<PermissionKind>,
    quiet: Vec<(PermissionKind, u64)>,
}

/// The per-site answers, built from settings.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Grants {
    sites: Vec<SiteAnswers>,
}

/// The site of an `https:` address, or `None`.
fn secure_site(address: &str) -> Option<String> {
    Url::parse(address)
        .ok()
        .filter(|u| u.scheme() == "https")
        .and_then(|u| site_key(u.as_str()))
}

impl Grants {
    /// The answers in the settings' `[[sites]]` entries.
    pub fn from_sites(sites: &[SiteSettings]) -> Grants {
        Grants {
            sites: sites
                .iter()
                .filter(|s| {
                    !s.permissions.is_empty() || !s.never.is_empty() || !s.closed.is_empty()
                })
                .map(|s| SiteAnswers {
                    site: s.site.clone(),
                    allow: s.permissions.clone(),
                    never: s.never.clone(),
                    quiet: s.closed.iter().map(|c| (c.kind, c.quiet_until)).collect(),
                })
                .collect(),
        }
    }

    /// Decides a request for `kind` (`None`: a kind WebView2 reported that Ferrum does not know) by the page or frame
    /// at `origin`, in a tab described by `cx`.
    pub fn decide(
        &self,
        origin: &str,
        kind: Option<PermissionKind>,
        cx: &PermissionContext<'_>,
    ) -> PermissionDecision {
        let refuse = |rule| PermissionDecision {
            verdict: PermissionVerdict::Deny,
            rule,
        };
        let Some(kind) = kind else {
            return refuse(PermissionRule::UnknownKind);
        };
        let Some(site) = secure_site(origin) else {
            return refuse(PermissionRule::NotSecureSite);
        };
        // A frame of another site (or a page that is not https itself) gets no question: the user would be asked
        // about a site they did not open.
        if secure_site(cx.page).as_deref() != Some(site.as_str()) {
            return refuse(PermissionRule::OtherSiteFrame);
        }
        let answers = self.sites.iter().find(|s| s.site == site);
        if answers.is_some_and(|a| a.never.contains(&kind)) {
            return refuse(PermissionRule::Never);
        }
        if answers.is_some_and(|a| a.allow.contains(&kind)) {
            return PermissionDecision {
                verdict: PermissionVerdict::Allow,
                rule: PermissionRule::Granted,
            };
        }
        match cx.once.iter().find(|(k, _)| *k == kind) {
            Some((_, true)) => {
                return PermissionDecision {
                    verdict: PermissionVerdict::Allow,
                    rule: PermissionRule::AllowedOnce,
                };
            }
            Some((_, false)) => return refuse(PermissionRule::BlockedOnce),
            None => {}
        }
        if !kind.asked() {
            return refuse(PermissionRule::NotGranted);
        }
        let quiet = answers.is_some_and(|a| {
            a.quiet
                .iter()
                .any(|(k, until)| *k == kind && *until > cx.now)
        });
        if quiet {
            return refuse(PermissionRule::Quiet);
        }
        PermissionDecision {
            verdict: PermissionVerdict::Ask,
            rule: PermissionRule::Ask,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use PermissionKind::*;
    use ferrum_core::config::ClosedQuestion;

    const PAGE: &str = "https://example.com/call";

    fn grants() -> Grants {
        Grants::from_sites(&[
            SiteSettings {
                site: "example.com".into(),
                permissions: vec![Camera, Notifications, MidiSystemExclusiveMessages],
                never: vec![Geolocation],
                closed: vec![
                    ClosedQuestion {
                        kind: ClipboardRead,
                        count: 3,
                        quiet_until: 1_000,
                    },
                    ClosedQuestion {
                        kind: Microphone,
                        count: 1,
                        quiet_until: 0,
                    },
                ],
                ..Default::default()
            },
            SiteSettings {
                site: "other.test".into(),
                profile: Some("work".into()),
                ..Default::default()
            },
        ])
    }

    fn cx(page: &str) -> PermissionContext<'_> {
        PermissionContext {
            page,
            now: 500,
            once: &[],
        }
    }

    fn rule(
        g: &Grants,
        origin: &str,
        kind: PermissionKind,
        cx: &PermissionContext<'_>,
    ) -> (PermissionVerdict, PermissionRule) {
        let d = g.decide(origin, Some(kind), cx);
        (d.verdict, d.rule)
    }

    #[test]
    fn the_five_kinds_are_asked_and_every_other_kind_is_refused_by_default() {
        let none = Grants::default();
        for k in PermissionKind::ALL {
            let d = none.decide(PAGE, Some(k), &cx(PAGE));
            if k.asked() {
                assert_eq!(
                    (d.verdict, d.rule),
                    (PermissionVerdict::Ask, PermissionRule::Ask),
                    "{k:?}"
                );
            } else {
                assert_eq!(
                    (d.verdict, d.rule),
                    (PermissionVerdict::Deny, PermissionRule::NotGranted),
                    "{k:?}"
                );
            }
            assert!(!d.allow());
        }
        assert_eq!(PermissionKind::ASKED.len(), 5);
    }

    #[test]
    fn always_and_never_cover_their_site_and_kind_only() {
        let g = grants();
        assert_eq!(
            rule(&g, PAGE, Camera, &cx(PAGE)),
            (PermissionVerdict::Allow, PermissionRule::Granted)
        );
        assert!(
            g.decide(
                "https://www.example.com:8443/",
                Some(Notifications),
                &cx("https://example.com/")
            )
            .allow()
        );
        // A granted kind Ferrum does not ask about.
        assert!(
            g.decide(PAGE, Some(MidiSystemExclusiveMessages), &cx(PAGE))
                .allow()
        );
        assert_eq!(
            rule(&g, PAGE, Geolocation, &cx(PAGE)),
            (PermissionVerdict::Deny, PermissionRule::Never)
        );
        // Another site: nothing remembered, so it is asked.
        let other = "https://other.test/";
        assert_eq!(
            rule(&g, other, Camera, &cx(other)),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
        assert_eq!(
            rule(&g, other, Geolocation, &cx(other)),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
        let evil = "https://example.com.evil.test/";
        assert_eq!(
            rule(&g, evil, Camera, &cx(evil)),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
    }

    #[test]
    fn this_time_answers_hold_in_the_tab_only() {
        let g = grants();
        let once = [(Microphone, true), (ClipboardRead, false)];
        let tab = PermissionContext {
            page: PAGE,
            now: 2_000,
            once: &once,
        };
        assert_eq!(
            rule(&g, PAGE, Microphone, &tab),
            (PermissionVerdict::Allow, PermissionRule::AllowedOnce)
        );
        assert_eq!(
            rule(&g, PAGE, ClipboardRead, &tab),
            (PermissionVerdict::Deny, PermissionRule::BlockedOnce)
        );
        // Never wins over a this-time answer; Always needs none.
        let once = [(Geolocation, true)];
        let tab = PermissionContext { once: &once, ..tab };
        assert_eq!(
            rule(&g, PAGE, Geolocation, &tab),
            (PermissionVerdict::Deny, PermissionRule::Never)
        );
        // A kind Ferrum does not ask about cannot be allowed for now either.
        let once = [(LocalFonts, false)];
        let tab = PermissionContext { once: &once, ..tab };
        assert_eq!(
            rule(&g, PAGE, LocalFonts, &tab),
            (PermissionVerdict::Deny, PermissionRule::BlockedOnce)
        );
        assert_eq!(
            rule(&g, PAGE, WindowManagement, &tab),
            (PermissionVerdict::Deny, PermissionRule::NotGranted)
        );
    }

    #[test]
    fn a_site_is_quiet_until_its_time_has_passed() {
        let g = grants();
        // quiet_until 1000: quiet at 500 and at 999, asked again at 1000.
        for now in [500, 999] {
            let c = PermissionContext {
                page: PAGE,
                now,
                once: &[],
            };
            assert_eq!(
                rule(&g, PAGE, ClipboardRead, &c),
                (PermissionVerdict::Deny, PermissionRule::Quiet),
                "{now}"
            );
        }
        let c = PermissionContext {
            page: PAGE,
            now: 1_000,
            once: &[],
        };
        assert_eq!(
            rule(&g, PAGE, ClipboardRead, &c),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
        // One closed question (no quiet time yet): still asked.
        assert_eq!(
            rule(&g, PAGE, Microphone, &cx(PAGE)),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
    }

    #[test]
    fn frames_of_another_site_and_insecure_pages_get_no_question() {
        let g = grants();
        // A frame of other.test inside example.com, and the reverse.
        assert_eq!(
            rule(&g, "https://other.test/widget", Camera, &cx(PAGE)),
            (PermissionVerdict::Deny, PermissionRule::OtherSiteFrame)
        );
        assert_eq!(
            rule(&g, PAGE, Camera, &cx("https://other.test/")),
            (PermissionVerdict::Deny, PermissionRule::OtherSiteFrame)
        );
        // A frame of the same site (another host of it) is asked like its page.
        assert_eq!(
            rule(
                &g,
                "https://media.other.test/",
                Camera,
                &cx("https://other.test/")
            ),
            (PermissionVerdict::Ask, PermissionRule::Ask)
        );
        // An https frame inside an http page.
        assert_eq!(
            rule(&g, PAGE, Camera, &cx("http://example.com/")),
            (PermissionVerdict::Deny, PermissionRule::OtherSiteFrame)
        );
        for o in [
            "http://example.com/",
            "not a url",
            "data:text/html,x",
            "https://",
        ] {
            assert_eq!(
                rule(&g, o, Camera, &cx(o)),
                (PermissionVerdict::Deny, PermissionRule::NotSecureSite),
                "{o}"
            );
        }
        assert_eq!(
            g.decide(PAGE, None, &cx(PAGE)).rule,
            PermissionRule::UnknownKind
        );
    }

    #[test]
    fn rule_names_are_distinct() {
        let names = [
            PermissionRule::Granted,
            PermissionRule::AllowedOnce,
            PermissionRule::NotGranted,
            PermissionRule::NotSecureSite,
            PermissionRule::UnknownKind,
            PermissionRule::OtherSiteFrame,
            PermissionRule::Never,
            PermissionRule::BlockedOnce,
            PermissionRule::Quiet,
            PermissionRule::Ask,
        ]
        .map(PermissionRule::as_str);
        assert_eq!(
            names.iter().collect::<std::collections::HashSet<_>>().len(),
            10
        );
    }
}
