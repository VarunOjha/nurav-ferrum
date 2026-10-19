//! The navigation policy (adr-0015; threat model in `wiki/quality/qual-security-testing-plan.md` §7).
//!
//! [`evaluate`] is a pure function: the same policy and request always give the same [`Decision`], nothing is read
//! from or written to the outside, and it never panics. Evaluation order:
//!
//! 1. **Read the address.** Too long, containing control characters or white space, or not parseable: deny
//!    (fail closed; threat T07).
//! 2. **Scheme.** `https` and `http` go on to the host checks. `about:blank` (and `about:srcdoc` in frames) is
//!    allowed. `data:` is allowed in frames only, `blob:` only from the page that created it. `javascript:`,
//!    `file:` and the browser's own pages are denied. Ferrum's own origin (`tauri:`, `http(s)://tauri.localhost`,
//!    ...) is denied for tabs (rule R4, threat T02). Every other scheme leaves the browser (threat T08): a few
//!    known-abused ones ([`RISKY_SCHEMES`]) are always denied, schemes missing from a non-empty
//!    `external_allowlist` are denied, and the rest are confirmed or denied per settings (owner answer Q-224: by
//!    default any type may be offered, always with the user's click).
//! 3. **Host.** The blocklist, the allowlist override (an allow rule strictly more specific than the block rule
//!    wins; equal specificity blocks) and the optional allowlist-only mode (threats T04 to T06).
//! 4. **Plain HTTP** is allowed with a "not secure" warning, or upgraded to HTTPS, per `http_policy` (owner answer
//!    Q-112: allow with a warning bar).
//!
//! Every decision carries the [`RuleId`] that produced it, for the audit log (p4.9).

use ferrum_core::config::{ExternalSchemes, HttpPolicy};
use url::Url;

use crate::rules::RuleList;

/// Longest address Ferrum evaluates (Chromium's own limit is 2 MiB); anything longer is denied.
pub const MAX_URL_BYTES: usize = 2 * 1024 * 1024;

/// Hosts that serve Ferrum's own pages and its bridge. A tab must never load them: a page there would be treated as
/// the trusted shell (rule R4).
const APP_HOSTS: &[&str] = &["tauri.localhost", "ipc.localhost", "asset.localhost"];

/// Schemes of Ferrum's own pages and bridge.
const APP_SCHEMES: &[&str] = &["tauri", "ipc", "asset"];

/// Schemes never loaded in a tab: script, local files and the browser's internal pages.
const FORBIDDEN_SCHEMES: &[&str] = &[
    "javascript",
    "file",
    "filesystem",
    "view-source",
    "chrome",
    "chrome-extension",
    "chrome-untrusted",
    "edge",
    "devtools",
    "ws",
    "wss",
];

/// Links to other apps that are refused without asking, because attackers have used them to make one click run or
/// install something (sources: `wiki/raw/research/p4-risky-uri-schemes.md`; Claude's proposal for the owner's review,
/// Q-224).
pub const RISKY_SCHEMES: &[&str] = &["ms-appinstaller", "ms-msdt", "search-ms", "ms-officecmd"];

/// The navigation posture, built from settings.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Policy {
    /// Hosts that are never loaded.
    pub blocklist: RuleList,
    /// Hosts that override a less specific block rule, and the only hosts allowed in allowlist-only mode.
    pub allowlist: RuleList,
    /// Only allowlisted hosts may load (adr-0015 rule 2, option B kept as a setting).
    pub allowlist_only: bool,
    /// What happens to `http:` addresses.
    pub http: HttpPolicy,
    /// What happens to links to other apps.
    pub external: ExternalSchemes,
    /// The only link types to other apps that may be offered (lower-case scheme names); empty means any type.
    pub external_allowlist: Vec<String>,
}

/// Where a navigation happens.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Context {
    /// The tab's main page (typed address, link, script, form).
    TopLevel,
    /// A redirect hop of a main-page navigation.
    Redirect,
    /// An iframe inside the tab.
    Frame,
    /// A pop-up or `target=_blank` link, about to become a new tab.
    NewWindow,
}

/// One navigation to decide on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Request<'a> {
    /// The address exactly as the browser reported it.
    pub url: &'a str,
    /// Where it happens.
    pub context: Context,
    /// The address of the page that started it, when known (used for `blob:` addresses).
    pub initiator: Option<&'a str>,
}

/// What Ferrum does.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Verdict {
    /// Load it.
    Allow,
    /// Load it and show the "not secure" bar (plain HTTP).
    AllowInsecure,
    /// Load this `https:` address instead.
    Upgrade(String),
    /// It leaves the browser: ask the user before handing it to Windows.
    Confirm,
    /// Do not load it.
    Deny,
}

/// Which rule decided. The names returned by [`RuleId::as_str`] are stable: they go into the audit log.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RuleId {
    /// Longer than [`MAX_URL_BYTES`].
    TooLong,
    /// Contains a control character or white space.
    BadCharacter,
    /// Not a parseable address.
    Unparseable,
    /// `javascript:`, `file:`, browser-internal pages and similar.
    ForbiddenScheme,
    /// Ferrum's own origin, which tabs may never load.
    AppOrigin,
    /// `about:blank`, or `about:srcdoc` in a frame.
    AboutBlank,
    /// Any other `about:` page.
    AboutOther,
    /// `data:` in a frame.
    DataInFrame,
    /// `data:` as a main page or pop-up.
    DataTopLevel,
    /// `blob:` from the page that created it.
    BlobSameOrigin,
    /// `blob:` from anywhere else, or with an unknown starter.
    BlobOtherOrigin,
    /// A link to another app, to be confirmed.
    ExternalConfirm,
    /// A link to another app, refused by settings.
    ExternalDenied,
    /// A link type that is always refused ([`RISKY_SCHEMES`]).
    ExternalRisky,
    /// A link type missing from the settings' list of allowed types.
    ExternalNotListed,
    /// A blocklist rule matched.
    Blocked,
    /// An allowlist rule more specific than the matching block rule.
    AllowOverride,
    /// Allowlist-only mode and no allow rule matched.
    NotAllowlisted,
    /// HTTPS, no rule against it.
    Https,
    /// Plain HTTP, allowed with the warning bar.
    HttpWarn,
    /// Plain HTTP, upgraded.
    HttpUpgrade,
    /// The benchmark-only ablation build let a web address load without the rules (p4.16; feature
    /// `bench-nosecurity`, never in a release artefact).
    #[cfg(feature = "bench-nosecurity")]
    BenchNoSecurity,
}

impl RuleId {
    /// Stable name for logs and tests.
    pub fn as_str(self) -> &'static str {
        match self {
            RuleId::TooLong => "url-too-long",
            RuleId::BadCharacter => "url-bad-character",
            RuleId::Unparseable => "url-unparseable",
            RuleId::ForbiddenScheme => "scheme-forbidden",
            RuleId::AppOrigin => "app-origin",
            RuleId::AboutBlank => "about-blank",
            RuleId::AboutOther => "about-other",
            RuleId::DataInFrame => "data-in-frame",
            RuleId::DataTopLevel => "data-top-level",
            RuleId::BlobSameOrigin => "blob-same-origin",
            RuleId::BlobOtherOrigin => "blob-other-origin",
            RuleId::ExternalConfirm => "external-confirm",
            RuleId::ExternalDenied => "external-denied",
            RuleId::ExternalRisky => "external-risky",
            RuleId::ExternalNotListed => "external-not-listed",
            RuleId::Blocked => "blocklist",
            RuleId::AllowOverride => "allowlist-override",
            RuleId::NotAllowlisted => "allowlist-only",
            RuleId::Https => "https",
            RuleId::HttpWarn => "http-warn",
            RuleId::HttpUpgrade => "http-upgrade",
            #[cfg(feature = "bench-nosecurity")]
            RuleId::BenchNoSecurity => BENCH_NOSECURITY_RULE,
        }
    }
}

/// The decision and why.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decision {
    /// What Ferrum does.
    pub verdict: Verdict,
    /// The rule that decided.
    pub rule: RuleId,
    /// The settings entry that matched (a blocklist or allowlist rule as written), when there is one.
    pub matched: Option<String>,
}

impl Decision {
    fn new(verdict: Verdict, rule: RuleId) -> Decision {
        Decision {
            verdict,
            rule,
            matched: None,
        }
    }

    fn deny(rule: RuleId) -> Decision {
        Decision::new(Verdict::Deny, rule)
    }

    /// Whether the address may load (with or without the warning bar, or after the upgrade).
    pub fn loads(&self) -> bool {
        matches!(
            self.verdict,
            Verdict::Allow | Verdict::AllowInsecure | Verdict::Upgrade(_)
        )
    }
}

/// The rule name of the ablation build (p4.16). Its text is the marker the p4.16 check looks for in a binary: present
/// in an ablation build, absent from the normal release build.
#[cfg(feature = "bench-nosecurity")]
pub const BENCH_NOSECURITY_RULE: &str = "bench-nosecurity-ablation-rule";

/// Whether this build is the benchmark-only ablation (feature `bench-nosecurity`, p4.16).
pub const fn is_bench_nosecurity() -> bool {
    cfg!(feature = "bench-nosecurity")
}

/// Ablation build only (p4.16): a web address (`http`, `https`, `about`, `data`, `blob`) loads without the blocklist,
/// allowlist, HTTP policy or address rules, so exp-security-overhead can compare a build without them. Not skipped even
/// here: Ferrum's own origin, the forbidden schemes (local files, script, browser pages) and links to other apps (they
/// still need the user's click), because they keep pages away from Ferrum and the PC rather than cost time; an
/// address that cannot be read also follows the normal rules. `None`: the normal rules decide.
#[cfg(feature = "bench-nosecurity")]
fn bench_nosecurity(request: &Request<'_>) -> Option<Decision> {
    let url = Url::parse(request.url).ok()?;
    let web = match url.scheme() {
        "http" | "https" => {
            let host = url.host_str().unwrap_or_default();
            !APP_HOSTS.contains(&host.strip_suffix('.').unwrap_or(host))
        }
        "about" | "data" | "blob" => true,
        _ => false,
    };
    web.then(|| Decision::new(Verdict::Allow, RuleId::BenchNoSecurity))
}

/// Decides one navigation. Never panics; anything it cannot read is denied.
pub fn evaluate(policy: &Policy, request: &Request<'_>) -> Decision {
    #[cfg(feature = "bench-nosecurity")]
    if let Some(d) = bench_nosecurity(request) {
        return d;
    }
    let raw = request.url;
    if raw.len() > MAX_URL_BYTES {
        return Decision::deny(RuleId::TooLong);
    }
    if raw.chars().any(|c| c.is_control() || c.is_whitespace()) {
        return Decision::deny(RuleId::BadCharacter);
    }
    let Ok(url) = Url::parse(raw) else {
        return Decision::deny(RuleId::Unparseable);
    };
    let frame = request.context == Context::Frame;
    match url.scheme() {
        "https" | "http" => web(policy, &url),
        "about" => match url.path() {
            "blank" => Decision::new(Verdict::Allow, RuleId::AboutBlank),
            "srcdoc" if frame => Decision::new(Verdict::Allow, RuleId::AboutBlank),
            _ => Decision::deny(RuleId::AboutOther),
        },
        "data" if frame => Decision::new(Verdict::Allow, RuleId::DataInFrame),
        "data" => Decision::deny(RuleId::DataTopLevel),
        "blob" => blob(&url, request.initiator),
        s if APP_SCHEMES.contains(&s) => Decision::deny(RuleId::AppOrigin),
        s if FORBIDDEN_SCHEMES.contains(&s) => Decision::deny(RuleId::ForbiddenScheme),
        s if RISKY_SCHEMES.contains(&s) => Decision::deny(RuleId::ExternalRisky),
        s if !policy.external_allowlist.is_empty()
            && !policy.external_allowlist.iter().any(|a| a == s) =>
        {
            Decision::deny(RuleId::ExternalNotListed)
        }
        _ => match policy.external {
            ExternalSchemes::Confirm => Decision::new(Verdict::Confirm, RuleId::ExternalConfirm),
            ExternalSchemes::Deny => Decision::deny(RuleId::ExternalDenied),
        },
    }
}

/// Decides one network request of a tab (p5.15, owner answer Q-229): any request a page or its frames make (the
/// page itself, frames, images, scripts, fetches), before it is sent. Only `https:` and `http:` addresses are
/// decided: a request to a blocked host is refused (unless a more specific allowlist entry overrides it, as for
/// navigations), and one whose address cannot be read is refused (fail closed). Every other address (`data:`, `blob:`,
/// Ferrum's own) is left to the navigation rules and returns `None`, as do allowed requests. The allowlist-only mode
/// is not applied here: it limits which pages open, not what an allowed page loads.
pub fn evaluate_resource(policy: &Policy, url: &str) -> Option<Decision> {
    #[cfg(feature = "bench-nosecurity")]
    if bench_nosecurity(&Request {
        url,
        context: Context::TopLevel,
        initiator: None,
    })
    .is_some()
    {
        return None;
    }
    let lower = url.get(..8).unwrap_or(url).to_ascii_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) {
        return None;
    }
    if url.len() > MAX_URL_BYTES {
        return Some(Decision::deny(RuleId::TooLong));
    }
    let Ok(parsed) = Url::parse(url) else {
        return Some(Decision::deny(RuleId::Unparseable));
    };
    let host = parsed.host_str().unwrap_or_default();
    let host = host.strip_suffix('.').unwrap_or(host);
    let block = policy.blocklist.best_match(host)?;
    match policy.allowlist.best_match(host) {
        Some(a) if a.specificity() > block.specificity() => None,
        _ => Some(Decision {
            verdict: Verdict::Deny,
            rule: RuleId::Blocked,
            matched: Some(block.text().to_string()),
        }),
    }
}

/// `blob:` addresses carry the origin of the page that made them; only that origin may open them.
fn blob(url: &Url, initiator: Option<&str>) -> Decision {
    let origin = url.origin();
    let same = origin.is_tuple()
        && initiator
            .and_then(|i| Url::parse(i).ok())
            .is_some_and(|i| i.origin() == origin);
    if same {
        Decision::new(Verdict::Allow, RuleId::BlobSameOrigin)
    } else {
        Decision::deny(RuleId::BlobOtherOrigin)
    }
}

/// Host and scheme checks for `https:` and `http:`.
fn web(policy: &Policy, url: &Url) -> Decision {
    // The URL parser guarantees a non-empty host for http(s) (tested in tests/random_inputs.rs).
    let host = url.host_str().unwrap_or_default();
    let host = host.strip_suffix('.').unwrap_or(host);
    if APP_HOSTS.contains(&host) {
        return Decision::deny(RuleId::AppOrigin);
    }
    let block = policy.blocklist.best_match(host);
    let allow = policy.allowlist.best_match(host);
    if let Some(b) = block {
        return match allow {
            Some(a) if a.specificity() > b.specificity() => {
                web_scheme(policy, url, RuleId::AllowOverride, a.text())
            }
            _ => Decision {
                verdict: Verdict::Deny,
                rule: RuleId::Blocked,
                matched: Some(b.text().to_string()),
            },
        };
    }
    match allow {
        Some(a) => web_scheme(policy, url, RuleId::AllowOverride, a.text()),
        None if policy.allowlist_only => Decision::deny(RuleId::NotAllowlisted),
        None => web_scheme(policy, url, RuleId::Https, ""),
    }
}

/// The final step for an address whose host may load: HTTPS as is, HTTP per `http_policy`. `rule` and `matched` say
/// why the host may load (an allow rule, or no rule at all).
fn web_scheme(policy: &Policy, url: &Url, rule: RuleId, matched: &str) -> Decision {
    let matched = (!matched.is_empty()).then(|| matched.to_string());
    if url.scheme() == "https" {
        return Decision {
            verdict: Verdict::Allow,
            rule,
            matched,
        };
    }
    match policy.http {
        HttpPolicy::Warn => Decision {
            verdict: Verdict::AllowInsecure,
            rule: if matched.is_some() {
                rule
            } else {
                RuleId::HttpWarn
            },
            matched,
        },
        HttpPolicy::Upgrade => {
            let mut upgraded = url.clone();
            // http -> https is always a valid scheme change for the URL parser. Port 80 never survives parsing (it is
            // http's default), so the upgraded address uses 443 unless the page named another port.
            let _ = upgraded.set_scheme("https");
            Decision {
                verdict: Verdict::Upgrade(upgraded.to_string()),
                rule: if matched.is_some() {
                    rule
                } else {
                    RuleId::HttpUpgrade
                },
                matched,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy(block: &[&str], allow: &[&str]) -> Policy {
        Policy {
            blocklist: RuleList::parse(block).unwrap(),
            allowlist: RuleList::parse(allow).unwrap(),
            ..Policy::default()
        }
    }

    fn at(url: &str, context: Context) -> Request<'_> {
        Request {
            url,
            context,
            initiator: None,
        }
    }

    fn top(url: &str) -> Request<'_> {
        at(url, Context::TopLevel)
    }

    /// (address, context, expected verdict, expected rule): one row per rule of the policy.
    #[test]
    fn table_of_rules_with_default_settings() {
        let warn = Policy {
            http: HttpPolicy::Warn,
            ..policy(&["blocked.test"], &[])
        };
        use Context::*;
        let rows: &[(&str, Context, Verdict, RuleId)] = &[
            (
                "https://example.org/",
                TopLevel,
                Verdict::Allow,
                RuleId::Https,
            ),
            (
                "https://example.org/",
                Redirect,
                Verdict::Allow,
                RuleId::Https,
            ),
            (
                "https://example.org/",
                NewWindow,
                Verdict::Allow,
                RuleId::Https,
            ),
            (
                "http://example.org/",
                TopLevel,
                Verdict::AllowInsecure,
                RuleId::HttpWarn,
            ),
            (
                "https://blocked.test/",
                Frame,
                Verdict::Deny,
                RuleId::Blocked,
            ),
            ("about:blank", TopLevel, Verdict::Allow, RuleId::AboutBlank),
            ("about:srcdoc", Frame, Verdict::Allow, RuleId::AboutBlank),
            ("about:srcdoc", TopLevel, Verdict::Deny, RuleId::AboutOther),
            (
                "about:settings",
                TopLevel,
                Verdict::Deny,
                RuleId::AboutOther,
            ),
            (
                "data:text/html,hi",
                Frame,
                Verdict::Allow,
                RuleId::DataInFrame,
            ),
            (
                "data:text/html,hi",
                TopLevel,
                Verdict::Deny,
                RuleId::DataTopLevel,
            ),
            (
                "data:text/html,hi",
                NewWindow,
                Verdict::Deny,
                RuleId::DataTopLevel,
            ),
            (
                "javascript:alert(1)",
                TopLevel,
                Verdict::Deny,
                RuleId::ForbiddenScheme,
            ),
            (
                "javascript:alert(1)",
                Frame,
                Verdict::Deny,
                RuleId::ForbiddenScheme,
            ),
            (
                "file:///C:/Windows/win.ini",
                TopLevel,
                Verdict::Deny,
                RuleId::ForbiddenScheme,
            ),
            (
                "view-source:https://example.org/",
                TopLevel,
                Verdict::Deny,
                RuleId::ForbiddenScheme,
            ),
            (
                "edge://settings",
                TopLevel,
                Verdict::Deny,
                RuleId::ForbiddenScheme,
            ),
            (
                "tauri://localhost/",
                TopLevel,
                Verdict::Deny,
                RuleId::AppOrigin,
            ),
            (
                "http://tauri.localhost/",
                TopLevel,
                Verdict::Deny,
                RuleId::AppOrigin,
            ),
            (
                "https://tauri.localhost./index.html",
                Redirect,
                Verdict::Deny,
                RuleId::AppOrigin,
            ),
            (
                "http://ipc.localhost/plugin:x",
                Frame,
                Verdict::Deny,
                RuleId::AppOrigin,
            ),
            (
                "mailto:a@example.org",
                TopLevel,
                Verdict::Confirm,
                RuleId::ExternalConfirm,
            ),
            (
                "ferrum-test-proto:x",
                Frame,
                Verdict::Confirm,
                RuleId::ExternalConfirm,
            ),
            (
                "blob:https://example.org/1",
                TopLevel,
                Verdict::Deny,
                RuleId::BlobOtherOrigin,
            ),
            ("", TopLevel, Verdict::Deny, RuleId::Unparseable),
            ("not a url", TopLevel, Verdict::Deny, RuleId::BadCharacter),
            (
                "https://exa mple.org/",
                TopLevel,
                Verdict::Deny,
                RuleId::BadCharacter,
            ),
            (
                "https://example.org/\n",
                TopLevel,
                Verdict::Deny,
                RuleId::BadCharacter,
            ),
            ("example.org", TopLevel, Verdict::Deny, RuleId::Unparseable),
            ("https://", TopLevel, Verdict::Deny, RuleId::Unparseable),
            ("http://[::1", TopLevel, Verdict::Deny, RuleId::Unparseable),
            (
                "https://exa%zzmple.org/",
                TopLevel,
                Verdict::Deny,
                RuleId::Unparseable,
            ),
        ];
        for (url, ctx, verdict, rule) in rows {
            let d = evaluate(&warn, &at(url, *ctx));
            assert_eq!((&d.verdict, d.rule), (verdict, *rule), "{url:?} in {ctx:?}");
        }
    }

    #[test]
    fn blocklist_matches_every_spelling_of_a_host() {
        let p = policy(&["blocked.test", "192.0.2.7"], &[]);
        for url in [
            "https://blocked.test/",
            "https://BLOCKED.test/path?q=1#f",
            "https://a.b.blocked.test/",
            "https://blocked.test./",
            "https://user:pw@blocked.test/",
            "https://blocked.test:8443/",
            "http://192.0.2.7/",
            "http://3221225991/",
        ] {
            let d = evaluate(&p, &top(url));
            assert_eq!(d.verdict, Verdict::Deny, "{url}");
            assert_eq!(d.rule, RuleId::Blocked, "{url}");
            assert!(d.matched.is_some(), "{url}");
            assert!(!d.loads());
        }
        assert!(evaluate(&p, &top("https://notblocked.test/")).loads());
    }

    #[test]
    fn international_hosts_match_in_both_forms() {
        let p = policy(&["bücher.example"], &[]);
        assert_eq!(
            evaluate(&p, &top("https://bücher.example/")).rule,
            RuleId::Blocked
        );
        assert_eq!(
            evaluate(&p, &top("https://xn--bcher-kva.example/")).rule,
            RuleId::Blocked
        );
    }

    #[test]
    fn allowlist_more_specific_than_block_wins() {
        let p = policy(&["example.com"], &["docs.example.com"]);
        let d = evaluate(&p, &top("https://docs.example.com/guide"));
        assert_eq!(d.verdict, Verdict::Allow);
        assert_eq!(d.rule, RuleId::AllowOverride);
        assert_eq!(d.matched.as_deref(), Some("docs.example.com"));
        assert_eq!(
            evaluate(&p, &top("https://a.docs.example.com/")).rule,
            RuleId::AllowOverride
        );
        assert_eq!(
            evaluate(&p, &top("https://www.example.com/")).rule,
            RuleId::Blocked
        );
    }

    #[test]
    fn equal_specificity_blocks() {
        let p = policy(&["example.com"], &["example.com"]);
        let d = evaluate(&p, &top("https://example.com/"));
        assert_eq!((d.verdict, d.rule), (Verdict::Deny, RuleId::Blocked));
        let p = policy(&["=www.example.com"], &["=www.example.com"]);
        assert_eq!(
            evaluate(&p, &top("https://www.example.com/")).rule,
            RuleId::Blocked
        );
        // A less specific allow rule never overrides a block rule.
        let p = policy(&["docs.example.com"], &["example.com"]);
        assert_eq!(
            evaluate(&p, &top("https://docs.example.com/")).rule,
            RuleId::Blocked
        );
    }

    #[test]
    fn allowlist_only_mode_denies_everything_not_listed() {
        let p = Policy {
            allowlist_only: true,
            ..policy(&[], &["example.org"])
        };
        let d = evaluate(&p, &top("https://other.test/"));
        assert_eq!((d.verdict, d.rule), (Verdict::Deny, RuleId::NotAllowlisted));
        assert_eq!(
            evaluate(&p, &top("https://www.example.org/")).rule,
            RuleId::AllowOverride
        );
        // Non-web addresses keep their own rules in allowlist-only mode.
        assert_eq!(evaluate(&p, &top("about:blank")).rule, RuleId::AboutBlank);
        assert_eq!(
            evaluate(&p, &top("javascript:x")).rule,
            RuleId::ForbiddenScheme
        );
    }

    #[test]
    fn allowlist_without_block_rule_still_allows() {
        let p = policy(&[], &["example.org"]);
        let d = evaluate(&p, &top("https://example.org/"));
        assert_eq!((d.verdict, d.rule), (Verdict::Allow, RuleId::AllowOverride));
    }

    #[test]
    fn http_policy_warn_or_upgrade() {
        let mut p = policy(&[], &["listed.test"]);
        p.http = HttpPolicy::Warn;
        assert_eq!(
            evaluate(&p, &top("http://a.test/")).verdict,
            Verdict::AllowInsecure
        );
        let d = evaluate(&p, &top("http://listed.test/"));
        assert_eq!(
            (d.verdict, d.rule),
            (Verdict::AllowInsecure, RuleId::AllowOverride)
        );
        p.http = HttpPolicy::Upgrade;
        let d = evaluate(&p, &top("http://a.test:80/x?y#z"));
        assert_eq!(d.verdict, Verdict::Upgrade("https://a.test/x?y#z".into()));
        assert_eq!(d.rule, RuleId::HttpUpgrade);
        assert!(d.loads());
        let d = evaluate(&p, &top("http://a.test:8080/"));
        assert_eq!(d.verdict, Verdict::Upgrade("https://a.test:8080/".into()));
        let d = evaluate(&p, &top("http://listed.test/"));
        assert_eq!(d.verdict, Verdict::Upgrade("https://listed.test/".into()));
        assert_eq!(d.rule, RuleId::AllowOverride);
        // A blocked host is never upgraded.
        p.blocklist = RuleList::parse(&["blocked.test"]).unwrap();
        assert_eq!(
            evaluate(&p, &top("http://blocked.test/")).verdict,
            Verdict::Deny
        );
    }

    #[test]
    fn external_schemes_follow_settings() {
        let mut p = Policy::default();
        assert_eq!(
            evaluate(&p, &top("mailto:x@example.org")).verdict,
            Verdict::Confirm
        );
        p.external = ExternalSchemes::Deny;
        let d = evaluate(&p, &top("mailto:x@example.org"));
        assert_eq!((d.verdict, d.rule), (Verdict::Deny, RuleId::ExternalDenied));
        // Ferrum's own and forbidden schemes are denied, never treated as other apps.
        p.external = ExternalSchemes::Confirm;
        assert_eq!(
            evaluate(&p, &top("asset://localhost/x")).rule,
            RuleId::AppOrigin
        );
        assert_eq!(
            evaluate(&p, &top("wss://example.org/")).rule,
            RuleId::ForbiddenScheme
        );
    }

    #[test]
    fn risky_and_unlisted_link_types_are_refused() {
        let mut p = Policy::default();
        for u in [
            "ms-msdt:/id%20PCWDiagnostic",
            "MS-MSDT:x",
            "search-ms:query=x&crumb=location:%5C%5Chost%5Cshare",
            "ms-appinstaller:?source=https://example.org/x.msix",
            "ms-officecmd:{}",
        ] {
            let d = evaluate(&p, &top(u));
            assert_eq!(
                (d.verdict, d.rule),
                (Verdict::Deny, RuleId::ExternalRisky),
                "{u}"
            );
        }
        // Any other type is offered by default (Q-224) ...
        assert_eq!(
            evaluate(&p, &top("ferrum-test:x")).verdict,
            Verdict::Confirm
        );
        // ... and only the listed types once the list is not empty; the risky ones stay refused.
        p.external_allowlist = vec!["mailto".into(), "ms-msdt".into()];
        assert_eq!(
            evaluate(&p, &top("mailto:a@example.org")).verdict,
            Verdict::Confirm
        );
        let d = evaluate(&p, &top("ferrum-test:x"));
        assert_eq!(
            (d.verdict, d.rule),
            (Verdict::Deny, RuleId::ExternalNotListed)
        );
        assert_eq!(evaluate(&p, &top("ms-msdt:x")).rule, RuleId::ExternalRisky);
    }

    #[test]
    fn blob_only_from_the_page_that_made_it() {
        let p = Policy::default();
        let req = |initiator| Request {
            url: "blob:https://example.org/0b1c",
            context: Context::TopLevel,
            initiator,
        };
        assert_eq!(
            evaluate(&p, &req(Some("https://example.org/page"))).rule,
            RuleId::BlobSameOrigin
        );
        assert_eq!(
            evaluate(&p, &req(Some("https://evil.test/"))).rule,
            RuleId::BlobOtherOrigin
        );
        assert_eq!(
            evaluate(&p, &req(Some("not a url"))).rule,
            RuleId::BlobOtherOrigin
        );
        assert_eq!(evaluate(&p, &req(None)).rule, RuleId::BlobOtherOrigin);
        // A blob with an opaque origin matches nobody.
        let opaque = Request {
            url: "blob:null/1",
            context: Context::TopLevel,
            initiator: Some("null"),
        };
        assert_eq!(evaluate(&p, &opaque).rule, RuleId::BlobOtherOrigin);
    }

    #[test]
    fn too_long_addresses_are_denied() {
        let long = format!("https://example.org/{}", "a".repeat(MAX_URL_BYTES));
        assert_eq!(
            evaluate(&Policy::default(), &top(&long)).rule,
            RuleId::TooLong
        );
        let fits = format!("https://example.org/{}", "a".repeat(1000));
        assert!(evaluate(&Policy::default(), &top(&fits)).loads());
    }

    #[test]
    fn rule_names_are_stable_and_distinct() {
        use std::collections::HashSet;
        let all = [
            RuleId::TooLong,
            RuleId::BadCharacter,
            RuleId::Unparseable,
            RuleId::ForbiddenScheme,
            RuleId::AppOrigin,
            RuleId::AboutBlank,
            RuleId::AboutOther,
            RuleId::DataInFrame,
            RuleId::DataTopLevel,
            RuleId::BlobSameOrigin,
            RuleId::BlobOtherOrigin,
            RuleId::ExternalConfirm,
            RuleId::ExternalDenied,
            RuleId::ExternalRisky,
            RuleId::ExternalNotListed,
            RuleId::Blocked,
            RuleId::AllowOverride,
            RuleId::NotAllowlisted,
            RuleId::Https,
            RuleId::HttpWarn,
            RuleId::HttpUpgrade,
        ];
        let names: HashSet<_> = all.iter().map(|r| r.as_str()).collect();
        assert_eq!(names.len(), all.len());
        assert!(
            names
                .iter()
                .all(|n| n.chars().all(|c| c.is_ascii_lowercase() || c == '-'))
        );
        assert_eq!(RuleId::Blocked.as_str(), "blocklist");
    }
}
