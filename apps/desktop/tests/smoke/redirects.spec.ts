// p2.9: every redirect fixture ends on the final page with its address in the address bar; a redirect loop ends in
// the shell's error state.
import { test, expect } from "@playwright/test";
import { launch, go, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("redirects"); });
test.afterAll(async () => { await f?.quit(); });

for (const kind of ["301", "302", "303", "307", "308", "chain"]) {
  test(`redirect ${kind} shows the final address`, async () => {
    await go(f, `${base}/redirect/${kind}`);
    await expect(f.content).toHaveURL(`${base}/landing`);
    await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "loaded");
    await expect(f.shell.locator("#address")).toHaveValue(`${base}/landing`);
    await expect(f.content.locator("#landing")).toBeVisible();
  });
}

test("a redirect loop ends in the error state", async () => {
  await go(f, `${base}/redirect/loop`);
  await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "failed", { timeout: 30_000 });
  await expect(f.shell.locator("#error-panel")).toBeVisible();
  await expect(f.shell.locator("#error-text")).toContainText("redirect");
  // Recovery: a normal address works again.
  await go(f, `${base}/landing`);
  await expect(f.shell.locator("#toolbar")).toHaveAttribute("data-state", "loaded");
  await expect(f.shell.locator("#error-panel")).toBeHidden();
});
