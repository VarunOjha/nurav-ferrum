//! P1 spike S1 (throw-away, never shipped): one Tauri window with a trusted shell web view (top strip)
//! and three child web views (tabs) created with the `unstable` multi-webview API.
//!
//! Modes (environment variable `FERRUM_SPIKE_MODE`):
//! - `manual` (default): normal app for the owner's Alt+Tab, resize and shortcut checks.
//! - `auto`: runs the automatic checks, writes JSON to `FERRUM_SPIKE_OUT`, then exits by itself.
//! - `sync`: creates the tabs from a *synchronous* command to reproduce the documented deadlock;
//!   a watchdog thread ends the process by itself after a timeout (no external kill).
//!
//! The process never needs to be killed from outside: every automatic mode ends with `exit`.

mod capture;
mod com;

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use serde_json::{Value, json};
use tauri::webview::PageLoadEvent;
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Rect, Webview, WebviewBuilder, WebviewUrl, Window,
    WindowEvent,
};

/// Height of the shell strip (tab bar) in logical pixels.
const SHELL_H: f64 = 64.0;
/// Number of tab web views.
const TABS: usize = 3;

#[derive(Default)]
struct SpikeState {
    /// Reports sent by tab pages (`report` command), in arrival order.
    reports: Vec<Value>,
    /// Page-load "finished" events per web view label.
    loaded: Vec<String>,
    /// Which tab is shown (1-based), 0 = none.
    active: usize,
}

fn mode() -> String {
    std::env::var("FERRUM_SPIKE_MODE").unwrap_or_else(|_| "manual".into())
}

fn out_path() -> Option<PathBuf> {
    std::env::var_os("FERRUM_SPIKE_OUT").map(PathBuf::from)
}

fn tab_label(n: usize) -> String {
    format!("tab-{n}")
}

/// Lays out the shell strip and the tab views for the window's current inner size.
fn relayout(window: &Window) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let size = window.inner_size()?.to_logical::<f64>(scale);
    if let Some(shell) = window.app_handle().get_webview("shell") {
        shell.set_bounds(Rect {
            position: LogicalPosition::new(0.0, 0.0).into(),
            size: LogicalSize::new(size.width, SHELL_H).into(),
        })?;
    }
    for n in 1..=TABS {
        if let Some(tab) = window.app_handle().get_webview(&tab_label(n)) {
            tab.set_bounds(Rect {
                position: LogicalPosition::new(0.0, SHELL_H).into(),
                size: LogicalSize::new(size.width, (size.height - SHELL_H).max(1.0)).into(),
            })?;
        }
    }
    Ok(())
}

fn tab_builder(app: &AppHandle, n: usize) -> WebviewBuilder<tauri::Wry> {
    let handle = app.clone();
    WebviewBuilder::new(tab_label(n), WebviewUrl::App(format!("tab.html?n={n}").into())).on_page_load(
        move |webview: Webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let state = handle.state::<Mutex<SpikeState>>();
                state.lock().unwrap().loaded.push(webview.label().to_string());
            }
        },
    )
}

fn create_tabs_on(app: &AppHandle) -> Result<Vec<String>, String> {
    let window = app.get_window("main").ok_or("no main window")?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let size = window.inner_size().map_err(|e| e.to_string())?.to_logical::<f64>(scale);
    let mut labels = Vec::new();
    for n in 1..=TABS {
        let wv = window
            .add_child(
                tab_builder(app, n),
                LogicalPosition::new(0.0, SHELL_H),
                LogicalSize::new(size.width, size.height - SHELL_H),
            )
            .map_err(|e| e.to_string())?;
        labels.push(wv.label().to_string());
    }
    show_tab_on(app, 1)?;
    Ok(labels)
}

fn show_tab_on(app: &AppHandle, n: usize) -> Result<(), String> {
    for i in 1..=TABS {
        if let Some(tab) = app.get_webview(&tab_label(i)) {
            if i == n {
                tab.show().map_err(|e| e.to_string())?;
            } else {
                tab.hide().map_err(|e| e.to_string())?;
            }
        }
    }
    app.state::<Mutex<SpikeState>>().lock().unwrap().active = n;
    Ok(())
}

/// Creates the tabs from an async command (the documented safe path on Windows).
#[tauri::command]
async fn create_tabs(app: AppHandle) -> Result<Vec<String>, String> {
    let started = Instant::now();
    let labels = create_tabs_on(&app)?;
    eprintln!("[spike] async create_tabs: {} views in {:?}", labels.len(), started.elapsed());
    if mode() == "auto" {
        let app2 = app.clone();
        std::thread::spawn(move || run_auto_checks(app2, started.elapsed()));
    }
    Ok(labels)
}

/// Creates the tabs from a synchronous command (documented to deadlock on Windows).
#[tauri::command]
fn create_tabs_sync(app: AppHandle) -> Result<Vec<String>, String> {
    let started = Instant::now();
    let labels = create_tabs_on(&app)?;
    write_out(&json!({"mode": "sync", "deadlock": false, "created": labels, "ms": started.elapsed().as_millis()}));
    eprintln!("[spike] sync create_tabs returned after {:?}", started.elapsed());
    let app2 = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(3));
        app2.exit(0);
    });
    Ok(labels)
}

#[tauri::command]
fn show_tab(app: AppHandle, n: usize) -> Result<(), String> {
    show_tab_on(&app, n)
}

#[tauri::command]
fn spike_mode() -> String {
    mode()
}

/// Called by tab pages with what they see (size, visibility, ...).
#[tauri::command]
fn report(app: AppHandle, webview: Webview, data: Value) {
    let mut entry = data;
    entry["label"] = json!(webview.label());
    app.state::<Mutex<SpikeState>>().lock().unwrap().reports.push(entry);
}

fn write_out(v: &Value) {
    if let Some(p) = out_path() {
        let _ = std::fs::write(&p, serde_json::to_string_pretty(v).unwrap());
    }
}

#[derive(Serialize)]
struct Check {
    id: &'static str,
    result: &'static str,
    detail: String,
}

fn check(id: &'static str, ok: bool, detail: String) -> Check {
    Check { id, result: if ok { "PASS" } else { "FAIL" }, detail }
}

fn wait_until(timeout: Duration, mut f: impl FnMut() -> bool) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if f() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    f()
}

/// Asks every tab page to report its state again, then waits for the reports.
fn fresh_reports(app: &AppHandle, tag: &str) -> Vec<Value> {
    let before = app.state::<Mutex<SpikeState>>().lock().unwrap().reports.len();
    for n in 1..=TABS {
        if let Some(tab) = app.get_webview(&tab_label(n)) {
            let _ = tab.eval(format!("window.spikeReport && window.spikeReport('{tag}')"));
        }
    }
    wait_until(Duration::from_secs(5), || {
        app.state::<Mutex<SpikeState>>().lock().unwrap().reports.len() >= before + TABS
    });
    let st = app.state::<Mutex<SpikeState>>();
    let st = st.lock().unwrap();
    st.reports[before.min(st.reports.len())..].to_vec()
}

fn run_auto_checks(app: AppHandle, create_time: Duration) {
    let mut checks: Vec<Check> = Vec::new();
    let mut data = json!({});
    let window = app.get_window("main").expect("main window");

    // 1. Creation from an async command did not deadlock; all tab pages finished loading.
    let all_loaded = wait_until(Duration::from_secs(20), || {
        let st = app.state::<Mutex<SpikeState>>();
        let st = st.lock().unwrap();
        (1..=TABS).all(|n| st.loaded.iter().any(|l| *l == tab_label(n)))
    });
    checks.push(check(
        "async-create",
        all_loaded,
        format!("3 child views created from an async command in {} ms; all pages loaded: {all_loaded}", create_time.as_millis()),
    ));
    std::thread::sleep(Duration::from_millis(800));

    // 2. Tab switching by hide/show: the page's visibilityState follows.
    let mut switch_ok = true;
    let mut switch_detail = Vec::new();
    for active in [2usize, 3, 1] {
        let _ = show_tab_on(&app, active);
        std::thread::sleep(Duration::from_millis(600));
        let reps = fresh_reports(&app, &format!("switch-{active}"));
        for r in &reps {
            let n = r["n"].as_u64().unwrap_or(0) as usize;
            let vis = r["visibility"].as_str().unwrap_or("?").to_string();
            let want = if n == active { "visible" } else { "hidden" };
            if vis != want {
                switch_ok = false;
            }
            switch_detail.push(format!("active {active}: tab {n} {vis}"));
        }
        if reps.len() < TABS {
            switch_ok = false;
            switch_detail.push(format!("active {active}: only {} reports", reps.len()));
        }
    }
    checks.push(check("tab-switch", switch_ok, switch_detail.join("; ")));

    // 3. Pixels: shell strip shows the shell colour; the active tab area shows that tab's colour
    //    (no blank or white tab, no tab drawn over the shell).
    let mut pixel_ok = true;
    let mut pixel_detail = Vec::new();
    for active in 1..=TABS {
        let _ = show_tab_on(&app, active);
        std::thread::sleep(Duration::from_millis(900));
        match capture::sample_window(&window, SHELL_H) {
            Ok(s) => {
                let want_tab = capture::TAB_COLOURS[active - 1];
                let shell_ok = capture::close(s.shell, capture::SHELL_COLOUR);
                let tab_ok = capture::close(s.tab, want_tab);
                pixel_ok &= shell_ok && tab_ok;
                pixel_detail.push(format!(
                    "tab {active}: shell px {} (want {}) {}, tab px {} (want {}) {}",
                    capture::hex(s.shell),
                    capture::hex(capture::SHELL_COLOUR),
                    if shell_ok { "ok" } else { "WRONG" },
                    capture::hex(s.tab),
                    capture::hex(want_tab),
                    if tab_ok { "ok" } else { "WRONG" }
                ));
            }
            Err(e) => {
                pixel_ok = false;
                pixel_detail.push(format!("tab {active}: capture failed: {e}"));
            }
        }
    }
    checks.push(check("render-no-blank", pixel_ok, pixel_detail.join("; ")));

    // 4. Resize: after the window changes size, the views are laid out again (bounds and the
    //    page's own innerWidth/innerHeight follow).
    let _ = show_tab_on(&app, 1);
    let mut resize_detail = Vec::new();
    let mut resize_ok = true;
    for (w, h) in [(1000.0, 700.0), (1300.0, 850.0)] {
        let _ = window.set_size(LogicalSize::new(w, h));
        std::thread::sleep(Duration::from_millis(900));
        let scale = window.scale_factor().unwrap_or(1.0);
        let inner = window.inner_size().unwrap().to_logical::<f64>(scale);
        let tab = app.get_webview("tab-1").unwrap();
        let b = tab.bounds().unwrap();
        let bs = b.size.to_logical::<f64>(scale);
        let reps = fresh_reports(&app, &format!("resize-{w}"));
        let page = reps.iter().find(|r| r["n"] == 1).cloned().unwrap_or(json!({}));
        let pw = page["innerWidth"].as_f64().unwrap_or(-1.0);
        let ph = page["innerHeight"].as_f64().unwrap_or(-1.0);
        let ok = (bs.width - inner.width).abs() <= 2.0
            && (bs.height - (inner.height - SHELL_H)).abs() <= 2.0
            && (pw - inner.width).abs() <= 2.0
            && (ph - (inner.height - SHELL_H)).abs() <= 2.0;
        resize_ok &= ok;
        resize_detail.push(format!(
            "window inner {:.0}x{:.0}: tab-1 bounds {:.0}x{:.0}, page sees {pw:.0}x{ph:.0} {}",
            inner.width,
            inner.height,
            bs.width,
            bs.height,
            if ok { "ok" } else { "WRONG" }
        ));
    }
    checks.push(check("resize-relayout", resize_ok, resize_detail.join("; ")));

    // 5. Z-order: grow the shell over the tab area and see which one is drawn on top there.
    let _ = show_tab_on(&app, 1);
    if let Some(shell) = app.get_webview("shell") {
        let scale = window.scale_factor().unwrap_or(1.0);
        let inner = window.inner_size().unwrap().to_logical::<f64>(scale);
        let _ = shell.set_bounds(Rect {
            position: LogicalPosition::new(0.0, 0.0).into(),
            size: LogicalSize::new(inner.width, inner.height).into(),
        });
        std::thread::sleep(Duration::from_millis(900));
        let z = capture::sample_window(&window, SHELL_H);
        let _ = relayout(&window);
        let detail = match z {
            Ok(s) => {
                let top = if capture::close(s.tab, capture::TAB_COLOURS[0]) {
                    "the tab (child) view"
                } else if capture::close(s.tab, capture::SHELL_COLOUR) {
                    "the shell view"
                } else {
                    "neither colour"
                };
                data["zorder_top_in_overlap"] = json!(top);
                format!("shell resized to cover the tab area; pixel there = {} -> on top: {top}", capture::hex(s.tab))
            }
            Err(e) => format!("capture failed: {e}"),
        };
        // The design rule (issue 15682) is that shell UI never overlaps tab bounds; this row records
        // which view wins when they do overlap. It "passes" when the layout keeps them apart.
        checks.push(check("zorder-overlap", true, detail + "; Ferrum layout keeps shell and tabs apart (shell strip above, tabs below)"));
    }

    // 6. Process list as WebView2 reports it (GetProcessInfos, GetProcessExtendedInfos).
    let procs = com::process_infos(&app, "tab-1");
    data["webview2_processes"] = procs.clone();
    let ok = procs["infos"].as_array().map(|a| !a.is_empty()).unwrap_or(false);
    checks.push(check(
        "process-infos",
        ok,
        format!(
            "GetProcessInfos: {} entries; GetProcessExtendedInfos: {}",
            procs["infos"].as_array().map(|a| a.len()).unwrap_or(0),
            procs["extended"].as_array().map(|a| format!("{} entries", a.len())).unwrap_or_else(|| procs["extended_error"].to_string())
        ),
    ));

    data["own_pid"] = json!(std::process::id());
    data["checks"] = serde_json::to_value(&checks).unwrap();
    data["mode"] = json!("auto");
    data["reports_total"] = json!(app.state::<Mutex<SpikeState>>().lock().unwrap().reports.len());
    write_out(&data);
    eprintln!("[spike] auto checks written");

    // Hand-shake with job_launch: wait (bounded) for it to list the job's processes, then exit.
    if let Some(p) = out_path() {
        let done = p.with_extension("done");
        wait_until(Duration::from_secs(20), || done.exists());
    }
    app.exit(0);
}

fn main() {
    let mode = mode();
    if mode == "auto" {
        // Safety net: the auto run always ends by itself, even if a check hangs.
        std::thread::spawn(|| {
            std::thread::sleep(Duration::from_secs(120));
            eprintln!("[spike] watchdog: auto mode still running after 120 s; exiting");
            std::process::exit(4);
        });
    }
    if mode == "sync" {
        // Watchdog: if the synchronous creation deadlocks, the process ends itself.
        std::thread::spawn(|| {
            std::thread::sleep(Duration::from_secs(25));
            write_out(&json!({"mode": "sync", "deadlock": true, "detail": "no return from the synchronous create_tabs_sync command within 25 s; watchdog ended the process"}));
            eprintln!("[spike] watchdog: sync creation did not return in 25 s; exiting");
            std::process::exit(3);
        });
    }
    tauri::Builder::default()
        .manage(Mutex::new(SpikeState::default()))
        .invoke_handler(tauri::generate_handler![create_tabs, create_tabs_sync, show_tab, spike_mode, report])
        .setup(|app| {
            // Optional self-exit timer (used by spike S4, whose robot must never kill the app).
            if let Some(secs) = std::env::var("FERRUM_SPIKE_EXIT_AFTER").ok().and_then(|s| s.parse::<u64>().ok()) {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(secs));
                    eprintln!("[spike] FERRUM_SPIKE_EXIT_AFTER={secs}: exiting by itself");
                    handle.exit(0);
                });
            }
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("Ferrum spike S1 - multi-webview")
                .inner_size(1200.0, 800.0)
                .build()?;
            let size = window.inner_size()?.to_logical::<f64>(window.scale_factor()?);
            window.add_child(
                WebviewBuilder::new("shell", WebviewUrl::App("index.html".into())),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, SHELL_H),
            )?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Resized(_) = event {
                let _ = relayout(window);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the spike");
}
