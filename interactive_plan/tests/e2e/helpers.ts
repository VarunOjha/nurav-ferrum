// Shared E2E helpers: collect console errors and page errors for the "no console errors" checks.
import type { Page } from "@playwright/test";

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Fixture ids and paths (tests/fixtures/mini-wiki + e2e-overlay). */
export const FX = {
  adr: "adr-0901",
  adrPath: "/wiki/decisions/adr-0901-fixture-decision.md",
  projectPath: "/wiki/overview/ov-fixture-project.md",
  renderPath: "/wiki/overview/ov-fixture-render.md",
  rawPath: "/wiki/raw/00-fixture-source.md",
  bodyWord: "zanzibarquill",
};
