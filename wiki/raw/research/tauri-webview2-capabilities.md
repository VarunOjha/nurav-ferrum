---
id: research-tauri-webview2-capabilities
type: research-note
title: Tauri 2 / wry / WebView2 capability verification (versions, multi-webview, IPC isolation, lifecycle APIs, CDP, OAuth)
updated: 2026-10-08
sources:
  - https://crates.io/api/v1/crates/{tauri,tauri-build,tauri-cli,wry,webview2-com,webview2-com-sys,windows,tokio,serde,tracing,tauri-runtime-wry}
  - https://registry.npmjs.org/@tauri-apps/cli/latest
  - https://registry.npmjs.org/@tauri-apps/api/latest
  - "crate source (downloaded from static.crates.io): tauri-2.12.1, tauri-runtime-2.12.1, tauri-runtime-wry-2.12.1, tauri-utils-2.10.1, wry-0.57.0, webview2-com-0.39.1, webview2-com-sys-0.39.1, tauri-3.0.0-alpha.4"
  - https://v2.tauri.app/security/capabilities/
  - https://v2.tauri.app/concept/inter-process-communication/isolation/
  - https://github.com/tauri-apps/tauri/pull/16054
  - https://github.com/tauri-apps/wry/pull/1738
  - https://github.com/tauri-apps/tauri/issues/9285
  - "https://api.github.com/search/issues?q=repo:tauri-apps/tauri+is:issue+is:open+label:\"scope: unstable flag\""
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/multi-profile-support
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/webview2-idl
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_2
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_3
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_19
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2controller
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2environment8
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/playwright
  - https://playwright.dev/docs/webview2
  - https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp
  - https://developers.google.com/identity/protocols/oauth2/policies
---

# Tauri 2 / wry / WebView2 capability verification

> Raw research note (immutable once written; corrections go in a new dated note or ADR).
> Access date for every source: **2026-10-08**. Researcher: Claude (AI), P0 planning session.
> Labels: **VERIFIED** = read directly in the primary source (official docs, registry API, or the
> published crate source code). **UNCERTAIN** = inferred, paraphrased by a summarizing fetch tool,
> or not yet tested; each UNCERTAIN item names the phase in which it must be verified.
> No code was compiled or run; nothing here is a measurement.

Method note: for Rust APIs the most reliable primary source is the *published crate source* (what
`cargo` will actually download). Crate tarballs were downloaded from `static.crates.io` into the
session scratchpad and grepped. File/line references below are to those tarballs.

---

## 1. Current stable versions (registry APIs, 2026-10-08)

| Package | Latest stable | Newest (incl. pre-release) | Source | Status |
|---|---|---|---|---|
| `tauri` | **2.12.1** (published 2026-09-30, `rust_version` 1.90) | 3.0.0-alpha.4 | crates.io API | VERIFIED |
| `tauri-build` | **2.7.1** | 3.0.0-alpha.3 | crates.io API | VERIFIED |
| `tauri-cli` (cargo) | **2.12.1** | 3.0.0-alpha.4 | crates.io API | VERIFIED |
| `tauri-runtime-wry` | 2.12.1 | 3.0.0-alpha.4 | crates.io API | VERIFIED |
| `wry` | **0.57.0** (`rust_version` 1.85) | 0.57.0 | crates.io API | VERIFIED |
| `webview2-com` | **0.39.1** | 0.39.1 | crates.io API | VERIFIED |
| `webview2-com-sys` | 0.39.1 | 0.39.1 | crates.io API | VERIFIED |
| `windows` | **0.62.2** | 0.62.2 | crates.io API | VERIFIED |
| `tokio` | **1.53.2** | 1.53.2 | crates.io API | VERIFIED |
| `serde` | **1.0.229** | 1.0.229 | crates.io API | VERIFIED |
| `tracing` | **0.1.44** | 0.1.44 | crates.io API | VERIFIED |
| npm `@tauri-apps/cli` | **2.12.1** | — | registry.npmjs.org `/latest` | VERIFIED |
| npm `@tauri-apps/api` | **2.12.1** | — | registry.npmjs.org `/latest` | VERIFIED |

Dependency coherence (from crates.io `/dependencies` endpoint, VERIFIED):
- `tauri 2.12.1` → `tauri-runtime-wry ~2.12.1`, `webview2-com ^0.39` (optional, Windows), `windows ^0.62`.
- `tauri-runtime-wry 2.12.1` → `wry ^0.57.0`, `webview2-com ^0.39`, `windows ^0.62`.
- `wry 0.57.0` → `webview2-com ^0.39`, `windows ^0.62`, `windows-core ^0.62`.
- **Implication:** Ferrum's own `webview2-com` and `windows` direct dependencies MUST be pinned to the
  same majors (`webview2-com = "0.39"`, `windows = "0.62"`) or COM interface types will not unify
  with the types Tauri hands out via `with_webview` (VERIFIED type signatures; unification failure
  itself is standard Cargo semver behaviour — UNCERTAIN until P1 compile).
- `rust_version` of tauri 2.12.1 is **1.90** → the stable toolchain installed in P1 must be ≥ 1.90 (VERIFIED metadata).
- `webview2-com-sys 0.39.x` bindings go up to `ICoreWebView2_28`, `ICoreWebView2Environment15`,
  `ICoreWebView2ControllerOptions4` (VERIFIED by grep of `src/bindings.rs`). The exact WebView2 SDK
  version used to generate them is not stated in the tarball (CHANGELOG 0.39.0: "update windows and
  WebView2 SDK versions"; 0.38.2 used SDK 1.0.3650.58) — UNCERTAIN, irrelevant unless we need an
  interface newer than `_28`.
- **Tauri 3.0.0-alpha.4 exists (2026-10-01).** Not stable. Decision-relevant: in the alpha,
  `Window::add_child` is still gated behind `all(desktop, feature = "unstable")` and its signature
  changed to `add_child(&self, webview_builder)` (no position/size args) (VERIFIED, tauri-3.0.0-alpha.4
  `src/window/mod.rs:1233-1235`). Expect a migration later; stay on 2.x for this project.

## 2. Tauri 2 multi-webview status

- `Window::builder(...)` and `Window::add_child(webview_builder, position, size)` require the
  **`unstable` cargo feature** and are desktop-only (VERIFIED, tauri-2.12.1 `src/window/mod.rs:1134-1156, 1160-1230`).
- Doc comment, verbatim in substance: *"On Windows, this function deadlocks when used in a synchronous
  command or event handlers ... You should use `async` commands and separate threads when creating
  webviews."* (links wry issue #583) (VERIFIED, same file). → Tab creation must happen from async
  commands / non-UI threads; must be a P1 test case.
- Child webviews are **not** resized with the window unless `WebviewBuilder::auto_resize()` or
  `Webview::set_auto_resize(true)`; positions/sizes accept logical or physical units (VERIFIED doc comment).
- Available per-webview runtime ops (VERIFIED, `src/webview/mod.rs`): `set_bounds`, `set_size`,
  `set_position`, `set_focus`, `hide`, `show`, `reparent(&Window)`, `set_auto_resize`, `bounds`,
  `close`, `navigate`, `reload`, `url`, `eval`, `set_zoom`, `clear_all_browsing_data`, `cookies*`,
  `set_cookie`, `delete_cookie`, `open_devtools`/`close_devtools`/`is_devtools_open`, `print`.
  There is **no `go_back` / `go_forward` API** on `Webview` in 2.12.1 (grep found none) → back/forward
  must be done via `eval("history.back()")` or raw COM `ICoreWebView2::GoBack/GoForward`
  (UNCERTAIN which is better; decide in P1).
- `Webview::hide()` → wry `set_visible(false)` → `ShowWindow(SW_HIDE)` + `ICoreWebView2Controller::SetIsVisible(false)`
  (VERIFIED, tauri-runtime-wry `lib.rs:~3701-3706`, wry `webview2/mod.rs:1570-1577`). This matters
  because `TrySuspend` requires `IsVisible == false` (§6).
- **Open GitHub issues labelled `scope: unstable flag` (23 open on 2026-10-08)** (VERIFIED list via
  GitHub search API; issue *contents* not reproduced — UNCERTAIN whether they affect Ferrum, verify P1/P2).
  Windows-relevant or platform-unspecified ones:
  - #13466 Alt+Tab to window won't focus its contents on Windows with `unstable` (keyboard can't reach content).
  - #12207 Cannot resize window with custom titlebar when `unstable` enabled on Windows.
  - #15682 Child webview always displayed above the main webview (z-order; shell DOM obscured) —
    directly relevant: shell UI (dropdowns, menus) cannot overlap tab content; design UI so shell chrome never overlaps tab bounds.
  - #11124 No API to control z-order of multiple webviews.
  - #9611 Cannot fix position and set auto_resize at the same time.
  - #11376 multiwebview only renders the last child; #10011 multiple webviews mostly white on load;
    #10521 drag-and-drop events don't fire with `unstable`; #9257 text-editing shortcuts broken with `unstable`.
- Tauri 2.x `WebviewBuilder::background_throttling` is **unsupported on Windows** (doc: "Linux / Windows /
  Android: Unsupported") (VERIFIED `src/webview/mod.rs:1210-1229`).

## 3. Capabilities / permissions and keeping remote content away from IPC

Facts (VERIFIED from tauri-2.12.1 source unless noted):
- **The IPC bridge is attached to every webview, including remote-content child webviews**: wry
  injects `window.ipc.postMessage → window.chrome.webview.postMessage` and Tauri registers its IPC
  handler for every webview it builds (wry `webview2/mod.rs:~945-985`; tauri-runtime-wry `lib.rs:5101-5107`).
  Protection is therefore *authorization in Rust*, not absence of the channel.
- The origin used for authorization is the **`Source` reported by WebView2's `WebMessageReceived`
  event** (wry `args.Source(...)`), i.e. browser-reported, not page-supplied (VERIFIED code; that
  WebView2's `Source` cannot be spoofed by page script is UNCERTAIN → P3 security test).
- `Webview::on_message` (`src/webview/mod.rs:2005-2100`): computes `is_local` (tauri custom protocol,
  devUrl/frontendDist-relative, or registered custom protocol); otherwise `Origin::Remote { url }`.
  The ACL is checked **for plugin commands, OR when the app has an ACL manifest, OR when the origin is
  remote** — source comment: *"This ensures remote content can never reach custom commands unless an
  explicit `remote` capability has been configured for them."* Exception: the internal
  `FETCH_CHANNEL_DATA_COMMAND` is exempt (`// TODO: Remove this special check in v3`).
  An invoke-key check (`__TAURI_INVOKE_KEY__`) is also performed, but that key is injected into page
  context and must **not** be treated as a security boundary for remote pages (UNCERTAIN → P3 test).
- `RuntimeAuthority::resolve_access` (`src/ipc/authority.rs:462-490`): a command is allowed only if a
  capability entry matches the **execution context** (Local vs Remote URL pattern) AND (**webview label
  matches OR window label matches**). Deny entries are context-scoped.
- Capability `remote.urls` creates `ExecutionContext::Remote` entries (tauri-utils `acl/resolved.rs:281-290`);
  without `remote`, a capability is Local-only.
- Docs (VERIFIED, v2.tauri.app/security/capabilities): capabilities target `windows` (and `webviews`);
  *"Windows and WebViews which are part of more than one capability effectively merge the security
  boundaries and permissions of all involved capabilities."* Remote access caution: *"On Linux and
  Android, Tauri is unable to distinguish between requests from an embedded `<iframe>` and the window
  itself."* (Windows not listed in that caveat.)

**Guarantee recipe for Ferrum (design, to be proven by tests in P3):**
1. Never declare any capability with a `remote` section (no remote URL gets any command or plugin permission).
2. Target the shell capability by **webview label** (`"webviews": ["shell"]`) rather than window label,
   because a window-label match also matches child tab webviews (VERIFIED matching logic) — window
   targeting is safe only because of rule 1, so use both defences.
3. Ship an app ACL manifest (build-time `tauri-build` app manifest) so even local custom commands are ACL-checked.
4. Tab webviews: `on_navigation` policy, `on_new_window` → deny/route to new tab, never navigate a tab
   to the app's own `tauri://`/`http(s)://tauri.localhost` origin (a tab at a local origin would become
   `Origin::Local`) — block in `on_navigation` (UNCERTAIN whether WebView2 allows a remote page to
   navigate top-level to `http://tauri.localhost`; must be a P3 negative test).
5. Security tests: invoke from a remote child must be rejected for (a) core plugin commands, (b) app
   commands, (c) event emit/listen, (d) `FETCH_CHANNEL_DATA_COMMAND` (check what it can leak).
- **Isolation pattern** (VERIFIED docs): protects against malicious *frontend* (supply-chain) calls to
  Tauri Core by routing IPC through a sandboxed iframe; docs do not say it applies to remote content
  (UNCERTAIN). Windows limitation: external files don't load in sandboxed iframes, scripts inlined, ES
  modules may fail. → Not the mechanism for tab isolation; optional hardening for the shell only.

## 4. WebviewBuilder hooks (tauri 2.12.1) — what exists and how it maps to WebView2

| Hook / option | Signature (abridged) | Windows mapping (wry 0.57) | Notes | Status |
|---|---|---|---|---|
| `on_navigation` | `Fn(&Url) -> bool` | `add_NavigationStarting` (main frame only) → `SetCancel(!allow)` | **If the URL fails to parse, tauri-runtime-wry returns `true` (allow)** (`lib.rs:4821-4826`). No iframe (`FrameNavigationStarting`) hook. WebView2 docs: NavigationStarting fires for redirects; not for fragment/`pushState`. | VERIFIED (code + docs) |
| `on_new_window` | `Fn(Url, NewWindowFeatures) -> NewWindowResponse{Allow, Create{window}, Deny}` | `add_NewWindowRequested` with deferral | **If no handler is set, wry calls `SetHandled(true)`** → popups silently suppressed. URL parse failure → `Deny`. | VERIFIED |
| `on_download` | `Fn(Webview, DownloadEvent) -> bool` (`Requested{url, destination}`, `Finished{url, path, success}`) | `ICoreWebView2_4::add_DownloadStarting` + `StateChanged` | wry default download handler is `|_,_| true` (allow) when the app sets none. Parse failure → deny. | VERIFIED |
| `on_page_load` | `Fn(Webview, PageLoadPayload)` Started/Finished | NavigationStarting/NavigationCompleted-derived | no HTTP status / error code exposed | VERIFIED (exists); payload limits UNCERTAIN |
| `on_permission_request` | `Fn(Webview, PermissionKind) -> PermissionResponse` | `add_PermissionRequested` | Kinds mapped on Windows: Microphone, Camera, Geolocation, Notifications, ClipboardRead, LocalFonts, Sensors, Midi, AutomaticDownloads, FileSystemAccess, Autoplay, WindowManagement, else `Other`. Note from doc: fires only for *new* requests; persisted user choices bypass it (WebView2 `SavesInProfile` not exposed). | VERIFIED |
| `on_document_title_changed` | `Fn(Webview, String)` | DocumentTitleChanged | | VERIFIED |
| `on_web_resource_request` | `Fn(Request, &mut Response)` | **only for Tauri's own custom protocol** (`protocol/tauri.rs`) | NOT a general network hook for https tabs | VERIFIED |
| `data_directory(PathBuf)` | | one wry `WebContext` per distinct data dir (`lib.rs:4706-4737`) → separate WebView2 environment/UDF/browser process | | VERIFIED |
| `incognito(bool)` | | `ICoreWebView2ControllerOptions::SetIsInPrivateModeEnabled` (per controller) | requires runtime ≥ 101.0.1210.39 | VERIFIED |
| `user_agent(&str)` | | `ICoreWebView2Settings2::SetUserAgent` | | VERIFIED |
| `additional_browser_args(&str)` | | `AdditionalBrowserArguments` env option | Replaces wry default `--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection`; *"Webview instances with different browser arguments must also have different data directories."* | VERIFIED |
| `devtools(bool)` | | `SetAreDevToolsEnabled` | Works in debug; release requires tauri `devtools` cargo feature. wry default: `true` in debug, `false` in release. | VERIFIED |
| `with_environment(ICoreWebView2Environment)` | | wry `with_environment` | lets a webview reuse an environment (e.g. popups) | VERIFIED |
| `proxy_url`, `disable_javascript`, `zoom_hotkeys_enabled`, `general_autofill_enabled`, `browser_extensions_enabled`, `extensions_path`, `scroll_bar_style`, `transparent`, `background_color`, `initialization_script(_for_all_frames)`, `use_https_scheme` | | various | | VERIFIED (exist) |
| `data_store_identifier([u8;16])` | | **Unsupported on Windows** in 2.12.1 (macOS/iOS only) | see §6 profiles | VERIFIED |

wry settings applied unconditionally on Windows: `SetIsStatusBarEnabled(false)`, context menus
per option, zoom control per option, `SetAreBrowserAcceleratorKeysEnabled(false)` unless enabled
(VERIFIED `webview2/mod.rs:630-660`).

## 5. `with_webview` on Windows

- `Webview::with_webview(F: FnOnce(PlatformWebview) + Send + 'static)` runs on the main thread
  (requires tauri `wry` feature, default) (VERIFIED `src/webview/mod.rs:1857-1866`).
- `PlatformWebview::controller() -> webview2_com::...::ICoreWebView2Controller` and
  `PlatformWebview::environment() -> ICoreWebView2Environment` (VERIFIED `src/webview/mod.rs:181-198`).
  `ICoreWebView2` is obtained via `controller.CoreWebView2()`; newer interfaces via `.cast::<ICoreWebView2_N>()`.
- All COM calls are `unsafe` in `webview2-com` (README: *"they are still marked `unsafe`"*) (VERIFIED).
  Every raw-COM use in Ferrum needs a documented `unsafe` invariant (per master prompt §15).
- Event handlers registered via raw COM must be removed / the controller closed, or reference cycles
  keep WebViews alive (WebView2 `Close` docs, VERIFIED). Async COM completions on the UI thread must
  not block (re-entrancy) — wry already uses `dispatch_handler` for this (VERIFIED comment).

## 6. WebView2 feature reachability

### Profiles (owner decision Q7: per-site profiles in one shared browser process)
- WebView2: profile is chosen via `ICoreWebView2ControllerOptions::put_ProfileName` /
  `IsInPrivateModeEnabled`, passed to `ICoreWebView2Environment10::CreateCoreWebView2ControllerWithOptions`
  **at controller creation** (VERIFIED, multi-profile-support doc). Profiles share one UDF and one
  browser process; each profile has its own folder for cookies, preferences, cache (VERIFIED). No API
  to change a live controller's profile was found (UNCERTAIN-absence; treat as creation-time only).
- **wry 0.57.0 already supports it**: `WebViewBuilderExtWindows::with_profile_name(name)` (wry
  `lib.rs:1862-1873, 1923-1925`; `webview2/mod.rs:398-420` calls `SetProfileName`). Added by wry PR
  #1738, merged 2026-05-27 (VERIFIED GitHub API).
- **Tauri 2.12.1 does NOT plumb it**: no reference to `profile_name` anywhere in tauri / tauri-runtime /
  tauri-runtime-wry / tauri-utils 2.12.x sources (VERIFIED grep). `data_store_identifier` is ignored on Windows.
- **Open Tauri PR #16054** (opened 2026-09-18, open on 2026-10-08, not merged): "apply
  `data_store_identifier` as WebView2 profile name on Windows" — maps 16 bytes → 32-hex profile name
  (VERIFIED GitHub API). Tracking issue #9285 open.
- Options for Ferrum (decision for owner/ADR; feasibility UNCERTAIN until P1/P3 spike):
  (a) wait for #16054 to ship in a 2.x release; (b) `[patch.crates-io]` tauri-runtime-wry to the PR
  branch (supply-chain/maintenance cost); (c) host tab webviews outside Tauri's webview manager —
  create controllers ourselves with `webview2-com` (`CreateCoreWebView2ControllerWithOptions` +
  `ProfileName`) in child HWNDs of the Tauri window, keeping Tauri only for the shell (full control of
  profiles, suspend, CDP, ProcessFailed; but we lose Tauri hooks for tabs and own all unsafe COM);
  (d) per-site `data_directory` (works today, but = separate browser process per site → contradicts
  Q7's "shared browser process" and costs memory per Microsoft docs).
- Also VERIFIED: all WebViews sharing one UDF must use **identical environment options**, else creation
  fails with `HRESULT_FROM_WIN32(ERROR_INVALID_STATE)` (webview2-idl / process-model docs). With Tauri,
  `additional_browser_args`, `browser_extensions_enabled`, proxy, scroll bar style and language all live
  in the environment → must be identical for shell + all tabs that share the UDF.
- Multiple UDFs in one app process: allowed — "To make use of multiple user data folders, a WebView2
  application needs to create different `CoreWebView2Environment` objects"; each UDF gets its own
  browser process group (VERIFIED process-model doc).
- `ClearBrowsingDataAll` in wry/tauri (`clear_all_browsing_data`) is **profile-wide**
  (`ICoreWebView2_13::Profile()->ClearBrowsingDataAll`) (VERIFIED wry `mod.rs:1803-1815`) — while the
  shell and tabs share the default profile, clearing a tab's data also clears the shell's.

### TrySuspend / Resume (`ICoreWebView2_3`, runtime ≥ 1.0.774.44 SDK)
- VERIFIED (Microsoft reference): `IsVisible` **must be false** or `TrySuspend` fails with
  `ERROR_INVALID_STATE`; suspend pauses script timers/animations, minimises renderer CPU, lets the OS
  reuse renderer memory; *best effort* — may complete with `isSuccessful=false` under Sleeping-Tabs
  conditions; WebView auto-resumes when made visible; some APIs (e.g. `Navigate`) auto-resume.
- Not exposed by Tauri or wry (VERIFIED grep). → **raw COM via `with_webview` only**.

### MemoryUsageTargetLevel (`ICoreWebView2_19`, runtime ≥ 1.0.1823.32)
- VERIFIED: scripts keep running; Low may swap memory to disk; best effort; doesn't require
  `IsVisible=false`; doesn't auto-revert; **do not mix with TrySuspend/Resume** (`TrySuspend` sets
  Low, `Resume` sets Normal; setting the level while suspended is ignored).
- **Reachable through wry** (`WebViewExtWindows::set_memory_usage_level(MemoryUsageLevel::{Normal,Low})`,
  VERIFIED) but **not through Tauri's `Webview` API** (VERIFIED grep) → from Tauri use raw COM via
  `with_webview` (`cast::<ICoreWebView2_19>()`). Contradicts initial risk #3 only slightly: no extra crate needed, still `unsafe`.

### IsVisible
- VERIFIED: `IsVisible=false` → WebView not rendered; MS recommends setting false when minimised "for
  performance reasons". Exact CPU/memory effect: UNCERTAIN → measure in P4/P6.

### Events only reachable via raw COM (not used by wry/tauri; VERIFIED grep of wry — no matches)
- `ProcessFailed` (renderer/GPU/browser crash, unresponsive) — needed for crash-recovery tests.
- `ICoreWebView2_2::WebResourceResponseReceived` — VERIFIED doc: raised for every resource response
  (navigations, redirects, subresources, fetch), non-blocking, no ordering guarantee → good fit for the
  metadata-only network log (Q5). Body not needed.
- `AddWebResourceRequestedFilterWithRequestSourceKinds` (`ICoreWebView2_22`) for iframe coverage
  (doc: legacy filter misses cross-origin iframes) — wry uses it only for custom protocols.
- DevTools Protocol: `CallDevToolsProtocolMethod` + `GetDevToolsProtocolEventReceiver("Network.*")`;
  must call `Network.enable` first (VERIFIED doc). Alternative source for timing/size metadata.
- `BrowserProcessId` (`ICoreWebView2`), `ICoreWebView2Environment8::GetProcessInfos` /
  `ProcessInfosChanged` (all processes on the UDF except crashpad; runtime ≥ 1.0.1108.44) (VERIFIED).
  `GetProcessExtendedInfos` (renderer ↔ frame/webview association) exists in webview2-com-sys bindings
  (VERIFIED grep); semantics UNCERTAIN → P4.
- `FrameNavigationStarting`, `LaunchingExternalUriScheme`, `ServerCertificateErrorDetected`,
  `BasicAuthenticationRequested`, `NotificationReceived`, `ScreenCaptureStarting` all present in
  bindings (VERIFIED grep) → raw COM for the security policy engine (external protocols, iframe nav).
- `PermissionRequested` is available via Tauri `on_permission_request` (above), but
  `SavesInProfile(FALSE)` (to keep the app authoritative) needs raw COM.

## 7. WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS, remote debugging, Playwright

- VERIFIED (webview2-idl): `WEBVIEW2_USER_DATA_FOLDER` and `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER`
  **override** the API parameters; `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` (env or registry) is
  **appended** to the programmatic `AdditionalBrowserArguments` (so wry's defaults survive).
  (Quoted via a summarising fetch; precise wording should be re-read in P5 → treat as VERIFIED-with-caution.)
- VERIFIED (browser flags doc): flags are for development/testing, *"Apps in production shouldn't use
  WebView2 browser flags"*; **elevated apps ignore flags set via environment/registry** but honour
  flags set in code; `remote-debugging-port` and `remote-allow-origins` are listed flags.
  → Benchmark harness must NOT run Ferrum elevated if it uses the env var (conflicts with AMD energy
  counters needing admin — run the energy sampler as a separate elevated process).
- VERIFIED (playwright.dev/docs/webview2): set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`,
  then `chromium.connectOverCDP('http://localhost:9222')`, `browser.contexts()[0].pages()[0]`; parallel
  runs need distinct `WEBVIEW2_USER_DATA_FOLDER` + ports. Microsoft's own page just links to Playwright's.
- VERIFIED (Playwright API): `connectOverCDP` is *"significantly lower fidelity than the Playwright
  protocol connection"*; Chromium-only.
- **Fairness implication (decision-relevant):** `--remote-debugging-port` must also be applied to Chrome
  and Edge runs for equivalence, or it must be shown to have negligible overhead (UNCERTAIN → P5 pilot).
  Opening a debug port also exposes all tabs (including the trusted shell webview) to any local process —
  debug/benchmark builds only (security note for SECURITY.md).
- How multiple child webviews in one UDF appear as CDP targets/pages: UNCERTAIN → P5 spike.

## 8. Google OAuth in embedded webviews

- VERIFIED (developers.google.com/identity/protocols/oauth2/policies, "Use secure browsers"): *"A
  developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent under
  the developer's control. Embedded user-agents include ... software libraries that allow a developer to
  insert arbitrary scripts, alter the default routing of a request to the Google OAuth server, or access
  session cookies."*
- Ferrum tab webviews are exactly such an embedded user-agent (we inject init scripts, intercept
  navigation, read cookies). → Ferrum must **not** attempt workarounds (UA spoofing etc.; master prompt
  also forbids it). Google sign-in in a Ferrum tab should be expected to be refused; policy: detect
  `accounts.google.com` OAuth flows and offer "open in system browser". Whether Google blocks *this*
  specific WebView2 UA in practice: UNCERTAIN → observe (not circumvent) in P2.
- This affects workload realism: benchmark workloads must not require Google login (authentication-state
  equivalence across Chrome/Edge/Ferrum is impossible for Google-authenticated sites).

## 9. Capability matrix

| Capability | Tauri 2.12.1 API | wry 0.57.0 | Raw COM via `with_webview` | Source | Confidence |
|---|---|---|---|---|---|
| Child webviews in one window | `Window::add_child` (`unstable`) | n/a (child via `build_as_child`) | — | tauri src window/mod.rs | VERIFIED (exists); stability LOW (23 open issues) |
| Position/size/auto-resize/show/hide | `set_bounds`, `set_auto_resize`, `show/hide` | yes | `put_Bounds`, `put_IsVisible` | tauri/wry src | VERIFIED |
| Back / forward | **none** (use `eval`) | none found | `GoBack`/`GoForward` | grep | VERIFIED-absence (grep) |
| Navigation intercept (main frame, incl. redirects) | `on_navigation` | `with_navigation_handler` | `add_NavigationStarting` | src + MS doc | VERIFIED |
| Iframe navigation intercept | no | no | `add_FrameNavigationStarting` | bindings grep | VERIFIED (binding exists) |
| New-window / popup control | `on_new_window` | yes | `add_NewWindowRequested` | src | VERIFIED |
| Downloads (allow/deny, dest path, finished) | `on_download` | yes | `DownloadStarting` (+ `SetHandled`, UI suppression) | src | VERIFIED |
| Page load start/finish | `on_page_load` | yes | `NavigationCompleted` (+ HTTP status via `ICoreWebView2NavigationCompletedEventArgs2`) | src | VERIFIED / status-code path UNCERTAIN |
| Permission requests | `on_permission_request` | `with_permission_handler` | `PermissionRequested` (+ `SavesInProfile`) | src + MS doc | VERIFIED |
| External URI schemes | no | no | `LaunchingExternalUriScheme` | bindings grep | VERIFIED (binding exists) |
| Per-webview UDF | `data_directory` | `WebContext` | env creation | src | VERIFIED |
| InPrivate per webview | `incognito` | `with_incognito` | ControllerOptions | src | VERIFIED |
| **WebView2 profile name** | **no** (PR #16054 open) | **`with_profile_name`** | only at controller creation (cannot retrofit a Tauri-created webview) | src + GitHub API + MS doc | VERIFIED |
| User agent | `user_agent` | yes | `Settings2.UserAgent` | src | VERIFIED |
| DevTools gating | `devtools` + cargo feature `devtools` for release | `with_devtools` | `Settings.AreDevToolsEnabled` | src | VERIFIED |
| TrySuspend / Resume / IsSuspended | no | no | `ICoreWebView2_3` | MS doc + grep | VERIFIED |
| MemoryUsageTargetLevel | no | `set_memory_usage_level` | `ICoreWebView2_19` | wry src + MS doc | VERIFIED |
| Clear browsing data | `clear_all_browsing_data` (profile-wide) | yes | `ICoreWebView2Profile2` (by kind / time range) | wry src | VERIFIED |
| Cookies | `cookies`, `set_cookie`, `delete_cookie` | yes | `CookieManager` | tauri src | VERIFIED |
| Network metadata log | no (`on_web_resource_request` = custom protocol only) | no | `WebResourceResponseReceived`; CDP `Network.*` | MS doc + src | VERIFIED |
| Crash detection | no | no | `ProcessFailed`, `Environment5::BrowserProcessExited` | MS doc | VERIFIED |
| Process IDs / kinds | no | no | `BrowserProcessId`, `Environment8::GetProcessInfos`, `GetProcessExtendedInfos` | MS doc + bindings | VERIFIED (exists); attribution semantics UNCERTAIN |
| CDP method/events | no | no | `CallDevToolsProtocolMethod`, `GetDevToolsProtocolEventReceiver` | MS doc | VERIFIED |
| Remote debugging for Playwright | `additional_browser_args` or env var | yes | env options | MS/Playwright docs | VERIFIED; fidelity limits stated |
| Background throttling control | `background_throttling` **unsupported on Windows** | — | browser flags only (dev-only) | tauri src | VERIFIED |
| Remote content IPC denial | ACL: remote origins need explicit `remote` capability | — | — | tauri src + docs | VERIFIED (code); end-to-end UNCERTAIN → P3 tests |

## 10. Contradictions / updates to the owner's decisions and initial risk list

1. **Risk #1 (profile at creation unreachable)** — partly resolved, partly confirmed: WebView2 profile
   *is* creation-time only; **wry 0.57 supports it, Tauri 2.12.1 does not**; an open Tauri PR (#16054)
   would add it. Q7 is achievable only via (a) waiting, (b) patching tauri-runtime-wry, or (c) creating
   tab controllers ourselves with raw COM. Needs an owner decision/ADR before P2/P3.
2. **Risk #3** — MemoryUsageTargetLevel is in wry but not Tauri; TrySuspend is in neither. Still raw COM + `unsafe`. Confirmed.
3. **Risk #2** — confirmed and sharpened: `unstable` still gates `add_child` even in Tauri 3 alpha; 23
   open `unstable` issues incl. Windows focus (#13466), resize (#12207), z-order (#15682); Windows
   deadlock if created from sync commands/handlers.
4. **New risk:** `on_navigation` allows URLs that fail `url::Url` parsing (fail-open) — the security
   engine must not rely solely on it; add raw-COM `NavigationStarting` or a parse-failure test (P3).
5. **New risk:** Tauri gives no network/response hook for https tabs → Q5 network log requires raw COM
   (`WebResourceResponseReceived`) or CDP.
6. **New risk:** all webviews sharing a UDF need identical environment options; `additional_browser_args`
   (e.g. a benchmark-only `--remote-debugging-port`) must be applied to shell and all tabs together.
7. **New risk:** remote-debugging env flags are ignored for elevated processes; energy measurement
   requiring admin must be a separate process.
8. **Fairness note:** `--remote-debugging-port` for Ferrum implies the same for Chrome/Edge (P5).
9. **No back/forward API** in Tauri `Webview` — minor; use `eval` or raw COM.
10. Toolchain floor: Rust ≥ 1.90 for tauri 2.12.1.
