//! Site keys and profile names (P3 task p3.6).

use ferrum_core::profiles::{
    SHARED_PROFILE, profile_for_label, profile_for_site, site_key, valid_profile_name,
    valid_user_label,
};

#[test]
fn a_site_is_its_registrable_domain() {
    let cases = [
        ("https://mail.example.com/inbox", Some("example.com")),
        ("https://docs.example.com/", Some("example.com")),
        ("https://example.com", Some("example.com")),
        ("https://www.bbc.co.uk/news", Some("bbc.co.uk")),
        ("https://a.b.example.co.uk/", Some("example.co.uk")),
        ("http://Example.COM./x", Some("example.com")),
        ("https://user.github.io/", Some("user.github.io")), // github.io is a public suffix
        (
            "https://one.site-a.localhost:8443/",
            Some("site-a.localhost"),
        ),
        ("https://localhost:8443/", Some("localhost")),
        ("https://127.0.0.1:8443/", Some("127.0.0.1")),
        ("https://[::1]:8443/", Some("[::1]")),
        ("about:blank", None),
        ("mailto:a@example.com", None),
        ("file:///C:/x", None),
        ("not a url", None),
    ];
    for (url, want) in cases {
        assert_eq!(site_key(url).as_deref(), want, "{url}");
    }
}

#[test]
fn subdomains_share_and_other_sites_differ() {
    let a1 = profile_for_site(&site_key("https://one.site-a.localhost/").unwrap());
    let a2 = profile_for_site(&site_key("https://two.site-a.localhost/").unwrap());
    let b = profile_for_site(&site_key("https://site-b.localhost/").unwrap());
    assert_eq!(a1, a2);
    assert_ne!(a1, b);
    assert_eq!(a1, "site-site-a.localhost");
}

#[test]
fn profile_names_follow_microsofts_rules() {
    assert!(valid_profile_name(SHARED_PROFILE));
    assert!(valid_profile_name("site-example.com"));
    assert!(!valid_profile_name(""));
    assert!(!valid_profile_name("ends-with-dot."));
    assert!(!valid_profile_name("ends-with-space "));
    assert!(!valid_profile_name("has:colon"));
    assert!(!valid_profile_name(&"x".repeat(65)));
    assert!(valid_profile_name(&"x".repeat(64)));
    // Long hosts and IPv6 addresses get a stable hashed name instead.
    let long = format!("{}.example.com", "a".repeat(60));
    let p = profile_for_site(&long);
    assert!(p.starts_with("site-h-") && valid_profile_name(&p), "{p}");
    assert_eq!(p, profile_for_site(&long), "stable");
    let v6 = profile_for_site("[::1]");
    assert!(v6.starts_with("site-h-") && valid_profile_name(&v6));
}

#[test]
fn user_labels_are_restricted() {
    assert!(valid_user_label("work"));
    assert!(valid_user_label("team-2_x"));
    assert!(!valid_user_label(""));
    assert!(!valid_user_label("Work"));
    assert!(!valid_user_label("a b"));
    assert!(!valid_user_label(&"a".repeat(41)));
    assert_eq!(profile_for_label("work"), "user-work");
    assert!(valid_profile_name(&profile_for_label(&"a".repeat(40))));
}

#[test]
fn settings_choose_the_profile() {
    use ferrum_core::config::{self, IsolationMode};
    use ferrum_core::profiles::profile_for_url;
    let text = "version = 2\n[[sites]]\nsite = \"site-a.localhost\"\nprofile = \"work\"\n\n[[sites]]\nsite = \"site-b.localhost\"\n";
    let l = config::validate(config::parse(text, std::path::Path::new("t.toml")).unwrap()).unwrap();
    assert_eq!(l.config.isolation.mode, IsolationMode::PerSite);
    assert_eq!(
        profile_for_url(&l.config, "https://one.site-a.localhost/"),
        "user-work"
    );
    assert_eq!(
        profile_for_url(&l.config, "https://site-b.localhost/"),
        "site-site-b.localhost"
    );
    assert_eq!(
        profile_for_url(&l.config, "https://other.example/"),
        "site-other.example"
    );
    assert_eq!(profile_for_url(&l.config, "about:blank"), SHARED_PROFILE);
    let mut shared = l.config.clone();
    shared.isolation.mode = IsolationMode::Shared;
    assert_eq!(
        profile_for_url(&shared, "https://site-b.localhost/"),
        SHARED_PROFILE
    );
}

#[test]
fn bad_site_settings_are_refused() {
    use ferrum_core::config;
    for (text, why) in [
        ("[[sites]]\nsite = \"https://example.com\"\n", "not a site"),
        ("[[sites]]\nsite = \"www.example.com\"\n", "not a site"),
        ("[[sites]]\nsite = \"Example.com\"\n", "not a site"),
        (
            "[[sites]]\nsite = \"example.com\"\nprofile = \"Work Stuff\"\n",
            "profile must",
        ),
        (
            "[[sites]]\nsite = \"example.com\"\n[[sites]]\nsite = \"example.com\"\n",
            "listed twice",
        ),
    ] {
        let c = config::parse(
            &format!("version = 2\n{text}"),
            std::path::Path::new("t.toml"),
        )
        .unwrap();
        let e = config::validate(c).unwrap_err().to_string();
        assert!(e.contains(why), "{text}: {e}");
    }
}

#[test]
fn version_one_files_keep_one_shared_profile() {
    use ferrum_core::config::{self, IsolationMode};
    let c = config::parse(
        "[session]\nstartup_urls = []\n",
        std::path::Path::new("v1.toml"),
    )
    .unwrap();
    assert_eq!(c.isolation.mode, IsolationMode::Shared);
}

#[test]
fn per_site_udf_mode_gives_each_site_profile_its_own_folder() {
    use ferrum_core::config::{self, IsolationMode};
    use ferrum_core::profiles::{own_folder, profile_for_url};
    let text = "version = 3\n[isolation]\nmode = \"per-site-udf\"\n[[sites]]\nsite = \"site-a.localhost\"\nprofile = \"work\"\n";
    let l = config::validate(config::parse(text, std::path::Path::new("t.toml")).unwrap()).unwrap();
    assert_eq!(l.config.isolation.mode, IsolationMode::PerSiteUdf);
    assert_eq!(l.config.isolation.mode.name(), "per-site-udf");
    // Profiles are chosen as in per-site mode.
    let a = profile_for_url(&l.config, "https://one.site-a.localhost/");
    let b = profile_for_url(&l.config, "https://site-b.localhost/");
    assert_eq!(a, "user-work");
    assert_eq!(b, "site-site-b.localhost");
    let mode = l.config.isolation.mode;
    assert_eq!(own_folder(mode, &a), Some("user-work"));
    assert_eq!(own_folder(mode, &b), Some("site-site-b.localhost"));
    // Empty and private tabs stay in the shell's folder.
    assert_eq!(own_folder(mode, SHARED_PROFILE), None);
    assert_eq!(own_folder(mode, "ferrum-private"), None);
    // The other modes give no profile a folder of its own.
    for other in [IsolationMode::PerSite, IsolationMode::Shared] {
        assert_eq!(own_folder(other, &b), None);
    }
    // The saved file keeps the value.
    assert!(config::canonical(&l.config).contains("mode = \"per-site-udf\""));
}

#[test]
fn an_unknown_isolation_mode_is_refused() {
    use ferrum_core::config;
    for bad in ["udf", "per-site-UDF", "profile-per-site", ""] {
        let text = format!("version = 3\n[isolation]\nmode = \"{bad}\"\n");
        let e = config::parse(&text, std::path::Path::new("t.toml"));
        assert!(e.is_err(), "{bad:?} was accepted");
    }
}
