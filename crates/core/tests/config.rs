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
    // Owner answer Q-112: plain HTTP loads with the "not secure" warning (default from settings version 3).
    assert_eq!(l.config.security.http_policy, HttpPolicy::Warn);
    assert_eq!(l.config.security.external_schemes, ExternalSchemes::Confirm);
    // Owner answer Q-113: the site lists start empty.
    assert!(l.config.security.blocklist.is_empty());
    assert!(l.config.security.allowlist.is_empty());
    assert!(!l.config.security.allowlist_only);
    // Owner answer Q-224: any link type to another app may be offered (always with a click).
    assert!(l.config.security.external_allowlist.is_empty());
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
    b.security.http_policy = HttpPolicy::Upgrade;
    assert_ne!(config::hash(&a), config::hash(&b));
    // The canonical form parses back to the same configuration.
    assert_eq!(
        config::parse(&config::canonical(&b), Path::new("canonical")).unwrap(),
        b
    );
}

// --- p3.4: versioned file, atomic save, migration, newer versions, broken files ---

#[test]
fn save_then_load_round_trips() {
    let p = tmp("roundtrip.toml", "");
    let mut c = Config::default();
    c.session.startup_urls = vec![
        "https://example.org/".into(),
        "https://example.com/a".into(),
    ];
    c.security.new_window = NewWindow::SystemBrowser;
    config::save(&p, &c).unwrap();
    let text = std::fs::read_to_string(&p).unwrap();
    assert!(
        text.contains(&format!("version = {}", config::VERSION)),
        "{text}"
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config, c);
    // No temporary file is left next to it.
    let leftovers: Vec<_> = std::fs::read_dir(p.parent().unwrap())
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("roundtrip.toml.tmp")
        })
        .collect();
    assert!(leftovers.is_empty());
}

#[test]
fn save_replaces_an_existing_file() {
    let p = tmp(
        "replace.toml",
        "[session]\nstartup_urls = [\"https://old.example/\"]\n",
    );
    let mut c = Config::default();
    c.session.startup_urls = vec!["https://new.example/".into()];
    config::save(&p, &c).unwrap();
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.session.startup_urls, vec!["https://new.example/"]);
}

#[test]
fn newer_version_is_refused_with_a_clear_error() {
    let p = tmp("newer.toml", "version = 99\n");
    match config::load(Some(&p), None) {
        Err(e @ ConfigError::NewerVersion { found: 99, .. }) => {
            let msg = e.to_string();
            assert!(
                msg.contains("version 99") && msg.contains("newer Ferrum"),
                "{msg}"
            );
        }
        other => panic!("expected NewerVersion, got {other:?}"),
    }
    // Refusing it does not touch the file.
    assert_eq!(std::fs::read_to_string(&p).unwrap(), "version = 99\n");
}

#[test]
fn version_one_file_is_migrated_and_keeps_its_behaviour() {
    // A P2 file (no version): new windows stayed in the same view, so the migration keeps that.
    let p = tmp(
        "v1.toml",
        "[session]\nstartup_urls = [\"https://example.org/\"]\n",
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.version, config::VERSION);
    assert_eq!(l.config.security.new_window, NewWindow::SameView);
    assert!(
        !l.config.session.restore_on_startup,
        "P2 never restored a session"
    );
    // A version-1 file that chose explicitly keeps its choice.
    let p = tmp("v1b.toml", "[security]\nnew_window = \"system-browser\"\n");
    assert_eq!(
        config::load(Some(&p), None)
            .unwrap()
            .config
            .security
            .new_window,
        NewWindow::SystemBrowser
    );
    // A version-2 file without the key gets the new default.
    let p = tmp("v2.toml", "version = 2\n");
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.security.new_window, NewWindow::NewTab);
    assert!(l.config.session.restore_on_startup);
    // ...but keeps HTTP upgrade, the version-2 default (p4.3; the warn default starts with version 3).
    assert_eq!(l.config.version, config::VERSION);
    assert_eq!(l.config.security.http_policy, HttpPolicy::Upgrade);
    let p = tmp(
        "v2warn.toml",
        "version = 2\n[security]\nhttp_policy = \"warn\"\n",
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.security.http_policy, HttpPolicy::Warn);
    // A version-3 file without the key gets the warn default.
    let p = tmp("v3.toml", "version = 3\n");
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(l.config.security.http_policy, HttpPolicy::Warn);
}

#[test]
fn site_lists_are_read_and_saved() {
    let p = tmp(
        "lists.toml",
        "version = 3\n[security]\nblocklist = [\"example.com\", \"=ads.example.org\"]\n\
         allowlist = [\"docs.example.com\"]\nallowlist_only = true\n\
         external_allowlist = [\"mailto\"]\n",
    );
    let l = config::load(Some(&p), None).unwrap();
    assert_eq!(
        l.config.security.blocklist,
        vec!["example.com", "=ads.example.org"]
    );
    assert_eq!(l.config.security.allowlist, vec!["docs.example.com"]);
    assert!(l.config.security.allowlist_only);
    assert_eq!(l.config.security.external_allowlist, vec!["mailto"]);
    let out = tmp("lists-saved.toml", "");
    config::save(&out, &l.config).unwrap();
    assert_eq!(config::load(Some(&out), None).unwrap().config, l.config);
}

#[test]
fn corrupted_file_is_backed_up() {
    let text = "[session\nstartup_urls = [";
    let p = tmp("broken.toml", text);
    assert!(matches!(
        config::load(Some(&p), None),
        Err(ConfigError::Parse { .. })
    ));
    let backup = config::backup_broken(&p).unwrap();
    assert!(
        backup
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("broken.toml.broken-")
    );
    assert_eq!(std::fs::read_to_string(&backup).unwrap(), text);
    assert_eq!(
        std::fs::read_to_string(&p).unwrap(),
        text,
        "the original is left as it was"
    );
}

#[test]
fn appearance_defaults_and_round_trip() {
    // p3.19: no [appearance] section means the bookmarks bar shows; the setting survives a save and load.
    let c = ferrum_core::config::parse("version = 2\n", Path::new("t.toml")).unwrap();
    assert!(c.appearance.bookmarks_bar);
    let c = ferrum_core::config::parse(
        "version = 2\n[appearance]\nbookmarks_bar = false\n",
        Path::new("t.toml"),
    )
    .unwrap();
    assert!(!c.appearance.bookmarks_bar);
    let p = tmp("appearance.toml", "");
    ferrum_core::config::save(&p, &c).unwrap();
    let again = ferrum_core::config::parse(&std::fs::read_to_string(&p).unwrap(), &p).unwrap();
    assert_eq!(again.appearance, c.appearance);
    assert!(
        ferrum_core::config::parse(
            "version = 2\n[appearance]\ncolour = \"red\"\n",
            Path::new("t.toml")
        )
        .is_err()
    );
}

#[test]
fn appearance_theme_accent_density() {
    // p3.22 (adr-0033): Graphite, orange and roomy by default; known names only.
    use ferrum_core::config::{Accent, Density, Theme};
    let c = ferrum_core::config::parse("version = 2\n", Path::new("t.toml")).unwrap();
    assert_eq!(
        (
            c.appearance.theme,
            c.appearance.accent,
            c.appearance.density
        ),
        (Theme::Graphite, Accent::Orange, Density::Roomy)
    );
    let c = ferrum_core::config::parse(
        "version = 2\n[appearance]\ntheme = \"graphite\"\naccent = \"violet\"\ndensity = \"compact\"\n",
        Path::new("t.toml"),
    )
    .unwrap();
    assert_eq!(
        (c.appearance.accent, c.appearance.density),
        (Accent::Violet, Density::Compact)
    );
    for bad in [
        "theme = \"neon\"",
        "accent = \"pink\"",
        "density = \"huge\"",
    ] {
        let text = format!("version = 2\n[appearance]\n{bad}\n");
        assert!(
            ferrum_core::config::parse(&text, Path::new("t.toml")).is_err(),
            "{bad}"
        );
    }
}
