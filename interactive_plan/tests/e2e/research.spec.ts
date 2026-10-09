// research.spec (ip-testing §3): the fixture gaps (an rq without hypotheses, an exp without metrics;
// e2e-overlay rq-92 and exp-fixture-nometrics) are highlighted in the graph and listed. Since IP-8
// also: the column order, metric support and preregistration badges, the per-rq filter, the nested
// text alternative, and click-through to the page.
import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

const graph = '[data-testid="trace-graph"]';

test("gaps are highlighted in the graph and listed in the table", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/research");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Research traceability");
  const rq92 = page.locator(`${graph} [data-node-id='rq-92']`);
  const expNo = page.locator(`${graph} [data-node-id='exp-fixture-nometrics']`);
  await expect(rq92).toHaveClass(/fg-gap/);
  await expect(rq92).toContainText("gap ×1");
  await expect(expNo).toHaveClass(/fg-gap/);
  await expect(expNo).toContainText(/gap ×\d/);
  await expect(page.locator(`${graph} [data-node-id='hyp-91']`)).not.toHaveClass(/fg-gap/);
  const gaps = page.getByTestId("gap-table");
  await expect(gaps.locator("tr[data-gap='rq-no-hypotheses'][data-id='rq-92']")).toHaveCount(1);
  await expect(gaps.locator("tr[data-gap='exp-no-metrics'][data-id='exp-fixture-nometrics']")).toHaveCount(1);
  await expect(gaps.locator("tr[data-gap='exp-no-phase'][data-id='exp-fixture-nometrics']")).toHaveCount(1);
  // the fixture metric is unverified and used by an experiment of the next phase (fixture STATUS: P0 current)
  await expect(gaps.locator("tr[data-gap='metric-unverified-soon'][data-id='metric-fixture-startup-ms']")).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("columns RQ → hypothesis → experiment → metric/workload/phase, with badges", async ({ page }) => {
  await page.goto("/research");
  const x = async (id: string) => (await page.locator(`${graph} [data-node-id='${id}']`).boundingBox())!.x;
  await expect(page.locator(`${graph} .react-flow__node-item`)).toHaveCount(8);
  expect(await x("rq-91")).toBeLessThan(await x("hyp-91"));
  expect(await x("hyp-91")).toBeLessThan(await x("exp-fixture-startup"));
  expect(await x("exp-fixture-startup")).toBeLessThan(await x("metric-fixture-startup-ms"));
  expect(await x("metric-fixture-startup-ms")).toBeCloseTo(await x("wl-fixture-static"), 0);
  expect(await x("wl-fixture-static")).toBeCloseTo(await x("phase-p1-fixture-build"), 0);
  await expect(page.locator(`${graph} [data-node-id='metric-fixture-startup-ms']`)).toContainText("support: unverified");
  await expect(page.locator(`${graph} [data-node-id='hyp-91']`)).toContainText("not preregistered");
});

test("text alternative: nested rq → hyp → exp → metrics/workloads", async ({ page }) => {
  await page.goto("/research");
  const tree = page.getByTestId("trace-tree");
  const rq91 = tree.locator("li[data-rq='rq-91']");
  await expect(rq91).toContainText("hyp-91");
  await expect(rq91).toContainText("exp-fixture-startup");
  await expect(rq91).toContainText("Metrics: Fixture startup time");
  await expect(rq91).toContainText("Workloads: Fixture static page");
  await expect(rq91).toContainText("Phase: phase-p1-fixture-build");
  await expect(tree.locator("li[data-rq='rq-92']")).toContainText("no hypotheses");
  await expect(page.getByText("Not reachable from a research question: exp-fixture-nometrics")).toBeVisible();
});

test("the rq filter shows one question's subgraph; nodes open their page", async ({ page }) => {
  await page.goto("/research?rq=rq-91");
  await expect(page.locator(`${graph} [data-node-id='rq-92']`)).toHaveCount(0);
  await expect(page.locator(`${graph} [data-node-id='exp-fixture-nometrics']`)).toHaveCount(0);
  await expect(page.locator(`${graph} .react-flow__node-item`)).toHaveCount(6);
  await expect(page.getByTestId("gap-table").locator("tbody tr")).toHaveCount(1);
  await page.locator(`${graph} [data-node-id='hyp-91'] a`).click();
  await expect(page).toHaveURL("/wiki/research/hypotheses/hyp-91-fixture-hypothesis.md");
  await page.goto("/research?rq=rq-91");
  await page.locator(`${graph} [data-node-id='phase-p1-fixture-build'] a`).click();
  await expect(page).toHaveURL("/phases/phase-p1-fixture-build");
});
