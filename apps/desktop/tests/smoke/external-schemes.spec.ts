// p4.4: links to other apps. A custom-scheme link shows the confirmation bar and, without the user's click, the
// operating system's handler is never called (the launcher is mocked: FERRUM_LAUNCHER_LOG, debug builds only; a
// "launch" is a line in a file). Link types that are always refused (ms-msdt:, search-ms:) never get the bar, whether
// clicked or typed. With a list of allowed types in settings, an unlisted type is refused and a listed one still asks.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, auditRecords, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const launches = (f: Ferrum) => {
  const p = path.join(f.data, "launches.txt");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean) : [];
};
const mockLauncher = (d: string) => ({ FERRUM_LAUNCHER_LOG: path.join(d, "launches.txt") });
const open = async (f: Ferrum, route: string, selector: string) => {
  await go(f, `${base}${route}`);
  await expect.poll(() => href(f)).toBe(`${base}${route}`);
  await expect(f.content.locator(selector)).toBeVisible();
};
type LogLine = { target: string; fields: Record<string, unknown> };
const deniedRules = (f: Ferrum): string[] => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LogLine; } catch { return null; } })
    .filter((l): l is LogLine => l !== null && l.target === "ferrum::policy" && l.fields.message === "navigation denied")
    .map((l) => String(l.fields.rule))
    // p4.9: only refusals that are also in the security audit log (schema-checked) count.
    .filter((rule) => auditRecords(f).some((r) => r.rule === rule));
};
const bar = (f: Ferrum) => f.shell.locator("#external-bar");
const status = (f: Ferrum) => f.shell.locator("#status");

test.describe("default settings: any type, always ask (Q-224)", () => {
  let f: Ferrum;
  test.beforeAll(async () => { f = await launch("external-schemes", { envFromData: mockLauncher }); });
  test.afterAll(async () => { await f?.quit(); });

  test("a custom-scheme link asks first; without the click nothing is launched", async () => {
    await open(f, "/links/schemes", "#custom");
    await f.content.click("#custom", { noWaitAfter: true });
    await expect(bar(f)).toBeVisible();
    await expect(f.shell.locator("#external-uri")).toHaveText("ferrum-test:hello");
    await f.shell.waitForTimeout(2000); // no consent: nothing may happen while the bar waits
    expect(launches(f)).toEqual([]);
    await f.shell.click("#external-cancel");
    await expect(bar(f)).toBeHidden();
    await f.shell.waitForTimeout(500);
    expect(launches(f)).toEqual([]);
    // A confirmation the app did not ask for (a forged call from the shell) launches nothing.
    const forged = await call(f, "external_open_confirm", { uri: "ferrum-test:hello" }).then(() => "ok", (e: unknown) => String(e));
    expect(forged).toContain("not the link");
    expect(launches(f)).toEqual([]);
  });

  test("always-refused link types never get the bar, clicked or typed", async () => {
    // One click per page load: after a cancelled navigation the test robot treats the page as still loading.
    for (const [sel, scheme] of [["#msdt", "ms-msdt"], ["#searchms", "search-ms"]] as const) {
      await open(f, "/links/risky", sel);
      await f.content.click(sel, { noWaitAfter: true });
      await expect(status(f)).toHaveText(`Blocked: ${scheme} links are always refused (known to be abused)`);
      await expect(bar(f)).toBeHidden();
    }
    const r = await call<{ outcome: string }>(f, "tab_navigate", { input: "ms-msdt:/id%20PCWDiagnostic" });
    expect(r.outcome).toBe("confirm"); // the address bar sees another app's link; the policy then refuses it
    await f.shell.waitForTimeout(500);
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => deniedRules(f).filter((x) => x === "external-risky").length).toBeGreaterThanOrEqual(3);
    expect(launches(f)).toEqual([]);
  });
});

test.describe("a list of allowed types in settings", () => {
  let f: Ferrum;
  test.beforeAll(async () => {
    f = await launch("external-schemes-list", {
      envFromData: mockLauncher,
      extraSettings: '[security]\nexternal_allowlist = ["mailto"]\n',
    });
  });
  test.afterAll(async () => { await f?.quit(); });

  test("an unlisted type is refused; a listed type still asks and opens only after the click", async () => {
    await open(f, "/links/schemes", "#custom");
    await f.content.click("#custom", { noWaitAfter: true });
    await expect(status(f)).toHaveText("Blocked: ferrum-test links are not on your allowed list");
    await expect(bar(f)).toBeHidden();
    await expect.poll(() => deniedRules(f).includes("external-not-listed")).toBe(true);
    await open(f, "/links/schemes", "#mailto");
    await f.content.click("#mailto", { noWaitAfter: true });
    await expect(f.shell.locator("#external-uri")).toHaveText("mailto:test@example.invalid");
    expect(launches(f)).toEqual([]);
    await f.shell.click("#external-open");
    await expect.poll(() => launches(f)).toEqual(["mailto:test@example.invalid"]);
  });
});
