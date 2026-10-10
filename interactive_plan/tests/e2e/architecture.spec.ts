// architecture.spec: the Architecture tab (Architecture mockup, adr-0026): a four-group switcher;
// the Application group shows a layered diagram of the Rust app made of plain boxes with a "How to
// read this" side panel (no graph, no sideways scrolling at 1280 px or on a phone, about one screen
// high); every box opens a popup for its part with what it talks to; the other groups list their parts
// one line each, opening the same popup. Accessible (axe) in every group.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Arch {
  layers: { id: string; components: string[] }[];
  groups: { id: string; name: string; purpose: string; components: string[] }[];
  components: { id: string; title: string; group: string; ours: boolean; status: string; connects: { to: string }[] }[];
}
const arch = portalJson<Arch>("architecture.json");
const comp = new Map(arch.components.map((c) => [c.id, c]));

test("the application group shows the layered diagram and the side panel; a box opens its part", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/architecture");
  const switcher = page.getByTestId("group-switcher").getByRole("button");
  await expect(switcher).toHaveCount(arch.groups.length);
  await expect(switcher.first()).toHaveAttribute("aria-pressed", "true");
  const diagram = page.getByTestId("layer-diagram");
  await expect(diagram).toBeVisible();
  await expect(page.getByTestId("how-to-read")).toBeVisible();
  const inLayers = arch.layers.flatMap((l) => l.components);
  await expect(diagram.locator("[data-part]")).toHaveCount(inLayers.length);
  // No giant graph, no sideways scrolling, and no long list of connections under the diagram.
  // (Icons inside the closed part popups do not count: only drawn graphics on the page itself.)
  expect(await page.locator("main svg, main canvas").evaluateAll((els) => els.filter((e) => !e.closest("dialog")).length)).toBe(0);
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await expect(page.locator('[data-group="application"] .connects')).toHaveCount(0);
  const box = await diagram.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(1280);

  // A part with connections: its popup lists what it talks to; a link there opens that part's explainer.
  const withLinks = inLayers.find((id) => (comp.get(id)?.connects.length ?? 0) > 0)!;
  await diagram.locator(`[data-part="${withLinks}"]`).click();
  const dialog = page.getByRole("dialog", { name: comp.get(withLinks)!.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".connects li")).toHaveCount(comp.get(withLinks)!.connects.length);
  await expect(dialog.locator(".phase-head")).not.toContainText(withLinks);
  await expectAccessible(page, `#detail-dialog-${withLinks}`);
  const to = comp.get(withLinks)!.connects[0].to;
  await dialog.locator(`.connects [data-ref-id="${to}"]`).click();
  await expect(page.getByTestId("ref-dialog").locator("#ref-dialog-title")).toHaveText(comp.get(to)?.title ?? to);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("parts that are not ours say 'Used from', not 'Built in' (review 2026-10-09)", async ({ page }) => {
  await page.goto("/architecture");
  const notOurs = arch.components.filter((c) => !c.ours && arch.layers.some((l) => l.components.includes(c.id)));
  expect(notOurs.length).toBeGreaterThan(0);
  for (const c of notOurs) {
    await page.getByTestId("layer-diagram").locator(`[data-part="${c.id}"]`).click();
    const dialog = page.getByRole("dialog", { name: c.title });
    await expect(dialog.getByTestId("part-when")).toHaveText(/^Used from /);
    await expect(dialog.locator(".phase-head .chip")).not.toHaveText("Planned");
    await page.keyboard.press("Escape");
  }
});

test("each group shows its own parts; the choice is kept in the address", async ({ page }) => {
  await page.goto("/architecture");
  for (const [i, g] of arch.groups.entries()) {
    await page.getByTestId("group-switcher").getByRole("button").nth(i).click();
    await expect(page.getByTestId("group-switcher").getByRole("button").nth(i)).toHaveAttribute("aria-pressed", "true");
    const panel = page.locator(`[data-group="${g.id}"]`);
    await expect(panel).toBeVisible();
    await expect(page.locator("section[data-group]:visible")).toHaveCount(1);
    if (g.id === "application") await expect(page.getByTestId("layer-diagram")).toBeVisible();
    else {
      await expect(page.getByTestId("layer-diagram")).toBeHidden();
      await expect(panel.locator(".part-row")).toHaveCount(g.components.length);
      if (g.components.length === 0) await expect(panel).toContainText("No parts of its own");
    }
    await expect(page).toHaveURL(new RegExp(`#group-${g.id}$`));
    await expectAccessible(page);
  }
  const last = arch.groups[arch.groups.length - 1];
  await page.reload();
  await expect(page.locator(`[data-group="${last.id}"]`)).toBeVisible();
});

test("a part row opens its popup; glance cards switch groups", async ({ page }) => {
  await page.goto("/architecture");
  const g = arch.groups.find((x) => x.id !== "application" && x.components.length > 0)!;
  await page.getByRole("button", { name: `Show ${g.name}` }).click();
  await expect(page.locator(`[data-group="${g.id}"]`)).toBeVisible();
  const first = comp.get(g.components[0])!;
  await page.locator(`[data-group="${g.id}"] [data-component="${first.id}"] .row-title`).click();
  await expect(page.getByRole("dialog", { name: first.title })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("about one screen high at 1440 px; phone width: the diagram stacks and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/architecture");
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  // The v2 review measured 2606 px with the parts grid; diagram + side panel + glance cards fit far less.
  expect(h).toBeLessThan(1900);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/architecture");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});
