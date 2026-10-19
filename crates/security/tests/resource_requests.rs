//! p5.15 (owner answer Q-229): the request check. A request to a blocked host is refused whatever kind of resource
//! it is for and whatever the rest of the address says; an allowlist entry more specific than the block rule lets it
//! through; an http(s) address that cannot be read is refused; other schemes are not decided here; the check never
//! panics on random input.

use ferrum_security::{Policy, RuleId, RuleList, Verdict, evaluate_resource};
use proptest::prelude::*;

fn policy() -> Policy {
    Policy {
        blocklist: RuleList::parse(&["blocked.test", "=127.0.0.1"]).unwrap(),
        allowlist: RuleList::parse(&["=open.blocked.test"]).unwrap(),
        allowlist_only: true,
        ..Policy::default()
    }
}

#[test]
fn requests_to_blocked_hosts_are_refused_and_others_pass() {
    let p = policy();
    for url in [
        "https://blocked.test/",
        "https://ads.blocked.test/pixel.gif?x=1",
        "HTTPS://BLOCKED.TEST/a.js",
        "http://blocked.test:8080/",
        "https://blocked.test./trailing-dot",
        "https://127.0.0.1:8443/counted/x",
        "https://user:pw@blocked.test/",
    ] {
        let d = evaluate_resource(&p, url).unwrap_or_else(|| panic!("{url} passed"));
        assert_eq!(
            (d.verdict, d.rule),
            (Verdict::Deny, RuleId::Blocked),
            "{url}"
        );
    }
    assert_eq!(
        evaluate_resource(&p, "https://ads.blocked.test/")
            .unwrap()
            .matched
            .as_deref(),
        Some("blocked.test")
    );
    for url in [
        "https://open.blocked.test/", // a more specific allow entry overrides the block rule
        "https://example.org/",       // allowlist-only does not limit what a page loads
        "https://127.0.0.2/",
        "https://notblocked.test/",
        "data:image/png;base64,AAAA",
        "blob:https://example.org/1234",
        "about:blank",
        "http://tauri.localhost/", // Ferrum's own origin: left to the navigation rules
    ] {
        assert!(evaluate_resource(&p, url).is_none(), "{url} was refused");
    }
}

#[test]
fn unreadable_web_addresses_are_refused() {
    let p = Policy::default();
    for url in ["https://", "http://[::1", "https://exa mple.org/"] {
        let d = evaluate_resource(&p, url).unwrap_or_else(|| panic!("{url} passed"));
        assert_eq!(d.verdict, Verdict::Deny, "{url}");
    }
    let long = format!(
        "https://example.org/{}",
        "a".repeat(ferrum_security::policy::MAX_URL_BYTES)
    );
    assert_eq!(evaluate_resource(&p, &long).unwrap().rule, RuleId::TooLong);
}

proptest! {
    #[test]
    fn a_blocked_host_is_refused_whatever_follows(path in "[ -~]{0,200}") {
        let p = policy();
        let url = format!("https://ads.blocked.test/{path}");
        if let Some(d) = evaluate_resource(&p, &url) {
            prop_assert_eq!(d.verdict, Verdict::Deny);
        } else {
            // only a path that makes the address unreadable could change the host; that is refused too
            prop_assert!(false, "{} passed", url);
        }
    }

    #[test]
    fn never_panics(s in ".{0,300}") {
        let _ = evaluate_resource(&policy(), &s);
    }
}
