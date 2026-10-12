// p3.6: per-site profiles (Ferrum's default). The test sites are names under localhost (site-a.localhost,
// one./two.site-a.localhost, site-b.localhost; on the test server's certificate). A site's cookie set in its own tab
// is not visible to the same site framed inside another site's tab (a different profile), while a shared-profile run
// shows it (the control); one site in two tabs shares one profile; subdomains share; a link to another site asks first
// and moves the tab only on Continue; a typed address moves without asking; per-site settings survive a restart.
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { dataDir } from "./paths.ts";

const A = "https://site-a.localhost:8443";
const A1 = "https://one.site-a.localhost:8443";
const A2 = "https://two.site-a.localhost:8443";
const B = "https://site-b.localhost:8443";

let f: Ferrum | undefined;
test.afterEach(async () => { await f?.quit(); f = undefined; });

const tabs = async () => (await tabList(f!)).tabs;
const pageAt = async (url: string): Promise<Page> => {
  await expect.poll(() => f!.pages().some((p) => p.url() === url), { timeout: 20_000 }).toBe(true);
  return f!.pages().find((p) => p.url() === url)!;
};
/** Opens `url` in a new tab and waits until it shows. */
const openTab = async (url: string) => {
  const id = await call<number>(f!, "tab_new", { url });
  await pageAt(url);
  return id;
};
const profileOf = async (id: number) => (await tabs()).find((t) => t.id === id)?.profile;
/** The Cookie header site-b's /cookie/read saw inside the frame of `page`. */
const framedCookie = async (page: Page) => {
  await expect.poll(() => page.frames().some((fr) => fr.url().startsWith(`${B}/cookie/read`)), { timeout: 20_000 }).toBe(true);
  const frame = page.frames().find((fr) => fr.url().startsWith(`${B}/cookie/read`))!;
  await expect.poll(() => frame.locator("#cookie").textContent().catch(() => null)).not.toBeNull();
  return (await frame.locator("#cookie").textContent()) ?? "";
};

for (const [mode, perSite] of [["per-site", true], ["shared (control)", false]] as const) {
  test(`cookies across sites: ${mode}`, async () => {
    f = await launch(`profiles-${perSite ? "site" : "shared"}`, { perSite });
    await openTab(`${B}/cookie/set-none`); // site-b's own tab: sets third=1 (SameSite=None)
    const framed = await openTab(`${A}/frame?src=${B}/cookie/read`);
    const seen = await framedCookie(await pageAt(`${A}/frame?src=${B}/cookie/read`));
    if (perSite) {
      // site-a's profile has never stored site-b's cookie.
      expect(seen).not.toContain("third=1");
      expect(await profileOf(framed)).toBe("site-site-a.localhost");
    } else {
      // One shared profile: the framed site-b sends the cookie it set in its own tab.
      expect(seen).toContain("third=1");
    }
  });
}

test("one site in two tabs shares one profile; subdomains share; other sites do not", async () => {
  f = await launch("profiles-share", { perSite: true });
  const b1 = await openTab(`${B}/cookie/set-none`);
  const b2 = await openTab(`${B}/cookie/read`);
  expect(await profileOf(b1)).toBe("site-site-b.localhost");
  expect(await profileOf(b2)).toBe("site-site-b.localhost");
  await go(f, `${B}/cookie/read`); // reload the read page in tab b2 after the cookie exists
  await expect.poll(async () => (await (await pageAt(`${B}/cookie/read`)).locator("#cookie").textContent()) ?? "").toContain("third=1");
  const a1 = await openTab(`${A1}/landing`);
  const a2 = await openTab(`${A2}/landing`);
  expect(await profileOf(a1)).toBe("site-site-a.localhost");
  expect(await profileOf(a2)).toBe("site-site-a.localhost");
  expect(await profileOf(a1)).not.toBe(await profileOf(b1));
});

test("a link to another site asks first; Cancel stays, Continue moves the tab", async () => {
  f = await launch("profiles-cross", { perSite: true });
  const start = `${A}/links/to?href=${B}/landing`;
  const id = await openTab(start);
  for (const t of await tabs()) if (t.id !== id) await call(f, "tab_close", { id: t.id });
  const bar = f.shell.locator("#external-bar");
  const page = await pageAt(start);
  await page.click("#to", { noWaitAfter: true });
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute("data-kind", "cross-site");
  await expect(f.shell.locator("#external-text")).toContainText("site-b.localhost");
  await expect(f.shell.locator("#external-uri")).toHaveText(`${B}/landing`);
  expect((await tabs())[0]!.url).toBe(start);
  await f.shell.click("#external-cancel");
  await expect(bar).toBeHidden();
  expect((await tabs())[0]!.profile).toBe("site-site-a.localhost");
  await page.click("#to", { noWaitAfter: true });
  await expect(bar).toBeVisible();
  await f.shell.click("#external-open"); // "Continue"
  await expect.poll(async () => (await tabs())[0]!.url).toBe(`${B}/landing`);
  expect((await tabs())[0]!.profile).toBe("site-site-b.localhost");
  expect((await tabs())[0]!.id).toBe(id); // the same tab, now in site-b's profile
  // A typed address to another site moves at once, without asking.
  await go(f, `${A}/landing`);
  await expect.poll(async () => (await tabs())[0]!.profile).toBe("site-site-a.localhost");
  await expect(bar).toBeHidden();
});

test("per-site settings choose the profile and survive a restart", async () => {
  const data = dataDir("profiles-settings");
  const extraSettings = '[[sites]]\nsite = "site-a.localhost"\nprofile = "work"\n';
  f = await launch("profiles-settings", { data, perSite: true, extraSettings });
  const id = await openTab(`${A1}/cookie/set-persistent`);
  expect(await profileOf(id)).toBe("user-work");
  await f.quit();
  f = await launch("profiles-settings", { data, perSite: true, extraSettings });
  await expect.poll(async () => (await tabs()).map((t) => t.profile)).toContain("user-work");
  await go(f, `${A1}/cookie/read`);
  await expect.poll(async () => (await (await pageAt(`${A1}/cookie/read`)).locator("#cookie").textContent()) ?? "").toContain("keep=1");
  expect(fs.existsSync(path.join(data, "EBWebView", "WV2Profile_user-work"))).toBe(true);
});
