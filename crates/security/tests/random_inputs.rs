//! Randomised input tests of the navigation policy (p4.2; SEC-01 and SEC-09 in
//! `wiki/quality/qual-security-testing-plan.md`): the policy never panics, anything the URL parser cannot read is
//! denied, and a blocked host is denied whatever the rest of the address says.

use ferrum_security::{Context, Policy, Request, RuleId, RuleList, Verdict, evaluate};
use proptest::prelude::*;
use url::Url;

fn contexts() -> impl Strategy<Value = Context> {
    prop_oneof![
        Just(Context::TopLevel),
        Just(Context::Redirect),
        Just(Context::Frame),
        Just(Context::NewWindow),
    ]
}

fn blocking_policy() -> Policy {
    Policy {
        blocklist: RuleList::parse(&["blocked.test", "=exact.example"]).unwrap(),
        allowlist: RuleList::parse(&["=open.example"]).unwrap(),
        ..Policy::default()
    }
}

/// Seed corpus from the test plan (SEC-09): odd inputs every run includes, besides the random ones.
const SEEDS: &[&str] = &[
    "",
    " ",
    "\u{0}",
    "https://example.org/\u{0}",
    "http://2130706433/",
    "http://0x7f.1/",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:,x",
    "blob:https://a.test/x",
    "about:",
    "https:\\\\example.org\\x",
    "//example.org/",
    "http://[fe80::1%25eth0]/",
    "https://xn--/",
    "https://a..b/",
    "https://%zz/",
    "https://exa\u{2028}mple.org/",
    "https://\u{0430}pple.com/",
    "http:///blocked.test/",
    "https://blocked.test@evil.test/",
    "https://evil.test@blocked.test/",
];

#[test]
fn seed_corpus_never_panics_and_unparseable_is_denied() {
    let p = blocking_policy();
    for s in SEEDS {
        for ctx in [
            Context::TopLevel,
            Context::Redirect,
            Context::Frame,
            Context::NewWindow,
        ] {
            let d = evaluate(
                &p,
                &Request {
                    url: s,
                    context: ctx,
                    initiator: None,
                },
            );
            if Url::parse(s).is_err() {
                assert_eq!(d.verdict, Verdict::Deny, "{s:?}");
            }
        }
    }
    // Credentials never hide the real host.
    let d = evaluate(
        &p,
        &Request {
            url: "https://blocked.test@evil.test/",
            context: Context::TopLevel,
            initiator: None,
        },
    );
    assert!(d.loads());
    let d = evaluate(
        &p,
        &Request {
            url: "https://evil.test@blocked.test/",
            context: Context::TopLevel,
            initiator: None,
        },
    );
    assert_eq!(d.rule, RuleId::Blocked);
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 4096, failure_persistence: None, ..ProptestConfig::default() })]

    /// Any string at all: no panic, and if the URL parser rejects it (or it has control characters), it is denied.
    #[test]
    fn any_string_is_decided_without_panic(s in any::<String>(), ctx in contexts()) {
        let d = evaluate(&blocking_policy(), &Request { url: &s, context: ctx, initiator: None });
        if Url::parse(&s).is_err() || s.chars().any(|c| c.is_control() || c.is_whitespace()) {
            prop_assert_eq!(d.verdict, Verdict::Deny);
        }
    }

    /// Strings that look like addresses (scheme, host-ish part, rest): the same promises.
    #[test]
    fn address_like_strings_are_decided_without_panic(
        scheme in "(https?|HTTPS?|javascript|data|blob|file|about|mailto|tauri|[a-z][a-z0-9+.-]{0,8})",
        sep in "(:|://|:/|:\\\\\\\\|)",
        host in "[a-zA-Z0-9.%\\[\\]:@_-]{0,24}",
        rest in "[ -~]{0,24}",
        ctx in contexts(),
    ) {
        let s = format!("{scheme}{sep}{host}{rest}");
        let d = evaluate(&blocking_policy(), &Request { url: &s, context: ctx, initiator: None });
        if Url::parse(&s).is_err() || s.chars().any(|c| c.is_control() || c.is_whitespace()) {
            prop_assert_eq!(d.verdict, Verdict::Deny);
        }
    }

    /// A blocked host (or any subdomain, any case, trailing dot, port, user info) is denied whatever the path, query
    /// or fragment, in every context.
    #[test]
    fn blocked_host_is_denied_regardless_of_rest(
        sub in "([a-z0-9]{1,8}\\.){0,3}",
        upper in any::<bool>(),
        dot in any::<bool>(),
        port in proptest::option::of(1u16..),
        user in proptest::option::of("[a-z]{1,6}"),
        path in "(/[a-zA-Z0-9._~%-]{0,8}){0,3}",
        query in proptest::option::of("[a-zA-Z0-9=&]{0,12}"),
        frag in proptest::option::of("[a-zA-Z0-9]{0,8}"),
        https in any::<bool>(),
        ctx in contexts(),
    ) {
        let mut host = format!("{sub}blocked.test");
        if upper { host = host.to_uppercase(); }
        if dot { host.push('.'); }
        let mut s = format!("{}://", if https { "https" } else { "http" });
        if let Some(u) = &user { s.push_str(u); s.push('@'); }
        s.push_str(&host);
        if let Some(p) = port { s.push_str(&format!(":{p}")); }
        s.push_str(&path);
        if let Some(q) = &query { s.push('?'); s.push_str(q); }
        if let Some(f) = &frag { s.push('#'); s.push_str(f); }
        let d = evaluate(&blocking_policy(), &Request { url: &s, context: ctx, initiator: None });
        prop_assert_eq!(d.verdict, Verdict::Deny, "{}", s);
        prop_assert_eq!(d.rule, RuleId::Blocked);
    }

    /// The parser invariant the policy relies on: every http(s) URL it accepts has a non-empty host.
    #[test]
    fn parsed_web_urls_always_have_a_host(s in "https?://[ -~]{0,30}") {
        if let Ok(u) = Url::parse(&s) {
            prop_assert!(u.host_str().is_some_and(|h| !h.is_empty()), "{}", s);
        }
    }
}
