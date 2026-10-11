//! Creates, shows, hides and tears down the per-tab web views.
//!
//! Empty library stub created in P1 (task p1.4). Design: the component page
//! `wiki/architecture/components/comp-webview-manager.md`. Real code arrives in the phase named there.
#![forbid(unsafe_code)]

/// The crate name, so the stub has one public item and one test.
pub const CRATE_NAME: &str = "ferrum-webview-manager";

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn crate_name_matches_package() {
        assert_eq!(CRATE_NAME, env!("CARGO_PKG_NAME"));
    }
}
