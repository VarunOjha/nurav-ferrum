// architecture-real.spec (IP-10 follow-up of the IP-9 review finding "hover labels overlap"): on the
// REAL wiki (a third, read-only server of the same build on 3420; see playwright.config.ts) at 1440x900,
// hovering "WebView manager" (comp-webview-manager, the component with the most edges) used to draw 22
// labels with 19 overlapping pairs, some running off the pane. Now: the canvas edge labels are short
// chips (at most CHIP_MAX characters) that overlap neither each other nor any node, before and during
// the hover, and the list beside the graph names every edge of the hovered component in full.
import { expect, test, type Page } from "@playwright/test";
import { CHIP_MAX } from "../../lib/views/edgeLabels";
import { collectErrors } from "./helpers";

const REAL = "http://127.0.0.1:3420";
const graph = '[data-testid="arch-graph"]';
const ACTIVE = "comp-webview-manager";

test.use({ baseURL: REAL, viewport: { width: 1440, height: 900 } });

type R = { left: number; top: number; right: number; bottom: number };

async function labelGeometry(page: Page) {
  return page.locator(graph).evaluate((root) => {
    const r = (e: Element) => {
      const b = e.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height };
    };
    const labels = [...root.querySelectorAll(".react-flow__edge-textwrapper, .fg-chip")]
      .map((e) => ({ text: e.textContent ?? "", edge: e.getAttribute("data-edge") ?? e.closest(".react-flow__edge")?.getAttribute("data-id") ?? "", ...r(e) }))
      .filter((x) => x.w > 0 && x.h > 0);
    const nodes = [...root.querySelectorAll(".react-flow__node-item")].map((e) => ({ id: e.getAttribute("data-id") ?? "", ...r(e) }));
    return { labels, nodes };
  });
}

// 1 px tolerance for sub-pixel rounding of the SVG text boxes.
const overlap = (a: R, b: R) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

function overlaps(g: Awaited<ReturnType<typeof labelGeometry>>): string[] {
  const out: string[] = [];
  g.labels.forEach((a, i) => {
    g.labels.slice(i + 1).forEach((b) => overlap(a, b) && out.push(`label "${a.text}" (${a.edge}) x label "${b.text}" (${b.edge})`));
    g.nodes.forEach((n) => overlap(a, n) && out.push(`label "${a.text}" (${a.edge}) x node ${n.id}`));
  });
  return out;
}

test("real wiki: no edge chip overlaps another chip or a node, before and while WebView manager is hovered; the list names all its edges", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/architecture");
  const node = page.locator(`${graph} [data-node-id='${ACTIVE}']`);
  await expect(node).toBeVisible();

  const idle = await labelGeometry(page);
  expect(idle.labels.length, "TB chips are drawn when nothing is active").toBeGreaterThan(0);
  expect(overlaps(idle)).toEqual([]);

  await node.hover();
  const list = page.getByTestId("graph-edges");
  await expect(list.getByRole("heading", { level: 2 })).toHaveText(/^Edges of WebView manager/);
  const hovered = await labelGeometry(page);
  // the hovered component's edges get chips: more labels than before, none longer than CHIP_MAX
  expect(hovered.labels.length).toBeGreaterThan(idle.labels.length);
  for (const l of hovered.labels) expect(l.text.length, l.text).toBeLessThanOrEqual(CHIP_MAX);
  expect(overlaps(hovered)).toEqual([]);

  // the list beside the graph has every edge of the component (the edge table is the reference), in full
  const rows = page.locator(`[data-testid="edge-table"] tbody tr[data-from='${ACTIVE}'], [data-testid="edge-table"] tbody tr[data-to='${ACTIVE}']`);
  const expected = await rows.evaluateAll((trs) => trs.map((tr) => ({ id: tr.getAttribute("data-edge") ?? "", label: tr.querySelectorAll("td")[2]?.textContent ?? "" })));
  expect(expected.length, "comp-webview-manager has 7 outgoing and 3 incoming edges (2026-10-09)").toBeGreaterThanOrEqual(10);
  const items = list.locator("li[data-edge]");
  await expect(items).toHaveCount(expected.length);
  const listed = await items.evaluateAll((lis) => lis.map((li) => ({ id: li.getAttribute("data-edge") ?? "", text: li.textContent ?? "" })));
  expect(listed.map((x) => x.id).sort()).toEqual(expected.map((x) => x.id).sort());
  for (const e of expected) expect(listed.find((x) => x.id === e.id)!.text, e.id).toContain(e.label);

  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
