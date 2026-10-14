// p4.3: every navigation path passes the policy engine. With 127.0.0.1 on the blocked sites list (the fixture server
// answers there and on localhost, so one server gives an allowed and a blocked host), the blocked host is refused when
// typed, after a redirect from an allowed page, inside a frame and in a window.open; a malformed typed address is
// refused too. Every refusal is in Ferrum's log with its rule and context. Allowed controls show that the same paths
// still work for an allowed host.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, audited, auditRecords, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const blockedHost = "https://127.0.0.1:8443";
const blockedPage = `${blockedHost}/landing`;
const blockedSite = blockedHost; // as the log writes it: scheme and host only

type LogLine = { target: string; fields: Record<string, unknown> };
const policyLog = (f: Ferrum): LogLine[] => {
  const p = path.join(f.data, "logs", "ferrum.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LogLine; } catch { return null; } })
    .filter((l): l is LogLine => l !== null && l.target === "ferrum::policy");
};
const deniedLog = (f: Ferrum, context: string) =>
  policyLog(f).filter((l) => l.fields.message === "navigation denied" && l.fields.context === context
    && l.fields.site === blockedSite && l.fields.rule === "blocklist" && l.fields.matched === "=127.0.0.1").length;
// p4.9: a refusal counts only when the app log and the security audit log (schema-checked) both have it.
const denied = (f: Ferrum, context: string) =>
  Math.min(deniedLog(f, context), audited(f, { action: context, origin: blockedSite, rule: "blocklist" }));
// The page's own address (after a cancelled navigation Playwright's cached URL can be stale or empty).
const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const open = async (f: Ferrum, route: string, selector: string) => {
  await go(f, `${base}${route}`);
  await expect.poll(() => href(f)).toBe(`${base}${route}`);
  await expect(f.content.locator(selector).first()).toBeVisible();
};
const status = (f: Ferrum) => f.shell.locator("#status");
const blockedNote = "Blocked: 127.0.0.1 is on your blocked sites list";

let f: Ferrum;
test.beforeAll(async () => {
  f = await launch("security-navigation", { extraSettings: '[security]\nblocklist = ["=127.0.0.1"]\n' });
});
test.afterAll(async () => { await f?.quit(); });
// On a failure, keep the order of events the shell received (a redirect's toolbar note was missing once in about six
// runs during p4.9; the refusal and its audit line were correct).
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) console.log("shell events:", await f?.shell.evaluate(() => document.title).catch(String));
});

test("a typed blocked address is refused and logged", async () => {
  await open(f, "/landing", "#landing");
  await go(f, blockedPage);
  await expect(status(f)).toHaveText(blockedNote);
  await expect.poll(() => denied(f, "page")).toBeGreaterThan(0);
  expect(await href(f)).toBe(`${base}/landing`);
});

test("a redirect from an allowed page to the blocked host is refused and logged", async () => {
  await open(f, "/landing", "#landing");
  await go(f, `${base}/goto?url=${encodeURIComponent(blockedPage)}`);
  await expect.poll(() => denied(f, "redirect")).toBeGreaterThan(0);
  await expect(status(f)).toHaveText(blockedNote);
  expect(await href(f)).not.toContain("127.0.0.1");
  // Control: the same redirect to an allowed page arrives.
  await go(f, `${base}/goto?url=${encodeURIComponent("/landing?via=goto")}`);
  await expect.poll(() => href(f)).toBe(`${base}/landing?via=goto`);
});

test("a frame showing the blocked host is refused and logged; an allowed frame loads", async () => {
  await open(f, `/frame?src=${encodeURIComponent(blockedPage)}`, "#frame");
  await expect.poll(() => denied(f, "frame")).toBeGreaterThan(0);
  await expect(status(f)).toHaveText(`Blocked a frame: 127.0.0.1 is on your blocked sites list`);
  const inner = () => f.content.frames().filter((fr) => fr !== f.content.mainFrame());
  for (const fr of inner()) expect(fr.url().startsWith(blockedHost)).toBe(false);
  // Control: an allowed frame on the same kind of page loads its content.
  await open(f, `/frame?src=${encodeURIComponent("/landing")}`, "#frame");
  await expect.poll(() => inner().some((fr) => fr.url() === `${base}/landing`)).toBe(true);
});

test("window.open of the blocked host opens nothing and is logged; an allowed one opens a tab", async () => {
  await open(f, `/links/open?href=${encodeURIComponent(blockedPage)}`, "#open");
  await f.content.click("#open");
  await expect.poll(() => denied(f, "new-window")).toBeGreaterThan(0);
  await expect(status(f)).toHaveText(blockedNote);
  expect((await tabList(f)).tabs.length).toBe(1);
  // Control: an allowed address from the same button opens a new tab.
  await f.shell.waitForTimeout(1100); // past the one-new-tab-per-second limit
  await open(f, `/links/open?href=${encodeURIComponent("/landing")}`, "#open");
  await f.content.click("#open");
  await expect.poll(async () => (await tabList(f)).tabs.length).toBe(2);
  const l = await tabList(f);
  for (const t of l.tabs.slice(1)) await call(f, "tab_close", { id: t.id });
  await expect.poll(() => f.pages().length).toBe(1);
});

test("a malformed address is refused and logged", async () => {
  const before = policyLog(f).filter((l) => l.fields.message === "typed address refused").length;
  const r = await call<{ outcome: string; reason: string | null }>(f, "tab_navigate", { input: "https://exa mple.org/" });
  expect(r.outcome).toBe("refused");
  await expect.poll(() => policyLog(f).filter((l) => l.fields.message === "typed address refused").length).toBe(before + 1);
  expect(auditRecords(f).filter((r) => r.action === "address-bar" && r.origin === "(typed)" && r.rule.startsWith("typed-")).length).toBeGreaterThan(0);
  // What was typed is not in the log.
  expect(fs.readFileSync(path.join(f.data, "logs", "ferrum.jsonl"), "utf8")).not.toContain("exa mple");
  expect(fs.readFileSync(path.join(f.data, "logs", "audit.jsonl"), "utf8")).not.toContain("exa mple");
});
