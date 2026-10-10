// decisions.spec: the Decisions tab. Every decision is one row; its title opens a popup (what it
// means, why, the catch, your approval state); replaced decisions are muted, say what replaced them,
// and their popup opens the replacement on top. The risks we watch are listed highest first, each
// with its own popup. Accessible (axe), phone width without sideways scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Decisions {
  items: { id: string; title: string; why: string; catch: string | null; status: string; replaced_by: string | null }[];
}
interface Risks {
  items: { id: string; title: string; likelihood: number; impact: number; mitigation: string }[];
}
const decisions = portalJson<Decisions>("decisions.json");
const risks = portalJson<Risks>("risks.json");

test("one row per decision; replaced ones are muted and name their replacement", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/decisions");
  const rows = page.getByTestId("decision-list").locator("li[data-decision]");
  await expect(rows).toHaveCount(decisions.items.length);
  for (const d of decisions.items) {
    const row = page.locator(`[data-decision="${d.id}"]`);
    await expect(row.locator(".row-title")).toHaveText(d.title);
    await expect(row).toContainText(d.status);
    if (d.replaced_by) {
      await expect(row).toHaveClass(/is-muted/);
      await expect(row.locator(`[data-ref-id="${d.replaced_by}"]`)).toBeVisible();
    } else {
      await expect(row).not.toHaveClass(/is-muted/);
    }
  }
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("a decision opens in a popup; a replaced one opens its replacement on top", async ({ page }) => {
  await page.goto("/decisions");
  const d = decisions.items.find((x) => x.replaced_by)!;
  const replacement = decisions.items.find((x) => x.id === d.replaced_by)!;
  const title = page.locator(`[data-decision="${d.id}"] .row-title`);
  await title.click();
  const dialog = page.getByRole("dialog", { name: d.title });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(d.why);
  if (d.catch) await expect(dialog).toContainText("The catch");
  await expect(dialog).toContainText(/Your approval: /);
  await expectAccessible(page, `#detail-dialog-${d.id}`);
  await dialog.getByRole("button", { name: /^Open what replaced it/ }).click();
  const second = page.getByRole("dialog", { name: replacement.title });
  await expect(second).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(second).toBeHidden();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(title).toBeFocused();
});

test("risks are listed highest first and open in a popup", async ({ page }) => {
  await page.goto("/decisions");
  const rows = page.getByTestId("risk-table").locator("tbody tr");
  await expect(rows).toHaveCount(risks.items.length);
  const shown = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-risk")!));
  const score = new Map(risks.items.map((r) => [r.id, r.likelihood * r.impact]));
  const scores = shown.map((id) => score.get(id)!);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  const top = risks.items.find((r) => r.id === shown[0])!;
  await rows.first().getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: top.title });
  await expect(dialog).toContainText(top.mitigation);
  await page.keyboard.press("Escape");
});

test("phone width: no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/decisions");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await page.locator("[data-decision] .row-title").first().click();
  const box = await page.locator("dialog[open]").boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
