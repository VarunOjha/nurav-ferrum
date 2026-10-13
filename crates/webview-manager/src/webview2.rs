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
//! - **COM-7 Identical environment options**: the controller is created from Tauri's own environment.
//! - Handlers never call back into the same web view synchronously; they only copy plain data out.

#![allow(unsafe_code)]

use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{
    AcceleratorKeyPressedEventHandler, BytesReceivedChangedEventHandler,
    CreateCoreWebView2ControllerCompletedHandler, DocumentTitleChangedEventHandler,
    DownloadStartingEventHandler, FaviconChangedEventHandler, FocusChangedEventHandler,
    GetFaviconCompletedHandler, HistoryChangedEventHandler, LaunchingExternalUriSchemeEventHandler,
    NavigationCompletedEventHandler, NavigationStartingEventHandler,
    NewWindowRequestedEventHandler, SourceChangedEventHandler, StateChangedEventHandler,
    take_pwstr,
};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::System::Com::IStream;
use windows_core::{BOOL, HSTRING, Interface, PWSTR};

use crate::Error;
use crate::tab::{KeyDown, NavDecision, NavRequest, TabEvent};

/// Receives tab events (UI thread).
pub type EventSink = Rc<dyn Fn(TabEvent)>;
/// Decides whether a navigation may start: the page's own (each redirect hop again) or a frame's (UI thread).
pub type NavGate = Rc<dyn Fn(&NavRequest) -> NavDecision>;
/// Decides whether a key pressed in the view is Ferrum's (true: handled, the page never sees it) (UI thread).
pub type KeyFilter = Rc<dyn Fn(KeyDown) -> bool>;

/// Chooses where a download is saved: given its address and WebView2's suggested path, the full path to save to, or
/// `None` to refuse the download (UI thread).
pub type DownloadFilter = Rc<dyn Fn(&str, &str) -> Option<String>>;

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
    LaunchExternal,
    Accelerator,
    Download,
    Favicon,
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
    /// WebView2 profile `profile`. `devtools` allows the developer tools (WebView2's default is on; Ferrum passes
    /// true only in debug builds, p2.12). `done` receives the view once WebView2 has created it.
    pub fn create(
        env: &ICoreWebView2Environment,
        parent: isize,
        bounds: RECT,
        profile: &str,
        devtools: bool,
        handlers: Handlers,
        done: Box<dyn FnOnce(Result<ContentView, Error>)>,
    ) -> Result<(), Error> {
        let env10: ICoreWebView2Environment10 = hr(env.cast())?;
        // SAFETY: COM-1 (called on the UI thread by the caller's contract); `env10` is a live environment.
        let opts = hr(unsafe { env10.CreateCoreWebView2ControllerOptions() })?;
        // SAFETY: COM-1; `opts` is live; the HSTRING outlives the call.
        hr(unsafe { opts.SetProfileName(&HSTRING::from(profile)) })?;
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

    /// Removes every event handler and closes the controller (COM-4). The view is unusable afterwards.
    pub fn close(self) {
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
                    Ev::Favicon => match self.core.cast::<ICoreWebView2_15>() {
                        Ok(c15) => c15.remove_FaviconChanged(*t),
                        Err(e) => Err(e),
                    },
                    Ev::NewWindow => self.core.remove_NewWindowRequested(*t),
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
    let Some(path) = choose(&uri, &suggested) else {
        // SAFETY: COM-1; cancelling inside the callback is the documented use.
        let _ = unsafe { args.SetCancel(true) };
        return;
    };
    // SAFETY: COM-1; the HSTRING outlives the calls. Handled = true: WebView2 shows no download pop-up of its own.
    unsafe {
        let _ = args.SetResultFilePath(&HSTRING::from(path.as_str()));
        let _ = args.SetHandled(true);
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

thread_local! {
    /// The tab views of this UI thread, by tab id (P3: one view per tab). UI thread only (COM-1).
    pub static VIEWS: RefCell<HashMap<u64, ContentView>> = RefCell::new(HashMap::new());
    /// Tauri's WebView2 environment, saved when the first tab view is created (every tab view comes from it, COM-7).
    pub static ENVIRONMENT: RefCell<Option<ICoreWebView2Environment>> = const { RefCell::new(None) };
    /// Downloads in progress: the operation and its two handler tokens, by Ferrum's download id (p3.8).
    static DOWNLOADS: RefCell<HashMap<u64, (ICoreWebView2DownloadOperation, i64, i64)>> = RefCell::new(HashMap::new());
    /// The last download id handed out.
    static NEXT_DOWNLOAD: Cell<u64> = const { Cell::new(0) };
}
