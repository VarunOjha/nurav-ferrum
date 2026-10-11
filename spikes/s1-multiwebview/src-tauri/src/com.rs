//! Raw WebView2 COM calls used by spike S1 for process attribution (risk-r05).
//!
//! `GetProcessInfos` (ICoreWebView2Environment8) lists the browser's processes with their kind;
//! `GetProcessExtendedInfos` (ICoreWebView2Environment13) adds which frames each renderer serves.

use std::sync::mpsc;
use std::time::Duration;

use serde_json::{Value, json};
use tauri::{AppHandle, Manager};
use webview2_com::GetProcessExtendedInfosCompletedHandler;
use webview2_com::Microsoft::Web::WebView2::Win32::*;
use windows::core::Interface;

fn kind_name(k: COREWEBVIEW2_PROCESS_KIND) -> &'static str {
    match k {
        COREWEBVIEW2_PROCESS_KIND_BROWSER => "browser",
        COREWEBVIEW2_PROCESS_KIND_RENDERER => "renderer",
        COREWEBVIEW2_PROCESS_KIND_UTILITY => "utility",
        COREWEBVIEW2_PROCESS_KIND_SANDBOX_HELPER => "sandbox-helper",
        COREWEBVIEW2_PROCESS_KIND_GPU => "gpu",
        COREWEBVIEW2_PROCESS_KIND_PPAPI_PLUGIN => "ppapi-plugin",
        COREWEBVIEW2_PROCESS_KIND_PPAPI_BROKER => "ppapi-broker",
        _ => "other",
    }
}

/// # Safety
/// `info` must be a live `ICoreWebView2ProcessInfo` obtained from WebView2 on the UI thread.
unsafe fn info_json(info: &ICoreWebView2ProcessInfo) -> windows::core::Result<Value> {
    let mut pid = 0i32;
    let mut kind = COREWEBVIEW2_PROCESS_KIND::default();
    unsafe {
        info.ProcessId(&mut pid)?;
        info.Kind(&mut kind)?;
    }
    Ok(json!({"pid": pid, "kind": kind_name(kind)}))
}

/// Runs on the UI thread inside `with_webview`.
///
/// # Safety
/// `env` is the live environment of a web view of this app, used only on the UI thread.
unsafe fn collect(env: ICoreWebView2Environment, tx: mpsc::Sender<(&'static str, Value)>) {
    // Synchronous list.
    let infos = (|| -> windows::core::Result<Value> {
        let env8: ICoreWebView2Environment8 = env.cast()?;
        let coll = unsafe { env8.GetProcessInfos()? };
        let mut n = 0u32;
        unsafe { coll.Count(&mut n)? };
        let mut out = Vec::new();
        for i in 0..n {
            let info = unsafe { coll.GetValueAtIndex(i)? };
            out.push(unsafe { info_json(&info)? });
        }
        Ok(json!(out))
    })();
    let _ = tx.send(("infos", infos.unwrap_or_else(|e| json!({"error": format!("{e}")}))));

    // Asynchronous extended list (frames per renderer). The handler runs later on the UI thread.
    let tx2 = tx.clone();
    let started = (|| -> windows::core::Result<()> {
        let env13: ICoreWebView2Environment13 = env.cast()?;
        let handler = GetProcessExtendedInfosCompletedHandler::create(Box::new(move |hr, coll| {
            let res = (|| -> windows::core::Result<Value> {
                hr?;
                let coll = coll.ok_or_else(|| windows::core::Error::from(windows::Win32::Foundation::E_POINTER))?;
                let mut n = 0u32;
                unsafe { coll.Count(&mut n)? };
                let mut out = Vec::new();
                for i in 0..n {
                    let ext = unsafe { coll.GetValueAtIndex(i)? };
                    let info = unsafe { ext.ProcessInfo()? };
                    let mut entry = unsafe { info_json(&info)? };
                    let frames = unsafe { ext.AssociatedFrameInfos()? };
                    let it = unsafe { frames.GetIterator()? };
                    let mut names = Vec::new();
                    let mut has = windows::core::BOOL::default();
                    unsafe { it.HasCurrent(&mut has)? };
                    while has.as_bool() {
                        let f = unsafe { it.GetCurrent()? };
                        let mut src = windows::core::PWSTR::null();
                        unsafe { f.Source(&mut src)? };
                        names.push(webview2_com::take_pwstr(src));
                        unsafe { it.MoveNext(&mut has)? };
                    }
                    entry["frames"] = json!(names);
                    out.push(entry);
                }
                Ok(json!(out))
            })();
            let _ = tx2.send(("extended", res.unwrap_or_else(|e| json!({"error": format!("{e}")}))));
            Ok(())
        }));
        unsafe { env13.GetProcessExtendedInfos(&handler)? };
        Ok(())
    })();
    if let Err(e) = started {
        let _ = tx.send(("extended", json!({"error": format!("{e}")})));
    }
}

/// Collects both process lists through the web view `label` (blocking the calling, non-UI thread).
pub fn process_infos(app: &AppHandle, label: &str) -> Value {
    let Some(wv) = app.get_webview(label) else { return json!({"error": "no such webview"}) };
    let (tx, rx) = mpsc::channel();
    let r = wv.with_webview(move |pw| {
        // SAFETY: with_webview runs this closure on the UI thread with the live environment.
        unsafe { collect(pw.environment(), tx) };
    });
    if let Err(e) = r {
        return json!({"error": e.to_string()});
    }
    let mut out = json!({});
    for _ in 0..2 {
        match rx.recv_timeout(Duration::from_secs(10)) {
            Ok((k, v)) => {
                if v.get("error").is_some() {
                    out[format!("{k}_error")] = v;
                } else {
                    out[k] = v;
                }
            }
            Err(_) => {
                out["timeout"] = json!(true);
                break;
            }
        }
    }
    out
}
