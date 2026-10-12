//! p2.4: valid config, missing file (defaults), invalid URL, non-https start URL handling per adr-0015.

use std::path::{Path, PathBuf};

use ferrum_core::config::{
    self, Config, ConfigError, ExternalSchemes, HttpPolicy, NewWindow, Warning,
};

fn tmp(name: &str, text: &str) -> PathBuf {
    let dir = PathBuf::from(env!("CARGO_TARGET_TMPDIR"))
        .join(format!("core-config-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let p = dir.join(name);
    std::fs::write(&p, text).unwrap();
    p
}

#[test]
fn missing_file_gives_defaults() {
    let l = config::load(Some(Path::new("does-not-exist/config.toml")), None).unwrap();
    assert_eq!(l.config, Config::default());
    assert!(l.warnings.is_empty());
    assert_eq!(l.config.security.http_policy, HttpPolicy::Upgrade);
    assert_eq!(l.config.security.external_schemes, ExternalSchemes::Confirm);
    assert_eq!(l.config.security.new_window, NewWindow::NewTab);
    assert!(l.config.session.startup_urls.is_empty());
}

#[test]
fn valid_file_is_read() {
    let p = tmp(
        "valid.toml",
        r#"
[session]
startup_urls = ["https://example.org/", "about:blank"]

[security]
http_policy = "warn"
external_schemes = "deny"
new_window = "system-browser"

[storage]
data_dir = "D:/FerrumData"
"#,
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(
        l.config.session.startup_urls,
        vec!["https://example.org/", "about:blank"]
    );
    assert_eq!(l.config.security.http_policy, HttpPolicy::Warn);
    assert_eq!(l.config.security.external_schemes, ExternalSchemes::Deny);
    assert_eq!(l.config.security.new_window, NewWindow::SystemBrowser);
    assert_eq!(
        l.config.storage.data_dir,
        Some(PathBuf::from("D:/FerrumData"))
    );
}

#[test]
fn override_layer_wins() {
    let user = tmp("user.toml", "[security]\nhttp_policy = \"warn\"\n");
    let exp = tmp("exp.toml", "[security]\nhttp_policy = \"upgrade\"\n");
    let l = config::load(Some(&user), Some(&exp)).unwrap();
    assert_eq!(l.config.security.http_policy, HttpPolicy::Upgrade);
}

#[test]
fn unknown_keys_and_bad_values_fail_loudly() {
    let typo = tmp("typo.toml", "[security]\nhttp_polcy = \"warn\"\n");
    assert!(matches!(
        config::load(Some(&typo), None),
        Err(ConfigError::Parse { .. })
    ));
    let bad = tmp("bad.toml", "[security]\nhttp_policy = \"sometimes\"\n");
    assert!(matches!(
        config::load(Some(&bad), None),
        Err(ConfigError::Parse { .. })
    ));
    let section = tmp("section.toml", "[nonsense]\na = 1\n");
    assert!(matches!(
        config::load(Some(&section), None),
        Err(ConfigError::Parse { .. })
    ));
}

#[test]
fn invalid_start_url_is_refused() {
    let p = tmp("badurl.toml", "[session]\nstartup_urls = [\"not a url\"]\n");
    assert!(matches!(
        config::load(Some(&p), None),
        Err(ConfigError::InvalidStartUrl { .. })
    ));
}

#[test]
fn non_web_start_urls_are_refused() {
    for u in [
        "file:///C:/Windows/win.ini",
        "javascript:alert(1)",
        "data:text/html,hi",
        "ftp://example.org/",
    ] {
        let p = tmp(
            "scheme.toml",
            &format!("[session]\nstartup_urls = [{u:?}]\n"),
        );
        match config::load(Some(&p), None) {
            Err(ConfigError::InvalidStartUrl { url, .. }) => assert_eq!(url, u),
            other => panic!("{u}: expected InvalidStartUrl, got {other:?}"),
        }
    }
}

#[test]
fn http_start_url_is_upgraded_by_default() {
    let p = tmp(
        "http.toml",
        "[session]\nstartup_urls = [\"http://example.org/a?b=1\"]\n",
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(
        l.config.session.startup_urls,
        vec!["https://example.org/a?b=1"]
    );
    assert_eq!(
        l.warnings,
        vec![Warning::StartUrlUpgraded {
            from: "http://example.org/a?b=1".into(),
            to: "https://example.org/a?b=1".into()
        }]
    );
}

#[test]
fn http_start_url_is_kept_with_a_warning_when_policy_is_warn() {
    let p = tmp(
        "httpwarn.toml",
        "[session]\nstartup_urls = [\"http://example.org/\"]\n[security]\nhttp_policy = \"warn\"\n",
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.session.startup_urls, vec!["http://example.org/"]);
    assert_eq!(
        l.warnings,
        vec![Warning::StartUrlInsecure("http://example.org/".into())]
    );
}

#[test]
fn hash_is_stable_and_sensitive() {
    let a = Config::default();
    let mut b = Config::default();
    assert_eq!(config::hash(&a), config::hash(&b));
    assert!(config::hash(&a).starts_with("sha256:") && config::hash(&a).len() == 7 + 64);
    b.security.http_policy = HttpPolicy::Warn;
    assert_ne!(config::hash(&a), config::hash(&b));
    // The canonical form parses back to the same configuration.
    assert_eq!(
        config::parse(&config::canonical(&b), Path::new("canonical")).unwrap(),
        b
    );
}
