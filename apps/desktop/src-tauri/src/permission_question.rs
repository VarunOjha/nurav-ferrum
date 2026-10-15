//! The permission question (P4 task p4.20, adr-0034; owner answer Q-227). A page's request for the camera, the
//! microphone, the location, notifications or the clipboard waits (WebView2 deferral) while the shell shows a bar
//! under the toolbar: "Allow this time", "Always allow on this site", "Never allow" or close (a private tab: "Allow this
//! time" or "Block"). The security engine decides first (`ferrum_security::Grants::decide`): granted, never, quiet,
//! insecure and other-site-frame requests are answered at once without a question.
//!
//! - "Allow this time" and private "Block" hold for the tab while it stays on that site: they end when the tab goes to
//!   another site, loads the same address again (a reload) or closes.
//! - "Always allow" and "Never allow" go into the settings file (`[[sites]] permissions` / `never`); close counts towards
//!   the quiet time (`[[sites]] closed`). A private tab saves nothing.
//! - A waiting request is refused when its tab starts loading another page (or the same one again), or closes.
//!
//! Only the shell may answer (`permission_answer`, capability `shell.json`); a page has no bridge (p2.3, p4.8 tests).
//! Every decision goes into the app log (`ferrum::policy`, kind, scheme and host, rule); every refusal also into the
//! security audit log (p4.9).

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use ferrum_core::address::site;
use ferrum_core::config::{ClosedQuestion, PermissionKind, QUIET_AFTER_CLOSES, QUIET_SECONDS};
use ferrum_core::profiles::site_key;
use ferrum_core::tabs::TabId;
use ferrum_security::{Grants, PermissionContext, PermissionVerdict};
use ferrum_webview_manager::tab::{PermissionAsk, PermissionReply};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use crate::content::{AppConfig, TabsState};

/// What one tab has been asked and answered.
#[derive(Debug, Default)]
struct TabQuestions {
    /// The site the tab's this-time answers belong to.
    site: String,
    /// The tab's page address at its last page load (loading it again is a reload).
    page: String,
    /// This-time answers: kind and whether it was allowed.
    once: Vec<(PermissionKind, bool)>,
    /// Requests that wait for the answer: request number and kind.
    waiting: Vec<(u64, PermissionKind)>,
    /// The site the waiting requests come from.
    asking: String,
}

/// The questions of every tab.
#[derive(Default)]
pub struct Questions(Mutex<HashMap<u64, TabQuestions>>);

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn log_answer(tab: u64, kind: &str, uri: &str, rule: &str, allowed: bool) {
    if allowed {
        tracing::info!(target: "ferrum::policy", tab, kind, site = %site(uri), rule, "permission granted");
    } else {
        tracing::info!(target: "ferrum::policy", tab, kind, site = %site(uri), rule, "permission denied");
        crate::audit::record(tab, &format!("permission-{kind}"), uri, rule);
    }
}

/// The permission filter of tab `id`'s view (UI thread): decides each request, and asks the user when nothing else
/// decides it.
pub fn filter(app: &AppHandle, id: u64) -> std::rc::Rc<dyn Fn(&PermissionAsk) -> PermissionReply> {
    let h = app.clone();
    std::rc::Rc::new(move |ask: &PermissionAsk| decide(&h, id, ask))
}

fn decide(app: &AppHandle, tab: u64, ask: &PermissionAsk) -> PermissionReply {
    let config = app.state::<AppConfig>().get();
    let (page, private) = {
        let t = app.state::<TabsState>();
        let t = t.0.lock().unwrap();
        match t.get(TabId(tab)) {
            Some(i) => (i.url.clone(), i.private),
            None => return PermissionReply::Deny,
        }
    };
    let kind = ask.kind.and_then(PermissionKind::from_name);
    let k = ask.kind.unwrap_or("unknown");
    let questions = app.state::<Questions>();
    let mut q = questions.0.lock().unwrap();
    let tq = q.entry(tab).or_default();
    let page_site = site_key(&page).unwrap_or_default();
    let once: &[(PermissionKind, bool)] = if tq.site == page_site { &tq.once } else { &[] };
    let d = Grants::from_sites(&config.sites).decide(
        &ask.uri,
        kind,
        &PermissionContext {
            page: &page,
            now: now(),
            once,
        },
    );
    match (d.verdict, kind) {
        (PermissionVerdict::Allow, _) => {
            log_answer(tab, k, &ask.uri, d.rule.as_str(), true);
            PermissionReply::Allow
        }
        (PermissionVerdict::Ask, Some(kind)) => {
            // Requests of another site still waiting (the page changed under them) are not mixed in: they were refused
            // when the tab started loading the new page.
            if tq.asking != page_site {
                tq.waiting.clear();
            }
            tq.asking = page_site.clone();
            tq.waiting.push((ask.id, kind));
            let kinds = waiting_kinds(tq);
            drop(q);
            tracing::info!(target: "ferrum::policy", tab, kind = k, site = %site(&ask.uri), rule = d.rule.as_str(), "permission asked");
            emit(
                app,
                json!({"kind": "permission-ask", "tab": tab, "site": page_site, "kinds": kinds, "private": private}),
            );
            PermissionReply::Wait
        }
        _ => {
            drop(q);
            log_answer(tab, k, &ask.uri, d.rule.as_str(), false);
            // The toolbar notes the refusal (p4.5; the shell says how to allow it).
            crate::external::blocked(app, tab, &ask.uri, &format!("permission:{k}"), false);
            PermissionReply::Deny
        }
    }
}

/// The kinds waiting in a tab, by settings name, each once, in the screen's order.
fn waiting_kinds(tq: &TabQuestions) -> Vec<&'static str> {
    PermissionKind::ASKED
        .into_iter()
        .filter(|k| tq.waiting.iter().any(|(_, w)| w == k))
        .map(PermissionKind::name)
        .collect()
}

fn emit(app: &AppHandle, payload: serde_json::Value) {
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = h.emit_to("shell", "link", payload);
    });
}

/// Refuses the waiting requests `ids` (on the UI thread, after the current WebView2 callback has returned).
fn refuse_later(app: &AppHandle, ids: Vec<u64>) {
    if ids.is_empty() {
        return;
    }
    let _ = app.run_on_main_thread(move || {
        for id in ids {
            ferrum_webview_manager::webview2::answer_permission(id, false);
        }
    });
}

/// Tab `tab` starts loading `uri` (its page, or a redirect hop; called from the navigation gate when the policy
/// allowed it): waiting requests are refused, and this-time answers end if the tab leaves their site or loads the same
/// address again.
pub fn on_page_load(app: &AppHandle, tab: u64, uri: &str) {
    let ids = {
        let questions = app.state::<Questions>();
        let mut q = questions.0.lock().unwrap();
        let Some(tq) = q.get_mut(&tab) else {
            q.insert(
                tab,
                TabQuestions {
                    page: uri.to_string(),
                    ..Default::default()
                },
            );
            return;
        };
        if uri == tq.page || site_key(uri).unwrap_or_default() != tq.site {
            tq.once.clear();
        }
        tq.page = uri.to_string();
        let ids: Vec<u64> = tq.waiting.drain(..).map(|(id, _)| id).collect();
        ids
    };
    if !ids.is_empty() {
        tracing::info!(target: "ferrum::policy", tab, count = ids.len(), rule = "permission-page-left", "waiting permission requests refused");
        crate::audit::record(tab, "permission-question", uri, "permission-page-left");
        emit(app, json!({"kind": "permission-done", "tab": tab}));
    }
    refuse_later(app, ids);
}

/// Tab `tab` closed: forget its answers (its view refuses its waiting requests when it closes).
pub fn on_tab_closed(app: &AppHandle, tab: u64) {
    app.state::<Questions>().0.lock().unwrap().remove(&tab);
}

/// Applies an answer to `site`'s entry in the settings (creates it if needed), for `kinds`.
fn remember(
    app: &AppHandle,
    site: &str,
    kinds: &[PermissionKind],
    answer: &str,
) -> Result<(), String> {
    let now = now();
    crate::settings::update_site(app, site, |s| {
        for &k in kinds {
            match answer {
                "always" => {
                    s.never.retain(|n| *n != k);
                    if !s.permissions.contains(&k) {
                        s.permissions.push(k);
                    }
                    s.closed.retain(|c| c.kind != k);
                }
                "never" => {
                    s.permissions.retain(|n| *n != k);
                    if !s.never.contains(&k) {
                        s.never.push(k);
                    }
                    s.closed.retain(|c| c.kind != k);
                }
                "close" => {
                    let c = match s.closed.iter().position(|c| c.kind == k) {
                        Some(i) => &mut s.closed[i],
                        None => {
                            s.closed.push(ClosedQuestion {
                                kind: k,
                                count: 0,
                                quiet_until: 0,
                            });
                            s.closed.last_mut().unwrap()
                        }
                    };
                    c.count += 1;
                    if c.count >= QUIET_AFTER_CLOSES {
                        c.count = 0;
                        c.quiet_until = now + QUIET_SECONDS;
                    }
                }
                // "Allow this time": an answer, so the closed questions start again from 0.
                _ => s.closed.retain(|c| c.kind != k || c.quiet_until > now),
            }
        }
    })
}

/// The user answered the question of tab `tab` in the shell: `once` (Allow this time), `always`, `never`, `close`, or
/// in a private tab `once` or `block`. Every waiting request of the tab gets the answer. Returns a note for the toolbar
/// when the answer could not be saved (it still applies now).
#[tauri::command]
pub fn permission_answer(
    app: AppHandle,
    tab: u64,
    answer: String,
) -> Result<Option<String>, String> {
    let private = crate::content::is_private(&app, tab);
    let allowed_answers: &[&str] = if private {
        &["once", "block"]
    } else {
        &["once", "always", "never", "close"]
    };
    if !allowed_answers.contains(&answer.as_str()) {
        return Err(format!("not an answer here: {answer}"));
    }
    let (site, waiting) = {
        let questions = app.state::<Questions>();
        let mut q = questions.0.lock().unwrap();
        let Some(tq) = q.get_mut(&tab) else {
            return Err("no question waits in this tab".into());
        };
        if tq.waiting.is_empty() {
            return Err("no question waits in this tab".into());
        }
        let waiting: Vec<(u64, PermissionKind)> = std::mem::take(&mut tq.waiting);
        let site = tq.asking.clone();
        if answer == "once" || answer == "block" {
            if tq.site != site {
                tq.once.clear();
                tq.site = site.clone();
            }
            for &(_, k) in &waiting {
                tq.once.retain(|(o, _)| *o != k);
                tq.once.push((k, answer == "once"));
            }
        }
        (site, waiting)
    };
    let allow = answer == "once" || answer == "always";
    let kinds: Vec<PermissionKind> = PermissionKind::ASKED
        .into_iter()
        .filter(|k| waiting.iter().any(|(_, w)| w == k))
        .collect();
    let rule = match answer.as_str() {
        "once" => "permission-allowed-once",
        "always" => "permission-granted",
        "never" => "permission-never",
        "block" => "permission-blocked-once",
        _ => "permission-closed",
    };
    let address = format!("https://{site}/");
    for k in &kinds {
        log_answer(tab, k.name(), &address, rule, allow);
    }
    let note = if private {
        None
    } else {
        remember(&app, &site, &kinds, &answer).err().map(|e| {
            tracing::warn!(target: "ferrum::config", error = %e, "permission answer not saved");
            format!("Not remembered: {e}")
        })
    };
    let ids = waiting.iter().map(|(id, _)| *id).collect::<Vec<_>>();
    let _ = app.run_on_main_thread(move || {
        for id in ids {
            ferrum_webview_manager::webview2::answer_permission(id, allow);
        }
    });
    emit(&app, json!({"kind": "permission-done", "tab": tab}));
    Ok(note)
}
