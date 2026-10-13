// p3.21: backup and restore (adr-0032). One Ferrum makes a passphrase-locked backup of its bookmarks and history from
// the Backup and restore screen; a fresh Ferrum looks inside it (a wrong passphrase or a changed byte is refused),
// merges it, then replaces with it (keeping a copy of the library first). The passphrase appears in no log.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, go, visit, call, type Ferrum } from "./ferrum.ts";
import { base, dataDir } from "./paths.ts";

type Bookmark = { url: string; title: string; folder: string };
type Entry = { url: string };
const PASS = "a long and secret passphrase 42";
const dataA = dataDir("backup-a");
const dataB = dataDir("backup-b");
const file = path.join(dataA, "test.ferrum-backup");
let f: Ferrum | undefined;
test.afterAll(async () => { await f?.quit(); });

test("make a backup from the Backup and restore screen", async () => {
  f = await launch("backup-a", { data: dataA });
  await visit(f, `${base}/counted/bk-one`);
  await visit(f, `${base}/counted/bk-two`);
  await call(f, "bookmark_add", { url: `${base}/counted/bk-one`, title: "Backed up one", folder: "Work" });
  await call(f, "bookmark_add", { url: `${base}/landing?bk`, title: "Backed up bar", folder: null });
  await f.shell.locator("#sidebar-btn").click();
  await f.shell.locator("#side-backup").click();
  await expect(f.shell.locator("#backup-panel")).toBeVisible();
  // The screen puts the cursor in the first passphrase box when it has opened; typing earlier would land there.
  await expect(f.shell.locator("#bk-pass1")).toBeFocused();
  await expect(f.shell.locator("#bk-out")).toHaveValue(/ferrum-backup-\d{4}-\d{2}-\d{2}.*\.ferrum-backup$/);
  await f.shell.locator("#bk-out").fill(file);
  // Two different passphrases, then a short one: refused, nothing written.
  await f.shell.locator("#bk-pass1").fill(PASS);
  await f.shell.locator("#bk-pass2").fill(PASS + "x");
  await f.shell.locator("#bk-export").click();
  await expect(f.shell.locator("#bk-export-status")).toHaveText(/not the same/);
  await f.shell.locator("#bk-pass1").fill("short");
  await f.shell.locator("#bk-pass2").fill("short");
  await f.shell.locator("#bk-export").click();
  await expect(f.shell.locator("#bk-export-status")).toHaveText(/at least 12 characters/);
  expect(fs.existsSync(file)).toBe(false);
  await f.shell.locator("#bk-pass1").fill(PASS);
  await f.shell.locator("#bk-pass2").fill(PASS);
  await f.shell.locator("#bk-export").click();
  await expect(f.shell.locator("#bk-export-status")).toHaveText(/^Saved: 2 bookmarks, 2 history entries/, { timeout: 20_000 });
  await expect(f.shell.locator("#bk-pass1")).toHaveValue("");
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(0, 8).toString("latin1")).toBe("FERRUMBK");
  expect(bytes.toString("latin1")).not.toContain("bk-one"); // nothing readable inside
  // An existing file is never replaced.
  await expect(call(f, "backup_export", { path: file, passphrase: PASS })).rejects.toBeTruthy();
  await f.quit();
  f = undefined;
});

test("a fresh Ferrum: wrong passphrase and a changed byte are refused; merge, then replace", async () => {
  f = await launch("backup-b", { data: dataB });
  await call(f, "bookmark_add", { url: `${base}/landing?mine`, title: "Mine", folder: null });
  await f.shell.locator("#sidebar-btn").click();
  await f.shell.locator("#side-backup").click();
  await expect(f.shell.locator("#bk-pass1")).toBeFocused();
  await f.shell.locator("#bk-in").fill(file);
  await expect(f.shell.locator("#bk-in")).toHaveValue(file);
  await f.shell.locator("#bk-pass3").fill("not the right passphrase");
  await f.shell.locator("#bk-look").click();
  await expect(f.shell.locator("#bk-preview")).toHaveText(/wrong passphrase, or the file was changed/, { timeout: 20_000 });
  await expect(f.shell.locator("#bk-choose")).toBeHidden();
  const changed = path.join(dataB, "changed.ferrum-backup");
  const bytes = fs.readFileSync(file);
  bytes[bytes.length - 5] ^= 1;
  fs.writeFileSync(changed, bytes);
  await expect(call(f, "backup_preview", { path: changed, passphrase: PASS })).rejects.toThrow(/changed or damaged/);
  await expect(call(f, "backup_import", { path: changed, passphrase: PASS, replace: true })).rejects.toBeTruthy();
  expect((await call<Bookmark[]>(f, "bookmark_list")).map((b) => b.title)).toEqual(["Mine"]);

  await f.shell.locator("#bk-pass3").fill(PASS);
  await f.shell.locator("#bk-look").click();
  await expect(f.shell.locator("#bk-preview")).toHaveText(/^Inside: 2 bookmarks, 2 history entries/, { timeout: 20_000 });
  await f.shell.locator("#bk-merge").click();
  await expect(f.shell.locator("#bk-import-status")).toHaveText(/^Added 2 bookmarks, 2 history entries/, { timeout: 20_000 });
  expect((await call<Bookmark[]>(f, "bookmark_list")).map((b) => b.title).sort()).toEqual(["Backed up bar", "Backed up one", "Mine"]);
  const urls = (await call<Entry[]>(f, "history_list", { query: "bk", limit: null })).map((e) => e.url);
  expect(urls).toEqual(expect.arrayContaining([`${base}/counted/bk-one`, `${base}/counted/bk-two`]));
  await expect(f.shell.locator("#bookmarks-bar a", { hasText: "Backed up bar" })).toBeVisible();

  // Replace (asked twice): only the backup's bookmarks stay; a copy of the old library is kept.
  await f.shell.locator("#bk-pass3").fill(PASS);
  await f.shell.locator("#bk-look").click();
  await expect(f.shell.locator("#bk-choose")).toBeVisible({ timeout: 20_000 });
  await f.shell.locator("#bk-replace").click();
  await expect(f.shell.locator("#bk-replace")).toHaveText(/Click again/);
  // Changing the file after looking inside disarms Merge and Replace: the new file must be looked into first.
  await f.shell.locator("#bk-in").fill(changed);
  await expect(f.shell.locator("#bk-choose")).toBeHidden();
  await f.shell.locator("#bk-in").fill(file);
  await f.shell.locator("#bk-pass3").fill(PASS);
  await f.shell.locator("#bk-look").click();
  await expect(f.shell.locator("#bk-choose")).toBeVisible({ timeout: 20_000 });
  await expect(f.shell.locator("#bk-replace")).toHaveText("Replace mine");
  await f.shell.locator("#bk-replace").click();
  await expect(f.shell.locator("#bk-replace")).toHaveText(/Click again/);
  await f.shell.locator("#bk-replace").click();
  await expect(f.shell.locator("#bk-import-status")).toHaveText(/previous library was saved as/, { timeout: 20_000 });
  expect((await call<Bookmark[]>(f, "bookmark_list")).map((b) => b.title).sort()).toEqual(["Backed up bar", "Backed up one"]);
  expect(fs.readdirSync(dataB).some((n) => n.startsWith("ferrum.db.before-import-"))).toBe(true);
  await f.shell.locator("#backup-close").click();
  await expect(f.shell.locator("#backup-panel")).toBeHidden();
});

test("the passphrase is in no log", async () => {
  const logs: string[] = [];
  for (const d of [dataA, dataB]) {
    logs.push(fs.readFileSync(path.join(d, "app.log"), "latin1"));
    const dir = path.join(d, "logs");
    if (fs.existsSync(dir)) for (const n of fs.readdirSync(dir)) logs.push(fs.readFileSync(path.join(dir, n), "latin1"));
  }
  expect(logs.join("\n")).toContain("backup imported");
  expect(logs.join("\n")).not.toContain(PASS);
});
