//! p4.16: the benchmark-only ablation build (feature `bench-nosecurity`). Run with
//! `cargo test -p ferrum-security --features bench-nosecurity --test bench_nosecurity`; without the feature the test
//! only checks that this build is not the ablation.

use ferrum_security::policy::{Policy, RuleId};
use ferrum_security::{Context, Request, RuleList, Verdict, evaluate};

fn strict_policy() -> Policy {
    Policy {
        blocklist: RuleList::parse(&["blocked.example".to_string()]).unwrap(),
        allowlist: RuleList::parse(&["allowed.example".to_string()]).unwrap(),
        allowlist_only: true,
        ..Policy::default()
    }
}

fn decide(url: &str) -> (Verdict, RuleId) {
    let d = evaluate(
        &strict_policy(),
        &Request {
            url,
            context: Context::TopLevel,
            initiator: None,
        },
    );
    (d.verdict, d.rule)
}

#[cfg(feature = "bench-nosecurity")]
#[test]
fn the_ablation_allows_every_web_address() {
    assert!(ferrum_security::policy::is_bench_nosecurity());
    for url in [
        "https://blocked.example/",
        "https://sub.blocked.example/page",
        "https://not-on-the-allowlist.example/",
        "http://plain.example/",
        "about:blank",
        "data:text/html,hi",
    ] {
        assert_eq!(
            decide(url),
            (Verdict::Allow, RuleId::BenchNoSecurity),
            "{url}"
        );
    }
    assert_eq!(
        RuleId::BenchNoSecurity.as_str(),
        ferrum_security::policy::BENCH_NOSECURITY_RULE
    );
}

#[cfg(feature = "bench-nosecurity")]
#[test]
fn the_ablation_keeps_ferrums_own_origin_local_files_and_other_apps_out() {
    assert_eq!(
        decide("https://tauri.localhost/index.html").1,
        RuleId::AppOrigin
    );
    assert_eq!(decide("tauri://localhost/").1, RuleId::AppOrigin);
    assert_eq!(
        decide("file:///C:/Windows/win.ini").1,
        RuleId::ForbiddenScheme
    );
    assert_eq!(decide("javascript:alert(1)").1, RuleId::ForbiddenScheme);
    assert_eq!(decide("mailto:someone@example.com").0, Verdict::Confirm);
    assert_eq!(decide("ms-msdt:/id").0, Verdict::Deny);
    assert_eq!(decide("not a url").0, Verdict::Deny);
}

#[cfg(not(feature = "bench-nosecurity"))]
#[test]
fn this_build_is_not_the_ablation() {
    assert!(!ferrum_security::policy::is_bench_nosecurity());
    assert_eq!(decide("https://blocked.example/").0, Verdict::Deny);
}
