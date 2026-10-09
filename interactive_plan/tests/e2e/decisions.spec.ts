// decisions.spec (IP-8, ip-routes-and-views §3.5; added beyond the ip-testing §3 table, decided
// 2026-10-09): the register (columns, awaiting-approval first, filters) and the detail view (approve
// bar, required sections, pages listing the ADR); /go/<adr> opens the typed view.
import { expect, test } from "@playwright/test";
import { collectErrors, FX } from "./helpers";

test("register: adr-0901 listed as claude-proposed and awaiting approval; filters", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/decisions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Decisions");
  const table = page.getByTestId("decision-table");
  await expect(table.locator("thead th")).toHaveText(["Id", "Title", "Status", "Decided by", "Date", "Approval", "Supersedes", "Superseded by"]);
  const row = table.locator(`tr[data-adr='${FX.adr}']`);
  await expect(row).toContainText("Fixture decision: one shell");
  await expect(row).toContainText("awaiting approval");
  await expect(row).toContainText("claude-proposed");
  await expect(row).toHaveAttribute("data-state", "PENDING");
  await page.goto("/decisions?status=accepted");
  await expect(table.locator("tbody tr")).toHaveCount(0);
  await page.goto("/decisions?state=PENDING");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("detail: approve bar, required sections, pages that list the ADR", async ({ page }) => {
  await page.goto("/decisions");
  await page.getByTestId("decision-table").getByRole("link", { name: FX.adr }).click();
  await expect(page).toHaveURL(FX.adrView);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture decision: one shell");
  await expect(page.locator(`[data-testid='approve-bar'][data-key='${FX.adr}']`)).toHaveAttribute("data-state", "PENDING");
  await expect(page.getByTestId("adr-sections").locator("li[data-present='true']")).toHaveCount(5);
  const listed = page.getByTestId("adr-backlinks");
  await expect(listed.locator("[data-field='decisions']")).toContainText("phase-p1-fixture-build");
  await expect(listed.locator("[data-field='decisions']")).toContainText("phase-p2-fixture-review");
  await expect(page.locator(".page-body")).toContainText("One shell.");
});

test("/go/<adr> opens the decision view; unknown and non-decision ids are 404", async ({ page, request }) => {
  const res = await request.get(`/go/${FX.adr}`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe(FX.adrView);
  for (const p of ["/decisions/adr-0999", "/decisions/risk-r91"]) {
    const r = await page.goto(p);
    expect(r?.status(), p).toBe(404);
  }
});
