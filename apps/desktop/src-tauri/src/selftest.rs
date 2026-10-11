//! Built-in self-tests, switched on by `FERRUM_SELFTEST`. They write JSON to `FERRUM_SELFTEST_OUT` and close the
//! app by themselves (checks never kill it). Inert unless the variable is set.
//!
//! `FERRUM_SELFTEST=ipc` (P2 task p2.3): loads `FERRUM_SELFTEST_URL` (default `https://localhost:8443/ipc-probe`,
//! the fixture server) in an untrusted Tauri web view labelled `probe`. The page tries an app command, the core
//! event plugin's `listen` and `emit` through the bridge and reports in its title. Every call must be refused,
//! while the shell's own `app_ping` (positive control) must work.

use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};

use crate::{BridgeStats, TOOLBAR_H};

fn write_out(v: &Value) {
    if let Some(p) = std::env::var_os("FERRUM_SELFTEST_OUT") {
        let _ = std::fs::write(p, serde_json::to_string_pretty(v).unwrap_or_default());
    }
}

/// Starts the IPC lockdown self-test on a background thread.
pub fn start_ipc(app: AppHandle, width: f64, height: f64) {
    let url = std::env::var("FERRUM_SELFTEST_URL")
        .unwrap_or_else(|_| "https://localhost:8443/ipc-probe".into());
    let title: Arc<Mutex<Option<String>>> = Arc::default();
    let t2 = title.clone();
    std::thread::spawn(move || {
        let started = Instant::now();
        let Some(window) = app.get_window("main") else {
            return;
        };
        let parsed = match url.parse() {
            Ok(u) => u,
            Err(e) => {
                write_out(&json!({"error": format!("bad FERRUM_SELFTEST_URL: {e}")}));
                app.exit(2);
                return;
            }
        };
        let probe = WebviewBuilder::new("probe", WebviewUrl::External(parsed))
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
        // Positive control: the shell calls app_ping itself (src/main.ts) once it has loaded.
        while started.elapsed() < Duration::from_secs(20) && title.lock().unwrap().is_none() {
            std::thread::sleep(Duration::from_millis(100));
        }
        std::thread::sleep(Duration::from_millis(500));
        let report: Option<Value> = title
            .lock()
            .unwrap()
            .as_ref()
            .and_then(|t| serde_json::from_str(t.trim_start_matches("IPC-PROBE:")).ok());
        let refused = |k: &str| {
            report
                .as_ref()
                .map(|r| r[k]["ok"] == json!(false))
                .unwrap_or(false)
        };
        let bridge_present = report
            .as_ref()
            .map(|r| r["bridge"] == json!(true))
            .unwrap_or(false);
        // Every call refused (or no bridge at all, which also means nothing can be called).
        let all_refused = report.is_some()
            && (!bridge_present
                || (refused("app_command") && refused("event_listen") && refused("event_emit")));
        let shell_pings = app.state::<BridgeStats>().pings.load(Ordering::SeqCst);
        let out = json!({
            "selftest": "ipc",
            "probe_url": url,
            "probe_view_created": created.is_ok(),
            "probe_report": report,
            "all_probe_calls_refused": all_refused,
            "shell_positive_control_pings": shell_pings,
            "pass": all_refused && shell_pings > 0,
        });
        // The refusal log line (P2 has no structured log yet, p2.14): standard error and the JSON above.
        eprintln!("[ferrum selftest ipc] {}", out);
        write_out(&out);
        app.exit(0);
    });
}
