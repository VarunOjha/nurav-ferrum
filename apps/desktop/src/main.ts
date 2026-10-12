// Ferrum shell (trusted web view, label "shell"): tab strip and toolbar. It drives the tabs through the app's commands
// (tab_*) and shows what they report: event "tabs" (the tab list) and event "tab" (one tab view's events, with its
// tab id). The toolbar always describes the active tab; every tab keeps its own toolbar state. P2 tasks p2.2-p2.8,
// P3 tasks p3.2 (tabs) and p3.3 (strip and shortcuts).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addressText, blockedText, downloadText, finished, historyLines, linesOf, lockFor, shortcutFor, tabLabel, webErrorText, type ToolbarState } from "./logic.ts";

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
  | { kind: "blocked"; tab: number; uri: string; why: string }
  | { kind: "cross-site"; tab: number; uri: string; to: string; from: string };

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
/** The tab the settings screen covers (p3.14), if it is open. */
let settingsCovering: number | null = null;
let list: TabList = { active: null, tabs: [] };
const uiOf = (id: number): TabUi => {
  let u = ui.get(id);
  if (!u) ui.set(id, (u = newUi()));
  return u;
};
const activeUi = (): TabUi | undefined => (list.active === null ? undefined : uiOf(list.active));

// --- Layout: tell the app how much room the top band takes (tab views fill the rest). ---
let reported = "";
function reportLayout(): void {
  const h = Math.ceil(top.getBoundingClientRect().height);
  // The sidebar's width (p3.15): tab views start to its right, so they never overlap it.
  const side = document.getElementById("sidebar");
  const w = side && !side.hidden ? Math.ceil(side.getBoundingClientRect().width) : 0;
  const key = `${h}x${w}`;
  if (key === reported) return;
  reported = key;
  void invoke("shell_layout", { top: h, left: w });
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
      // Drag a tab to reorder the strip.
      el.draggable = true;
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData("text/x-ferrum-tab", String(t.id));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer?.getData("text/x-ferrum-tab"));
        const to = list.tabs.findIndex((x) => x.id === t.id);
        if (from && from !== t.id && to >= 0) void invoke("tab_move", { id: from, to });
      });
      el.addEventListener("auxclick", (e) => {
        if (e.button === 1) void invoke("tab_close", { id: t.id });
      });
      el.append(label, close);
      return el;
    }),
  );
}

function applyList(next: TabList): void {
  // Switching tabs closes the settings screen (it covers the tab that was active). Looked up directly: tab lists can
  // arrive while this script is still starting, before the settings code below has run.
  const sp = document.getElementById("settings-panel");
  if (sp && !sp.hidden && next.active !== settingsCovering) void closeSettings();
  // A switch between two tabs (not the first tab list at start, which must not wipe an address being typed).
  const switched = list.active !== null && next.active !== list.active;
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
  // The sidebar's tab list follows too (looked up directly: lists can arrive while this script is still starting).
  const side = document.getElementById("sidebar");
  if (side && !side.hidden) {
    renderSideTabs();
    void renderSideHistory();
  }
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
    case "cross-site":
      await showCrossSite(ev.uri, ev.to);
      break;
    case "blocked":
      // The note belongs to the tab that asked (which may no longer be the active one).
      uiOf(ev.tab).status = ev.why === "pop-up" ? "Pop-up blocked" : blockedText(ev.uri);
      break;
  }
  render();
});

await listen<TabList>("tabs", (e) => applyList(e.payload));

// --- Downloads (p3.8): one line each in the top band; the app saves the files (downloads.rs). ---
type DownloadMsg =
  | { kind: "started"; download: number; tab: number; file: string; path: string; total: number; received: number; replaces: number | null }
  | { kind: "progress"; download: number; received: number; total: number }
  | { kind: "completed" | "failed"; download: number; file: string; path: string; received: number; reason: number };
type DownloadLine = { file: string; path: string; received: number; total: number; state: "running" | "completed" | "failed" };
const downloadsEl = $<HTMLDivElement>("downloads");
const downloadList = $<HTMLUListElement>("download-list");
const downloadLines = new Map<number, DownloadLine>();
function renderDownloads(): void {
  downloadList.replaceChildren(
    ...[...downloadLines.entries()].map(([id, d]) => {
      const li = document.createElement("li");
      li.dataset.download = String(id);
      li.dataset.state = d.state;
      li.title = d.path;
      const name = document.createElement("span");
      name.className = "dl-file";
      name.textContent = d.file;
      const state = document.createElement("span");
      state.className = "dl-state";
      state.textContent = downloadText(d.state, d.received, d.total);
      li.append(name, state);
      return li;
    }),
  );
  const show = downloadLines.size > 0;
  if (downloadsEl.hidden === show) {
    downloadsEl.hidden = !show;
    reportLayout();
  }
}
await listen<DownloadMsg>("download", (e) => {
  const m = e.payload;
  const d = downloadLines.get(m.download);
  if (m.kind === "started") {
    // A retry of a download that broke off replaces the older line (the app tells which).
    if (m.replaces !== null) downloadLines.delete(m.replaces);
    downloadLines.set(m.download, { file: m.file, path: m.path, received: 0, total: m.total, state: "running" });
  } else if (d && m.kind === "progress") {
    d.received = m.received;
    d.total = m.total;
  } else if (m.kind === "completed" || m.kind === "failed") {
    const line = d ?? { file: m.file, path: m.path, received: 0, total: -1, state: "running" as const };
    line.received = m.received;
    line.state = m.kind;
    downloadLines.set(m.download, line);
  }
  renderDownloads();
});
$<HTMLButtonElement>("downloads-clear").addEventListener("click", () => {
  for (const [id, d] of downloadLines) if (d.state !== "running") downloadLines.delete(id);
  renderDownloads();
});

// --- Keyboard shortcuts (p3.3). Keys pressed inside a page are handled by the app (WebView2 accelerator keys); keys
// pressed in the shell are handled here, with the same table (logic.ts). ---
function focusAddress(): void {
  address.focus();
  address.select();
}
async function runShortcut(name: string): Promise<void> {
  const select = name.match(/^select-tab-(\d)$/);
  if (select) {
    const t = list.tabs[Number(select[1]) - 1];
    if (t) await invoke("tab_activate", { id: t.id });
    return;
  }
  switch (name) {
    case "new-tab":
      await invoke("tab_new", { url: null });
      focusAddress();
      break;
    case "close-tab":
      await invoke("tab_close", { id: null });
      break;
    case "next-tab":
      await invoke("tab_next");
      break;
    case "previous-tab":
      await invoke("tab_previous");
      break;
    case "reopen-tab":
      await invoke("tab_reopen");
      break;
    case "last-tab": {
      const t = list.tabs[list.tabs.length - 1];
      if (t) await invoke("tab_activate", { id: t.id });
      break;
    }
    case "focus-address":
      focusAddress();
      break;
    case "back":
      await invoke("tab_back");
      break;
    case "forward":
      await invoke("tab_forward");
      break;
    case "reload":
      await invoke("tab_reload");
      break;
    default:
      shellCommand(name);
  }
}
/** Shell-only actions: also sent by the app for shortcuts pressed inside a page. */
function shellCommand(action: string): void {
  if (action === "focus-address") focusAddress();
  if (action === "settings") void openSettings();
  if (action === "toggle-sidebar") void toggleSidebar();
}

// --- Sidebar (p3.15): open tabs and history, left of the content area. ---
type HistoryEntry = { url: string; title: string; visited_at: number };
const sidebar = $<HTMLElement>("sidebar");
const sidebarBtn = $<HTMLButtonElement>("sidebar-btn");
const sideTabs = $<HTMLUListElement>("side-tabs");
const sideHistory = $<HTMLUListElement>("side-history");
const sideSearch = $<HTMLInputElement>("side-search");
function sideButton(label: string, url: string, onClick: () => void, current = false): HTMLLIElement {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.title = url;
  if (current) b.setAttribute("aria-current", "true");
  const name = document.createElement("span");
  name.textContent = label;
  const addr = document.createElement("span");
  addr.className = "side-url";
  addr.textContent = url;
  b.append(name, addr);
  b.addEventListener("click", onClick);
  li.append(b);
  return li;
}
function renderSideTabs(): void {
  if (sidebar.hidden) return;
  sideTabs.replaceChildren(...list.tabs.map((t) =>
    sideButton(tabLabel(t.title, t.url), t.url, () => void invoke("tab_activate", { id: t.id }), t.id === list.active)));
}
async function renderSideHistory(): Promise<void> {
  if (sidebar.hidden) return;
  const entries = await invoke<HistoryEntry[]>("history_list", { query: sideSearch.value || null, limit: 200 });
  sideHistory.replaceChildren(...historyLines(entries).map((h) =>
    sideButton(h.label, h.url, () => void invoke("tab_navigate", { input: h.url }))));
}
async function toggleSidebar(): Promise<void> {
  sidebar.hidden = !sidebar.hidden;
  sidebarBtn.setAttribute("aria-expanded", String(!sidebar.hidden));
  reportLayout();
  renderSideTabs();
  await renderSideHistory();
}
sidebarBtn.addEventListener("click", () => void toggleSidebar());
sideSearch.addEventListener("input", () => void renderSideHistory());
$<HTMLButtonElement>("side-clear").addEventListener("click", async () => {
  await invoke("history_clear");
  await renderSideHistory();
});

// --- Settings (p3.14): shown in the content area; the app checks and saves (settings.rs). ---
type SiteRow = { site: string; profile: string };
type SettingsView = {
  startup_urls: string[]; restore_on_startup: boolean; sites: SiteRow[]; download_folder: string;
  default_download_folder: string; isolation: string; file: string;
};
const settingsPanel = $<HTMLElement>("settings-panel");
const settingsForm = $<HTMLFormElement>("settings-form");
const setStartup = $<HTMLTextAreaElement>("set-startup");
const setRestore = $<HTMLInputElement>("set-restore");
const setSitesBody = document.querySelector("#set-sites tbody") as HTMLTableSectionElement;
const setFolder = $<HTMLInputElement>("set-folder");
const settingsErrors = $<HTMLUListElement>("settings-errors");
const settingsStatus = $<HTMLSpanElement>("settings-status");
function siteRow(r: SiteRow): HTMLTableRowElement {
  const tr = document.createElement("tr");
  const cell = (value: string, cls: string, label: string) => {
    const td = document.createElement("td");
    const i = document.createElement("input");
    i.type = "text";
    i.className = cls;
    i.value = value;
    i.spellcheck = false;
    i.setAttribute("aria-label", label);
    td.append(i);
    return td;
  };
  const del = document.createElement("td");
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = "Remove";
  b.addEventListener("click", () => tr.remove());
  del.append(b);
  tr.append(cell(r.site, "set-site", "Site"), cell(r.profile, "set-profile", "Named profile"), del);
  return tr;
}
function fillSettings(v: SettingsView): void {
  setStartup.value = v.startup_urls.join("\n");
  setRestore.checked = v.restore_on_startup;
  setSitesBody.replaceChildren(...v.sites.map(siteRow));
  setFolder.value = v.download_folder;
  setFolder.placeholder = v.default_download_folder;
  $<HTMLParagraphElement>("set-isolation").textContent =
    v.isolation === "per-site" ? "Each site keeps its own cookies and storage. Sites given the same named profile share one."
      : "All sites share one profile (isolation is off in the settings file).";
  $<HTMLParagraphElement>("set-file").textContent = v.file ? `Saved to ${v.file}` : "";
}
async function openSettings(): Promise<void> {
  fillSettings(await invoke<SettingsView>("settings_get"));
  settingsErrors.replaceChildren();
  settingsStatus.textContent = "";
  settingsPanel.hidden = false;
  if (list.active !== null && settingsCovering === null) {
    settingsCovering = list.active;
    await invoke("shell_cover", { cover: true, tab: settingsCovering });
  }
  setStartup.focus();
}
async function closeSettings(): Promise<void> {
  if (settingsPanel.hidden) return;
  settingsPanel.hidden = true;
  if (settingsCovering !== null) {
    const id = settingsCovering;
    settingsCovering = null;
    // Keep the tab hidden if its own error panel still covers it.
    if (!uiOf(id).panel) await invoke("shell_cover", { cover: false, tab: id });
  }
}
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input: SettingsView = {
    startup_urls: linesOf(setStartup.value),
    restore_on_startup: setRestore.checked,
    sites: [...setSitesBody.querySelectorAll("tr")].map((tr) => ({
      site: (tr.querySelector(".set-site") as HTMLInputElement).value,
      profile: (tr.querySelector(".set-profile") as HTMLInputElement).value,
    })),
    download_folder: setFolder.value,
    default_download_folder: "", isolation: "", file: "",
  };
  try {
    fillSettings(await invoke<SettingsView>("settings_set", { input }));
    settingsErrors.replaceChildren();
    settingsStatus.textContent = "Saved";
  } catch (err) {
    const problems = Array.isArray(err) ? (err as string[]) : [String(err)];
    settingsErrors.replaceChildren(...problems.map((p) => Object.assign(document.createElement("li"), { textContent: p })));
    settingsStatus.textContent = "Not saved";
  }
});
$<HTMLButtonElement>("set-add-site").addEventListener("click", () => setSitesBody.append(siteRow({ site: "", profile: "" })));
$<HTMLButtonElement>("settings-close").addEventListener("click", () => void closeSettings());
$<HTMLButtonElement>("settings-btn").addEventListener("click", () => void openSettings());
document.addEventListener("keydown", (e) => {
  const name = shortcutFor({ key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });
  if (!name) return;
  e.preventDefault(); // also stops the shell web view's own handling (F5 must not reload the shell)
  if (e.repeat && name !== "next-tab" && name !== "previous-tab") return;
  void runShortcut(name);
});
await listen<{ action: string }>("shell-command", (e) => shellCommand(e.payload.action));

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
/** Asks before a tab moves to another site's profile (p3.6, owner answer Q-209). */
async function showCrossSite(uri: string, to: string): Promise<void> {
  extBar.dataset.kind = "cross-site";
  extText.textContent = `Open ${to} in its own profile? This tab's back history will be lost.`;
  extOpen.textContent = "Continue";
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
  const kind = extBar.dataset.kind;
  hideExternal();
  if (kind === "cross-site") {
    await invoke("cross_site_confirm", { uri }).catch(() => {});
    return;
  }
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
  const kind = extBar.dataset.kind;
  hideExternal();
  await invoke(kind === "cross-site" ? "cross_site_cancel" : "external_cancel");
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
