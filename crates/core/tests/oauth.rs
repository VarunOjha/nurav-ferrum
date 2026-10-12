//! Google sign-in classifier (task p2.13). Addresses follow the endpoint recorded in
//! wiki/raw/research/google-oauth-endpoint.md; no live Google login is used.

use ferrum_core::oauth::{SignIn, TestPattern, classify};

#[test]
fn google_authorization_requests_match() {
    for u in [
        "https://accounts.google.com/o/oauth2/v2/auth",
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=example.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fexample.org%2Fcb&response_type=code&scope=openid%20email&state=xyz",
        "https://ACCOUNTS.GOOGLE.COM/o/oauth2/v2/auth?response_type=code",
        "https://accounts.google.com:443/o/oauth2/v2/auth",
        "http://accounts.google.com/o/oauth2/v2/auth",
        "https://accounts.google.com/o/oauth2/auth?client_id=x",
    ] {
        assert_eq!(classify(u, None), Some(SignIn::Google), "{u}");
    }
}

#[test]
fn other_addresses_do_not_match() {
    for u in [
        "https://accounts.google.com/",
        "https://accounts.google.com/ServiceLogin",
        "https://oauth2.googleapis.com/token",
        "https://www.google.com/o/oauth2/v2/auth",
        "https://accounts.google.com.example.org/o/oauth2/v2/auth",
        "https://accounts.google.com@example.org/o/oauth2/v2/auth",
        "https://example.org/o/oauth2/v2/auth",
        "https://example.org/?next=https://accounts.google.com/o/oauth2/v2/auth",
        "https://accounts.google.com/x/o/oauth2/v2/auth",
        "mailto:accounts.google.com",
        "not a url",
        "",
    ] {
        assert_eq!(classify(u, None), None, "{u}");
    }
}

#[test]
fn test_pattern_only_when_given() {
    let t = TestPattern {
        host: "localhost".into(),
        path_prefix: "/oauth-test/".into(),
    };
    let u = "https://localhost:8443/oauth-test/o/oauth2/v2/auth?client_id=x";
    assert_eq!(classify(u, Some(&t)), Some(SignIn::Google));
    assert_eq!(classify(u, None), None);
    assert_eq!(classify("https://localhost:8443/landing", Some(&t)), None);
}
