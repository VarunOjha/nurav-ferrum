//! Shared types, configuration and errors used by every other Ferrum crate.
//!
//! The leaf crate: it depends on serde and similar only (no Tauri, no `windows`, no other Ferrum crate). Design:
//! the component page `wiki/architecture/components/comp-core.md`.
#![forbid(unsafe_code)]

pub mod config;

pub mod address;
pub mod fsutil;
pub mod history;
pub mod oauth;
pub mod profiles;
pub mod session;
pub mod shortcuts;
pub mod store;
pub mod tabs;
