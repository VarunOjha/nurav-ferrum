//! Microbenchmark harness for exp-security-overhead (P4 task p4.12): how long the security engine takes to decide on one
//! navigation (`evaluate`) and on one permission request (`Grants::decide`). It prints raw timings, one line per batch,
//! as CSV; the analysis is P6's (metric-policy-eval-latency). A P4 run only shows that the harness works: its numbers
//! are not results (no controlled machine state, no pre-registered campaign).
//!
//! Run (never into target/release, where a user's Ferrum may run):
//! `cargo run --release --locked -p ferrum-security --example microbench --target-dir target/bench -- --batches 30 --iters 20000`

use std::hint::black_box;
use std::time::Instant;

use ferrum_core::config::{PermissionKind, SiteSettings};
use ferrum_security::{Context, Grants, PermissionContext, Policy, Request, RuleList, evaluate};

/// The navigations decided on: label and address (all local or reserved names; nothing is loaded).
const NAVIGATIONS: &[(&str, &str)] = &[
    ("https-allowed", "https://site-a.localhost:8443/landing?x=1"),
    ("https-blocked-subdomain", "https://ads.blocked-0.test/page"),
    ("http-warn", "http://site-b.localhost:8080/landing"),
    ("external-scheme", "mailto:someone@example.invalid"),
    ("malformed", "https://exa mple.test/%%"),
];

/// Block rule list sizes tried (the shipped default is empty, owner answer Q-113).
const RULE_COUNTS: &[usize] = &[0, 10, 1000];

/// Per-site grant counts tried.
const GRANT_COUNTS: &[usize] = &[0, 10, 100];

fn arg(name: &str, default: u64) -> u64 {
    let args: Vec<String> = std::env::args().collect();
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn policy(rules: usize) -> Policy {
    let block: Vec<String> = (0..rules).map(|i| format!("blocked-{i}.test")).collect();
    Policy {
        blocklist: RuleList::parse(&block).expect("generated rules parse"),
        ..Policy::default()
    }
}

fn grants(sites: usize) -> Grants {
    let list: Vec<SiteSettings> = (0..sites)
        .map(|i| SiteSettings {
            site: format!("granted-{i}.test"),
            permissions: vec![PermissionKind::Notifications, PermissionKind::Geolocation],
            ..SiteSettings::default()
        })
        .collect();
    Grants::from_sites(&list)
}

/// Runs `f` `iters` times per batch, `batches` times after one warm-up batch, and prints one CSV line per batch.
fn measure(kind: &str, case: &str, size: usize, batches: u64, iters: u64, mut f: impl FnMut()) {
    for _ in 0..iters {
        f();
    }
    for b in 1..=batches {
        let start = Instant::now();
        for _ in 0..iters {
            f();
        }
        let ns = start.elapsed().as_nanos();
        println!(
            "{kind},{case},{size},{b},{iters},{ns},{:.1}",
            ns as f64 / iters as f64
        );
    }
}

fn main() {
    let batches = arg("--batches", 30);
    let iters = arg("--iters", 20_000);
    println!("# ferrum-security microbench (p4.12): harness operation only, not a result");
    println!("# batches={batches} iters={iters} warmup=1 batch per case");
    println!("kind,case,size,batch,iterations,total_ns,ns_per_call");
    for &rules in RULE_COUNTS {
        let p = policy(rules);
        for &(case, url) in NAVIGATIONS {
            let req = Request {
                url,
                context: Context::TopLevel,
                initiator: None,
            };
            measure("navigation", case, rules, batches, iters, || {
                black_box(evaluate(black_box(&p), black_box(&req)));
            });
        }
    }
    for &sites in GRANT_COUNTS {
        let g = grants(sites);
        for (case, origin) in [
            ("granted", "https://granted-0.test"),
            ("not-granted", "https://other.test"),
        ] {
            // The request comes from the tab's own page; nothing answered in the tab yet (p4.20: a not-granted
            // site's request is decided "ask").
            let cx = PermissionContext {
                page: origin,
                now: 0,
                once: &[],
            };
            measure("permission", case, sites, batches, iters, || {
                black_box(g.decide(
                    black_box(origin),
                    Some(PermissionKind::Notifications),
                    black_box(&cx),
                ));
            });
        }
    }
}
