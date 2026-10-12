// Ferrum shell (trusted web view, label "shell"): the toolbar. It drives the content view through the app's
// commands (tab_*) and shows what the content view reports (event "tab"). P2 tasks p2.2-p2.8.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type TabEvent =
  | { kind: "navigation-starting"; id: number; uri: string; user_initiated: boolean; redirected: boolean; allowed: boolean }
  | { kind: "source-changed"; uri: string }
  | { kind: "navigation-completed"; id: number; success: boolean; http_status: number; web_error_status: number }
  | { kind: "history-changed"; can_go_back: boolean; can_go_forward: boolean }
  | { kind: "title-changed"; title: string }
  | { kind: "got-focus" };

type NavResult = { outcome: "navigate" | "confirm" | "refused"; url: string | null; note: string | null; reason: string | null };

const statusEl = document.getElementById("status") as HTMLSpanElement;
const address = document.getElementById("address") as HTMLInputElement;
const form = document.getElementById("address-form") as HTMLFormElement;
const back = document.getElementById("back") as HTMLButtonElement;
const forward = document.getElementById("forward") as HTMLButtonElement;
const reload = document.getElementById("reload") as HTMLButtonElement;
const lock = document.getElementById("lock") as HTMLSpanElement;
const toolbar = document.getElementById("toolbar") as HTMLElement;
const panel = document.getElementById("error-panel") as HTMLElement;
const errorText = document.getElementById("error-text") as HTMLParagraphElement;
const errorAddress = document.getElementById("error-address") as HTMLParagraphElement;
const errorCode = document.getElementById("error-code") as HTMLParagraphElement;
const retry = document.getElementById("error-retry") as HTMLButtonElement;

let loading = false;
let lastUri = "";
let covered = false;

type State = "idle" | "loading" | "loaded" | "http-error" | "failed";
function setState(st: State): void {
  toolbar.dataset.state = st;
}

// WebView2 web error status codes (COREWEBVIEW2_WEB_ERROR_STATUS) in plain words. 14 = cancelled (not an error).
const WEB_ERRORS: Record<number, string> = {
  1: "The site's certificate does not match its name. Ferrum does not offer a way around certificate errors.",
  2: "The site's certificate has expired. Ferrum does not offer a way around certificate errors.",
  3: "The client certificate has errors.",
  4: "The site's certificate was revoked. Ferrum does not offer a way around certificate errors.",
  5: "The site's certificate is not valid. Ferrum does not offer a way around certificate errors.",
  6: "The server could not be reached.",
  7: "The server took too long to answer.",
  8: "The server sent an answer Ferrum could not read.",
  9: "The connection was interrupted.",
  10: "The connection was reset.",
  11: "The connection was lost. Check the network and try again.",
  12: "Ferrum could not connect to the server.",
  13: "The site's name could not be found. Check the address or the network.",
  15: "The site redirected too many times (a redirect loop).",
  16: "Something unexpected went wrong.",
  17: "The site asks for a sign-in Ferrum cannot show yet.",
  18: "The proxy asks for a sign-in.",
};

/** Shows or hides the shell's own error panel; the app hides the content view while the panel covers it. */
async function showPanel(uri: string, webError: number): Promise<void> {
  errorText.textContent = WEB_ERRORS[webError] ?? "The page could not be loaded.";
  errorAddress.textContent = uri;
  errorCode.textContent = `WebView2 error status ${webError}`;
  panel.hidden = false;
  covered = true;
  await invoke("shell_cover", { cover: true });
}
async function hidePanel(): Promise<void> {
  if (!covered) return;
  panel.hidden = true;
  covered = false;
  await invoke("shell_cover", { cover: false });
}
// The events the shell received, kept in this web view's title for the built-in self-test (not shown to users:
// the window title is set by the app, not by this page).
const received: [string, string][] = [];

function setLoading(on: boolean): void {
  loading = on;
  reload.textContent = on ? "✕" : "↻";
  reload.title = on ? "Stop" : "Reload";
  reload.setAttribute("aria-label", reload.title);
  reload.disabled = false;
}

let currentUri = "";
function showAddress(uri: string): void {
  currentUri = uri;
  if (document.activeElement !== address) address.value = uri === "about:blank" ? "" : uri;
}

/** The lock describes a page that actually loaded: set on success, cleared otherwise. */
function showLock(loaded: boolean): void {
  const secure = loaded && currentUri.startsWith("https:");
  const insecure = loaded && currentUri.startsWith("http:");
  lock.textContent = secure ? "\u{1f512}" : insecure ? "⚠" : "";
  lock.title = secure ? "Secure connection" : insecure ? "Not secure" : "";
}

await listen<TabEvent>("tab", async (e) => {
  const ev = e.payload;
  const uri = "uri" in ev ? ev.uri : "";
  received.push([ev.kind, uri]);
  document.title = "EVENTS:" + JSON.stringify(received.slice(-200));
  switch (ev.kind) {
    case "navigation-starting":
      if (ev.allowed) {
        lastUri = ev.uri;
        showLock(false);
        void hidePanel();
        setLoading(true);
        setState("loading");
        statusEl.textContent = "Loading…";
      } else {
        statusEl.textContent = "Blocked: " + ev.uri.split(":")[0] + " address";
      }
      break;
    case "source-changed":
      showAddress(ev.uri);
      break;
    case "navigation-completed":
      setLoading(false);
      if (ev.http_status >= 400) {
        // The site answered with an error page of its own: show it, and say so in the toolbar.
        setState("http-error");
        statusEl.textContent = `This page answered ${ev.http_status}`;
        showLock(true);
      } else if (!ev.success && ev.web_error_status !== 14) {
        // No page at all (network, name, certificate, redirect loop): the shell draws the error itself.
        setState("failed");
        statusEl.textContent = "Not loaded";
        showLock(false); // no page was loaded, so there is no secure connection to show
        await showPanel(lastUri, ev.web_error_status);
      } else {
        setState(ev.success ? "loaded" : "idle");
        statusEl.textContent = "";
        showLock(ev.success);
      }
      break;
    case "history-changed":
      back.disabled = !ev.can_go_back;
      forward.disabled = !ev.can_go_forward;
      break;
    case "title-changed":
      break;
    case "got-focus":
      break;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await invoke<NavResult>("tab_navigate", { input: address.value });
  if (r.outcome === "navigate") {
    statusEl.textContent = r.note === "upgraded-from-http" ? "Using the secure https address" : "";
    address.blur();
  } else if (r.outcome === "confirm") {
    statusEl.textContent = "This link opens another app (confirmation arrives in a later step)";
  } else {
    statusEl.textContent = "Not loaded: " + (r.reason ?? "unknown");
  }
});

address.addEventListener("focus", () => {
  address.select();
  void invoke("shell_focused");
});

retry.addEventListener("click", async () => {
  await hidePanel();
  await invoke("tab_reload");
});

back.addEventListener("click", () => void invoke("tab_back"));
forward.addEventListener("click", () => void invoke("tab_forward"));
reload.addEventListener("click", () => void invoke(loading ? "tab_stop" : "tab_reload"));

// The shell is the only web view allowed to use the app bridge (capability shell.json, p2.3).
invoke<string>("app_ping")
  .then((v) => {
    statusEl.textContent = v === "pong" ? "" : "Bridge answered unexpectedly";
  })
  .catch(() => {
    statusEl.textContent = "Bridge not available";
  });
