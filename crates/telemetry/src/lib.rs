//! Local, opt-in measurements of Ferrum itself for the benchmarks.
//!
//! Design: the component page `wiki/architecture/components/comp-telemetry.md`. Built in P5: the export format
//! ([`export`], p5.1), which processes are Ferrum's ([`attribution`], p5.2), the process sampler ([`sampler`] and
//! the Windows calls in `win`, p5.3); timing and lifecycle records follow in later P5 tasks.
// deny, not forbid: `win` is the one module allowed to use unsafe code (adr-0019 point 3).
#![deny(unsafe_code)]

pub mod attribution;
pub mod export;
pub mod sampler;
#[cfg(windows)]
#[allow(unsafe_code)]
pub mod win;
