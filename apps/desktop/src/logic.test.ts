// Unit tests of the shell's pure decisions (node --test; Node runs TypeScript files directly).
import { test } from "node:test";
import assert from "node:assert/strict";
import { addressText, blockedText, finished, lockFor, tabLabel, webErrorText, WEB_ERROR_CANCELLED } from "./logic.ts";

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
