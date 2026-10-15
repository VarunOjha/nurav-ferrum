// p4.17: the security settings in the settings screen. Through the screen itself (the shell calls the host commands
// settings_get and settings_set, which only the shell may call: the p2.3 IPC test refuses settings_set from a page),
// the test adds a blocked site and grants a site camera and notifications, saves, restarts Ferrum, and checks both were
// kept and are enforced: the blocked address is refused and audited, the notification grant is honoured (the camera
// grant is checked as kept, not used: that would switch on the real camera). Unticking
// the grant in the screen revokes it at the next request. A plain-HTTP page that loaded shows the "not secure" bar
// (owner answer Q-112); an HTTPS page does not. The screen's "Clear data" button deletes one site's stored data.
import { test, expect } from "@playwright/test";
import { launch, go, call, audited, tabList, type Ferrum } from "./ferrum.ts";
import { base, httpBase, dataDir } from "./paths.ts";

const blockedPage = "https://127.0.0.1:8443/landing";
type View = { blocklist?: string[]; sites: { site: string; profile: string; permissions?: string[] }[] };

const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const openPerm = async (f: Ferrum) => {
  await go(f, `${base}/perm`);
  await expect.poll(() => href(f)).toBe(`${base}/perm`);
  await expect(f.content.locator("#perm")).toBeVisible();
  await f.content.click("#perm");
};
const ask = (f: Ferrum, kind: string) =>
  f.content.evaluate((k) => (window as any).ask[k]().then(String, (e: unknown) => `threw:${String(e)}`), kind);
const openSettings = async (f: Ferrum) => {
  await f.shell.click("#settings-btn");
  await expect(f.shell.locator("#settings-panel")).toBeVisible();
};
const saveSettings = async (f: Ferrum) => {
  await f.shell.click("#settings-save");
  await expect(f.shell.locator("#settings-status")).toHaveText("Saved");
  await expect(f.shell.locator("#settings-errors li")).toHaveCount(0);
  await f.shell.click("#settings-close");
  await expect(f.shell.locator("#settings-panel")).toBeHidden();
};
/** The settings row of `site` (its input's value, which the screen sets as a property, not an attribute). */
const siteRow = async (f: Ferrum, site: string) => {
  const i = await f.shell.locator("#set-sites tbody .set-site").evaluateAll(
    (els, s) => els.findIndex((e) => (e as HTMLInputElement).value === s), site);
  expect(i, `settings row of ${site}`).toBeGreaterThanOrEqual(0);
  return f.shell.locator("#set-sites tbody tr").nth(i);
};

test("blocked sites and site permissions: set in the screen, kept after a restart, enforced, revoked", async () => {
  const data = dataDir("security-settings");
  // Settings in the user file only, so what the screen saves is what the next start reads.
  let f = await launch("security-settings", { data, userFileOnly: true });
  try {
    await openSettings(f);
    await f.shell.fill("#set-blocklist", "=127.0.0.1");
    await f.shell.click("#set-add-site");
    const row = f.shell.locator("#set-sites tbody tr").last();
    await row.locator(".set-site").fill("localhost");
    await row.locator('.set-perm[value="camera"]').check();
    await row.locator('.set-perm[value="notifications"]').check();
    await saveSettings(f);
    // A bad rule is refused with its line, and nothing is saved.
    await openSettings(f);
    await f.shell.fill("#set-blocklist", "=127.0.0.1\nhttps://not a host/");
    await f.shell.click("#settings-save");
    await expect(f.shell.locator("#settings-status")).toHaveText("Not saved");
    await expect(f.shell.locator("#settings-errors")).toContainText('Blocked site "https://not a host/"');
    await f.shell.click("#settings-close");
  } finally {
    await f.quit();
  }

  f = await launch("security-settings", { data, userFileOnly: true });
  try {
    const v = await call<View>(f, "settings_get");
    expect(v.blocklist).toEqual(["=127.0.0.1"]);
    expect(v.sites.find((s) => s.site === "localhost")?.permissions).toEqual(["camera", "notifications"]);
    // The screen shows them again.
    await openSettings(f);
    await expect(f.shell.locator("#set-blocklist")).toHaveValue("=127.0.0.1");
    const row = await siteRow(f, "localhost");
    await expect(row.locator('.set-perm[value="notifications"]')).toBeChecked();
    await expect(row.locator('.set-perm[value="geolocation"]')).not.toBeChecked();
    await f.shell.click("#settings-close");

    // Enforced: the blocked address is refused and audited.
    await go(f, blockedPage);
    await expect(f.shell.locator("#status")).toHaveText("Blocked: 127.0.0.1 is on your blocked sites list");
    await expect.poll(() => audited(f, { origin: "https://127.0.0.1:8443", rule: "blocklist" })).toBeGreaterThan(0);

    // Enforced: the grant is honoured; a kind not granted is asked (p4.20) and refused when the question is closed.
    await openPerm(f);
    expect(await ask(f, "notifications")).toBe("granted");
    await expect(f.shell.locator("#perm-bar")).toBeHidden();
    const geo = ask(f, "geolocation");
    await expect(f.shell.locator("#perm-bar")).toBeVisible();
    await f.shell.click("#perm-close");
    expect(await geo).toBe("denied");
    // The camera grant is kept and shown (above) but not used here: with a grant, asking would switch on the PC's real
    // camera. Its effect is the same code path as notifications (p4.5 tests every kind's refusal).

    // Revoked in the screen: refused at the next request.
    await openSettings(f);
    await (await siteRow(f, "localhost")).locator('.set-perm[value="notifications"]').uncheck();
    await saveSettings(f);
    await openPerm(f);
    const again = ask(f, "notifications");
    await expect(f.shell.locator("#perm-bar")).toBeVisible();
    await f.shell.click("#perm-close");
    expect(await again).toBe("denied");
    expect((await call<View>(f, "settings_get")).sites.find((s) => s.site === "localhost")?.permissions).toEqual(["camera"]);
  } finally {
    await f.quit();
  }
});

test("the not-secure bar shows for a plain-HTTP page and not for HTTPS", async () => {
  // The current HTTP rule (owner answer Q-112): load as typed, with the bar. Test settings files say version 2, which
  // keeps the older upgrade-to-HTTPS rule unless the file chooses.
  const f = await launch("insecure-bar", { extraSettings: '[security]\nhttp_policy = "warn"\n' });
  try {
    const bar = f.shell.locator("#insecure-bar");
    await go(f, `${httpBase}/landing`);
    await expect.poll(() => href(f)).toBe(`${httpBase}/landing`);
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("Not secure");
    await go(f, `${base}/landing`);
    await expect.poll(() => href(f)).toBe(`${base}/landing`);
    await expect(bar).toBeHidden();
  } finally {
    await f.quit();
  }
});

test("Clear data in the screen deletes one site's stored data", async () => {
  const site = "https://site-a.localhost:8443";
  const f = await launch("clear-site-ui", { perSite: true });
  try {
    const readTitle = async (url: string) => {
      const id = await call<number>(f, "tab_new", { url });
      let title = "";
      await expect.poll(async () => {
        title = (await tabList(f)).tabs.find((t) => t.id === id)?.title ?? "";
        return title.startsWith("stored ");
      }, { timeout: 30_000 }).toBe(true);
      await call(f, "tab_close", { id });
      await expect.poll(async () => (await tabList(f)).tabs.some((t) => t.id === id)).toBe(false);
      return title;
    };
    expect(await readTitle(`${site}/storage?auto=write:S1`)).toBe("stored c=S1 l=S1 i=S1");
    await openSettings(f);
    await f.shell.click("#set-add-site");
    const row = f.shell.locator("#set-sites tbody tr").last();
    await row.locator(".set-site").fill("site-a.localhost");
    await row.locator(".set-clear").click();
    await expect(f.shell.locator("#settings-status")).toHaveText("Cleared the data of site-a.localhost");
    await f.shell.click("#settings-close");
    expect(await readTitle(`${site}/storage?auto=read`)).toBe("stored c= l= i=");
  } finally {
    await f.quit();
  }
});
