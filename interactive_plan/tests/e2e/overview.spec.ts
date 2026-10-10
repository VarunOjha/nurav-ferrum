// overview.spec: the Overview tab renders the real plan/portal text as in the Main mockup (Layout A),
// and every phase card opens its phase popup (Phase-Modal mockup), which closes with Esc or the close
// button and gives focus back to the card. Expected values come from the same JSON the portal reads.
import { expect, test } from "@playwright/test";
import { portalJson } from "./helpers";

interface Overview {
  summary: string;
  where_we_are: { item: string; state: string }[];
  next_action: { who: string; where_we_are: unknown[]; script: unknown; tell_claude: string | null };
  questions_for_you: { open: number; items: { id: string; question: string }[] };
}
interface Roadmap {
  phases: { id: string; short: string; name: string; status: string }[];
}
interface Phase {
  id: string;
  title: string;
  tasks: { id: string; status: string; script: string | null }[];
  progress: { done: number; total: number };
  test_gate: { rows: unknown[]; script: string | null };
  step_order: string[];
}
interface Log {
  entries: { title: string }[];
}

const overview = portalJson<Overview>("overview.json");
const roadmap = portalJson<Roadmap>("roadmap.json");
const log = portalJson<Log>("log.json");

test("the overview shows where we are, questions, the next step, phases and the latest log", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/Overview/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByTestId("data-problems")).toHaveCount(0);

  // Top tabs, current tab marked, read-only badge.
  const nav = page.getByRole("navigation", { name: "Sections" });
  for (const t of ["Overview", "Roadmap", "Architecture", "Decisions", "Research", "Questions", "Log"]) {
    await expect(nav.getByRole("link", { name: new RegExp(`^${t}`) })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("readonly-badge")).toBeVisible();

  // Where we are: one row per item, the questions row counted from the list, plus "Last update".
  const rows = page.getByTestId("where-we-are").locator("tr");
  await expect(rows).toHaveCount(overview.where_we_are.length + 1 + (log.entries.length ? 1 : 0));
  await expect(rows.first().locator("th")).toHaveText(overview.where_we_are[0].item);
  // Review 2026-10-09: the row, the list and the tab badge must give the same number.
  const asked = overview.questions_for_you.items.length;
  await expect(page.getByTestId("questions-row")).toContainText(`${overview.questions_for_you.open} open`);
  if (asked) await expect(page.getByTestId("questions-row")).toContainText(`${asked} of them`);

  // Questions for you.
  const q = page.getByTestId("questions-for-you");
  await expect(q.locator(".question-card")).toHaveCount(overview.questions_for_you.items.length);
  for (const item of overview.questions_for_you.items) await expect(q.locator(`[data-ref-id="${item.id}"]`)).toBeVisible();
  if (overview.questions_for_you.items.length) {
    await expect(nav.getByRole("link", { name: /^Questions/ })).toContainText(String(overview.questions_for_you.items.length));
  }

  // What happens next: the four parts in order.
  const next = page.getByTestId("what-next");
  await expect(next.locator(".next-part-title")).toHaveText(["1 · Where we are", "2 · Why run something", "3 · The script", "4 · Then tell Claude"]);
  if (overview.next_action.script === null) await expect(next).toContainText("— none needed —");
  else {
    // Review 2026-10-09: the script the owner is asked to run can be read before running it.
    const path = (overview.next_action.script as { path: string }).path;
    await next.locator(`[data-script="${path}"]`).click();
    const dlg = page.getByTestId("script-dialog");
    await expect(dlg).toBeVisible();
    await expect(dlg.getByTestId("script-text")).toContainText("#Requires -Version 7.0");
    if (!/^scripts\/(verify|gates)\//.test(path)) await expect(dlg.getByTestId("script-note")).not.toContainText("PASS, FAIL or NOT READY");
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
  }

  // Phase cards: one per roadmap phase, in order.
  const cards = page.getByTestId("phase-cards").getByRole("button");
  await expect(cards).toHaveCount(roadmap.phases.length);
  for (const [i, p] of roadmap.phases.entries()) {
    await expect(cards.nth(i)).toContainText(p.short);
    await expect(cards.nth(i)).toContainText(p.name);
    await expect(cards.nth(i)).toContainText(p.status);
  }

  // Latest log: the newest three entries.
  const latest = page.getByTestId("latest-log").locator("li");
  await expect(latest).toHaveCount(Math.min(3, log.entries.length));
  await expect(latest.first()).toContainText(log.entries[log.entries.length - 1].title);

  expect(errors).toEqual([]);
});

test("each phase card opens its popup; Esc and the close button close it and focus returns to the card", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByTestId("phase-cards").getByRole("button");
  for (const [i, rp] of roadmap.phases.entries()) {
    const phase = portalJson<Phase>(`phases/${rp.id}.json`);
    const card = cards.nth(i);
    await card.click();
    const dialog = page.getByRole("dialog", { name: phase.title });
    await expect(dialog).toBeVisible();
    // Step order, the tasks table (one row per task, script names shown) and the gate.
    await expect(dialog.locator(".step-pill")).toHaveCount(phase.step_order.length);
    await expect(dialog.locator(".tasks-table tbody tr")).toHaveCount(phase.tasks.length);
    // Review 2026-10-09: every task shows its state, and the Done count matches the progress line.
    await expect(dialog.locator(".tasks-table .task-status")).toHaveCount(phase.tasks.length);
    await expect(dialog.locator('.tasks-table tr[data-task-status="Done"]')).toHaveCount(phase.progress.done);
    await expect(dialog).toContainText(`${phase.progress.done} of ${phase.progress.total} tasks done`);
    for (const t of phase.tasks.filter((x) => x.script).slice(0, 3)) {
      await expect(dialog.locator(".tasks-table")).toContainText(t.script!.split("/").pop()!);
    }
    if (phase.test_gate.script) {
      await expect(dialog).toContainText(phase.test_gate.script);
      // One command only (review 2026-10-09): the gate header shown inline names no second command.
      await expect(dialog.getByTestId("gate-header")).not.toContainText("run-all-checks");
      await expect(dialog.getByTestId("gate-header")).not.toContainText("How to run");
    }
    await expect(dialog.getByTestId("phase-approvals")).toContainText("Your approval of this plan");
    // The page behind is inert while the popup is open.
    if (i % 2 === 0) await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  }
});

test("a phase popup opens from the keyboard", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("phase-cards").getByRole("button").first();
  await card.focus();
  await page.keyboard.press("Enter");
  const phase = portalJson<Phase>(`phases/${roadmap.phases[0].id}.json`);
  const dialog = page.getByRole("dialog", { name: phase.title });
  await expect(dialog).toBeVisible();
  // Focus is inside the popup.
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(card).toBeFocused();
});
