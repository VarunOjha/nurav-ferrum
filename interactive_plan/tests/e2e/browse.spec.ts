// browse.spec: one list pattern on five lists (owner's plan of 2026-10-10,
// wiki/raw/owner/2026-10-10-s01-browse-v2-approval.md): Log, Questions, Decisions, Risks (on the
// Decisions tab) and Research. For every list: the starting order and filters, 20 per page with
// numbered pages, cards closed at first that open on click, "Open all / Close all" on the page shown,
// every Sort choice, the search box (every word must appear), category, tags and phase filters, the date
// range where dates differ, a tag chip that filters, the page address restoring search, filters, sort and
// page on reload (open cards are not kept), unknown address values tidied away, the empty state, the tab
// button starting afresh, the phone layout, and axe in the light and the dark theme at 1440 and 390 px.
// Then each list's own rules: Questions start on Open and "Any status" shows all; Risks start highest
// risk first and say "Risk L × I = S"; Research has a kind filter and kind links; Decisions sort by
// number and filter by status and who decided; the Log's Show filter. Expectations are computed from the
// same JSON the portal reads, with comparators written here (not the portal's own sort code).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { collectErrors, expectAccessible, sidewaysOverflow } from "./axe";
import { portalJson } from "./helpers";
import { normalize } from "../../lib/portal/browse";

type SortKey = "newest" | "oldest" | "phase" | "az" | "number" | "risk";
const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  phase: "By phase",
  az: "A to Z by title",
  number: "By number",
  risk: "Highest risk first",
};

/** One item as these tests see it. */
interface Row {
  id: string;
  /** Plain title (link markup dropped), as the card's closed line shows it. */
  title: string;
  date: string | null;
  time: string | null;
  category: string;
  tags: string[];
  phases: string[];
  status: string;
  /** Place in the file. */
  index: number;
  number?: number;
  score?: number;
  /** Searchable text, normalised as the portal searches it. */
  text: string;
}

const plain = (s: string) => s.replace(/\[([^\]\n]+)\]\(ref:[^)\s]+\)/g, "$1");
const roadmapIds = portalJson<{ phases: { id: string }[] }>("roadmap.json").phases.map((p) => p.id);
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const byId = (a: Row, b: Row) => collator.compare(a.id, b.id);
const older = (a: Row, b: Row) => {
  const [da, db] = [a.date ?? "", b.date ?? ""];
  if (da !== db) return da < db ? -1 : 1;
  const [ta, tb] = [a.time ?? "", b.time ?? ""];
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.index - b.index;
};
const phaseRank = (r: Row) => {
  const ranks = r.phases.map((p) => (roadmapIds.includes(p) ? roadmapIds.indexOf(p) : roadmapIds.length));
  return ranks.length ? Math.min(...ranks) : Number.POSITIVE_INFINITY;
};

/** The expected order of a sort, written independently of lib/portal/browse.ts. */
function ordered(rows: readonly Row[], sort: SortKey): Row[] {
  const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
    newest: (a, b) => older(b, a) || byId(a, b),
    oldest: (a, b) => older(a, b) || byId(a, b),
    phase: (a, b) => phaseRank(a) - phaseRank(b) || a.index - b.index,
    az: (a, b) => collator.compare(a.title, b.title) || byId(a, b),
    number: (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.index - b.index,
    risk: (a, b) => (b.score ?? 0) - (a.score ?? 0) || byId(a, b),
  };
  return [...rows].sort((a, b) => {
    const c = cmp[sort](a, b);
    return Number.isNaN(c) ? 0 : c;
  });
}

interface LogEntry {
  id: string;
  date: string;
  time?: string;
  title: string;
  done: string;
  next: string | null;
  decisions: { what: string }[];
  approvals: unknown[];
  phase?: string;
  category: string;
  tags: string[];
}
interface Question {
  id: string;
  asked: string;
  time?: string;
  question: string;
  why_it_matters: string;
  answer: string | null;
  status: "open" | "answered" | "withdrawn";
  blocks: string[];
  category: string;
  tags: string[];
}
interface Decision {
  id: string;
  number: number;
  date: string;
  title: string;
  summary: string;
  why: string;
  catch: string | null;
  status: string;
  decided_by: "you" | "claude";
  phase: string;
  category: string;
  tags: string[];
}
interface Risk {
  id: string;
  title: string;
  summary: string;
  mitigation: string;
  likelihood: number;
  impact: number;
  phase: string;
  status: string;
  category: string;
  tags: string[];
}
interface ResearchItem {
  id: string;
  title: string;
  summary: string;
  status: string;
  phase?: string;
  category?: string;
  tags?: string[];
  question?: string;
  prediction?: string;
  unit?: string;
}

const logEntries = portalJson<{ entries: LogEntry[] }>("log.json").entries;
const questions = portalJson<{ items: Question[] }>("questions.json").items;
const decisions = portalJson<{ items: Decision[] }>("decisions.json").items;
const risks = portalJson<{ items: Risk[] }>("risks.json").items;
const research = portalJson<Record<string, ResearchItem[]>>("research.json");
const KINDS: [string, string][] = [
  ["questions", "Research question"],
  ["hypotheses", "Prediction"],
  ["experiments", "Experiment"],
  ["metrics", "Measure"],
  ["workloads", "Test site"],
];
const researchItems = KINDS.flatMap(([key, kind]) => (research[key] ?? []).map((i) => ({ ...i, kind })));

interface Tab {
  route: string;
  /** Browse name: the prefix of its test ids. */
  name: string;
  noun: string;
  /** The card's list-item attribute holding the item id. */
  idAttr: string;
  rows: Row[];
  sorts: SortKey[];
  categoryLabel: string;
  phaseLabel: string;
  dates: boolean;
  /** Address key prefix (Risks share the Decisions tab). */
  prefix: string;
  /** Items the list shows before any choice (Questions: the open ones). */
  start: (rows: Row[]) => Row[];
  /** True when the starting view is already filtered (the results line then says "(N in all)"). */
  startFiltered: boolean;
  /** An address value that shows every item again on this tab (Questions: status=any). */
  showAll: string;
}

const TABS: Tab[] = [
  {
    route: "/log",
    name: "log",
    noun: "entries",
    idAttr: "data-entry",
    rows: logEntries.map((e, index) => ({
      id: e.id,
      title: plain(e.title),
      date: e.date,
      time: e.time ?? null,
      category: e.category,
      tags: e.tags,
      phases: e.phase ? [e.phase] : [],
      status: "",
      index,
      text: normalize([e.title, e.done, e.next ?? "", ...e.decisions.map((d) => d.what)].join(" \n ")),
    })),
    sorts: ["newest", "oldest", "phase", "az"],
    categoryLabel: "Category",
    phaseLabel: "Phase",
    dates: true,
    prefix: "",
    start: (r) => r,
    startFiltered: false,
    showAll: "",
  },
  {
    route: "/questions",
    name: "questions",
    noun: "questions",
    idAttr: "data-question",
    rows: questions.map((q, index) => ({
      id: q.id,
      title: plain(q.question),
      date: q.asked,
      time: q.time ?? null,
      category: q.category,
      tags: q.tags,
      phases: q.blocks,
      status: q.status,
      index,
      text: normalize([q.id, q.question, q.why_it_matters, q.answer ?? ""].join(" \n ")),
    })),
    sorts: ["newest", "oldest", "phase", "az"],
    categoryLabel: "Category",
    phaseLabel: "Holds up phase",
    dates: true,
    prefix: "",
    start: (r) => r.filter((x) => x.status === "open"),
    startFiltered: true,
    showAll: "status=any",
  },
  {
    route: "/decisions",
    name: "decisions",
    noun: "decisions",
    idAttr: "data-decision",
    rows: decisions.map((d, index) => ({
      id: d.id,
      title: plain(d.title),
      date: d.date,
      time: null,
      category: d.category,
      tags: d.tags,
      phases: [d.phase],
      status: d.status,
      index,
      number: d.number,
      text: normalize([d.title, d.summary, d.why, d.catch ?? ""].join(" \n ")),
    })),
    sorts: ["newest", "oldest", "phase", "az", "number"],
    categoryLabel: "Category",
    phaseLabel: "Affects phase",
    dates: true,
    prefix: "",
    start: (r) => r,
    startFiltered: false,
    showAll: "",
  },
  {
    route: "/decisions",
    name: "risks",
    noun: "risks",
    idAttr: "data-risk",
    rows: risks.map((r, index) => ({
      id: r.id,
      title: plain(r.title),
      date: null,
      time: null,
      category: r.category,
      tags: r.tags,
      phases: [r.phase],
      status: r.status,
      index,
      score: r.likelihood * r.impact,
      text: normalize([r.title, r.summary, r.mitigation].join(" \n ")),
    })),
    sorts: ["risk", "newest", "oldest", "phase", "az"],
    categoryLabel: "Category",
    phaseLabel: "Handled in phase",
    dates: false,
    prefix: "risk-",
    start: (r) => r,
    startFiltered: false,
    showAll: "",
  },
  {
    route: "/research",
    name: "research",
    noun: "research items",
    idAttr: "data-item",
    rows: researchItems.map((i, index) => ({
      id: i.id,
      title: plain(i.title),
      date: null,
      time: null,
      category: i.category ?? i.kind,
      tags: i.tags ?? [],
      phases: i.phase ? [i.phase] : [],
      status: i.status,
      index,
      text: normalize([i.title, i.summary, i.question ?? i.prediction ?? (i.unit ? `Unit: ${i.unit}` : ""), i.kind].join(" \n ")),
    })),
    sorts: ["phase", "newest", "oldest", "az"],
    categoryLabel: "Kind",
    phaseLabel: "Phase",
    dates: false,
    prefix: "",
    start: (r) => r,
    startFiltered: false,
    showAll: "",
  },
];

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
const firstPageLine = (total: number, all?: number) => (total === 0 ? `No matches${all !== undefined ? ` (${all} in all)` : ""}` : range(1, Math.min(PAGE, total), total, all));

for (const tab of TABS) {
  const N = tab.rows.length;
  const start = ordered(tab.start(tab.rows), tab.sorts[0]);
  const startAll = tab.startFiltered ? N : undefined;
  const k = (key: string) => `${tab.prefix}${key}`;
  /** The query for this list ("?risk-q=x") plus what shows every item, so tests start from all items. */
  const all = (q = "") => {
    const parts = [tab.showAll, q].filter(Boolean).join("&");
    return parts ? `${tab.route}?${parts}` : tab.route;
  };
  const box = (page: Page) => page.getByTestId(`${tab.name}-browse`);
  const cards = (page: Page) => box(page).locator(`li[${tab.idAttr}]`);
  const count = (page: Page) => page.getByTestId(`${tab.name}-count`);
  const shownIds = (page: Page) => cards(page).evaluateAll((els, attr) => els.map((e) => e.getAttribute(attr)!), tab.idAttr);
  const label = (page: Page, text: string) => box(page).getByLabel(text, { exact: true });
  const search = (page: Page) => box(page).getByLabel(`Search the ${tab.noun}`);
  const pagesNav = (page: Page) => box(page).getByRole("navigation", { name: `Pages of the ${tab.noun}` });
  const openAll = (page: Page) => page.getByTestId(`${tab.name}-open-all`);
  /** Expected line for `total` matches out of every item, with a filter on. */
  const line = (total: number) => firstPageLine(total, N);

  test.describe(`${tab.name} list`, () => {
    test("starts in its own order and filters, 20 per page, numbered pages, Previous and Next", async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(tab.route);
      await expect(count(page)).toHaveText(firstPageLine(start.length, startAll));
      expect(await shownIds(page)).toEqual(start.slice(0, PAGE).map((x) => x.id));
      await expect(label(page, "Sort")).toHaveValue(tab.sorts[0]);
      await expect(label(page, "Sort").locator("option")).toHaveText(tab.sorts.map((s) => SORT_LABEL[s]));
      if (start.length > PAGE) {
        const nav = pagesNav(page);
        await expect(nav.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");
        await expect(nav.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute("aria-current", "page");
        await nav.getByRole("button", { name: "Next" }).click();
        await expect(count(page)).toHaveText(range(PAGE + 1, Math.min(2 * PAGE, start.length), start.length, startAll));
        await expect(page).toHaveURL(new RegExp(`\\?${k("page")}=2$`));
        expect(await shownIds(page)).toEqual(start.slice(PAGE, 2 * PAGE).map((x) => x.id));
        const pages = Math.ceil(start.length / PAGE);
        await nav.getByRole("button", { name: `Page ${pages}`, exact: true }).click();
        await expect(nav.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
        // At the end, Next keeps the focus and does nothing.
        await nav.getByRole("button", { name: "Next" }).focus();
        await page.keyboard.press("Enter");
        await expect(nav.getByRole("button", { name: "Next" })).toBeFocused();
      }
      expect(errors).toEqual([]);
    });

    test("cards start closed; a click opens and closes one; Open all and Close all act on the page shown", async ({ page }) => {
      await page.goto(tab.route);
      const first = cards(page).first();
      const details = first.locator("details");
      await expect(details).not.toHaveAttribute("open", /.*/);
      // The closed line: title, category and two tags; no buttons inside it.
      const summary = first.locator("summary");
      await expect(summary.locator(".acc-title")).toContainText(start[0].title.slice(0, 30));
      await expect(summary.locator(".chip-cat")).toHaveText(`Category: ${start[0].category}`);
      await expect(summary.locator(".chip-tag")).toHaveCount(2);
      await expect(summary.locator("button, a")).toHaveCount(0);
      await expect(first.locator(".acc-body")).toBeHidden();
      await summary.click();
      await expect(details).toHaveAttribute("open", "");
      await expect(first.locator(".acc-body")).toBeVisible();
      // The opened card's tag chips filter (tested below); here they are visible.
      await expect(first.locator(".acc-body [data-testid=label-chips] button.chip-tag")).toHaveCount(2);
      await summary.click();
      await expect(details).not.toHaveAttribute("open", /.*/);
      // Keyboard: Enter on the closed line opens it.
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(details).toHaveAttribute("open", "");
      await summary.click();

      await expect(openAll(page)).toHaveText("Open all");
      await openAll(page).click();
      await expect(openAll(page)).toHaveText("Close all");
      const n = Math.min(PAGE, start.length);
      await expect(cards(page).locator("details[open]")).toHaveCount(n);
      // Open cards are not kept in the address.
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
      await openAll(page).click();
      await expect(openAll(page)).toHaveText("Open all");
      await expect(cards(page).locator("details[open]")).toHaveCount(0);
      if (start.length > PAGE) {
        await openAll(page).click();
        await pagesNav(page).getByRole("button", { name: "Page 2" }).click();
        // The cards of page 2 start closed: Open all is offered again.
        await expect(openAll(page)).toHaveText("Open all");
        await expect(cards(page).locator("details[open]")).toHaveCount(0);
      }
    });

    for (const sort of tab.sorts) {
      test(`Sort: ${SORT_LABEL[sort]}`, async ({ page }) => {
        await page.goto(all());
        const rows = ordered(tab.rows, sort);
        await label(page, "Sort").selectOption(sort);
        await expect(label(page, "Sort")).toHaveValue(sort);
        await expect(count(page)).toHaveText(firstPageLine(N));
        expect(await shownIds(page)).toEqual(rows.slice(0, PAGE).map((x) => x.id));
        if (sort === tab.sorts[0]) await expect(page).not.toHaveURL(new RegExp(`${k("sort")}=`));
        else await expect(page).toHaveURL(new RegExp(`[?&]${k("sort")}=${sort}(&|$)`));
        // The order goes on onto page 2.
        if (N > PAGE) {
          await pagesNav(page).getByRole("button", { name: "Page 2" }).click();
          expect(await shownIds(page)).toEqual(rows.slice(PAGE, 2 * PAGE).map((x) => x.id));
        }
      });
    }

    test("the search narrows the list; every word must appear, in any case", async ({ page }) => {
      await page.goto(all());
      const pick = tab.rows.find((x) => normalize(x.title).split(" ").filter((w) => /^[a-z0-9]{4,}$/.test(w)).length >= 2)!;
      const words = normalize(pick.title)
        .split(" ")
        .filter((w) => /^[a-z0-9]{4,}$/.test(w))
        .slice(0, 2);
      const q = words.reverse().join(" ").toUpperCase();
      const expected = ordered(
        tab.rows.filter((x) => words.every((w) => x.text.includes(w))),
        tab.sorts[0],
      );
      await search(page).fill(q);
      await expect(count(page)).toHaveText(line(expected.length));
      expect(await shownIds(page)).toEqual(expected.slice(0, PAGE).map((x) => x.id));
      await expect(page).toHaveURL(new RegExp(`[?&]${k("q")}=${enc(q)}(&|$)`));
      await search(page).fill(`${q} zzqxnotaword`);
      await expect(count(page)).toHaveText(`No matches (${N} in all)`);
    });

    test("category, phase and tags filter the list; Clear filters shows everything", async ({ page }) => {
      await page.goto(all());
      const cats = new Set(tab.rows.map((x) => x.category));
      if (cats.size < 2) {
        await expect(label(page, tab.categoryLabel)).toHaveCount(0);
      } else {
        const cat = mostCommon(tab.rows.map((x) => x.category));
        const byCat = tab.rows.filter((x) => x.category === cat);
        await label(page, tab.categoryLabel).selectOption(cat);
        await expect(count(page)).toHaveText(line(byCat.length));
        await expect(page).toHaveURL(new RegExp(`[?&]${k("category")}=${enc(cat)}(&|$)`));
        for (const id of await shownIds(page)) expect(byCat.map((x) => x.id)).toContain(id);
        await page.getByTestId(`${tab.name}-clear`).click();
        await expect(count(page)).toHaveText(firstPageLine(N));
      }

      // The phase filter shows only when there are at least two phases to choose from.
      const phases = new Set(tab.rows.flatMap((x) => x.phases));
      if (phases.size < 2) {
        await expect(label(page, tab.phaseLabel)).toHaveCount(0);
      } else {
        const phase = mostCommon(tab.rows.flatMap((x) => x.phases));
        await label(page, tab.phaseLabel).selectOption(phase);
        await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.phases.includes(phase)).length));
        await label(page, tab.phaseLabel).selectOption("");
      }

      // Two ticked tags: only items with both. Only the tags some item has are offered.
      const tag = mostCommon(tab.rows.flatMap((x) => x.tags));
      const second = mostCommon(tab.rows.filter((x) => x.tags.includes(tag)).flatMap((x) => x.tags.filter((t) => t !== tag)));
      await page.getByTestId(`${tab.name}-tags-button`).click();
      const group = box(page).getByRole("group", { name: /every tag you tick/ });
      await expect(group.getByRole("checkbox")).toHaveCount(new Set(tab.rows.flatMap((x) => x.tags)).size);
      await group.getByLabel(tag, { exact: true }).check();
      await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.tags.includes(tag)).length));
      await group.getByLabel(second, { exact: true }).check();
      await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.tags.includes(tag) && x.tags.includes(second)).length));
      await page.keyboard.press("Escape");
      await expect(group).toBeHidden();
      await box(page).getByRole("button", { name: `Remove tag filter ${second}` }).click();
      await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.tags.includes(tag)).length));
    });

    if (tab.dates) {
      test("the date range keeps items from..to, both days included", async ({ page }) => {
        await page.goto(all());
        const dates = [...new Set(tab.rows.map((x) => x.date!))].sort();
        const day = dates[Math.floor(dates.length / 2)];
        await label(page, "Date from").fill(day);
        await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.date! >= day).length));
        await label(page, "Date to").fill(day);
        await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.date === day).length));
        await expect(page).toHaveURL(new RegExp(`from=${day}&to=${day}`));
        // A "Date from" after the "Date to" says so instead of a bare "No matches".
        const [early, late] = [dates[0], dates[dates.length - 1]];
        if (early !== late) {
          await page.goto(all(`from=${late}&to=${early}`));
          await expect(count(page)).toHaveText(`No matches (${N} in all)`);
          await expect(page.getByTestId(`${tab.name}-empty-why`)).toHaveText("The 'Date from' day is after the 'Date to' day.");
          await expect(label(page, "Date to")).toHaveAttribute("min", late);
          await expect(label(page, "Date from")).toHaveAttribute("max", early);
        }
      });
    } else {
      test("no date range (every item has the same day or none)", async ({ page }) => {
        await page.goto(tab.route);
        await expect(label(page, "Date from")).toHaveCount(0);
        await expect(label(page, "Date to")).toHaveCount(0);
      });
    }

    test("a tag chip in an opened card filters by that tag; pressed again, it turns the filter off", async ({ page }) => {
      await page.goto(all());
      const firstRow = ordered(tab.rows, tab.sorts[0])[0];
      const tag = firstRow.tags[0];
      await cards(page).first().locator("summary").click();
      const chip = cards(page).first().getByRole("button", { name: `Filter by tag ${tag}` });
      await expect(chip).toHaveAttribute("aria-pressed", "false");
      await chip.click();
      const withTag = ordered(
        tab.rows.filter((x) => x.tags.includes(tag)),
        tab.sorts[0],
      );
      await expect(count(page)).toHaveText(line(withTag.length));
      await expect(page).toHaveURL(new RegExp(`[?&]${k("tag")}=${enc(tag)}(&|$)`));
      expect(await shownIds(page)).toEqual(withTag.slice(0, PAGE).map((x) => x.id));
      // The same card is still first and still open: its chip is pressed now.
      const pressed = cards(page).first().getByRole("button", { name: `Filter by tag ${tag}` });
      await expect(pressed).toHaveAttribute("aria-pressed", "true");
      await pressed.click();
      await expect(count(page)).toHaveText(firstPageLine(N));
    });

    test("the address keeps search, filters, sort and page: a reload restores the view, not the open cards", async ({ page }) => {
      const cat = mostCommon(tab.rows.map((x) => x.category));
      await page.goto(all());
      if (new Set(tab.rows.map((x) => x.category)).size > 1) await label(page, tab.categoryLabel).selectOption(cat);
      const word = normalize(tab.rows.find((x) => x.category === cat)!.title)
        .split(" ")
        .find((w) => /^[a-z0-9]{4,}$/.test(w))!;
      await search(page).fill(word);
      await label(page, "Sort").selectOption(tab.sorts[tab.sorts.length - 1]);
      await expect(page).toHaveURL(new RegExp(`${k("sort")}=`));
      const text = await count(page).textContent();
      const ids = await shownIds(page);
      await cards(page).first().locator("summary").click();
      await page.reload();
      await expect(search(page)).toHaveValue(word);
      await expect(label(page, "Sort")).toHaveValue(tab.sorts[tab.sorts.length - 1]);
      await expect(count(page)).toHaveText(text!);
      expect(await shownIds(page)).toEqual(ids);
      await expect(cards(page).locator("details[open]")).toHaveCount(0);
      // A copied link with a page number and a sort opens that page in that order.
      if (N > PAGE) {
        await page.goto(all(`${k("sort")}=oldest&${k("page")}=2`));
        await expect(count(page)).toHaveText(range(PAGE + 1, Math.min(2 * PAGE, N), N));
        expect(await shownIds(page)).toEqual(
          ordered(tab.rows, "oldest")
            .slice(PAGE, 2 * PAGE)
            .map((x) => x.id),
        );
      }
    });

    test("unknown values in the address are ignored, and the address is tidied", async ({ page }) => {
      const errors = collectErrors(page);
      const junk = ["category=Nope", "tag=zzz", "phase=phase-p9-x", "from=2026-02-30", "page=abc", "sort=sideways", "status=Maybe", "has=nothing", "by=nobody"]
        .map((p) => `${tab.prefix}${p}`)
        .join("&");
      await page.goto(`${tab.route}?${junk}&foo=1`);
      await expect(count(page)).toHaveText(firstPageLine(start.length, startAll));
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
      expect(errors).toEqual([]);
    });

    test("no matches: a plain message with a button that clears the filters", async ({ page }) => {
      await page.goto(tab.route);
      await search(page).fill("zzqxnotaword");
      const empty = page.getByTestId(`${tab.name}-empty`);
      await expect(empty).toContainText("No matches");
      await expect(cards(page)).toHaveCount(0);
      await expect(openAll(page)).toHaveCount(0);
      await expect(pagesNav(page)).toHaveCount(0);
      await empty.getByRole("button", { name: "Clear filters" }).click();
      await expect(count(page)).toHaveText(firstPageLine(N));
      await expect(search(page)).toBeFocused();
    });

    test("the tab button starts the list afresh", async ({ page }) => {
      const tag = tab.rows[0].tags[0];
      await page.goto(all(`${k("tag")}=${encodeURIComponent(tag)}&${k("sort")}=az`));
      await expect(count(page)).toHaveText(line(tab.rows.filter((x) => x.tags.includes(tag)).length));
      await page.getByRole("navigation", { name: "Sections" }).locator(`a[href="${tab.route}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${tab.route}$`));
      await expect(count(page)).toHaveText(firstPageLine(start.length, startAll));
      await expect(label(page, "Sort")).toHaveValue(tab.sorts[0]);
    });

    test("phone width: the filters fold under a Filters button; sort and Open all stay; no sideways scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(all());
      const toggle = box(page).getByRole("button", { name: /^Filters/ });
      await expect(toggle).toBeVisible();
      await expect(label(page, "Sort")).toBeVisible();
      await expect(openAll(page)).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.getByTestId(`${tab.name}-tags-button`).click();
      await openAll(page).click();
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    });

    for (const width of [1440, 390]) {
      for (const scheme of ["light", "dark"] as const) {
        test(`accessible with every card of the page open and the tag list open (${scheme} theme, ${width} wide)`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          await page.goto(tab.route);
          await openAll(page).click();
          await expect(cards(page).first().locator("details")).toHaveAttribute("open", "");
          if (width < 640) await box(page).getByRole("button", { name: /^Filters/ }).click();
          await page.getByTestId(`${tab.name}-tags-button`).click();
          await expect(box(page).getByRole("group", { name: /every tag you tick/ })).toBeVisible();
          await expectAccessible(page);
          await page.goto(all(`${k("q")}=zzqxnotaword`));
          await expect(page.getByTestId(`${tab.name}-empty`)).toBeVisible();
          await expectAccessible(page);
        });
      }
    }
  });
}

const qTab = TABS.find((t) => t.name === "questions")!;

test.describe("questions: starts on Open", () => {
  const box = (page: Page) => page.getByTestId("questions-browse");
  const count = (page: Page) => page.getByTestId("questions-count");
  const ids = (page: Page) => box(page).locator("li[data-question]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question")!));
  const open = questions.filter((q) => q.status === "open");

  test("the Status filter starts on Open; Any status shows all and the address says so; Clear filters too", async ({ page }) => {
    await page.goto("/questions");
    const status = box(page).getByLabel("Status", { exact: true });
    await expect(status).toHaveValue("open");
    await expect(count(page)).toHaveText(firstPageLine(open.length, questions.length));
    for (const id of await ids(page)) expect(open.map((q) => q.id)).toContain(id);
    await status.selectOption("");
    await expect(count(page)).toHaveText(firstPageLine(questions.length));
    await expect(page).toHaveURL(/\/questions\?status=any$/);
    await page.reload();
    await expect(status).toHaveValue("");
    await expect(count(page)).toHaveText(firstPageLine(questions.length));
    for (const s of ["answered", "withdrawn"] as const) {
      await status.selectOption(s);
      await expect(count(page)).toHaveText(firstPageLine(questions.filter((q) => q.status === s).length, questions.length));
      await expect(page).toHaveURL(new RegExp(`status=${s}$`));
    }
    await status.selectOption("open");
    await expect(page).toHaveURL(/\/questions$/);
    // Clear filters shows every question (status any), not the starting Open.
    await page.getByTestId("questions-clear").click();
    await expect(count(page)).toHaveText(firstPageLine(questions.length));
    await expect(page).toHaveURL(/\/questions\?status=any$/);
  });

  test("the Overview's link opens Questions on Open", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("questions-for-you").getByRole("link", { name: /See the open questions/ }).click();
    await expect(page).toHaveURL(/\/questions$/);
    await expect(box(page).getByLabel("Status", { exact: true })).toHaveValue("open");
    await expect(count(page)).toHaveText(firstPageLine(open.length, questions.length));
  });

  test("a card says when it was asked, its status, Asked now; opened: the id, what it holds up, why it matters, your answer", async ({ page }) => {
    const overview = portalJson<{ questions_for_you: { items: { id: string }[] } }>("overview.json");
    const now = new Set(overview.questions_for_you.items.map((q) => q.id));
    await page.goto("/questions?status=any");
    await page.getByTestId("questions-open-all").click();
    // Every card on the first page shows its status chip and, when the Overview asks it, "Asked now".
    for (const id of await ids(page)) {
      const q = questions.find((x) => x.id === id)!;
      const card = box(page).locator(`li[data-question="${id}"]`);
      await expect(card.locator("summary")).toContainText("Asked ");
      if (q.time) await expect(card.locator("summary")).toContainText(q.time);
      await expect(card.locator("summary .chip").first()).toHaveText({ open: "Open", answered: "Answered", withdrawn: "Withdrawn" }[q.status]);
      await expect(card.getByTestId("asked-now")).toHaveCount(now.has(id) ? 1 : 0);
      await expect(card.locator(`.acc-body [data-ref-id="${id}"]`)).toBeVisible();
      if (q.blocks.length > 0) await expect(card.locator(".acc-body")).toContainText("Holds up:");
      if (q.answer) await expect(card.locator(".acc-body .answer")).toBeVisible();
    }
    expect(qTab.rows.length).toBe(questions.length);
  });

  test("a withdrawn question links to the question that replaced it (review 2026-10-09)", async ({ page }) => {
    await page.goto("/questions?status=withdrawn");
    for (const [id, to] of [
      ["Q-001", "Q-117"],
      ["Q-002", "Q-118"],
      ["Q-003", "Q-119"],
    ] as const) {
      const card = box(page).locator(`li[data-question="${id}"]`);
      await expect(card).toHaveClass(/is-muted/);
      await card.locator("summary").click();
      const link = card.locator(`.lh [data-ref-id="${to}"]`);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.getByTestId("ref-dialog")).toBeVisible();
      await expect(page.getByTestId("ref-dialog")).toContainText(to);
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("risks: highest risk first", () => {
  const box = (page: Page) => page.getByTestId("risks-browse");

  test("the risks start highest risk first, ties by id; each card says Risk L × I = S", async ({ page }) => {
    await page.goto("/decisions");
    const shown = await box(page)
      .locator("li[data-risk]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-risk")!));
    const scores = shown.map((id) => {
      const r = risks.find((x) => x.id === id)!;
      return r.likelihood * r.impact;
    });
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const id of shown) {
      const r = risks.find((x) => x.id === id)!;
      await expect(box(page).locator(`li[data-risk="${id}"] summary`)).toContainText(`Risk ${r.likelihood} × ${r.impact} = ${r.likelihood * r.impact}`);
    }
    // Opened: what could happen, what we do about it, and the phase it is handled in.
    const top = risks.find((x) => x.id === shown[0])!;
    const card = box(page).locator(`li[data-risk="${top.id}"]`);
    await card.locator("summary").click();
    await expect(card.locator(".acc-body")).toContainText("What we do about it");
    await expect(card.getByTestId("risk-meta")).toContainText(`How likely: ${top.likelihood} of 5`);
  });

  test("the decisions and the risks keep separate choices in one address", async ({ page }) => {
    await page.goto("/decisions");
    await page.getByTestId("risks-browse").getByLabel("Sort", { exact: true }).selectOption("az");
    await page.getByTestId("decisions-browse").getByLabel("Sort", { exact: true }).selectOption("number");
    await expect(page).toHaveURL(/risk-sort=az/);
    await expect(page).toHaveURL(/[?&]sort=number/);
    await page.reload();
    await expect(page.getByTestId("risks-browse").getByLabel("Sort", { exact: true })).toHaveValue("az");
    await expect(page.getByTestId("decisions-browse").getByLabel("Sort", { exact: true })).toHaveValue("number");
    await page.getByTestId("decisions-browse").getByLabel("Search the decisions").fill("zzqxnotaword");
    await expect(page.getByTestId("decisions-empty")).toBeVisible();
    await expect(page.getByTestId("risks-count")).toHaveText(firstPageLine(risks.length));
  });
});

test.describe("research: one list, kind as category", () => {
  const box = (page: Page) => page.getByTestId("research-browse");
  const count = (page: Page) => page.getByTestId("research-count");

  test("the Kind filter keeps one kind; the kind links under the heading do the same", async ({ page }) => {
    await page.goto("/research");
    await expect(count(page)).toHaveText(firstPageLine(researchItems.length));
    for (const [key, kind] of KINDS) {
      const n = (research[key] ?? []).length;
      await box(page).getByLabel("Kind", { exact: true }).selectOption(kind);
      await expect(count(page)).toHaveText(firstPageLine(n, researchItems.length));
      await expect(page).toHaveURL(new RegExp(`category=${enc(kind)}$`));
      for (const id of await box(page)
        .locator("li[data-item]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-item")!))) {
        expect((research[key] ?? []).map((i) => i.id)).toContain(id);
      }
    }
    await page.goto("/research");
    const kinds = page.getByRole("navigation", { name: "Research kinds" });
    await kinds.getByRole("link", { name: /^Measure/ }).click();
    await expect(page).toHaveURL(/\/research\?category=Measure$/);
    await expect(count(page)).toHaveText(firstPageLine((research.metrics ?? []).length, researchItems.length));
    await expect(box(page).getByLabel("Kind", { exact: true })).toHaveValue("Measure");
  });

  test("an opened item shows its details and related ids, each opening its explainer", async ({ page }) => {
    const h = (research.hypotheses ?? []).find((x) => (x as { related?: string[] }).related?.length) as (ResearchItem & { related: string[] }) | undefined;
    test.skip(!h, "no prediction with related ids");
    await page.goto("/research?category=Prediction");
    const card = box(page).locator(`li[data-item="${h!.id}"]`);
    await card.locator("summary").click();
    await expect(card.locator(".acc-body")).toContainText("We expect");
    await expect(card.locator(".acc-body")).toContainText(plain(h!.prediction!).slice(0, 20));
    await card.locator(`.acc-body [data-ref-id="${h!.related[0]}"]`).click();
    await expect(page.getByTestId("ref-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("ref-dialog")).toBeHidden();
  });
});

test.describe("decisions: number, status and who decided", () => {
  const box = (page: Page) => page.getByTestId("decisions-browse");
  const count = (page: Page) => page.getByTestId("decisions-count");

  test("status and who decided filter the list", async ({ page }) => {
    await page.goto("/decisions");
    const N = decisions.length;
    for (const status of ["Accepted", "Proposed", "Replaced"]) {
      await box(page).getByLabel("Status", { exact: true }).selectOption(status);
      await expect(count(page)).toHaveText(firstPageLine(decisions.filter((d) => d.status === status).length, N));
    }
    await box(page).getByLabel("Status", { exact: true }).selectOption("");
    for (const by of ["you", "claude"] as const) {
      await box(page).getByLabel("Who decided", { exact: true }).selectOption(by);
      await expect(count(page)).toHaveText(firstPageLine(decisions.filter((d) => d.decided_by === by).length, N));
      for (const id of await box(page)
        .locator("[data-decision]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-decision")!))) {
        expect(decisions.find((d) => d.id === id)!.decided_by).toBe(by);
      }
    }
    await expect(page).toHaveURL(/\/decisions\?by=claude$/);
  });

  test("a card shows its number, standing and labels; opened: what it means, why, the catch, what replaced it", async ({ page }) => {
    const d = decisions.find((x) => x.status === "Replaced")!;
    await page.goto(`/decisions?sort=number&page=${Math.floor((d.number - 1) / 20) + 1}`);
    const card = box(page).locator(`li[data-decision="${d.id}"]`);
    await expect(card).toHaveClass(/is-muted/);
    await expect(card.locator("summary")).toContainText(`#${d.number}`);
    await expect(card.locator("summary .chip").first()).toHaveText("Replaced");
    await card.locator("summary").click();
    await expect(card.getByTestId("decision-standing")).toContainText("later replaced");
    await expect(card.locator(".acc-body")).toContainText("What it means");
    await expect(card.locator(".acc-body")).toContainText("Why");
    if (d.catch) await expect(card.locator(".acc-body")).toContainText("The catch");
    const replacement = (d as unknown as { replaced_by: string }).replaced_by;
    await expect(card.getByTestId("replaced-by").locator(`[data-ref-id="${replacement}"]`)).toBeVisible();
    const mine = decisions.find((x) => x.status === "Accepted" && x.decided_by === "you")!;
    await page.goto(`/decisions?sort=number&page=${Math.floor((mine.number - 1) / 20) + 1}`);
    const c2 = box(page).locator(`li[data-decision="${mine.id}"]`);
    await expect(c2.locator("summary .chip").first()).toHaveText("Chosen by you");
    await c2.locator("summary").click();
    await expect(c2.getByTestId("decision-standing")).toContainText(/^You chose this on \d+ \w+; /);
  });
});

test("log: has decisions / has approvals filter the list; an opened entry shows done, next, tables and commit", async ({ page }) => {
  await page.goto("/log");
  const count = page.getByTestId("log-count");
  const N = logEntries.length;
  const show = page.getByTestId("log-browse").getByLabel("Show", { exact: true });
  await show.selectOption("decisions");
  await expect(count).toHaveText(firstPageLine(logEntries.filter((e) => e.decisions.length > 0).length, N));
  await show.selectOption("approvals");
  await expect(count).toHaveText(firstPageLine(logEntries.filter((e) => e.approvals.length > 0).length, N));
  await expect(page).toHaveURL(/\/log\?has=approvals$/);
  await show.selectOption("");
  await expect(count).toHaveText(firstPageLine(N));

  await page.getByTestId("log-open-all").click();
  const first: Locator = page.locator("li[data-entry]").first();
  await expect(first.locator(".acc-body")).toContainText("What was done");
  await expect(first.locator(".acc-body")).toContainText("What's next");
});
