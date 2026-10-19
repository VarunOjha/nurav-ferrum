//! p5.5 sampler overhead: what the sampler itself costs (CPU time, cycles, private commit) at each interval, over a
//! 17-process set (the size seen live in p5.2 and p5.3): this test process plus 16 idle `ferrum-ground-truth` helpers.
//! A run without sampling (the same loop, sleeping only) is the baseline. This characterises the tool; it has no
//! pass limits and makes no comparison (phase-p5-telemetry).
//!
//! Ignored by default (it takes about two minutes); run by `scripts/verify/p5.5-meter-own-cost.ps1`. The results are
//! printed as one `SAMPLER-COST <json>` line.
#![cfg(windows)]

use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use ferrum_telemetry::attribution::{Member, ProcessSet};
use ferrum_telemetry::export::ProcessKind;
use ferrum_telemetry::sampler::{Reading, Sampler, SamplerConfig};
use ferrum_telemetry::win;
use serde_json::{Value, json};

const HELPERS: usize = 16;
const RUN: Duration = Duration::from_secs(20);
const INTERVALS_MS: [u32; 5] = [100, 250, 500, 1000, 2000];

fn own() -> (u64, u64, u64) {
    match win::read(std::process::id()) {
        Reading::Read(c) => (
            c.cpu_user_100ns + c.cpu_kernel_100ns,
            c.cycles.unwrap_or(0),
            c.private_commit_bytes,
        ),
        other => panic!("cannot read the test process: {other:?}"),
    }
}

/// One run of `RUN` length: sample every `interval` (or only sleep when `None`). Returns the costs.
fn run(set: &ProcessSet, interval: Option<u32>) -> Value {
    let mut sampler = Sampler::new();
    let step = Duration::from_millis(u64::from(interval.unwrap_or(1000)));
    let (cpu0, cyc0, commit0) = own();
    let start = Instant::now();
    let mut next = start;
    let (mut readings, mut gaps, mut busy) = (0u64, 0u64, Duration::ZERO);
    let mut slowest = Duration::ZERO;
    while start.elapsed() < RUN {
        if let Some(wait) = next.checked_duration_since(Instant::now()) {
            std::thread::sleep(wait);
        }
        if interval.is_some() {
            let t0 = Instant::now();
            let out = sampler.tick(start.elapsed().as_millis() as u64, Ok(set), win::read);
            let took = t0.elapsed();
            busy += took;
            slowest = slowest.max(took);
            readings += 1;
            if out.iter().any(|r| r.kind() == "sample_gap") {
                gaps += 1;
            }
            std::hint::black_box(out);
        }
        next = Instant::now() + step;
    }
    let wall = start.elapsed().as_secs_f64();
    let (cpu1, cyc1, commit1) = own();
    let cpu_ms = (cpu1 - cpu0) as f64 / 1e4;
    json!({
        "interval_ms": interval,
        "wall_s": wall,
        "readings": readings,
        "gaps": gaps,
        "cpu_ms": cpu_ms,
        "cpu_ms_per_s": cpu_ms / wall,
        "cycles": cyc1 - cyc0,
        "cycles_per_reading": (cyc1 - cyc0).checked_div(readings).unwrap_or(0),
        "reading_wall_us_mean": if readings > 0 { busy.as_secs_f64() * 1e6 / readings as f64 } else { 0.0 },
        "reading_wall_us_max": slowest.as_secs_f64() * 1e6,
        "private_commit_change_kib": (commit1 as f64 - commit0 as f64) / 1024.0,
    })
}

#[test]
#[ignore = "p5.5 overhead characterisation: about two minutes; run by scripts/verify/p5.5-meter-own-cost.ps1"]
fn the_sampler_costs_per_interval() {
    let mut helpers: Vec<Child> = (0..HELPERS)
        .map(|_| {
            Command::new(env!("CARGO_BIN_EXE_ferrum-ground-truth"))
                .stdin(Stdio::piped())
                .stdout(Stdio::null())
                .spawn()
                .expect("start a helper")
        })
        .collect();
    std::thread::sleep(Duration::from_millis(500));
    let me = std::process::id();
    let mut members = vec![Member {
        pid: me,
        kind: ProcessKind::Host,
        source: "test".into(),
    }];
    members.extend(helpers.iter().map(|h| Member {
        pid: h.id(),
        kind: ProcessKind::Utility,
        source: "test".into(),
    }));
    let set = ProcessSet {
        host_pid: me,
        members,
    };
    assert!(
        SamplerConfig::new(INTERVALS_MS[0]).is_ok(),
        "the shortest interval tried is allowed"
    );

    let mut runs = vec![run(&set, None)];
    for ms in INTERVALS_MS {
        runs.push(run(&set, Some(ms)));
    }
    for r in &runs {
        println!("COST {r}");
    }
    // Closing stdin ends each helper by itself.
    for h in &mut helpers {
        drop(h.stdin.take());
    }
    for h in &mut helpers {
        h.wait().unwrap();
    }
    let os = std::env::var("OS").unwrap_or_default();
    println!(
        "SAMPLER-COST {}",
        json!({"set_size": set.members.len(), "run_s": RUN.as_secs(), "os": os, "build": if cfg!(debug_assertions) { "debug" } else { "release (optimised)" }, "runs": runs})
    );
    for r in &runs[1..] {
        assert!(r["readings"].as_u64().unwrap() > 0);
        assert_eq!(r["gaps"], 0, "every reading of idle helpers is complete");
    }
}
