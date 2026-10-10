// Accessibility check with axe-core (pinned devDependency): injects axe into the page and runs the
// WCAG 2.1 A and AA rules on the whole page, or on one open popup. Returns readable violation lines
// ("color-contrast: 2 element(s), e.g. .chip") so a failing test says what is wrong.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

const require_ = createRequire(__filename);
const AXE_SOURCE = readFileSync(require_.resolve("axe-core/axe.min.js"), "utf8");

interface AxeViolation {
  id: string;
  help: string;
  nodes: { target: string[] }[];
}

export async function axeViolations(page: Page, include?: string): Promise<string[]> {
  if (!(await page.evaluate(() => "axe" in window))) await page.addScriptTag({ content: AXE_SOURCE });
  const violations = await page.evaluate(async (sel) => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe;
    const r = await axe.run(sel ? { include: [sel] } : document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"],
    });
    return r.violations.map((v) => ({ id: v.id, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.map(String) })) }));
  }, include ?? null);
  return violations.map((v) => `${v.id} (${v.help}): ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
}

/** Fails with the list of violations, if any. */
export async function expectAccessible(page: Page, include?: string): Promise<void> {
  expect(await axeViolations(page, include)).toEqual([]);
}

/** Collects page errors and console errors for the life of the test. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

/** Page width minus viewport width (0 or less = no sideways scrolling). */
export async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
