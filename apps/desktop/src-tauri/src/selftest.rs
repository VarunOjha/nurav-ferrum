//! Built-in self-tests, switched on by `FERRUM_SELFTEST`. They write JSON to `FERRUM_SELFTEST_OUT` and close the
//! app by themselves (checks never kill it). Inert unless the variable is set. Fixture pages come from the local
//! HTTPS test server (`fixture-server`, task p2.1) at `FERRUM_SELFTEST_BASE` (default `https://localhost:8443`).
//!
//! - `ipc` (p2.3, extended in p2.6 and p4.8): the fixture page `/ipc-probe` tries the app bridge (app commands
//!   including those added in P4, event listen and emit, Tauri's core plugin commands, the internal channel-fetch
//!   command) (a) in an untrusted **Tauri** web view: every call must be refused; and (b) in the **content view
//!   Ferrum creates itself** (adr-0029): there must be no bridge at all. The shell's own call must still work.
//! - `nav` (p2.6): the content view visits two fixture pages; the app must report, for each, navigation starting →
//!   address changed → navigation completed (success, HTTP 200) in that order, and the shell must receive the same
//!   events.

use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};

use crate::content::{AppConfig, EventLog, ShellTitle, active_ready, with_content};
use crate::{BridgeStats, TOOLBAR_H};

fn base() -> String {
    std::env::var("FERRUM_SELFTEST_BASE").unwrap_or_else(|_| "https://localhost:8443".into())
}

fn write_out(v: &Value) {
    if let Some(p) = std::env::var_os("FERRUM_SELFTEST_OUT") {
        let _ = std::fs::write(p, serde_json::to_string_pretty(v).unwrap_or_default());
    }
}

fn wait_for(secs: u64, mut f: impl FnMut() -> bool) -> bool {
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(secs) {
        if f() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    f()
}

fn finish(app: &AppHandle, out: Value) {
    eprintln!("[ferrum selftest] {out}");
    write_out(&out);
    app.exit(0);
}

fn events(app: &AppHandle) -> Vec<Value> {
    app.state::<EventLog>().0.lock().unwrap().clone()
}

/// Navigates the content view to `url` and waits for its completion; returns the events of that navigation.
fn visit(app: &AppHandle, url: &str, secs: u64) -> Vec<Value> {
    let before = events(app).len();
    let u = url.to_string();
    with_content(app, move |v| {
        let _ = v.navigate(&u);
    });
    let done = |evs: &[Value]| {
        evs.iter().any(|e| e["kind"] == "navigation-completed")
            && evs
                .iter()
                .any(|e| e["kind"] == "navigation-starting" && e["uri"].as_str() == Some(url))
    };
    wait_for(secs, || done(&events(app)[before..]));
    std::thread::sleep(Duration::from_millis(300));
    events(app)[before..].to_vec()
}

fn report_from_title(title: &str) -> Option<Value> {
    title
        .strip_prefix("IPC-PROBE:")
        .and_then(|t| serde_json::from_str(t).ok())
}

fn all_refused(report: &Option<Value>) -> bool {
    let Some(r) = report else { return false };
    if r["bridge"] != json!(true) {
        return true; // no bridge: nothing can be called
    }
    [
        "app_command",
        "event_listen",
        "event_emit",
        "settings_command",
        "bookmark_command",
        "history_command",
        "suggest_command",
        "backup_command",
        "appearance_command",
        "private_tab_command",
        "site_clear_command",
        "processes_command",
        "plugin_app",
        "plugin_path",
        "plugin_webview",
        "plugin_window",
        "channel_fetch",
    ]
    .iter()
    .all(|k| r[*k]["ok"] == json!(false))
}

/// Starts the IPC lockdown self-test on a background thread.
pub fn start_ipc(app: AppHandle, width: f64, height: f64) {
    let url = format!("{}/ipc-probe", base());
    let title: Arc<Mutex<Option<String>>> = Arc::default();
    let t2 = title.clone();
    std::thread::spawn(move || {
        let ready = wait_for(20, || active_ready(&app));
        // (b) the Ferrum-created content view: must have no bridge.
        let content_events = if ready {
            visit(&app, &url, 20)
        } else {
            Vec::new()
        };
        wait_for(5, || {
            events(&app).iter().any(|e| {
                e["kind"] == "title-changed"
                    && e["title"]
                        .as_str()
                        .is_some_and(|t| t.starts_with("IPC-PROBE:"))
            })
        });
        let content_report = events(&app)
            .iter()
            .rev()
            .filter(|e| e["kind"] == "title-changed")
            .find_map(|e| e["title"].as_str().and_then(report_from_title));
        let content_no_bridge = content_report
            .as_ref()
            .is_some_and(|r| r["bridge"] == json!(false) && r["ipc"] == json!(false));

        // (a) an untrusted Tauri web view on top: every bridge call refused.
        let Some(window) = app.get_window("main") else {
            return;
        };
        let parsed = match url.parse() {
            Ok(u) => u,
            Err(e) => return finish(&app, json!({"error": format!("bad url: {e}")})),
        };
        // The probe uses the shell's data folder (the self-test's own, never the user's real one: without it the probe
        // fell back to the default folder, found in p4.11) and so the shell's browser arguments too (COM-7, p4.18).
        let Some(data_dir) = app.state::<AppConfig>().get().storage.data_dir else {
            return finish(
                &app,
                json!({"error": "no data folder of its own: probe not created"}),
            );
        };
        let probe = WebviewBuilder::new("probe", WebviewUrl::External(parsed))
            .data_directory(data_dir)
            .additional_browser_args(ferrum_webview_manager::webview2::SHELL_BROWSER_ARGUMENTS)
            .on_document_title_changed(move |_wv, t| {
                if t.starts_with("IPC-PROBE:") {
                    *t2.lock().unwrap() = Some(t);
                }
            });
        let created = window.add_child(
            probe,
            LogicalPosition::new(0.0, TOOLBAR_H),
            LogicalSize::new(width, height - TOOLBAR_H),
        );
        wait_for(20, || title.lock().unwrap().is_some());
        std::thread::sleep(Duration::from_millis(500));
        let tauri_report: Option<Value> =
            title.lock().unwrap().as_deref().and_then(report_from_title);
        let tauri_refused = all_refused(&tauri_report);
        let shell_pings = app.state::<BridgeStats>().pings.load(Ordering::SeqCst);
        finish(
            &app,
            json!({
                "selftest": "ipc",
                "probe_url": url,
                "tauri_view": {"created": created.is_ok(), "report": tauri_report, "all_calls_refused": tauri_refused},
                "content_view": {"ready": ready, "report": content_report, "no_bridge": content_no_bridge,
                                 "events": content_events.len()},
                "all_probe_calls_refused": tauri_refused,
                "shell_positive_control_pings": shell_pings,
                "pass": tauri_refused && content_no_bridge && shell_pings > 0,
            }),
        );
    });
}

/// Index of the first event in `evs` (from `from`) matching `pred`.
fn find(evs: &[Value], from: usize, pred: impl Fn(&Value) -> bool) -> Option<usize> {
    evs.iter()
        .enumerate()
        .skip(from)
        .find(|(_, e)| pred(e))
        .map(|(i, _)| i)
}

/// Checks starting → source-changed → completed (success, 200) for `url` within `evs`.
fn in_order(evs: &[Value], url: &str) -> (bool, Value) {
    let s = find(evs, 0, |e| {
        e["kind"] == "navigation-starting" && e["uri"] == url && e["allowed"] == true
    });
    let c = s.and_then(|i| {
        find(evs, i + 1, |e| {
            e["kind"] == "source-changed" && e["uri"] == url
        })
    });
    let d = c.and_then(|i| find(evs, i + 1, |e| e["kind"] == "navigation-completed"));
    let ok = d.is_some_and(|i| evs[i]["success"] == true && evs[i]["http_status"] == 200);
    (
        ok,
        json!({"starting": s, "source_changed": c, "completed": d}),
    )
}

/// Starts the navigation self-test on a background thread.
pub fn start_nav(app: AppHandle) {
    std::thread::spawn(move || {
        let ready = wait_for(20, || active_ready(&app));
        // Let the start page (about:blank) settle so its events do not mix with the visits.
        std::thread::sleep(Duration::from_millis(800));
        let pages = [
            format!("{}/landing", base()),
            format!("{}/links/blank", base()),
        ];
        let mut checks = Vec::new();
        let mut all_ok = ready;
        for p in &pages {
            let evs = visit(&app, p, 20);
            let (ok, idx) = in_order(&evs, p);
            all_ok &= ok;
            checks.push(json!({"url": p, "in_order": ok, "positions": idx, "events": evs}));
        }
        std::thread::sleep(Duration::from_millis(800));
        // The shell keeps the events it received in its title (src/main.ts): "EVENTS:" + JSON list of [kind, uri].
        let shell_title = app.state::<ShellTitle>().0.lock().unwrap().clone();
        let shell_list: Vec<Value> = shell_title
            .strip_prefix("EVENTS:")
            .and_then(|t| serde_json::from_str(t).ok())
            .unwrap_or_default();
        let shell_has =
            |kind: &str, uri: &str| shell_list.iter().position(|e| e[0] == kind && e[1] == uri);
        let mut shell_ok = true;
        let mut last = None;
        for p in &pages {
            for k in ["navigation-starting", "source-changed"] {
                let pos = shell_has(k, p);
                shell_ok &= pos.is_some() && pos > last;
                last = pos.or(last);
            }
        }
        let completed_seen = shell_list
            .iter()
            .filter(|e| e[0] == "navigation-completed")
            .count();
        shell_ok &= completed_seen >= pages.len();
        finish(
            &app,
            json!({
                "selftest": "nav",
                "content_ready": ready,
                "pages": checks,
                "shell_received_in_order": shell_ok,
                "shell_events": shell_list.len(),
                "pass": all_ok && shell_ok,
            }),
        );
    });
}

/// Developer-tools self-test (p2.12). Reports whether the developer tools are allowed in the content view and in
/// the shell, then hands over to the check script for a keyboard attempt in each view: it puts focus in a view, writes
/// that view's name to `<out>.phase` and waits for the script's `<out>.ack` (the script presses F12 and
/// Ctrl+Shift+I and looks for a DevTools window). Ferrum itself never opens the developer tools.
pub fn start_devtools(app: AppHandle) {
    use ferrum_webview_manager::webview2::{controller_devtools_enabled, controller_focus};
    std::thread::spawn(move || {
        let out = std::env::var("FERRUM_SELFTEST_OUT").unwrap_or_default();
        let ready = wait_for(20, || active_ready(&app));
        let (tx, rx) = std::sync::mpsc::channel::<(
            &'static str,
            Result<bool, ferrum_webview_manager::Error>,
        )>();
        let tx_content = tx.clone();
        with_content(&app, move |v| {
            let _ = tx_content.send(("content", v.devtools_enabled()));
        });
        let shell = app.get_webview("shell");
        if let Some(shell) = &shell {
            let _ = shell.with_webview(move |pw| {
                let _ = tx.send(("shell", controller_devtools_enabled(&pw.controller())));
            });
        }
        let mut got = serde_json::Map::new();
        for _ in 0..2 {
            if let Ok((view, r)) = rx.recv_timeout(Duration::from_secs(10)) {
                got.insert(
                    view.to_string(),
                    match r {
                        Ok(b) => json!(b),
                        Err(e) => json!({ "error": e.to_string() }),
                    },
                );
            }
        }
        let mut handed_over = Vec::new();
        for view in ["content", "shell"] {
            // Bring Ferrum to the front first (Windows does not let the check script do it; Tauri's set_focus can),
            // then put focus in the view.
            if let Some(w) = app.get_window("main") {
                let _ = w.set_focus();
            }
            std::thread::sleep(Duration::from_millis(500));
            if view == "content" {
                with_content(&app, |v| {
                    let _ = v.focus();
                });
            } else if let Some(shell) = &shell {
                let _ = shell.with_webview(|pw| {
                    let _ = controller_focus(&pw.controller());
                });
            }
            std::thread::sleep(Duration::from_millis(500));
            let ack = format!("{out}.ack-{view}");
            let _ = std::fs::write(format!("{out}.phase"), view);
            let acked = wait_for(30, || std::path::Path::new(&ack).exists());
            let _ = std::fs::remove_file(&ack);
            handed_over.push(json!({"view": view, "acknowledged": acked}));
        }
        let _ = std::fs::remove_file(format!("{out}.phase"));
        finish(
            &app,
            json!({
                "selftest": "devtools",
                "build": if cfg!(debug_assertions) { "debug" } else { "release" },
                "content_view_ready": ready,
                "devtools_enabled": got,
                "keyboard_attempts": handed_over,
            }),
        );
    });
}

/// Panic self-test (p2.14, debug builds only): a background thread panics on purpose; the panic hook must write it to
/// the log as one JSON line. The app then exits normally.
#[cfg(debug_assertions)]
pub fn start_panic(app: AppHandle) {
    std::thread::spawn(move || {
        let crashed = std::thread::spawn(|| panic!("ferrum test panic (p2.14 self-test)")).join();
        std::thread::sleep(Duration::from_millis(300));
        finish(
            &app,
            json!({ "selftest": "panic", "thread_panicked": crashed.is_err() }),
        );
    });
}
