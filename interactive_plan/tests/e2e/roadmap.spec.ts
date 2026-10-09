// roadmap.spec (ip-testing §3): one DAG node per fixture phase (the E2E fixture has 3 phases; the
// real wiki's 9 phases are asserted by tests/lint/real-wiki-graphs.test.ts, decided 2026-10-09, IP-8);
// timeline bar widths are proportional to est_sessions; clicking a node or a bar opens the phase.
// Since IP-8 also: the critical path, milestones, the "planning guesses" note and the per-phase rows.
import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

const PHASES = [
  { id: "phase-p0-fixture-plan", est: 1 },
  { id: "phase-p1-fixture-build", est: 2 },
  { id: "phase-p2-fixture-review", est: 3 },
];

test("one DAG node per phase, critical path marked, no console errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Roadmap");
  const nodes = page.locator('[data-testid="phase-dag"] .react-flow__node-item');
  await expect(nodes).toHaveCount(PHASES.length);
  await expect(page.locator('[data-testid="phase-dag"] .react-flow__edge')).toHaveCount(2);
  // the chain p0 -> p1 -> p2 is the critical path
  await expect(page.locator('[data-testid="phase-dag"] .fg-crit')).toHaveCount(3);
  await expect(page.locator('[data-testid="phase-dag"] .react-flow__edge.fg-edge-crit')).toHaveCount(2);
  await expect(page.locator(".page-header")).toContainText("critical path phase-p0-fixture-plan → phase-p1-fixture-build → phase-p2-fixture-review · 6 sessions");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("timeline bars are proportional to est_sessions and start at the end of their dependencies", async ({ page }) => {
  await page.goto("/roadmap");
  await expect(page.getByTestId("timeline-note")).toContainText("Session estimates are planning guesses, not measurements");
  const bars = page.getByTestId("timeline-bar");
  await expect(bars).toHaveCount(PHASES.length);
  const geo = await bars.evaluateAll((els) =>
    els.map((e) => ({ id: e.getAttribute("data-phase"), x: Number(e.getAttribute("x")), w: Number(e.getAttribute("width")), rendered: (e as SVGRectElement).getBoundingClientRect().width })),
  );
  expect(geo.map((g) => g.id)).toEqual(PHASES.map((p) => p.id));
  const unit = geo[0].w / PHASES[0].est;
  expect(unit).toBeGreaterThan(0);
  for (const [i, g] of geo.entries()) {
    expect(g.w).toBeCloseTo(PHASES[i].est * unit, 5);
    expect(g.rendered).toBeCloseTo(PHASES[i].est * (geo[0].rendered / PHASES[0].est), 0);
  }
  // start = end of the dependency: each bar begins where the previous one ends
  expect(geo[1].x).toBeCloseTo(geo[0].x + geo[0].w, 5);
  expect(geo[2].x).toBeCloseTo(geo[1].x + geo[1].w, 5);
  await expect(page.getByTestId("milestone")).toHaveText(["M1", "M2"]);
  const rows = page.getByTestId("phase-rows").locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("risk-r91 · 12");
  await expect(rows.nth(2)).toContainText("3 (3–6)");
  // the gate-review phase's exit key is open (pending); a planned phase's is not
  await expect(rows.nth(2)).toContainText("pending");
  await expect(rows.nth(1)).toContainText("not open (planned)");
});

test("clicking a DAG node or a timeline bar opens the phase", async ({ page }) => {
  await page.goto("/roadmap");
  await page.locator('[data-testid="phase-dag"] [data-node-id="phase-p1-fixture-build"] a').click();
  await expect(page).toHaveURL("/phases/phase-p1-fixture-build");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture P1");
  await page.goto("/roadmap");
  await page.locator('[data-testid="timeline-bar"][data-phase="phase-p2-fixture-review"]').click();
  await expect(page).toHaveURL("/phases/phase-p2-fixture-review");
});

test("keyboard: Tab reaches the phase nodes and Enter opens one", async ({ page }) => {
  await page.goto("/roadmap");
  const p0 = page.locator('[data-testid="phase-dag"] [data-node-id="phase-p0-fixture-plan"] a');
  await expect(p0).toBeVisible();
  await p0.focus();
  await page.keyboard.press("Tab");
  await expect(page.locator('[data-testid="phase-dag"] [data-node-id="phase-p1-fixture-build"] a')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/phases/phase-p1-fixture-build");
});
