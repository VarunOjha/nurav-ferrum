// ref-mode.spec: the Ref button (owner request 2026-10-10). It switches on outlines and name labels for
// every layout block on the tab and in open popups; a label copies "<tab or popup> › <id> <name>"; Esc
// or the button turns it off; the choice survives tab changes and reloads; the Layout map lists every
// id; labels are reachable with Tab only while the mode is on; axe finds nothing in either theme.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectAccessible } from "./axe";
import { portalJson } from "./helpers";
import { UI_REFS } from "../../lib/portal/uiRefs";

interface Roadmap {
  phases: { id: string; short: string }[];
  stages: { id: string }[];
  same_in_every_phase: unknown[];
}
interface Architecture {
  groups: { id: string; name: string }[];
  footnote: unknown;
}
interface Log {
  entries: { decisions: unknown[]; approvals: unknown[] }[];
}
interface Phase {
  short: string;
  title: string;
  tasks: { script: string | null }[];
}

const roadmap = portalJson<Roadmap>("roadmap.json");
const arch = portalJson<Architecture>("architecture.json");
const log = portalJson<Log>("log.json");
const p0 = portalJson<Phase>(`phases/${roadmap.phases[0].id}.json`);
const HEADER = ["HD-1", "HD-2", "HD-3", "HD-4", "HD-5"];
const name = (id: string) => (UI_REFS as Record<string, { name: string }>)[id].name;

/** What each tab must show (header labels come on top). Read from the same JSON the portal reads. */
const TABS: { route: string; ids: string[] }[] = [
  {
    route: "/",
    ids: ["OV-1", "OV-2", "OV-3", "OV-3.1", "OV-3.2", "OV-3.3", "OV-3.4", "OV-4", "OV-5", "OV-6", ...roadmap.phases.map((p) => `OV-4.${p.short.slice(1)}`)],
  },
  { route: "/roadmap", ids: ["RM-1", "RM-2", "RM-3", "RM-4", ...roadmap.stages.map((_, i) => `RM-2.${i + 1}`)] },
  { route: "/architecture", ids: ["AR-1", "AR-2", "AR-3", "AR-3.1", "AR-4", "AR-7", ...(arch.footnote ? ["AR-8"] : [])] },
  { route: "/decisions", ids: ["DE-1", "DE-2", "DE-3"] },
  { route: "/research", ids: ["RE-1", "RE-2", "RE-3", "RE-4", "RE-5", "RE-6", "RE-7"] },
  { route: "/questions", ids: ["QU-1", "QU-2", "QU-3", "QU-4", "QU-5", "QU-6"] },
  { route: "/log", ids: ["LO-1", "LO-2", "LO-3", "LO-4", "LO-6", ...(log.entries.some((e) => e.decisions.length + e.approvals.length > 0) ? ["LO-5"] : [])] },
];

/** The Ref button, once the page's script is running (a click before that would do nothing). */
const toggle = (page: Page) => page.locator("[data-testid=ref-toggle][data-ready]");
const chips = (scope: Page | Locator) => scope.locator(".ui-ref-chip");
const chip = (scope: Page | Locator, id: string) => scope.locator(`.ui-ref-chip[data-ui-chip="${id}"]`);

async function turnOn(page: Page) {
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(chips(page).first()).toBeVisible();
}

/** The visible labels' ids, in page order. */
async function visibleIds(scope: Page | Locator): Promise<string[]> {
  return scope.locator(".ui-ref-chip:visible").evaluateAll((els) => els.map((e) => e.getAttribute("data-ui-chip")!));
}

test.describe("Ref mode", () => {
  test("the button turns it on and off; Esc turns it off; normal mode shows nothing", async ({ page }) => {
    await page.goto("/");
    const btn = toggle(page);
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(btn).toHaveAccessibleName("Ref");
    await expect(btn).toHaveAccessibleDescription("Show the names of the blocks on this page so you can refer to them in feedback");
    await expect(chips(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-ref-mode", /.*/);

    await turnOn(page);
    await expect(page.locator("html")).toHaveAttribute("data-ref-mode", "on");
    await expect(chip(page, "OV-3")).toHaveText("OV-3 · What happens next");
    await expect(page.getByTestId("ref-bar")).toBeVisible();

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(chips(page)).toHaveCount(0);
    await expect(page.getByTestId("ref-bar")).toHaveCount(0);

    await turnOn(page);
    await page.keyboard.press("Escape");
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(chips(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-ref-mode", /.*/);
  });

  for (const tab of TABS) {
    test(`${tab.route} shows its labels in Ref mode and none in normal mode`, async ({ page }) => {
      await page.goto(tab.route);
      await expect(chips(page)).toHaveCount(0);
      await turnOn(page);
      const ids = await visibleIds(page);
      for (const id of [...HEADER, ...tab.ids]) expect(ids, id).toContain(id);
      // Only this tab's and the header's labels are visible (no popup is open).
      const prefix = tab.ids[0].slice(0, 2);
      expect(ids.filter((id) => !id.startsWith("HD-") && !id.startsWith(prefix))).toEqual([]);
      // No label is shown twice.
      expect(new Set(ids).size).toBe(ids.length);
      // A label sits at its block's top-left and stays inside the screen width.
      const width = page.viewportSize()!.width;
      for (const b of await page.locator(".ui-ref-chip:visible").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))) {
        expect(b).toBeLessThanOrEqual(width);
      }
      await toggle(page).click();
      await expect(chips(page)).toHaveCount(0);
    });
  }

  test("the other architecture groups show their own labels", async ({ page }) => {
    test.skip(arch.groups.length < 2, "only one group");
    await page.goto("/architecture");
    await turnOn(page);
    // The group buttons (the switcher's own label is a button too, so pick the pills).
    await page.getByTestId("group-switcher").locator("button.pill").nth(1).click();
    await expect(chip(page, "AR-5").locator("visible=true")).toHaveCount(1);
    const ids = await visibleIds(page);
    expect(ids).toEqual(expect.arrayContaining(["AR-5", "AR-6", "AR-7"]));
    expect(ids).not.toContain("AR-3");
  });

  test("the mode lasts across tab changes and reloads", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Roadmap" }).click();
    await expect(page).toHaveURL(/\/roadmap$/);
    await expect(chip(page, "RM-3")).toBeVisible();
    await expect(chip(page, "OV-3")).toHaveCount(0);
    await page.reload();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    await expect(chip(page, "RM-3")).toBeVisible();
    await toggle(page).click();
    await page.reload();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    await expect(chips(page)).toHaveCount(0);
  });

  test("phase, script, reference and item popups show their labels when open", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    await page.getByTestId("phase-cards").locator("button.phase-card").first().click();
    const phase = page.getByRole("dialog", { name: p0.title });
    await expect(phase).toBeVisible();
    const phaseIds = await visibleIds(phase);
    expect(phaseIds).toEqual(expect.arrayContaining(["PH-1", "PH-2", "PH-3", "PH-4", "PH-5", ...(roadmap.same_in_every_phase.length ? ["PH-6"] : [])]));
    expect(phaseIds.every((id) => id.startsWith("PH-"))).toBe(true);
    // The bar moved into the popup (the page behind is inert).
    await expect(phase.getByTestId("ref-bar")).toBeVisible();

    const task = p0.tasks.find((t) => t.script)!;
    await phase.locator(`button[data-script="${task.script}"]`).click();
    const script = page.getByTestId("script-dialog");
    await expect(script.getByTestId("script-text")).toBeVisible();
    expect(await visibleIds(script)).toEqual(["SC-1", "SC-2", "SC-3"]);
    await expect(script.getByTestId("ref-bar")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(script).toBeHidden();
    // Esc closed the popup on top, not Ref mode.
    await expect(phase.getByTestId("ref-bar")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(phase).toBeHidden();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

    await page.locator("main [data-ref-id]").first().click();
    const ref = page.getByTestId("ref-dialog");
    await expect(ref).toBeVisible();
    const refIds = await visibleIds(ref);
    expect(refIds).toEqual(expect.arrayContaining(["RF-1", "RF-2"]));
    expect(refIds.every((id) => id.startsWith("RF-"))).toBe(true);
    await page.keyboard.press("Escape");

    await page.goto("/decisions");
    await page.getByTestId("decision-list").getByRole("button").first().click();
    const item = page.locator("dialog.detail-modal[open]");
    await expect(item).toBeVisible();
    expect(await visibleIds(item)).toEqual(expect.arrayContaining(["IT-1", "IT-2"]));
  });

  test("clicking a label copies its name and says so", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await turnOn(page);
    await chip(page, "OV-3").click();
    await expect(page.getByTestId("ref-status")).toHaveText("Copied: Overview › OV-3 What happens next");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Overview › OV-3 What happens next");
    await expect(page.getByTestId("ref-status")).toHaveAttribute("role", "status");

    const p1 = roadmap.phases[1] ?? roadmap.phases[0];
    const n = p1.short.slice(1);
    await chip(page, `OV-4.${n}`).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`Overview › OV-4.${n} Phase card ${p1.short}`);

    await chip(page, "HD-4").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`Header › HD-4 ${name("HD-4")}`);

    await page.getByTestId("phase-cards").locator("button.phase-card").first().click();
    const phase = page.getByRole("dialog", { name: p0.title });
    await chip(phase, "PH-3").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`Phase popup (${p0.short}) › PH-3 Tasks table`);
    await expect(phase.getByTestId("ref-status")).toHaveText(`Copied: Phase popup (${p0.short}) › PH-3 Tasks table`);
  });

  test("keyboard: labels are reachable with Tab only in Ref mode, and Enter copies", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const btn = toggle(page);
    await expect(btn).toBeVisible();
    await btn.focus();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.classList.contains("ui-ref-chip"))).toBe(false);

    await btn.focus();
    await page.keyboard.press("Enter");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveClass(/ui-ref-chip/);
    const id = (await focused.getAttribute("data-ui-chip"))!;
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`Header › ${id} ${name(id)}`);

    // Every visible label is reached by Tab: walk the whole tab order once.
    const reached = new Set<string>();
    await btn.focus();
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return { chip: a?.getAttribute("data-ui-chip") ?? null, ref: a?.getAttribute("data-testid") === "ref-toggle" };
      });
      if (f.ref) break;
      if (f.chip) reached.add(f.chip);
    }
    expect([...reached].sort()).toEqual((await visibleIds(page)).sort());

    // Esc ends the mode and gives focus back to the Ref button.
    await chip(page, "OV-1").focus();
    await page.keyboard.press("Escape");
    await expect(btn).toBeFocused();
    await expect(chips(page)).toHaveCount(0);
  });

  test("List all opens the Layout map with every id", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    await page.getByTestId("ref-bar").getByRole("button", { name: "List all" }).click();
    const map = page.getByRole("dialog", { name: "Layout map" });
    await expect(map).toBeVisible();
    const ids = await map.locator("[data-map-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-map-id")));
    expect(ids).toEqual(Object.keys(UI_REFS));
    await expect(map.locator('[data-map-id="OV-3"]')).toContainText("What happens next");
    await expectAccessible(page, "[data-testid=layout-map]");
    await page.keyboard.press("Escape");
    await expect(map).toBeHidden();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  });

  test("works at phone width without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const tab of TABS) {
      await page.goto(tab.route);
      if ((await toggle(page).getAttribute("aria-pressed")) !== "true") await turnOn(page);
      await expect(chip(page, tab.ids[0])).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), tab.route).toBeLessThanOrEqual(0);
    }
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`no accessibility violations in Ref mode (${scheme} theme)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const tab of TABS) {
        await page.goto(tab.route);
        if ((await toggle(page).getAttribute("aria-pressed")) !== "true") await turnOn(page);
        await expect(chip(page, tab.ids[0])).toBeVisible();
        await expectAccessible(page);
      }
      await page.goto("/");
      await page.getByTestId("phase-cards").locator("button.phase-card").first().click();
      await expect(chips(page.getByRole("dialog", { name: p0.title })).first()).toBeVisible();
      await expectAccessible(page, `#phase-dialog-${roadmap.phases[0].id}`);
    });
  }
});
