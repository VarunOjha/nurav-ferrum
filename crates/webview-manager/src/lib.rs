//! Creates, shows, hides and tears down the per-tab web views (design: `wiki/architecture/components/comp-webview-manager.md`).
//!
//! Tab web views are WebView2 controllers Ferrum creates itself from Tauri's environment (adr-0029, owner-approved).
//! **This crate holds Ferrum's only raw WebView2 COM code**, in the module [`webview2`] (adr-0019). The rest of the
//! crate is safe Rust: unsafe code is denied at the crate root, and every `unsafe` block in `webview2` must carry a
//! `// SAFETY:` comment naming its invariant (COM-1 … COM-9 on the integration page; enforced by
//! `clippy::undocumented_unsafe_blocks`).
#![deny(unsafe_code)]
#![deny(clippy::undocumented_unsafe_blocks)]

pub mod error;
pub mod tab;

pub use error::Error;

#[cfg(windows)]
pub mod webview2;
