//! P1 spike S3 (throw-away, never shipped): can Ferrum reach the WebView2 features Tauri does not
//! expose, through `Webview::with_webview` and raw COM (risk-r03)?
//!
//! Window with a shell strip and one child "tab" web view (the Ferrum hosting model, adr-0007).
//! Mode `auto` (FERRUM_SPIKE_MODE=auto, default here) runs every call once, logs each HRESULT to the
//! JSON file named by FERRUM_SPIKE_OUT, and exits by itself. A watchdog ends the process after 120 s.
//!
//! Calls exercised: ICoreWebView2_3 TrySuspend / IsSuspended / Resume (only while hidden),
//! ICoreWebView2_19 MemoryUsageTargetLevel Low/Normal (never while suspended), ICoreWebView2
//! add/remove_ProcessFailed (renderer ended on purpose through the browser's own `edge://kill` page,
//! inside this app only), ICoreWebView2_2 add/remove_WebResourceResponseReceived,
//! ICoreWebView2Environment8 GetProcessInfos.

use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl};
use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{ProcessFailedEventHandler, TrySuspendCompletedHandler, WebResourceResponseReceivedEventHandler};
use windows::core::{BOOL, Interface, PWSTR};

const SHELL_H: f64 = 64.0;

type Events = Arc<Mutex<Vec<Value>>>;

#[derive(Default)]
struct Shared {
    loads: Vec<String>,
}

fn hr<T>(r: &windows::core::Result<T>) -> String {
    match r {
        Ok(_) => "S_OK".into(),
        Err(e) => format!("0x{:08X} {}", e.code().0 as u32, e.message()),
    }
}

/// Runs `f` on the UI thread with the tab's `ICoreWebView2Controller` and returns its JSON result.
fn on_ui(
    app: &AppHandle,
    f: impl FnOnce(ICoreWebView2Controller, ICoreWebView2Environment, mpsc::Sender<Value>) + Send + 'static,
    timeout: Duration,
) -> Value {
    let Some(wv) = app.get_webview("tab") else { return json!({"error": "no tab"}) };
    let (tx, rx) = mpsc::channel();
    if let Err(e) = wv.with_webview(move |pw| f(pw.controller(), pw.environment(), tx)) {
        return json!({"error": e.to_string()});
    }
    rx.recv_timeout(timeout).unwrap_or_else(|_| json!({"error": "timeout"}))
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

fn loads(app: &AppHandle) -> usize {
    app.state::<Mutex<Shared>>().lock().unwrap().loads.len()
}

fn run(app: AppHandle) {
    let mut out = json!({"mode": "auto"});
    let tab = app.get_webview("tab").expect("tab");
    out["first_load"] = json!(wait_until(Duration::from_secs(20), || loads(&app) >= 1));

    // 1. Register the two event handlers (UI thread). Tokens are kept to remove them at the end.
    let failed: Events = Arc::default();
    let responses: Events = Arc::default();
    let (f2, r2) = (failed.clone(), responses.clone());
    let tokens = on_ui(
        &app,
        move |ctl, _env, tx| {
            // SAFETY: runs on the UI thread inside with_webview; `ctl` is the tab's live controller.
            // The handlers only push plain JSON into Arc<Mutex<..>> and never call back into the
            // web view, so no re-entrancy; they are removed with their tokens before the app exits.
            let res = (|| -> windows::core::Result<Value> {
                let core = unsafe { ctl.CoreWebView2()? };
                let mut t_failed = 0i64;
                let h = ProcessFailedEventHandler::create(Box::new(move |_sender, args| {
                    let mut e = json!({});
                    if let Some(args) = args {
                        let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
                        e["kind_hr"] = json!(hr(&unsafe { args.ProcessFailedKind(&mut kind) }));
                        e["kind"] = json!(kind.0);
                        if let Ok(a2) = args.cast::<ICoreWebView2ProcessFailedEventArgs2>() {
                            let mut reason = COREWEBVIEW2_PROCESS_FAILED_REASON::default();
                            let mut code = 0i32;
                            e["reason_hr"] = json!(hr(&unsafe { a2.Reason(&mut reason) }));
                            e["reason"] = json!(reason.0);
                            e["exit_code_hr"] = json!(hr(&unsafe { a2.ExitCode(&mut code) }));
                            e["exit_code"] = json!(code);
                        }
                    }
                    f2.lock().unwrap().push(e);
                    Ok(())
                }));
                let r_pf = unsafe { core.add_ProcessFailed(&h, &mut t_failed) };
                let core2: ICoreWebView2_2 = core.cast()?;
                let mut t_resp = 0i64;
                let h2 = WebResourceResponseReceivedEventHandler::create(Box::new(move |_sender, args| {
                    if let Some(args) = args {
                        let mut uri = PWSTR::null();
                        let mut status = 0i32;
                        let req = unsafe { args.Request() };
                        let resp = unsafe { args.Response() };
                        if let Ok(req) = req {
                            let _ = unsafe { req.Uri(&mut uri) };
                        }
                        if let Ok(resp) = resp {
                            let _ = unsafe { resp.StatusCode(&mut status) };
                        }
                        r2.lock().unwrap().push(json!({"uri": webview2_com::take_pwstr(uri), "status": status}));
                    }
                    Ok(())
                }));
                let r_wr = unsafe { core2.add_WebResourceResponseReceived(&h2, &mut t_resp) };
                Ok(json!({"add_ProcessFailed": hr(&r_pf), "token_failed": t_failed,
                          "cast_ICoreWebView2_2": "S_OK",
                          "add_WebResourceResponseReceived": hr(&r_wr), "token_resp": t_resp}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );
    out["register_handlers"] = tokens.clone();

    // 2. WebResourceResponseReceived: reload the local page (sub-resources), then an https page.
    let n0 = loads(&app);
    let _ = tab.eval("location.reload()");
    wait_until(Duration::from_secs(10), || loads(&app) > n0);
    std::thread::sleep(Duration::from_millis(800));
    let local_events = responses.lock().unwrap().clone();
    let n1 = loads(&app);
    let _ = tab.navigate("https://example.com/".parse().unwrap());
    let https_loaded = wait_until(Duration::from_secs(20), || loads(&app) > n1);
    std::thread::sleep(Duration::from_millis(1500));
    let all_events = responses.lock().unwrap().clone();
    out["web_resource_response"] = json!({
        "local_reload_events": local_events,
        "https_loaded": https_loaded,
        "https_events": all_events[local_events.len()..].to_vec(),
    });
    let n2 = loads(&app);
    let _ = tab.navigate("http://tauri.localhost/tab.html".parse().unwrap());
    wait_until(Duration::from_secs(10), || loads(&app) > n2);

    // 3. MemoryUsageTargetLevel (ICoreWebView2_19): read, Low, read, Normal, read. Visible, not suspended.
    out["memory_usage_target_level"] = on_ui(
        &app,
        |ctl, _env, tx| {
            // SAFETY: UI thread, live controller; the out-pointers point to locals.
            let res = (|| -> windows::core::Result<Value> {
                let core = unsafe { ctl.CoreWebView2()? };
                let c19: ICoreWebView2_19 = core.cast()?;
                let mut lvl = COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL::default();
                let r0 = unsafe { c19.MemoryUsageTargetLevel(&mut lvl) };
                let start = lvl.0;
                let r1 = unsafe { c19.SetMemoryUsageTargetLevel(COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW) };
                let r2 = unsafe { c19.MemoryUsageTargetLevel(&mut lvl) };
                let after_low = lvl.0;
                let r3 = unsafe { c19.SetMemoryUsageTargetLevel(COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL) };
                let r4 = unsafe { c19.MemoryUsageTargetLevel(&mut lvl) };
                Ok(json!({"cast_ICoreWebView2_19": "S_OK", "get_start": hr(&r0), "start": start,
                          "set_low": hr(&r1), "get_after_low": hr(&r2), "after_low": after_low,
                          "set_normal": hr(&r3), "get_after_normal": hr(&r4), "after_normal": lvl.0,
                          "low_value": COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW.0,
                          "normal_value": COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL.0}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );

    // 4. Suspend while hidden (ICoreWebView2_3): hide via Tauri, TrySuspend, IsSuspended, Resume.
    let _ = tab.hide();
    std::thread::sleep(Duration::from_millis(500));
    let suspend = on_ui(
        &app,
        |ctl, _env, tx| {
            // SAFETY: UI thread, live controller. TrySuspend is only called after IsVisible reads
            // FALSE. The completion handler only sends JSON over a channel.
            let res = (|| -> windows::core::Result<()> {
                let mut visible = BOOL(1);
                let rv = unsafe { ctl.IsVisible(&mut visible) };
                let core = unsafe { ctl.CoreWebView2()? };
                let c3: ICoreWebView2_3 = core.cast()?;
                if visible.as_bool() {
                    let _ = tx.send(json!({"is_visible_hr": hr(&rv), "is_visible": true, "skipped": "still visible"}));
                    return Ok(());
                }
                let tx2 = tx.clone();
                let c3b = c3.clone();
                let h = TrySuspendCompletedHandler::create(Box::new(move |res, ok| {
                    let mut sus = BOOL(0);
                    let r = unsafe { c3b.IsSuspended(&mut sus) };
                    let _ = tx2.send(json!({"is_visible_hr": "S_OK", "is_visible": false,
                        "try_suspend_completed_hr": hr(&res), "try_suspend_result": ok,
                        "is_suspended_hr": hr(&r), "is_suspended": sus.as_bool()}));
                    Ok(())
                }));
                let r = unsafe { c3.TrySuspend(&h) };
                if r.is_err() {
                    let _ = tx.send(json!({"try_suspend_call": hr(&r)}));
                }
                Ok(())
            })();
            if let Err(e) = res {
                let _ = tx.send(json!({"error": hr::<()>(&Err(e))}));
            }
        },
        Duration::from_secs(15),
    );
    std::thread::sleep(Duration::from_millis(500));
    let resume = on_ui(
        &app,
        |ctl, _env, tx| {
            // SAFETY: UI thread, live controller; Resume is valid on a suspended or running web view.
            let res = (|| -> windows::core::Result<Value> {
                let c3: ICoreWebView2_3 = unsafe { ctl.CoreWebView2()? }.cast()?;
                let r = unsafe { c3.Resume() };
                let mut sus = BOOL(1);
                let r2 = unsafe { c3.IsSuspended(&mut sus) };
                Ok(json!({"resume": hr(&r), "is_suspended_hr": hr(&r2), "is_suspended_after_resume": sus.as_bool()}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );
    // Suspend again, then let Tauri's show() wake it (no explicit Resume).
    let _ = on_ui(
        &app,
        |ctl, _env, tx| {
            // SAFETY: as above; the web view is hidden here (Resume does not show it).
            let c3: Option<ICoreWebView2_3> = unsafe { ctl.CoreWebView2() }.ok().and_then(|c| c.cast().ok());
            if let Some(c3) = c3 {
                let tx2 = tx.clone();
                let h = TrySuspendCompletedHandler::create(Box::new(move |res, ok| {
                    let _ = tx2.send(json!({"second_try_suspend_hr": hr(&res), "ok": ok}));
                    Ok(())
                }));
                let _ = unsafe { c3.TrySuspend(&h) };
            } else {
                let _ = tx.send(json!({"error": "cast"}));
            }
        },
        Duration::from_secs(15),
    );
    let _ = tab.show();
    std::thread::sleep(Duration::from_millis(800));
    let after_show = on_ui(
        &app,
        |ctl, _env, tx| {
            // SAFETY: UI thread, live controller.
            let res = (|| -> windows::core::Result<Value> {
                let c3: ICoreWebView2_3 = unsafe { ctl.CoreWebView2()? }.cast()?;
                let mut sus = BOOL(1);
                let r = unsafe { c3.IsSuspended(&mut sus) };
                let mut vis = BOOL(0);
                let r2 = unsafe { ctl.IsVisible(&mut vis) };
                Ok(json!({"is_suspended_hr": hr(&r), "is_suspended_after_show": sus.as_bool(),
                          "is_visible_hr": hr(&r2), "is_visible": vis.as_bool()}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );
    out["suspend"] = json!({"hidden_try_suspend": suspend, "explicit_resume": resume, "show_after_second_suspend": after_show});

    // 5. GetProcessInfos (ICoreWebView2Environment8).
    out["process_infos"] = on_ui(
        &app,
        |_ctl, env, tx| {
            // SAFETY: UI thread, live environment; out-pointers point to locals.
            let res = (|| -> windows::core::Result<Value> {
                let env8: ICoreWebView2Environment8 = env.cast()?;
                let coll = unsafe { env8.GetProcessInfos()? };
                let mut n = 0u32;
                unsafe { coll.Count(&mut n)? };
                let mut list = Vec::new();
                for i in 0..n {
                    let info = unsafe { coll.GetValueAtIndex(i)? };
                    let (mut pid, mut kind) = (0i32, COREWEBVIEW2_PROCESS_KIND::default());
                    unsafe { info.ProcessId(&mut pid)? };
                    unsafe { info.Kind(&mut kind)? };
                    list.push(json!({"pid": pid, "kind": kind.0}));
                }
                Ok(json!({"cast_Environment8": "S_OK", "GetProcessInfos": "S_OK", "count": n, "list": list}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );

    // 6. ProcessFailed: end this tab's renderer on purpose via the browser's own kill page, then recover.
    let before = failed.lock().unwrap().len();
    let _ = tab.navigate("edge://kill".parse().unwrap());
    let fired = wait_until(Duration::from_secs(10), || failed.lock().unwrap().len() > before);
    let events = failed.lock().unwrap().clone();
    let n3 = loads(&app);
    let _ = tab.navigate("http://tauri.localhost/tab.html".parse().unwrap());
    let recovered = wait_until(Duration::from_secs(15), || loads(&app) > n3);
    out["process_failed"] = json!({"trigger": "navigate tab to edge://kill", "fired": fired, "events": events, "recovered_by_navigate": recovered});

    // 6b. Back/forward (added for p1.9): raw COM CanGoBack/GoBack/CanGoForward/GoForward with a
    //     HistoryChanged handler, compared with script `history.back()` through Tauri eval.
    out["history"] = history_check(&app);

    // 7. Remove the handlers again (no reference cycles keep the web view alive).
    let t_failed = tokens["token_failed"].as_i64().unwrap_or(0);
    let t_resp = tokens["token_resp"].as_i64().unwrap_or(0);
    out["remove_handlers"] = on_ui(
        &app,
        move |ctl, _env, tx| {
            // SAFETY: UI thread; tokens come from the add_* calls above on the same web view.
            let res = (|| -> windows::core::Result<Value> {
                let core = unsafe { ctl.CoreWebView2()? };
                let r1 = unsafe { core.remove_ProcessFailed(t_failed) };
                let core2: ICoreWebView2_2 = core.cast()?;
                let r2 = unsafe { core2.remove_WebResourceResponseReceived(t_resp) };
                Ok(json!({"remove_ProcessFailed": hr(&r1), "remove_WebResourceResponseReceived": hr(&r2)}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );

    out["own_pid"] = json!(std::process::id());
    if let Some(p) = std::env::var_os("FERRUM_SPIKE_OUT") {
        let _ = std::fs::write(p, serde_json::to_string_pretty(&out).unwrap());
    }
    eprintln!("[spike-s3] done");
    app.exit(0);
}

/// Back/forward through raw COM versus script, on the tab (p1.9 evidence for the back/forward ADR).
fn history_check(app: &AppHandle) -> Value {
    let tab = app.get_webview("tab").expect("tab");
    let changes: Events = Arc::default();
    let c2 = changes.clone();
    let reg = on_ui(
        app,
        move |ctl, _env, tx| {
            // SAFETY: UI thread, live controller; the handler only pushes plain JSON and is removed below.
            let res = (|| -> windows::core::Result<Value> {
                let core = unsafe { ctl.CoreWebView2()? };
                let mut token = 0i64;
                let h = webview2_com::HistoryChangedEventHandler::create(Box::new(move |_s, _a| {
                    c2.lock().unwrap().push(json!(1));
                    Ok(())
                }));
                let r = unsafe { core.add_HistoryChanged(&h, &mut token) };
                Ok(json!({"add_HistoryChanged": hr(&r), "token": token}))
            })();
            let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
        },
        Duration::from_secs(10),
    );
    let go = |app: &AppHandle, url: &str| {
        let n = loads(app);
        let _ = app.get_webview("tab").unwrap().navigate(url.parse().unwrap());
        wait_until(Duration::from_secs(10), || loads(app) > n)
    };
    let nav1 = go(app, "http://tauri.localhost/tab.html?h=1");
    let nav2 = go(app, "http://tauri.localhost/tab.html?h=2");
    let step = |app: &AppHandle, forward: bool| {
        let n = loads(app);
        let r = on_ui(
            app,
            move |ctl, _env, tx| {
                // SAFETY: UI thread, live controller; out-pointers point to locals.
                let res = (|| -> windows::core::Result<Value> {
                    let core = unsafe { ctl.CoreWebView2()? };
                    let mut can = BOOL(0);
                    let rc = if forward { unsafe { core.CanGoForward(&mut can) } } else { unsafe { core.CanGoBack(&mut can) } };
                    let rg = if forward { unsafe { core.GoForward() } } else { unsafe { core.GoBack() } };
                    Ok(json!({"can": can.as_bool(), "can_hr": hr(&rc), "go_hr": hr(&rg)}))
                })();
                let _ = tx.send(res.unwrap_or_else(|e| json!({"error": hr::<()>(&Err(e))})));
            },
            Duration::from_secs(10),
        );
        let loaded = wait_until(Duration::from_secs(10), || loads(app) > n);
        std::thread::sleep(Duration::from_millis(300));
        let url = app.get_webview("tab").unwrap().url().map(|u| u.to_string()).unwrap_or_default();
        json!({"call": r, "page_loaded": loaded, "url_after": url})
    };
    let back = step(app, false);
    let fwd = step(app, true);
    let n = loads(app);
    let _ = tab.eval("history.back()");
    let eval_loaded = wait_until(Duration::from_secs(10), || loads(app) > n);
    std::thread::sleep(Duration::from_millis(300));
    let eval_url = tab.url().map(|u| u.to_string()).unwrap_or_default();
    let token = reg["token"].as_i64().unwrap_or(0);
    let removed = on_ui(
        app,
        move |ctl, _env, tx| {
            // SAFETY: UI thread; token from add_HistoryChanged on the same web view.
            let r = unsafe { ctl.CoreWebView2() }.and_then(|c| unsafe { c.remove_HistoryChanged(token) });
            let _ = tx.send(json!(hr(&r)));
        },
        Duration::from_secs(10),
    );
    json!({"register": reg, "navigated_h1": nav1, "navigated_h2": nav2,
           "raw_com_back": back, "raw_com_forward": fwd,
           "eval_history_back": {"page_loaded": eval_loaded, "url_after": eval_url},
           "history_changed_events": changes.lock().unwrap().len(),
           "remove_HistoryChanged": removed})
}

fn main() {
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_secs(120));
        eprintln!("[spike-s3] watchdog: still running after 120 s; exiting");
        std::process::exit(4);
    });
    tauri::Builder::default()
        .manage(Mutex::new(Shared::default()))
        .setup(|app| {
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("Ferrum spike S3 - raw COM")
                .inner_size(1000.0, 700.0)
                .build()?;
            let size = window.inner_size()?.to_logical::<f64>(window.scale_factor()?);
            window.add_child(
                WebviewBuilder::new("shell", WebviewUrl::App("index.html".into())),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, SHELL_H),
            )?;
            let handle = app.handle().clone();
            let tab = WebviewBuilder::new("tab", WebviewUrl::App("tab.html".into())).on_page_load(
                move |wv: Webview, p| {
                    if p.event() == PageLoadEvent::Finished {
                        handle.state::<Mutex<Shared>>().lock().unwrap().loads.push(wv.url().map(|u| u.to_string()).unwrap_or_default());
                    }
                },
            );
            // Created off the UI thread (async-safe path found in S1).
            let app2 = app.handle().clone();
            std::thread::spawn(move || {
                let w = app2.get_window("main").unwrap();
                let _ = w.add_child(tab, LogicalPosition::new(0.0, SHELL_H), LogicalSize::new(size.width, size.height - SHELL_H));
                run(app2);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running spike S3");
}
