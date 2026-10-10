// architecture.spec: the Architecture tab (Architecture mockup, adr-0026): a four-group switcher;
// the Application group leads with a layered diagram of the Rust app made of plain boxes (no graph,
// no sideways scrolling at 1280 px or on a phone); each group lists its parts with what they talk
// to; every box and part opens its explainer. Accessible (axe) in every group.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Arch {
  layers: { id: string; components: string[] }[];
  groups: { id: string; name: string; purpose: string; components: string[] }[];
  components: { id: string; title: string; group: string }[];
}
const arch = portalJson<Arch>("architecture.json");
const title = new Map(arch.components.map((c) => [c.id, c.title]));

test("the application group shows the layered diagram; a box opens its explainer", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/architecture");
  const switcher = page.getByTestId("group-switcher").getByRole("button");
  await expect(switcher).toHaveCount(arch.groups.length);
  await expect(switcher.first()).toHaveAttribute("aria-pressed", "true");
  const diagram = page.getByTestId("layer-diagram");
  await expect(diagram).toBeVisible();
  const inLayers = arch.layers.flatMap((l) => l.components);
  await expect(diagram.locator("[data-ref-id]")).toHaveCount(inLayers.length);
  // No giant graph and no sideways scrolling at 1280 px.
  await expect(page.locator("main svg, main canvas")).toHaveCount(0);
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  const box = await diagram.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(1280);

  const first = inLayers[0];
  await diagram.locator(`[data-ref-id="${first}"]`).click();
  const ref = page.getByTestId("ref-dialog");
  await expect(ref).toBeVisible();
  await expect(ref.locator("#ref-dialog-title")).toHaveText(title.get(first)!);
  await page.keyboard.press("Escape");
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("each group shows its own parts; the choice is kept in the address", async ({ page }) => {
  await page.goto("/architecture");
  for (const [i, g] of arch.groups.entries()) {
    await page.getByTestId("group-switcher").getByRole("button").nth(i).click();
    await expect(page.getByTestId("group-switcher").getByRole("button").nth(i)).toHaveAttribute("aria-pressed", "true");
    const panel = page.locator(`[data-group="${g.id}"]`);
    await expect(panel).toBeVisible();
    await expect(page.locator("section[data-group]:visible")).toHaveCount(1);
    await expect(panel.locator(".comp-card")).toHaveCount(g.components.length);
    if (g.components.length === 0) await expect(panel).toContainText("No parts of its own");
    await expect(page.getByTestId("layer-diagram")).toBeVisible({ visible: g.id === "application" });
    await expect(page).toHaveURL(new RegExp(`#group-${g.id}$`));
    await expectAccessible(page);
  }
  const last = arch.groups[arch.groups.length - 1];
  await page.reload();
  await expect(page.locator(`[data-group="${last.id}"]`)).toBeVisible();
});

test("a part's links open the explainer of the part it talks to; glance cards switch groups", async ({ page }) => {
  await page.goto("/architecture");
  const withLink = page.locator('[data-group="application"] .connects [data-ref-id]').first();
  const to = (await withLink.getAttribute("data-ref-id"))!;
  await withLink.click();
  await expect(page.getByTestId("ref-dialog").locator("#ref-dialog-title")).toHaveText(title.get(to) ?? to);
  await page.keyboard.press("Escape");
  const g = arch.groups[1];
  await page.getByRole("button", { name: `Show ${g.name}` }).click();
  await expect(page.locator(`[data-group="${g.id}"]`)).toBeVisible();
});

test("phone width: the diagram stacks and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/architecture");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});
