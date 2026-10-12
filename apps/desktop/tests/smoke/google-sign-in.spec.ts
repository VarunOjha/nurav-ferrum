// p2.13: a link to the Google sign-in address (here the test-only pattern of debug builds) does not load inside
// Ferrum; the shell offers "Open in browser", and only that click opens it (launcher mocked: a line in a file).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const launches = (f: Ferrum) => {
  const p = path.join(f.data, "launches.txt");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean) : [];
};
const signIn = `${base}/oauth-test/o/oauth2/v2/auth?client_id=fixture&response_type=code`;

let f: Ferrum;
test.beforeAll(async () => {
  f = await launch("google", { envFromData: (d) => ({ FERRUM_LAUNCHER_LOG: path.join(d, "launches.txt") }) });
});
test.afterAll(async () => { await f?.quit(); });

test("the sign-in link shows the banner and does not load in Ferrum", async () => {
  await go(f, `${base}/links/google`);
  await expect.poll(() => href(f)).toBe(`${base}/links/google`);
  await f.content.click("#google", { noWaitAfter: true });
  await expect(f.shell.locator("#external-bar")).toBeVisible();
  await expect(f.shell.locator("#external-text")).toHaveText("Google sign-in must open in your normal browser.");
  await expect(f.shell.locator("#external-open")).toHaveText("Open in browser");
  await expect(f.shell.locator("#external-uri")).toHaveText(signIn);
  await f.shell.waitForTimeout(500);
  await expect.poll(() => href(f)).toBe(`${base}/links/google`);
  expect(launches(f)).toEqual([]);
});

test("Dismiss opens nothing; Open in browser opens exactly the sign-in address", async () => {
  await f.shell.click("#external-cancel");
  await expect(f.shell.locator("#external-bar")).toBeHidden();
  expect(launches(f)).toEqual([]);
  await f.content.click("#google", { noWaitAfter: true });
  await expect(f.shell.locator("#external-bar")).toBeVisible();
  await f.shell.click("#external-open");
  await expect.poll(() => launches(f)).toEqual([signIn]);
  await expect.poll(() => href(f)).toBe(`${base}/links/google`);
});

test("a typed sign-in address is offered the same way", async () => {
  const before = launches(f).length;
  await go(f, signIn);
  await expect(f.shell.locator("#external-text")).toHaveText("Google sign-in must open in your normal browser.");
  await f.shell.click("#external-cancel");
  expect(launches(f).length).toBe(before);
  await expect.poll(() => href(f)).toBe(`${base}/links/google`);
});

test("the real Google sign-in address is caught too", async () => {
  // Ferrum cancels this navigation in NavigationStarting (no network traffic was measured here).
  const real = "https://accounts.google.com/o/oauth2/v2/auth?client_id=example&response_type=code";
  await go(f, real);
  await expect(f.shell.locator("#external-uri")).toHaveText(real);
  await f.shell.click("#external-cancel");
  await expect.poll(() => href(f)).toBe(`${base}/links/google`);
});
