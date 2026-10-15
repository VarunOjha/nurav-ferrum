//! Ferrum's **only** raw WebView2 COM module (adr-0019). Everything here runs on the UI thread.
//!
//! Invariants (the integration page's COM-1 … COM-9; drafted from spike S3):
//! - **COM-1 UI thread.** Every call happens on the thread that owns the parent window (inside Tauri's
//!   `with_webview` / `run_on_main_thread`, or inside a WebView2 callback, which WebView2 delivers there too).
//!   [`ContentView`] holds COM pointers and is therefore `!Send`; callers keep it in a UI-thread `thread_local`.
//! - **COM-2 Never block** on an async completion; completions arrive as callbacks.
//! - **COM-3 Casts degrade gracefully**: a failed `cast` to a newer interface is reported, never unwrapped.
//! - **COM-4 Tokens and Close**: every `add_*` keeps its token; [`ContentView::close`] removes them all and closes the
//!   controller.
//! - **COM-5 No borrowed COM data outlives its callback**: `PWSTR`s are copied with `take_pwstr` (frees them once).
//! - **COM-7 Identical environment options**: the controller is created from Tauri's own environment, or (isolation
//!   mode `per-site-udf`, p4.15) from a site's environment on its own user data folder, which no other environment
//!   uses and which gets the same options as Tauri's ([`SHELL_BROWSER_ARGUMENTS`], language, no extensions).
//! - Handlers never call back into the same web view synchronously; they only copy plain data out.

#![allow(unsafe_code)]

use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{
    AcceleratorKeyPressedEventHandler, BrowserProcessExitedEventHandler,
    BytesReceivedChangedEventHandler, ClearBrowsingDataCompletedHandler,
    CoreWebView2EnvironmentOptions, CreateCoreWebView2ControllerCompletedHandler,
    CreateCoreWebView2EnvironmentCompletedHandler, DocumentTitleChangedEventHandler,
    DownloadStartingEventHandler, FaviconChangedEventHandler, FocusChangedEventHandler,
    GetFaviconCompletedHandler, GetProcessExtendedInfosCompletedHandler,
    HistoryChangedEventHandler, IsDefaultDownloadDialogOpenChangedEventHandler,
    LaunchingExternalUriSchemeEventHandler, NavigationCompletedEventHandler,
    NavigationStartingEventHandler, NewWindowRequestedEventHandler,
    PermissionRequestedEventHandler, ProcessFailedEventHandler, SourceChangedEventHandler,
    StateChangedEventHandler, take_pwstr,
};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::System::Com::IStream;
use windows_core::{BOOL, HSTRING, Interface, PCWSTR, PWSTR};

use crate::Error;
use crate::tab::{
    KeyDown, NavDecision, NavRequest, PermissionAsk, PermissionReply, ProcessFailure, TabEvent,
};

/// Receives tab events (UI thread).
pub type EventSink = Rc<dyn Fn(TabEvent)>;
/// Decides whether a navigation may start: the page's own (each redirect hop again) or a frame's (UI thread).
pub type NavGate = Rc<dyn Fn(&NavRequest) -> NavDecision>;
/// Decides whether a key pressed in the view is Ferrum's (true: handled, the page never sees it) (UI thread).
pub type KeyFilter = Rc<dyn Fn(KeyDown) -> bool>;

/// Decides a permission request: allow, deny, or wait for the user (UI thread).
pub type PermissionFilter = Rc<dyn Fn(&PermissionAsk) -> PermissionReply>;

/// A permission request that waits for the user's answer (p4.20): its event arguments, the deferral that holds it, and
/// the view it belongs to (the raw pointer of its `ICoreWebView2`, compared only, never used).
struct WaitingPermission {
    args: ICoreWebView2PermissionRequestedEventArgs,
    deferral: ICoreWebView2Deferral,
    view: usize,
}

thread_local! {
    /// The permission requests that wait for an answer, by number (UI thread only, COM-1).
    static WAITING: RefCell<HashMap<u64, WaitingPermission>> = RefCell::new(HashMap::new());
    /// The next permission request's number.
    static NEXT_PERMISSION: Cell<u64> = const { Cell::new(1) };
}

/// Answers a waiting permission request (p4.20): `allow` gives the page the permission, otherwise it is refused. False
/// when no request with that number waits (already answered, or its view closed).
pub fn answer_permission(id: u64, allow: bool) -> bool {
    let Some(w) = WAITING.with(|m| m.borrow_mut().remove(&id)) else {
        return false;
    };
    complete_permission(&w, allow);
    true
}

fn complete_permission(w: &WaitingPermission, allow: bool) {
    // SAFETY: COM-1: UI thread; the deferral is completed once (the entry was removed from WAITING first).
    unsafe {
        let _ = w.args.SetState(if allow {
            COREWEBVIEW2_PERMISSION_STATE_ALLOW
        } else {
            COREWEBVIEW2_PERMISSION_STATE_DENY
        });
        let _ = w.deferral.Complete();
    }
}

/// Chooses where a download is saved: given its address and WebView2's suggested path, the file to save to, or `None`
/// to refuse the download (UI thread).
pub type DownloadFilter = Rc<dyn Fn(&str, &str) -> Option<DownloadChoice>>;

/// Where a download goes, and whether WebView2's own download pop-up may show for it.
pub struct DownloadChoice {
    /// The full path to save to.
    pub path: String,
    /// Let WebView2's own download pop-up show (p4.18, owner answer: program files). SmartScreen holds an unknown or
    /// dangerous program until the user answers "Keep" or "Delete" there; with the pop-up hidden it waits for ever.
    pub own_dialog: bool,
}

/// What a tab view reports to, and asks of, the app.
pub struct Handlers {
    /// Chooses each download's file (p3.8).
    pub downloads: DownloadFilter,
    /// Receives the view's events.
    pub sink: EventSink,
    /// Decides each navigation of the page and of its frames, and each redirect hop.
    pub gate: NavGate,
    /// Takes Ferrum's keyboard shortcuts.
    pub keys: KeyFilter,
    /// Decides permission requests (p4.5).
    pub permissions: PermissionFilter,
}

fn hr<T>(r: windows_core::Result<T>) -> Result<T, Error> {
    r.map_err(|e| Error::Com {
        code: e.code().0 as u32,
        message: e.message(),
    })
}

#[derive(Clone, Copy)]
enum Ev {
    NavStarting,
    FrameNavStarting,
    Source,
    NavCompleted,
    History,
    Title,
    GotFocus,
    NewWindow,
    Permission,
    LaunchExternal,
    Accelerator,
    Download,
    DownloadDialog,
    Favicon,
    ProcessFailed,
}

/// The largest site icon passed on (bytes of PNG); a larger one is dropped (the tab shows no icon).
const MAX_ICON: usize = 256 * 1024;

/// One tab web view: a WebView2 controller Ferrum created (adr-0029). `!Send` by construction (COM-1).
pub struct ContentView {
    controller: ICoreWebView2Controller,
    core: ICoreWebView2,
    tokens: Vec<(Ev, i64)>,
}

impl ContentView {
    /// Starts creating a content view in `parent` (the Tauri window) from `env` (Tauri's environment), with its own
    /// WebView2 profile `profile`. `private` makes it an InPrivate view (p4.7: nothing it stores outlives the
    /// profile's last InPrivate view). `devtools` allows the developer tools (WebView2's default is on; Ferrum passes
    /// true only in debug builds, p2.12). `done` receives the view once WebView2 has created it.
    #[allow(clippy::too_many_arguments)]
    pub fn create(
        env: &ICoreWebView2Environment,
        parent: isize,
        bounds: RECT,
        profile: &str,
        private: bool,
        devtools: bool,
        handlers: Handlers,
        done: Box<dyn FnOnce(Result<ContentView, Error>)>,
    ) -> Result<(), Error> {
        let env10: ICoreWebView2Environment10 = hr(env.cast())?;
        // SAFETY: COM-1 (called on the UI thread by the caller's contract); `env10` is a live environment.
        let opts = hr(unsafe { env10.CreateCoreWebView2ControllerOptions() })?;
        // SAFETY: COM-1; `opts` is live; the HSTRING outlives the call.
        hr(unsafe { opts.SetProfileName(&HSTRING::from(profile)) })?;
        // SAFETY: COM-1; `opts` is live.
        hr(unsafe { opts.SetIsInPrivateModeEnabled(private) })?;
        let handler = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
            move |res, controller| {
                let built = (|| -> Result<ContentView, Error> {
                    hr(res)?;
                    let controller = controller.ok_or(Error::NoController)?;
                    // SAFETY: COM-1 (WebView2 delivers this completion on the UI thread); `controller` is live.
                    let core = hr(unsafe { controller.CoreWebView2() })?;
                    // SAFETY: COM-1; `core` is live. Set before the first navigation.
                    hr(unsafe {
                        core.Settings()
                            .and_then(|st| st.SetAreDevToolsEnabled(devtools))
                    })?;
                    let mut view = ContentView {
                        controller,
                        core,
                        tokens: Vec::new(),
                    };
                    view.register(handlers)?;
                    view.set_bounds(bounds)?;
                    // SAFETY: COM-1; live controller.
                    hr(unsafe { view.controller.SetIsVisible(true) })?;
                    Ok(view)
                })();
                done(built);
                Ok(())
            },
        ));
        // SAFETY: COM-1, COM-7; `parent` is the live Tauri window; the handler is kept alive by WebView2 until it fires.
        hr(unsafe {
            env10.CreateCoreWebView2ControllerWithOptions(HWND(parent as *mut _), &opts, &handler)
        })
    }

    fn register(&mut self, handlers: Handlers) -> Result<(), Error> {
        let Handlers {
            sink,
            gate,
            keys,
            downloads,
            permissions,
        } = handlers;
        let core = self.core.clone();

        let s = sink.clone();
        let g = gate.clone();
        let h = NavigationStartingEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut uri, mut id, mut user, mut redir) =
                    (PWSTR::null(), 0u64, BOOL(0), BOOL(0));
                // SAFETY: COM-1, COM-5: callback on the UI thread; out-pointers are locals; `uri` is copied and
                // freed by take_pwstr.
                let uri = unsafe {
                    let _ = args.Uri(&mut uri);
                    let _ = args.NavigationId(&mut id);
                    let _ = args.IsUserInitiated(&mut user);
                    let _ = args.IsRedirected(&mut redir);
                    take_pwstr(uri)
                };
                let decision = g(&NavRequest {
                    uri: uri.clone(),
                    user_initiated: user.as_bool(),
                    redirected: redir.as_bool(),
                    frame: false,
                });
                if decision == NavDecision::Cancel {
                    // SAFETY: COM-1; cancelling inside the NavigationStarting callback is the documented use.
                    let _ = unsafe { args.SetCancel(true) };
                }
                s(TabEvent::NavigationStarting {
                    id,
                    uri,
                    user_initiated: user.as_bool(),
                    redirected: redir.as_bool(),
                    allowed: decision == NavDecision::Allow,
                });
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4: token kept for removal in close().
        hr(unsafe { core.add_NavigationStarting(&h, &mut t) })?;
        self.tokens.push((Ev::NavStarting, t));

        // Frames (p4.3): every iframe navigation, and each of its redirect hops, passes the same gate. Without this
        // handler a blocked site could still load inside a frame of an allowed page.
        let s = sink.clone();
        let g = gate.clone();
        let h = NavigationStartingEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut uri, mut id, mut user, mut redir) =
                    (PWSTR::null(), 0u64, BOOL(0), BOOL(0));
                // SAFETY: COM-1, COM-5: callback on the UI thread; out-pointers are locals; `uri` is copied and
                // freed by take_pwstr.
                let uri = unsafe {
                    let _ = args.Uri(&mut uri);
                    let _ = args.NavigationId(&mut id);
                    let _ = args.IsUserInitiated(&mut user);
                    let _ = args.IsRedirected(&mut redir);
                    take_pwstr(uri)
                };
                let decision = g(&NavRequest {
                    uri: uri.clone(),
                    user_initiated: user.as_bool(),
                    redirected: redir.as_bool(),
                    frame: true,
                });
                if decision == NavDecision::Cancel {
                    // SAFETY: COM-1; cancelling inside the FrameNavigationStarting callback is the documented use.
                    let _ = unsafe { args.SetCancel(true) };
                }
                s(TabEvent::FrameNavigationStarting {
                    id,
                    uri,
                    redirected: redir.as_bool(),
                    allowed: decision == NavDecision::Allow,
                });
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4: token kept for removal in close().
        hr(unsafe { core.add_FrameNavigationStarting(&h, &mut t) })?;
        self.tokens.push((Ev::FrameNavStarting, t));

        let s = sink.clone();
        let c = core.clone();
        let h = SourceChangedEventHandler::create(Box::new(move |_sender, _args| {
            let mut uri = PWSTR::null();
            // SAFETY: COM-1, COM-5: UI-thread callback; `uri` copied and freed by take_pwstr.
            let uri = unsafe {
                let _ = c.Source(&mut uri);
                take_pwstr(uri)
            };
            s(TabEvent::SourceChanged { uri });
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_SourceChanged(&h, &mut t) })?;
        self.tokens.push((Ev::Source, t));

        let s = sink.clone();
        let c = core.clone();
        let h = NavigationCompletedEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut ok, mut id, mut web) =
                    (BOOL(0), 0u64, COREWEBVIEW2_WEB_ERROR_STATUS::default());
                let mut status = 0i32;
                // SAFETY: COM-1; out-pointers are locals; the Args2 cast degrades to "no status" (COM-3).
                unsafe {
                    let _ = args.IsSuccess(&mut ok);
                    let _ = args.NavigationId(&mut id);
                    let _ = args.WebErrorStatus(&mut web);
                    if let Ok(a2) = args.cast::<ICoreWebView2NavigationCompletedEventArgs2>() {
                        let _ = a2.HttpStatusCode(&mut status);
                    }
                }
                let mut src = PWSTR::null();
                // SAFETY: COM-1, COM-5: the view's current address, copied and freed by take_pwstr.
                let uri = unsafe {
                    let _ = c.Source(&mut src);
                    take_pwstr(src)
                };
                s(TabEvent::NavigationCompleted {
                    id,
                    uri,
                    success: ok.as_bool(),
                    http_status: status,
                    web_error_status: web.0,
                });
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_NavigationCompleted(&h, &mut t) })?;
        self.tokens.push((Ev::NavCompleted, t));

        let s = sink.clone();
        let c = core.clone();
        let h = HistoryChangedEventHandler::create(Box::new(move |_sender, _args| {
            let (mut back, mut fwd) = (BOOL(0), BOOL(0));
            // SAFETY: COM-1; out-pointers are locals.
            unsafe {
                let _ = c.CanGoBack(&mut back);
                let _ = c.CanGoForward(&mut fwd);
            }
            s(TabEvent::HistoryChanged {
                can_go_back: back.as_bool(),
                can_go_forward: fwd.as_bool(),
            });
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_HistoryChanged(&h, &mut t) })?;
        self.tokens.push((Ev::History, t));

        let s = sink.clone();
        let c = core.clone();
        let h = DocumentTitleChangedEventHandler::create(Box::new(move |_sender, _args| {
            let mut title = PWSTR::null();
            // SAFETY: COM-1, COM-5: copied and freed by take_pwstr.
            let title = unsafe {
                let _ = c.DocumentTitle(&mut title);
                take_pwstr(title)
            };
            s(TabEvent::TitleChanged { title });
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_DocumentTitleChanged(&h, &mut t) })?;
        self.tokens.push((Ev::Title, t));

        let s = sink.clone();
        let h = NewWindowRequestedEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut uri, mut user) = (PWSTR::null(), BOOL(0));
                // SAFETY: COM-1, COM-5: out-pointers are locals; `uri` copied and freed by take_pwstr. Handled =
                // true with no NewWindow set means WebView2 opens no window: Ferrum decides (p2.10).
                let uri = unsafe {
                    let _ = args.Uri(&mut uri);
                    let _ = args.IsUserInitiated(&mut user);
                    let _ = args.SetHandled(true);
                    take_pwstr(uri)
                };
                s(TabEvent::NewWindowRequested {
                    uri,
                    user_initiated: user.as_bool(),
                });
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_NewWindowRequested(&h, &mut t) })?;
        self.tokens.push((Ev::NewWindow, t));

        // Permissions (p4.5): every request (camera, location, notifications, ...) is decided by the app; WebView2 shows
        // no prompt of its own and, where the runtime supports it (Args3), keeps no answer in the profile, so a grant
        // removed in settings takes effect at the next request. p4.20: a request the user is asked about is held with a
        // deferral until `answer_permission` (or the view closes, which refuses it).
        let s = sink.clone();
        let view_key = core.as_raw() as usize;
        let h = PermissionRequestedEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut uri, mut kind, mut user) = (
                    PWSTR::null(),
                    COREWEBVIEW2_PERMISSION_KIND::default(),
                    BOOL(0),
                );
                // SAFETY: COM-1, COM-5: UI-thread callback; out-pointers are locals; `uri` copied and freed by take_pwstr.
                let uri = unsafe {
                    let _ = args.Uri(&mut uri);
                    let _ = args.PermissionKind(&mut kind);
                    let _ = args.IsUserInitiated(&mut user);
                    take_pwstr(uri)
                };
                let name = permission_name(kind);
                let id = NEXT_PERMISSION.with(|n| {
                    let id = n.get();
                    n.set(id + 1);
                    id
                });
                let reply = permissions(&PermissionAsk {
                    id,
                    uri: uri.clone(),
                    kind: name,
                    user_initiated: user.as_bool(),
                });
                // SAFETY: COM-1; setting the state inside the callback is the documented use; the Args3 cast degrades
                // to "saved by WebView2's default" (COM-3).
                unsafe {
                    if let Ok(a3) = args.cast::<ICoreWebView2PermissionRequestedEventArgs3>() {
                        let _ = a3.SetSavesInProfile(false);
                    }
                }
                let waiting = match reply {
                    // SAFETY: COM-1: the deferral is taken inside the callback (the documented use); it is completed
                    // later on the UI thread by answer_permission or close.
                    PermissionReply::Wait => match unsafe { args.GetDeferral() } {
                        Ok(deferral) => {
                            WAITING.with(|m| {
                                m.borrow_mut().insert(
                                    id,
                                    WaitingPermission {
                                        args: args.clone(),
                                        deferral,
                                        view: view_key,
                                    },
                                )
                            });
                            true
                        }
                        // No deferral: the request cannot wait, so it is refused (never allowed by default).
                        Err(_) => {
                            // SAFETY: COM-1.
                            let _ = unsafe { args.SetState(COREWEBVIEW2_PERMISSION_STATE_DENY) };
                            false
                        }
                    },
                    PermissionReply::Allow | PermissionReply::Deny => {
                        let state = if reply == PermissionReply::Allow {
                            COREWEBVIEW2_PERMISSION_STATE_ALLOW
                        } else {
                            COREWEBVIEW2_PERMISSION_STATE_DENY
                        };
                        // SAFETY: COM-1.
                        let _ = unsafe { args.SetState(state) };
                        false
                    }
                };
                s(TabEvent::PermissionRequested {
                    uri,
                    kind: name.unwrap_or("unknown").to_string(),
                    allowed: reply == PermissionReply::Allow,
                    waiting,
                });
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4: token kept for close().
        hr(unsafe { core.add_PermissionRequested(&h, &mut t) })?;
        self.tokens.push((Ev::Permission, t));

        // Safety net for links to other apps that do not pass the navigation gate (for example from a frame):
        // WebView2 never launches them itself; Ferrum reports them and asks the user (p2.10).
        if let Ok(core18) = core.cast::<ICoreWebView2_18>() {
            let s = sink.clone();
            let h =
                LaunchingExternalUriSchemeEventHandler::create(Box::new(move |_sender, args| {
                    if let Some(args) = args {
                        let (mut uri, mut user) = (PWSTR::null(), BOOL(0));
                        // SAFETY: COM-1, COM-5: out-pointers are locals; `uri` copied and freed by take_pwstr.
                        let uri = unsafe {
                            let _ = args.Uri(&mut uri);
                            let _ = args.IsUserInitiated(&mut user);
                            let _ = args.SetCancel(true);
                            take_pwstr(uri)
                        };
                        s(TabEvent::ExternalSchemeRequested {
                            uri,
                            user_initiated: user.as_bool(),
                        });
                    }
                    Ok(())
                }));
            let mut t = 0i64;
            // SAFETY: COM-1, COM-4.
            hr(unsafe { core18.add_LaunchingExternalUriScheme(&h, &mut t) })?;
            self.tokens.push((Ev::LaunchExternal, t));
        }

        // Keyboard shortcuts while the page has focus (p3.3): WebView2 asks the host before the page sees an
        // accelerator key; a key Ferrum takes is marked handled and never reaches the page. Nothing is injected into
        // the page, so it gains no way to reach the app.
        let h = AcceleratorKeyPressedEventHandler::create(Box::new(move |_sender, args| {
            if let Some(args) = args {
                let (mut kind, mut vk) = (COREWEBVIEW2_KEY_EVENT_KIND::default(), 0u32);
                let mut status = COREWEBVIEW2_PHYSICAL_KEY_STATUS::default();
                // SAFETY: COM-1, UI-thread callback; out-pointers are locals.
                unsafe {
                    let _ = args.KeyEventKind(&mut kind);
                    let _ = args.VirtualKey(&mut vk);
                    let _ = args.PhysicalKeyStatus(&mut status);
                }
                if kind == COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN
                    || kind == COREWEBVIEW2_KEY_EVENT_KIND_SYSTEM_KEY_DOWN
                {
                    let key = KeyDown {
                        vk,
                        ctrl: key_held(0x11),
                        shift: key_held(0x10),
                        alt: status.IsMenuKeyDown.as_bool(),
                        repeat: status.WasKeyDown.as_bool(),
                    };
                    if keys(key) {
                        // SAFETY: COM-1; marking the key handled inside its callback is the documented use.
                        let _ = unsafe { args.SetHandled(true) };
                    }
                }
            }
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4: AcceleratorKeyPressed lives on the controller; token kept for close().
        hr(unsafe { self.controller.add_AcceleratorKeyPressed(&h, &mut t) })?;
        self.tokens.push((Ev::Accelerator, t));

        // Downloads (p3.8): the app chooses the file; WebView2's own download pop-up is not shown (Handled); progress
        // and the end are reported as tab events. The operation is kept (with its handler tokens) in `DOWNLOADS`
        // until it finishes, so it outlives a tab that closes meanwhile.
        if let Ok(core4) = core.cast::<ICoreWebView2_4>() {
            let s = sink.clone();
            let h = DownloadStartingEventHandler::create(Box::new(move |_sender, args| {
                if let Some(args) = args {
                    start_download(&args, &s, &downloads);
                }
                Ok(())
            }));
            let mut t = 0i64;
            // SAFETY: COM-1, COM-4: token kept for close().
            hr(unsafe { core4.add_DownloadStarting(&h, &mut t) })?;
            self.tokens.push((Ev::Download, t));
        }
        // WebView2's own download pop-up, shown for program files (p4.18): its opening and closing are reported, so
        // the app can log them (SmartScreen's "Keep or delete?" question is asked there).
        if let Ok(core9) = core.cast::<ICoreWebView2_9>() {
            let s = sink.clone();
            let h = IsDefaultDownloadDialogOpenChangedEventHandler::create(Box::new(
                move |sender, _args| {
                    let mut open = BOOL::default();
                    if let Some(c9) = sender.and_then(|c| c.cast::<ICoreWebView2_9>().ok()) {
                        // SAFETY: COM-1; the out-pointer is a local.
                        let _ = unsafe { c9.IsDefaultDownloadDialogOpen(&mut open) };
                    }
                    s(TabEvent::DownloadDialog {
                        open: open.as_bool(),
                    });
                    Ok(())
                },
            ));
            let mut t = 0i64;
            // SAFETY: COM-1, COM-4: token kept for close().
            hr(unsafe { core9.add_IsDefaultDownloadDialogOpenChanged(&h, &mut t) })?;
            self.tokens.push((Ev::DownloadDialog, t));
        }

        // Site icons (p3.16): when the page's icon changes, WebView2 hands over the icon it already loaded, as PNG (no
        // extra request). The icon arrives in a completion callback (COM-2); an empty one means the page has none.
        if let Ok(core15) = core.cast::<ICoreWebView2_15>() {
            let s = sink.clone();
            let c = core15.clone();
            let h = FaviconChangedEventHandler::create(Box::new(move |_sender, _args| {
                let s = s.clone();
                let done = GetFaviconCompletedHandler::create(Box::new(move |res, stream| {
                    let png = match (res, stream) {
                        (Ok(()), Some(stream)) => read_stream(&stream, MAX_ICON),
                        _ => Vec::new(),
                    };
                    s(TabEvent::FaviconChanged { png });
                    Ok(())
                }));
                // SAFETY: COM-1, COM-2: UI-thread callback; the icon arrives in `done`, nothing waits for it.
                let _ = unsafe { c.GetFavicon(COREWEBVIEW2_FAVICON_IMAGE_FORMAT_PNG, &done) };
                Ok(())
            }));
            let mut t = 0i64;
            // SAFETY: COM-1, COM-4: token kept for close().
            hr(unsafe { core15.add_FaviconChanged(&h, &mut t) })?;
            self.tokens.push((Ev::Favicon, t));
        }

        // p4.10: a failed process is reported with its kind, WebView2's reason and the exit code (spike S3).
        let s = sink.clone();
        let h = ProcessFailedEventHandler::create(Box::new(move |_sender, args| {
            let Some(args) = args else { return Ok(()) };
            let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
            // SAFETY: COM-1, COM-3; out-pointers are locals; the newer arguments interface is optional.
            let (reason, exit_code) = unsafe {
                let _ = args.ProcessFailedKind(&mut kind);
                match args.cast::<ICoreWebView2ProcessFailedEventArgs2>() {
                    Ok(a2) => {
                        let mut reason = COREWEBVIEW2_PROCESS_FAILED_REASON::default();
                        let mut code = 0i32;
                        let _ = a2.Reason(&mut reason);
                        let _ = a2.ExitCode(&mut code);
                        (reason.0, code)
                    }
                    Err(_) => (0, 0),
                }
            };
            s(TabEvent::ProcessFailed {
                failure: process_failure(kind),
                reason,
                exit_code,
            });
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4.
        hr(unsafe { core.add_ProcessFailed(&h, &mut t) })?;
        self.tokens.push((Ev::ProcessFailed, t));

        let s = sink;
        let h = FocusChangedEventHandler::create(Box::new(move |_sender, _args| {
            s(TabEvent::GotFocus);
            Ok(())
        }));
        let mut t = 0i64;
        // SAFETY: COM-1, COM-4: GotFocus lives on the controller.
        hr(unsafe { self.controller.add_GotFocus(&h, &mut t) })?;
        self.tokens.push((Ev::GotFocus, t));
        Ok(())
    }

    /// Navigates to an absolute address (already normalised by `ferrum_core::address`).
    pub fn navigate(&self, url: &str) -> Result<(), Error> {
        // SAFETY: COM-1; the HSTRING outlives the call.
        hr(unsafe { self.core.Navigate(&HSTRING::from(url)) })
    }

    /// Back one entry (adr-0030).
    pub fn go_back(&self) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.core.GoBack() })
    }

    /// Forward one entry (adr-0030).
    pub fn go_forward(&self) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.core.GoForward() })
    }

    /// Reloads the page.
    pub fn reload(&self) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.core.Reload() })
    }

    /// Stops loading.
    pub fn stop(&self) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.core.Stop() })
    }

    /// Places the view (physical pixels, relative to the parent window's client area).
    pub fn set_bounds(&self, bounds: RECT) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.controller.SetBounds(bounds) })
    }

    /// Shows or hides the view.
    pub fn set_visible(&self, visible: bool) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe { self.controller.SetIsVisible(visible) })
    }

    /// Whether the view is shown (`IsVisible`).
    pub fn is_visible(&self) -> Result<bool, Error> {
        let mut v = BOOL(0);
        // SAFETY: COM-1; the out-pointer is a local.
        hr(unsafe { self.controller.IsVisible(&mut v) })?;
        Ok(v.as_bool())
    }

    /// Gives the page keyboard focus (used when the window becomes active again; S1 Alt+Tab issue).
    pub fn focus(&self) -> Result<(), Error> {
        // SAFETY: COM-1.
        hr(unsafe {
            self.controller
                .MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC)
        })
    }

    /// Whether the developer tools are allowed in this view (p2.12).
    pub fn devtools_enabled(&self) -> Result<bool, Error> {
        controller_devtools_enabled(&self.controller)
    }

    /// The current address.
    pub fn source(&self) -> String {
        let mut uri = PWSTR::null();
        // SAFETY: COM-1, COM-5.
        unsafe {
            let _ = self.core.Source(&mut uri);
            take_pwstr(uri)
        }
    }

    /// Removes every event handler and closes the controller (COM-4). The view is unusable afterwards. Permission
    /// requests of this view that still wait are refused first (p4.20).
    pub fn close(self) {
        let key = self.core.as_raw() as usize;
        let waiting: Vec<WaitingPermission> = WAITING.with(|m| {
            let mut m = m.borrow_mut();
            let ids: Vec<u64> = m
                .iter()
                .filter(|(_, w)| w.view == key)
                .map(|(id, _)| *id)
                .collect();
            ids.into_iter().filter_map(|id| m.remove(&id)).collect()
        });
        for w in &waiting {
            complete_permission(w, false);
        }
        for (ev, t) in &self.tokens {
            // SAFETY: COM-1, COM-4: each token came from the matching add_* call on this view.
            unsafe {
                let _ = match ev {
                    Ev::NavStarting => self.core.remove_NavigationStarting(*t),
                    Ev::FrameNavStarting => self.core.remove_FrameNavigationStarting(*t),
                    Ev::Source => self.core.remove_SourceChanged(*t),
                    Ev::NavCompleted => self.core.remove_NavigationCompleted(*t),
                    Ev::History => self.core.remove_HistoryChanged(*t),
                    Ev::Title => self.core.remove_DocumentTitleChanged(*t),
                    Ev::GotFocus => self.controller.remove_GotFocus(*t),
                    Ev::Accelerator => self.controller.remove_AcceleratorKeyPressed(*t),
                    Ev::Download => match self.core.cast::<ICoreWebView2_4>() {
                        Ok(c4) => c4.remove_DownloadStarting(*t),
                        Err(e) => Err(e),
                    },
                    Ev::DownloadDialog => match self.core.cast::<ICoreWebView2_9>() {
                        Ok(c9) => c9.remove_IsDefaultDownloadDialogOpenChanged(*t),
                        Err(e) => Err(e),
                    },
                    Ev::Favicon => match self.core.cast::<ICoreWebView2_15>() {
                        Ok(c15) => c15.remove_FaviconChanged(*t),
                        Err(e) => Err(e),
                    },
                    Ev::NewWindow => self.core.remove_NewWindowRequested(*t),
                    Ev::ProcessFailed => self.core.remove_ProcessFailed(*t),
                    Ev::Permission => self.core.remove_PermissionRequested(*t),
                    Ev::LaunchExternal => match self.core.cast::<ICoreWebView2_18>() {
                        Ok(c18) => c18.remove_LaunchingExternalUriScheme(*t),
                        Err(e) => Err(e),
                    },
                };
            }
        }
        // SAFETY: COM-1, COM-4.
        let _ = unsafe { self.controller.Close() };
    }
}

/// Ferrum's name for a WebView2 process failure kind (p4.10).
fn process_failure(kind: COREWEBVIEW2_PROCESS_FAILED_KIND) -> ProcessFailure {
    match kind {
        COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED => ProcessFailure::BrowserExited,
        COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED => ProcessFailure::RendererExited,
        COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE => {
            ProcessFailure::RendererUnresponsive
        }
        COREWEBVIEW2_PROCESS_FAILED_KIND_FRAME_RENDER_PROCESS_EXITED => {
            ProcessFailure::FrameRendererExited
        }
        other => ProcessFailure::Other(other.0),
    }
}

/// Calls `exited(failed)` when the browser process of `env` has ended and released everything (p4.10;
/// ICoreWebView2Environment5 `BrowserProcessExited`): `failed` is true for a crash, false for a normal shutdown. Every
/// view of the environment (the shell's too) is unusable afterwards. The handler stays registered for the life of the
/// environment (it is the app's for its whole run), so its token is not kept.
pub fn watch_browser_exit(
    env: &ICoreWebView2Environment,
    exited: Box<dyn Fn(bool)>,
) -> Result<(), Error> {
    let env5: ICoreWebView2Environment5 = hr(env.cast())?;
    let h = BrowserProcessExitedEventHandler::create(Box::new(move |_sender, args| {
        let mut kind = COREWEBVIEW2_BROWSER_PROCESS_EXIT_KIND::default();
        if let Some(args) = args {
            // SAFETY: COM-1; the out-pointer is a local.
            let _ = unsafe { args.BrowserProcessExitKind(&mut kind) };
        }
        exited(kind == COREWEBVIEW2_BROWSER_PROCESS_EXIT_KIND_FAILED);
        Ok(())
    }));
    let mut t = 0i64;
    // SAFETY: COM-1; `env5` is live; the handler is kept alive by WebView2 while registered.
    hr(unsafe { env5.add_BrowserProcessExited(&h, &mut t) })
}

/// The settings name of a WebView2 permission kind (the names of `ferrum_core::config::PermissionKind`); `None` for a
/// kind this version does not know.
fn permission_name(kind: COREWEBVIEW2_PERMISSION_KIND) -> Option<&'static str> {
    Some(match kind {
        COREWEBVIEW2_PERMISSION_KIND_CAMERA => "camera",
        COREWEBVIEW2_PERMISSION_KIND_MICROPHONE => "microphone",
        COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION => "geolocation",
        COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS => "notifications",
        COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ => "clipboard-read",
        COREWEBVIEW2_PERMISSION_KIND_OTHER_SENSORS => "other-sensors",
        COREWEBVIEW2_PERMISSION_KIND_MULTIPLE_AUTOMATIC_DOWNLOADS => "multiple-automatic-downloads",
        COREWEBVIEW2_PERMISSION_KIND_FILE_READ_WRITE => "file-read-write",
        COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY => "autoplay",
        COREWEBVIEW2_PERMISSION_KIND_LOCAL_FONTS => "local-fonts",
        COREWEBVIEW2_PERMISSION_KIND_MIDI_SYSTEM_EXCLUSIVE_MESSAGES => {
            "midi-system-exclusive-messages"
        }
        COREWEBVIEW2_PERMISSION_KIND_WINDOW_MANAGEMENT => "window-management",
        _ => return None,
    })
}

/// Deletes everything WebView2 stores for profile `profile` (cookies, storage, cache, history, permissions: its
/// `ClearBrowsingDataAll`), leaving every other profile alone (p4.7). WebView2 reaches a profile only through a view,
/// so a hidden helper view in that profile is created in `parent`, used and closed. `done` gets the result (UI
/// thread); if WebView2 refuses the call itself, `done` gets that error at once.
pub fn clear_profile(
    env: &ICoreWebView2Environment,
    parent: isize,
    profile: &str,
    done: Box<dyn FnOnce(Result<(), Error>)>,
) -> Result<(), Error> {
    let env10: ICoreWebView2Environment10 = hr(env.cast())?;
    // SAFETY: COM-1 (caller's contract); `env10` is live.
    let opts = hr(unsafe { env10.CreateCoreWebView2ControllerOptions() })?;
    // SAFETY: COM-1; `opts` is live; the HSTRING outlives the call.
    hr(unsafe { opts.SetProfileName(&HSTRING::from(profile)) })?;
    let done = Rc::new(RefCell::new(Some(done)));
    let finish = move |r: Result<(), Error>| {
        if let Some(d) = done.borrow_mut().take() {
            d(r);
        }
    };
    let handler =
        CreateCoreWebView2ControllerCompletedHandler::create(Box::new(move |res, controller| {
            let controller = match hr(res).and_then(|()| controller.ok_or(Error::NoController)) {
                Ok(c) => c,
                Err(e) => {
                    finish(Err(e));
                    return Ok(());
                }
            };
            // SAFETY: COM-1 (completion on the UI thread); `controller` is live; the helper view stays hidden.
            let _ = unsafe { controller.SetIsVisible(false) };
            let profile2 = (|| -> Result<ICoreWebView2Profile2, Error> {
                // SAFETY: COM-1; `controller` is live; casts degrade to an error (COM-3).
                let core = hr(unsafe { controller.CoreWebView2() })?;
                let core13: ICoreWebView2_13 = hr(core.cast())?;
                // SAFETY: COM-1; `core13` is live.
                let profile = hr(unsafe { core13.Profile() })?;
                hr(profile.cast())
            })();
            let c = controller.clone();
            let f = finish.clone();
            let cleared = ClearBrowsingDataCompletedHandler::create(Box::new(move |res| {
                // SAFETY: COM-1, COM-4: the helper view registered no handlers; it is no longer needed.
                let _ = unsafe { c.Close() };
                f(hr(res));
                Ok(())
            }));
            // SAFETY: COM-1, COM-2: the result arrives in `cleared`; nothing waits for it.
            let started = profile2.and_then(|p| hr(unsafe { p.ClearBrowsingDataAll(&cleared) }));
            if let Err(e) = started {
                // SAFETY: COM-1, COM-4.
                let _ = unsafe { controller.Close() };
                finish(Err(e));
            }
            Ok(())
        }));
    // SAFETY: COM-1, COM-7; `parent` is the live Tauri window; the handler is kept alive by WebView2 until it fires.
    hr(unsafe {
        env10.CreateCoreWebView2ControllerWithOptions(HWND(parent as *mut _), &opts, &handler)
    })
}

/// One WebView2 process as `GetProcessExtendedInfos` reports it (p4.7 process inspection).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessEntry {
    /// The process id.
    pub pid: i32,
    /// `browser`, `renderer`, `utility`, `sandbox-helper`, `gpu`, `ppapi-plugin`, `ppapi-broker` or `unknown`.
    pub kind: &'static str,
    /// The addresses of the frames this process renders (renderers only).
    pub frames: Vec<String>,
}

/// Lists the processes of `env`'s browser with the frames each renderer hosts (`ICoreWebView2Environment13`). `done`
/// gets the list (UI thread).
pub fn process_inventory(
    env: &ICoreWebView2Environment,
    done: Box<dyn FnOnce(Result<Vec<ProcessEntry>, Error>)>,
) -> Result<(), Error> {
    let env13: ICoreWebView2Environment13 = hr(env.cast())?;
    let handler = GetProcessExtendedInfosCompletedHandler::create(Box::new(move |res, list| {
        done(hr(res).and_then(|()| read_processes(list)));
        Ok(())
    }));
    // SAFETY: COM-1, COM-2: the list arrives in `handler`.
    hr(unsafe { env13.GetProcessExtendedInfos(&handler) })
}

fn read_processes(
    list: Option<ICoreWebView2ProcessExtendedInfoCollection>,
) -> Result<Vec<ProcessEntry>, Error> {
    let list = list.ok_or(Error::NoController)?;
    let mut n = 0u32;
    // SAFETY: COM-1 (inside the completion, on the UI thread); the out-pointer is a local.
    hr(unsafe { list.Count(&mut n) })?;
    let mut out = Vec::new();
    for i in 0..n {
        // SAFETY: COM-1; `i` is below Count.
        let ext = hr(unsafe { list.GetValueAtIndex(i) })?;
        // SAFETY: COM-1; `ext` is live.
        let info = hr(unsafe { ext.ProcessInfo() })?;
        let (mut pid, mut kind) = (0i32, COREWEBVIEW2_PROCESS_KIND::default());
        // SAFETY: COM-1; out-pointers are locals.
        unsafe {
            let _ = info.ProcessId(&mut pid);
            let _ = info.Kind(&mut kind);
        }
        let mut frames = Vec::new();
        // The collection stays alive while its iterator is used. Observed in p4.7: releasing it first and then using the
        // iterator ended the whole process (the iterator does not keep its collection alive).
        // SAFETY: COM-1; `ext` is live.
        let infos = unsafe { ext.AssociatedFrameInfos() };
        let iter = infos.as_ref().map_err(Clone::clone).and_then(|fi| {
            // SAFETY: COM-1; `fi` is live and outlives the iterator (`infos` is dropped after the loop).
            unsafe { fi.GetIterator() }
        });
        if let Ok(it) = iter {
            // At most 1000 frames per process: a bound in case the iterator never ends.
            for _ in 0..1000 {
                let mut has = BOOL(0);
                // SAFETY: COM-1; the out-pointer is a local.
                if unsafe { it.HasCurrent(&mut has) }.is_err() || !has.as_bool() {
                    break;
                }
                // SAFETY: COM-1; `HasCurrent` said there is a current item; `take_pwstr` copies and frees the address
                // (COM-5).
                if let Ok(f) = unsafe { it.GetCurrent() } {
                    let mut src = PWSTR::null();
                    // SAFETY: COM-1, COM-5: `f` is live; the address is copied and freed by take_pwstr.
                    let src = unsafe {
                        let _ = f.Source(&mut src);
                        take_pwstr(src)
                    };
                    frames.push(src);
                }
                // SAFETY: COM-1; the out-pointer is a local.
                if unsafe { it.MoveNext(&mut has) }.is_err() {
                    break;
                }
            }
        }
        out.push(ProcessEntry {
            pid,
            kind: process_kind_name(kind),
            frames,
        });
    }
    Ok(out)
}

fn process_kind_name(kind: COREWEBVIEW2_PROCESS_KIND) -> &'static str {
    match kind {
        COREWEBVIEW2_PROCESS_KIND_BROWSER => "browser",
        COREWEBVIEW2_PROCESS_KIND_RENDERER => "renderer",
        COREWEBVIEW2_PROCESS_KIND_UTILITY => "utility",
        COREWEBVIEW2_PROCESS_KIND_SANDBOX_HELPER => "sandbox-helper",
        COREWEBVIEW2_PROCESS_KIND_GPU => "gpu",
        COREWEBVIEW2_PROCESS_KIND_PPAPI_PLUGIN => "ppapi-plugin",
        COREWEBVIEW2_PROCESS_KIND_PPAPI_BROKER => "ppapi-broker",
        _ => "unknown",
    }
}

/// Reads a whole COM stream from where it stands; nothing when reading fails or it holds more than `max` bytes.
fn read_stream(stream: &IStream, max: usize) -> Vec<u8> {
    let mut out = Vec::new();
    let mut buf = [0u8; 8192];
    loop {
        let mut n = 0u32;
        // SAFETY: COM-1; `buf` and `n` are locals that outlive the call, and Read writes at most `buf.len()` bytes.
        let r = unsafe { stream.Read(buf.as_mut_ptr().cast(), buf.len() as u32, Some(&mut n)) };
        if r.is_err() {
            return Vec::new();
        }
        if n == 0 {
            return out;
        }
        out.extend_from_slice(&buf[..n as usize]);
        if out.len() > max {
            return Vec::new();
        }
    }
}

/// UI thread, inside `DownloadStarting`: asks the app for the file, then follows the download.
fn start_download(
    args: &ICoreWebView2DownloadStartingEventArgs,
    sink: &EventSink,
    choose: &DownloadFilter,
) {
    // SAFETY: COM-1, UI-thread callback; `args` is live for the callback.
    let Ok(op) = (unsafe { args.DownloadOperation() }) else {
        return;
    };
    let (mut uri, mut suggested, mut total) = (PWSTR::null(), PWSTR::null(), 0i64);
    // SAFETY: COM-1, COM-5: out-pointers are locals; strings copied and freed by take_pwstr.
    let (uri, suggested) = unsafe {
        let _ = op.Uri(&mut uri);
        let _ = op.TotalBytesToReceive(&mut total);
        let _ = args.ResultFilePath(&mut suggested);
        (take_pwstr(uri), take_pwstr(suggested))
    };
    let Some(DownloadChoice { path, own_dialog }) = choose(&uri, &suggested) else {
        // SAFETY: COM-1; cancelling inside the callback is the documented use.
        let _ = unsafe { args.SetCancel(true) };
        return;
    };
    // SAFETY: COM-1; the HSTRING outlives the calls. Handled = true: WebView2 shows no download pop-up of its own,
    // except where the app allows it (program files, so SmartScreen can ask, p4.18).
    unsafe {
        let _ = args.SetResultFilePath(&HSTRING::from(path.as_str()));
        let _ = args.SetHandled(!own_dialog);
    }
    let id = NEXT_DOWNLOAD.with(|n| {
        let v = n.get() + 1;
        n.set(v);
        v
    });
    sink(TabEvent::DownloadStarted {
        download: id,
        uri,
        path: path.clone(),
        total,
    });
    let s = sink.clone();
    let o = op.clone();
    let bytes = BytesReceivedChangedEventHandler::create(Box::new(move |_sender, _args| {
        let (mut received, mut total) = (0i64, 0i64);
        // SAFETY: COM-1; out-pointers are locals.
        unsafe {
            let _ = o.BytesReceived(&mut received);
            let _ = o.TotalBytesToReceive(&mut total);
        }
        s(TabEvent::DownloadProgress {
            download: id,
            received,
            total,
        });
        Ok(())
    }));
    let s = sink.clone();
    let o = op.clone();
    let state = StateChangedEventHandler::create(Box::new(move |_sender, _args| {
        let mut st = COREWEBVIEW2_DOWNLOAD_STATE::default();
        let mut reason = COREWEBVIEW2_DOWNLOAD_INTERRUPT_REASON::default();
        let mut received = 0i64;
        // SAFETY: COM-1; out-pointers are locals.
        unsafe {
            let _ = o.State(&mut st);
            let _ = o.InterruptReason(&mut reason);
            let _ = o.BytesReceived(&mut received);
        }
        if st == COREWEBVIEW2_DOWNLOAD_STATE_IN_PROGRESS {
            return Ok(());
        }
        s(TabEvent::DownloadFinished {
            download: id,
            completed: st == COREWEBVIEW2_DOWNLOAD_STATE_COMPLETED,
            interrupt_reason: reason.0,
            path: path.clone(),
            received,
        });
        // Done: release the operation and its handlers (COM-4), outside this callback's own borrow.
        let done = DOWNLOADS.with(|d| d.borrow_mut().remove(&id));
        if let Some((op, bt, stt)) = done {
            // SAFETY: COM-1, COM-4: the tokens came from the add_* calls on this operation.
            unsafe {
                let _ = op.remove_BytesReceivedChanged(bt);
                let _ = op.remove_StateChanged(stt);
            }
        }
        Ok(())
    }));
    let (mut bt, mut stt) = (0i64, 0i64);
    // SAFETY: COM-1, COM-4: tokens kept in DOWNLOADS and removed when the download ends.
    unsafe {
        let _ = op.add_BytesReceivedChanged(&bytes, &mut bt);
        let _ = op.add_StateChanged(&state, &mut stt);
    }
    DOWNLOADS.with(|d| d.borrow_mut().insert(id, (op, bt, stt)));
}

/// Whether virtual key `vk` is held down right now, for the thread's keyboard state (Ctrl 0x11, Shift 0x10).
fn key_held(vk: i32) -> bool {
    // SAFETY: COM-1 (UI thread, inside a key callback); GetKeyState only reads this thread's keyboard state.
    let state = unsafe { windows::Win32::UI::Input::KeyboardAndMouse::GetKeyState(vk) };
    state < 0
}

/// Whether the developer tools are allowed in the web view of `controller` (also used for Tauri's shell view).
/// Note (p2.12, observed): this setting blocks the user's ways in (F12, the context menu); a direct
/// `OpenDevToolsWindow` call still opens them, so Ferrum has no code that makes that call.
pub fn controller_devtools_enabled(controller: &ICoreWebView2Controller) -> Result<bool, Error> {
    let mut on = BOOL(0);
    // SAFETY: COM-1; `controller` is live; the out-pointer is a local.
    hr(unsafe {
        controller
            .CoreWebView2()
            .and_then(|c| c.Settings())
            .and_then(|st| st.AreDevToolsEnabled(&mut on))
    })?;
    Ok(on.as_bool())
}

/// Puts the window that hosts `controller`'s web view at the bottom of its siblings' stacking order. Used for Tauri's
/// shell view, which fills the window: the tab views must be drawn above it (observed in P3: without this, the
/// shell's window stayed on top and covered the page).
pub fn send_to_back(controller: &ICoreWebView2Controller) -> Result<(), Error> {
    use windows::Win32::UI::WindowsAndMessaging::{
        HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SetWindowPos,
    };
    let mut host = HWND::default();
    // SAFETY: COM-1; `controller` is live; the out-pointer is a local.
    hr(unsafe { controller.ParentWindow(&mut host) })?;
    // SAFETY: COM-1 (UI thread, which owns the window); `host` is the live window WebView2 just named; only the
    // stacking order changes (no move, no resize, no activation).
    hr(unsafe {
        SetWindowPos(
            host,
            Some(HWND_BOTTOM),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        )
    })
}

/// Gives keyboard focus to the web view of `controller` (used by the developer-tools self-test for the shell).
pub fn controller_focus(controller: &ICoreWebView2Controller) -> Result<(), Error> {
    // SAFETY: COM-1; `controller` is live.
    hr(unsafe { controller.MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC) })
}

/// Number of WebView2 renderer processes of `env`'s browser (shell and tabs together), from `GetProcessInfos`
/// (ICoreWebView2Environment8, as in spike S3). Used by the tab tests: after all tabs close, the count must fall back
/// to what the shell alone needs.
pub fn renderer_process_count(env: &ICoreWebView2Environment) -> Result<u32, Error> {
    let env8: ICoreWebView2Environment8 = hr(env.cast())?;
    // SAFETY: COM-1; `env8` is live.
    let infos = hr(unsafe { env8.GetProcessInfos() })?;
    let mut n = 0u32;
    // SAFETY: COM-1; the out-pointer is a local.
    hr(unsafe { infos.Count(&mut n) })?;
    let mut renderers = 0;
    for i in 0..n {
        // SAFETY: COM-1; `i` is below Count.
        let info = hr(unsafe { infos.GetValueAtIndex(i) })?;
        let mut kind = COREWEBVIEW2_PROCESS_KIND::default();
        // SAFETY: COM-1; the out-pointer is a local.
        hr(unsafe { info.Kind(&mut kind) })?;
        if kind == COREWEBVIEW2_PROCESS_KIND_RENDERER {
            renderers += 1;
        }
    }
    Ok(renderers)
}

/// Saves Tauri's WebView2 environment for later tab views (call on the UI thread, from the shell's `with_webview`).
pub fn save_environment(env: &ICoreWebView2Environment) {
    ENVIRONMENT.with(|e| *e.borrow_mut() = Some(env.clone()));
}

/// The browser arguments of every Ferrum WebView2 environment: the shell's (set through Tauri's
/// `additional_browser_args`, which replaces wry 0.57's default string), the IPC self-test probe's (same folder, so same
/// options) and each site environment (p4.15). It is wry's default without `msSmartScreenProtection`, so SmartScreen
/// stays on (owner answer Q-225, p4.18; what it checks and sends: `raw/research/smartscreen-webview2.md`). The two
/// Edge-menu switches (`msWebOOUI`, `msPdfOOUI`) and the autoplay switch (Tauri leaves wry's `autoplay` on) are kept.
pub const SHELL_BROWSER_ARGUMENTS: &str =
    "--disable-features=msWebOOUI,msPdfOOUI --autoplay-policy=no-user-gesture-required";

/// A WebView2 environment (Tauri's, or a site's own, p4.15), named for callers outside this module.
pub type Environment = ICoreWebView2Environment;

/// Receives a site environment, or why it could not be made (UI thread).
pub type EnvironmentDone = Box<dyn FnOnce(Result<ICoreWebView2Environment, Error>)>;

/// Told when a site environment's browser process has ended: the environment's key and whether it failed (UI thread).
pub type EnvironmentExited = Rc<dyn Fn(&str, bool)>;

/// A site environment (p4.15): being created (the callers waiting for it), or ready.
enum SiteEnvironment {
    Pending(Vec<EnvironmentDone>),
    Ready(ICoreWebView2Environment),
}

/// The user interface language, as wry passes it to Tauri's environment.
fn user_language() -> String {
    use windows::Win32::Globalization::{
        GetUserDefaultUILanguage, LCIDToLocaleName, LOCALE_ALLOW_NEUTRAL_NAMES, MAX_LOCALE_NAME,
    };
    let mut lang = [0u16; MAX_LOCALE_NAME as usize];
    // SAFETY: no COM; both calls only read the user's setting and write into the local buffer, whose length is passed
    // with it.
    let n = unsafe {
        let lcid = GetUserDefaultUILanguage();
        LCIDToLocaleName(lcid as u32, Some(&mut lang), LOCALE_ALLOW_NEUTRAL_NAMES)
    };
    if n == 0 {
        return String::new();
    }
    let end = lang.iter().position(|c| *c == 0).unwrap_or(lang.len());
    String::from_utf16_lossy(&lang[..end])
}

/// Calls `done` with the WebView2 environment whose user data folder is `folder` (isolation mode `per-site-udf`,
/// p4.15): made on first use with Tauri's options (COM-7), then reused. `key` names it (the site's profile); while it
/// is being made, further callers wait for the same one. When its browser process ends, it is forgotten (the next
/// caller makes a new one) and `exited` is told. Each environment is one browser process with its own helper
/// processes (renderers, GPU, utilities).
pub fn site_environment(
    key: &str,
    folder: &std::path::Path,
    exited: EnvironmentExited,
    done: EnvironmentDone,
) -> Result<(), Error> {
    let mut done = Some(done);
    let ready = SITE_ENVIRONMENTS.with(|m| {
        let mut m = m.borrow_mut();
        match m.get_mut(key) {
            Some(SiteEnvironment::Ready(env)) => Some(Some(env.clone())),
            Some(SiteEnvironment::Pending(waiting)) => {
                waiting.extend(done.take());
                Some(None)
            }
            None => {
                m.insert(key.to_string(), SiteEnvironment::Pending(Vec::new()));
                None
            }
        }
    });
    match ready {
        Some(Some(env)) => {
            if let Some(d) = done.take() {
                d(Ok(env));
            }
            return Ok(());
        }
        Some(None) => return Ok(()),
        None => {}
    }
    let Some(first) = done.take() else {
        return Ok(());
    };
    let options = CoreWebView2EnvironmentOptions::default();
    // SAFETY: COM-1; `options` is Ferrum's own object; the setters only store the values.
    unsafe {
        options.set_additional_browser_arguments(SHELL_BROWSER_ARGUMENTS.to_string());
        options.set_are_browser_extensions_enabled(false);
        options.set_language(user_language());
        options.set_scroll_bar_style(COREWEBVIEW2_SCROLLBAR_STYLE_DEFAULT);
    }
    let name = key.to_string();
    let handler =
        CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(move |res, env| {
            let made = hr(res).and_then(|()| env.ok_or(Error::NoEnvironment));
            let waiting = SITE_ENVIRONMENTS.with(|m| {
                let mut m = m.borrow_mut();
                let waiting = match m.remove(&name) {
                    Some(SiteEnvironment::Pending(w)) => w,
                    _ => Vec::new(),
                };
                if let Ok(env) = &made {
                    m.insert(name.clone(), SiteEnvironment::Ready(env.clone()));
                }
                waiting
            });
            if let Ok(env) = &made {
                let (n, ex) = (name.clone(), exited.clone());
                let watched = watch_browser_exit(
                    env,
                    Box::new(move |failed| {
                        SITE_ENVIRONMENTS.with(|m| m.borrow_mut().remove(&n));
                        ex(&n, failed);
                    }),
                );
                if watched.is_err() {
                    // Not watched: after a crash the dead environment stays in the list; its tabs still show the
                    // crashed panel (ProcessFailed). Reported like a normal end so the app logs it.
                    exited(&format!("{name} (exit not watched)"), false);
                }
            }
            for d in std::iter::once(first).chain(waiting) {
                d(made.clone());
            }
            Ok(())
        }));
    let folder = HSTRING::from(folder.as_os_str());
    // SAFETY: COM-1 (UI thread, caller's contract), COM-2: the environment arrives in `handler`, which WebView2 keeps
    // alive until it fires; the HSTRING and the options outlive the call; no browser folder is named (the installed
    // runtime, as for Tauri).
    let started = hr(unsafe {
        CreateCoreWebView2EnvironmentWithOptions(
            PCWSTR::null(),
            &folder,
            &ICoreWebView2EnvironmentOptions::from(options),
            &handler,
        )
    });
    if started.is_err() {
        SITE_ENVIRONMENTS.with(|m| m.borrow_mut().remove(key));
    }
    started
}

/// At exit (UI thread, while the message loop still runs): closes every tab view and forgets the site environments
/// (p4.15). Observed in p4.15: when a site environment was still held as Ferrum ended, its process did not exit for
/// more than 15 seconds after the quit; releasing everything first lets it end at once.
pub fn close_all_views() {
    let views: Vec<ContentView> = VIEWS.with(|m| m.borrow_mut().drain().map(|(_, v)| v).collect());
    for v in views {
        v.close();
    }
    SITE_ENVIRONMENTS.with(|m| m.borrow_mut().clear());
}

/// Whether the site environment `key` exists and its browser process is running (p4.15).
pub fn site_environment_ready(key: &str) -> bool {
    SITE_ENVIRONMENTS.with(|m| matches!(m.borrow().get(key), Some(SiteEnvironment::Ready(_))))
}

/// The site environments that are ready, by key (p4.15; for the process inventory).
pub fn site_environments() -> Vec<(String, ICoreWebView2Environment)> {
    SITE_ENVIRONMENTS.with(|m| {
        let mut all: Vec<_> = m
            .borrow()
            .iter()
            .filter_map(|(k, e)| match e {
                SiteEnvironment::Ready(env) => Some((k.clone(), env.clone())),
                SiteEnvironment::Pending(_) => None,
            })
            .collect();
        all.sort_by(|a, b| a.0.cmp(&b.0));
        all
    })
}

thread_local! {
    /// The tab views of this UI thread, by tab id (P3: one view per tab). UI thread only (COM-1).
    pub static VIEWS: RefCell<HashMap<u64, ContentView>> = RefCell::new(HashMap::new());
    /// Tauri's WebView2 environment, saved when the first tab view is created (every tab view comes from it, COM-7,
    /// except the views of sites with their own user data folder).
    pub static ENVIRONMENT: RefCell<Option<ICoreWebView2Environment>> = const { RefCell::new(None) };
    /// The environments of sites with their own user data folder (p4.15), by key (the site's profile).
    static SITE_ENVIRONMENTS: RefCell<HashMap<String, SiteEnvironment>> = RefCell::new(HashMap::new());
    /// Downloads in progress: the operation and its two handler tokens, by Ferrum's download id (p3.8).
    static DOWNLOADS: RefCell<HashMap<u64, (ICoreWebView2DownloadOperation, i64, i64)>> = RefCell::new(HashMap::new());
    /// The last download id handed out.
    static NEXT_DOWNLOAD: Cell<u64> = const { Cell::new(0) };
}

#[cfg(test)]
mod tests {
    use super::SHELL_BROWSER_ARGUMENTS;

    /// p4.18 (owner answer Q-225): SmartScreen is not switched off; the Edge-menu and autoplay switches stay.
    #[test]
    fn browser_arguments_keep_smartscreen_on() {
        assert!(!SHELL_BROWSER_ARGUMENTS.contains("msSmartScreenProtection"));
        let disabled = SHELL_BROWSER_ARGUMENTS
            .split_whitespace()
            .find_map(|a| a.strip_prefix("--disable-features="))
            .expect("one --disable-features switch");
        assert_eq!(
            disabled.split(',').collect::<Vec<_>>(),
            ["msWebOOUI", "msPdfOOUI"]
        );
        assert!(
            SHELL_BROWSER_ARGUMENTS
                .split_whitespace()
                .any(|a| a == "--autoplay-policy=no-user-gesture-required")
        );
    }
}
