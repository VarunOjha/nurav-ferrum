// p2.8: loading indicator while a slow page loads; HTTP 404/500 shown as a toolbar status; an unreachable host shows
// the shell's own error panel; the content view never shows the app's local origin.
import { test, expect } from "@playwright/test";
import { launch, go, call, tabList, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
const contentUrls: string[] = [];
test.beforeAll(async () => {
  f = await launch("errors");
  f.content.on("framenavigated", (fr) => {
    if (fr === f.content.mainFrame()) contentUrls.push(fr.url());
  });
});
test.afterAll(async () => { await f?.quit(); });

const state = () => f.shell.locator("#toolbar");

test("slow page shows the loading state, then loaded", async () => {
  await go(f, `${base}/slow?ms=2500`);
  await expect(state()).toHaveAttribute("data-state", "loading");
  await expect(f.shell.locator("#reload")).toHaveAttribute("title", "Stop");
  // Visible while waiting (owner checklist 2026-10-12): "Loading…" in the accent colour and a moving 3px line.
  await expect(f.shell.locator("#status")).toHaveText("Loading…");
  const look = await f.shell.evaluate(() => {
    const css = (sel: string, pseudo?: string) => getComputedStyle(document.querySelector(sel)!, pseudo ?? null);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const probe = document.createElement("i"); probe.style.color = accent; document.body.append(probe);
    const accentRgb = getComputedStyle(probe).color; probe.remove();
    return { status: css("#status").color, accentRgb, opacity: css("#progress").opacity, height: css("#progress").height,
      animation: css("#progress", "::before").animationName };
  });
  expect(look.status).toBe(look.accentRgb);
  expect(look.opacity).toBe("1");
  expect(look.height).toBe("3px");
  expect(look.animation).toBe("ferrum-progress");
  await expect(state()).toHaveAttribute("data-state", "loaded", { timeout: 15_000 });
  await expect(f.shell.locator("#reload")).toHaveAttribute("title", "Reload");
});

for (const code of [404, 500]) {
  test(`HTTP ${code} is shown as a toolbar status, the site's page stays`, async () => {
    await go(f, `${base}/status/${code}`);
    await expect(state()).toHaveAttribute("data-state", "http-error");
    await expect(f.shell.locator("#status")).toContainText(String(code));
    await expect(f.shell.locator("#error-panel")).toBeHidden();
    await expect(f.content).toHaveURL(`${base}/status/${code}`);
  });
}

test("unreachable host shows the shell's error panel, and the app recovers", async () => {
  await go(f, "https://127.0.0.1:1/");
  await expect(state()).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
  await expect(f.shell.locator("#error-panel")).toBeVisible();
  await expect(f.shell.locator("#error-address")).toHaveText("https://127.0.0.1:1/");
  await expect(f.shell.locator("#lock")).toHaveText(""); // no lock for a page that never loaded
  // While the panel shows, the tab's view is hidden, so the shell's panel is what the user sees.
  const shown = async () => (await call<{ shown: number[] }>(f, "test_stats")).shown;
  await expect.poll(shown).toEqual([]);
  await f.shell.screenshot({ path: `${f.data}/error-panel.png` });
  await go(f, `${base}/landing`);
  await expect(state()).toHaveAttribute("data-state", "loaded");
  await expect(f.shell.locator("#error-panel")).toBeHidden();
  const active = (await tabList(f)).active;
  await expect.poll(shown).toEqual([active]);
  await expect(f.content).toHaveURL(`${base}/landing`);
});

test("the content view never showed the app's own origin", async () => {
  expect(contentUrls.length).toBeGreaterThan(0);
  expect(contentUrls.filter((u) => u.startsWith("http://tauri.localhost") || u.startsWith("tauri:"))).toEqual([]);
});
