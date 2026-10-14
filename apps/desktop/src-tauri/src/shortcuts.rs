//! Keyboard shortcuts pressed while a page has focus (P3 task p3.3). WebView2 reports accelerator keys to the app
//! before the page sees them (`webview2::Handlers::keys`); the table is `ferrum_core::shortcuts`. A key Ferrum takes
//! never reaches the page, and nothing is injected into the page: the page gains no way to call the app. Keys pressed
//! in the shell are handled by the shell itself (`src/logic.ts` has the same table).

use ferrum_core::shortcuts::{KeyPress, Shortcut, for_key, name, repeats};
use ferrum_core::tabs::Place;
use ferrum_webview_manager::tab::KeyDown;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use crate::content::{self, BLANK, FocusState, TabsState};

/// The key filter of a tab view: true when the key is one of Ferrum's shortcuts (the action is queued).
pub fn filter(app: &AppHandle) -> std::rc::Rc<dyn Fn(KeyDown) -> bool> {
    let h = app.clone();
    std::rc::Rc::new(move |k: KeyDown| {
        let Some(s) = for_key(KeyPress {
            vk: k.vk,
            ctrl: k.ctrl,
            shift: k.shift,
            alt: k.alt,
        }) else {
            return false;
        };
        // Holding a key repeats only tab switching; other repeats are swallowed (not run, not given to the page).
        if !k.repeat || repeats(s) {
            let h2 = h.clone();
            // Queued, so the action never runs inside WebView2's key callback (it may close this very view).
            let _ = h.run_on_main_thread(move || run(&h2, s));
        }
        true
    })
}

/// Runs a shortcut's action.
pub fn run(app: &AppHandle, s: Shortcut) {
    tracing::info!(target: "ferrum::keys", shortcut = %name(s), "shortcut");
    match s {
        Shortcut::NewTab => {
            content::open_tab(app, BLANK.to_string(), Place::End, true);
            focus_address(app);
        }
        Shortcut::NewPrivateTab => {
            content::open_tab_as(app, BLANK.to_string(), Place::End, true, true);
            focus_address(app);
        }
        Shortcut::CloseTab => {
            if let Some(id) = content::active(app) {
                content::close_tab(app, id);
            }
        }
        Shortcut::NextTab => content::activate_next(app),
        Shortcut::PreviousTab => content::activate_previous(app),
        Shortcut::ReopenTab => {
            content::reopen(app);
        }
        Shortcut::SelectTab(i) => select(app, Some(i)),
        Shortcut::LastTab => select(app, None),
        Shortcut::FocusAddress => focus_address(app),
        Shortcut::Back => content::with_content(app, |v| {
            let _ = v.go_back();
        }),
        Shortcut::Forward => content::with_content(app, |v| {
            let _ = v.go_forward();
        }),
        Shortcut::Reload => content::with_content(app, |v| {
            let _ = v.reload();
        }),
        // Shell features (sidebar p3.15, settings p3.14): the shell acts on them.
        Shortcut::ToggleSidebar | Shortcut::Settings | Shortcut::ToggleBookmarksBar => {
            shell_command(app, &name(s))
        }
        // These open something to type in (the bookmark editor, the sidebar's bookmarks): the shell takes focus.
        Shortcut::BookmarkPage | Shortcut::ShowBookmarks => {
            focus_shell(app);
            shell_command(app, &name(s))
        }
    }
}

/// Activates the tab at `index` (the last one for `None`).
fn select(app: &AppHandle, index: Option<usize>) {
    let id = {
        let t = app.state::<TabsState>();
        let t = t.0.lock().unwrap();
        let i = index.unwrap_or(t.len().saturating_sub(1));
        t.id_at(i)
    };
    if let Some(id) = id {
        content::activate(app, id.0);
    }
}

/// Moves keyboard focus into the shell's address bar.
pub fn focus_address(app: &AppHandle) {
    focus_shell(app);
    shell_command(app, "focus-address");
}

/// Moves keyboard focus from the page into the shell web view.
fn focus_shell(app: &AppHandle) {
    app.state::<FocusState>()
        .content_last
        .store(false, std::sync::atomic::Ordering::SeqCst);
    if let Some(shell) = app.get_webview("shell") {
        let _ = shell.with_webview(|pw| {
            let _ = ferrum_webview_manager::webview2::controller_focus(&pw.controller());
        });
    }
}

/// Tells the shell to do something only it can (focus its address bar, show the sidebar or settings).
fn shell_command(app: &AppHandle, action: &str) {
    let _ = app.emit_to("shell", "shell-command", json!({ "action": action }));
}
