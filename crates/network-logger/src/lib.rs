//! Local log of the network requests each tab makes.
//!
//! Empty library stub created in P1 (task p1.4). Design: the component page
//! `wiki/architecture/components/comp-network-logger.md`. Real code arrives in the phase named there.
#![forbid(unsafe_code)]

/// The crate name, so the stub has one public item and one test.
pub const CRATE_NAME: &str = "ferrum-network-logger";

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn crate_name_matches_package() {
        assert_eq!(CRATE_NAME, env!("CARGO_PKG_NAME"));
    }
}
