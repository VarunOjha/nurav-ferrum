//! Decides which navigations, permissions and downloads are allowed (comp-security-engine).
//!
//! P4 task p4.2 builds the navigation policy: [`rules`] reads blocklist and allowlist entries, [`policy`] decides
//! one navigation with [`policy::evaluate`]. Pure code: no WebView, no Tauri, no input or output, so every rule is
//! tested without a browser. The hooks that call it are in the app (p4.3). p4.5 adds [`permissions`]: which
//! permissions (camera, location, ...) a page's site was granted in settings; p4.6 adds [`downloads`]: safe file
//! names and the program-type warning. Design:
//! `wiki/architecture/components/comp-security-engine.md`.
#![forbid(unsafe_code)]

pub mod downloads;
pub mod permissions;
pub mod policy;
pub mod rules;

pub use permissions::{
    Grants, PermissionContext, PermissionDecision, PermissionRule, PermissionVerdict,
};
pub use policy::{Context, Decision, Policy, Request, RuleId, Verdict, evaluate};
pub use rules::{HostRule, RuleError, RuleList};
