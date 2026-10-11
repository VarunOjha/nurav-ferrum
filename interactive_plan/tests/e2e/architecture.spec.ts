// architecture.spec: the Architecture tab (Architecture mockup, adr-0026): a four-group switcher;
// the Application group shows a layered diagram of the Rust app made of plain boxes with a "How to
// read this" side panel (no graph, no sideways scrolling at 1280 px or on a phone, about one screen
// high); every box opens a popup for its part with what it talks to; the other groups list their parts
// one line each, opening the same popup. Accessible (axe) in every group.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Arch {
  browser_design?: { title: string; decision: string; canvas_url: string; sample_note: string; callouts: { label: string }[] };
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
  // (Icons inside the closed part popups and inside the picture of the browser window do not count:
  // only drawn graphics of the diagram itself.)
  expect(
    await page
      .locator("main svg, main canvas")
      .evaluateAll((els) => els.filter((e) => !e.closest("dialog") && !e.closest("[data-testid=browser-mockup]")).length),
  ).toBe(0);
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
  // The browser picture (owner's design choice of 2026-10-10) sits on top of the diagram by request, so
  // it does not count towards the one-screen goal of the diagram itself.
  const designBlock = page.getByTestId("browser-design");
  const design = (await designBlock.count()) ? (await designBlock.boundingBox())!.height + 18 : 0;
  // The v2 review measured 2606 px with the parts grid; diagram + side panel + glance cards fit far less.
  expect(h - design).toBeLessThan(1900);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/architecture");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

// "How the browser will look" (owner's choice of 2026-10-10, option A): only in the Application group,
// first in it, before the layer diagram. A static picture (one image for screen readers) with a
// Light / Dark switch that starts on the portal theme, the callouts, the sample note, the canvas link
// and the decision link. It scales to the width: no sideways scrolling on a phone. Axe in both themes.
test.describe("browser design", () => {
  test.skip(!arch.browser_design, "architecture.json has no browser_design yet");
  const d = arch.browser_design!;

  test("the Application group shows the picture first; the other groups do not", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/architecture");
    const block = page.getByTestId("browser-design");
    await expect(block).toBeVisible();
    await expect(block.getByRole("heading", { name: d.title })).toBeVisible();
    const pic = page.getByRole("img", { name: /planned Ferrum browser window/ });
    await expect(pic).toBeVisible();
    // Nothing inside the picture can be focused or clicked.
    expect(await pic.locator("button, a, input, [tabindex]").count()).toBe(0);
    // Before the layer diagram.
    const top = (await block.boundingBox())!.y;
    expect(top).toBeLessThan((await page.getByTestId("layer-diagram").boundingBox())!.y);
    // The picture keeps the design's 1440 x 900 shape and fills the width of its card.
    const box = (await pic.boundingBox())!;
    expect(Math.abs(box.width / box.height - 1440 / 900)).toBeLessThan(0.02);
    const win = (await pic.locator(".bm-window").boundingBox())!;
    expect(Math.abs(win.width - box.width)).toBeLessThanOrEqual(3);
    // Callouts, the sample note and the two links.
    await expect(page.getByTestId("browser-callouts").locator("li")).toHaveCount(d.callouts.length);
    await expect(page.getByTestId("browser-sample-note")).toBeVisible();
    const link = page.getByTestId("browser-canvas-link");
    await expect(link).toHaveAttribute("href", d.canvas_url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await block.locator(`[data-ref-id="${d.decision}"]`).click();
    await expect(page.getByTestId("ref-dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    for (const [i, g] of arch.groups.entries()) {
      if (g.id === "application") continue;
      await page.getByTestId("group-switcher").getByRole("button").nth(i).click();
      await expect(page.getByTestId("browser-design")).toBeHidden();
    }
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`the switch starts on the portal theme and swaps the colours (${scheme} portal)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/architecture");
      const pic = page.getByTestId("browser-mockup");
      const sw = page.getByTestId("mockup-theme");
      const other = scheme === "light" ? "dark" : "light";
      await expect(pic).toHaveAttribute("data-mock", scheme);
      await expect(sw.locator(`[data-mock-theme="${scheme}"]`)).toHaveAttribute("aria-pressed", "true");
      const strip = () => pic.locator(".bm-window").evaluate((e) => getComputedStyle(e).backgroundColor);
      const before = await strip();
      expect(before).toBe(scheme === "light" ? "rgb(232, 230, 225)" : "rgb(20, 20, 20)");
      await expectAccessible(page);
      await sw.locator(`[data-mock-theme="${other}"]`).click();
      await expect(pic).toHaveAttribute("data-mock", other);
      await expect(sw.locator(`[data-mock-theme="${other}"]`)).toHaveAttribute("aria-pressed", "true");
      await expect(sw.locator(`[data-mock-theme="${scheme}"]`)).toHaveAttribute("aria-pressed", "false");
      expect(await strip()).not.toBe(before);
      await expectAccessible(page);
    });
  }

  test("phone width: the picture shrinks to fit and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/architecture");
    const pic = page.getByTestId("browser-mockup");
    await expect(pic).toBeVisible();
    const box = (await pic.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const win = (await pic.locator(".bm-window").boundingBox())!;
    expect(win.width).toBeLessThanOrEqual(box.width + 1);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("Ref mode names the block and its three parts", async ({ page }) => {
    await page.goto("/architecture");
    await page.locator("[data-testid=ref-toggle][data-ready]").click();
    for (const [id, name] of [
      ["AR-9", "How the browser will look"],
      ["AR-9.1", "Part: Light/Dark switch"],
      ["AR-9.2", "Part: Picture of the window"],
      ["AR-9.3", "Part: What the parts are"],
    ]) {
      await expect(page.locator(`.ui-ref-chip[data-ui-chip="${id}"]`)).toHaveText(`${id} · ${name}`);
    }
    // The label button never lands inside the image itself.
    expect(await page.getByTestId("browser-mockup").locator(".ui-ref-chip").count()).toBe(0);
  });
});
