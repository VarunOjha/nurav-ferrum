// roadmap.spec: the Roadmap tab (Roadmap mockup): three stages, one compact row per phase (no
// dependencies, no timelines), each phase name opens the phase popup (step order first), and "How
// every phase works" in the popup closes it and lands on "Same in every phase". Accessible (axe),
// and it fits a phone without sideways scrolling.
import { expect, test } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";

interface Roadmap {
  summary: string;
  stages: { name: string; phases: string[] }[];
  phases: { id: string; short: string; name: string; one_line_goal: string; status: string; tasks_done: number; tasks_total: number | null }[];
  same_in_every_phase: { title: string; summary: string }[];
}
interface Phase {
  title: string;
  step_order: string[];
}
const roadmap = portalJson<Roadmap>("roadmap.json");

test("stages and the phase table show the real roadmap", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { level: 1, name: "Roadmap" })).toBeVisible();
  const stages = page.getByTestId("stages").locator(".stage-card");
  await expect(stages).toHaveCount(roadmap.stages.length);
  for (const [i, s] of roadmap.stages.entries()) await expect(stages.nth(i)).toContainText(`Stage ${i + 1} · ${s.name}`);

  const rows = page.getByTestId("roadmap-table").locator("tbody tr");
  await expect(rows).toHaveCount(roadmap.phases.length);
  for (const [i, p] of roadmap.phases.entries()) {
    const row = rows.nth(i);
    await expect(row).toContainText(p.short);
    await expect(row).toContainText(p.name);
    await expect(row).toContainText(p.status);
    await expect(row).toContainText(`${p.tasks_done} / ${p.tasks_total ?? "—"}`);
  }
  // No dependencies, no timelines (owner feedback).
  await expect(page.locator("main")).not.toContainText(/depends on|dependenc|timeline|deadline/i);
  const every = page.locator("#every-phase li");
  await expect(every).toHaveCount(roadmap.same_in_every_phase.length);
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("a phase name opens its popup with the step order first; Esc closes it and focus returns", async ({ page }) => {
  await page.goto("/roadmap");
  const p = roadmap.phases[1];
  const phase = portalJson<Phase>(`phases/${p.id}.json`);
  const btn = page.getByRole("button", { name: `${p.short} ${p.name}: open the phase popup` });
  await btn.click();
  const dialog = page.getByRole("dialog", { name: phase.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("h3").first()).toHaveText("Step order");
  await expect(dialog.locator(".step-pill")).toHaveCount(phase.step_order.length);
  await expectAccessible(page, `#phase-dialog-${p.id}`);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(btn).toBeFocused();
});

test("'How every phase works' closes the popup and shows what every phase shares", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("phase-cards").getByRole("button").first().click();
  const dialog = page.locator("dialog.modal[open]");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "How every phase works →" }).click();
  await expect(page).toHaveURL(/\/roadmap#every-phase$/);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("#every-phase")).toContainText(roadmap.same_in_every_phase[0].title);
});

test("phone width: no sideways scrolling, rows become cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/roadmap");
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  const firstRow = page.getByTestId("roadmap-table").locator("tbody tr").first();
  expect(await firstRow.evaluate((e) => getComputedStyle(e).display)).toBe("block");
  await expectAccessible(page);
});
