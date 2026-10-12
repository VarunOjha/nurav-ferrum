//! Ferrum's keyboard shortcuts (P3 task p3.3): which key combination does what. Pure Rust, so the table is tested on
//! its own. The app asks [`for_key`] for keys pressed inside a tab (WebView2 reports them before the page sees them);
//! the shell has the same table in `apps/desktop/src/logic.ts` for keys pressed in the toolbar.
//!
//! Only browser-level combinations are taken; everything else reaches the page as usual.

/// What a shortcut does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shortcut {
    /// Ctrl+T: open an empty tab and put the cursor in the address bar.
    NewTab,
    /// Ctrl+W, Ctrl+F4: close the active tab.
    CloseTab,
    /// Ctrl+Tab, Ctrl+Page Down: the next tab to the right (wraps around).
    NextTab,
    /// Ctrl+Shift+Tab, Ctrl+Page Up: the next tab to the left (wraps around).
    PreviousTab,
    /// Ctrl+Shift+T: reopen the last closed tab.
    ReopenTab,
    /// Ctrl+1 … Ctrl+8: the tab at that position (0-based here).
    SelectTab(usize),
    /// Ctrl+9: the last tab.
    LastTab,
    /// Ctrl+L, Alt+D, F6: put the cursor in the address bar.
    FocusAddress,
    /// Alt+Left: back.
    Back,
    /// Alt+Right: forward.
    Forward,
    /// F5, Ctrl+R: reload.
    Reload,
    /// Ctrl+Shift+S: show or hide the sidebar (p3.15).
    ToggleSidebar,
    /// Ctrl+Comma: settings (p3.14).
    Settings,
    /// Ctrl+D: bookmark the page, or edit its bookmark (p3.19).
    BookmarkPage,
    /// Ctrl+Shift+B: show or hide the bookmarks bar (p3.19).
    ToggleBookmarksBar,
    /// Ctrl+Shift+O: all bookmarks, in the sidebar (p3.19).
    ShowBookmarks,
}

/// Windows virtual-key codes used by the table.
pub mod vk {
    /// Tab.
    pub const TAB: u32 = 0x09;
    /// Page Up.
    pub const PRIOR: u32 = 0x21;
    /// Page Down.
    pub const NEXT: u32 = 0x22;
    /// Left arrow.
    pub const LEFT: u32 = 0x25;
    /// Right arrow.
    pub const RIGHT: u32 = 0x27;
    /// F4.
    pub const F4: u32 = 0x73;
    /// F5.
    pub const F5: u32 = 0x74;
    /// F6.
    pub const F6: u32 = 0x75;
    /// The comma key (VK_OEM_COMMA).
    pub const COMMA: u32 = 0xBC;
}

/// A key press as WebView2 reports it: the virtual-key code and the modifier keys held.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct KeyPress {
    /// Windows virtual-key code (letters are their upper-case ASCII code, digits their ASCII code).
    pub vk: u32,
    /// Ctrl held.
    pub ctrl: bool,
    /// Shift held.
    pub shift: bool,
    /// Alt held.
    pub alt: bool,
}

/// The shortcut for `k`, or `None` when the key belongs to the page.
pub fn for_key(k: KeyPress) -> Option<Shortcut> {
    use Shortcut::*;
    let letter = |c: u8| k.vk == c as u32;
    match (k.ctrl, k.shift, k.alt) {
        (true, false, false) => match k.vk {
            _ if letter(b'T') => Some(NewTab),
            _ if letter(b'W') => Some(CloseTab),
            vk::F4 => Some(CloseTab),
            vk::TAB | vk::NEXT => Some(NextTab),
            vk::PRIOR => Some(PreviousTab),
            _ if letter(b'L') => Some(FocusAddress),
            _ if letter(b'R') => Some(Reload),
            vk::COMMA => Some(Settings),
            _ if letter(b'D') => Some(BookmarkPage),
            0x31..=0x38 => Some(SelectTab((k.vk - 0x31) as usize)),
            0x39 => Some(LastTab),
            _ => None,
        },
        (true, true, false) => match k.vk {
            vk::TAB => Some(PreviousTab),
            _ if letter(b'T') => Some(ReopenTab),
            _ if letter(b'S') => Some(ToggleSidebar),
            _ if letter(b'B') => Some(ToggleBookmarksBar),
            _ if letter(b'O') => Some(ShowBookmarks),
            _ => None,
        },
        (false, false, true) => match k.vk {
            vk::LEFT => Some(Back),
            vk::RIGHT => Some(Forward),
            _ if letter(b'D') => Some(FocusAddress),
            _ => None,
        },
        (false, false, false) => match k.vk {
            vk::F5 => Some(Reload),
            vk::F6 => Some(FocusAddress),
            _ => None,
        },
        _ => None,
    }
}

/// Whether holding the key down may repeat the shortcut (only moving between tabs does; closing tabs never repeats).
pub fn repeats(s: Shortcut) -> bool {
    matches!(s, Shortcut::NextTab | Shortcut::PreviousTab)
}

/// The shortcut's name as the shell and the logs use it (kebab case).
pub fn name(s: Shortcut) -> String {
    use Shortcut::*;
    match s {
        NewTab => "new-tab".into(),
        CloseTab => "close-tab".into(),
        NextTab => "next-tab".into(),
        PreviousTab => "previous-tab".into(),
        ReopenTab => "reopen-tab".into(),
        SelectTab(i) => format!("select-tab-{}", i + 1),
        LastTab => "last-tab".into(),
        FocusAddress => "focus-address".into(),
        Back => "back".into(),
        Forward => "forward".into(),
        Reload => "reload".into(),
        ToggleSidebar => "toggle-sidebar".into(),
        Settings => "settings".into(),
        BookmarkPage => "bookmark-page".into(),
        ToggleBookmarksBar => "toggle-bookmarks-bar".into(),
        ShowBookmarks => "show-bookmarks".into(),
    }
}
