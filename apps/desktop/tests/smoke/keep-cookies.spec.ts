// p2.11: cookies live in Ferrum's data folder: a persistent cookie set before closing Ferrum is sent again after a
// restart on the same folder; a session cookie (no expiry) is gone, as in a normal browser.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

test("a persistent cookie survives closing and reopening Ferrum", async () => {
  const data = dataDir("cookies");
  const cookie = (f: Awaited<ReturnType<typeof launch>>) => f.content.locator("#cookie");

  const first = await launch("cookies", { data });
  try {
    await go(first, `${base}/cookie/set-persistent`);
    await expect(first.content).toHaveURL(`${base}/cookie/set-persistent`);
    await go(first, `${base}/cookie/set`);
    await expect(first.content).toHaveURL(`${base}/cookie/set`);
    await go(first, `${base}/cookie/read`);
    await expect(cookie(first)).toContainText("keep=1");
    await expect(cookie(first)).toContainText("fixture=1");
  } finally {
    await first.quit();
  }
  expect(first.proc.exitCode).toBe(0);
  // The site cookies are stored in Ferrum's own WebView2 profile inside the data folder (adr-0029).
  expect(fs.existsSync(path.join(data, "EBWebView", "WV2Profile_ferrum-default", "Network", "Cookies"))).toBe(true);

  const second = await launch("cookies", { data });
  try {
    await go(second, `${base}/cookie/read`);
    await expect(cookie(second)).toContainText("keep=1");
    await expect(cookie(second)).not.toContainText("fixture=1");
  } finally {
    await second.quit();
  }
});
