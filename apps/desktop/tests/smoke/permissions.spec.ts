// p4.5: permissions. A test page asks for each sensitive kind; with default settings the page's own script sees a
// refusal for every one, and Ferrum logs each request it was asked about. A per-site grant in settings is honoured,
// and removing it in the settings screen takes effect at the next request (WebView2 keeps no answer in the profile).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, audited, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

type LogLine = { target: string; fields: Record<string, unknown> };
const permAppLog = (f: Ferrum, message: string, kind: string) => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return 0;
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LogLine; } catch { return null; } })
    .filter((l) => l?.target === "ferrum::policy" && l.fields.message === message && l.fields.kind === kind).length;
};
// p4.9: a refusal counts only when the security audit log (schema-checked) has it too.
const permLog = (f: Ferrum, message: string, kind: string) =>
  message === "permission denied"
    ? Math.min(permAppLog(f, message, kind), audited(f, { action: `permission-${kind}` }))
    : permAppLog(f, message, kind);
const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const openPerm = async (f: Ferrum) => {
  await go(f, `${base}/perm`);
  await expect.poll(() => href(f)).toBe(`${base}/perm`);
  await expect(f.content.locator("#perm")).toBeVisible();
  await f.content.click("#perm"); // focus and a user gesture (the clipboard needs both)
};
const ask = (f: Ferrum, kind: string) =>
  f.content.evaluate((k) => (window as any).ask[k]().then(String, (e: unknown) => `threw:${String(e)}`), kind);

test.describe("default settings: every permission refused", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("permissions"); });
  test.afterAll(async () => { await f?.quit(); });

  test("notifications, location and clipboard reading are refused and logged", async () => {
    await openPerm(f);
    expect(await ask(f, "notifications")).toBe("denied");
    expect(await ask(f, "geolocation")).toBe("denied");
    expect(await ask(f, "clipboard")).toBe("NotAllowedError");
    for (const kind of ["notifications", "geolocation", "clipboard-read"]) {
      await expect.poll(() => permLog(f, "permission denied", kind), { message: kind }).toBeGreaterThan(0);
    }
    await expect(f.shell.locator("#status")).toContainText("(allow it in Settings)");
  });

  test("camera and microphone are refused", async () => {
    await openPerm(f);
    // NotAllowedError: Ferrum refused. NotFoundError: this PC has no such device, so nothing could be given anyway.
    for (const kind of ["camera", "microphone"]) {
      const r = await ask(f, kind);
      expect(["NotAllowedError", "NotFoundError"], `${kind}: ${r}`).toContain(r);
      if (r === "NotAllowedError") await expect.poll(() => permLog(f, "permission denied", kind)).toBeGreaterThan(0);
    }
  });

  test("a frame on the page is refused too", async () => {
    await go(f, `${base}/frame?src=${encodeURIComponent("/perm")}`);
    await expect.poll(() => href(f)).toBe(`${base}/frame?src=${encodeURIComponent("/perm")}`);
    await expect(f.content.frameLocator("#frame").locator("#perm")).toBeVisible();
    const frame = (await (await f.content.locator("#frame").elementHandle())!.contentFrame())!;
    const before = permLog(f, "permission denied", "geolocation");
    expect(await frame.evaluate(() => (window as any).ask.geolocation())).toBe("denied");
    await expect.poll(() => permLog(f, "permission denied", "geolocation")).toBeGreaterThan(before);
  });
});

test.describe("a per-site grant", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("permissions-grant", {
      extraSettings: '[[sites]]\nsite = "localhost"\npermissions = ["notifications"]\n',
    });
  });
  test.afterAll(async () => { await f?.quit(); });

  test("is honoured, and removing it in settings takes effect at the next request", async () => {
    await openPerm(f);
    expect(await ask(f, "notifications")).toBe("granted");
    await expect.poll(() => permLog(f, "permission granted", "notifications")).toBeGreaterThan(0);
    expect(await ask(f, "geolocation")).toBe("denied"); // only the granted kind

    // Revoke through the settings screen's host command (the shell is the only caller allowed).
    const view = await call<Record<string, unknown> & { sites: { site: string; profile: string; permissions?: string[] }[] }>(f, "settings_get");
    expect(view.sites.find((s) => s.site === "localhost")?.permissions).toEqual(["notifications"]);
    view.sites = view.sites.map((s) => (s.site === "localhost" ? { ...s, permissions: [] } : s));
    await call(f, "settings_set", { input: view });
    const after = await call<{ sites: { site: string; permissions?: string[] }[] }>(f, "settings_get");
    expect(after.sites.find((s) => s.site === "localhost")?.permissions ?? []).toEqual([]);

    await openPerm(f); // a fresh page: the next request
    const before = permLog(f, "permission denied", "notifications");
    expect(await ask(f, "notifications")).toBe("denied");
    await expect.poll(() => permLog(f, "permission denied", "notifications")).toBeGreaterThan(before);
  });
});
