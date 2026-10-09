// wiki.spec (ip-testing §3): GFM tables, mermaid renders an SVG with real mermaid in both themes,
// backlinks list the expected ids, search finds a body word, a dangling link is styled as missing, and
// a raw file shows the immutable banner and no approve bar. Plus the other §3.7 markers.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { contentHash } from "../../lib/approvals/hash";
import { collectErrors, e2eEnv, FX } from "./helpers";

test("a page renders a GFM table", async ({ page }) => {
  await page.goto(FX.projectPath);
  const table = page.locator(".page-body .table-wrap table");
  await expect(table).toHaveCount(1);
  await expect(table.locator("thead th")).toHaveText(["Part", "Trust"]);
  await expect(table.locator("tbody tr").first()).toContainText("Shell");
});

for (const scheme of ["light", "dark"] as const) {
  test(`a mermaid block renders an SVG with real mermaid (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const errors = collectErrors(page);
    await page.goto(FX.projectPath);
    const fig = page.locator(".mermaid-figure").first();
    await expect(fig).toHaveAttribute("data-state", "rendered");
    const svg = fig.locator(".mermaid-svg svg");
    await expect(svg).toHaveCount(1);
    await expect(svg).toContainText("Shell");
    // Node ids naming a page (SCHEMA §14) are wired to /go/<id>.
    const node = fig.locator("g.mmd-link").first();
    await expect(node).toHaveAttribute("aria-label", /Open comp-fixture-(shell|content)/);
    expect(errors).toEqual([]);
  });
}

test("mermaid re-renders when the theme is toggled", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(FX.projectPath);
  const svg = page.locator(".mermaid-figure .mermaid-svg svg").first();
  await expect(svg).toHaveCount(1);
  const before = await svg.evaluate((el) => el.outerHTML);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect.poll(async () => (await page.locator(".mermaid-figure .mermaid-svg svg").first().evaluate((el) => el.outerHTML)) !== before).toBe(true);
  await expect(page.locator(".mermaid-figure").first()).toHaveAttribute("data-state", "rendered");
});

test("show source toggles the diagram source", async ({ page }) => {
  await page.goto(FX.projectPath);
  const fig = page.locator(".mermaid-figure").first();
  await expect(fig).toHaveAttribute("data-state", "rendered");
  await fig.getByRole("button", { name: "Show source" }).click();
  await expect(fig.locator(".mermaid-source")).toContainText("comp_fixture_shell");
});

test("backlinks list the expected ids, grouped by field", async ({ page }) => {
  await page.goto(FX.adrPath);
  const back = page.locator("section[aria-labelledby='backlinks-title']");
  await expect(back.locator(".backlink-group[data-field='related']")).toContainText("ov-fixture-project");
  await expect(back.locator(".backlink-group[data-field='related']")).toContainText("ov-fixture-render");
  await expect(back.locator(".backlink-group[data-field='decisions']")).toContainText("phase-p1-fixture-build");
  await expect(back.locator(".backlink-group[data-field='body link']")).toContainText("ov-fixture-project");
});

test("search finds a body word, from the top-bar box", async ({ page }) => {
  await page.goto("/wiki");
  const box = page.getByRole("combobox", { name: "Search the wiki" });
  // The "/" shortcut is a client handler: a key pressed before hydration is lost (seen once in the
  // IP-10 follow-up gate run under load), so press again until the box has focus.
  await expect(async () => {
    await page.keyboard.press("/");
    await expect(box).toBeFocused({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await box.fill(FX.bodyWord);
  await box.press("Enter");
  await expect(page).toHaveURL(`/search?q=${FX.bodyWord}`);
  const results = page.locator("ol.results > li");
  await expect(results).toHaveCount(1);
  await expect(results.first().locator(".result-title")).toHaveText("Fixture rendering cases");
  await expect(results.first().locator("mark")).toHaveText(FX.bodyWord);
});

test("an exact id in the search box jumps to the page", async ({ page }) => {
  await page.goto("/wiki");
  const box = page.getByRole("combobox", { name: "Search the wiki" });
  await box.fill(FX.adr);
  await expect(page.getByRole("option").first()).toContainText(FX.adr);
  await box.press("Enter");
  // via /go/<id>: an ADR opens in its typed view since IP-8
  await expect(page).toHaveURL(FX.adrView);
});

test("search ranks the exact id first and filters by type", async ({ page }) => {
  await page.goto("/search?q=adr-0901");
  await expect(page.locator("ol.results > li").first()).toHaveAttribute("data-field", "id");
  await page.getByRole("link", { name: /^decision/ }).click();
  await expect(page).toHaveURL(/type=decision/);
  await expect(page.locator("ol.results > li .chip-outline")).toHaveText(["decision"]);
});

test("a dangling link is styled as missing; a valid one resolves", async ({ page }) => {
  await page.goto(FX.renderPath);
  const missing = page.getByRole("link", { name: "missing page" });
  await expect(missing).toHaveClass(/link-missing/);
  await expect(missing).toHaveAttribute("title", "missing (REF-DANGLING)");
  const ok = page.getByRole("link", { name: "the decision" });
  await expect(ok).not.toHaveClass(/link-missing/);
  await expect(ok).toHaveAttribute("href", FX.adrPath);
});

test("integrity tags, CONTRADICTION blockquotes and raw HTML", async ({ page }) => {
  await page.goto(FX.renderPath);
  const chip = page.locator("a.int-chip");
  await expect(chip).toHaveText("UNVERIFIED[phase-p1-fixture-build]");
  await expect(chip).toHaveAttribute("href", "/go/phase-p1-fixture-build");
  await expect(page.locator("blockquote.contradiction")).toContainText("CONTRADICTION:");
  await expect(page.locator(".page-body")).toContainText("<script>window.__e2ePwned = 1</script>");
  expect(await page.evaluate(() => (window as unknown as { __e2ePwned?: number }).__e2ePwned)).toBeUndefined();
});

test("a raw file shows the immutable banner and no approve bar", async ({ page }) => {
  await page.goto(FX.rawPath);
  await expect(page.locator(".raw-banner")).toContainText("Immutable raw source");
  await expect(page.locator("[data-testid='approve-bar']")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
});

test("the tree shows raw/ collapsed and labelled immutable, the current file marked", async ({ page }) => {
  await page.goto(FX.adrPath);
  const side = page.getByRole("complementary", { name: "Wiki files" });
  const rawDir = side.locator("li.tree-dir > details").filter({ has: page.locator("summary", { hasText: "immutable" }) });
  await expect(rawDir).not.toHaveAttribute("open", "");
  await expect(side.locator("a[aria-current='page']")).toHaveText("adr-0901-fixture-decision.md");
});

test("the tree filters by type", async ({ page }) => {
  await page.goto("/wiki?type=decision");
  const files = page.getByRole("complementary", { name: "Wiki files" }).locator("li.tree-file");
  await expect(files).toHaveCount(1);
  await expect(files).toHaveText("adr-0901-fixture-decision.md");
});

test("frontmatter panel shows fields with id links and the raw YAML", async ({ page }) => {
  await page.goto(FX.adrPath);
  const panel = page.locator(".fm-panel");
  await panel.locator("summary").first().click();
  await expect(panel.locator("tr", { hasText: "decided_by" })).toContainText("claude-proposed");
  await expect(panel.locator("tr", { hasText: "related" }).getByRole("link", { name: "comp-fixture-shell" })).toBeVisible();
  await panel.getByText("Raw YAML").click();
  await expect(panel.locator(".raw-yaml pre")).toContainText("decided_by: claude-proposed");
});

// ip-data-contract §6.2 (IP-9 review): the schema page renders root CLAUDE.md below SCHEMA.md, shows its
// full hash, and the approve bar sends the hash of that text as seen_bootstrap_hash.
test("the schema page renders root CLAUDE.md with its full hash; the approve bar is enabled", async ({ page }) => {
  const errors = collectErrors(page);
  const expected = contentHash(readFileSync(path.join(e2eEnv().root, "CLAUDE.md")));
  await page.goto("/wiki/SCHEMA.md");
  const section = page.getByTestId("bootstrap-section");
  await expect(section).toBeVisible();
  await expect(section.locator("#bootstrap-title")).toContainText("CLAUDE.md");
  await expect(section).toContainText("quokkabootstrap");
  await expect(section.getByTestId("bootstrap-hash")).toHaveText(expected);
  // links of the root file are re-based: wiki/SCHEMA.md -> the wiki page, STATUS.md -> the dashboard
  await expect(section.getByRole("link", { name: "wiki/SCHEMA.md" })).toHaveAttribute("href", "/wiki/SCHEMA.md");
  await expect(section.getByRole("link", { name: "STATUS.md" })).toHaveAttribute("href", "/");
  // the section comes after the SCHEMA body
  const order = await page.evaluate(() => {
    const body = document.querySelector(".page > .page-body");
    const sec = document.querySelector("[data-testid='bootstrap-section']");
    return body && sec ? body.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();
  const bar = page.locator("[data-testid='approve-bar'][data-key='schema']");
  await expect(bar.getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
  await expect(bar).toContainText(expected.slice(7, 19));
  // the POST carries exactly that hash (intercepted, never sent to the server)
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/approvals", async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "LOCK_TIMEOUT", message: "intercepted by the test", details: {} } }) });
  });
  await bar.getByRole("button", { name: "Approve", exact: true }).click();
  await expect.poll(() => sent).not.toBeNull();
  expect(sent!.key).toBe("schema");
  expect(sent!.seen_bootstrap_hash).toBe(expected);
  expect(errors.filter((e) => !/503/.test(e))).toEqual([]);
});
