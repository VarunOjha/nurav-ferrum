//! Decides which navigations, permissions and downloads are allowed (comp-security-engine).
//!
//! P4 task p4.2 builds the navigation policy: [`rules`] reads blocklist and allowlist entries, [`policy`] decides
//! one navigation with [`policy::evaluate`]. Pure code: no WebView, no Tauri, no input or output, so every rule is
//! tested without a browser. The hooks that call it are in the app (p4.3). Design:
//! `wiki/architecture/components/comp-security-engine.md`.
#![forbid(unsafe_code)]

pub mod policy;
pub mod rules;

pub use policy::{Context, Decision, Policy, Request, RuleId, Verdict, evaluate};
pub use rules::{HostRule, RuleError, RuleList};
