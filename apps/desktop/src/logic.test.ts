// Unit tests of the shell's pure decisions (node --test; Node runs TypeScript files directly).
import { test } from "node:test";
import assert from "node:assert/strict";
import { addressText, blockedText, downloadText, finished, historyLines, linesOf, lockFor, shortcutFor, sizeText, tabLabel, webErrorText, WEB_ERROR_CANCELLED } from "./logic.ts";

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

test("address text and blocked note", () => {
  assert.equal(addressText("about:blank"), "");
  assert.equal(addressText("https://example.org/a?b"), "https://example.org/a?b");
  assert.equal(blockedText("javascript:alert(1)"), "Blocked: javascript address");
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
    [k(",", "c"), "settings"],
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

test("sidebar history lists each address once, newest first, with its title", () => {
  const e = (url: string, title: string, at: number) => ({ url, title, visited_at: at });
  const lines = historyLines([e("https://a.example/", "A", 3), e("https://b.example/x", "", 2), e("https://a.example/", "A old", 1)]);
  assert.deepEqual(lines, [
    { label: "A", url: "https://a.example/" },
    { label: "b.example/x", url: "https://b.example/x" },
  ]);
  assert.equal(historyLines(Array.from({ length: 80 }, (_, i) => e(`https://e.example/${i}`, "", i)), 50).length, 50);
});
