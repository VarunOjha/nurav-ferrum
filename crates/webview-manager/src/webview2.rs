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

use std::cell::RefCell;
use std::rc::Rc;

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{
    CreateCoreWebView2ControllerCompletedHandler, DocumentTitleChangedEventHandler,
    FocusChangedEventHandler, HistoryChangedEventHandler, LaunchingExternalUriSchemeEventHandler,
    NavigationCompletedEventHandler, NavigationStartingEventHandler,
    NewWindowRequestedEventHandler, SourceChangedEventHandler, take_pwstr,
};
use windows::Win32::Foundation::{HWND, RECT};
use windows_core::{BOOL, HSTRING, Interface, PWSTR};

use crate::Error;
use crate::tab::{NavDecision, TabEvent};

/// Receives tab events (UI thread).
pub type EventSink = Rc<dyn Fn(TabEvent)>;
/// Decides whether a page-started navigation may start (UI thread).
pub type NavGate = Rc<dyn Fn(&str) -> NavDecision>;

fn hr<T>(r: windows_core::Result<T>) -> Result<T, Error> {
    r.map_err(|e| Error::Com {
        code: e.code().0 as u32,
        message: e.message(),
    })
}

#[derive(Clone, Copy)]
enum Ev {
    NavStarting,
    Source,
    NavCompleted,
    History,
    Title,
    GotFocus,
    NewWindow,
    LaunchExternal,
}

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
    #[allow(clippy::too_many_arguments)]
    pub fn create(
        env: &ICoreWebView2Environment,
        parent: isize,
        bounds: RECT,
        profile: &str,
        devtools: bool,
        sink: EventSink,
        gate: NavGate,
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
                    view.register(sink, gate)?;
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

    fn register(&mut self, sink: EventSink, gate: NavGate) -> Result<(), Error> {
        let core = self.core.clone();

        let s = sink.clone();
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
                let decision = gate(&uri);
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
                    Ev::Source => self.core.remove_SourceChanged(*t),
                    Ev::NavCompleted => self.core.remove_NavigationCompleted(*t),
                    Ev::History => self.core.remove_HistoryChanged(*t),
                    Ev::Title => self.core.remove_DocumentTitleChanged(*t),
                    Ev::GotFocus => self.controller.remove_GotFocus(*t),
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

/// Gives keyboard focus to the web view of `controller` (used by the developer-tools self-test for the shell).
pub fn controller_focus(controller: &ICoreWebView2Controller) -> Result<(), Error> {
    // SAFETY: COM-1; `controller` is live.
    hr(unsafe { controller.MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC) })
}

thread_local! {
    /// The content view of this UI thread (P2 has one). Lives on the UI thread only (COM-1).
    pub static CONTENT: RefCell<Option<ContentView>> = const { RefCell::new(None) };
}
