//! Local, opt-in measurements of Ferrum itself for the benchmarks.
//!
//! Design: the component page `wiki/architecture/components/comp-telemetry.md`. Built in P5: the export format
//! ([`export`], p5.1), which processes are Ferrum's ([`attribution`], p5.2); the process sampler, timing and lifecycle
//! records follow in later P5 tasks.
#![forbid(unsafe_code)]

pub mod attribution;
pub mod export;
