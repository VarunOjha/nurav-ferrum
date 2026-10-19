//! Local, opt-in measurements of Ferrum itself for the benchmarks.
//!
//! Design: the component page `wiki/architecture/components/comp-telemetry.md`. Built in P5: the export format
//! ([`export`], p5.1), which processes are Ferrum's ([`attribution`], p5.2), the process sampler ([`sampler`] and
//! the Windows calls in `win`, p5.3), the startup timing chain ([`startup`], p5.6), navigation timing ([`navigation`],
//! p5.7); lifecycle records follow in a later P5 task.
// deny, not forbid: `win` is the one module allowed to use unsafe code (adr-0019 point 3).
#![deny(unsafe_code)]

pub mod attribution;
pub mod export;
pub mod navigation;
pub mod sampler;
pub mod startup;
#[cfg(windows)]
#[allow(unsafe_code)]
pub mod win;
