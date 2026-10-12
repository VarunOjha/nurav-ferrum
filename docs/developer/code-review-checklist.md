# Code review checklist (Ferrum app)

Items a reviewer checks on every change to `apps/desktop/src-tauri` and `crates/webview-manager`. Each item names the
check that enforces it, where one exists. The wiki is canonical: the reasons are on the linked pages.

## Web views and threads

- [ ] **No web view is created while a caller waits** (P3 task p3.10; Windows deadlock note in the
      [WebView2 integration page](../../wiki/architecture/ov-arch-webview2-integration.md)). A Tauri command that can
      create a tab view (`open_tab`, `navigate_tab`, `reopen`) is `async`; tab views are made by
      `ContentView::create`, which returns at once and reports the view through WebView2's completion callback;
      the UI-thread work is queued with `run_on_main_thread`, never awaited. Nothing on the tab path blocks on a reply
      (`recv`, `block_on`, `.wait`), except the debug-only `test_stats`, which waits off the UI thread. Enforced by
      `scripts/verify/p3.10-guard-against-freeze.ps1` (code scan plus a stress test).
- [ ] **The tab list's lock is not held while a view method runs.** WebView2 may raise events inside such a call,
      and those events update the tab list (`content.rs` module notes).
- [ ] **Raw WebView2 calls stay in `crates/webview-manager/src/webview2.rs`**, each `unsafe` block with a
      `// SAFETY: COM-n` comment (adr-0019; `clippy::undocumented_unsafe_blocks`, p3.2 check).
- [ ] **Every `add_*` handler keeps its token and `close` removes it** (COM-4).

## Pages and the bridge

- [ ] **Pages get no way to call the app.** Nothing is injected into tab views; new commands are listed in `build.rs`
      and granted only by `capabilities/shell.json` (p2.3 IPC test).
- [ ] **Browsing data stays out of the repository** (`session.json`, `history.json`, profiles, downloads): the p3.7
      check looks for tracked files.
