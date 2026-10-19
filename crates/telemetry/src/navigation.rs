//! Navigation timing (p5.7): one `nav_timing` record per finished top-level navigation of a tab. This module is the
//! pure part. The host feeds it WebView2's events with wall-clock times (milliseconds since 1970): the first
//! `NavigationStarting` of a navigation id starts it and each later hop with `IsRedirected` adds one redirect;
//! `NavigationCompleted` ends it. The page's own Navigation Timing entry (read by the host, never sent by page script)
//! adds the first response, DOMContentLoaded and the load event.
//!
//! Clocks: `start_ms` and `complete_ms` come from the host's events; `response_ms`, `dom_content_loaded_ms` and
//! `load_ms` are the page's own offsets from its navigation start (its `startTime`, 0), so no two clocks are mixed
//! inside one offset. The redirect count is the host's: the page's own `redirectCount` is 0 after a redirect from
//! another origin (Navigation Timing hides it), so it is kept only as a cross-check.
//!
//! The origin label compares the origin of the page the navigation ended on with the tab's previous page (the end of
//! its last navigation that loaded). A tab's first page, and any page without a host (`about:blank`, `data:`), counts
//! as another origin.

use std::collections::HashMap;

use crate::export::{NavOutcome, NavTiming, OriginRelation, Record};

/// WebView2's web error status for a navigation that was cancelled (by the user, a newer navigation or Ferrum's gate).
pub const WEB_ERROR_OPERATION_CANCELED: i32 = 14;

/// A navigation that has started and not yet ended.
#[derive(Debug, Clone, PartialEq)]
struct Open {
    start_unix_ms: f64,
    redirects: u32,
}

/// A navigation that ended, as the host saw it.
#[derive(Debug, Clone, PartialEq)]
pub struct Finished {
    /// WebView2's navigation id.
    pub nav_id: u64,
    /// The first `NavigationStarting`, milliseconds since 1970.
    pub start_unix_ms: f64,
    /// `NavigationCompleted`, milliseconds since 1970.
    pub complete_unix_ms: f64,
    /// Redirect hops seen by the host.
    pub redirects: u32,
    /// The address the view showed when it ended (after any redirects).
    pub final_uri: String,
    /// Same or other origin than the tab's previous page.
    pub origin: OriginRelation,
    /// How it ended.
    pub outcome: NavOutcome,
}

/// One tab's navigations (host events only; cheap enough to run always).
#[derive(Debug, Default)]
pub struct NavTracker {
    open: HashMap<u64, Open>,
    /// The origin of the tab's previous page (the last navigation that loaded).
    last_origin: Option<String>,
    last: Option<Finished>,
}

impl NavTracker {
    /// A new tab.
    pub fn new() -> Self {
        Self::default()
    }

    /// WebView2 `NavigationStarting` for the page (not a frame). Navigations the gate cancelled are not started.
    pub fn started(&mut self, nav_id: u64, redirected: bool, allowed: bool, at_unix_ms: f64) {
        if !allowed {
            return;
        }
        match self.open.get_mut(&nav_id) {
            Some(o) if redirected => o.redirects += 1,
            Some(_) => {}
            None => {
                self.open.insert(
                    nav_id,
                    Open {
                        start_unix_ms: at_unix_ms,
                        redirects: 0,
                    },
                );
            }
        }
    }

    /// WebView2 `NavigationCompleted`. Returns the finished navigation, or `None` if its start was never seen (for
    /// example one the gate cancelled).
    pub fn completed(
        &mut self,
        nav_id: u64,
        final_uri: &str,
        success: bool,
        web_error_status: i32,
        at_unix_ms: f64,
    ) -> Option<Finished> {
        let o = self.open.remove(&nav_id)?;
        let here = origin_of(final_uri);
        let origin = match (&here, &self.last_origin) {
            (Some(a), Some(b)) if a == b => OriginRelation::SameOrigin,
            _ => OriginRelation::CrossOrigin,
        };
        let outcome = if success {
            NavOutcome::Completed
        } else if web_error_status == WEB_ERROR_OPERATION_CANCELED {
            NavOutcome::Cancelled
        } else {
            NavOutcome::Failed
        };
        if success {
            self.last_origin = here;
        }
        let f = Finished {
            nav_id,
            start_unix_ms: o.start_unix_ms,
            complete_unix_ms: at_unix_ms,
            redirects: o.redirects,
            final_uri: final_uri.to_string(),
            origin,
            outcome,
        };
        self.last = Some(f.clone());
        Some(f)
    }

    /// The tab's last finished navigation.
    pub fn last(&self) -> Option<&Finished> {
        self.last.as_ref()
    }
}

/// The page's own Navigation Timing entry (`PerformanceNavigationTiming`), milliseconds after its `startTime`.
#[derive(Debug, Clone, PartialEq)]
pub struct PageTiming {
    /// The entry's `name`: the document's address.
    pub name: String,
    /// `responseStart`.
    pub response_start: f64,
    /// `domContentLoadedEventStart`.
    pub dom_content_loaded_event_start: f64,
    /// `loadEventEnd`.
    pub load_event_end: f64,
    /// `redirectCount` (0 after a redirect from another origin).
    pub redirect_count: u32,
}

/// The `nav_timing` record of a finished navigation. `run_start_unix_ms` is the run clock's zero (Ferrum's process
/// creation) and `now_unix_ms` the time the record is written. The page entry is used only if it belongs to the page
/// the navigation ended on and the navigation loaded; a zero in it means "not reached yet" (absent). Refuses times
/// out of order.
pub fn nav_record(
    f: &Finished,
    page: Option<&PageTiming>,
    tab: u64,
    run_start_unix_ms: f64,
    now_unix_ms: f64,
) -> Result<Record, String> {
    let start_ms = f.start_unix_ms - run_start_unix_ms;
    let complete = f.complete_unix_ms - f.start_unix_ms;
    let written = now_unix_ms - run_start_unix_ms;
    for (name, v) in [
        ("start", start_ms),
        ("completion", complete),
        ("write time", written),
    ] {
        if !v.is_finite() || v < 0.0 {
            return Err(format!("the {name} {v} is not a time on the run clock"));
        }
    }
    if now_unix_ms < f.complete_unix_ms {
        return Err("the record is written before the navigation completed".into());
    }
    let page = page.filter(|p| p.name == f.final_uri && f.outcome == NavOutcome::Completed);
    let reached = |v: f64| (v.is_finite() && v > 0.0).then_some(v);
    let (response, dcl, load) = match page {
        Some(p) => (
            reached(p.response_start),
            reached(p.dom_content_loaded_event_start),
            reached(p.load_event_end),
        ),
        None => (None, None, None),
    };
    let mut prev = ("start", 0.0);
    for (name, v) in [
        ("response", response),
        ("DOMContentLoaded", dcl),
        ("load", load),
    ] {
        if let Some(v) = v {
            if v < prev.1 {
                return Err(format!(
                    "{name} ({v:.1}) is before {} ({:.1})",
                    prev.0, prev.1
                ));
            }
            prev = (name, v);
        }
    }
    Ok(Record::NavTiming(NavTiming {
        t_ms: written.floor() as u64,
        tab,
        nav_id: f.nav_id,
        start_ms,
        response_ms: response,
        dom_content_loaded_ms: dcl,
        load_ms: load,
        complete_ms: Some(complete),
        origin: f.origin,
        redirect_count: f.redirects,
        outcome: f.outcome,
    }))
}

/// The origin (`scheme://host[:port]`, lowercase, default port left out) of an address with a host; `None` for one
/// without (`about:blank`, `data:`), which is an opaque origin.
pub fn origin_of(uri: &str) -> Option<String> {
    let (scheme, rest) = uri.split_once("://")?;
    let scheme = scheme.to_ascii_lowercase();
    let authority = rest.split(['/', '?', '#']).next()?;
    let host_port = authority.rsplit('@').next()?.to_ascii_lowercase();
    if host_port.is_empty() {
        return None;
    }
    let host_port = match (scheme.as_str(), host_port.rsplit_once(':')) {
        ("https", Some((h, "443"))) | ("http", Some((h, "80"))) => h.to_string(),
        _ => host_port,
    };
    Some(format!("{scheme}://{host_port}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const T0: f64 = 1_792_000_000_000.0;

    fn page(name: &str) -> PageTiming {
        PageTiming {
            name: name.into(),
            response_start: 12.5,
            dom_content_loaded_event_start: 30.0,
            load_event_end: 31.2,
            redirect_count: 1,
        }
    }

    #[test]
    fn redirect_hops_count_and_the_record_is_ordered_on_the_run_clock() {
        let mut t = NavTracker::new();
        t.started(7, false, true, T0 + 100.0);
        t.started(7, true, true, T0 + 104.0);
        t.started(7, true, true, T0 + 108.0);
        let f = t
            .completed(7, "https://localhost:8443/landing", true, 0, T0 + 150.0)
            .unwrap();
        assert_eq!(f.redirects, 2);
        let r = nav_record(
            &f,
            Some(&page("https://localhost:8443/landing")),
            3,
            T0,
            T0 + 200.0,
        )
        .unwrap();
        crate::export::validate::validate_record(&r).unwrap();
        let Record::NavTiming(n) = r else { panic!() };
        assert_eq!((n.t_ms, n.tab, n.nav_id, n.redirect_count), (200, 3, 7, 2));
        assert_eq!(n.start_ms, 100.0);
        assert_eq!(n.response_ms, Some(12.5));
        assert_eq!(n.dom_content_loaded_ms, Some(30.0));
        assert_eq!(n.load_ms, Some(31.2));
        assert_eq!(n.complete_ms, Some(50.0));
        assert_eq!(n.outcome, NavOutcome::Completed);
    }

    #[test]
    fn origin_label_compares_with_the_previous_page() {
        let mut t = NavTracker::new();
        let mut go = |id, uri: &str, ok| {
            t.started(id, false, true, T0);
            t.completed(id, uri, ok, if ok { 0 } else { 6 }, T0 + 1.0)
                .unwrap()
                .origin
        };
        use OriginRelation::*;
        assert_eq!(
            go(1, "https://localhost:8443/landing", true),
            CrossOrigin,
            "first page"
        );
        assert_eq!(go(2, "https://LOCALHOST:8443/other?x#y", true), SameOrigin);
        assert_eq!(
            go(3, "https://site-b.localhost:8443/landing", true),
            CrossOrigin
        );
        assert_eq!(go(4, "https://localhost:8443/down", false), CrossOrigin);
        // a failed load is not the previous page: site-b still is
        assert_eq!(go(5, "https://site-b.localhost:8443/x", true), SameOrigin);
        assert_eq!(go(6, "about:blank", true), CrossOrigin);
    }

    #[test]
    fn outcomes_gate_cancels_and_unknown_completions() {
        let mut t = NavTracker::new();
        t.started(1, false, false, T0);
        assert!(
            t.completed(1, "https://x.test/", false, 14, T0 + 1.0)
                .is_none(),
            "the gate cancelled it"
        );
        t.started(2, false, true, T0);
        let f = t
            .completed(2, "https://x.test/", false, 14, T0 + 1.0)
            .unwrap();
        assert_eq!(f.outcome, NavOutcome::Cancelled);
        t.started(3, false, true, T0);
        let f = t
            .completed(3, "https://x.test/", false, 6, T0 + 1.0)
            .unwrap();
        assert_eq!(f.outcome, NavOutcome::Failed);
        // the page entry of a failed navigation is not used
        let Record::NavTiming(n) =
            nav_record(&f, Some(&page("https://x.test/")), 1, T0, T0 + 2.0).unwrap()
        else {
            panic!()
        };
        assert_eq!((n.response_ms, n.load_ms), (None, None));
        assert_eq!(t.last().unwrap().nav_id, 3);
    }

    #[test]
    fn a_stale_or_unordered_page_entry_is_not_used_or_refused() {
        let mut t = NavTracker::new();
        t.started(1, false, true, T0 + 10.0);
        let f = t
            .completed(1, "https://x.test/a", true, 0, T0 + 20.0)
            .unwrap();
        // another page's entry (the tab moved on): absent, not wrong
        let Record::NavTiming(n) =
            nav_record(&f, Some(&page("https://x.test/b")), 1, T0, T0 + 30.0).unwrap()
        else {
            panic!()
        };
        assert_eq!(n.response_ms, None);
        // load not reached yet (0): absent
        let mut p = page("https://x.test/a");
        p.load_event_end = 0.0;
        let Record::NavTiming(n) = nav_record(&f, Some(&p), 1, T0, T0 + 30.0).unwrap() else {
            panic!()
        };
        assert_eq!((n.dom_content_loaded_ms, n.load_ms), (Some(30.0), None));
        let mut p = page("https://x.test/a");
        p.dom_content_loaded_event_start = 5.0;
        assert!(
            nav_record(&f, Some(&p), 1, T0, T0 + 30.0)
                .unwrap_err()
                .contains("DOMContentLoaded")
        );
        assert!(
            nav_record(&f, None, 1, T0 + 50.0, T0 + 60.0).is_err(),
            "start before the run clock"
        );
        assert!(
            nav_record(&f, None, 1, T0, T0 + 15.0).is_err(),
            "written before completion"
        );
    }

    #[test]
    fn origins_of_addresses() {
        assert_eq!(
            origin_of("https://Site-A.localhost:8443/p?q"),
            Some("https://site-a.localhost:8443".into())
        );
        assert_eq!(
            origin_of("https://example.com:443/"),
            Some("https://example.com".into())
        );
        assert_eq!(
            origin_of("http://example.com:80"),
            Some("http://example.com".into())
        );
        assert_eq!(
            origin_of("https://u:p@example.com/"),
            Some("https://example.com".into())
        );
        assert_eq!(
            origin_of("https://[::1]:8443/"),
            Some("https://[::1]:8443".into())
        );
        assert_eq!(origin_of("about:blank"), None);
        assert_eq!(origin_of("data:text/html,x"), None);
    }
}
