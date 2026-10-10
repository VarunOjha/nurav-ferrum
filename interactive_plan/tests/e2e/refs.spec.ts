// refs.spec: the global reference popup. Any id opens an accessible dialog with its refs.json
// explainer; related ids open in the same dialog (Back returns); Esc and the close button close it;
// focus returns to the id that opened it, also when the id sits inside a phase popup.
import { expect, test, type Page } from "@playwright/test";
import { portalJson } from "./helpers";

interface Refs {
  refs: { id: string; title: string; summary: string; related: string[]; aliases?: string[] }[];
}
const refs = portalJson<Refs>("refs.json");
const byId = new Map(refs.refs.map((r) => [r.id, r]));
for (const r of refs.refs) for (const a of r.aliases ?? []) byId.set(a, r);

const refDialog = (page: Page) => page.getByTestId("ref-dialog");

test("every id on the overview resolves to an explainer", async ({ page }) => {
  await page.goto("/");
  const ids = await page.locator("main [data-ref-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ref-id")!));
  expect(ids.length).toBeGreaterThan(0);
  const unknown = [...new Set(ids)].filter((id) => !byId.has(id));
  expect(unknown).toEqual([]);
});

test("keyboard: Enter opens the explainer, Esc closes it, focus returns to the id", async ({ page }) => {
  await page.goto("/");
  const ref = page.locator("main [data-ref-id]").first();
  const id = (await ref.getAttribute("data-ref-id"))!;
  const info = byId.get(id)!;
  await ref.focus();
  await page.keyboard.press("Enter");
  const d = refDialog(page);
  await expect(d).toBeVisible();
  await expect(d).toHaveAttribute("aria-labelledby", "ref-dialog-title");
  await expect(page.getByRole("dialog", { name: info.title })).toBeVisible();
  await expect(d).toContainText(info.summary);
  // Focus is on the explainer's title, inside the dialog.
  await expect(d.locator("#ref-dialog-title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(ref).toBeFocused();
});

test("Space opens it too, and the close button closes it", async ({ page }) => {
  await page.goto("/");
  const ref = page.locator("main [data-ref-id]").nth(1);
  await ref.focus();
  await page.keyboard.press(" ");
  const d = refDialog(page);
  await expect(d).toBeVisible();
  await d.getByRole("button", { name: "Close" }).click();
  await expect(d).toBeHidden();
  await expect(ref).toBeFocused();
});

test("related ids open in the same dialog, and Back returns", async ({ page }) => {
  await page.goto("/");
  // Find an id on the page whose explainer lists related ids.
  const ids = await page.locator("main [data-ref-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ref-id")!));
  const withRelated = ids.find((id) => (byId.get(id)?.related.length ?? 0) > 0);
  test.skip(!withRelated, "no id on the overview has related ids");
  const first = byId.get(withRelated!)!;
  const ref = page.locator(`main [data-ref-id="${withRelated}"]`).first();
  await ref.click();
  const d = refDialog(page);
  await expect(d.locator("#ref-dialog-title")).toHaveText(first.title);
  const relId = first.related[0];
  // No internal slugs in the head or the related list, only titles and short names (review 2026-10-09).
  const slug = /(?:comp|layer|metric|wl|exp|cfg|ov|ops|qual|ip|adr|risk|rq|hyp)-[a-z0-9]/;
  expect(await d.locator(".ref-dialog-kind").innerText()).not.toMatch(slug);
  for (const t of await d.locator(".ref-related").allInnerTexts()) expect(t).not.toMatch(slug);
  await d.locator(`.ref-related[data-ref-id="${relId}"]`).click();
  const second = byId.get(relId);
  await expect(d.locator("#ref-dialog-title")).toHaveText(second ? second.title : `No explainer for ${relId}`);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await d.getByRole("button", { name: /^← Back to/ }).click();
  await expect(d.locator("#ref-dialog-title")).toHaveText(first.title);
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(ref).toBeFocused();
});

test("an id inside a phase popup opens on top; Esc closes only the explainer, then the popup", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("phase-cards").getByRole("button").first();
  await card.click();
  const phaseDialog = page.locator("dialog.modal[open]");
  await expect(phaseDialog).toBeVisible();
  const taskRef = phaseDialog.locator(".tasks-table [data-ref-id]").first();
  const taskId = (await taskRef.getAttribute("data-ref-id"))!;
  await taskRef.click();
  const d = refDialog(page);
  await expect(d.locator("#ref-dialog-title")).toHaveText(byId.get(taskId)!.title);
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(phaseDialog).toBeVisible();
  await expect(taskRef).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(phaseDialog).toBeHidden();
  await expect(card).toBeFocused();
});

test("a click on the backdrop closes the explainer", async ({ page }) => {
  await page.goto("/");
  await page.locator("main [data-ref-id]").first().click();
  const d = refDialog(page);
  await expect(d).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(d).toBeHidden();
});
