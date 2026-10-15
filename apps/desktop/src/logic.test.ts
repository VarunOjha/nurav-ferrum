// Unit tests of the shell's pure decisions (node --test; Node runs TypeScript files directly).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSmartScreenBlock, SMARTSCREEN_TEXT, insecureBarText, mergePermissions, PERMISSION_CHOICES, questionText, addressText, agoText, blockedText, bookmarkFolders, canBookmark, crashText, downloadText, finished, highlight, historyLines, iconSrc, linesOf, lockFor, matchesWords, shortcutFor, showedPage, sizeText, suggestionGroups, tabLabel, webErrorText, wordsOf, WEB_ERROR_CANCELLED } from "./logic.ts";

test("a loaded page: state loaded, no panel, lock allowed", () => {
  assert.deepEqual(finished(true, 200, 0), { state: "loaded", status: "", pageLoaded: true, panel: false });
});

test("a site's own error page (404, 500) stays visible with a toolbar note", () => {
  for (const code of [404, 500]) {
    const f = finished(true, code, 0);
    assert.equal(f.state, "http-error");
    assert.equal(f.panel, false);
    assert.equal(f.pageLoaded, true);
    assert.match(f.status, new RegExp(String(code)));
  }
  // WebView2 can report an HTTP error with IsSuccess false; the site's page still stays.
  assert.equal(finished(false, 404, 0).panel, false);
});

test("a failure without a page gets the shell's panel", () => {
  for (const code of [6, 11, 12, 13, 15]) {
    assert.deepEqual(finished(false, 0, code), { state: "failed", status: "Not loaded", pageLoaded: false, panel: true });
  }
});

test("a cancelled navigation is not an error", () => {
  const f = finished(false, 0, WEB_ERROR_CANCELLED);
  assert.equal(f.panel, false);
  assert.equal(f.state, "idle");
  assert.equal(f.pageLoaded, false);
});

test("the lock describes only pages that loaded", () => {
  assert.equal(lockFor("https://example.org/", true).title, "Secure connection");
  assert.equal(lockFor("http://example.org/", true).title, "Not secure");
  assert.deepEqual(lockFor("https://example.org/", false), { text: "", title: "" });
  assert.deepEqual(lockFor("about:blank", true), { text: "", title: "" });
});

test("error texts: known codes in plain words, unknown codes get a general sentence", () => {
  assert.match(webErrorText(15), /redirect loop/);
  assert.match(webErrorText(13), /name could not be found/);
  for (const c of [1, 2, 4, 5]) assert.match(webErrorText(c), /no(t)? offer a way around certificate errors/);
  assert.equal(webErrorText(999), "The page could not be loaded.");
});

test("crash texts: each failure in plain words, with what to do", () => {
  assert.match(crashText("renderer-exited"), /ended unexpectedly\. Reload/);
  assert.match(crashText("renderer-unresponsive"), /stopped responding\. Reload/);
  assert.match(crashText("browser-exited"), /starts again/);
  assert.equal(crashText("something-new"), crashText("renderer-exited"));
});

test("address text and blocked note", () => {
  assert.equal(addressText("about:blank"), "");
  assert.equal(addressText("https://example.org/a?b"), "https://example.org/a?b");
  assert.equal(blockedText("javascript:alert(1)"), "Blocked: javascript address");
  assert.equal(blockedText("https://ads.example/x", "blocklist"), "Blocked: ads.example is on your blocked sites list");
  assert.equal(blockedText("https://ads.example/x", "blocklist", true), "Blocked a frame: ads.example is on your blocked sites list");
  assert.equal(blockedText("https://other.example/", "allowlist-only"), "Blocked: other.example is not on your allowed sites list");
  assert.equal(blockedText("https://exa mple", "url-bad-character"), "Blocked: not a valid address");
  assert.equal(blockedText("data:text/html,x", "data-top-level"), "Blocked: data address");
  assert.equal(blockedText("https://localhost:8443/perm", "permission:clipboard-read"), "Blocked: clipboard read for localhost (allow it in Settings)");
  assert.equal(blockedText("ms-msdt:x", "external-risky"), "Blocked: ms-msdt links are always refused (known to be abused)");
  assert.equal(blockedText("ferrum-test:x", "external-not-listed"), "Blocked: ferrum-test links are not on your allowed list");
});

test("tab labels: title first, then the address without its scheme, else New tab", () => {
  assert.equal(tabLabel("  Example  ", "https://example.org/"), "Example");
  assert.equal(tabLabel("", "https://example.org/"), "example.org");
  assert.equal(tabLabel("", "https://example.org/a/b"), "example.org/a/b");
  assert.equal(tabLabel("", "about:blank"), "New tab");
  assert.equal(tabLabel("", ""), "New tab");
});

test("shell shortcuts follow the same table as the app", () => {
  const k = (key: string, mods = "") => ({ key, ctrl: mods.includes("c"), shift: mods.includes("s"), alt: mods.includes("a") });
  const cases: [ReturnType<typeof k>, string][] = [
    [k("t", "c"), "new-tab"], [k("w", "c"), "close-tab"], [k("F4", "c"), "close-tab"], [k("Tab", "c"), "next-tab"],
    [k("PageDown", "c"), "next-tab"], [k("Tab", "cs"), "previous-tab"], [k("PageUp", "c"), "previous-tab"],
    [k("T", "cs"), "reopen-tab"], [k("1", "c"), "select-tab-1"], [k("8", "c"), "select-tab-8"], [k("9", "c"), "last-tab"],
    [k("l", "c"), "focus-address"], [k("d", "a"), "focus-address"], [k("F6"), "focus-address"], [k("ArrowLeft", "a"), "back"],
    [k("ArrowRight", "a"), "forward"], [k("F5"), "reload"], [k("r", "c"), "reload"], [k("S", "cs"), "toggle-sidebar"],
    [k(",", "c"), "settings"], [k("d", "c"), "bookmark-page"], [k("B", "cs"), "toggle-bookmarks-bar"],
    [k("O", "cs"), "show-bookmarks"],
    [k("N", "cs"), "new-private-tab"],
  ];
  for (const [key, want] of cases) assert.equal(shortcutFor(key), want, JSON.stringify(key));
  for (const key of [k("t"), k("c", "c"), k("v", "c"), k("z", "c"), k("a", "c"), k("ArrowLeft"), k("Tab"), k("0", "c")]) {
    assert.equal(shortcutFor(key), null, JSON.stringify(key));
  }
});

test("download lines: sizes in plain units, percent while running, done or failed", () => {
  assert.equal(sizeText(500), "500 B");
  assert.equal(sizeText(1536), "1.5 KB");
  assert.equal(sizeText(300000), "293.0 KB");
  assert.equal(sizeText(5 * 1024 * 1024), "5.0 MB");
  assert.equal(sizeText(-1), "unknown size");
  assert.equal(downloadText("running", 50, 200), "25% of 200 B");
  assert.equal(downloadText("running", 2048, -1), "2.0 KB so far");
  assert.equal(downloadText("completed", 300000, 300000), "Done, 293.0 KB");
  assert.equal(downloadText("failed", 4096, 1048576), "Failed after 4.0 KB");
});

test("the start-up box takes one address per line", () => {
  assert.deepEqual(linesOf("https://a.example/\n\n  https://b.example/x  \r\nabout:blank\n"), [
    "https://a.example/", "https://b.example/x", "about:blank",
  ]);
  assert.deepEqual(linesOf("   \n"), []);
});

test("tab icons are the app's PNG data addresses only", () => {
  assert.equal(iconSrc("data:image/png;base64,iVBORw0KGgo="), "data:image/png;base64,iVBORw0KGgo=");
  assert.equal(iconSrc(""), "");
  assert.equal(iconSrc("https://example.org/favicon.ico"), "");
  assert.equal(iconSrc("data:image/svg+xml,<svg/>"), "");
});

test("a tab showed a page only after a web page loaded", () => {
  assert.equal(showedPage("https://example.org/", true), true);
  assert.equal(showedPage("http://example.org/", true), true);
  assert.equal(showedPage("about:blank", true), false);
  assert.equal(showedPage("https://example.org/file.pdf", false), false);
});

test("sidebar history lists each address once, newest first, with its title", () => {
  const e = (url: string, title: string, at: number) => ({ url, title, visited_at: at });
  const lines = historyLines([e("https://a.example/", "A", 3), e("https://b.example/x", "", 2), e("https://a.example/", "A old", 1)]);
  assert.deepEqual(lines, [
    { label: "A", url: "https://a.example/" },
    { label: "b.example/x", url: "https://b.example/x" },
  ]);
  assert.equal(historyLines(Array.from({ length: 80 }, (_, i) => e(`https://e.example/${i}`, "", i)), 50).length, 50);
});

test("bookmarks: only web pages; grouped by folder, the bar first, in saved order", () => {
  assert.equal(canBookmark("https://example.org/"), true);
  assert.equal(canBookmark("http://example.org/"), true);
  for (const u of ["about:blank", "", "file:///C:/x", "javascript:alert(1)"]) assert.equal(canBookmark(u), false, u);
  const b = (id: number, folder: string, position: number) => ({ id, url: `https://e.example/${id}`, title: `B${id}`, folder, position, created_at: 0 });
  const g = bookmarkFolders([b(1, "work", 1), b(2, "Favourites bar", 1), b(3, "Work", 0), b(4, "Favourites bar", 0), b(5, "Reading", 0)], "Favourites bar");
  assert.deepEqual(g.slice(0, 2).map((f) => f.name), ["Favourites bar", "Reading"]);
  assert.deepEqual(g.slice(2).map((f) => f.name).sort(), ["Work", "work"].sort());
  assert.deepEqual(g[0]!.items.map((x) => x.id), [4, 2]);
  assert.deepEqual(bookmarkFolders([], "Favourites bar"), [{ name: "Favourites bar", items: [] }]);
});

test("suggestions: words start words, any case; highlighted word starts", () => {
  assert.deepEqual(wordsOf("Ferrum · GitHub/you-ferrum"), ["ferrum", "github", "you", "ferrum"]);
  assert.equal(matchesWords("Ferrum pull request #12 https://github.com/you/ferrum/pull/12", "ferr pull"), true);
  assert.equal(matchesWords("Ferrum", "rrum"), false, "inside a word does not count");
  assert.equal(matchesWords("Ferrum", "  "), false);
  assert.deepEqual(highlight("Ferrum issues", "ferr"), [{ text: "Ferr", hit: true }, { text: "um issues", hit: false }]);
  assert.deepEqual(highlight("a b", "zz"), [{ text: "a b", hit: false }]);
  assert.deepEqual(highlight("Rust: the Rust Book", "ru bo"), [
    { text: "Ru", hit: true }, { text: "st: the ", hit: false }, { text: "Ru", hit: true }, { text: "st ", hit: false },
    { text: "Bo", hit: true }, { text: "ok", hit: false },
  ]);
});

test("suggestions: grouped tabs, bookmarks, history; a page once; the active tab left out; limits", () => {
  const tabs = [
    { id: 1, url: "https://github.com/you/ferrum", title: "Ferrum repo" },
    { id: 2, url: "https://ferrum.example/active", title: "Ferrum active" },
    { id: 3, url: "about:blank", title: "Ferrum blank" },
  ];
  const bm = (id: number, url: string, title: string) => ({ id, url, title, folder: "Work", position: 0, created_at: 0 });
  const h = (url: string, title: string, t: number) => ({ url, title, visited_at: t });
  const g = suggestionGroups("ferr", tabs, 2,
    [bm(1, "https://github.com/you/ferrum", "dup of tab"), bm(2, "https://github.com/you/ferrum/issues", "Ferrum issues")],
    [h("https://github.com/you/ferrum/issues", "dup of bookmark", 3), ...[1, 2, 3, 4, 5, 6].map((i) => h(`https://f.example/${i}`, `Ferrum ${i}`, i))]);
  assert.deepEqual(g.map((x) => x.label), ["Open tabs", "Bookmarks", "History"]);
  assert.deepEqual(g[0]!.items.map((x) => x.tab), [1]);
  assert.deepEqual(g[1]!.items.map((x) => x.title), ["Ferrum issues"]);
  assert.equal(g[2]!.items.length, 5);
  assert.ok(g[2]!.items.every((x) => x.url.startsWith("https://f.example/")));
  assert.deepEqual(suggestionGroups("  ", tabs, null, [], []), []);
  assert.deepEqual(suggestionGroups("zzz", tabs, null, [], []), []);
});

test("history rows say how long ago", () => {
  const now = Date.UTC(2026, 9, 12, 12);
  assert.equal(agoText(now - 10_000, now), "just now");
  assert.equal(agoText(now - 5 * 60_000, now), "5 min ago");
  assert.equal(agoText(now - 2 * 3_600_000, now), "2 h ago");
  assert.equal(agoText(now - 30 * 3_600_000, now), "yesterday");
  assert.equal(agoText(now - 3 * 86_400_000, now), "3 days ago");
  assert.equal(agoText(Date.UTC(2026, 0, 2), now), "2026-01-02");
});

test("the not-secure bar: only for a plain-HTTP page that loaded", () => {
  assert.match(insecureBarText("http://example.org/", true) ?? "", /^Not secure/);
  assert.equal(insecureBarText("http://example.org/", false), null);
  assert.equal(insecureBarText("https://example.org/", true), null);
  assert.equal(insecureBarText("about:blank", true), null);
});

test("site permissions: shown kinds follow the boxes, other kinds are kept", () => {
  assert.deepEqual(PERMISSION_CHOICES.map((c) => c.name), ["camera", "microphone", "geolocation", "notifications", "clipboard-read"]);
  assert.deepEqual(mergePermissions([], ["notifications", "camera"]), ["camera", "notifications"]);
  assert.deepEqual(mergePermissions(["camera", "midi-system-exclusive-messages"], []), ["midi-system-exclusive-messages"]);
  assert.deepEqual(mergePermissions(["autoplay"], ["geolocation"]), ["autoplay", "geolocation"]);
});

test("a SmartScreen block: failed although the server answered 200, connection aborted (p4.19)", () => {
  assert.equal(isSmartScreenBlock(false, 200, 9), true);
  // An ordinary page that breaks off after 200 (error 0), an unreachable or unknown host (no HTTP status), a
  // cancelled navigation and a loaded page are not blocks.
  assert.equal(isSmartScreenBlock(false, 200, 0), false);
  assert.equal(isSmartScreenBlock(false, 0, 9), false);
  assert.equal(isSmartScreenBlock(false, 0, 13), false);
  assert.equal(isSmartScreenBlock(false, 0, WEB_ERROR_CANCELLED), false);
  assert.equal(isSmartScreenBlock(true, 200, 0), false);
  assert.match(SMARTSCREEN_TEXT, /^Microsoft Defender SmartScreen reported this site as unsafe\./);
});

test("the permission question names the site and what it wants (p4.20)", () => {
  assert.equal(questionText("example.com", ["camera"]), "example.com wants to use your camera");
  assert.equal(questionText("example.com", ["microphone", "camera"]), "example.com wants to use your camera and microphone");
  assert.equal(questionText("maps.example", ["geolocation"]), "maps.example wants to know your location");
  assert.equal(
    questionText("example.com", ["notifications", "camera", "clipboard-read"]),
    "example.com wants to use your camera, show notifications and read your clipboard",
  );
  assert.equal(questionText("", ["notifications"]), "This page wants to show notifications");
  assert.equal(questionText("example.com", []), "example.com wants to use a permission");
});
