//! The process sampler (p5.3): at each moment, read the counters of every process in Ferrum's set (p5.2) and add them
//! up into one `tree_sample`, the headline series. This module is the pure part; the Windows calls are in `win`.
//!
//! Rules (comp-telemetry, measurement note):
//! - the headline is the sum of private commit (`PrivateUsage`) over the set; working set is secondary;
//! - a peak is read from the summed series ([`peak_private_commit`]), never added up from per-process peaks;
//! - a process is named by its pid **and** its creation time, so a reused pid is a new process;
//! - CPU and cycles of a process that has ended stay in the sum at their last reading, so the tree CPU never drops;
//! - when the set is refused or a running member cannot be read, the moment gets a `sample_gap` record: a smaller
//!   number is never written in place of the real one (the p5.2 finding: an environment can list nothing for a moment).

use std::collections::BTreeMap;

use crate::attribution::ProcessSet;
use crate::export::{GapReason, ProcessKind, ProcessSample, Record, SampleGap, TreeSample};

/// The counters of one process, as Windows reports them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Counters {
    /// The process creation time (FILETIME, 100 ns units); with the pid it names one process.
    pub created_100ns: u64,
    /// `PrivateUsage`: private commit, the headline memory counter.
    pub private_commit_bytes: u64,
    /// `WorkingSetSize` (counts shared pages in every process that maps them).
    pub working_set_bytes: u64,
    /// `PrivateWorkingSetSize`, when the counter is available.
    pub private_working_set_bytes: Option<u64>,
    /// `PageFaultCount` since the process started.
    pub page_faults: u64,
    /// User-mode CPU time since the process started (100 ns units).
    pub cpu_user_100ns: u64,
    /// Kernel-mode CPU time since the process started (100 ns units).
    pub cpu_kernel_100ns: u64,
    /// `QueryProcessCycleTime`, when available.
    pub cycles: Option<u64>,
}

/// What reading one process gave.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Reading {
    /// The counters.
    Read(Counters),
    /// The process has ended (between the set being listed and the read): it no longer uses memory.
    Gone,
    /// The process runs but its counters could not be read (the words say why).
    Unreadable(String),
}

/// The sampling interval: 100 ms to 60 s, 1 s unless set otherwise (ov-arch-configuration `sample_interval_ms`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SamplerConfig {
    interval_ms: u32,
}

impl SamplerConfig {
    /// The shortest interval allowed.
    pub const MIN_INTERVAL_MS: u32 = 100;
    /// The longest interval allowed.
    pub const MAX_INTERVAL_MS: u32 = 60_000;
    /// The interval used when none is set.
    pub const DEFAULT_INTERVAL_MS: u32 = 1_000;

    /// An interval in milliseconds; refused outside 100 to 60 000.
    pub fn new(interval_ms: u32) -> Result<Self, String> {
        if (Self::MIN_INTERVAL_MS..=Self::MAX_INTERVAL_MS).contains(&interval_ms) {
            Ok(SamplerConfig { interval_ms })
        } else {
            Err(format!(
                "sample_interval_ms {interval_ms} is outside {} to {}",
                Self::MIN_INTERVAL_MS,
                Self::MAX_INTERVAL_MS
            ))
        }
    }

    /// The interval in milliseconds.
    pub fn interval_ms(&self) -> u32 {
        self.interval_ms
    }
}

impl Default for SamplerConfig {
    fn default() -> Self {
        SamplerConfig {
            interval_ms: Self::DEFAULT_INTERVAL_MS,
        }
    }
}

/// CPU and cycles of one process at its last reading.
#[derive(Debug, Clone, Copy)]
struct Last {
    cpu_100ns: u64,
    cycles: Option<u64>,
}

/// The state kept between moments: which processes were read last time, and the CPU of the ones that have ended.
#[derive(Debug, Default)]
pub struct Sampler {
    host_created_100ns: Option<u64>,
    live: BTreeMap<(u32, u64), Last>,
    ended_cpu_100ns: u64,
    /// `None` once a process without a cycle count has ended.
    ended_cycles: Option<u64>,
}

impl Sampler {
    /// A sampler with nothing seen yet.
    pub fn new() -> Self {
        Sampler {
            ended_cycles: Some(0),
            ..Default::default()
        }
    }

    /// One moment: `set` is Ferrum's process set (or why it was refused), `read` reads one pid. Returns the
    /// `process_sample` records and the `tree_sample`, or one `sample_gap`. A gap changes no state.
    pub fn tick(
        &mut self,
        t_ms: u64,
        set: Result<&ProcessSet, &str>,
        mut read: impl FnMut(u32) -> Reading,
    ) -> Vec<Record> {
        let gap = |reason, missing| {
            vec![Record::SampleGap(SampleGap {
                t_ms,
                reason,
                missing,
            })]
        };
        let Ok(set) = set else {
            return gap(GapReason::SetRefused, None);
        };
        let mut read_now: Vec<(u32, ProcessKind, Counters)> = Vec::new();
        let mut missing = 0u32;
        let mut host_created = self.host_created_100ns;
        for m in &set.members {
            match read(m.pid) {
                Reading::Read(c) => {
                    if m.kind == ProcessKind::Host {
                        host_created = Some(c.created_100ns);
                    }
                    read_now.push((m.pid, m.kind, c));
                }
                Reading::Gone => {}
                Reading::Unreadable(_) => missing += 1,
            }
        }
        // Ferrum starts its browser engine, so every member is younger than Ferrum. An older one is another process
        // that got a reused pid between the listing and the read: it is not Ferrum's, and the real one is unread.
        if let Some(h) = host_created {
            let before = read_now.len();
            read_now.retain(|(_, kind, c)| *kind == ProcessKind::Host || c.created_100ns >= h);
            missing += (before - read_now.len()) as u32;
        }
        if !read_now.iter().any(|(_, k, _)| *k == ProcessKind::Host) && missing == 0 {
            missing = 1; // Ferrum itself always runs while it samples
        }
        if missing > 0 {
            return gap(GapReason::CountersUnreadable, Some(missing));
        }
        self.host_created_100ns = host_created;

        let mut now: BTreeMap<(u32, u64), Last> = BTreeMap::new();
        let mut records = Vec::with_capacity(read_now.len() + 1);
        let (mut private, mut ws, mut cpu, mut cycles) = (0u64, 0u64, 0u64, Some(0u64));
        for (pid, kind, c) in &read_now {
            let last = Last {
                cpu_100ns: c.cpu_user_100ns.saturating_add(c.cpu_kernel_100ns),
                cycles: c.cycles,
            };
            now.insert((*pid, c.created_100ns), last);
            private = private.saturating_add(c.private_commit_bytes);
            ws = ws.saturating_add(c.working_set_bytes);
            cpu = cpu.saturating_add(last.cpu_100ns);
            cycles = add(cycles, last.cycles);
            records.push(Record::ProcessSample(ProcessSample {
                t_ms,
                pid: *pid,
                pid_created_100ns: c.created_100ns,
                kind: *kind,
                private_commit_bytes: c.private_commit_bytes,
                working_set_bytes: c.working_set_bytes,
                private_working_set_bytes: c.private_working_set_bytes,
                page_faults: c.page_faults,
                cpu_user_100ns: c.cpu_user_100ns,
                cpu_kernel_100ns: c.cpu_kernel_100ns,
                cycles: c.cycles,
            }));
        }
        for (id, last) in &self.live {
            if !now.contains_key(id) {
                self.ended_cpu_100ns = self.ended_cpu_100ns.saturating_add(last.cpu_100ns);
                self.ended_cycles = add(self.ended_cycles, last.cycles);
            }
        }
        self.live = now;
        records.push(Record::TreeSample(TreeSample {
            t_ms,
            process_count: read_now.len() as u32,
            private_commit_bytes: private,
            working_set_bytes: ws,
            cpu_100ns: cpu.saturating_add(self.ended_cpu_100ns),
            cycles: add(cycles, self.ended_cycles),
        }));
        records
    }
}

fn add(a: Option<u64>, b: Option<u64>) -> Option<u64> {
    Some(a?.saturating_add(b?))
}

/// The sum of private commit over one moment's process samples (the headline value of that moment).
pub fn tree_private_commit(samples: &[ProcessSample]) -> u64 {
    samples
        .iter()
        .fold(0u64, |s, p| s.saturating_add(p.private_commit_bytes))
}

/// The peak of the summed series: the largest `private_commit_bytes` of the tree samples, with its `t_ms` (the first
/// one on a tie). Never the sum of per-process peaks, which adds up maxima that happened at different moments.
pub fn peak_private_commit(series: &[TreeSample]) -> Option<(u64, u64)> {
    series.iter().fold(None, |best, s| match best {
        Some((_, b)) if b >= s.private_commit_bytes => best,
        _ => Some((s.t_ms, s.private_commit_bytes)),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::attribution::Member;

    fn set(members: &[(u32, ProcessKind)]) -> ProcessSet {
        ProcessSet {
            host_pid: members[0].0,
            members: members
                .iter()
                .map(|(pid, kind)| Member {
                    pid: *pid,
                    kind: *kind,
                    source: "shell".into(),
                })
                .collect(),
        }
    }

    fn c(created: u64, private: u64, cpu: u64) -> Counters {
        Counters {
            created_100ns: created,
            private_commit_bytes: private,
            working_set_bytes: private * 2,
            private_working_set_bytes: Some(private / 2),
            page_faults: 1,
            cpu_user_100ns: cpu,
            cpu_kernel_100ns: 0,
            cycles: Some(cpu * 10),
        }
    }

    fn tree(records: &[Record]) -> TreeSample {
        match records.last() {
            Some(Record::TreeSample(t)) => t.clone(),
            other => panic!("no tree sample: {other:?}"),
        }
    }

    use ProcessKind::{Browser, Host, Renderer};

    #[test]
    fn the_tree_is_the_sum_of_private_commit_over_the_set() {
        let s = set(&[(10, Host), (20, Browser), (30, Renderer)]);
        let mut sampler = Sampler::new();
        let out = sampler.tick(0, Ok(&s), |pid| {
            Reading::Read(match pid {
                10 => c(100, 1_000, 5),
                20 => c(200, 20_000, 7),
                _ => c(300, 300_000, 11),
            })
        });
        assert_eq!(out.len(), 4, "three process samples and the tree");
        let t = tree(&out);
        assert_eq!(t.process_count, 3);
        assert_eq!(t.private_commit_bytes, 321_000);
        assert_eq!(t.working_set_bytes, 642_000);
        assert_eq!(t.cpu_100ns, 23);
        assert_eq!(t.cycles, Some(230));
        let per: Vec<ProcessSample> = out
            .iter()
            .filter_map(|r| match r {
                Record::ProcessSample(p) => Some(p.clone()),
                _ => None,
            })
            .collect();
        assert_eq!(tree_private_commit(&per), t.private_commit_bytes);
        assert_eq!(
            per[1].pid_created_100ns, 200,
            "pid paired with its creation time"
        );
    }

    #[test]
    fn the_peak_comes_from_the_summed_series_not_from_per_process_peaks() {
        // Two processes peak at different moments: A is big first, B is big later.
        let s = set(&[(1, Host), (2, Browser), (3, Renderer)]);
        let mut sampler = Sampler::new();
        let values = [(0u64, 100u64, 10u64), (1_000, 10, 100), (2_000, 50, 50)];
        let mut series = Vec::new();
        for (t, a, b) in values {
            let out = sampler.tick(t, Ok(&s), |pid| {
                Reading::Read(match pid {
                    1 => c(5, 0, 0),
                    2 => c(6, a, 0),
                    _ => c(7, b, 0),
                })
            });
            series.push(tree(&out));
        }
        assert_eq!(
            peak_private_commit(&series),
            Some((0, 110)),
            "first of the tied peaks"
        );
        let sum_of_peaks = 100 + 100;
        assert_ne!(peak_private_commit(&series).unwrap().1, sum_of_peaks);
        assert_eq!(peak_private_commit(&[]), None);
    }

    #[test]
    fn a_refused_set_or_an_unreadable_member_gives_a_gap_not_a_smaller_number() {
        let s = set(&[(1, Host), (2, Browser)]);
        let mut sampler = Sampler::new();
        let first = sampler.tick(0, Ok(&s), |_| Reading::Read(c(5, 10, 1)));
        assert_eq!(tree(&first).private_commit_bytes, 20);
        assert_eq!(
            sampler.tick(
                1,
                Err("site-a reported no browser process"),
                |_| unreachable!()
            ),
            vec![Record::SampleGap(SampleGap {
                t_ms: 1,
                reason: GapReason::SetRefused,
                missing: None
            })]
        );
        let out = sampler.tick(2, Ok(&s), |pid| {
            if pid == 2 {
                Reading::Unreadable("access denied".into())
            } else {
                Reading::Read(c(5, 10, 1))
            }
        });
        assert_eq!(
            out,
            vec![Record::SampleGap(SampleGap {
                t_ms: 2,
                reason: GapReason::CountersUnreadable,
                missing: Some(1)
            })]
        );
        let host_gone = sampler.tick(3, Ok(&s), |pid| {
            if pid == 1 {
                Reading::Gone
            } else {
                Reading::Read(c(5, 10, 1))
            }
        });
        assert!(
            matches!(host_gone[0], Record::SampleGap(_)),
            "no tree without Ferrum itself"
        );
        // a gap changes nothing: the next full moment continues as before
        let again = sampler.tick(4, Ok(&s), |_| Reading::Read(c(5, 10, 2)));
        assert_eq!(tree(&again).cpu_100ns, 4);
    }

    #[test]
    fn cpu_of_an_ended_process_stays_in_the_sum() {
        let both = set(&[(1, Host), (2, Renderer)]);
        let host_only = set(&[(1, Host)]);
        let mut sampler = Sampler::new();
        let a = tree(&sampler.tick(0, Ok(&both), |pid| {
            Reading::Read(if pid == 1 {
                c(5, 10, 100)
            } else {
                c(6, 99, 40)
            })
        }));
        assert_eq!(a.cpu_100ns, 140);
        // the renderer ends; its memory leaves the sum, its CPU time stays
        let b = tree(&sampler.tick(1_000, Ok(&both), |pid| {
            if pid == 1 {
                Reading::Read(c(5, 10, 120))
            } else {
                Reading::Gone
            }
        }));
        assert_eq!(
            (b.process_count, b.private_commit_bytes, b.cpu_100ns),
            (1, 10, 160)
        );
        assert_eq!(b.cycles, Some(1_600));
        let c3 = tree(&sampler.tick(2_000, Ok(&host_only), |_| Reading::Read(c(5, 10, 130))));
        assert_eq!(c3.cpu_100ns, 170, "never drops");
    }

    #[test]
    fn a_reused_pid_is_a_new_process() {
        let s = set(&[(1, Host), (2, Renderer)]);
        let mut sampler = Sampler::new();
        let _ = sampler.tick(0, Ok(&s), |pid| {
            Reading::Read(if pid == 1 { c(5, 10, 0) } else { c(6, 10, 50) })
        });
        // pid 2 ended and a new renderer got the same pid: the old one's CPU is kept, the new one counts from its start
        let t = tree(&sampler.tick(1_000, Ok(&s), |pid| {
            Reading::Read(if pid == 1 { c(5, 10, 0) } else { c(9, 10, 3) })
        }));
        assert_eq!(t.cpu_100ns, 53);
        // a member older than Ferrum is someone else's process with a reused pid: a gap, not their numbers
        let out = sampler.tick(2_000, Ok(&s), |pid| {
            Reading::Read(if pid == 1 { c(5, 10, 0) } else { c(4, 999, 0) })
        });
        assert_eq!(
            out,
            vec![Record::SampleGap(SampleGap {
                t_ms: 2_000,
                reason: GapReason::CountersUnreadable,
                missing: Some(1)
            })]
        );
    }

    #[test]
    fn missing_cycle_counts_make_the_cycle_sum_unknown() {
        let s = set(&[(1, Host), (2, Browser)]);
        let mut sampler = Sampler::new();
        let t = tree(&sampler.tick(0, Ok(&s), |pid| {
            let mut x = c(5, 1, 1);
            if pid == 2 {
                x.cycles = None;
            }
            Reading::Read(x)
        }));
        assert_eq!(t.cycles, None);
    }

    #[test]
    fn the_interval_is_configurable_within_limits() {
        assert_eq!(SamplerConfig::default().interval_ms(), 1_000);
        assert_eq!(SamplerConfig::new(250).unwrap().interval_ms(), 250);
        assert!(SamplerConfig::new(100).is_ok());
        assert!(SamplerConfig::new(60_000).is_ok());
        assert!(SamplerConfig::new(99).is_err());
        assert!(SamplerConfig::new(60_001).is_err());
        assert!(SamplerConfig::new(0).is_err());
    }

    #[test]
    fn every_record_the_sampler_writes_is_valid() {
        let s = set(&[(1, Host), (2, Browser)]);
        let mut sampler = Sampler::new();
        let mut all = sampler.tick(0, Ok(&s), |_| Reading::Read(c(5, 10, 1)));
        all.extend(sampler.tick(1, Err("no"), |_| unreachable!()));
        all.extend(sampler.tick(2, Ok(&s), |_| Reading::Unreadable("x".into())));
        for r in &all {
            crate::export::validate::validate_record(r).unwrap();
        }
    }
}
