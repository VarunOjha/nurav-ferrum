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

/** The address bar text for a view address (the blank start page shows as empty). */
export function addressText(uri: string): string {
  return uri === "about:blank" ? "" : uri;
}

/** Toolbar note for an address Ferrum stopped. */
export function blockedText(uri: string): string {
  return "Blocked: " + uri.split(":")[0] + " address";
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

/** The start-up sites box: one address per line, blank lines and surrounding spaces dropped. */
export function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
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
    if (/^[1-8]$/.test(key)) return `select-tab-${key}`;
    if (key === "9") return "last-tab";
    return null;
  }
  if (k.ctrl && k.shift && !k.alt) {
    if (key === "Tab") return "previous-tab";
    if (key === "t") return "reopen-tab";
    if (key === "s") return "toggle-sidebar";
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
