//! Shortcut table tests (P3 task p3.3).

use ferrum_core::shortcuts::{KeyPress, Shortcut, for_key, name, repeats, vk};

fn ctrl(vk: u32) -> KeyPress {
    KeyPress {
        vk,
        ctrl: true,
        ..KeyPress::default()
    }
}
fn ctrl_shift(vk: u32) -> KeyPress {
    KeyPress {
        vk,
        ctrl: true,
        shift: true,
        ..KeyPress::default()
    }
}
fn alt(vk: u32) -> KeyPress {
    KeyPress {
        vk,
        alt: true,
        ..KeyPress::default()
    }
}
fn plain(vk: u32) -> KeyPress {
    KeyPress {
        vk,
        ..KeyPress::default()
    }
}

#[test]
fn every_browser_shortcut_maps() {
    use Shortcut::*;
    let cases = [
        (ctrl(b'T' as u32), NewTab),
        (ctrl(b'W' as u32), CloseTab),
        (ctrl(vk::F4), CloseTab),
        (ctrl(vk::TAB), NextTab),
        (ctrl(vk::NEXT), NextTab),
        (ctrl_shift(vk::TAB), PreviousTab),
        (ctrl(vk::PRIOR), PreviousTab),
        (ctrl_shift(b'T' as u32), ReopenTab),
        (ctrl(b'1' as u32), SelectTab(0)),
        (ctrl(b'8' as u32), SelectTab(7)),
        (ctrl(b'9' as u32), LastTab),
        (ctrl(b'L' as u32), FocusAddress),
        (alt(b'D' as u32), FocusAddress),
        (plain(vk::F6), FocusAddress),
        (alt(vk::LEFT), Back),
        (alt(vk::RIGHT), Forward),
        (plain(vk::F5), Reload),
        (ctrl(b'R' as u32), Reload),
        (ctrl_shift(b'S' as u32), ToggleSidebar),
        (ctrl(vk::COMMA), Settings),
    ];
    for (k, want) in cases {
        assert_eq!(for_key(k), Some(want), "{k:?}");
    }
}

#[test]
fn page_keys_stay_with_the_page() {
    // Typing, editing shortcuts and the page's own combinations are not taken.
    for k in [
        plain(b'T' as u32),
        ctrl(b'C' as u32),
        ctrl(b'V' as u32),
        ctrl(b'Z' as u32),
        ctrl(b'A' as u32),
        ctrl(b'F' as u32),
        ctrl(b'S' as u32),
        ctrl(b'0' as u32),
        plain(vk::LEFT),
        ctrl(vk::LEFT),
        plain(vk::TAB),
        KeyPress {
            vk: b'T' as u32,
            ctrl: true,
            alt: true,
            ..KeyPress::default()
        },
    ] {
        assert_eq!(for_key(k), None, "{k:?}");
    }
}

#[test]
fn only_tab_switching_repeats() {
    assert!(repeats(Shortcut::NextTab));
    assert!(repeats(Shortcut::PreviousTab));
    assert!(!repeats(Shortcut::CloseTab));
    assert!(!repeats(Shortcut::NewTab));
}

#[test]
fn names_are_stable() {
    assert_eq!(name(Shortcut::SelectTab(0)), "select-tab-1");
    assert_eq!(name(Shortcut::FocusAddress), "focus-address");
}
