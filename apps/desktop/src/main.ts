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

let loading = false;
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

function showAddress(uri: string): void {
  if (document.activeElement !== address) address.value = uri === "about:blank" ? "" : uri;
  const secure = uri.startsWith("https:");
  lock.textContent = secure ? "\u{1f512}" : uri.startsWith("http:") ? "⚠" : "";
  lock.title = secure ? "Secure connection" : uri.startsWith("http:") ? "Not secure" : "";
}

await listen<TabEvent>("tab", (e) => {
  const ev = e.payload;
  const uri = "uri" in ev ? ev.uri : "";
  received.push([ev.kind, uri]);
  document.title = "EVENTS:" + JSON.stringify(received.slice(-200));
  switch (ev.kind) {
    case "navigation-starting":
      if (ev.allowed) {
        setLoading(true);
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
      statusEl.textContent = ev.success ? "" : "The page could not be loaded";
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
