// architecture.spec (ip-testing §3): the node count equals the fixture components; a TB edge has the
// TB marker; clicking a node opens the panel with a page link; the edge table alternative exists.
// Since IP-8 also: keyboard only (Tab walks the nodes in reading order, Enter opens the panel, Close
// returns focus), the trust-level lanes, the not-shipped marking and the URL filters.
import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

const graph = '[data-testid="arch-graph"]';

test("node count equals the fixture components; TB edge has the TB marker; edge table alternative", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/architecture");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Architecture");
  const nodes = page.locator(`${graph} .react-flow__node-item`);
  await expect(nodes).toHaveCount(2);
  await expect(page.locator(`${graph} [data-node-id]`)).toHaveText([/Fixture shell/, /Fixture content/]);
  // swim-lanes per trust level present in the fixture
  await expect(page.locator(`${graph} .fg-lane-label`)).toHaveText(["Trusted", "Untrusted"]);
  // the shell is shipped: false -> dotted border and a text badge
  await expect(page.locator(`${graph} [data-node-id='comp-fixture-shell']`)).toHaveClass(/fg-dotted/);
  await expect(page.locator(`${graph} [data-node-id='comp-fixture-shell']`)).toContainText("not shipped");

  const tb = page.locator(`${graph} .react-flow__edge.fg-edge-tb`);
  await expect(tb).toHaveCount(1);
  // IP-9 review: only a short marker until an endpoint is hovered, focused or opened; then the full label
  await expect(tb).toHaveText("TB");
  await page.locator(`${graph} [data-node-id='comp-fixture-shell']`).hover();
  await expect(tb).toContainText("TB · creates (rust-api)");
  await page.mouse.move(1, 1);
  await expect(tb).toHaveText("TB");
  await page.locator(`${graph} [data-node-id='comp-fixture-content'] .fg-hit`).focus();
  await expect(tb).toContainText("TB · creates (rust-api)");
  await expect(page.locator(`${graph} .react-flow__edge.fg-edge-bad`)).toHaveCount(0);

  const table = page.getByTestId("edge-table");
  await expect(table.locator("thead th")).toHaveText(["From", "To", "Label", "Kind", "TB"]);
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr").first()).toContainText("Fixture shell");
  await expect(table.locator("tbody tr").first()).toContainText("Fixture content");
  await expect(table.locator("tbody tr").first()).toContainText("TB yes");
  await expect(page.getByTestId("component-table").locator("tbody tr")).toHaveCount(2);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("clicking a node opens the side panel with a link to the full page", async ({ page }) => {
  await page.goto("/architecture");
  await page.locator(`${graph} [data-node-id='comp-fixture-shell'] .fg-hit`).click();
  const panel = page.getByTestId("graph-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Fixture shell");
  await expect(panel).toContainText("Hosts the content");
  await expect(panel).toContainText("open_tab");
  await expect(panel.getByRole("link", { name: "phase-p1-fixture-build" })).toBeVisible();
  await expect(panel).toContainText("approval: pending");
  const link = panel.getByRole("link", { name: "Open the full page" });
  await expect(link).toHaveAttribute("href", "/wiki/architecture/components/comp-fixture-shell.md");
  await link.click();
  await expect(page).toHaveURL("/wiki/architecture/components/comp-fixture-shell.md");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture shell");
});

test("keyboard: Tab walks the nodes in reading order, Enter opens the panel, Close returns focus", async ({ page }) => {
  await page.goto("/architecture");
  const first = page.locator(`${graph} [data-node-id='comp-fixture-shell'] .fg-hit`);
  const second = page.locator(`${graph} [data-node-id='comp-fixture-content'] .fg-hit`);
  await expect(first).toBeVisible();
  // reach the graph from the filter form with the keyboard only
  await page.getByRole("button", { name: "Apply" }).focus();
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await first.evaluate((el) => el === document.activeElement);
  }
  expect(reached).toBe(true);
  await page.keyboard.press("Tab");
  await expect(second).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  const panel = page.getByTestId("graph-panel");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Fixture shell");
  await expect(panel.getByRole("heading", { level: 2 })).toBeFocused();
  await panel.getByRole("button", { name: "Close details" }).press("Enter");
  await expect(panel).toHaveCount(0);
  await expect(first).toBeFocused();
  // Space activates the button too
  await page.keyboard.press("Tab");
  await page.keyboard.press(" ");
  await expect(page.getByTestId("graph-panel").getByRole("heading", { level: 2 })).toHaveText("Fixture content");
});

test("filters: only trust-boundary edges, hide not-shipped, edge kind", async ({ page }) => {
  await page.goto("/architecture?tb=1");
  await expect(page.getByTestId("edge-table").locator("tbody tr")).toHaveCount(1);
  await page.goto("/architecture?hide=1");
  await expect(page.locator(`${graph} .react-flow__node-item`)).toHaveCount(1);
  await expect(page.getByTestId("edge-table")).toHaveCount(0);
  await expect(page.getByText("No edges match the filters.")).toBeVisible();
  await page.goto("/architecture?kind=network");
  await expect(page.locator(`${graph} .react-flow__node-item`)).toHaveCount(2);
  await expect(page.locator(`${graph} .react-flow__edge`)).toHaveCount(0);
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL("/architecture");
  await expect(page.getByTestId("edge-table").locator("tbody tr")).toHaveCount(1);
});

// IP-9 review: the graph was fitted at scale 0.455 (0.15 on a phone), which shrank the node text to ~7px.
test("the initial zoom is never below 0.7, also on a phone-width viewport", async ({ page }) => {
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/architecture");
    await expect(page.locator(`${graph} .react-flow__node-item`)).toHaveCount(2);
    const scale = await page.locator(`${graph} .react-flow__viewport`).evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
    expect(scale, `width ${width}`).toBeGreaterThanOrEqual(0.7 - 1e-6);
    expect(scale, `width ${width}`).toBeLessThanOrEqual(1 + 1e-6);
  }
});
