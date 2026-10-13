// Ferrum shell (trusted web view, label "shell"): tab strip and toolbar. It drives the tabs through the app's commands
// (tab_*) and shows what they report: event "tabs" (the tab list) and event "tab" (one tab view's events, with its
// tab id). The toolbar always describes the active tab; every tab keeps its own toolbar state. P2 tasks p2.2-p2.8,
// P3 tasks p3.2 (tabs) and p3.3 (strip and shortcuts).
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ACCENTS, DENSITIES, THEMES, applyLook } from "./themes.ts";
import { addressText, agoText, blockedText, bookmarkFolders, canBookmark, downloadText, finished, highlight, historyLines, iconSrc, linesOf, lockFor, shortcutFor, showedPage, suggestionGroups, tabLabel, webErrorText, wordsOf, type Bookmark, type Suggestion, type SuggestionGroup, type ToolbarState } from "./logic.ts";

type TabEvent = { tab: number } & (
  | { kind: "navigation-starting"; id: number; uri: string; user_initiated: boolean; redirected: boolean; allowed: boolean }
  | { kind: "source-changed"; uri: string }
  | { kind: "navigation-completed"; id: number; uri: string; success: boolean; http_status: number; web_error_status: number }
  | { kind: "history-changed"; can_go_back: boolean; can_go_forward: boolean }
  | { kind: "title-changed"; title: string }
  | { kind: "favicon"; icon: string }
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
  /** The site's icon (a PNG data address from the app), or "". */
  icon: string;
  /** A web page loaded in this tab at some point (p3.16). */
  hadPage: boolean;
  /** When a download from this tab last started (ms), so its navigation's end is not shown as an error. */
  downloadAt: number;
};
const newUi = (): TabUi => ({
  uri: "", lastUri: "", loading: false, state: "idle", status: "", pageLoaded: false, canBack: false, canForward: false, panel: null,
  icon: "", hadPage: false, downloadAt: 0,
});
/** How long after a download started a failed navigation of its tab counts as "became the download". */
const DOWNLOAD_GRACE_MS = 3000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// --- Look (p3.22, adr-0033): the theme's tokens are set before anything else draws; light or dark follows Windows. ---
type Appearance = { bookmarks_bar: boolean; bar_folder: string; theme: string; accent: string; density: string };
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let look = { theme: "graphite", accent: "orange", density: "roomy" };
const paint = () => applyLook(document.documentElement, { ...look, mode: darkQuery.matches ? "dark" : "light" });
paint();
darkQuery.addEventListener("change", paint);
const top = $<HTMLDivElement>("top");
const tabsEl = $<HTMLDivElement>("tabs");
const newTab = $<HTMLButtonElement>("new-tab");
const statusEl = $<HTMLSpanElement>("status");
const sidebar = $<HTMLElement>("sidebar");
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
// The empty tab whose view the new-tab page hides (declared here, before the first event can arrive).
let newtabCovering: number | null = null;
let list: TabList = { active: null, tabs: [] };
const uiOf = (id: number): TabUi => {
  let u = ui.get(id);
  if (!u) ui.set(id, (u = newUi()));
  return u;
};
/** Small image for a tab's site icon, or null when the tab has none. */
function iconImg(id: number): HTMLImageElement | null {
  const src = iconSrc(uiOf(id).icon);
  if (!src) return null;
  const img = document.createElement("img");
  img.className = "tab-icon";
  img.alt = "";
  img.src = src;
  return img;
}
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
  // The star follows the active tab's page (an event: render can run before the bookmark code below has started).
  document.getElementById("star")?.dispatchEvent(new Event("ferrum-render"));
  renderNewTab();
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
      const icon = iconImg(t.id);
      if (icon) el.append(icon);
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
  const bp = document.getElementById("backup-panel");
  if (bp && !bp.hidden && next.active !== settingsCovering) void closeBackup();
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
  if (settingsCovering === id || newtabCovering === id) return; // another panel still hides this tab's view
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
      if (showedPage(u.uri, f.pageLoaded)) u.hadPage = true;
      // A navigation that turned into a download ends without a page; that is not an error (p3.16).
      if (f.panel && Date.now() - u.downloadAt < DOWNLOAD_GRACE_MS) {
        u.state = "idle";
        u.status = "Downloading…";
      } else if (f.panel) await showPanelFor(ev.tab, u.lastUri, ev.web_error_status);
      break;
    }
    case "favicon":
      u.icon = ev.icon;
      renderStrip();
      renderSideTabs();
      return;
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
// Tabs that exist only for a download (a site opened the file in a new window, p3.16): download -> tab. Such a tab
// closes when its download ends; the download itself does not depend on the tab (webview2.rs keeps it).
const downloadTabs = new Map<number, number>();
async function startedIn(tab: number, download: number, replaces: number | null): Promise<void> {
  const u = uiOf(tab);
  u.downloadAt = Date.now();
  if (replaces !== null) downloadTabs.delete(replaces);
  if (u.panel || u.state === "failed") {
    // The "could not be loaded" panel came just before WebView2 reported the download: take it back.
    u.state = "idle";
    u.status = "Downloading…";
    await hidePanelFor(tab);
  }
  if (!u.hadPage) {
    downloadTabs.set(download, tab);
    u.status = "Downloading…";
  }
  if (tab === list.active) render();
}
function endedIn(download: number): void {
  const tab = downloadTabs.get(download);
  if (tab === undefined) return;
  downloadTabs.delete(download);
  if (list.tabs.some((t) => t.id === tab) && !uiOf(tab).hadPage) void invoke("tab_close", { id: tab });
}
await listen<DownloadMsg>("download", (e) => {
  const m = e.payload;
  const d = downloadLines.get(m.download);
  if (m.kind === "started") {
    // A retry of a download that broke off replaces the older line (the app tells which).
    if (m.replaces !== null) downloadLines.delete(m.replaces);
    downloadLines.set(m.download, { file: m.file, path: m.path, received: 0, total: m.total, state: "running" });
    void startedIn(m.tab, m.download, m.replaces);
  } else if (d && m.kind === "progress") {
    d.received = m.received;
    d.total = m.total;
  } else if (m.kind === "completed" || m.kind === "failed") {
    const line = d ?? { file: m.file, path: m.path, received: 0, total: -1, state: "running" as const };
    line.received = m.received;
    line.state = m.kind;
    downloadLines.set(m.download, line);
    endedIn(m.download);
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
  if (action === "bookmark-page") void bookmarkPage();
  if (action === "toggle-bookmarks-bar") void toggleBookmarksBar();
  if (action === "show-bookmarks") void showBookmarks();
}

// --- Sidebar (p3.15): open tabs and history, left of the content area. ---
type HistoryEntry = { url: string; title: string; visited_at: number };
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
  sideTabs.replaceChildren(...list.tabs.map((t) => {
    const li = sideButton(tabLabel(t.title, t.url), t.url, () => void invoke("tab_activate", { id: t.id }), t.id === list.active);
    const icon = iconImg(t.id);
    if (icon) li.querySelector("button span")?.prepend(icon);
    return li;
  }));
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
  renderSideBookmarks();
  await renderSideHistory();
}
sidebarBtn.addEventListener("click", () => void toggleSidebar());
sideSearch.addEventListener("input", () => void renderSideHistory());
$<HTMLButtonElement>("side-clear").addEventListener("click", async () => {
  await invoke("history_clear");
  await renderSideHistory();
});

// --- Bookmarks (p3.19, adr-0032): kept by the app in ferrum.db; the star, the bookmarks bar (the bar's folder), the
// editor bar (both in the top band, so never under a page) and the sidebar's folders. ---
type AppearanceView = Appearance;
const star = $<HTMLButtonElement>("star");
const bmBar = $<HTMLElement>("bookmarks-bar");
const bmEditor = $<HTMLDivElement>("bm-editor");
const bmName = $<HTMLInputElement>("bm-name");
const bmFolder = $<HTMLInputElement>("bm-folder");
const bmFolders = $<HTMLDataListElement>("bm-folders");
const bmError = $<HTMLSpanElement>("bm-error");
const sideBookmarks = $<HTMLDivElement>("side-bookmarks");
let bookmarks: Bookmark[] = [];
let appearance: AppearanceView = { bookmarks_bar: true, bar_folder: "Favourites bar", theme: "graphite", accent: "orange", density: "roomy" };
/** The bookmark the editor shows. */
let editing: number | null = null;
const activeUrl = (): string => activeUi()?.uri ?? "";
const activeTitle = (): string => list.tabs.find((t) => t.id === list.active)?.title ?? "";
function renderStar(): void {
  const url = activeUrl();
  const b = bookmarks.find((x) => x.url === url);
  star.disabled = !canBookmark(url);
  star.textContent = b ? "\u2605" : "\u2606";
  star.setAttribute("aria-pressed", String(Boolean(b)));
  star.title = b ? "Edit this bookmark (Ctrl+D)" : "Bookmark this page (Ctrl+D)";
}
star.addEventListener("ferrum-render", renderStar);
function openUrl(url: string, e?: MouseEvent): void {
  if (e && (e.button === 1 || e.ctrlKey)) void invoke("tab_new", { url });
  else void invoke("tab_navigate", { input: url });
}
function renderBar(): void {
  const items = bookmarkFolders(bookmarks, appearance.bar_folder)[0]!.items;
  const empty = document.createElement("span");
  empty.className = "bm-empty";
  empty.textContent = "Star a page (Ctrl+D) to keep it here.";
  bmBar.replaceChildren(...(items.length ? items.map((b) => {
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.id = String(b.id);
    a.title = `${b.title}\n${b.url}`;
    a.textContent = b.title;
    a.addEventListener("click", (e) => { e.preventDefault(); openUrl(b.url, e); });
    a.addEventListener("auxclick", (e) => { if (e.button === 1) { e.preventDefault(); openUrl(b.url, e); } });
    return a;
  }) : [empty]));
  const show = appearance.bookmarks_bar;
  if (bmBar.hidden === show) {
    bmBar.hidden = !show;
    reportLayout();
  }
}
function smallButton(cls: string, text: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `bm-small ${cls}`;
  b.textContent = text;
  b.title = label;
  b.setAttribute("aria-label", label);
  b.addEventListener("click", onClick);
  return b;
}
function renderSideBookmarks(): void {
  if (sidebar.hidden) return;
  sideBookmarks.replaceChildren(...bookmarkFolders(bookmarks, appearance.bar_folder).map((f) => {
    const d = document.createElement("details");
    d.open = true;
    d.dataset.folder = f.name;
    const s = document.createElement("summary");
    s.textContent = `${f.name} (${f.items.length})`;
    const ul = document.createElement("ul");
    if (!f.items.length) {
      const li = document.createElement("li");
      li.className = "bm-none";
      li.textContent = "Empty";
      ul.append(li);
    }
    for (const b of f.items) {
      const li = sideButton(b.title, b.url, () => openUrl(b.url));
      li.dataset.id = String(b.id);
      li.querySelector("button")!.classList.add("bm-open");
      li.append(
        smallButton("bm-edit", "Edit", `Edit ${b.title}`, () => openEditor(b)),
        smallButton("bm-delete", "\u00d7", `Remove ${b.title}`, async () => {
          await invoke("bookmark_remove", { id: b.id });
          await loadBookmarks();
        }),
      );
      ul.append(li);
    }
    d.append(s, ul);
    return d;
  }));
}
async function loadBookmarks(): Promise<void> {
  bookmarks = await invoke<Bookmark[]>("bookmark_list");
  renderBar();
  renderSideBookmarks();
  renderStar();
  void fillNewTab();
}
/** Takes the look from the app's appearance settings and repaints. */
function useAppearance(a: AppearanceView): void {
  appearance = a;
  look = { theme: a.theme, accent: a.accent, density: a.density };
  paint();
  renderBar();
  reportLayout();
}
function openEditor(b: Bookmark): void {
  editing = b.id;
  bmName.value = b.title;
  bmFolder.value = b.folder;
  bmFolders.replaceChildren(...bookmarkFolders(bookmarks, appearance.bar_folder).map((f) => {
    const o = document.createElement("option");
    o.value = f.name;
    return o;
  }));
  bmError.textContent = "";
  bmEditor.hidden = false;
  reportLayout();
  bmName.focus();
  bmName.select();
}
function closeEditor(): void {
  if (bmEditor.hidden) return;
  bmEditor.hidden = true;
  editing = null;
  reportLayout();
}
/** The star and Ctrl+D: bookmark the page into the bar's folder, or edit its bookmark. */
async function bookmarkPage(): Promise<void> {
  const url = activeUrl();
  if (!canBookmark(url)) {
    const u = activeUi();
    if (u) {
      u.status = "Only web pages can be bookmarked";
      render();
    }
    return;
  }
  let b = bookmarks.find((x) => x.url === url);
  if (!b) {
    b = await invoke<Bookmark>("bookmark_add", { url, title: activeTitle() || url, folder: null });
    await loadBookmarks();
  }
  openEditor(b);
}
async function toggleBookmarksBar(): Promise<void> {
  useAppearance(await invoke<AppearanceView>("appearance_set", { bookmarksBar: !appearance.bookmarks_bar }));
}
async function showBookmarks(): Promise<void> {
  if (sidebar.hidden) await toggleSidebar();
  $<HTMLElement>("side-bm-title").scrollIntoView({ block: "start" });
  (sideBookmarks.querySelector("button.bm-open") as HTMLButtonElement | null)?.focus();
}
star.addEventListener("click", () => void bookmarkPage());
const bmDone = $<HTMLButtonElement>("bm-done");
bmDone.addEventListener("click", async () => {
  if (editing === null) return;
  try {
    await invoke("bookmark_update", { id: editing, title: bmName.value, folder: bmFolder.value || null });
    closeEditor();
    await loadBookmarks();
  } catch (err) {
    bmError.textContent = String(err);
  }
});
$<HTMLButtonElement>("bm-remove").addEventListener("click", async () => {
  if (editing === null) return;
  await invoke("bookmark_remove", { id: editing });
  closeEditor();
  await loadBookmarks();
});
bmEditor.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeEditor();
  } else if (e.key === "Enter") {
    e.preventDefault();
    bmDone.click();
  }
});

// --- Address-bar suggestions (p3.20): as the user types, open tabs, bookmarks and history in groups. The list is part
// of the top band (the page view moves down while it is open, so it is never hidden under the page). ---
type HistoryHit = { url: string; title: string; visited_at: number };
const suggestEl = $<HTMLDivElement>("suggest");
let suggestions: Suggestion[] = [];
let selected = -1;
let suggestSeq = 0;
let suggestTimer: number | undefined;
function closeSuggest(): void {
  suggestions = [];
  selected = -1;
  address.setAttribute("aria-expanded", "false");
  address.removeAttribute("aria-activedescendant");
  if (!suggestEl.hidden) {
    suggestEl.hidden = true;
    suggestEl.replaceChildren();
    reportLayout();
  }
}
function markSelected(): void {
  suggestEl.querySelectorAll<HTMLElement>(".sg-row").forEach((r, i) => r.setAttribute("aria-selected", String(i === selected)));
  if (selected >= 0) address.setAttribute("aria-activedescendant", `sg-${selected}`);
  else address.removeAttribute("aria-activedescendant");
}
function titleWithMarks(text: string, query: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "sg-title";
  for (const p of highlight(text, query)) span.append(p.hit ? Object.assign(document.createElement("mark"), { textContent: p.text }) : p.text);
  return span;
}
function renderSuggest(groups: SuggestionGroup[], query: string): void {
  suggestions = groups.flatMap((g) => g.items);
  selected = -1;
  if (!suggestions.length) {
    closeSuggest();
    return;
  }
  // Line the list up under the address bar.
  const f = form.getBoundingClientRect();
  suggestEl.style.marginLeft = `${Math.round(f.left)}px`;
  suggestEl.style.width = `${Math.round(f.width)}px`;
  let n = 0;
  const rows: HTMLElement[] = [];
  for (const g of groups) {
    rows.push(Object.assign(document.createElement("div"), { className: "sg-head", textContent: g.label }));
    for (const s of g.items) {
      const i = n++;
      const row = document.createElement("div");
      row.className = "sg-row";
      row.id = `sg-${i}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");
      row.dataset.kind = s.kind;
      row.dataset.url = s.url;
      const icon = s.tab !== undefined ? iconImg(s.tab) : null;
      if (icon) row.append(icon);
      const url = Object.assign(document.createElement("span"), { className: "sg-url", textContent: `\u00b7 ${addressText(s.url)}` });
      const tag = document.createElement("span");
      tag.className = "sg-tag";
      if (s.kind === "tab") {
        tag.classList.add("sg-switch");
        tag.textContent = "Switch to tab \u2192";
      } else if (s.kind === "bookmark") tag.textContent = `\u2605 ${s.folder ?? ""}`;
      else tag.textContent = agoText(s.visitedAt ?? 0, Date.now());
      row.append(titleWithMarks(s.title, query), url, tag);
      // mousedown would move focus out of the address bar (closing the list) before the click lands.
      row.addEventListener("mousedown", (e) => e.preventDefault());
      row.addEventListener("click", () => void choose(i));
      rows.push(row);
    }
  }
  const hints = document.createElement("div");
  hints.className = "sg-hints";
  for (const h of ["\u2191 \u2193 choose", "Enter open", "Shift+Del remove from history", "Esc close"]) hints.append(Object.assign(document.createElement("span"), { textContent: h }));
  suggestEl.replaceChildren(...rows, hints);
  address.setAttribute("aria-expanded", "true");
  if (suggestEl.hidden) {
    suggestEl.hidden = false;
    reportLayout();
  }
}
async function updateSuggest(): Promise<void> {
  const query = address.value;
  const seq = ++suggestSeq;
  if (!wordsOf(query).length || document.activeElement !== address) {
    closeSuggest();
    return;
  }
  const r = await invoke<{ bookmarks: Bookmark[]; history: HistoryHit[] }>("library_suggest", { query });
  if (seq !== suggestSeq || document.activeElement !== address) return; // a newer keystroke, or the user left
  renderSuggest(suggestionGroups(query, list.tabs, list.active, r.bookmarks, r.history), query);
}
async function choose(i: number): Promise<void> {
  const s = suggestions[i];
  if (!s) return;
  closeSuggest();
  address.blur();
  if (s.kind === "tab" && s.tab !== undefined) await invoke("tab_activate", { id: s.tab });
  else await invoke("tab_navigate", { input: s.url });
}
address.addEventListener("input", () => {
  if (selected >= 0) {
    selected = -1;
    markSelected();
  }
  window.clearTimeout(suggestTimer);
  suggestTimer = window.setTimeout(() => void updateSuggest(), 60);
});
address.addEventListener("blur", () => window.setTimeout(() => { if (document.activeElement !== address) closeSuggest(); }, 0));
address.addEventListener("keydown", async (e) => {
  if (suggestEl.hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const n = suggestions.length;
    selected = e.key === "ArrowDown" ? (selected + 1) % n : (selected <= 0 ? n - 1 : selected - 1);
    markSelected();
  } else if (e.key === "Enter" && selected >= 0) {
    e.preventDefault();
    await choose(selected);
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeSuggest();
  } else if (e.key === "Delete" && e.shiftKey && selected >= 0 && suggestions[selected]?.kind === "history") {
    e.preventDefault();
    await invoke("history_remove", { url: suggestions[selected]!.url });
    await updateSuggest();
  }
});

// --- Backup and restore (p3.21, adr-0032): covers the active tab like the settings screen. The app locks and opens
// the file; the passphrase goes straight to it and is cleared from the form after use. ---
type BackupSummary = { bookmarks: number; history: number; created_at: number; path: string };
type ImportResult = { bookmarks: number; history: number; skipped: number; saved_copy: string };
const backupPanel = $<HTMLElement>("backup-panel");
const bkOut = $<HTMLInputElement>("bk-out");
const bkPass1 = $<HTMLInputElement>("bk-pass1");
const bkPass2 = $<HTMLInputElement>("bk-pass2");
const bkIn = $<HTMLInputElement>("bk-in");
const bkPass3 = $<HTMLInputElement>("bk-pass3");
const bkExportStatus = $<HTMLSpanElement>("bk-export-status");
const bkPreview = $<HTMLSpanElement>("bk-preview");
const bkChoose = $<HTMLDivElement>("bk-choose");
const bkReplace = $<HTMLButtonElement>("bk-replace");
const bkImportStatus = $<HTMLSpanElement>("bk-import-status");
function say(el: HTMLElement, text: string, bad = false): void {
  el.textContent = text;
  el.classList.toggle("bad", bad);
}
const counts = (b: number, h: number) => `${b} bookmark${b === 1 ? "" : "s"}, ${h} history entr${h === 1 ? "y" : "ies"}`;
async function openBackup(): Promise<void> {
  await closeSettings();
  bkOut.value = await invoke<string>("backup_suggest_path");
  for (const el of [bkExportStatus, bkPreview, bkImportStatus]) say(el, "");
  bkChoose.hidden = true;
  backupPanel.hidden = false;
  if (list.active !== null && settingsCovering === null) {
    settingsCovering = list.active;
    await invoke("shell_cover", { cover: true, tab: settingsCovering });
  }
  render();
  bkPass1.focus();
}
async function closeBackup(): Promise<void> {
  if (backupPanel.hidden) return;
  backupPanel.hidden = true;
  for (const el of [bkPass1, bkPass2, bkPass3]) el.value = "";
  if (settingsCovering !== null) {
    const id = settingsCovering;
    settingsCovering = null;
    if (!uiOf(id).panel) await invoke("shell_cover", { cover: false, tab: id });
  }
  newtabCovering = null;
  render();
}
$<HTMLFormElement>("bk-export-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (bkPass1.value !== bkPass2.value) {
    say(bkExportStatus, "The two passphrases are not the same.", true);
    return;
  }
  say(bkExportStatus, "Making the backup\u2026");
  try {
    const s = await invoke<BackupSummary>("backup_export", { path: bkOut.value, passphrase: bkPass1.value });
    bkPass1.value = bkPass2.value = "";
    say(bkExportStatus, `Saved: ${counts(s.bookmarks, s.history)} in ${s.path}. Keep the passphrase safe; a lost passphrase cannot be recovered.`);
  } catch (err) {
    say(bkExportStatus, String(err), true);
  }
});
$<HTMLFormElement>("bk-import-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  bkChoose.hidden = true;
  bkReplace.dataset.confirm = "";
  bkReplace.textContent = "Replace mine";
  say(bkImportStatus, "");
  say(bkPreview, "Opening\u2026");
  try {
    const s = await invoke<BackupSummary>("backup_preview", { path: bkIn.value, passphrase: bkPass3.value });
    say(bkPreview, `Inside: ${counts(s.bookmarks, s.history)}, made ${new Date(s.created_at).toLocaleString()}.`);
    bkChoose.hidden = false;
  } catch (err) {
    say(bkPreview, String(err), true);
  }
});
function disarmImport(): void {
  bkChoose.hidden = true;
  bkReplace.dataset.confirm = "";
  bkReplace.textContent = "Replace mine";
}
// Changing the file or the passphrase after "look inside" means looking again before Merge or Replace.
for (const el of [bkIn, bkPass3]) el.addEventListener("input", () => { if (!bkChoose.hidden) { disarmImport(); say(bkPreview, ""); } });
async function runImport(replace: boolean): Promise<void> {
  say(bkImportStatus, "Importing\u2026");
  try {
    const r = await invoke<ImportResult>("backup_import", { path: bkIn.value, passphrase: bkPass3.value, replace });
    bkPass3.value = "";
    bkChoose.hidden = true;
    const copy = r.saved_copy ? ` Your previous library was saved as ${r.saved_copy}.` : "";
    say(bkImportStatus, `Added ${counts(r.bookmarks, r.history)}${r.skipped ? `; ${r.skipped} skipped (already here, or not a web page)` : ""}.${copy}`);
    await loadBookmarks();
  } catch (err) {
    bkReplace.dataset.confirm = "";
    bkReplace.textContent = "Replace mine";
    say(bkImportStatus, String(err), true);
  }
}
$<HTMLButtonElement>("bk-merge").addEventListener("click", () => void runImport(false));
bkReplace.addEventListener("click", () => {
  // Replace removes your current bookmarks and history (a copy is kept): ask once more.
  if (bkReplace.dataset.confirm !== "yes") {
    bkReplace.dataset.confirm = "yes";
    bkReplace.textContent = "Click again to replace all your bookmarks and history";
    return;
  }
  void runImport(true);
});
$<HTMLButtonElement>("backup-close").addEventListener("click", () => void closeBackup());
$<HTMLButtonElement>("side-backup").addEventListener("click", () => void openBackup());

// --- New-tab page (p3.22, adr-0033): over an empty tab, the logo, a search box that opens the address bar, the
// bookmarks bar's favourites and the most visited pages. The empty tab's view is hidden meanwhile (shell_cover). ---
function isBlank(u: TabUi | undefined): boolean {
  return Boolean(u) && (u!.uri === "" || u!.uri === "about:blank") && !u!.loading && !u!.panel;
}
function renderNewTab(): void {
  const nt = document.getElementById("newtab-panel");
  if (!nt) return; // render can run before the page's script has reached this point
  const otherPanel = !(document.getElementById("settings-panel")?.hidden ?? true) || !(document.getElementById("backup-panel")?.hidden ?? true);
  const show = list.active !== null && isBlank(activeUi()) && !otherPanel;
  nt.hidden = !show;
  const want = show ? list.active : null;
  if (want === newtabCovering) return;
  const before = newtabCovering;
  newtabCovering = want;
  if (before !== null && list.tabs.some((t) => t.id === before) && !uiOf(before).panel && settingsCovering !== before) {
    void invoke("shell_cover", { cover: false, tab: before });
  }
  if (want !== null) {
    void invoke("shell_cover", { cover: true, tab: want });
    // Fresh favourites and most visited each time the page appears.
    void loadBookmarks();
  }
}
function letterTile(label: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = "nt-letter";
  s.textContent = (label.trim()[0] ?? "?").toUpperCase();
  return s;
}
async function fillNewTab(): Promise<void> {
  const tiles = document.getElementById("nt-tiles");
  const most = document.getElementById("nt-most");
  if (!tiles || !most) return;
  const favs = bookmarkFolders(bookmarks, appearance.bar_folder)[0]!.items.slice(0, 12);
  tiles.replaceChildren(...(favs.length ? favs.map((b) => {
    const a = document.createElement("a");
    a.href = "#";
    a.title = b.url;
    const name = Object.assign(document.createElement("span"), { className: "nt-name", textContent: b.title });
    a.append(letterTile(b.title), name);
    a.addEventListener("click", (e) => { e.preventDefault(); openUrl(b.url, e); });
    return a;
  }) : [Object.assign(document.createElement("p"), { className: "nt-empty", textContent: "Star a page (Ctrl+D) and it appears here." })]));
  const entries = await invoke<HistoryEntry[]>("history_list", { query: null, limit: 500 });
  const counts = new Map<string, { n: number; title: string }>();
  for (const e of entries) {
    const c = counts.get(e.url) ?? { n: 0, title: e.title };
    c.n += 1;
    if (!c.title) c.title = e.title;
    counts.set(e.url, c);
  }
  const favUrls = new Set(favs.map((b) => b.url));
  const top = [...counts.entries()].filter(([u]) => !favUrls.has(u)).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  most.replaceChildren(...(top.length ? top.map(([url, c]) => {
    const a = document.createElement("a");
    a.href = "#";
    a.title = url;
    a.textContent = c.title || addressText(url);
    a.addEventListener("click", (e) => { e.preventDefault(); openUrl(url, e); });
    return a;
  }) : [Object.assign(document.createElement("p"), { className: "nt-empty", textContent: "Pages you visit often appear here." })]));
}
$<HTMLButtonElement>("nt-search").addEventListener("click", () => focusAddress());

// --- Appearance in the settings screen (p3.22): applied and saved at once. ---
const setTheme = $<HTMLSelectElement>("set-theme");
const setDensity = $<HTMLSelectElement>("set-density");
const setAccents = $<HTMLDivElement>("set-accents");
function fillAppearance(): void {
  setTheme.replaceChildren(...Object.values(THEMES).map((t) => Object.assign(document.createElement("option"), { value: t.name, textContent: t.label, selected: t.name === appearance.theme })));
  setDensity.replaceChildren(...Object.entries(DENSITIES).map(([k, d]) => Object.assign(document.createElement("option"), { value: k, textContent: d.label, selected: k === appearance.density })));
  setAccents.replaceChildren(...Object.entries(ACCENTS).map(([k, a]) => {
    const label = document.createElement("label");
    const input = Object.assign(document.createElement("input"), { type: "radio", name: "set-accent", value: k, checked: k === appearance.accent });
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = darkQuery.matches ? a.dark : a.light;
    input.addEventListener("change", () => void saveAppearance({ accent: k }));
    label.append(input, sw, a.label);
    return label;
  }));
}
async function saveAppearance(change: { theme?: string; accent?: string; density?: string }): Promise<void> {
  try {
    useAppearance(await invoke<AppearanceView>("appearance_set", change));
  } catch (err) {
    settingsStatus.textContent = String(err);
  }
}
setTheme.addEventListener("change", () => void saveAppearance({ theme: setTheme.value }));
setDensity.addEventListener("change", () => void saveAppearance({ density: setDensity.value }));

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
  await closeBackup();
  fillSettings(await invoke<SettingsView>("settings_get"));
  fillAppearance();
  settingsErrors.replaceChildren();
  settingsStatus.textContent = "";
  settingsPanel.hidden = false;
  if (list.active !== null && settingsCovering === null) {
    settingsCovering = list.active;
    await invoke("shell_cover", { cover: true, tab: settingsCovering });
  }
  render();
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
  // An empty tab gets its new-tab page back.
  newtabCovering = null;
  render();
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
  closeSuggest();
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

// Start: the tab list the app already has, the bookmarks, then report the layout.
applyList(await invoke<TabList>("tab_list"));
useAppearance(await invoke<AppearanceView>("appearance_get"));
await loadBookmarks();
reportLayout();
// Start-up is over: every listener above is in place (the smoke tests wait for this before pressing keys).
document.documentElement.dataset.ready = "1";

// The shell is the only web view allowed to use the app bridge (capability shell.json, p2.3).
invoke<string>("app_ping")
  .then((v) => {
    if (v !== "pong") statusEl.textContent = "Bridge answered unexpectedly";
  })
  .catch(() => {
    statusEl.textContent = "Bridge not available";
  });
invoke<string[]>("app_notes")
  .then((notes) => {
    if (notes.length) statusEl.textContent = notes.join(" ");
  })
  .catch(() => {});
