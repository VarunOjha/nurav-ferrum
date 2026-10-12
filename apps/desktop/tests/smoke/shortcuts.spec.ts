// p3.3: every keyboard shortcut works with focus in the shell and with focus inside a page. Keys in the shell are
// pressed through Playwright (they are the shell's own DOM events); keys inside a page are real Windows key presses
// (realKeys), because CDP key events never reach WebView2's accelerator-key hook. A shortcut taken inside a page never
// reaches the page; ordinary keys still do. (The p2.3 IPC test, run by the p3.3 check, shows pages still cannot call
// the app.)
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, realKeys, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("shortcuts"); });
test.afterAll(async () => { await f?.quit(); });

const urls = async () => (await tabList(f)).tabs.map((t) => t.url);
const activeIndex = async () => {
  const l = await tabList(f);
  return l.tabs.findIndex((t) => t.id === l.active);
};
const activeUrl = async () => {
  const l = await tabList(f);
  return l.tabs.find((t) => t.id === l.active)?.url ?? "";
};
const shellFocus = () => f.shell.evaluate(() => document.activeElement?.id ?? "");
const activePage = async () => {
  const want = await activeUrl();
  await expect.poll(() => f.pages().some((p) => p.url() === want)).toBe(true);
  return f.pages().find((p) => p.url() === want)!;
};

/** Three tabs n=1..3 (active: the last), each page recording the keys it receives. */
async function threeTabs(): Promise<void> {
  for (const t of (await tabList(f)).tabs) await call(f, "tab_close", { id: t.id });
  for (let n = 1; n <= 3; n++) await call(f, "tab_new", { url: `${base}/landing?n=${n}` });
  await expect.poll(urls).toEqual([1, 2, 3].map((n) => `${base}/landing?n=${n}`));
  await expect.poll(() => f.pages().length).toBe(3);
  for (const p of f.pages()) {
    await expect.poll(() => p.evaluate(() => document.readyState).catch(() => "")).toBe("complete");
    await p.evaluate(() => {
      (window as any).__keys = [];
      addEventListener("keydown", (e) => (window as any).__keys.push(`${e.ctrlKey ? "C-" : ""}${e.altKey ? "A-" : ""}${e.key}`), true);
    });
  }
}

type Press = (keys: { pw: string; win: string }) => Promise<void>;
const inShell: Press = async ({ pw }) => {
  await f.shell.locator("#address").focus();
  await f.shell.keyboard.press(pw);
};
const inPage: Press = async ({ win }) => {
  await call(f, "test_focus", { target: "content" });
  await f.shell.waitForTimeout(400);
  realKeys(f, win);
};

for (const [where, press] of [["shell", inShell], ["page", inPage]] as const) {
  test.describe(`focus in the ${where}`, () => {
    test.beforeEach(threeTabs);

    test("switching: Ctrl+1, Ctrl+9, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+Page Down, Ctrl+Page Up", async () => {
      await press({ pw: "Control+1", win: "^1" });
      await expect.poll(activeIndex).toBe(0);
      await press({ pw: "Control+9", win: "^9" });
      await expect.poll(activeIndex).toBe(2);
      await press({ pw: "Control+Tab", win: "^{TAB}" });
      await expect.poll(activeIndex).toBe(0); // wraps around
      await press({ pw: "Control+Shift+Tab", win: "^+{TAB}" });
      await expect.poll(activeIndex).toBe(2);
      await press({ pw: "Control+PageUp", win: "^{PGUP}" });
      await expect.poll(activeIndex).toBe(1);
      await press({ pw: "Control+PageDown", win: "^{PGDN}" });
      await expect.poll(activeIndex).toBe(2);
    });

    test("new, close, reopen: Ctrl+T, Ctrl+W, Ctrl+Shift+T", async () => {
      await press({ pw: "Control+t", win: "^t" });
      await expect.poll(async () => (await tabList(f)).tabs.length).toBe(4);
      await expect.poll(activeIndex).toBe(3);
      await expect.poll(shellFocus).toBe("address"); // a new tab puts the cursor in the address bar
      await call(f, "tab_activate", { id: (await tabList(f)).tabs[1]!.id });
      await press({ pw: "Control+w", win: "^w" });
      await expect.poll(urls).toEqual([`${base}/landing?n=1`, `${base}/landing?n=3`, "about:blank"]);
      await press({ pw: "Control+Shift+T", win: "^+t" });
      await expect.poll(urls).toEqual([1, 2, 3].map((n) => `${base}/landing?n=${n}`).concat("about:blank"));
      await expect.poll(activeUrl).toBe(`${base}/landing?n=2`);
    });

    test("address bar: Ctrl+L, Alt+D, F6", async () => {
      for (const k of [{ pw: "Control+l", win: "^l" }, { pw: "Alt+d", win: "%d" }, { pw: "F6", win: "{F6}" }]) {
        await f.shell.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await press(k);
        await expect.poll(shellFocus).toBe("address");
      }
    });

    test("back, forward, reload: Alt+Left, Alt+Right, F5, Ctrl+R", async () => {
      await go(f, `${base}/counted/shortcut-${where}`);
      await expect.poll(activeUrl).toBe(`${base}/counted/shortcut-${where}`);
      const count = async () => {
        const t = await (await activePage()).locator("#count").textContent().catch(() => "");
        return Number(/count:(\d+)/.exec(t ?? "")?.[1] ?? 0);
      };
      await expect.poll(count).toBeGreaterThan(0);
      const before = await count();
      await press({ pw: "F5", win: "{F5}" });
      await expect.poll(count).toBe(before + 1);
      await press({ pw: "Control+r", win: "^r" });
      await expect.poll(count).toBe(before + 2);
      await press({ pw: "Alt+ArrowLeft", win: "%{LEFT}" });
      await expect.poll(activeUrl).toBe(`${base}/landing?n=3`);
      await press({ pw: "Alt+ArrowRight", win: "%{RIGHT}" });
      await expect.poll(activeUrl).toBe(`${base}/counted/shortcut-${where}`);
    });
  });
}

test("inside a page, Ferrum's shortcuts never reach the page; ordinary keys do", async () => {
  await threeTabs();
  const page = await activePage();
  await call(f, "test_focus", { target: "content" });
  await f.shell.waitForTimeout(400);
  realKeys(f, "a");
  await expect.poll(() => page.evaluate(() => (window as any).__keys as string[])).toContain("a");
  realKeys(f, "^1"); // switches to tab 1: the page of tab 3 must not see Ctrl+1
  await expect.poll(activeIndex).toBe(0);
  const seen: string[] = await page.evaluate(() => (window as any).__keys);
  expect(seen.filter((k) => k === "C-1")).toEqual([]);
});
