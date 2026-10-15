// p4.5 and p4.20: permissions. A test page asks for each sensitive kind. Nothing is allowed until the user chooses:
// Ferrum asks in a bar under the toolbar (adr-0034, owner answer Q-227) with Allow this time, Always allow on this site,
// Never allow and close; plain-HTTP pages and frames of another site that their page did not allow get no question
// (a frame the page allowed is asked about under the page's site, owner answer Q-228); a private tab saves nothing.
// The camera and the microphone are only ever refused here (Never allow), so the PC's real devices are never switched
// on; the "allow" answers are tested with notifications and the clipboard.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, audited, type Ferrum } from "./ferrum.ts";
import { base, httpBase } from "./paths.ts";

type LogLine = { target: string; fields: Record<string, unknown> };
/** Ferrum's log lines about permissions with this message, kind and (optional) rule. */
const permLog = (f: Ferrum, message: string, kind: string, rule?: string) => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return 0;
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LogLine; } catch { return null; } })
    .filter((l) => l?.target === "ferrum::policy" && l.fields.message === message && l.fields.kind === kind
      && (rule === undefined || l.fields.rule === rule)).length;
};
const href = (p: { evaluate: Ferrum["content"]["evaluate"] }) =>
  p.evaluate(() => location.href).catch(() => "(loading)");
const openPerm = async (f: Ferrum, at = base) => {
  await go(f, `${at}/perm`);
  await expect.poll(() => href(f.content)).toBe(`${at}/perm`);
  await expect(f.content.locator("#perm")).toBeVisible();
  await f.content.click("#perm"); // focus and a user gesture (the clipboard needs both)
};
/** Starts a request in the page; the promise gives the page's result ("granted", "denied" or an error name). */
const ask = (page: Ferrum["content"], kind: string) =>
  page.evaluate((k) => (window as any).ask[k]().then(String, (e: unknown) => `threw:${String(e)}`), kind) as Promise<string>;
const bar = (f: Ferrum) => f.shell.locator("#perm-bar");
/** Waits for the question, clicks one of its buttons and waits for it to go. */
const answer = async (f: Ferrum, button: "once" | "always" | "never" | "close" | "block") => {
  await expect(bar(f)).toBeVisible();
  await f.shell.click(`#perm-${button}`);
  await expect(bar(f)).toBeHidden();
};
type Site = { site: string; permissions?: string[]; never?: string[] };
const siteOf = async (f: Ferrum, site = "localhost") =>
  (await call<{ sites: Site[] }>(f, "settings_get")).sites.find((s) => s.site === site);
const userSettings = (f: Ferrum) => {
  const p = path.join(f.data, "user-config.toml");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};

test.describe("the question: this time, and a waiting request", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("permissions"); });
  test.afterAll(async () => { await f?.quit(); });

  test("the bar names the site; Allow this time lasts until the page is loaded again", async () => {
    await openPerm(f);
    const asked = ask(f.content, "notifications");
    await expect(bar(f)).toBeVisible();
    await expect(f.shell.locator("#perm-text")).toHaveText("localhost wants to show notifications");
    for (const b of ["once", "always", "never", "close"]) await expect(f.shell.locator(`#perm-${b}`)).toBeVisible();
    await expect(f.shell.locator("#perm-block")).toBeHidden();
    // Recorded, not judged: whether the page still runs script while its request waits (research note 1.7).
    const alive = await Promise.race([
      f.content.evaluate(() => 1 + 1),
      new Promise((r) => setTimeout(() => r("timeout"), 3000)),
    ]);
    console.log(`PAGE-WHILE-WAITING ${alive === 2 ? "responsive" : "paused"}`);
    await answer(f, "once");
    expect(await asked).toBe("granted");
    await expect.poll(() => permLog(f, "permission granted", "notifications", "permission-allowed-once")).toBeGreaterThan(0);
    // The same page again: still allowed, no question.
    expect(await ask(f.content, "notifications")).toBe("granted");
    await expect(bar(f)).toBeHidden();
    // Loading the same address again ends "this time": asked again; closing refuses.
    await openPerm(f);
    const again = ask(f.content, "notifications");
    await answer(f, "close");
    expect(await again).toBe("denied");
    await expect.poll(() => audited(f, { action: "permission-notifications", rule: "permission-closed" })).toBeGreaterThan(0);
    // Nothing was granted or refused for good.
    expect((await siteOf(f))?.permissions ?? []).toEqual([]);
    expect((await siteOf(f))?.never ?? []).toEqual([]);
  });

  test("a waiting request is refused when the tab loads another page", async () => {
    await openPerm(f);
    void ask(f.content, "notifications").catch(() => "gone");
    await expect(bar(f)).toBeVisible();
    await go(f, `${base}/landing`);
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => audited(f, { action: "permission-question", rule: "permission-page-left" })).toBeGreaterThan(0);
  });

  test("a frame of the same site asks like its page", async () => {
    const page = `${base}/frame?src=${encodeURIComponent("/perm")}`;
    await go(f, page);
    await expect.poll(() => href(f.content)).toBe(page);
    await expect(f.content.frameLocator("#frame").locator("#perm")).toBeVisible();
    const frame = (await (await f.content.locator("#frame").elementHandle())!.contentFrame())!;
    const asked = frame.evaluate(() => (window as any).ask.geolocation()) as Promise<string>;
    await answer(f, "close"); // location is never allowed in a test (it would ask Windows for the PC's position)
    expect(await asked).toBe("denied");
  });
});

test.describe("remembered answers", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("permissions-remember"); });
  test.afterAll(async () => { await f?.quit(); });

  test("Always allow is saved in Settings and needs no new question", async () => {
    await openPerm(f);
    const asked = ask(f.content, "clipboard");
    await expect(f.shell.locator("#perm-text")).toHaveText("localhost wants to read your clipboard");
    await answer(f, "always");
    console.log(`CLIPBOARD-AFTER-ALWAYS ${await asked}`);
    expect((await siteOf(f))?.permissions).toEqual(["clipboard-read"]);
    expect(userSettings(f)).toContain('permissions = ["clipboard-read"]');
    await openPerm(f);
    const second = ask(f.content, "clipboard");
    // No question this time: decided by the saved answer.
    await expect.poll(() => permLog(f, "permission granted", "clipboard-read", "permission-granted")).toBeGreaterThan(0);
    await expect(bar(f)).toBeHidden();
    console.log(`CLIPBOARD-SECOND ${await second}`);
    // Notifications: Always allow, then granted without a question.
    await openPerm(f);
    const n = ask(f.content, "notifications");
    await answer(f, "always");
    expect(await n).toBe("granted");
    expect((await siteOf(f))?.permissions).toEqual(["clipboard-read", "notifications"]);
  });

  test("Never allow refuses the camera, is saved, and asks no more", async () => {
    await openPerm(f);
    const asked = ask(f.content, "camera");
    // A PC without a camera may answer NotFoundError before any question.
    const first = await Promise.race([
      bar(f).waitFor({ state: "visible", timeout: 8000 }).then(() => "bar"),
      asked.then((r) => `result:${r}`),
    ]);
    if (first !== "bar") {
      console.log(`CAMERA-NO-QUESTION ${first}`);
      expect(["result:NotFoundError", "result:NotAllowedError"]).toContain(first);
      return;
    }
    await expect(f.shell.locator("#perm-text")).toHaveText("localhost wants to use your camera");
    await answer(f, "never");
    expect(await asked).toBe("NotAllowedError");
    expect((await siteOf(f))?.never).toEqual(["camera"]);
    expect(userSettings(f)).toContain('never = ["camera"]');
    await expect.poll(() => audited(f, { action: "permission-camera", rule: "permission-never" })).toBeGreaterThan(0);
    await openPerm(f);
    expect(await ask(f.content, "camera")).toBe("NotAllowedError");
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => permLog(f, "permission denied", "camera", "permission-never")).toBeGreaterThan(1);
  });

  test("closing the question three times makes the site quiet", async () => {
    for (let i = 1; i <= 3; i++) {
      await openPerm(f);
      const asked = ask(f.content, "geolocation");
      await answer(f, "close");
      expect(await asked, `close ${i}`).toBe("denied");
    }
    expect(userSettings(f)).toMatch(/kind = "geolocation"\s+count = 0\s+quiet_until = \d{10}/);
    await openPerm(f);
    expect(await ask(f.content, "geolocation")).toBe("denied");
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => audited(f, { action: "permission-geolocation", rule: "permission-quiet" })).toBeGreaterThan(0);
  });
});

test.describe("no question", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("permissions-no-question", { extraSettings: '[security]\nhttp_policy = "warn"\n' });
  });
  test.afterAll(async () => { await f?.quit(); });

  test("a plain-HTTP page is refused without a question", async () => {
    await openPerm(f, httpBase);
    expect(await ask(f.content, "notifications")).toBe("denied");
    await expect(bar(f)).toBeHidden();
  });

  test("a frame of another site: refused unless its page allowed it, then asked under the page's site", async () => {
    // Owner answer Q-228 (like Chrome). Not allowed by the page: Chromium refuses it before Ferrum hears of it.
    const other = "https://site-a.localhost:8443/perm";
    const openFrame = async (allow: string) => {
      const page = `${base}/frame?src=${encodeURIComponent(other)}${allow ? `&allow=${encodeURIComponent(allow)}` : ""}`;
      await go(f, page);
      await expect.poll(() => href(f.content)).toBe(page);
      await expect(f.content.frameLocator("#frame").locator("#perm")).toBeVisible();
      return (await (await f.content.locator("#frame").elementHandle())!.contentFrame())!;
    };
    let frame = await openFrame("");
    expect(await frame.evaluate(() => (window as any).ask.geolocation())).toBe("denied");
    await expect(bar(f)).toBeHidden();
    // Allowed by the page (its allow attribute): WebView2 reports the page's address, so the question names the page.
    frame = await openFrame("geolocation");
    const asked = frame.evaluate(() => (window as any).ask.geolocation()) as Promise<string>;
    await expect(bar(f)).toBeVisible();
    await expect(f.shell.locator("#perm-text")).toHaveText("localhost wants to know your location");
    await answer(f, "close");
    expect(await asked).toBe("denied");
    await expect.poll(() => permLog(f, "permission asked", "geolocation")).toBeGreaterThan(0);
    console.log("FRAME-ORIGIN-REPORTED " + JSON.stringify(
      fs.readFileSync(path.join(f.data, "logs", "ferrum.jsonl"), "utf8").split(/\r?\n/)
        .filter((l) => l.includes('"permission asked"') && l.includes('"geolocation"')).map((l) => JSON.parse(l).fields.site)));
  });

  test("a private tab offers Allow this time and Block, and saves nothing", async () => {
    // What the settings say before (an earlier test in this run may have saved a closed question).
    const before = { site: JSON.stringify(await siteOf(f)), file: userSettings(f) };
    await call(f, "tab_new_private", { url: `${base}/perm` });
    await expect.poll(() => f.pages().length).toBe(2);
    const priv = f.pages().find((p) => p.url().startsWith(`${base}/perm`))!;
    await expect(priv.locator("#perm")).toBeVisible();
    const asked = ask(priv, "notifications");
    await expect(bar(f)).toBeVisible();
    for (const b of ["once", "block"]) await expect(f.shell.locator(`#perm-${b}`)).toBeVisible();
    for (const b of ["always", "never", "close"]) await expect(f.shell.locator(`#perm-${b}`)).toBeHidden();
    await answer(f, "once");
    expect(await asked).toBe("granted");
    const blocked = ask(priv, "geolocation");
    await answer(f, "block");
    expect(await blocked).toBe("denied");
    expect(JSON.stringify(await siteOf(f))).toBe(before.site);
    expect(userSettings(f)).toBe(before.file);
  });
});

test.describe("a per-site grant in Settings", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("permissions-grant", {
      extraSettings: '[[sites]]\nsite = "localhost"\npermissions = ["notifications"]\n',
    });
  });
  test.afterAll(async () => { await f?.quit(); });

  test("is honoured without a question; removed in Settings, the site is asked again", async () => {
    await openPerm(f);
    expect(await ask(f.content, "notifications")).toBe("granted");
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => permLog(f, "permission granted", "notifications", "permission-granted")).toBeGreaterThan(0);

    // Revoke through the settings screen's host command (the shell is the only caller allowed).
    const view = await call<Record<string, unknown> & { sites: Site[] }>(f, "settings_get");
    expect(view.sites.find((s) => s.site === "localhost")?.permissions).toEqual(["notifications"]);
    view.sites = view.sites.map((s) => (s.site === "localhost" ? { ...s, permissions: [] } : s));
    await call(f, "settings_set", { input: view });
    expect((await siteOf(f))?.permissions ?? []).toEqual([]);

    await openPerm(f); // a fresh page: the next request
    const asked = ask(f.content, "notifications");
    await answer(f, "close");
    expect(await asked).toBe("denied");
  });
});
