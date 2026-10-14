// Pure decisions of the shell (no DOM, no Tauri): what the toolbar shows after a navigation, the lock, and the
// plain-words text for WebView2's error codes. Unit-tested with Node's test runner (src/logic.test.ts).

/** WebView2 web error status 14: the navigation was cancelled (by the user, or by Ferrum's own gate). */
export const WEB_ERROR_CANCELLED = 14;

// WebView2 web error status codes (COREWEBVIEW2_WEB_ERROR_STATUS) in plain words.
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

/** The error panel's sentence for a WebView2 web error status. */
export function webErrorText(code: number): string {
  return WEB_ERRORS[code] ?? "The page could not be loaded.";
}

export type ToolbarState = "idle" | "loading" | "loaded" | "http-error" | "failed";

/** What the shell shows when a navigation finished. */
export type Finished = {
  state: ToolbarState;
  /** Toolbar status text. */
  status: string;
  /** Whether a page loaded (so the lock may describe it). */
  pageLoaded: boolean;
  /** Whether the shell's full error panel must cover the content area. */
  panel: boolean;
};

/**
 * Decides the toolbar after `navigation-completed`. A site's own error page (HTTP 4xx/5xx) stays visible with a
 * toolbar note; a failure without any page (network, name, certificate, redirect loop) gets the shell's panel; a
 * cancelled navigation is not an error.
 */
export function finished(success: boolean, httpStatus: number, webErrorStatus: number): Finished {
  if (httpStatus >= 400) {
    return { state: "http-error", status: `This page answered ${httpStatus}`, pageLoaded: true, panel: false };
  }
  if (!success && webErrorStatus !== WEB_ERROR_CANCELLED) {
    return { state: "failed", status: "Not loaded", pageLoaded: false, panel: true };
  }
  return { state: success ? "loaded" : "idle", status: "", pageLoaded: success, panel: false };
}

/** The lock icon and its tooltip: only for a page that actually loaded; https locked, http warned. */
export function lockFor(uri: string, pageLoaded: boolean): { text: string; title: string } {
  if (pageLoaded && uri.startsWith("https:")) return { text: "\u{1f512}", title: "Secure connection" };
  if (pageLoaded && uri.startsWith("http:")) return { text: "⚠", title: "Not secure" };
  return { text: "", title: "" };
}

/** The tab's icon as the shell may show it: only a PNG data address made by the app (p3.16); anything else gives none. */
export function iconSrc(icon: string): string {
  return icon.startsWith("data:image/png;base64,") ? icon : "";
}

/**
 * Whether a finished navigation showed a real web page (p3.16): a tab that never did and then turns into a download
 * (a site opened the file in a new window) closes when its download ends.
 */
export function showedPage(uri: string, pageLoaded: boolean): boolean {
  return pageLoaded && /^https?:/i.test(uri);
}

/** The address bar text for a view address (the blank start page shows as empty). */
export function addressText(uri: string): string {
  return uri === "about:blank" ? "" : uri;
}

/** Toolbar note for an address Ferrum stopped. `why` is the policy rule that decided (p4.3), `frame` that it was a
 * frame inside the page rather than the page itself. */
export function blockedText(uri: string, why = "", frame = false): string {
  let host = "";
  try { host = new URL(uri).hostname; } catch { /* not an address: the generic note */ }
  const what = frame ? "Blocked a frame: " : "Blocked: ";
  if (host && why === "blocklist") return `${what}${host} is on your blocked sites list`;
  if (host && why === "allowlist-only") return `${what}${host} is not on your allowed sites list`;
  if (why.startsWith("permission:")) {
    const kind = why.slice("permission:".length).replace(/-/g, " ");
    return `${what}${kind} for ${host || "this page"} (allow it in Settings)`;
  }
  if (why.startsWith("url-")) return `${what}not a valid address`;
  const scheme = (uri.split(":")[0] ?? "").toLowerCase();
  if (why === "external-risky") return `${what}${scheme} links are always refused (known to be abused)`;
  if (why === "external-not-listed") return `${what}${scheme} links are not on your allowed list`;
  return what + uri.split(":")[0] + " address";
}

/** The tab strip label: the page title, else the address without its scheme, else "New tab". */
export function tabLabel(title: string, url: string): string {
  const t = title.trim();
  if (t) return t;
  if (!url || url === "about:blank") return "New tab";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Bytes in plain units (B, KB, MB, GB; 1 KB = 1024 B). */
export function sizeText(bytes: number): string {
  if (bytes < 0) return "unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return i === 0 ? `${v} B` : `${v.toFixed(1)} ${units[i]}`;
}

/** The state text of a download line. */
export function downloadText(state: "running" | "completed" | "failed", received: number, total: number): string {
  if (state === "completed") return `Done, ${sizeText(received)}`;
  if (state === "failed") return `Failed after ${sizeText(received)}`;
  if (total > 0) return `${Math.floor((received / total) * 100)}% of ${sizeText(total)}`;
  return `${sizeText(received)} so far`;
}

/** The warning on the download line of a program file (p4.6). */
export const PROGRAM_WARNING = "⚠ Program file: open it only if you trust the site";

/** The start-up sites box: one address per line, blank lines and surrounding spaces dropped. */
export function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
}

/** A history entry as the sidebar lists it. */
export type HistoryEntry = { url: string; title: string; visited_at: number };

/** Sidebar history lines: title (or address) and address, the same address listed once (its newest visit). */
export function historyLines(entries: HistoryEntry[], max = 50): { label: string; url: string }[] {
  const seen = new Set<string>();
  const out: { label: string; url: string }[] = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push({ label: tabLabel(e.title, e.url), url: e.url });
    if (out.length >= max) break;
  }
  return out;
}

/** A key press in the shell (the parts of a KeyboardEvent the shortcut table needs). */
export type ShellKey = { key: string; ctrl: boolean; shift: boolean; alt: boolean };

/**
 * Ferrum's shortcut for a key pressed in the shell, by name, or null when the key is the shell's normal typing.
 * The same table as `ferrum_core::shortcuts` (keys pressed inside a page are handled there).
 */
export function shortcutFor(k: ShellKey): string | null {
  const key = k.key.length === 1 ? k.key.toLowerCase() : k.key;
  if (k.ctrl && !k.shift && !k.alt) {
    if (key === "t") return "new-tab";
    if (key === "w" || key === "F4") return "close-tab";
    if (key === "Tab" || key === "PageDown") return "next-tab";
    if (key === "PageUp") return "previous-tab";
    if (key === "l") return "focus-address";
    if (key === "r") return "reload";
    if (key === ",") return "settings";
    if (key === "d") return "bookmark-page";
    if (/^[1-8]$/.test(key)) return `select-tab-${key}`;
    if (key === "9") return "last-tab";
    return null;
  }
  if (k.ctrl && k.shift && !k.alt) {
    if (key === "Tab") return "previous-tab";
    if (key === "t") return "reopen-tab";
    if (key === "s") return "toggle-sidebar";
    if (key === "b") return "toggle-bookmarks-bar";
    if (key === "o") return "show-bookmarks";
    return null;
  }
  if (!k.ctrl && !k.shift && k.alt) {
    if (key === "ArrowLeft") return "back";
    if (key === "ArrowRight") return "forward";
    if (key === "d") return "focus-address";
    return null;
  }
  if (!k.ctrl && !k.shift && !k.alt) {
    if (key === "F5") return "reload";
    if (key === "F6") return "focus-address";
  }
  return null;
}

/** A bookmark as the app reports it (p3.19). */
export type Bookmark = { id: number; url: string; title: string; folder: string; position: number; created_at: number };

/** Only web pages can be bookmarked (the app refuses anything else, adr-0032). */
export function canBookmark(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Bookmarks grouped by folder, the bookmarks bar's folder first, each in its saved order. */
export function bookmarkFolders(list: Bookmark[], bar: string): { name: string; items: Bookmark[] }[] {
  const by = new Map<string, Bookmark[]>();
  by.set(bar, []);
  for (const b of list) {
    if (!by.has(b.folder)) by.set(b.folder, []);
    by.get(b.folder)!.push(b);
  }
  return [...by.entries()]
    .map(([name, items]) => ({ name, items: [...items].sort((a, b) => a.position - b.position || a.id - b.id) }))
    .sort((a, b) => (a.name === bar ? -1 : b.name === bar ? 1 : a.name.localeCompare(b.name, undefined, { sensitivity: "base" })));
}

// --- Address-bar suggestions (p3.20): open tabs, bookmarks and history, grouped. The app finds bookmarks and history
// (SQLite word index); the shell matches open tabs with the same rule: every typed word starts a word of the title
// or the address, in any case. ---

/** The words of `text` (letters and digits), lower case, as the app's word index splits them. */
export function wordsOf(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** True when every word of `query` starts some word of `text`. */
export function matchesWords(text: string, query: string): boolean {
  const q = wordsOf(query);
  if (!q.length) return false;
  const t = wordsOf(text);
  return q.every((w) => t.some((x) => x.startsWith(w)));
}

/** `text` in pieces, the start of each word that a typed word begins marked `hit` (shown in the accent colour). */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const q = wordsOf(query);
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = m[0].toLowerCase();
    const len = Math.max(0, ...q.filter((w) => word.startsWith(w)).map((w) => w.length));
    if (len > 0) {
      const start = m.index!;
      if (start > at) out.push({ text: text.slice(at, start), hit: false });
      out.push({ text: text.slice(start, start + len), hit: true });
      at = start + len;
    }
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out.filter((p) => p.text.length > 0);
}

/** One suggestion row. */
export type Suggestion = { kind: "tab" | "bookmark" | "history"; url: string; title: string; tab?: number; folder?: string; visitedAt?: number };
/** A group of rows under a heading. */
export type SuggestionGroup = { label: string; items: Suggestion[] };

/**
 * The address bar's groups for `query`: open tabs (not the active one, at most 3), bookmarks (as the app found them,
 * at most 3) and history (at most 5); a page shows once, in the first group that has it. Empty groups are left out.
 */
export function suggestionGroups(
  query: string,
  tabs: { id: number; url: string; title: string }[],
  active: number | null,
  bookmarks: Bookmark[],
  history: { url: string; title: string; visited_at: number }[],
): SuggestionGroup[] {
  if (!wordsOf(query).length) return [];
  const seen = new Set<string>();
  const take = <T extends { url: string }>(xs: T[], n: number): T[] => {
    const out: T[] = [];
    for (const x of xs) {
      if (out.length >= n) break;
      if (seen.has(x.url)) continue;
      seen.add(x.url);
      out.push(x);
    }
    return out;
  };
  const groups: SuggestionGroup[] = [
    { label: "Open tabs", items: take(tabs.filter((t) => t.id !== active && /^https?:/i.test(t.url) && matchesWords(`${t.title} ${t.url}`, query)), 3)
      .map((t) => ({ kind: "tab" as const, url: t.url, title: t.title || t.url, tab: t.id })) },
    { label: "Bookmarks", items: take(bookmarks, 3).map((b) => ({ kind: "bookmark" as const, url: b.url, title: b.title, folder: b.folder })) },
    { label: "History", items: take(history, 5).map((h) => ({ kind: "history" as const, url: h.url, title: h.title || h.url, visitedAt: h.visited_at })) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

/** "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago" or the date, for a history row. */
export function agoText(then: number, now: number): string {
  const min = Math.floor((now - then) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(then).toISOString().slice(0, 10);
}
