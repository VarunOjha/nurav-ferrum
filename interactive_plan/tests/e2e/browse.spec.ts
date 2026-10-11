// browse.spec: search, filters and pages on the Decisions and Log tabs (owner request 2026-10-10,
// wiki/raw/owner/2026-10-10-s01-decisions-log-browse.md). For both tabs: 20 per page with numbered pages,
// the search box narrows (every word must appear), each filter narrows, a tag chip filters by its tag,
// the date range (and a plain hint when "Date from" is after "Date to"), the page address restores the
// view on reload, ignores unknown values and tidies a page past the end, the empty state clears, the tab
// button starts afresh, focus stays on Previous at the first page, the tag list offers only tags in use
// and closes when focus leaves it, phone width folds the filters, and axe finds nothing in the light
// and the dark theme. Expectations are computed from the same JSON the portal reads.
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";
import { normalize } from "../../lib/portal/browse";

interface Labelled {
  id: string;
  date: string;
  title: string;
  category: string;
  tags: string[];
  phase?: string;
}
interface Decision extends Labelled {
  summary: string;
  why: string;
  catch: string | null;
  status: string;
  decided_by: "you" | "claude";
}
interface Entry extends Labelled {
  done: string;
  next: string | null;
  decisions: { what: string }[];
  approvals: unknown[];
}

const decisions = portalJson<{ items: Decision[] }>("decisions.json").items;
const entries = (() => {
  const raw = portalJson<{ entries: Entry[] }>("log.json").entries;
  return raw
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.date === b.e.date ? b.i - a.i : a.e.date < b.e.date ? 1 : -1))
    .map((x) => x.e);
})();

interface Tab {
  route: string;
  name: string;
  noun: string;
  items: Labelled[];
  card: string;
  idAttr: string;
  /** The phase filter's label on this tab. */
  phaseLabel: string;
  /** The searchable text of an item, as the portal searches it. */
  text: (x: Labelled) => string;
}

const TABS = [
  {
    route: "/decisions",
    name: "decisions",
    noun: "decisions",
    items: decisions,
    card: "li[data-decision]",
    idAttr: "data-decision",
    phaseLabel: "Affects phase",
    text: (x) => {
      const d = x as Decision;
      return normalize([d.title, d.summary, d.why, d.catch ?? ""].join(" \n "));
    },
  },
  {
    route: "/log",
    name: "log",
    noun: "entries",
    items: entries,
    card: "article[data-entry]",
    idAttr: "data-entry",
    phaseLabel: "Phase",
    text: (x) => {
      const e = x as Entry;
      return normalize([e.title, e.done, e.next ?? "", ...e.decisions.map((d) => d.what)].join(" \n "));
    },
  },
] satisfies Tab[];

const PAGE = 20;
/** A value as the address writes it (URLSearchParams), escaped for a regular expression. */
const enc = (v: string) =>
  new URLSearchParams({ v })
    .toString()
    .slice(2)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const range = (start: number, end: number, total: number, all?: number) => `Showing ${start}–${end} of ${total}${all !== undefined ? ` (${all} in all)` : ""}`;
const mostCommon = (values: string[]) => {
  const n = new Map<string, number>();
  for (const v of values) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
};
const firstPageLine = (total: number, all?: number) => (total === 0 ? "No matches" : range(1, Math.min(PAGE, total), total, all));

for (const tab of TABS) {
  const N = tab.items.length;
  const cards = (page: Page) => page.locator(`[data-testid="${tab.name}-browse"] ${tab.card}`);
  const count = (page: Page) => page.getByTestId(`${tab.name}-count`);
  const shownIds = (page: Page) => cards(page).evaluateAll((els, attr) => els.map((e) => e.getAttribute(attr)!), tab.idAttr);

  test.describe(`${tab.route} search, filters and pages`, () => {
    test("20 per page, numbered pages, Previous and Next", async ({ page }) => {
      test.skip(N <= PAGE, "one page only");
      const errors = collectErrors(page);
      await page.goto(tab.route);
      await expect(cards(page)).toHaveCount(PAGE);
      await expect(count(page)).toHaveText(range(1, PAGE, N));
      expect(await shownIds(page)).toEqual(tab.items.slice(0, PAGE).map((x) => x.id));
      const nav = page.getByRole("navigation", { name: "Pages" });
      await expect(nav.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");
      await expect(nav.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
      const pages = Math.ceil(N / PAGE);
      await expect(nav.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(Math.min(pages, 7));
      await nav.getByRole("button", { name: "Next" }).click();
      await expect(count(page)).toHaveText(range(PAGE + 1, Math.min(2 * PAGE, N), N));
      await expect(nav.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
      await expect(page).toHaveURL(new RegExp(`${tab.route}\\?page=2$`));
      expect(await shownIds(page)).toEqual(tab.items.slice(PAGE, 2 * PAGE).map((x) => x.id));
      await nav.getByRole("button", { name: `Page ${pages}` }).click();
      await expect(nav.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
      await nav.getByRole("button", { name: "Previous" }).click();
      await expect(count(page)).toHaveText(range((pages - 2) * PAGE + 1, (pages - 1) * PAGE, N));
      expect(errors).toEqual([]);
    });

    test("keyboard: focus stays on Previous when it takes you to the first page", async ({ page }) => {
      test.skip(N <= PAGE, "one page only");
      await page.goto(`${tab.route}?page=2`);
      const prev = page.getByRole("navigation", { name: "Pages" }).getByRole("button", { name: "Previous" });
      await prev.focus();
      await page.keyboard.press("Enter");
      await expect(count(page)).toHaveText(range(1, PAGE, N));
      await expect(prev).toHaveAttribute("aria-disabled", "true");
      await expect(prev).toBeFocused();
      // Pressed again at the first page, nothing happens and focus stays.
      await page.keyboard.press("Enter");
      await expect(count(page)).toHaveText(range(1, PAGE, N));
      await expect(prev).toBeFocused();
    });

    test("a page past the end shows the last page and the address is tidied to it", async ({ page }) => {
      test.skip(N <= PAGE, "one page only");
      const pages = Math.ceil(N / PAGE);
      await page.goto(`${tab.route}?page=99`);
      await expect(count(page)).toHaveText(range((pages - 1) * PAGE + 1, N, N));
      await expect(page).toHaveURL(new RegExp(`${tab.route}\\?page=${pages}$`));
    });

    test("the search narrows the list; every word must appear, in any case", async ({ page }) => {
      await page.goto(tab.route);
      // Two words from one item's title, typed upside down and in capitals.
      const words = normalize(tab.items[0].title)
        .split(" ")
        .filter((w) => /^[a-z0-9]{4,}$/.test(w))
        .slice(0, 2);
      const q = words.reverse().join(" ").toUpperCase();
      const expected = tab.items.filter((x) => words.every((w) => tab.text(x).includes(w)));
      await page.getByLabel(`Search the ${tab.noun}`).fill(q);
      await expect(count(page)).toHaveText(firstPageLine(expected.length, N));
      expect(await shownIds(page)).toEqual(expected.slice(0, PAGE).map((x) => x.id));
      await expect(page).toHaveURL(new RegExp(`\\?q=${enc(q)}$`));
      // A word no item has: nothing is left.
      await page.getByLabel(`Search the ${tab.noun}`).fill(`${q} zzqxnotaword`);
      await expect(count(page)).toHaveText(`No matches (${N} in all)`);
    });

    test("category, phase and tags filter the list; Clear filters shows everything again", async ({ page }) => {
      await page.goto(tab.route);
      const cat = mostCommon(tab.items.map((x) => x.category));
      const byCat = tab.items.filter((x) => x.category === cat);
      await page.getByLabel("Category", { exact: true }).selectOption(cat);
      await expect(count(page)).toHaveText(firstPageLine(byCat.length, N));
      await expect(page).toHaveURL(new RegExp(`\\?category=${enc(cat)}`));
      for (const id of await shownIds(page)) expect(byCat.map((x) => x.id)).toContain(id);
      await page.getByTestId(`${tab.name}-clear`).click();
      await expect(count(page)).toHaveText(firstPageLine(N));

      // The phase filter shows only when there are at least two phases to choose from.
      const phases = new Set(tab.items.map((x) => x.phase).filter(Boolean));
      if (phases.size < 2) {
        await expect(page.getByLabel(tab.phaseLabel, { exact: true })).toHaveCount(0);
      } else {
        const phase = mostCommon(tab.items.map((x) => x.phase ?? ""));
        await page.getByLabel(tab.phaseLabel, { exact: true }).selectOption(phase);
        await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.phase === phase).length, N));
        await page.getByLabel(tab.phaseLabel, { exact: true }).selectOption("");
      }

      // Two ticked tags: only items with both.
      const tag = mostCommon(tab.items.flatMap((x) => x.tags));
      const second = mostCommon(tab.items.filter((x) => x.tags.includes(tag)).flatMap((x) => x.tags.filter((t) => t !== tag)));
      await page.getByTestId(`${tab.name}-tags-button`).click();
      const group = page.getByRole("group", { name: /every tag you tick/ });
      // Only the tags some item on this tab has are offered.
      await expect(group.getByRole("checkbox")).toHaveCount(new Set(tab.items.flatMap((x) => x.tags)).size);
      await group.getByLabel(tag, { exact: true }).check();
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.tags.includes(tag)).length, N));
      await group.getByLabel(second, { exact: true }).check();
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.tags.includes(tag) && x.tags.includes(second)).length, N));
      await page.keyboard.press("Escape");
      await expect(group).toBeHidden();
      await page.getByRole("button", { name: `Remove tag filter ${second}` }).click();
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.tags.includes(tag)).length, N));
    });

    test("the date range keeps items from..to, both days included", async ({ page }) => {
      await page.goto(tab.route);
      const dates = [...new Set(tab.items.map((x) => x.date))].sort();
      const day = dates[Math.floor(dates.length / 2)];
      await page.getByLabel("Date from", { exact: true }).fill(day);
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.date >= day).length, N));
      await page.getByLabel("Date to", { exact: true }).fill(day);
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.date === day).length, N));
      await expect(page).toHaveURL(new RegExp(`\\?from=${day}&to=${day}$`));
    });

    test("a 'Date from' after the 'Date to' says so instead of a bare \"No matches\"", async ({ page }) => {
      const dates = [...new Set(tab.items.map((x) => x.date))].sort();
      const [early, late] = [dates[0], dates[dates.length - 1]];
      test.skip(early === late, "one day only");
      await page.goto(`${tab.route}?from=${late}&to=${early}`);
      await expect(count(page)).toHaveText(`No matches (${N} in all)`);
      await expect(page.getByTestId(`${tab.name}-empty-why`)).toHaveText("The 'Date from' day is after the 'Date to' day.");
      // Each date box stops at the other's day.
      await expect(page.getByLabel("Date to", { exact: true })).toHaveAttribute("min", late);
      await expect(page.getByLabel("Date from", { exact: true })).toHaveAttribute("max", early);
    });

    test("the tag list closes when keyboard focus leaves it", async ({ page }) => {
      await page.goto(tab.route);
      await page.getByTestId(`${tab.name}-tags-button`).click();
      const group = page.getByRole("group", { name: /every tag you tick/ });
      await expect(group).toBeVisible();
      const boxes = group.getByRole("checkbox");
      await boxes.last().focus();
      await page.keyboard.press("Tab");
      await expect(group).toBeHidden();
      // Moving between the boxes inside keeps it open.
      await page.getByTestId(`${tab.name}-tags-button`).click();
      await boxes.first().focus();
      await page.keyboard.press("Tab");
      await expect(group).toBeVisible();
    });

    test("a tag chip on a card filters by that tag; pressed again, it turns the filter off", async ({ page }) => {
      await page.goto(tab.route);
      const first = tab.items[0];
      const tag = first.tags[0];
      const chip = cards(page).first().getByRole("button", { name: `Filter by tag ${tag}` });
      await expect(chip).toHaveAttribute("aria-pressed", "false");
      await chip.click();
      const withTag = tab.items.filter((x) => x.tags.includes(tag));
      await expect(count(page)).toHaveText(firstPageLine(withTag.length, N));
      await expect(page).toHaveURL(new RegExp(`\\?tag=${enc(tag)}$`));
      expect(await shownIds(page)).toEqual(withTag.slice(0, PAGE).map((x) => x.id));
      // Each card shows its category and its two tags.
      const labels = cards(page).first().getByTestId("label-chips");
      await expect(labels.locator(".chip-cat")).toHaveText(`Category: ${first.category}`);
      await expect(labels.locator(".chip-tag")).toHaveCount(2);
      const pressed = cards(page).first().getByRole("button", { name: `Filter by tag ${tag}` });
      await expect(pressed).toHaveAttribute("aria-pressed", "true");
      await pressed.click();
      await expect(count(page)).toHaveText(firstPageLine(N));
    });

    test("the address keeps search, filters and page: a reload restores the view", async ({ page }) => {
      const cat = mostCommon(tab.items.map((x) => x.category));
      await page.goto(tab.route);
      await page.getByLabel("Category", { exact: true }).selectOption(cat);
      const word = normalize(tab.items.find((x) => x.category === cat)!.title).split(" ").find((w) => /^[a-z0-9]{4,}$/.test(w))!;
      await page.getByLabel(`Search the ${tab.noun}`).fill(word);
      await expect(page).toHaveURL(/category=.*q=|q=.*category=/);
      const line = await count(page).textContent();
      const ids = await shownIds(page);
      await page.reload();
      await expect(page.getByLabel(`Search the ${tab.noun}`)).toHaveValue(word);
      await expect(page.getByLabel("Category", { exact: true })).toHaveValue(cat);
      await expect(count(page)).toHaveText(line!);
      expect(await shownIds(page)).toEqual(ids);
      // A copied link with a page number opens that page.
      if (N > PAGE) {
        await page.goto(`${tab.route}?page=2`);
        await expect(count(page)).toHaveText(range(PAGE + 1, Math.min(2 * PAGE, N), N));
      }
    });

    test("unknown values in the address are ignored, and the address is tidied", async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`${tab.route}?category=Nope&tag=zzz&phase=phase-p9-x&from=2026-02-30&page=abc&status=Maybe&has=nothing&foo=1`);
      await expect(count(page)).toHaveText(firstPageLine(N));
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
      expect(errors).toEqual([]);
    });

    test("no matches: a plain message with a button that clears the filters", async ({ page }) => {
      await page.goto(tab.route);
      await page.getByLabel(`Search the ${tab.noun}`).fill("zzqxnotaword");
      const empty = page.getByTestId(`${tab.name}-empty`);
      await expect(empty).toContainText("No matches");
      await expect(cards(page)).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Pages" })).toHaveCount(0);
      await empty.getByRole("button", { name: "Clear filters" }).click();
      await expect(count(page)).toHaveText(firstPageLine(N));
      await expect(page.getByLabel(`Search the ${tab.noun}`)).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
    });

    test("the tab button starts the list afresh", async ({ page }) => {
      const tag = tab.items[0].tags[0];
      await page.goto(`${tab.route}?tag=${encodeURIComponent(tag)}`);
      await expect(count(page)).toHaveText(firstPageLine(tab.items.filter((x) => x.tags.includes(tag)).length, N));
      await page.getByRole("navigation", { name: "Sections" }).locator(`a[href="${tab.route}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
      await expect(count(page)).toHaveText(firstPageLine(N));
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`accessible with filters on and the tag list open (${scheme} theme)`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        const tag = tab.items[0].tags[0];
        await page.goto(`${tab.route}?tag=${encodeURIComponent(tag)}`);
        await page.getByTestId(`${tab.name}-tags-button`).click();
        await expect(page.getByRole("group", { name: /every tag you tick/ })).toBeVisible();
        await expectAccessible(page);
        await page.goto(`${tab.route}?q=zzqxnotaword`);
        await expect(page.getByTestId(`${tab.name}-empty`)).toBeVisible();
        await expectAccessible(page);
      });
    }

    test("phone width: the filters fold under a Filters button; no sideways scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(tab.route);
      const toggle = page.getByRole("button", { name: /^Filters/ });
      await expect(toggle).toBeVisible();
      await expect(page.getByLabel("Category", { exact: true })).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.getByLabel("Category", { exact: true }).selectOption(tab.items[0].category);
      await expect(toggle).toHaveText(/Filters \(1 on\)/);
      await page.getByTestId(`${tab.name}-tags-button`).click();
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      await expectAccessible(page);
    });
  });
}

test("decisions: status and who decided filter the list", async ({ page }) => {
  await page.goto("/decisions");
  const count = page.getByTestId("decisions-count");
  const N = decisions.length;
  for (const status of ["Accepted", "Proposed", "Replaced"]) {
    await page.getByLabel("Status", { exact: true }).selectOption(status);
    await expect(count).toHaveText(firstPageLine(decisions.filter((d) => d.status === status).length, N));
  }
  await page.getByLabel("Status", { exact: true }).selectOption("");
  for (const by of ["you", "claude"] as const) {
    await page.getByLabel("Who decided", { exact: true }).selectOption(by);
    await expect(count).toHaveText(firstPageLine(decisions.filter((d) => d.decided_by === by).length, N));
    for (const id of await page.locator("[data-decision]").evaluateAll((els) => els.map((e) => e.getAttribute("data-decision")!))) {
      expect(decisions.find((d) => d.id === id)!.decided_by).toBe(by);
    }
  }
  await expect(page).toHaveURL(/\/decisions\?by=claude$/);
});

test("log: has decisions / has approvals filter the list", async ({ page }) => {
  await page.goto("/log");
  const count = page.getByTestId("log-count");
  const N = entries.length;
  await page.getByLabel("Show", { exact: true }).selectOption("decisions");
  await expect(count).toHaveText(firstPageLine(entries.filter((e) => e.decisions.length > 0).length, N));
  await page.getByLabel("Show", { exact: true }).selectOption("approvals");
  await expect(count).toHaveText(firstPageLine(entries.filter((e) => e.approvals.length > 0).length, N));
  await expect(page).toHaveURL(/\/log\?has=approvals$/);
  await page.getByLabel("Show", { exact: true }).selectOption("");
  await expect(count).toHaveText(firstPageLine(N));
});
