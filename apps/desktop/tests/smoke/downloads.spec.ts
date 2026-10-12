// p3.8: a download goes to the download folder (here the run's own folder, [downloads] folder) with the right size
// and contents (the test server's bytes are deterministic); the shell shows it done; a download that breaks off shows
// as failed; an existing file is never replaced (the second copy gets " (1)"); the page stays where it was.
// p3.16: a download a site opens in a new window shows no error panel, and the extra tab closes once it is done.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

/** The test server's /download/file bytes: byte i is (31 * i + 7) mod 251. */
const expected = (n: number) => Buffer.from(Array.from({ length: n }, (_, i) => (31 * i + 7) % 251));
const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");

let f: Ferrum;
let folder: string;
test.beforeAll(async () => {
  const data = dataDir("downloads");
  folder = path.join(data, "dl");
  f = await launch("downloads", { data, extraSettings: `[downloads]\nfolder = ${JSON.stringify(folder)}\n` });
  await go(f, `${base}/landing?dl`);
  await expect.poll(async () => (await tabList(f)).tabs[0]!.url).toBe(`${base}/landing?dl`);
});
test.afterAll(async () => { await f?.quit(); });

const line = (file: string) => f.shell.locator("#download-list li", { hasText: file });

test("a download lands in the folder with the right size and contents; the shell shows it done", async () => {
  const n = 300_000;
  await go(f, `${base}/download/file?bytes=${n}`);
  const file = path.join(folder, `fixture-${n}.bin`);
  await expect(line(`fixture-${n}.bin`)).toHaveAttribute("data-state", "completed", { timeout: 20_000 });
  await expect(line(`fixture-${n}.bin`)).toContainText("Done");
  const got = fs.readFileSync(file);
  expect(got.length).toBe(n);
  expect(sha(got)).toBe(sha(expected(n)));
  // The page stays where it was (a download is not a navigation away).
  expect((await tabList(f)).tabs[0]!.url).toBe(`${base}/landing?dl`);
});

test("the same file again gets a new name; nothing is replaced", async () => {
  const n = 300_000;
  const first = fs.statSync(path.join(folder, `fixture-${n}.bin`)).mtimeMs;
  await go(f, `${base}/download/file?bytes=${n}`);
  await expect(line(`fixture-${n} (1).bin`)).toHaveAttribute("data-state", "completed", { timeout: 20_000 });
  expect(fs.readFileSync(path.join(folder, `fixture-${n} (1).bin`)).length).toBe(n);
  expect(fs.statSync(path.join(folder, `fixture-${n}.bin`)).mtimeMs).toBe(first);
});

test("a download that breaks off shows as failed", async () => {
  await go(f, `${base}/download/fail`);
  // WebView2 tries such a download several times (observed: six attempts, only the last reports its end); each retry
  // replaces the older line, so the list ends with one line for it, failed.
  const states = () => f.shell.locator("#download-list li", { hasText: "fixture-fail" }).evaluateAll(
    (els) => els.map((e) => (e as HTMLElement).dataset.state));
  await expect.poll(states, { timeout: 60_000 }).toEqual(["failed"]);
  await expect(f.shell.locator("#download-list li", { hasText: "fixture-fail" }).first()).toContainText("Failed");
  // No complete file of the announced size exists.
  const p = path.join(folder, "fixture-fail.bin");
  expect(fs.existsSync(p) && fs.statSync(p).size === 1_048_576).toBe(false);
});

test("a download opened in a new window: no error panel; the extra tab closes when it is done (p3.16)", async () => {
  const n = 300_000;
  await go(f, `${base}/links/download`);
  await expect(f.content.locator("#dl")).toBeVisible();
  const page = (await tabList(f)).tabs[0]!.id;
  await f.content.click("#dl");
  // Two copies exist already, so this one is " (2)".
  await expect(line(`fixture-${n} (2).bin`)).toHaveAttribute("data-state", "completed", { timeout: 20_000 });
  expect(fs.readFileSync(path.join(folder, `fixture-${n} (2).bin`)).length).toBe(n);
  // The site did open a new tab (the shell saw the request) ...
  expect(await f.shell.evaluate(() => document.title)).toContain('"new-window"');
  // ... and it closed again; the page with the link is the only tab, and no error panel shows.
  await expect.poll(async () => (await tabList(f)).tabs.map((t) => t.id), { timeout: 10_000 }).toEqual([page]);
  await expect(f.shell.locator("#error-panel")).toBeHidden();
  expect((await tabList(f)).tabs[0]!.url).toBe(`${base}/links/download`);
});

test("Clear removes finished downloads from the list", async () => {
  await f.shell.click("#downloads-clear");
  await expect(f.shell.locator("#downloads")).toBeHidden();
});
