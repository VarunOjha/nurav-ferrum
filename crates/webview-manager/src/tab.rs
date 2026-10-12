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
    /// A page asked for a new window (`target=_blank`, `window.open`). WebView2 opened none; the app decides.
    NewWindowRequested {
        /// The address the page wanted to open.
        uri: String,
        /// Caused by a user gesture (click) rather than by script alone.
        user_initiated: bool,
    },
    /// WebView2 was about to hand a link to another app; it was cancelled, and the app asks the user.
    ExternalSchemeRequested {
        /// The link (for example `mailto:`).
        uri: String,
        /// Caused by a user gesture.
        user_initiated: bool,
    },
    /// A download started (p3.8), saved to `path`.
    DownloadStarted {
        /// Ferrum's id for the download.
        download: u64,
        /// Where it comes from.
        uri: String,
        /// Where it is saved.
        path: String,
        /// Its size, when the server said (-1 when unknown).
        total: i64,
    },
    /// More of a download arrived.
    DownloadProgress {
        /// Ferrum's id for the download.
        download: u64,
        /// Bytes received so far.
        received: i64,
        /// Its size (-1 when unknown).
        total: i64,
    },
    /// A download finished: completed, or broke off (`interrupt_reason` is WebView2's reason code).
    DownloadFinished {
        /// Ferrum's id for the download.
        download: u64,
        /// It completed.
        completed: bool,
        /// WebView2's interrupt reason (0 when completed).
        interrupt_reason: i32,
        /// Where it was saved.
        path: String,
        /// Bytes received.
        received: i64,
    },
}

/// A top-level navigation that is about to start, as the navigation gate sees it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NavRequest {
    /// Target address.
    pub uri: String,
    /// Started by the user (link click, typed address) rather than by script.
    pub user_initiated: bool,
    /// Part of a redirect chain (the server chose the target, not the page).
    pub redirected: bool,
}

/// A key pressed while a tab view had focus, as WebView2 reports it before the page sees it (accelerator keys:
/// combinations with Ctrl or Alt, and function keys).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct KeyDown {
    /// Windows virtual-key code.
    pub vk: u32,
    /// Ctrl held.
    pub ctrl: bool,
    /// Shift held.
    pub shift: bool,
    /// Alt held.
    pub alt: bool,
    /// The key was already down (auto-repeat).
    pub repeat: bool,
}

/// The navigation gate's answer for a starting navigation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavDecision {
    /// Let it start.
    Allow,
    /// Cancel it.
    Cancel,
}

/// The base navigation gate (P2, kept in P3) for page-started navigations: web pages (`https:`, `http:`) and `about:blank` may load;
/// every other scheme is cancelled here (the app asks before links to other apps are opened, p2.10). The full policy
/// engine (blocklist, adr-0015) arrives in P4.
pub fn web_gate(uri: &str) -> NavDecision {
    let scheme = uri.split(':').next().unwrap_or("").to_ascii_lowercase();
    match scheme.as_str() {
        "https" | "http" => NavDecision::Allow,
        "about" if uri.eq_ignore_ascii_case("about:blank") => NavDecision::Allow,
        _ => NavDecision::Cancel,
    }
}

#[cfg(test)]
mod tests {
    use super::{NavDecision, web_gate};

    #[test]
    fn gate_allows_web_pages_only() {
        assert_eq!(web_gate("https://example.org/"), NavDecision::Allow);
        assert_eq!(web_gate("http://example.org/"), NavDecision::Allow);
        assert_eq!(web_gate("about:blank"), NavDecision::Allow);
        for u in [
            "javascript:alert(1)",
            "file:///C:/x",
            "data:text/html,x",
            "mailto:a@b.c",
            "about:settings",
            "ferrum-test:x",
        ] {
            assert_eq!(web_gate(u), NavDecision::Cancel, "{u}");
        }
    }
}
