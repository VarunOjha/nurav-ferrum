// dashboard.spec (ip-testing §3): next_action from the fixture STATUS.md is shown verbatim; the
// approval counts equal the fixture's expected counts; blocked_on links resolve. Plus the phase strip,
// the entry gate card, blockers, recent log, lint card and the top-bar counter (ip-routes-and-views
// §3.1, §2). The test writes a known approvals.json into the TEMP copy (computed from the fixture
// files) and restores the previous state afterwards.
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { hashes } from "../../lib/approvals/hash";
import { e2eEnv, readOrNull, realFilesUnchanged, restore, tmpWikiFile } from "./helpers";

const BOGUS = "sha256:" + "0".repeat(64);
let saved: Buffer | null;

function rec(rel: string, status: string, h: { content: string; scope: string }) {
  return {
    status,
    comment: status === "approved" ? "" : "fixture comment",
    timestamp: "2026-10-09T10:00:00+05:30",
    path: `wiki/${rel}`,
    content_hash: h.content,
    scope_hash: h.scope,
    approved_by: "owner",
    history: [],
  };
}

test.beforeAll(() => {
  const env = e2eEnv();
  saved = readOrNull(env.approvalsFile);
  const cur = (rel: string) => hashes(readFileSync(tmpWikiFile(rel)));
  const data = {
    schema_version: 1,
    approvals: {
      // STALE: approved, then (per the stored hashes) the content changed; it is in the next phase's dependency set
      "adr-0901": rec("decisions/adr-0901-fixture-decision.md", "approved", { content: BOGUS, scope: BOGUS }),
      // an orphan: no page has this id (listed under orphans, not counted)
      "adr-0999": rec("decisions/adr-0999-gone.md", "approved", { content: BOGUS, scope: BOGUS }),
      "ov-fixture-project": rec("overview/ov-fixture-project.md", "rejected", cur("overview/ov-fixture-project.md")),
      "qual-fixture-strategy": rec("quality/qual-fixture-strategy.md", "approved", cur("quality/qual-fixture-strategy.md")),
    },
  };
  writeFileSync(env.approvalsFile, JSON.stringify(data, null, 2) + "\n");
});

test.afterAll(() => restore(e2eEnv().approvalsFile, saved));

test("next_action is shown verbatim with phase, task, session and status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expect(page.getByTestId("next-action")).toHaveText("Run npm test in the fixture");
  const card = page.locator("section[aria-labelledby='next-title']");
  await expect(card.getByRole("link", { name: "phase-p0-fixture-plan" })).toBeVisible();
  await expect(card).toContainText("p0.1");
  await expect(card).toContainText("s91");
  await expect(card).toContainText("active");
  // ip-data-contract §5.1: the STATUS.md body section whose heading contains "Next action" (IP-9 review)
  const section = card.getByTestId("next-action-section");
  await expect(section).toBeVisible();
  await expect(section.locator("ol li")).toHaveText("Run npm test.");
  await expect(section.locator("code")).toHaveText("npm test");
  await expect(section).not.toContainText("Last updated");
});

test("approval counts equal the fixture's expected counts and link to the inbox", async ({ page }) => {
  await page.goto("/");
  // 14 approvable mini-wiki pages + the overlay gate-review phase and its eligible #exit key = 16
  const expected = { PENDING: 13, APPROVED: 1, APPROVED_VOLATILE_DRIFT: 0, STALE: 1, CHANGES_REQUESTED: 0, REJECTED: 1, INVALID: 0 };
  for (const [state, n] of Object.entries(expected)) await expect(page.getByTestId(`count-${state}`)).toHaveText(String(n));
  await expect(page.locator("section[aria-labelledby='counts-title']")).toContainText("Over 16 approvable keys");
  await expect(page.getByTestId("pending-counter").locator(".pending-count")).toHaveText("14");

  await page.locator("li[data-state='STALE'] a").click();
  await expect(page).toHaveURL("/approvals?state=STALE");
  await expect(page.getByRole("link", { name: /^Stale/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("tbody tr[data-key]")).toHaveCount(1);
  await expect(page.locator("tr[data-key='adr-0901']")).toHaveAttribute("data-state", "STALE");
  // no snapshot in this record: the row says so and names the git command (§3.11, IP-9 review)
  const note = page.locator("[data-testid='inbox-diff'][data-key='adr-0901']");
  await note.locator("summary").click();
  await expect(note.getByTestId("inbox-diff-note")).toContainText("git log -p --follow -- wiki/decisions/adr-0901-fixture-decision.md");
  await expect(page.getByTestId("orphans")).toContainText("adr-0999");
});

test("blocked_on links resolve", async ({ page, request }) => {
  await page.goto("/");
  const blocked = page.getByTestId("blocked-on");
  await expect(blocked).toContainText("Blocked on:");
  const links = blocked.getByRole("link");
  await expect(links).toHaveText(["Q-901"]);
  await expect(links.first()).not.toHaveClass(/link-missing/);
  for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
  await links.first().click();
  await expect(page).toHaveURL(/\/wiki\/overview\/ov-open-questions\.md#q-901-/);
  const anchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
  await expect(page.locator(`[id='${anchor}']`)).toHaveCount(1);
});

test("phase strip, gate card, blockers, recent log and lint card", async ({ page }) => {
  await page.goto("/");
  const strip = page.getByTestId("phase-strip").locator("li");
  await expect(strip).toHaveCount(3);
  await expect(strip.nth(0)).toHaveClass(/phase-current/);
  await expect(strip.nth(0)).toContainText("in-progress");
  await expect(strip.nth(1)).toContainText("M1 · 2 sessions");
  await expect(page.getByTestId("phases-done")).toHaveText("0");
  await expect(page.locator("section[aria-labelledby='phases-title']")).toContainText("Sessions budget (planning estimate): 0 of 6");
  await expect(page.locator("section[aria-labelledby='phases-title']")).toContainText("Last activity: p0.2 · 2026-10-04 · p0.2 fixture views");
  await strip.nth(1).getByRole("link").click();
  await expect(page).toHaveURL("/phases/phase-p1-fixture-build");

  await page.goto("/");
  await expect(page.getByTestId("dashboard-gate").locator("li")).toHaveCount(4);
  // the fixture P0 is not the real bootstrap phase (phase-p0-planning): its gate is evaluated normally;
  // the dependency set {phase-p0-fixture-plan, schema} is not approved, so it is blocked
  await expect(page.getByTestId("dashboard-gate").locator("li[data-ok='false']")).toHaveCount(1);
  await expect(page.getByTestId("dashboard-gate").locator("li[data-ok='false']")).toContainText("2. every id of the dependency set counts as approved (2)");
  await expect(page.locator("section[aria-labelledby='gate-title']")).toContainText("The gate is blocked.");
  const kinds = await page.getByTestId("blockers").locator("li").evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
  expect(kinds).toEqual(["status", "question", "stale"]);
  await expect(page.getByTestId("blockers")).toContainText("adr-0901");
  await expect(page.getByTestId("recent-log").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("lint-counts")).toContainText("errors");
  await page.getByRole("link", { name: "Open the lint report →" }).click();
  await expect(page).toHaveURL("/lint");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wiki lint");
  await expect(page.getByTestId("lint-summary")).toBeVisible();
  // the overlay's dangling link is a REF-DANGLING error, listed with a link to its file
  const code = page.locator("details[data-code='REF-DANGLING']");
  await expect(code).toContainText("wiki/overview/ov-fixture-render.md");
  await expect(page.getByText("cd interactive_plan && npm run lint:wiki").first()).toBeVisible();
  for (const r of realFilesUnchanged()) expect(r, r.path).toEqual({ path: r.path, same: true });
});
