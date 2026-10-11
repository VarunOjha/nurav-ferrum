//! P1 spike S2 (throw-away, never shipped): can each site get its own WebView2 profile (risk-r01,
//! owner decision Q7: per-site profiles in one shared browser process)?
//!
//! Runs two routes one after the other in one app, then exits by itself (watchdog 150 s):
//! - route (c): Ferrum creates the tab controllers itself with raw COM, reusing **Tauri's own
//!   environment** (`ICoreWebView2Environment10::CreateCoreWebView2ControllerWithOptions` with a
//!   `ProfileName` per site), hosted in the Tauri window's HWND;
//! - route (d): two Tauri child web views with different `data_directory` values.
//!
//! For each route: creation result, `BrowserProcessId` of both sites and of the shell, and cookie
//! isolation measured at a loopback fixture server (Set-Cookie in site A; the Cookie header that site
//! B sends). Results go to the JSON file named by FERRUM_SPIKE_OUT.

use std::cell::RefCell;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};
use webview2_com::CreateCoreWebView2ControllerCompletedHandler;
use webview2_com::Microsoft::Web::WebView2::Win32::*;
use windows::Win32::Foundation::{HWND, RECT};
use windows::core::{HSTRING, Interface};

const SHELL_H: f64 = 64.0;

/// Requests seen by the fixture server: tag -> Cookie header ("" when none).
type Seen = Arc<Mutex<HashMap<String, String>>>;

thread_local! {
    /// Route (c) controllers. COM objects live on the UI thread only (never sent across threads).
    static CONTROLLERS: RefCell<Vec<(String, ICoreWebView2Controller)>> = const { RefCell::new(Vec::new()) };
}

fn hr<T>(r: &windows::core::Result<T>) -> String {
    match r {
        Ok(_) => "S_OK".into(),
        Err(e) => format!("0x{:08X} {}", e.code().0 as u32, e.message()),
    }
}

/// Minimal loopback HTTP server: `/set?who=X&tag=T` answers with `Set-Cookie: who=X`;
/// every request with `tag=T` records its Cookie header under T.
fn start_fixture() -> (u16, Seen) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
    let port = listener.local_addr().unwrap().port();
    let seen: Seen = Arc::default();
    let seen2 = seen.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let mut reader = BufReader::new(stream.try_clone().unwrap());
            let mut first = String::new();
            if reader.read_line(&mut first).is_err() {
                continue;
            }
            let mut cookie = String::new();
            loop {
                let mut line = String::new();
                if reader.read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" {
                    break;
                }
                if let Some(v) = line.strip_prefix("Cookie: ").or_else(|| line.strip_prefix("cookie: ")) {
                    cookie = v.trim().to_string();
                }
            }
            let path = first.split_whitespace().nth(1).unwrap_or("/").to_string();
            let q: HashMap<String, String> = path
                .split_once('?')
                .map(|(_, q)| q.split('&').filter_map(|kv| kv.split_once('=')).map(|(k, v)| (k.into(), v.into())).collect())
                .unwrap_or_default();
            if let Some(tag) = q.get("tag") {
                seen2.lock().unwrap().insert(tag.clone(), cookie.clone());
            }
            let set = q.get("who").map(|w| format!("Set-Cookie: who={w}; Path=/; SameSite=Lax\r\n")).unwrap_or_default();
            let body = format!("<!doctype html><title>S2 fixture</title><body style=\"font:16px system-ui;padding:16px\"><h1>S2 fixture</h1><p>path {path}</p><p>cookie header: {cookie}</p></body>");
            let mut s = stream;
            let _ = write!(
                s,
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n{set}Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
        }
    });
    (port, seen)
}

fn wait_tag(seen: &Seen, tag: &str, secs: u64) -> Option<String> {
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(secs) {
        if let Some(c) = seen.lock().unwrap().get(tag) {
            return Some(c.clone());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    None
}

/// Runs `f` on the UI thread through the shell web view and returns its JSON result.
fn on_ui(
    app: &AppHandle,
    f: impl FnOnce(ICoreWebView2Environment, ICoreWebView2Controller, mpsc::Sender<Value>) + Send + 'static,
    secs: u64,
) -> Value {
    let shell = app.get_webview("shell").expect("shell");
    let (tx, rx) = mpsc::channel();
    if let Err(e) = shell.with_webview(move |pw| f(pw.environment(), pw.controller(), tx)) {
        return json!({"error": e.to_string()});
    }
    rx.recv_timeout(Duration::from_secs(secs)).unwrap_or_else(|_| json!({"error": "timeout"}))
}

/// BrowserProcessId of a controller's core web view.
///
/// # Safety
/// UI thread only; `ctl` is a live controller.
unsafe fn browser_pid(ctl: &ICoreWebView2Controller) -> windows::core::Result<u32> {
    let core = unsafe { ctl.CoreWebView2()? };
    let mut pid = 0u32;
    unsafe { core.BrowserProcessId(&mut pid)? };
    Ok(pid)
}

fn route_c(app: &AppHandle, port: u16, seen: &Seen) -> Value {
    let window = app.get_window("main").unwrap();
    let hwnd_raw = window.hwnd().unwrap().0 as isize; // plain integer so the closure is Send
    let size = window.inner_size().unwrap();
    let scale = window.scale_factor().unwrap();
    let top = (SHELL_H * scale) as i32;
    let (w, h) = (size.width as i32, size.height as i32);
    let mut out = json!({"route": "c", "how": "raw COM controllers from Tauri's environment, ProfileName per site"});

    // Shell's own browser process (Tauri-created controller).
    out["shell_browser_pid"] = on_ui(
        app,
        |_env, ctl, tx| {
            // SAFETY: UI thread; the shell controller is live.
            let _ = tx.send(json!(unsafe { browser_pid(&ctl) }.map_err(|e| hr::<()>(&Err(e))).ok()));
        },
        10,
    );

    for (i, site) in ["ferrum-site-a", "ferrum-site-b"].into_iter().enumerate() {
        let bounds = RECT { left: if i == 0 { 0 } else { w / 2 }, top, right: if i == 0 { w / 2 } else { w }, bottom: h };
        let site_s = site.to_string();
        let created = on_ui(
            app,
            move |env, _ctl, tx| {
                // SAFETY: UI thread; `env` is Tauri's live environment; the parent HWND is the live
                // Tauri window; the new controller is stored in a UI-thread thread_local and closed
                // before exit. The completion handler only stores it and sends plain JSON.
                let res = (|| -> windows::core::Result<()> {
                    let env10: ICoreWebView2Environment10 = env.cast()?;
                    let opts = unsafe { env10.CreateCoreWebView2ControllerOptions()? };
                    let r_name = unsafe { opts.SetProfileName(&HSTRING::from(site_s.as_str())) };
                    let tx2 = tx.clone();
                    let name = site_s.clone();
                    let handler = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(move |res, ctl| {
                        let mut v = json!({"site": name, "create_completed": hr(&res), "set_profile_name": hr(&r_name)});
                        if let (Ok(()), Some(ctl)) = (res, ctl) {
                            v["set_bounds"] = json!(hr(&unsafe { ctl.SetBounds(bounds) }));
                            v["set_visible"] = json!(hr(&unsafe { ctl.SetIsVisible(true) }));
                            v["browser_pid"] = json!(unsafe { browser_pid(&ctl) }.ok());
                            if let Ok(core) = unsafe { ctl.CoreWebView2() }
                                && let Ok(c13) = core.cast::<ICoreWebView2_13>()
                                && let Ok(profile) = unsafe { c13.Profile() }
                            {
                                let mut p = windows::core::PWSTR::null();
                                let _ = unsafe { profile.ProfilePath(&mut p) };
                                v["profile_path"] = json!(webview2_com::take_pwstr(p));
                                let mut n = windows::core::PWSTR::null();
                                let _ = unsafe { profile.ProfileName(&mut n) };
                                v["profile_name_read_back"] = json!(webview2_com::take_pwstr(n));
                            }
                            CONTROLLERS.with(|c| c.borrow_mut().push((name.clone(), ctl)));
                        }
                        let _ = tx2.send(v);
                        Ok(())
                    }));
                    unsafe { env10.CreateCoreWebView2ControllerWithOptions(HWND(hwnd_raw as *mut _), &opts, &handler)? };
                    Ok(())
                })();
                if let Err(e) = res {
                    let _ = tx.send(json!({"site": site_s, "error": hr::<()>(&Err(e))}));
                }
            },
            20,
        );
        out[site] = created;
    }

    // Cookie isolation: A sets a cookie, A reads it back (positive control), B reads.
    let nav = |app: &AppHandle, site: &'static str, url: String| {
        on_ui(
            app,
            move |_env, _ctl, tx| {
                // SAFETY: UI thread; controllers from the thread_local are live until closed below.
                let r = CONTROLLERS.with(|c| {
                    c.borrow().iter().find(|(n, _)| n == site).map(|(_, ctl)| unsafe {
                        ctl.CoreWebView2().and_then(|core| core.Navigate(&HSTRING::from(url.as_str())))
                    })
                });
                let _ = tx.send(json!(r.map(|r| hr(&r)).unwrap_or_else(|| "no controller".into())));
            },
            10,
        )
    };
    let base = format!("http://127.0.0.1:{port}");
    out["nav_a_set"] = nav(app, "ferrum-site-a", format!("{base}/set?who=A&tag=c-a-set"));
    out["seen_a_set"] = json!(wait_tag(seen, "c-a-set", 10));
    std::thread::sleep(Duration::from_millis(500));
    out["nav_a_read"] = nav(app, "ferrum-site-a", format!("{base}/read?tag=c-a-read"));
    out["cookie_seen_from_a"] = json!(wait_tag(seen, "c-a-read", 10));
    out["nav_b_read"] = nav(app, "ferrum-site-b", format!("{base}/read?tag=c-b-read"));
    out["cookie_seen_from_b"] = json!(wait_tag(seen, "c-b-read", 10));
    std::thread::sleep(Duration::from_millis(800));

    // Close our controllers (cleanup invariant).
    out["close"] = on_ui(
        app,
        |_env, _ctl, tx| {
            // SAFETY: UI thread; each controller is closed once and then dropped.
            let r: Vec<String> = CONTROLLERS.with(|c| c.borrow_mut().drain(..).map(|(n, ctl)| format!("{n}: {}", hr(&unsafe { ctl.Close() }))).collect());
            let _ = tx.send(json!(r));
        },
        10,
    );
    out
}

fn route_d(app: &AppHandle, port: u16, seen: &Seen) -> Value {
    let window = app.get_window("main").unwrap();
    let scale = window.scale_factor().unwrap();
    let size = window.inner_size().unwrap().to_logical::<f64>(scale);
    let base = format!("http://127.0.0.1:{port}");
    let root: PathBuf = app.path().app_local_data_dir().unwrap().join("route-d");
    let mut out = json!({"route": "d", "how": "Tauri child web views with a data_directory per site"});
    let mut pids = serde_json::Map::new();
    for (i, site) in ["site-a", "site-b"].into_iter().enumerate() {
        let dir = root.join(site);
        let url = if i == 0 { format!("{base}/set?who=A&tag=d-a-set") } else { format!("{base}/read?tag=d-b-read-first") };
        let b = WebviewBuilder::new(format!("d-{site}"), WebviewUrl::External(url.parse().unwrap())).data_directory(dir.clone());
        let r = window.add_child(
            b,
            LogicalPosition::new(if i == 0 { 0.0 } else { size.width / 2.0 }, SHELL_H),
            LogicalSize::new(size.width / 2.0, size.height - SHELL_H),
        );
        out[site] = json!({"create": r.as_ref().map(|_| "ok".to_string()).unwrap_or_else(|e| e.to_string()), "data_directory_leaf": format!("route-d/{site}")});
        std::thread::sleep(Duration::from_millis(300));
    }
    out["seen_a_set"] = json!(wait_tag(seen, "d-a-set", 20));
    out["cookie_seen_from_b_first_load"] = json!(wait_tag(seen, "d-b-read-first", 20));
    if let Some(a) = app.get_webview("d-site-a") {
        let _ = a.navigate(format!("{base}/read?tag=d-a-read").parse().unwrap());
    }
    out["cookie_seen_from_a"] = json!(wait_tag(seen, "d-a-read", 10));
    if let Some(b) = app.get_webview("d-site-b") {
        let _ = b.navigate(format!("{base}/read?tag=d-b-read").parse().unwrap());
    }
    out["cookie_seen_from_b"] = json!(wait_tag(seen, "d-b-read", 10));
    for site in ["site-a", "site-b"] {
        if let Some(wv) = app.get_webview(&format!("d-{site}")) {
            let (tx, rx) = mpsc::channel();
            let _ = wv.with_webview(move |pw| {
                // SAFETY: UI thread; live controller of a Tauri web view.
                let _ = tx.send(unsafe { browser_pid(&pw.controller()) }.ok());
            });
            pids.insert(site.into(), json!(rx.recv_timeout(Duration::from_secs(10)).ok().flatten()));
        }
    }
    out["browser_pids"] = json!(pids);
    out["shell_browser_pid"] = on_ui(
        app,
        |_env, ctl, tx| {
            // SAFETY: UI thread; the shell controller is live.
            let _ = tx.send(json!(unsafe { browser_pid(&ctl) }.ok()));
        },
        10,
    );
    out
}

fn main() {
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_secs(150));
        eprintln!("[spike-s2] watchdog: still running after 150 s; exiting");
        std::process::exit(4);
    });
    tauri::Builder::default()
        .setup(|app| {
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("Ferrum spike S2 - profiles")
                .inner_size(1100.0, 700.0)
                .build()?;
            let size = window.inner_size()?.to_logical::<f64>(window.scale_factor()?);
            window.add_child(
                WebviewBuilder::new("shell", WebviewUrl::App("index.html".into())),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, SHELL_H),
            )?;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(2));
                let (port, seen) = start_fixture();
                let c = route_c(&handle, port, &seen);
                let d = route_d(&handle, port, &seen);
                let out = json!({"fixture_port": port, "route_c": c, "route_d": d, "own_pid": std::process::id()});
                if let Some(p) = std::env::var_os("FERRUM_SPIKE_OUT") {
                    let _ = std::fs::write(p, serde_json::to_string_pretty(&out).unwrap());
                }
                eprintln!("[spike-s2] done");
                std::thread::sleep(Duration::from_secs(1));
                handle.exit(0);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running spike S2");
}
