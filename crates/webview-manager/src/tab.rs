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
    /// A frame inside the page (an iframe) is about to navigate. `allowed` is the navigation gate's decision.
    FrameNavigationStarting {
        /// WebView2's navigation id.
        id: u64,
        /// Target address.
        uri: String,
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
    /// A page asked for a permission (camera, location, ...; p4.5) and the app decided. WebView2 does not keep the
    /// answer in the profile.
    PermissionRequested {
        /// The address of the page (or frame) that asked.
        uri: String,
        /// The kind's settings name (`camera`, ...), or `unknown`.
        kind: String,
        /// Whether it was allowed.
        allowed: bool,
    },
    /// The page's icon changed (p3.16): the icon as PNG bytes, as WebView2 already has it (empty: the page has none).
    FaviconChanged {
        /// PNG image bytes.
        png: Vec<u8>,
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

/// A navigation that is about to start, as the navigation gate sees it: the page itself (top level) or a frame in
/// it. WebView2 raises one for the first request and again for every redirect hop.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NavRequest {
    /// Target address.
    pub uri: String,
    /// Started by the user (link click, typed address) rather than by script.
    pub user_initiated: bool,
    /// Part of a redirect chain (the server chose the target, not the page).
    pub redirected: bool,
    /// A frame inside the page (`FrameNavigationStarting`), not the page itself.
    pub frame: bool,
}

/// A permission request as the app sees it (p4.5).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PermissionAsk {
    /// The address of the page (or frame) that asked.
    pub uri: String,
    /// The kind's settings name (`camera`, `clipboard-read`, ...; the names of `ferrum_core::config::PermissionKind`),
    /// or `None` for a kind this version does not know.
    pub kind: Option<&'static str>,
    /// Caused by a user gesture.
    pub user_initiated: bool,
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
