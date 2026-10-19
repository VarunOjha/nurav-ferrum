//! p5.4 sampler validation against ground truth. A helper program (`ferrum-ground-truth`) uses a known amount of
//! memory and CPU; the sampler (`win::read` through `Sampler::tick`) must report it within the tolerances committed in
//! `ground-truth-tolerances.json` before the first run, and must agree with psutil, an independent reader.
//!
//! Ignored by default (it needs Python with psutil); run by `scripts/verify/p5.4-prove-meter-accurate.ps1`. Every
//! comparison is printed as `CHECK <name> ...` and all results as one `GROUND-TRUTH <json>` line, so the raw output
//! is the evidence.
#![cfg(windows)]

use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use ferrum_telemetry::attribution::{Member, ProcessSet};
use ferrum_telemetry::export::{ProcessKind, ProcessSample, Record, TreeSample};
use ferrum_telemetry::sampler::Sampler;
use ferrum_telemetry::win;
use serde_json::{Value, json};

const MIB: f64 = 1024.0 * 1024.0;

struct Helper {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl Helper {
    fn start() -> Helper {
        let mut child = Command::new(env!("CARGO_BIN_EXE_ferrum-ground-truth"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .expect("start the helper");
        let stdin = child.stdin.take().unwrap();
        let stdout = BufReader::new(child.stdout.take().unwrap());
        let mut h = Helper {
            child,
            stdin,
            stdout,
        };
        assert_eq!(h.line(), "ready");
        h
    }

    fn line(&mut self) -> String {
        let mut s = String::new();
        self.stdout.read_line(&mut s).unwrap();
        s.trim().to_string()
    }

    fn send(&mut self, cmd: &str) -> String {
        writeln!(self.stdin, "{cmd}").unwrap();
        self.stdin.flush().unwrap();
        let a = self.line();
        assert!(a.starts_with("done"), "{cmd}: {a}");
        a
    }
}

struct Run {
    sampler: Sampler,
    set: ProcessSet,
    helper_pid: u32,
    t: u64,
}

impl Run {
    /// One sampler moment over {this test process, the helper}: the helper's sample and the tree.
    fn tick(&mut self) -> (ProcessSample, TreeSample) {
        self.t += 1;
        let out = self.sampler.tick(self.t, Ok(&self.set), win::read);
        let (mut helper, mut tree, mut sum) = (None, None, 0u64);
        for r in out {
            match r {
                Record::ProcessSample(p) => {
                    sum += p.private_commit_bytes;
                    if p.pid == self.helper_pid {
                        helper = Some(p);
                    }
                }
                Record::TreeSample(t) => tree = Some(t),
                other => panic!("unexpected record {other:?}"),
            }
        }
        let tree = tree.expect("a tree sample");
        assert_eq!(tree.private_commit_bytes, sum, "the tree is the sum");
        (helper.expect("the helper's sample"), tree)
    }
}

fn psutil(pid: u32) -> Value {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = Command::new("python")
        .arg("tools/psutil_read.py")
        .arg(pid.to_string())
        .current_dir(&root)
        .output()
        .expect("run python (psutil is needed: python -m pip install --user psutil==7.2.2)");
    assert!(
        out.status.success(),
        "psutil_read.py failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    serde_json::from_slice(&out.stdout).unwrap()
}

#[derive(Default)]
struct Checks {
    failed: Vec<String>,
    results: serde_json::Map<String, Value>,
}

impl Checks {
    fn range(&mut self, name: &str, value: f64, min: Option<f64>, max: Option<f64>) {
        let ok = min.is_none_or(|m| value >= m) && max.is_none_or(|m| value <= m);
        let show = |v: Option<f64>| v.map_or("-".to_string(), |v| format!("{v}"));
        println!(
            "CHECK {name} = {value:.3} (allowed {} to {}) {}",
            show(min),
            show(max),
            if ok { "ok" } else { "FAILED" }
        );
        self.results.insert(
            name.into(),
            json!({"value": value, "min": min, "max": max, "ok": ok}),
        );
        if !ok {
            self.failed.push(name.into());
        }
    }
}

fn tolerances() -> Value {
    let p = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/ground-truth-tolerances.json");
    serde_json::from_slice(&std::fs::read(p).unwrap()).unwrap()
}

fn bounds(v: &Value) -> (Option<f64>, Option<f64>) {
    (v["min"].as_f64(), v["max"].as_f64())
}

fn delta_mib(a: u64, b: u64) -> f64 {
    (b as f64 - a as f64) / MIB
}

fn cpu(s: &ProcessSample) -> u64 {
    s.cpu_user_100ns + s.cpu_kernel_100ns
}

/// Ours before and after, psutil between them: psutil must lie within the tolerance of either of our readings.
fn compare_psutil(c: &mut Checks, label: &str, run: &mut Run, t: &Value) {
    let (a, _) = run.tick();
    let p = psutil(run.helper_pid);
    let (b, _) = run.tick();
    let near = |x: u64, y: u64, theirs: &Value| {
        let theirs = theirs.as_f64().unwrap();
        (theirs - x as f64).abs().min((theirs - y as f64).abs())
    };
    c.range(
        &format!("{label}.psutil_private_commit_diff_kib"),
        near(
            a.private_commit_bytes,
            b.private_commit_bytes,
            &p["private_commit_bytes"],
        ) / 1024.0,
        None,
        t["private_commit_abs_kib"].as_f64(),
    );
    c.range(
        &format!("{label}.psutil_working_set_diff_kib"),
        near(
            a.working_set_bytes,
            b.working_set_bytes,
            &p["working_set_bytes"],
        ) / 1024.0,
        None,
        t["working_set_abs_kib"].as_f64(),
    );
    c.range(
        &format!("{label}.psutil_uss_vs_private_working_set_diff_mib"),
        near(
            a.private_working_set_bytes.unwrap(),
            b.private_working_set_bytes.unwrap(),
            &p["uss_bytes"],
        ) / MIB,
        None,
        t["uss_vs_private_working_set_abs_mib"].as_f64(),
    );
    c.range(
        &format!("{label}.psutil_page_faults_diff"),
        near(a.page_faults, b.page_faults, &p["page_faults"]),
        None,
        t["page_faults_abs"].as_f64(),
    );
    c.range(
        &format!("{label}.psutil_cpu_diff_ms"),
        near(cpu(&a), cpu(&b), &p["cpu_100ns"]) / 1e4,
        None,
        t["cpu_abs_ms"].as_f64(),
    );
    c.results
        .insert("psutil_version".into(), p["psutil"].clone());
}

#[test]
#[ignore = "p5.4 validation: needs Python with psutil; run by scripts/verify/p5.4-prove-meter-accurate.ps1"]
fn the_sampler_reports_known_memory_and_cpu() {
    let tol = tolerances();
    let mut helper = Helper::start();
    let me = std::process::id();
    let helper_pid = helper.child.id();
    let member = |pid, kind| Member {
        pid,
        kind,
        source: "test".into(),
    };
    let mut run = Run {
        sampler: Sampler::new(),
        set: ProcessSet {
            host_pid: me,
            members: vec![
                member(me, ProcessKind::Host),
                member(helper_pid, ProcessKind::Utility),
            ],
        },
        helper_pid,
        t: 0,
    };
    let mut c = Checks::default();

    // Memory: allocate and touch a known number of MiB, then free it.
    let m = &tol["memory"];
    let mib = m["alloc_mib"].as_u64().unwrap();
    let (base, _) = run.tick();
    compare_psutil(&mut c, "idle", &mut run, &tol["psutil"]);
    helper.send(&format!("alloc {mib}"));
    let (full, _) = run.tick();
    let (lo, hi) = bounds(&m["private_commit_delta_mib"]);
    c.range(
        "alloc.private_commit_delta_mib",
        delta_mib(base.private_commit_bytes, full.private_commit_bytes),
        lo,
        hi,
    );
    let (lo, hi) = bounds(&m["private_working_set_delta_mib"]);
    c.range(
        "alloc.private_working_set_delta_mib",
        delta_mib(
            base.private_working_set_bytes.unwrap(),
            full.private_working_set_bytes.unwrap(),
        ),
        lo,
        hi,
    );
    let (lo, hi) = bounds(&m["working_set_delta_mib"]);
    c.range(
        "alloc.working_set_delta_mib",
        delta_mib(base.working_set_bytes, full.working_set_bytes),
        lo,
        hi,
    );
    c.range(
        "alloc.page_faults_per_touched_page",
        (full.page_faults - base.page_faults) as f64 / (mib as f64 * 256.0),
        m["page_faults_per_touched_page"]["min"].as_f64(),
        None,
    );
    compare_psutil(&mut c, "allocated", &mut run, &tol["psutil"]);
    helper.send("free");
    let (freed, _) = run.tick();
    c.range(
        "free.private_commit_above_baseline_mib",
        delta_mib(base.private_commit_bytes, freed.private_commit_bytes),
        None,
        m["after_free_private_commit_above_baseline_mib"]["max"].as_f64(),
    );

    // CPU: one thread busy for a known time.
    let t = &tol["cpu"];
    let burn = t["burn_ms"].as_u64().unwrap();
    let (before, tree_before) = run.tick();
    let answer = helper.send(&format!("burn {burn}"));
    let wall_ms: f64 = answer.trim_start_matches("done ").parse().unwrap();
    let (after, tree_after) = run.tick();
    let cpu_ms = (cpu(&after) - cpu(&before)) as f64 / 1e4;
    let slack = t["tick_slack_ms"].as_f64().unwrap();
    let (lo, hi) = bounds(&t["cpu_per_wall"]);
    c.range(
        "burn.cpu_ms",
        cpu_ms,
        lo.map(|r| r * wall_ms - slack),
        hi.map(|r| r * wall_ms + slack),
    );
    c.results.insert("burn.wall_ms".into(), json!(wall_ms));
    let cycles = (after.cycles.unwrap() - before.cycles.unwrap()) as f64;
    let (lo, hi) = bounds(&t["cycles_per_cpu_second_ghz"]);
    c.range(
        "burn.cycles_per_cpu_second_ghz",
        cycles / (cpu_ms / 1000.0) / 1e9,
        lo,
        hi,
    );
    c.range(
        "burn.tree_cpu_delta_minus_helper_ms",
        (tree_after.cpu_100ns - tree_before.cpu_100ns) as f64 / 1e4 - cpu_ms,
        Some(0.0),
        None,
    );
    compare_psutil(&mut c, "after_burn", &mut run, &tol["psutil"]);

    writeln!(helper.stdin, "quit").unwrap();
    helper.child.wait().unwrap();
    println!("GROUND-TRUTH {}", Value::Object(c.results));
    assert!(c.failed.is_empty(), "outside tolerance: {:?}", c.failed);
}
