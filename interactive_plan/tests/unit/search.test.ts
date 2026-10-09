// ip-testing §1.6 (search part): ranking order id > title > alias/tag > heading > body, case-insensitive,
// snippets, type filter, suggestions. Plus the IP-6 view helpers: routes (/wiki params, /go targets,
// close matches), markdown link rewriting, the wiki tree, grouped backlinks and the log view.
import { describe, expect, it } from "vitest";
import { backlinkGroups, BODY_LINK } from "@/lib/wiki/backlinks";
import type { LogEntry } from "@/lib/wiki/log";
import { filterLog, groupByDate, sessionsOf } from "@/lib/wiki/logView";
import { rewriteHref } from "@/lib/wiki/mdlinks";
import { closeMatches, editDistance, goTarget, pageHref, resolveWikiParam, wikiHref } from "@/lib/wiki/routes";
import { buildSearchIndex, clearSearchCache, makeSnippet, search, suggest, suggestionList, typeCounts, type SearchDoc } from "@/lib/wiki/search";
import { ancestorDirs, buildTree } from "@/lib/wiki/tree";
import { approvalLabel, toneOf } from "@/lib/ui/tone";
import { loadMini } from "./helpers";

function doc(over: Partial<SearchDoc> & { id: string }): SearchDoc {
  const d = {
    path: over.id + ".md",
    kind: "wiki" as const,
    title: "Untitled",
    type: "overview",
    status: "draft",
    aliases: [] as string[],
    tags: [] as string[],
    headings: [] as string[],
    body: "",
    ...over,
  };
  return {
    ...d,
    lc: {
      id: d.id.toLowerCase(),
      title: d.title.toLowerCase(),
      aliases: d.aliases.map((x) => x.toLowerCase()),
      tags: d.tags.map((x) => x.toLowerCase()),
      headings: d.headings.map((x) => x.toLowerCase()),
      body: d.body.toLowerCase(),
    },
  };
}

describe("search ranking (id > title > alias/tag > heading > body)", () => {
  const docs = [
    doc({ id: "ov-body", body: "We talk about Webview here and webview there." }),
    doc({ id: "ov-heading", headings: ["WebView lifecycle"] }),
    doc({ id: "ov-tag", tags: ["webviews"] }),
    doc({ id: "ov-alias", aliases: ["The WebView"] }),
    doc({ id: "ov-title", title: "WebView manager" }),
    doc({ id: "webview", title: "Exact id page" }),
    doc({ id: "ov-none", body: "nothing relevant" }),
  ];

  it("orders tiers exactly", () => {
    expect(search(docs, "webview").map((h) => [h.doc.id, h.field])).toEqual([
      ["webview", "id"],
      ["ov-title", "title"],
      ["ov-alias", "alias"],
      ["ov-tag", "tag"],
      ["ov-heading", "heading"],
      ["ov-body", "body"],
    ]);
  });

  it("is case-insensitive", () => {
    expect(search(docs, "WEBVIEW").map((h) => h.doc.id)).toEqual(search(docs, "webview").map((h) => h.doc.id));
  });

  it("ranks an exact title above a title prefix above a title substring, and more body hits higher", () => {
    const d = [
      doc({ id: "a", title: "the hash module" }),
      doc({ id: "b", title: "hash module" }),
      doc({ id: "c", title: "hash" }),
      doc({ id: "d", body: "hash" }),
      doc({ id: "e", body: "hash hash hash" }),
    ];
    expect(search(d, "hash").map((h) => h.doc.id)).toEqual(["c", "b", "a", "e", "d"]);
  });

  it("matches multi-word queries as a phrase, else needs every word in the body", () => {
    const d = [doc({ id: "a", body: "alpha beta gamma" }), doc({ id: "b", body: "gamma then alpha" }), doc({ id: "c", body: "alpha only" })];
    expect(search(d, "alpha beta").map((h) => h.doc.id)).toEqual(["a"]);
    expect(search(d, "gamma alpha").map((h) => h.doc.id).sort()).toEqual(["a", "b"]);
  });

  it("filters by type, with `raw` selecting raw files", () => {
    const d = [doc({ id: "a", body: "x", type: "risk" }), doc({ id: "b", body: "x", type: null, kind: "raw" })];
    expect(search(d, "x", { type: "risk" }).map((h) => h.doc.id)).toEqual(["a"]);
    expect(search(d, "x", { type: "raw" }).map((h) => h.doc.id)).toEqual(["b"]);
    expect(typeCounts(search(d, "x"))).toEqual([
      ["raw", 1],
      ["risk", 1],
    ]);
  });

  it("returns nothing for an empty query and honours the limit", () => {
    expect(search(docs, "   ")).toEqual([]);
    expect(search(docs, "webview", { limit: 2 })).toHaveLength(2);
  });

  it("builds snippets around the first match with ellipses", () => {
    const text = "a".repeat(100) + "NEEDLE" + "b".repeat(100);
    const s = makeSnippet(text, text.toLowerCase(), "needle")!;
    expect(s.match).toBe("NEEDLE");
    expect(s.before.startsWith("…")).toBe(true);
    expect(s.after.endsWith("…")).toBe(true);
    expect(makeSnippet("abc", "abc", "z")).toBeNull();
  });

  it("indexes the fixture wiki and finds a body word; memoised until a file changes", async () => {
    clearSearchCache();
    const idx = await loadMini();
    const docsA = buildSearchIndex(idx);
    expect(buildSearchIndex(idx)).toBe(docsA);
    const hits = search(docsA, "one shell");
    expect(hits.map((h) => h.doc.id)).toContain("adr-0901");
    const changed = { pages: idx.pages.map((p, i) => (i === 0 ? { ...p, mtimeMs: p.mtimeMs + 1 } : p)) };
    expect(buildSearchIndex(changed)).not.toBe(docsA);
  });

  it("suggests ids by prefix, then substring, then title", () => {
    const list = [
      { id: "adr-0001", title: "Tauri" },
      { id: "comp-adr-x", title: "y" },
      { id: "ov-x", title: "About adr" },
      { id: "adr", title: "exact" },
    ];
    expect(suggest(list, "adr").map((s) => s.id)).toEqual(["adr", "adr-0001", "comp-adr-x", "ov-x"]);
    expect(suggest(list, "")).toEqual([]);
    expect(suggest(list, "adr", 2)).toHaveLength(2);
  });

  it("suggestionList lists pages with an id, sorted", async () => {
    const list = suggestionList(await loadMini());
    expect(list.map((s) => s.id)).toEqual([...list.map((s) => s.id)].sort());
    expect(list.find((s) => s.id === "adr-0901")?.title).toBe("Fixture decision: one shell");
  });
});

describe("routes", () => {
  it("wikiHref encodes segments, drops a directory slash and keeps anchors", () => {
    expect(wikiHref("phases/phase-p1.md")).toBe("/wiki/phases/phase-p1.md");
    expect(wikiHref("raw/evidence/")).toBe("/wiki/raw/evidence");
    expect(wikiHref("a b/c#d.md", "sec")).toBe("/wiki/a%20b/c%23d.md#sec");
    expect(wikiHref("")).toBe("/wiki");
  });

  it("resolveWikiParam accepts only known files and directories", () => {
    const files = new Set(["raw/", "raw/01-scoping-decisions.md", "a b.md", "x/", "x/0.md"]);
    expect(resolveWikiParam(undefined, files)).toEqual({ kind: "root" });
    expect(resolveWikiParam([], files)).toEqual({ kind: "root" });
    // Regression (IP-6): segments containing the digit 0 must resolve.
    expect(resolveWikiParam(["raw", "01-scoping-decisions.md"], files)).toEqual({ kind: "file", path: "raw/01-scoping-decisions.md" });
    expect(resolveWikiParam(["x", "0.md"], files)).toEqual({ kind: "file", path: "x/0.md" });
    expect(resolveWikiParam(["raw"], files)).toEqual({ kind: "dir", path: "raw/" });
    expect(resolveWikiParam(["a%20b.md"], files)).toEqual({ kind: "file", path: "a b.md" });
    expect(resolveWikiParam(["a b.md"], files)).toEqual({ kind: "file", path: "a b.md" });
  });

  it.each([[[".."]], [["raw", ".."]], [["."]], [[""]], [["..%2FCLAUDE.md"]], [["a%5Cb"]], [["a%00"]], [["%E0%A4%A"]], [["missing.md"]]])(
    "resolveWikiParam rejects %j",
    (segs) => {
      expect(resolveWikiParam(segs as string[], new Set(["raw/", "CLAUDE.md", "a/b", "missing/"]))).toBeNull();
    },
  );

  it("goTarget resolves page ids, Q-NNN anchors and task ids; null otherwise", async () => {
    const idx = await loadMini();
    expect(goTarget(idx, "adr-0901")).toBe("/decisions/adr-0901");
    expect(goTarget(idx, "ov-fixture-project")).toBe("/wiki/overview/ov-fixture-project.md");
    expect(goTarget(idx, "status-live")).toBe("/");
    expect(goTarget(idx, "Q-901")).toMatch(/^\/wiki\/overview\/ov-open-questions\.md#q-901-/);
    expect(goTarget(idx, "Q-999")).toBeNull();
    expect(goTarget(idx, "p0.1")).toBe("/phases/phase-p0-fixture-plan");
    expect(goTarget(idx, "p8.99")).toBeNull();
    expect(goTarget(idx, "nope")).toBeNull();
  });

  it("pageHref uses a typed route once it exists (phase since IP-7, decision since IP-8) and the wiki browser otherwise", async () => {
    const idx = await loadMini();
    expect(pageHref(idx.byId.get("phase-p0-fixture-plan")!)).toBe("/phases/phase-p0-fixture-plan");
    expect(pageHref(idx.byId.get("phase-p0-fixture-plan")!, false)).toBe("/wiki/phases/phase-p0-fixture-plan.md");
    // decision views exist since IP-8
    expect(pageHref(idx.byId.get("adr-0901")!)).toBe("/decisions/adr-0901");
    expect(pageHref(idx.byId.get("adr-0901")!, false)).toBe("/wiki/decisions/adr-0901-fixture-decision.md");
    expect(pageHref(idx.byId.get("risk-r91")!)).toBe("/wiki/risks/risk-r91-fixture-risk.md");
    expect(goTarget(idx, "phase-p1-fixture-build")).toBe("/phases/phase-p1-fixture-build");
  });

  it("editDistance and closeMatches", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "abc")).toBe(0);
    const ids = ["adr-0001", "adr-0002", "ip-spec", "risk-r01", "comp-core"];
    expect(closeMatches(ids, "adr-0003")).toEqual(["adr-0001", "adr-0002"]);
    expect(closeMatches(ids, "ip-spek")).toEqual(["ip-spec"]);
    expect(closeMatches(ids, "adr-0001-old-name.md")[0]).toBe("adr-0001");
    expect(closeMatches(ids, "zzzzzzzzzz")).toEqual([]);
    expect(closeMatches(ids, "")).toEqual([]);
  });
});

describe("rewriteHref (markdown links)", () => {
  const exists = (p: string) => ["a/b.md", "c.md", "raw/"].includes(p);
  it.each([
    ["#x", { kind: "anchor", href: "#x" }],
    ["b.md#s", { kind: "internal", href: "/wiki/a/b.md#s", target: "a/b.md" }],
    ["../c.md", { kind: "internal", href: "/wiki/c.md", target: "c.md" }],
    ["../raw/", { kind: "internal", href: "/wiki/raw", target: "raw/" }],
    ["/c.md", { kind: "internal", href: "/wiki/c.md", target: "c.md" }],
    ["../gone.md", { kind: "missing", href: "/wiki/gone.md", target: "gone.md", title: "missing (REF-DANGLING)" }],
    ["https://x.org", { kind: "external", href: "https://x.org" }],
    ["http://x.org", { kind: "external", href: "http://x.org" }],
    ["mailto:a@b.c", { kind: "external", href: "mailto:a@b.c" }],
    ["//x.org/y", { kind: "external", href: "https://x.org/y" }],
  ])("%s", (href, expected) => {
    expect(rewriteHref("a/page.md", href, exists)).toMatchObject(expected);
  });

  it("refuses unsafe schemes and empty links", () => {
    expect(rewriteHref("a/p.md", "javascript:alert(1)", exists)).toMatchObject({ kind: "unsafe", href: null });
    expect(rewriteHref("a/p.md", "data:text/html,x", exists)).toMatchObject({ kind: "unsafe", href: null });
    expect(rewriteHref("a/p.md", " ", exists)).toMatchObject({ kind: "unsafe", href: null });
  });

  it("renders repo files outside wiki/ as text, STATUS.md as the dashboard", () => {
    expect(rewriteHref("a/p.md", "../../CLAUDE.md", exists)).toMatchObject({ kind: "outside", href: null, target: "CLAUDE.md" });
    expect(rewriteHref("p.md", "../STATUS.md", exists)).toMatchObject({ kind: "internal", href: "/" });
  });
});

describe("wiki tree", () => {
  it("builds directories first, counts files, and keeps every file", async () => {
    const idx = await loadMini();
    const t = buildTree(idx);
    const names = t.children.map((c) => c.name + (c.dir ? "/" : ""));
    const firstFile = names.findIndex((n) => !n.endsWith("/"));
    expect(names.slice(firstFile).every((n) => !n.endsWith("/"))).toBe(true);
    expect(t.count).toBe([...idx.files].filter((f) => !f.endsWith("/")).length);
    const raw = t.children.find((c) => c.path === "raw/")!;
    expect(raw.children.map((c) => c.path)).toContain("raw/research/");
  });

  it("filters by type and status, keeping only non-empty directories", async () => {
    const idx = await loadMini();
    const t = buildTree(idx, { type: "decision" });
    expect(t.children.map((c) => c.path)).toEqual(["decisions/"]);
    expect(t.children[0].children[0].page?.id).toBe("adr-0901");
    expect(buildTree(idx, { type: "decision", status: "accepted" }).children).toEqual([]);
  });

  it("ancestorDirs", () => {
    expect(ancestorDirs("a/b/c.md")).toEqual(["a/", "a/b/"]);
    expect(ancestorDirs("a/b/")).toEqual(["a/", "a/b/"]);
    expect(ancestorDirs("x.md")).toEqual([]);
  });
});

describe("backlinks grouped by field", () => {
  it("groups frontmatter references and body links", async () => {
    const idx = await loadMini();
    const groups = backlinkGroups(idx, "comp-fixture-shell");
    const fields = groups.map((g) => g.field);
    expect(fields).toContain("related");
    expect(groups.find((g) => g.field === "related")!.ids).toContain("adr-0901");
    // body links sort last
    if (fields.includes(BODY_LINK)) expect(fields[fields.length - 1]).toBe(BODY_LINK);
    expect(groups.flatMap((g) => g.ids)).not.toContain("comp-fixture-shell");
  });

  it("returns nothing for an id nobody references", async () => {
    expect(backlinkGroups(await loadMini(), "nobody-refers-here")).toEqual([]);
  });
});

describe("log view", () => {
  const e = (date: string, op: LogEntry["op"], session: string, pages: string[] = [], stales: string[] = []): LogEntry => ({
    date,
    op,
    title: `${date} ${op}`,
    session,
    pages,
    sources: [],
    stales,
    line: 0,
    raw: "",
  });
  const log = [e("2026-10-01", "plan", "s01", ["a"]), e("2026-10-01", "code", "s01", [], ["b"]), e("2026-10-02", "code", "s02", ["b"]), e("2026-10-03", "lint", "s02")];

  it("is newest first by default and chronological on request", () => {
    expect(filterLog(log).map((x) => x.title)).toEqual(["2026-10-03 lint", "2026-10-02 code", "2026-10-01 code", "2026-10-01 plan"]);
    expect(filterLog(log, { order: "oldest" }).map((x) => x.op)).toEqual(["plan", "code", "code", "lint"]);
  });

  it("filters by op, session and page (pages or stales)", () => {
    expect(filterLog(log, { op: "code" })).toHaveLength(2);
    expect(filterLog(log, { session: "s02" })).toHaveLength(2);
    expect(filterLog(log, { page: "b" }).map((x) => x.date)).toEqual(["2026-10-02", "2026-10-01"]);
  });

  it("last 5 takes the file tail before ordering", () => {
    const many = Array.from({ length: 8 }, (_, i) => e(`2026-10-0${i + 1}`, "code", "s01"));
    expect(filterLog(many, { last5: true }).map((x) => x.date)).toEqual(["2026-10-08", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-04"]);
  });

  it("groups by date and lists sessions in order", () => {
    expect(groupByDate(filterLog(log, { order: "oldest" })).map((d) => [d.date, d.entries.length])).toEqual([
      ["2026-10-01", 2],
      ["2026-10-02", 1],
      ["2026-10-03", 1],
    ]);
    expect(sessionsOf(log)).toEqual(["s01", "s02"]);
  });
});

describe("status tones", () => {
  it("maps the ip-routes-and-views §2 families", () => {
    expect(["planned", "draft", "proposed", "open"].map(toneOf)).toEqual(["neutral", "neutral", "neutral", "neutral"]);
    expect(["ready", "in-progress", "review", "mitigating"].map(toneOf)).toEqual(["blue", "blue", "blue", "blue"]);
    expect(["gate-review", "blocked", "changes-requested", "STALE"].map(toneOf)).toEqual(["amber", "amber", "amber", "amber"]);
    expect(["done", "accepted", "APPROVED", "resolved", "verified"].map(toneOf)).toEqual(["green", "green", "green", "green", "green"]);
    expect(["rejected", "realized", "INVALID"].map(toneOf)).toEqual(["red", "red", "red"]);
    expect(toneOf("APPROVED_VOLATILE_DRIFT")).toBe("purple");
    expect(toneOf(null)).toBe("neutral");
    expect(toneOf("whatever")).toBe("neutral");
  });
  it("labels APPROVED_VOLATILE_DRIFT as bookkeeping changed", () => {
    expect(approvalLabel("APPROVED_VOLATILE_DRIFT")).toBe("approved – bookkeeping changed");
    expect(approvalLabel("CHANGES_REQUESTED")).toBe("changes requested");
  });
});
