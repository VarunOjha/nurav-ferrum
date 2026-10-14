// p4.9: the security audit log. One run makes Ferrum refuse several kinds of action (a blocked page with a secret in
// its address, a frame, a pop-up, a link type that is always refused, a permission, a typed malformed address). Each
// refusal is one audit line with exactly six fields (schema checked by auditRecords), the origin is scheme and host
// only, and nothing from the address path, query or typed text appears in the file.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, auditRecords, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const blocked = "https://127.0.0.1:8443";
const SECRET = "s3cr3t-token-value";
let f: Ferrum;
test.beforeAll(async () => { f = await launch("audit-log", { extraSettings: '[security]\nblocklist = ["=127.0.0.1"]\n' }); });
test.afterAll(async () => { await f?.quit(); });

const href = (f: Ferrum) => f.content.evaluate(() => location.href).catch(() => "(loading)");
const open = async (route: string, sel: string) => {
  await go(f, `${base}${route}`);
  await expect.poll(() => href(f)).toBe(`${base}${route}`);
  await expect(f.content.locator(sel).first()).toBeVisible();
};
const has = (want: (r: ReturnType<typeof auditRecords>[number]) => boolean) =>
  expect.poll(() => auditRecords(f).some(want), { timeout: 15_000 });

test("each kind of refusal is one schema-valid audit line without page content", async () => {
  await open("/landing", "#landing");
  await go(f, `${blocked}/private/path?token=${SECRET}#frag`);
  await has((r) => r.action === "page" && r.origin === blocked && r.rule === "blocklist").toBe(true);

  await open(`/frame?src=${encodeURIComponent(`${blocked}/landing?token=${SECRET}`)}`, "#frame");
  await has((r) => r.action === "frame" && r.origin === blocked && r.rule === "blocklist").toBe(true);

  await open(`/links/open?href=${encodeURIComponent(`${blocked}/landing`)}`, "#open");
  await f.content.click("#open");
  await has((r) => r.action === "new-window" && r.rule === "blocklist").toBe(true);

  await open("/links/risky", "#msdt");
  await f.content.click("#msdt", { noWaitAfter: true });
  await has((r) => r.origin === "ms-msdt:" && r.rule === "external-risky").toBe(true);

  await open("/perm", "#perm");
  await f.content.evaluate(() => (window as any).ask.notifications());
  await has((r) => r.action === "permission-notifications" && r.rule === "permission-not-granted").toBe(true);

  await call(f, "tab_navigate", { input: `https://exa mple.org/${SECRET}` });
  await has((r) => r.action === "address-bar" && r.origin === "(typed)").toBe(true);

  // Schema (checked inside auditRecords) and no page content: no path, query, fragment or typed text.
  const records = auditRecords(f);
  expect(records.length).toBeGreaterThanOrEqual(6);
  const text = fs.readFileSync(path.join(f.data, "logs", "audit.jsonl"), "utf8");
  for (const bad of [SECRET, "/private/path", "#frag", "exa mple", "landing"]) expect(text, bad).not.toContain(bad);
  console.log("AUDIT-SAMPLE " + JSON.stringify(records.slice(0, 6)));
});
