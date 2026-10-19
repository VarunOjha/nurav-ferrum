// p5.9 (adr-0008, owner's Q-114 answer): the network log. With the log switched on, the /netlog fixture page (its
// stylesheet, script, the site icon, a frame of another site and one fetch) gives exactly the expected records; a
// navigation Ferrum refuses is logged as blocked; every record has exactly the allowed fields (no header, cookie or
// body field). With the default settings the log is off and writes nothing.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

const B = "https://site-b.localhost:8443";
const BLOCKED = "https://127.0.0.1:8443/landing";
const FIELDS = ["content_length", "method", "policy_decision", "profile", "resource_type", "site", "status", "t_ms", "tab", "ts", "url"];

type Rec = Record<string, unknown> & { tab: number; url: string; method: string; status: number | null; resource_type: string | null; policy_decision: string };

function readLog(folder: string): { lines: string[]; recs: Rec[] } {
  const lines = fs.readdirSync(folder).filter((f) => /^netlog\.\d{4}\.jsonl$/.test(f)).sort()
    .flatMap((f) => fs.readFileSync(path.join(folder, f), "utf8").split("\n").filter((l) => l.length > 0));
  return { lines, recs: lines.map((l) => JSON.parse(l) as Rec) };
}

test.describe.serial("network log", () => {
  let f: Ferrum | undefined;
  test.afterEach(async () => { await f?.quit(); f = undefined; });

  test("switched on: exactly the expected records, metadata only", async () => {
    test.setTimeout(120_000);
    f = await launch("network-log", {
      extraSettings: '[network_log]\nenabled = true\n[security]\nblocklist = ["=127.0.0.1"]\n',
    });
    const folder = await call<string | null>(f, "test_netlog");
    expect(folder).not.toBeNull();
    expect(path.basename(path.dirname(folder!))).toBe("netlogs");

    const tab = await call<number>(f, "tab_new", { url: `${base}/netlog` });
    await expect.poll(async () => (await tabList(f!)).tabs.find((t) => t.id === tab)?.title, { timeout: 30_000 }).toBe("netlog done");
    const expected = [
      ["GET", `${base}/netlog`, "document", 200],
      ["GET", `${base}/netlog/style.css`, "stylesheet", 200],
      ["GET", `${base}/netlog/app.js`, "script", 200],
      ["GET", `${base}/icon.png`, "image", 200],
      ["GET", `${B}/landing`, "frame", 200],
      ["GET", `${base}/netlog/data.json`, "fetch", 200],
    ].map((e) => e.join(" ")).sort();
    const ofTab = () => readLog(folder!).recs.filter((r) => r.tab === tab)
      .map((r) => [r.method, r.url, r.resource_type, r.status].join(" ")).sort();
    // responses arrive in any order and shortly after the page; wait until six are in, then two more seconds for strays
    await expect.poll(() => ofTab().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(expected.length);
    await new Promise((r) => setTimeout(r, 2000));
    expect(ofTab()).toEqual(expected);

    // a navigation Ferrum refuses is in the log as blocked, with no response
    await call(f, "tab_activate", { id: tab });
    await go(f, BLOCKED);
    await expect.poll(() => readLog(folder!).recs.some((r) => r.url === BLOCKED && r.policy_decision === "blocked:blocklist"), { timeout: 15_000 }).toBe(true);
    const blocked = readLog(folder!).recs.find((r) => r.url === BLOCKED)!;
    expect([blocked.status, blocked.method, blocked.resource_type]).toEqual([null, "", null]);
    // Finding of p5.9 (Q-229, not asserted): the refused page is never shown, yet WebView2 may still report a response
    // for it, because the request reached the server. Printed so the evidence shows what happened in this run.
    await new Promise((r) => setTimeout(r, 2000));
    const leaked = readLog(folder!).recs.filter((r) => r.url === BLOCKED && r.status !== null);

    // metadata only: every record has exactly the allowed fields, and nothing that looks like a header, cookie or body
    const { lines, recs } = readLog(folder!);
    for (const r of recs) expect(Object.keys(r).sort()).toEqual(FIELDS);
    for (const l of lines) expect(l).not.toMatch(/sec-fetch|cookie|set-cookie|user-agent|content-type|"headers"|"body"/i);
    const pageRecs = recs.filter((r) => r.tab === tab);
    console.log(`NETLOG: ${recs.length} records in ${lines.length} lines; the /netlog tab's ${pageRecs.length}:\n${pageRecs
      .map((r) => `  ${r.method} ${String(r.url).replace(base, "").replace(B, "site-b")} ${r.status} ${r.resource_type} ${r.content_length ?? "-"} B ${r.policy_decision}`)
      .join("\n")}\n  blocked: ${BLOCKED.replace("https://", "")} ${blocked.policy_decision}; responses still reported for it: ${leaked.length}`);
  });

  test("default settings: the log is off and writes nothing", async () => {
    f = await launch("network-log-off");
    expect(await call<string | null>(f, "test_netlog")).toBeNull();
    const tab = await call<number>(f, "tab_new", { url: `${base}/netlog` });
    await expect.poll(async () => (await tabList(f!)).tabs.find((t) => t.id === tab)?.title, { timeout: 30_000 }).toBe("netlog done");
    expect(fs.existsSync(path.join(f.data, "netlogs"))).toBe(false);
    console.log("NETLOG-OFF: no log folder with the default settings");
  });
});
