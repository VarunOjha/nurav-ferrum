// scripts.spec: check scripts in the phase popup. A task's script button opens the script popup with
// the real file from the repo (read-only) on top of the phase popup; the gate shows its own
// explanation and opens the whole gate script; a phase id anywhere opens the whole phase. The script
// route serves only scripts the portal text names, and only for GET.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { expectAccessible } from "./axe";
import { PORT, portalJson, raw, REPO_ROOT } from "./helpers";

interface Phase {
  id: string;
  title: string;
  tasks: { id: string; script: string | null }[];
  test_gate: { script: string | null };
}
interface Roadmap {
  phases: { id: string }[];
}
const roadmap = portalJson<Roadmap>("roadmap.json");
const p0 = portalJson<Phase>(`phases/${roadmap.phases[0].id}.json`);
const fileText = (rel: string) => readFileSync(path.join(REPO_ROOT, ...rel.split("/")), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const host = { Host: `127.0.0.1:${PORT}` };

test("a task's script button shows the real script on top of the phase popup", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("phase-cards").getByRole("button").first().click();
  const phaseDialog = page.getByRole("dialog", { name: p0.title });
  await expect(phaseDialog).toBeVisible();
  const task = p0.tasks.find((t) => t.script)!;
  const btn = phaseDialog.locator(`button[data-script="${task.script}"]`);
  await btn.click();
  const sd = page.getByTestId("script-dialog");
  await expect(sd).toBeVisible();
  await expect(sd.locator("#script-dialog-title")).toHaveText(task.script!.split("/").pop()!);
  await expect(sd).toContainText(`pwsh -NoProfile -File ${task.script}`);
  await expect(sd.getByTestId("script-text")).toHaveText(fileText(task.script!));
  await expectAccessible(page, "[data-testid=script-dialog]");
  await page.keyboard.press("Escape");
  await expect(sd).toBeHidden();
  await expect(phaseDialog).toBeVisible();
  await expect(btn).toBeFocused();
});

test("the gate explains itself and opens the whole gate script", async ({ page }) => {
  test.skip(!p0.test_gate.script, "P0 has no gate script");
  await page.goto("/");
  await page.getByTestId("phase-cards").getByRole("button").first().click();
  const phaseDialog = page.getByRole("dialog", { name: p0.title });
  const header = phaseDialog.getByTestId("gate-header");
  await expect(header).toContainText("What it checks");
  // The header's fields (Why, How to run, ...) are shown as label + text, not as wrapped source lines.
  await expect(header.locator(".gate-field-label").first()).toBeVisible();
  await expect(header.locator(".gate-field-label", { hasText: "Why" })).toHaveCount(1);
  await phaseDialog.getByRole("button", { name: "Read the whole gate script" }).click();
  await expect(page.getByTestId("script-text")).toHaveText(fileText(p0.test_gate.script!));
});

test("a phase id opens its explainer, which opens the whole phase", async ({ page }) => {
  await page.goto("/roadmap");
  const chip = page.locator('main [data-ref-id="P0"]').first();
  await chip.click();
  const ref = page.getByTestId("ref-dialog");
  await ref.getByRole("button", { name: /Open the whole phase/ }).click();
  await expect(ref).toBeHidden();
  const dialog = page.locator(`#phase-dialog-${roadmap.phases[0].id}`);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(chip).toBeFocused();
});

test("the script route serves only named scripts, only for GET", async () => {
  const named = p0.tasks.find((t) => t.script)!.script!;
  const ok = await raw(PORT, "GET", `/api/script?path=${encodeURIComponent(named)}`, host);
  expect(ok.status).toBe(200);
  expect(ok.headers["content-type"]).toMatch(/^text\/plain/);
  expect(ok.body).toBe(fileText(named));
  for (const bad of ["STATUS.md", "scripts/../STATUS.md", "scripts/lib/Ferrum.Check.psm1", "scripts/verify/not-a-script.ps1", "..%2FSTATUS.md", ""]) {
    const r = await raw(PORT, "GET", `/api/script?path=${encodeURIComponent(bad)}`, host);
    expect(r.status, bad).toBe(404);
    expect(r.body, bad).not.toMatch(/[A-Z]:\\|\/Users\//);
  }
  expect((await raw(PORT, "POST", `/api/script?path=${encodeURIComponent(named)}`, host, "")).status).toBe(405);
  expect((await raw(PORT, "GET", `/api/script?path=${encodeURIComponent(named)}`, { Host: `attacker.example:${PORT}` })).status).toBe(403);
});
