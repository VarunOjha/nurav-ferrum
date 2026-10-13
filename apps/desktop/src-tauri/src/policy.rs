//! The navigation policy in the app (P4 task p4.3). One [`Policy`] is built from the settings (`ferrum_security`,
//! adr-0015) and asked about every navigation a tab makes: the page's own, each redirect hop, each frame, and each new
//! window a page asks for. Each refusal is logged with the rule that decided it (scheme and host only, never the
//! path or the page's content). The settings screen replaces the policy when it saves new settings.
//!
//! The shell has its own, stricter rule ([`shell_may_load`], Tauri's `on_navigation`): it only ever shows Ferrum's own
//! pages, because it is the one web view that may call the app (threat T03, edge E01 in the security testing plan).

use std::sync::{Arc, RwLock};

use ferrum_core::address::site;
use ferrum_core::config::Config;
use ferrum_security::{Context, Decision, Policy, Request, RuleList, Verdict, evaluate};
use tauri::{AppHandle, Manager};

/// The policy in effect.
pub struct PolicyState(pub RwLock<Arc<Policy>>);

/// Builds the policy from the settings; an invalid site rule refuses the whole list, in plain words.
pub fn build(config: &Config) -> Result<Policy, String> {
    let s = &config.security;
    let blocklist =
        RuleList::parse(&s.blocklist).map_err(|e| format!("Blocked sites list: {e}."))?;
    let allowlist =
        RuleList::parse(&s.allowlist).map_err(|e| format!("Allowed sites list: {e}."))?;
    Ok(Policy {
        blocklist,
        allowlist,
        allowlist_only: s.allowlist_only,
        http: s.http_policy,
        external: s.external_schemes,
    })
}

/// The policy in effect now.
pub fn current(app: &AppHandle) -> Arc<Policy> {
    app.state::<PolicyState>().0.read().unwrap().clone()
}

/// Puts a new policy in effect (after the settings changed).
pub fn replace(app: &AppHandle, policy: Policy) {
    *app.state::<PolicyState>().0.write().unwrap() = Arc::new(policy);
}

/// Stable name of a navigation context, for the log.
pub fn context_name(c: Context) -> &'static str {
    match c {
        Context::TopLevel => "page",
        Context::Redirect => "redirect",
        Context::Frame => "frame",
        Context::NewWindow => "new-window",
    }
}

/// Whether the shell web view may load `url`: Ferrum's own pages only (`http://tauri.localhost/...`, how Tauri serves
/// the bundled shell on Windows, or `tauri://localhost/...`). Anything else is refused and logged.
pub fn shell_may_load(url: &tauri::Url) -> bool {
    let ok = matches!(
        (url.scheme(), url.host_str(), url.port()),
        ("http" | "https", Some("tauri.localhost"), None) | ("tauri", Some("localhost"), None)
    );
    if !ok {
        tracing::warn!(target: "ferrum::policy", context = "shell", site = %site(url.as_str()), rule = "shell-app-only", "navigation denied");
    }
    ok
}

/// Decides one navigation of tab `tab` and logs a refusal (or an upgrade) with its rule.
pub fn decide(
    policy: &Policy,
    tab: u64,
    context: Context,
    uri: &str,
    initiator: Option<&str>,
) -> Decision {
    let d = evaluate(
        policy,
        &Request {
            url: uri,
            context,
            initiator,
        },
    );
    let ctx = context_name(context);
    match &d.verdict {
        Verdict::Deny => tracing::info!(
            target: "ferrum::policy", tab, context = ctx, site = %site(uri), rule = d.rule.as_str(),
            matched = d.matched.as_deref().unwrap_or(""), "navigation denied"
        ),
        Verdict::Upgrade(_) => tracing::info!(
            target: "ferrum::policy", tab, context = ctx, site = %site(uri), rule = d.rule.as_str(),
            "navigation upgraded to https"
        ),
        _ => {}
    }
    d
}

#[cfg(test)]
mod tests {
    use super::*;
    use ferrum_core::config::HttpPolicy;
    use ferrum_security::RuleId;

    fn config(block: &[&str], allow: &[&str]) -> Config {
        let mut c = Config::default();
        c.security.blocklist = block.iter().map(|s| s.to_string()).collect();
        c.security.allowlist = allow.iter().map(|s| s.to_string()).collect();
        c
    }

    #[test]
    fn settings_become_the_policy() {
        let p = build(&config(&["=127.0.0.1"], &[])).unwrap();
        assert_eq!(p.blocklist.len(), 1);
        assert_eq!(p.http, HttpPolicy::Warn, "Q-112 default");
        let d = decide(
            &p,
            1,
            Context::Frame,
            "https://127.0.0.1:8443/landing",
            None,
        );
        assert_eq!((d.verdict, d.rule), (Verdict::Deny, RuleId::Blocked));
        assert!(
            decide(&p, 1, Context::TopLevel, "https://localhost:8443/", None).loads(),
            "an unlisted host loads"
        );
    }

    #[test]
    fn the_shell_loads_only_ferrums_own_pages() {
        let ok = |u: &str| shell_may_load(&tauri::Url::parse(u).unwrap());
        assert!(ok("http://tauri.localhost/index.html"));
        assert!(ok("tauri://localhost/index.html"));
        for u in [
            "https://localhost:8443/landing",
            "https://example.org/",
            "http://tauri.localhost.example.org/",
            "http://tauri.localhost:8080/",
            "about:blank",
            "data:text/html,x",
            "file:///C:/x.html",
        ] {
            assert!(!ok(u), "{u}");
        }
    }

    #[test]
    fn a_bad_rule_refuses_the_settings() {
        let e = build(&config(&["ok.example", "https://bad.example/"], &[])).unwrap_err();
        assert!(e.starts_with("Blocked sites list:"), "{e}");
        let e = build(&config(&[], &["*.example"])).unwrap_err();
        assert!(e.starts_with("Allowed sites list:"), "{e}");
    }

    #[test]
    fn malformed_addresses_are_denied_in_every_context() {
        let p = build(&Config::default()).unwrap();
        for ctx in [
            Context::TopLevel,
            Context::Redirect,
            Context::Frame,
            Context::NewWindow,
        ] {
            for uri in ["https://exa mple.org/", "https://[::1/", "", "http://"] {
                let d = decide(&p, 1, ctx, uri, None);
                assert_eq!(d.verdict, Verdict::Deny, "{uri:?} in {}", context_name(ctx));
            }
        }
    }
}
