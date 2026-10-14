// p4.6: safe downloads. The test server sends small text files under names chosen to cause trouble: a path that tries
// to climb out of the download folder, a program type, a right-to-left mark that hides the real extension, and a
// Windows device name. Each file lands in the configured folder under a safe name; program files get the warning on
// their download line; nothing is opened (the launcher is replaced by a test stand-in that only writes a line).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, tabList, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

const WARNING = "Program file: open it only if you trust the site";
let f: Ferrum;
let data: string;
let folder: string;
test.beforeAll(async () => {
  data = dataDir("safe-downloads");
  folder = path.join(data, "dl");
  f = await launch("safe-downloads", {
    data,
    extraSettings: `[downloads]\nfolder = ${JSON.stringify(folder)}\n`,
    env: { FERRUM_LAUNCHER_LOG: path.join(data, "launches.txt") },
  });
  await go(f, `${base}/landing?dl`);
  await expect.poll(async () => (await tabList(f)).tabs[0]!.url).toBe(`${base}/landing?dl`);
});
test.afterAll(async () => { await f?.quit(); });

const files = () => (fs.existsSync(folder) ? fs.readdirSync(folder) : []);
/** Downloads `name` and returns the one new file name in the folder, once its line says done. */
async function download(name: string): Promise<string> {
  const before = new Set(files());
  await go(f, `${base}/download/named?name=${encodeURIComponent(name)}`);
  await expect.poll(() => files().filter((n) => !before.has(n) && !n.endsWith(".crdownload")).length, { timeout: 20_000 }).toBe(1);
  const got = files().find((n) => !before.has(n) && !n.endsWith(".crdownload"))!;
  await expect(f.shell.locator("#download-list li", { hasText: got })).toHaveAttribute("data-state", "completed", { timeout: 20_000 });
  return got;
}
const line = (file: string) => f.shell.locator("#download-list li", { hasText: file });
const noLaunches = () => expect(fs.existsSync(path.join(data, "launches.txt"))).toBe(false);

test("a name that climbs out of the folder lands inside it, under a plain name", async () => {
  const got = await download("..\\..\\escape-attempt.txt");
  expect(got).toMatch(/escape-attempt\.txt$/);
  expect(got).not.toMatch(/[\\/]/);
  expect(fs.existsSync(path.join(data, "escape-attempt.txt"))).toBe(false);
  expect(fs.existsSync(path.join(folder, "..", "..", "escape-attempt.txt"))).toBe(false);
  await expect(line(got)).not.toContainText(WARNING);
});

test("a program file is saved with the warning and is not opened", async () => {
  const got = await download("setup.exe");
  expect(got).toBe("setup.exe");
  await expect(line(got)).toContainText(WARNING);
  await f.shell.waitForTimeout(1000);
  noLaunches();
  // Observation only (not a pass condition): whether Windows' "downloaded from the internet" mark was added.
  console.log("Zone.Identifier on setup.exe:", fs.existsSync(path.join(folder, "setup.exe:Zone.Identifier")));
});

test("a right-to-left mark cannot hide a program's real extension", async () => {
  const got = await download("photo‮gpj.exe");
  expect(got).not.toContain("‮");
  expect(got.toLowerCase().endsWith(".exe")).toBe(true);
  await expect(line(got)).toContainText(WARNING);
  noLaunches();
});

test("a Windows device name is not used as a file name", async () => {
  const got = await download("CON.txt");
  expect(got.toLowerCase()).not.toBe("con.txt");
  expect(fs.readFileSync(path.join(folder, got), "utf8")).toContain("This file does nothing");
});
