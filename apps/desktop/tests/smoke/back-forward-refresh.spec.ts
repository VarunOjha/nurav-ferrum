// p2.7: A then B then back shows A, forward shows B, refresh reloads B (the test server counts requests); the
// back/forward buttons follow the history (adr-0030).
import { test, expect } from "@playwright/test";
import { launch, go, type Ferrum } from "./ferrum.ts";
import { base } from "./paths.ts";

let f: Ferrum;
test.beforeAll(async () => { f = await launch("bfr"); });
test.afterAll(async () => { await f?.quit(); });

const count = async () => Number(((await f.content.textContent("#count")) ?? "count:0").split(":")[1]);

test("back, forward and refresh behave like a browser", async () => {
  const id = `${Date.now()}`;
  const A = `${base}/counted/a${id}`;
  const B = `${base}/counted/b${id}`;
  const back = f.shell.locator("#back");
  const forward = f.shell.locator("#forward");

  await go(f, A);
  await expect(f.content).toHaveURL(A);
  await expect(f.content.locator("#count")).toHaveText("count:1");
  await go(f, B);
  await expect(f.content).toHaveURL(B);
  await expect(f.content.locator("#count")).toHaveText("count:1");
  await expect(back).toBeEnabled();
  await expect(forward).toBeDisabled();

  await back.click();
  await expect(f.content).toHaveURL(A);
  await expect(f.shell.locator("#address")).toHaveValue(A);
  await expect(forward).toBeEnabled();

  await forward.click();
  await expect(f.content).toHaveURL(B);
  await expect(forward).toBeDisabled();

  const before = await count();
  await f.shell.locator("#reload").click();
  await expect(f.content.locator("#count")).toHaveText(`count:${before + 1}`);
  await expect(f.content).toHaveURL(B);
});
