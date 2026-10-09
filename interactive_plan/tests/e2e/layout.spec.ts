// layout.spec (IP-9 review fixes, ip-routes-and-views §4): no horizontal page overflow at phone width,
// research graph nodes never clip their content, ids/keys/dates in the inbox and decision tables do
// not break at their hyphens, and the log view links only real ids.
import { expect, test } from "@playwright/test";
import { FX } from "./helpers";

test("phone width (390px): no horizontal page overflow on the phase, research, approvals and decisions views", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/phases/phase-p0-fixture-plan", "/research", "/approvals?tab=all", "/decisions", FX.adrView, "/"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const { scroll, inner, culprits } = await page.evaluate(() => {
      const inner = document.documentElement.clientWidth;
      const culprits = Array.from(document.querySelectorAll("main *"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // inside a horizontal scroller (tables, code, graphs) overflow is intended
          return r.right > inner + 1 && !el.closest(".table-wrap, pre, .react-flow, .mermaid-svg, .timeline-wrap, .fg-canvas");
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${el.className}`);
      return { scroll: document.documentElement.scrollWidth, inner, culprits };
    });
    expect(culprits, route).toEqual([]);
    expect(scroll, route).toBeLessThanOrEqual(inner);
  }
});

test("research graph: no node clips its content (title, id line and badges fit)", async ({ page }) => {
  await page.goto("/research");
  const hits = page.locator("[data-testid='trace-graph'] .react-flow__node-item .fg-hit");
  await expect(hits).toHaveCount(8);
  const clipped = await hits.evaluateAll((els) =>
    els.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.closest("[data-node-id]")?.getAttribute("data-node-id")),
  );
  expect(clipped).toEqual([]);
  // the id line is visible inside the node box
  const sub = page.locator("[data-testid='trace-graph'] [data-node-id='rq-91'] .fg-sub");
  await expect(sub).toHaveText("rq-91");
  const [node, line] = await Promise.all([page.locator("[data-testid='trace-graph'] [data-node-id='rq-91']").boundingBox(), sub.boundingBox()]);
  expect(line!.y + line!.height).toBeLessThanOrEqual(node!.y + node!.height + 0.5);
});

test("inbox and decision register: id, key, phase and date cells stay on one line", async ({ page }) => {
  for (const route of ["/approvals?tab=all", "/decisions"]) {
    await page.goto(route);
    const cells = page.locator("td.nowrap");
    expect(await cells.count(), route).toBeGreaterThan(0);
    const multi = await cells.evaluateAll((els) =>
      els
        .filter((el) => el.textContent!.trim() !== "")
        .filter((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const tops = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)));
          return tops.size > 1;
        })
        .map((el) => el.textContent),
    );
    expect(multi, route).toEqual([]);
  }
});

test("log view: no /go link carries brackets, parentheses or spaces", async ({ page }) => {
  await page.goto("/log");
  const hrefs = await page.locator("a[href^='/go/']").evaluateAll((els) => els.map((e) => decodeURIComponent(e.getAttribute("href")!)));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.filter((h) => /[[\]() ]/.test(h))).toEqual([]);
  // the fixture entry "stales: [adr-0901] (fixture note, …)" links adr-0901 and shows the note as text
  const note = page.getByTestId("stales-note");
  await expect(note).toHaveCount(1);
  await expect(note).toHaveText("(fixture note, with a comma, after the list)");
});
