//! The startup timing chain (p5.6; owner's Q-115 answer: no "time to interactive"): process created, window visible,
//! shell first paint, first tab's first contentful paint, first tab's largest contentful paint. This module is the
//! pure part: it turns the five wall-clock times (milliseconds since 1970, as the host and the pages report them) into
//! `startup_mark` records on the run clock, which starts when Ferrum's process was created.
//!
//! The chain must be complete and in order: created, then visible, then the tab's first contentful paint, then its
//! largest contentful paint (equal is allowed: on a simple page both can be the same frame). The shell's first paint
//! comes after creation but is not ordered against the window or the tab, since the shell and the tab draw in parallel.

use crate::export::{Record, StartupMark, StartupMarkKind};

/// 1970-01-01 (Unix time) as a FILETIME (100 ns units since 1601-01-01).
const UNIX_EPOCH_FILETIME: i128 = 116_444_736_000_000_000;

/// A Windows FILETIME (100 ns units since 1601) as milliseconds since 1970 (the subtraction is exact; only the result
/// is rounded to an f64).
pub fn filetime_to_unix_ms(filetime_100ns: u64) -> f64 {
    (i128::from(filetime_100ns) - UNIX_EPOCH_FILETIME) as f64 / 10_000.0
}

/// The five moments, as milliseconds since 1970.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StartupTimes {
    /// Ferrum's process was created (GetProcessTimes).
    pub process_created: f64,
    /// The main window was visible.
    pub window_visible: f64,
    /// The shell's first paint.
    pub shell_first_paint: f64,
    /// The first tab's first contentful paint.
    pub tab_first_contentful_paint: f64,
    /// The first tab's largest contentful paint (the last entry reported).
    pub tab_largest_contentful_paint: f64,
}

/// The `startup_mark` records of one start, in chain order, with `t_ms` counted from process creation (the run's
/// `started_unix_ms`). Refuses a time that is not finite, a chain out of order, or a start that took over 10 minutes.
pub fn startup_marks(times: &StartupTimes, tab: u64) -> Result<Vec<Record>, String> {
    let all = [
        ("process_created", times.process_created),
        ("window_visible", times.window_visible),
        ("shell_first_paint", times.shell_first_paint),
        (
            "tab_first_contentful_paint",
            times.tab_first_contentful_paint,
        ),
        (
            "tab_largest_contentful_paint",
            times.tab_largest_contentful_paint,
        ),
    ];
    for (name, v) in all {
        if !v.is_finite() || v <= 0.0 {
            return Err(format!("{name} {v} is not a time"));
        }
    }
    let t0 = times.process_created;
    let order = [
        (
            "process_created",
            t0,
            "window_visible",
            times.window_visible,
        ),
        (
            "process_created",
            t0,
            "shell_first_paint",
            times.shell_first_paint,
        ),
        (
            "window_visible",
            times.window_visible,
            "tab_first_contentful_paint",
            times.tab_first_contentful_paint,
        ),
        (
            "tab_first_contentful_paint",
            times.tab_first_contentful_paint,
            "tab_largest_contentful_paint",
            times.tab_largest_contentful_paint,
        ),
    ];
    for (a, va, b, vb) in order {
        if vb < va {
            return Err(format!("{b} ({vb:.1}) is before {a} ({va:.1})"));
        }
    }
    let rel = |v: f64| -> Result<u64, String> {
        let ms = v - t0;
        if ms > 600_000.0 {
            return Err(format!("a startup mark {ms:.0} ms after process creation"));
        }
        Ok(ms.floor() as u64)
    };
    let mark = |t_ms, mark, tab| Record::StartupMark(StartupMark { t_ms, mark, tab });
    let mut out = vec![
        mark(0, StartupMarkKind::ProcessCreated, None),
        mark(
            rel(times.window_visible)?,
            StartupMarkKind::WindowVisible,
            None,
        ),
        mark(
            rel(times.shell_first_paint)?,
            StartupMarkKind::ShellFirstPaint,
            None,
        ),
        mark(
            rel(times.tab_first_contentful_paint)?,
            StartupMarkKind::TabFirstContentfulPaint,
            Some(tab),
        ),
        mark(
            rel(times.tab_largest_contentful_paint)?,
            StartupMarkKind::TabLargestContentfulPaint,
            Some(tab),
        ),
    ];
    // An export file needs t_ms in non-decreasing order; the shell's paint may fall anywhere after creation.
    out.sort_by_key(|r| r.t_ms());
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn times() -> StartupTimes {
        StartupTimes {
            process_created: 1_792_000_000_000.0,
            window_visible: 1_792_000_000_250.4,
            shell_first_paint: 1_792_000_000_180.0,
            tab_first_contentful_paint: 1_792_000_000_900.7,
            tab_largest_contentful_paint: 1_792_000_000_900.7,
        }
    }

    #[test]
    fn a_complete_chain_becomes_ordered_marks_on_the_run_clock() {
        let out = startup_marks(&times(), 3).unwrap();
        let got: Vec<(u64, StartupMarkKind, Option<u64>)> = out
            .iter()
            .map(|r| match r {
                Record::StartupMark(m) => (m.t_ms, m.mark, m.tab),
                other => panic!("{other:?}"),
            })
            .collect();
        use StartupMarkKind::*;
        assert_eq!(
            got,
            vec![
                (0, ProcessCreated, None),
                (180, ShellFirstPaint, None),
                (250, WindowVisible, None),
                (900, TabFirstContentfulPaint, Some(3)),
                (900, TabLargestContentfulPaint, Some(3)),
            ]
        );
        for r in &out {
            crate::export::validate::validate_record(r).unwrap();
        }
    }

    #[test]
    fn a_chain_out_of_order_or_incomplete_is_refused() {
        let mut t = times();
        t.window_visible = t.process_created - 1.0;
        assert!(startup_marks(&t, 1).unwrap_err().contains("window_visible"));
        let mut t = times();
        t.tab_largest_contentful_paint = t.tab_first_contentful_paint - 0.5;
        assert!(startup_marks(&t, 1).unwrap_err().contains("tab_largest"));
        let mut t = times();
        t.tab_first_contentful_paint = t.window_visible - 1.0;
        assert!(
            startup_marks(&t, 1).is_err(),
            "first content before the window showed"
        );
        let mut t = times();
        t.shell_first_paint = t.process_created - 5.0;
        assert!(startup_marks(&t, 1).is_err());
        let mut t = times();
        t.tab_largest_contentful_paint = f64::NAN;
        assert!(startup_marks(&t, 1).unwrap_err().contains("not a time"));
        let mut t = times();
        t.tab_largest_contentful_paint = t.process_created + 700_000.0;
        assert!(startup_marks(&t, 1).is_err(), "over 10 minutes");
    }

    #[test]
    fn filetime_converts_to_unix_milliseconds() {
        // 1970-01-01 as a FILETIME
        assert_eq!(filetime_to_unix_ms(116_444_736_000_000_000), 0.0);
        assert_eq!(
            filetime_to_unix_ms(116_444_736_000_000_000 + 12_345_678),
            1234.5678
        );
    }
}
