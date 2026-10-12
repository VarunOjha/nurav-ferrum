//! p2.5: table-driven tests, at least one case per input class; malformed input never yields a navigation.

use ferrum_core::address::{Note, Outcome, Refusal, normalize};
use ferrum_core::config::{ExternalSchemes, HttpPolicy, Security};

#[derive(Debug)]
enum Want {
    Nav(&'static str, Option<Note>),
    Confirm(&'static str),
    Refuse(Refusal),
}

fn sec(http: HttpPolicy, ext: ExternalSchemes) -> Security {
    Security {
        http_policy: http,
        external_schemes: ext,
        ..Security::default()
    }
}

fn check(class: &str, input: &str, security: &Security, want: Want) {
    let got = normalize(input, security);
    let ok = match (&got, &want) {
        (Outcome::Navigate { url, note }, Want::Nav(u, n)) => url.as_str() == *u && note == n,
        (Outcome::Confirm { url }, Want::Confirm(u)) => url.as_str() == *u,
        (Outcome::Refuse(r), Want::Refuse(w)) => r == w,
        _ => false,
    };
    assert!(ok, "[{class}] input {input:?}: got {got:?}, want {want:?}");
}

#[test]
fn every_input_class() {
    let d = Security::default(); // upgrade + confirm
    let warn = sec(HttpPolicy::Warn, ExternalSchemes::Confirm);
    let deny = sec(HttpPolicy::Upgrade, ExternalSchemes::Deny);
    let cases: Vec<(&str, &str, &Security, Want)> = vec![
        // scheme-less input
        (
            "scheme-less",
            "example.org",
            &d,
            Want::Nav("https://example.org/", None),
        ),
        (
            "scheme-less",
            "example.org/a/b?c=1#d",
            &d,
            Want::Nav("https://example.org/a/b?c=1#d", None),
        ),
        (
            "scheme-less",
            "localhost:8443/landing",
            &d,
            Want::Nav("https://localhost:8443/landing", None),
        ),
        (
            "scheme-less",
            "127.0.0.1:8443",
            &d,
            Want::Nav("https://127.0.0.1:8443/", None),
        ),
        (
            "scheme-less",
            "sub.example.co.uk:8080/x",
            &d,
            Want::Nav("https://sub.example.co.uk:8080/x", None),
        ),
        // https kept
        (
            "https",
            "https://example.org/x",
            &d,
            Want::Nav("https://example.org/x", None),
        ),
        (
            "https",
            "HTTPS://Example.ORG/",
            &d,
            Want::Nav("https://example.org/", None),
        ),
        // http upgrade / warn
        (
            "http-upgrade",
            "http://example.org/a",
            &d,
            Want::Nav("https://example.org/a", Some(Note::UpgradedFromHttp)),
        ),
        (
            "http-warn",
            "http://example.org/a",
            &warn,
            Want::Nav("http://example.org/a", Some(Note::InsecureHttp)),
        ),
        // non-web schemes need confirmation (or are denied)
        (
            "external",
            "mailto:test@example.invalid",
            &d,
            Want::Confirm("mailto:test@example.invalid"),
        ),
        (
            "external",
            "ferrum-test:hello",
            &d,
            Want::Confirm("ferrum-test:hello"),
        ),
        (
            "external",
            "tel:+15550100",
            &d,
            Want::Confirm("tel:+15550100"),
        ),
        (
            "external-deny",
            "mailto:test@example.invalid",
            &deny,
            Want::Refuse(Refusal::ExternalDenied("mailto".into())),
        ),
        // whitespace
        (
            "whitespace",
            "   example.org  ",
            &d,
            Want::Nav("https://example.org/", None),
        ),
        (
            "whitespace",
            "\thttps://example.org/\n",
            &d,
            Want::Nav("https://example.org/", None),
        ),
        (
            "whitespace",
            "hello world",
            &d,
            Want::Refuse(Refusal::NotAnAddress),
        ),
        (
            "whitespace",
            "https://exa mple.org/",
            &d,
            Want::Refuse(Refusal::Malformed),
        ),
        // IDN (punycode)
        (
            "idn",
            "bücher.example",
            &d,
            Want::Nav("https://xn--bcher-kva.example/", None),
        ),
        (
            "idn",
            "https://münchen.example/stadt",
            &d,
            Want::Nav("https://xn--mnchen-3ya.example/stadt", None),
        ),
        // IPv6
        (
            "ipv6",
            "[::1]:8443",
            &d,
            Want::Nav("https://[::1]:8443/", None),
        ),
        (
            "ipv6",
            "https://[2001:db8::1]/x",
            &d,
            Want::Nav("https://[2001:db8::1]/x", None),
        ),
        // forbidden schemes
        (
            "javascript",
            "javascript:alert(1)",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("javascript".into())),
        ),
        (
            "javascript",
            "  JavaScript:alert(1)",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("javascript".into())),
        ),
        (
            "data",
            "data:text/html,<b>x</b>",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("data".into())),
        ),
        (
            "file",
            "file:///C:/Windows/win.ini",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("file".into())),
        ),
        (
            "file",
            "file://server/share",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("file".into())),
        ),
        (
            "other-forbidden",
            "view-source:https://example.org",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("view-source".into())),
        ),
        ("about", "about:blank", &d, Want::Nav("about:blank", None)),
        (
            "about",
            "about:settings",
            &d,
            Want::Refuse(Refusal::ForbiddenScheme("about".into())),
        ),
        // malformed
        (
            "malformed",
            "https://",
            &d,
            Want::Refuse(Refusal::Malformed),
        ),
        (
            "malformed",
            "http://[::1",
            &d,
            Want::Refuse(Refusal::Malformed),
        ),
        (
            "malformed",
            "https://intranet/",
            &d,
            Want::Refuse(Refusal::Malformed),
        ),
        ("malformed", "::::", &d, Want::Refuse(Refusal::Malformed)),
        (
            "malformed",
            "example..org",
            &d,
            Want::Refuse(Refusal::Malformed),
        ),
        // plain words (no search engine in P2) and empty
        (
            "plain-word",
            "intranet",
            &d,
            Want::Refuse(Refusal::NotAnAddress),
        ),
        ("empty", "   ", &d, Want::Refuse(Refusal::Empty)),
    ];
    for (class, input, security, want) in cases {
        check(class, input, security, want);
    }
}

#[test]
fn malformed_never_navigates() {
    let d = Security::default();
    for input in [
        "https://",
        "http://",
        "http://[::1",
        "https://exa mple.org",
        "::::",
        "http:///x",
        "https://.",
        "%%%",
        "[::1",
    ] {
        assert!(
            !matches!(normalize(input, &d), Outcome::Navigate { .. }),
            "{input:?} must not navigate"
        );
    }
}

#[test]
fn site_keeps_only_scheme_and_host() {
    use ferrum_core::address::site;
    assert_eq!(
        site("https://example.org/private/path?q=secret#frag"),
        "https://example.org"
    );
    assert_eq!(
        site("https://user:pw@example.org:8443/x"),
        "https://example.org:8443"
    );
    assert_eq!(site("mailto:someone@example.org"), "mailto:");
    assert_eq!(site("about:blank"), "about:");
    assert_eq!(site("not an address"), "(not an address)");
}
