//! Safe, platform-free tab types shared by the raw COM module and the app.

/// Something that happened in a tab web view, in the order WebView2 reported it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TabEvent {
    /// A navigation is about to start (top-level frame). `allowed` is the navigation gate's decision.
    NavigationStarting {
        /// WebView2's navigation id.
        id: u64,
        /// Target address.
        uri: String,
        /// Started by the user (link click, typed address) rather than by script.
        user_initiated: bool,
        /// Part of a redirect chain.
        redirected: bool,
        /// Whether the gate let it start.
        allowed: bool,
    },
    /// The view's address changed (also on redirects and same-document navigations).
    SourceChanged {
        /// The new address.
        uri: String,
    },
    /// A navigation finished.
    NavigationCompleted {
        /// WebView2's navigation id.
        id: u64,
        /// The view's address when the navigation finished (after any redirects). Sent here as well because a
        /// redirect back to the current address raises no `SourceChanged`.
        uri: String,
        /// Whether the page loaded.
        success: bool,
        /// HTTP status of the main document if WebView2 reported one (0 = none).
        http_status: i32,
        /// WebView2's web error status (0 = unknown / none).
        web_error_status: i32,
    },
    /// Back/forward availability changed.
    HistoryChanged {
        /// `CanGoBack`.
        can_go_back: bool,
        /// `CanGoForward`.
        can_go_forward: bool,
    },
    /// The page title changed.
    TitleChanged {
        /// The new title.
        title: String,
    },
    /// The tab web view received keyboard focus.
    GotFocus,
}

/// The navigation gate's answer for a starting navigation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavDecision {
    /// Let it start.
    Allow,
    /// Cancel it.
    Cancel,
}

/// The P2 navigation gate for page-started navigations: web pages (`https:`, `http:`) and `about:blank` may load;
/// every other scheme is cancelled here (links to other apps are handled separately, p2.10). The full policy
/// engine (blocklist, adr-0015) arrives in P4.
pub fn p2_gate(uri: &str) -> NavDecision {
    let scheme = uri.split(':').next().unwrap_or("").to_ascii_lowercase();
    match scheme.as_str() {
        "https" | "http" => NavDecision::Allow,
        "about" if uri.eq_ignore_ascii_case("about:blank") => NavDecision::Allow,
        _ => NavDecision::Cancel,
    }
}

#[cfg(test)]
mod tests {
    use super::{NavDecision, p2_gate};

    #[test]
    fn gate_allows_web_pages_only() {
        assert_eq!(p2_gate("https://example.org/"), NavDecision::Allow);
        assert_eq!(p2_gate("http://example.org/"), NavDecision::Allow);
        assert_eq!(p2_gate("about:blank"), NavDecision::Allow);
        for u in [
            "javascript:alert(1)",
            "file:///C:/x",
            "data:text/html,x",
            "mailto:a@b.c",
            "about:settings",
            "ferrum-test:x",
        ] {
            assert_eq!(p2_gate(u), NavDecision::Cancel, "{u}");
        }
    }
}
