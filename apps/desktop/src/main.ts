// Ferrum shell (trusted web view, label "shell"): tab strip and toolbar. It drives the tabs through the app's commands
// (tab_*) and shows what they report: event "tabs" (the tab list) and event "tab" (one tab view's events, with its
// tab id). The toolbar always describes the active tab; every tab keeps its own toolbar state. P2 tasks p2.2-p2.8,
// P3 task p3.2.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addressText, blockedText, finished, lockFor, tabLabel, webErrorText, type ToolbarState } from "./logic.ts";

type TabEvent = { tab: number } & (
  | { kind: "navigation-starting"; id: number; uri: string; user_initiated: boolean; redirected: boolean; allowed: boolean }
  | { kind: "source-changed"; uri: string }
  | { kind: "navigation-completed"; id: number; uri: string; success: boolean; http_status: number; web_error_status: number }
  | { kind: "history-changed"; can_go_back: boolean; can_go_forward: boolean }
  | { kind: "title-changed"; title: string }
  | { kind: "got-focus" }
  | { kind: "new-window"; uri: string; user_initiated: boolean }
  | { kind: "external-scheme"; uri: string; user_initiated: boolean }
);
// Messages about links (not tied to one tab's view).
type LinkEvent =
  | { kind: "external-request"; uri: string; scheme: string }
  | { kind: "sign-in-offer"; uri: string }
  | { kind: "blocked"; tab: number; uri: string; why: string };

type TabSummary = { id: number; url: string; title: string; loading: boolean; profile: string; can_go_back: boolean; can_go_forward: boolean };
type TabList = { active: number | null; tabs: TabSummary[] };
type NavResult = { outcome: "navigate" | "confirm" | "refused"; url: string | null; note: string | null; reason: string | null };

/** What the toolbar shows for one tab. */
type TabUi = {
  uri: string;
  lastUri: string;
  loading: boolean;
  state: ToolbarState;
  status: string;
  pageLoaded: boolean;
  canBack: boolean;
  canForward: boolean;
  panel: { uri: string; webError: number } | null;
};
const newUi = (): TabUi => ({
  uri: "", lastUri: "", loading: false, state: "idle", status: "", pageLoaded: false, canBack: false, canForward: false, panel: null,
});

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const top = $<HTMLDivElement>("top");
const tabsEl = $<HTMLDivElement>("tabs");
const newTab = $<HTMLButtonElement>("new-tab");
const statusEl = $<HTMLSpanElement>("status");
const extBar = $<HTMLDivElement>("external-bar");
const extText = $<HTMLSpanElement>("external-text");
const extUri = $<HTMLElement>("external-uri");
const extOpen = $<HTMLButtonElement>("external-open");
const extCancel = $<HTMLButtonElement>("external-cancel");
const address = $<HTMLInputElement>("address");
const form = $<HTMLFormElement>("address-form");
const back = $<HTMLButtonElement>("back");
const forward = $<HTMLButtonElement>("forward");
const reload = $<HTMLButtonElement>("reload");
const lock = $<HTMLSpanElement>("lock");
const toolbar = $<HTMLElement>("toolbar");
const panel = $<HTMLElement>("error-panel");
const emptyPanel = $<HTMLElement>("empty-panel");
const errorText = $<HTMLParagraphElement>("error-text");
const errorAddress = $<HTMLParagraphElement>("error-address");
const errorCode = $<HTMLParagraphElement>("error-code");
const retry = $<HTMLButtonElement>("error-retry");

const ui = new Map<number, TabUi>();
let list: TabList = { active: null, tabs: [] };
const uiOf = (id: number): TabUi => {
  let u = ui.get(id);
  if (!u) ui.set(id, (u = newUi()));
  return u;
};
const activeUi = (): TabUi | undefined => (list.active === null ? undefined : uiOf(list.active));

// --- Layout: tell the app how much room the top band takes (tab views fill the rest). ---
let reported = -1;
function reportLayout(): void {
  const h = Math.ceil(top.getBoundingClientRect().height);
  if (h === reported) return;
  reported = h;
  void invoke("shell_layout", { top: h, left: 0 });
}
new ResizeObserver(reportLayout).observe(top);

// --- Toolbar for the active tab. ---
function render(): void {
  const u = activeUi();
  const none = list.active === null;
  emptyPanel.hidden = !none;
  toolbar.dataset.state = u?.state ?? "idle";
  reload.textContent = u?.loading ? "✕" : "↻";
  reload.title = u?.loading ? "Stop" : "Reload";
  reload.setAttribute("aria-label", reload.title);
  reload.disabled = none;
  back.disabled = !u?.canBack;
  forward.disabled = !u?.canForward;
  if (document.activeElement !== address) address.value = addressText(u?.uri ?? "");
  const l = lockFor(u?.uri ?? "", u?.pageLoaded ?? false);
  lock.textContent = l.text;
  lock.title = l.title;
  statusEl.textContent = u?.status ?? "";
  if (u?.panel) {
    errorText.textContent = webErrorText(u.panel.webError);
    errorAddress.textContent = u.panel.uri;
    errorCode.textContent = `WebView2 error status ${u.panel.webError}`;
    panel.hidden = false;
  } else {
    panel.hidden = true;
  }
}

// --- Tab strip. ---
function renderStrip(): void {
  tabsEl.replaceChildren(
    ...list.tabs.map((t) => {
      const el = document.createElement("div");
      el.className = "tab";
      el.setAttribute("role", "tab");
      el.dataset.id = String(t.id);
      el.setAttribute("aria-selected", String(t.id === list.active));
      el.title = t.url;
      const label = document.createElement("span");
      label.className = "tab-label";
      label.textContent = tabLabel(t.title, t.url);
      if (t.loading) el.classList.add("loading");
      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.title = "Close tab (Ctrl+W)";
      close.setAttribute("aria-label", `Close ${label.textContent}`);
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        void invoke("tab_close", { id: t.id });
      });
      el.addEventListener("click", () => void invoke("tab_activate", { id: t.id }));
      el.addEventListener("auxclick", (e) => {
        if (e.button === 1) void invoke("tab_close", { id: t.id });
      });
      el.append(label, close);
      return el;
    }),
  );
}

function applyList(next: TabList): void {
  const switched = next.active !== list.active;
  list = next;
  for (const t of list.tabs) {
    const u = uiOf(t.id);
    u.canBack = t.can_go_back;
    u.canForward = t.can_go_forward;
    if (!u.uri) u.uri = t.url;
  }
  for (const id of [...ui.keys()]) if (!list.tabs.some((t) => t.id === id)) ui.delete(id);
  if (switched && document.activeElement === address) address.blur();
  renderStrip();
  render();
}

// --- Events. ---
// The events the shell received, kept in this web view's title for the built-in self-test (not shown to users: the
// window title is set by the app, not by this page).
const received: [string, string][] = [];

async function showPanelFor(id: number, uri: string, webError: number): Promise<void> {
  uiOf(id).panel = { uri, webError };
  if (id === list.active) render();
  await invoke("shell_cover", { cover: true, tab: id });
}
async function hidePanelFor(id: number): Promise<void> {
  const u = uiOf(id);
  if (!u.panel) return;
  u.panel = null;
  if (id === list.active) render();
  await invoke("shell_cover", { cover: false, tab: id });
}

await listen<TabEvent>("tab", async (e) => {
  const ev = e.payload;
  const uri = "uri" in ev ? ev.uri : "";
  received.push([ev.kind, uri]);
  document.title = "EVENTS:" + JSON.stringify(received.slice(-200));
  const u = uiOf(ev.tab);
  switch (ev.kind) {
    case "navigation-starting":
      if (ev.allowed) {
        u.lastUri = ev.uri;
        u.pageLoaded = false;
        u.loading = true;
        u.state = "loading";
        u.status = "Loading…";
        void hidePanelFor(ev.tab);
      } else if (extBar.hidden || extUri.textContent !== ev.uri) {
        // (A link to another app is not "blocked": the confirmation bar is asking about it.)
        u.status = blockedText(ev.uri);
      }
      break;
    case "source-changed":
      u.uri = ev.uri;
      break;
    case "navigation-completed": {
      u.loading = false;
      // The final address (after redirects): a redirect back to the current address raises no source-changed.
      if (ev.uri) u.uri = ev.uri;
      // A site's own error page stays with a toolbar note; no page at all gets the shell's panel (logic.ts).
      const f = finished(ev.success, ev.http_status, ev.web_error_status);
      u.state = f.state;
      u.status = f.status;
      u.pageLoaded = f.pageLoaded;
      if (f.panel) await showPanelFor(ev.tab, u.lastUri, ev.web_error_status);
      break;
    }
    case "history-changed":
      u.canBack = ev.can_go_back;
      u.canForward = ev.can_go_forward;
      break;
    default:
      return;
  }
  if (ev.tab === list.active) render();
});

await listen<LinkEvent>("link", async (e) => {
  const ev = e.payload;
  received.push([ev.kind, ev.uri]);
  document.title = "EVENTS:" + JSON.stringify(received.slice(-200));
  const u = activeUi();
  switch (ev.kind) {
    case "external-request":
      if (u) u.status = "";
      await showExternal(ev.uri);
      break;
    case "sign-in-offer":
      if (u) u.status = "";
      await showExternal(ev.uri, true);
      break;
    case "blocked":
      // The note belongs to the tab that asked (which may no longer be the active one).
      uiOf(ev.tab).status = ev.why === "pop-up" ? "Pop-up blocked" : blockedText(ev.uri);
      break;
  }
  render();
});

await listen<TabList>("tabs", (e) => applyList(e.payload));

// --- The confirmation bar for links to other apps (p2.10): part of the top band, so it never covers a page. ---
async function showExternal(uri: string, signIn = false): Promise<void> {
  extBar.dataset.kind = signIn ? "sign-in" : "external";
  extText.textContent = signIn ? "Google sign-in must open in your normal browser." : "Open this link outside Ferrum?";
  extOpen.textContent = signIn ? "Open in browser" : "Open";
  extUri.textContent = uri;
  extUri.title = uri;
  extBar.hidden = false;
  reportLayout();
  extOpen.focus();
}
function hideExternal(): void {
  if (extBar.hidden) return;
  extBar.hidden = true;
  reportLayout();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = address.value;
  address.blur(); // let the address bar follow the page from now on
  const r = await invoke<NavResult>("tab_navigate", { input });
  const u = activeUi();
  if (r.outcome === "navigate") {
    // The navigation-starting event usually arrives before this reply; keep its "Loading…" (owner checklist 2026-10-12).
    if (u && r.note === "upgraded-from-http") u.status = "Using the secure https address";
    else if (u && !u.loading) u.status = "";
  } else if (r.outcome === "refused" && u) {
    u.status = "Not loaded: " + (r.reason ?? "unknown");
  } else if (r.outcome === "refused") {
    statusEl.textContent = "Not loaded: " + (r.reason ?? "unknown");
    return;
  }
  render();
});

address.addEventListener("focus", () => {
  address.select();
  void invoke("shell_focused");
});

extOpen.addEventListener("click", async () => {
  const uri = extUri.textContent ?? "";
  hideExternal();
  const u = activeUi();
  try {
    await invoke("external_open_confirm", { uri });
    if (u) u.status = "Opened in another app";
  } catch (err) {
    if (u) u.status = "Not opened: " + String(err);
  }
  render();
});
extCancel.addEventListener("click", async () => {
  hideExternal();
  await invoke("external_cancel");
  const u = activeUi();
  if (u) u.status = "";
  render();
});

retry.addEventListener("click", async () => {
  if (list.active === null) return;
  await hidePanelFor(list.active);
  await invoke("tab_reload");
});

back.addEventListener("click", () => void invoke("tab_back"));
forward.addEventListener("click", () => void invoke("tab_forward"));
reload.addEventListener("click", () => void invoke(activeUi()?.loading ? "tab_stop" : "tab_reload"));
newTab.addEventListener("click", async () => {
  await invoke("tab_new", { url: null });
  address.focus();
});

// Start: the tab list the app already has, then report the layout.
applyList(await invoke<TabList>("tab_list"));
reportLayout();

// The shell is the only web view allowed to use the app bridge (capability shell.json, p2.3).
invoke<string>("app_ping")
  .then((v) => {
    if (v !== "pong") statusEl.textContent = "Bridge answered unexpectedly";
  })
  .catch(() => {
    statusEl.textContent = "Bridge not available";
  });
