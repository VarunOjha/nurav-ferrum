//! Lifecycle transitions (p5.8): one `lifecycle_transition` record each time a tab changes state. This module is the
//! pure part. In P5 the host reports only whether each tab's view is shown, and when a tab closes; that gives the
//! states `active` (shown) and `background` (hidden). P7's resource manager adds the other states and triggers, in the
//! same record.
//!
//! A record is written only on a change. The trigger of a show or hide is `shell_cover` when the tab is the selected
//! one and the shell's error panel covers it (or stopped covering it), otherwise `user_switch`. A tab's first state is
//! `opened` (from null) and its end `closed` (to null).

use std::collections::HashMap;

use crate::export::{LifecycleState, LifecycleTransition, LifecycleTrigger, Record};

/// Every tab's current state and the trigger of its last change.
#[derive(Debug, Default)]
pub struct LifecycleLog {
    tabs: HashMap<u64, (LifecycleState, LifecycleTrigger)>,
}

impl LifecycleLog {
    /// No tabs yet.
    pub fn new() -> Self {
        Self::default()
    }

    /// Tab `tab`'s view is `shown` or hidden now; `selected` is whether it is the selected tab and `covered` whether
    /// the shell's error panel covers it. Returns the record if the state changed.
    pub fn shown(
        &mut self,
        tab: u64,
        shown: bool,
        selected: bool,
        covered: bool,
        t_ms: u64,
    ) -> Option<Record> {
        let to = if shown {
            LifecycleState::Active
        } else {
            LifecycleState::Background
        };
        let prev = self.tabs.get(&tab).copied();
        let trigger = match prev {
            None => LifecycleTrigger::Opened,
            Some((from, _)) if from == to => return None,
            // hidden because the panel covers the selected tab, or shown again because it stopped covering it
            Some(_) if selected && covered => LifecycleTrigger::ShellCover,
            Some((_, LifecycleTrigger::ShellCover)) if selected => LifecycleTrigger::ShellCover,
            Some(_) => LifecycleTrigger::UserSwitch,
        };
        self.tabs.insert(tab, (to, trigger));
        Some(record(t_ms, tab, prev.map(|p| p.0), Some(to), trigger))
    }

    /// Tab `tab` closed. Returns the record, or `None` for a tab that was never seen.
    pub fn closed(&mut self, tab: u64, t_ms: u64) -> Option<Record> {
        let (from, _) = self.tabs.remove(&tab)?;
        Some(record(
            t_ms,
            tab,
            Some(from),
            None,
            LifecycleTrigger::Closed,
        ))
    }

    /// Tab `tab`'s current state.
    pub fn state(&self, tab: u64) -> Option<LifecycleState> {
        self.tabs.get(&tab).map(|s| s.0)
    }
}

fn record(
    t_ms: u64,
    tab: u64,
    from: Option<LifecycleState>,
    to: Option<LifecycleState>,
    trigger: LifecycleTrigger,
) -> Record {
    Record::LifecycleTransition(LifecycleTransition {
        t_ms,
        tab,
        from,
        to,
        trigger,
        policy: None,
        guard: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::export::validate::validate_record;
    use crate::export::{LifecycleGuard, LifecyclePolicy};
    use LifecycleState::*;
    use LifecycleTrigger::*;

    fn parts(
        r: &Record,
    ) -> (
        u64,
        Option<LifecycleState>,
        Option<LifecycleState>,
        LifecycleTrigger,
    ) {
        match r {
            Record::LifecycleTransition(l) => (l.tab, l.from, l.to, l.trigger),
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn switching_tabs_writes_one_hide_and_one_show_that_validate() {
        let mut log = LifecycleLog::new();
        let mut out = vec![];
        // tab 1 opens selected; tab 2 opens in the background
        out.extend(log.shown(1, true, true, false, 10));
        out.extend(log.shown(2, false, false, false, 20));
        // the same picture again writes nothing
        assert!(log.shown(1, true, true, false, 25).is_none());
        assert!(log.shown(2, false, false, false, 25).is_none());
        // the user selects tab 2
        out.extend(log.shown(1, false, false, false, 30));
        out.extend(log.shown(2, true, true, false, 30));
        out.extend(log.closed(1, 40));
        assert!(log.closed(1, 41).is_none(), "closed twice");
        assert!(log.closed(9, 41).is_none(), "never seen");
        let got: Vec<_> = out.iter().map(parts).collect();
        assert_eq!(
            got,
            vec![
                (1, None, Some(Active), Opened),
                (2, None, Some(Background), Opened),
                (1, Some(Active), Some(Background), UserSwitch),
                (2, Some(Background), Some(Active), UserSwitch),
                (1, Some(Background), None, Closed),
            ]
        );
        for r in &out {
            validate_record(r).unwrap();
        }
        assert_eq!(log.state(2), Some(Active));
        assert_eq!(log.state(1), None);
    }

    #[test]
    fn the_error_panel_covering_the_selected_tab_is_its_own_trigger() {
        let mut log = LifecycleLog::new();
        log.shown(1, true, true, false, 0);
        let hide = log.shown(1, false, true, true, 5).unwrap();
        assert_eq!(
            parts(&hide),
            (1, Some(Active), Some(Background), ShellCover)
        );
        let show = log.shown(1, true, true, false, 9).unwrap();
        assert_eq!(
            parts(&show),
            (1, Some(Background), Some(Active), ShellCover)
        );
        // a later switch away is the user's again
        let away = log.shown(1, false, false, false, 12).unwrap();
        assert_eq!(parts(&away).3, UserSwitch);
    }

    #[test]
    fn the_checker_refuses_impossible_transitions() {
        let ok = LifecycleTransition {
            t_ms: 1,
            tab: 1,
            from: Some(Idle),
            to: Some(DiscardCandidate),
            trigger: PolicySelected,
            policy: Some(LifecyclePolicy::FixedIdle),
            guard: None,
        };
        let check =
            |l: &LifecycleTransition| validate_record(&Record::LifecycleTransition(l.clone()));
        check(&ok).unwrap();
        let bad = [
            (
                LifecycleTransition {
                    from: Some(Idle),
                    to: Some(Idle),
                    ..ok.clone()
                },
                "both",
            ),
            (
                LifecycleTransition {
                    from: None,
                    to: None,
                    trigger: Opened,
                    policy: None,
                    ..ok.clone()
                },
                "both be null",
            ),
            (
                LifecycleTransition {
                    from: None,
                    ..ok.clone()
                },
                "from is null",
            ),
            (
                LifecycleTransition {
                    to: None,
                    ..ok.clone()
                },
                "to is null",
            ),
            (
                LifecycleTransition {
                    policy: None,
                    ..ok.clone()
                },
                "policy",
            ),
            (
                LifecycleTransition {
                    guard: Some(LifecycleGuard::G2),
                    ..ok.clone()
                },
                "guard",
            ),
            (
                LifecycleTransition {
                    trigger: GuardFailed,
                    policy: None,
                    guard: None,
                    ..ok.clone()
                },
                "guard",
            ),
        ];
        for (l, want) in bad {
            let e = check(&l).unwrap_err();
            assert!(e.contains(want), "{l:?}: {e}");
        }
    }
}
