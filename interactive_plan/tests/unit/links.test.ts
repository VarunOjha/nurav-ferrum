// ip-testing §1.6 (links part): relative-link resolution, anchors via the rehype-slug algorithm
// (github-slugger), links inside fenced code ignored; plus headings, tags and frontmatter refs.
import { describe, expect, it } from "vitest";
import {
  blankFencedCode,
  checkLinks,
  extractHeadings,
  extractLinks,
  extractUnverifiedTags,
  frontmatterRefs,
  headingPlainText,
  resolveHref,
  stripInlineCode,
  type LinkTargetInfo,
} from "@/lib/wiki/links";
import { codes } from "./helpers";

describe("resolveHref", () => {
  it("resolves ../ relative links with an anchor", () => {
    expect(resolveHref("phases/phase-p1-x.md", "../decisions/adr-0007-child-webviews.md#decision")).toEqual({
      resolvedPath: "decisions/adr-0007-child-webviews.md",
      anchor: "decision",
    });
  });
  it("resolves same-directory and nested links", () => {
    expect(resolveHref("research/questions/rq-01.md", "../hypotheses/hyp-01.md").resolvedPath).toBe(
      "research/hypotheses/hyp-01.md",
    );
    expect(resolveHref("operations/ops-x.md", "handoffs/handoff-2026-10-08-s01.md").resolvedPath).toBe(
      "operations/handoffs/handoff-2026-10-08-s01.md",
    );
    expect(resolveHref("SCHEMA.md", "interactive-plan/ip-spec.md").resolvedPath).toBe("interactive-plan/ip-spec.md");
  });
  it("links leaving the wiki keep a ../ prefix", () => {
    expect(resolveHref("SCHEMA.md", "../CLAUDE.md").resolvedPath).toBe("../CLAUDE.md");
    expect(resolveHref("architecture/components/comp-x.md", "../../../crates/x/src/lib.rs").resolvedPath).toBe(
      "../crates/x/src/lib.rs",
    );
  });
  it("anchor-only links point at the page itself", () => {
    expect(resolveHref("phases/p.md", "#exit-gate")).toEqual({ resolvedPath: "phases/p.md", anchor: "exit-gate" });
  });
  it("external links resolve to null", () => {
    for (const h of ["https://example.com/a.md", "http://x", "mailto:a@b.c"]) {
      expect(resolveHref("a.md", h)).toEqual({ resolvedPath: null, anchor: null });
    }
  });
  it("folder links keep the trailing slash; percent-encoding is decoded", () => {
    expect(resolveHref("index.md", "raw/evidence/phase-p0-planning/").resolvedPath).toBe("raw/evidence/phase-p0-planning/");
    expect(resolveHref("a/b.md", "c%20d.md#x%20y")).toEqual({ resolvedPath: "a/c d.md", anchor: "x y" });
  });
});

describe("extractLinks", () => {
  it("finds inline links, images and reference definitions with line numbers", () => {
    const body = "intro [a](x.md) and ![img](../img.png \"t\")\n\n[ref]: ../y.md#h\nlink [b](<z w.md>)\n";
    const links = extractLinks(body, "dir/page.md", 10);
    expect(links.map((l) => [l.href, l.resolvedPath, l.anchor, l.line])).toEqual([
      ["x.md", "dir/x.md", null, 10],
      ["../img.png", "img.png", null, 10],
      ["../y.md#h", "y.md", "h", 12],
      ["z w.md", "dir/z w.md", null, 13],
    ]);
  });
  it("ignores links inside fenced code (``` and ~~~, longer fences) and inline code", () => {
    const body = [
      "[keep](a.md)",
      "```text",
      "[no](b.md)",
      "```",
      "~~~~",
      "[no](c.md)",
      "```",
      "[still code](d.md)",
      "~~~~",
      "`[no](e.md)` and ``[no](f.md)`` but [yes](g.md)",
    ].join("\n");
    expect(extractLinks(body, "p.md").map((l) => l.href)).toEqual(["a.md", "g.md"]);
  });
  it("an unclosed fence hides the rest of the body", () => {
    expect(extractLinks("```\n[no](a.md)\n", "p.md")).toEqual([]);
  });
});

describe("headings and slugs (rehype-slug = github-slugger)", () => {
  it("slugs like GitHub: lowercase, punctuation dropped, spaces to -", () => {
    const hs = extractHeadings(
      [
        "# ADR-0007: Child WebViews",
        "## 5.1 Approved page edited by someone other than Claude",
        "### 3.1 Raw sources: `wiki/raw/` (IMMUTABLE)",
        "## 9.1 INGEST *(gist)*: a new raw source arrives",
        "## Verification / evidence",
        "## Q-006 May the plan app append `approval` entries to `wiki/log.md`?",
        "## See [the spec](ip-spec.md) now",
        "## Context",
        "## Context",
        "#NotAHeading",
        "####### seven",
      ].join("\n"),
    );
    expect(hs.map((h) => [h.depth, h.slug])).toEqual([
      [1, "adr-0007-child-webviews"],
      [2, "51-approved-page-edited-by-someone-other-than-claude"],
      [3, "31-raw-sources-wikiraw-immutable"],
      [2, "91-ingest-gist-a-new-raw-source-arrives"],
      [2, "verification--evidence"],
      [2, "q-006-may-the-plan-app-append-approval-entries-to-wikilogmd"],
      [2, "see-the-spec-now"],
      [2, "context"],
      [2, "context-1"],
    ]);
  });
  it("headings inside fenced code are ignored; closing #s are stripped; line numbers are file lines", () => {
    const hs = extractHeadings("```\n# not\n```\n## Real ##\n", 5);
    expect(hs).toEqual([{ depth: 2, text: "Real", slug: "real", line: 8 }]);
  });
  it("headingPlainText strips inline markdown", () => {
    expect(headingPlainText("**Bold** and _em_ and `snake_case` and [t](u) and ~~s~~ and \\*x\\*")).toBe(
      "Bold and em and snake_case and t and s and *x*",
    );
    expect(headingPlainText("keep last_verified_commit intraword")).toBe("keep last_verified_commit intraword");
  });
});

describe("checkLinks (REF-DANGLING)", () => {
  const info: LinkTargetInfo = {
    exists: (p) => ["decisions/adr-0007-x.md", "raw/evidence/p0/", "raw/a.txt"].includes(p),
    slugs: (p) => (p === "decisions/adr-0007-x.md" ? new Set(["decision", "context"]) : null),
  };
  const run = (body: string) => checkLinks(extractLinks(body, "phases/p.md"), "wiki/phases/p.md", info);
  it("existing file + existing anchor -> no finding", () => {
    expect(run("[a](../decisions/adr-0007-x.md#decision) [b](../raw/evidence/p0/) [c](../raw/a.txt#L1)")).toEqual([]);
  });
  it("missing file -> REF-DANGLING", () => {
    const f = run("x\n[a](../decisions/adr-0099.md)");
    expect(codes(f)).toEqual(["REF-DANGLING"]);
    expect(f[0].line).toBe(2);
    expect(f[0].message).toMatch(/missing file/);
  });
  it("missing anchor on a markdown target -> REF-DANGLING", () => {
    const f = run("[a](../decisions/adr-0007-x.md#nope)");
    expect(codes(f)).toEqual(["REF-DANGLING"]);
    expect(f[0].message).toMatch(/#nope/);
  });
  it("external links are not checked; links in fenced code are ignored", () => {
    expect(run("[a](https://nowhere.invalid/x.md)\n```\n[b](missing.md)\n```")).toEqual([]);
  });
});

describe("frontmatterRefs", () => {
  it("collects every ip-data-contract §4.2 field, connects[].to and STATUS fields", () => {
    const refs = frontmatterRefs({
      related: ["a", "b"],
      depends_on: ["phase-p0-x"],
      phase: "phase-p1-x",
      connects: [{ to: "comp-y" }, { label: "no to" }],
      blocked_on: ["Q-001", "adr-0001"],
      current_phase: "phase-p0-x",
      last_handoff: null,
      spike: "p1.1",
      title: "ignored",
    });
    expect(refs.map((r) => `${r.field}:${r.id}`).sort()).toEqual(
      [
        "related:a",
        "related:b",
        "depends_on:phase-p0-x",
        "phase:phase-p1-x",
        "connects.to:comp-y",
        "blocked_on:Q-001",
        "blocked_on:adr-0001",
        "current_phase:phase-p0-x",
      ].sort(),
    );
    expect(frontmatterRefs(null)).toEqual([]);
  });
});

describe("integrity tags", () => {
  it("extracts UNVERIFIED[phase] with file lines outside fenced code; well-formed tags in inline code count (IP-5)", () => {
    const body =
      "a UNVERIFIED[phase-p1-foundation] b\n```\nUNVERIFIED[phase-p2-x]\n```\n`UNVERIFIED[phase-p3-x]` UNVERIFIED[phase-p4-security]\n`UNVERIFIED[phase-pN-slug]` `UNVERIFIED`\n";
    expect(extractUnverifiedTags(body, 20)).toEqual([
      { phase: "phase-p1-foundation", line: 20 },
      { phase: "phase-p3-x", line: 24 },
      { phase: "phase-p4-security", line: 24 },
    ]);
  });
  it("blankFencedCode keeps line count; stripInlineCode keeps length", () => {
    const b = "a\n```\nx\n```\nb";
    expect(blankFencedCode(b).split("\n")).toEqual(["a", "", "", "", "b"]);
    const l = "x `code` y ``a ` b`` z `unclosed";
    expect(stripInlineCode(l)).toHaveLength(l.length);
    expect(stripInlineCode(l)).toBe("x        y           z `unclosed");
  });
});
