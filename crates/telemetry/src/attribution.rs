//! Which processes are Ferrum's (p5.2, risk-r05): Ferrum's own process plus the processes WebView2 reports for
//! Ferrum's own browser environments (`GetProcessExtendedInfos`). Never by executable name: another app on the PC that
//! uses WebView2 runs the same `msedgewebview2.exe`, and counting it would inflate every number.
//!
//! This module is the pure part: it joins the lists that the app gathers on its UI thread into one set. The crash
//! reporter (crashpad) is not in WebView2's lists; it is left out for every product alike (comp-telemetry).

use std::collections::BTreeMap;
use std::fmt;

use crate::export::ProcessKind;

/// One process of Ferrum's set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Member {
    /// The process id.
    pub pid: u32,
    /// What it is.
    pub kind: ProcessKind,
    /// Where it came from: `host` for Ferrum itself, else the environment's label (`shell` or a site profile).
    pub source: String,
}

/// Ferrum's process set at one moment, sorted by pid, each process once.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessSet {
    /// Ferrum's own process id.
    pub host_pid: u32,
    /// Every member, Ferrum's own process included, sorted by pid.
    pub members: Vec<Member>,
}

impl ProcessSet {
    /// The process ids, sorted.
    pub fn pids(&self) -> Vec<u32> {
        self.members.iter().map(|m| m.pid).collect()
    }

    /// How many members have this kind.
    pub fn count(&self, kind: ProcessKind) -> usize {
        self.members.iter().filter(|m| m.kind == kind).count()
    }
}

/// Why the lists could not be joined.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AttributionError {
    /// A process id that is not a process (0 or negative).
    BadPid {
        /// The environment that reported it.
        source: String,
        /// The value reported.
        pid: i64,
    },
    /// The same process reported with two different kinds.
    KindConflict {
        /// The process id.
        pid: u32,
        /// The two kinds, as reported.
        kinds: (ProcessKind, ProcessKind),
    },
    /// An environment reported no browser process: its list cannot be complete.
    NoBrowser {
        /// The environment.
        source: String,
    },
}

impl fmt::Display for AttributionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AttributionError::BadPid { source, pid } => {
                write!(f, "{source} reported process id {pid}")
            }
            AttributionError::KindConflict { pid, kinds } => {
                write!(
                    f,
                    "process {pid} was reported as {:?} and as {:?}",
                    kinds.0, kinds.1
                )
            }
            AttributionError::NoBrowser { source } => {
                write!(f, "{source} reported no browser process")
            }
        }
    }
}

impl std::error::Error for AttributionError {}

/// Maps WebView2's process kind names (as the webview-manager reports them) to the export kinds. Kinds without their
/// own export value (`sandbox-helper`, `ppapi-plugin`, `ppapi-broker`, `unknown`) become [`ProcessKind::Other`].
pub fn kind_of(webview2_kind: &str) -> ProcessKind {
    match webview2_kind {
        "browser" => ProcessKind::Browser,
        "renderer" => ProcessKind::Renderer,
        "gpu" => ProcessKind::Gpu,
        "utility" => ProcessKind::Utility,
        _ => ProcessKind::Other,
    }
}

/// One environment's list: its label and `(pid, kind name)` per process.
pub type Inventory = (String, Vec<(i64, String)>);

/// Joins Ferrum's own process and each environment's list into one set. A process listed by two environments (the
/// same browser seen twice) is kept once.
pub fn attribute(host_pid: u32, inventories: &[Inventory]) -> Result<ProcessSet, AttributionError> {
    let mut by_pid: BTreeMap<u32, Member> = BTreeMap::new();
    by_pid.insert(
        host_pid,
        Member {
            pid: host_pid,
            kind: ProcessKind::Host,
            source: "host".into(),
        },
    );
    for (source, list) in inventories {
        if !list.iter().any(|(_, k)| k == "browser") {
            return Err(AttributionError::NoBrowser {
                source: source.clone(),
            });
        }
        for (pid, kind_name) in list {
            let pid32 = u32::try_from(*pid)
                .ok()
                .filter(|p| *p != 0)
                .ok_or_else(|| AttributionError::BadPid {
                    source: source.clone(),
                    pid: *pid,
                })?;
            let kind = kind_of(kind_name);
            match by_pid.get(&pid32) {
                Some(m) if m.kind != kind => {
                    return Err(AttributionError::KindConflict {
                        pid: pid32,
                        kinds: (m.kind, kind),
                    });
                }
                Some(_) => {}
                None => {
                    by_pid.insert(
                        pid32,
                        Member {
                            pid: pid32,
                            kind,
                            source: source.clone(),
                        },
                    );
                }
            }
        }
    }
    Ok(ProcessSet {
        host_pid,
        members: by_pid.into_values().collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inv(label: &str, items: &[(i64, &str)]) -> Inventory {
        (
            label.into(),
            items.iter().map(|(p, k)| (*p, (*k).to_string())).collect(),
        )
    }

    #[test]
    fn host_and_every_environment_process_once() {
        let set = attribute(
            100,
            &[
                inv(
                    "shell",
                    &[
                        (200, "browser"),
                        (201, "renderer"),
                        (202, "gpu"),
                        (203, "utility"),
                    ],
                ),
                inv(
                    "site-a",
                    &[(300, "browser"), (301, "renderer"), (302, "sandbox-helper")],
                ),
            ],
        )
        .unwrap();
        assert_eq!(set.pids(), vec![100, 200, 201, 202, 203, 300, 301, 302]);
        assert_eq!(set.count(ProcessKind::Host), 1);
        assert_eq!(set.count(ProcessKind::Browser), 2);
        assert_eq!(set.count(ProcessKind::Other), 1, "sandbox helper");
        assert_eq!(set.members[0].source, "host");
        assert_eq!(set.members[5].source, "site-a");
    }

    #[test]
    fn a_process_seen_twice_counts_once() {
        let set = attribute(
            1,
            &[
                inv("shell", &[(5, "browser"), (6, "renderer")]),
                inv("again", &[(5, "browser")]),
            ],
        )
        .unwrap();
        assert_eq!(set.pids(), vec![1, 5, 6]);
        assert_eq!(set.members[1].source, "shell", "first report wins");
    }

    #[test]
    fn bad_input_is_refused_not_guessed() {
        assert!(matches!(
            attribute(1, &[inv("shell", &[(5, "browser"), (0, "renderer")])]),
            Err(AttributionError::BadPid { pid: 0, .. })
        ));
        assert!(matches!(
            attribute(1, &[inv("shell", &[(5, "browser"), (-3, "gpu")])]),
            Err(AttributionError::BadPid { pid: -3, .. })
        ));
        assert!(matches!(
            attribute(
                1,
                &[
                    inv("shell", &[(5, "browser")]),
                    inv("b", &[(9, "browser"), (5, "renderer")])
                ]
            ),
            Err(AttributionError::KindConflict { pid: 5, .. })
        ));
        assert!(matches!(
            attribute(1, &[inv("shell", &[(6, "renderer")])]),
            Err(AttributionError::NoBrowser { .. })
        ));
        assert!(
            matches!(
                attribute(5, &[inv("shell", &[(5, "browser")])]),
                Err(AttributionError::KindConflict { pid: 5, .. })
            ),
            "the host itself is never a WebView2 process"
        );
    }

    #[test]
    fn no_environment_yet_means_only_ferrum() {
        let set = attribute(42, &[]).unwrap();
        assert_eq!(set.pids(), vec![42]);
    }

    #[test]
    fn kind_names_map_to_export_kinds() {
        for (name, kind) in [
            ("browser", ProcessKind::Browser),
            ("renderer", ProcessKind::Renderer),
            ("gpu", ProcessKind::Gpu),
            ("utility", ProcessKind::Utility),
            ("sandbox-helper", ProcessKind::Other),
            ("ppapi-plugin", ProcessKind::Other),
            ("ppapi-broker", ProcessKind::Other),
            ("unknown", ProcessKind::Other),
        ] {
            assert_eq!(kind_of(name), kind, "{name}");
        }
    }
}
