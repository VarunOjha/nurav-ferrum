// Reference resolution (owner feedback 2026-10-09: every id must open its explainer).
// - tokenize(): links `[words](ref:id)` and bare id-shaped words become references; nothing is lost.
// - On the REAL portal text: every string the checker searches (all keys except pipeline.json
//   skip_keys) renders through TokensView with every id-shaped word inside a working <Ref> button
//   whose id resolves in refs.json, and the rendered text equals the source text.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TokensView } from "@/components/portal/RichText";
import { buildRefData, compilePatterns, friendlyId, popupKind, resolveRef, tokenize, type TextToken } from "@/lib/portal/refs";
import { RefsFile } from "@/lib/portal/schemas.gen";
import { REPO_ROOT } from "./helpers";

const PORTAL = path.join(REPO_ROOT, "plan", "portal");
const read = (rel: string) => JSON.parse(readFileSync(path.join(PORTAL, rel), "utf8").replace(/^﻿/, ""));
const pipeline = read("pipeline.json") as { skip_keys: string[]; id_patterns: { kind: string; regex: string }[] };
const PATTERNS = compilePatterns(pipeline.id_patterns);
const refData = buildRefData(RefsFile.parse(read("refs.json")));

const textOf = (tokens: TextToken[]) => tokens.map((t) => (t.type === "text" ? t.text : t.linked ? `[${t.label}](ref:${t.id})` : t.label)).join("");

describe("tokenize", () => {
  it("finds links and bare ids, keeps every character", () => {
    const s = "See [the portal rule](ref:adr-0023) and Q-221; P1 starts after p0.18 (commit adc3651).";
    const t = tokenize(s, PATTERNS);
    expect(t.filter((x) => x.type === "ref").map((x) => (x.type === "ref" ? [x.id, x.label, x.linked] : null))).toEqual([
      ["adr-0023", "the portal rule", true],
      ["Q-221", "Q-221", false],
      ["P1", "P1", false],
      ["p0.18", "p0.18", false],
      ["adc3651", "adc3651", false],
    ]);
    expect(textOf(t)).toBe(s);
  });

  it("the longest match wins an overlap, and plain words stay text", () => {
    const t = tokenize("phase-p1-foundation is P1", PATTERNS);
    expect(t.filter((x) => x.type === "ref").map((x) => (x.type === "ref" ? x.id : ""))).toEqual(["phase-p1-foundation", "P1"]);
    expect(tokenize("No ids here, only words like coffee and 1234567.", PATTERNS)).toEqual([
      { type: "text", text: "No ids here, only words like coffee and 1234567." },
    ]);
  });

  it("an empty text gives no tokens; a text that is only an id gives one reference", () => {
    expect(tokenize("", PATTERNS)).toEqual([]);
    expect(tokenize("adr-0001", PATTERNS)).toEqual([{ type: "ref", id: "adr-0001", label: "adr-0001", linked: false }]);
  });
});

describe("resolveRef", () => {
  it("resolves ids and aliases, and returns null for an unknown id", () => {
    const p0 = resolveRef(refData, "P0");
    expect(p0?.id).toBe("phase-p0-planning");
    expect(resolveRef(refData, "phase-p0-planning")).toBe(p0);
    expect(resolveRef(refData, "no-such-id-0000")).toBeNull();
    expect(resolveRef(refData, "constructor")).toBeNull();
    expect(resolveRef(buildRefData(null), "P0")).toBeNull();
  });
});

/** Every string the checker searches, with its JSON pointer. */
function strings(node: unknown, ptr: string, skip: Set<string>, out: [string, string][]): void {
  if (typeof node === "string") out.push([ptr, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${ptr}/${i}`, skip, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) if (!skip.has(k)) strings(v, `${ptr}/${k}`, skip, out);
  }
}

const FILES = [
  // pipeline.json is configuration, not portal text (the checker does not search it either).
  ...readdirSync(PORTAL).filter((f) => f.endsWith(".json") && f !== "pipeline.json"),
  ...readdirSync(path.join(PORTAL, "phases"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => `phases/${f}`),
];

const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

describe("every id in the real portal text renders as a working Ref", () => {
  const skip = new Set(pipeline.skip_keys);
  for (const rel of FILES) {
    it(rel, () => {
      const list: [string, string][] = [];
      strings(read(rel), "", skip, list);
      const unresolved: string[] = [];
      const looseIds: string[] = [];
      const lost: string[] = [];
      let refs = 0;
      for (const [ptr, s] of list) {
        const tokens = tokenize(s, PATTERNS);
        // Nothing id-shaped may stay plain text: re-scan the text tokens with every pattern.
        for (const t of tokens) {
          if (t.type === "text") {
            for (const rx of PATTERNS) for (const m of t.text.matchAll(new RegExp(rx.source, "g"))) looseIds.push(`${ptr}: ${m[0]}`);
          } else if (!resolveRef(refData, t.id)) unresolved.push(`${ptr}: ${t.id}`);
        }
        const html = renderToStaticMarkup(<TokensView tokens={tokens} />);
        const buttons = [...html.matchAll(/<button type="button" class="ref ref-(?:inline|chip)" data-ref-id="([^"]+)" aria-haspopup="dialog"/g)].map((m) => m[1]);
        const expected = tokens.filter((t) => t.type === "ref").map((t) => (t.type === "ref" ? t.id.replace(/&/g, "&amp;") : ""));
        expect(buttons, ptr).toEqual(expected);
        refs += buttons.length;
        const shown = tokens.map((t) => (t.type === "text" ? t.text : t.label)).join("");
        if (decode(html) !== shown) lost.push(ptr);
      }
      expect(unresolved).toEqual([]);
      expect(looseIds).toEqual([]);
      expect(lost).toEqual([]);
      expect(list.length + refs).toBeGreaterThan(0);
    });
  }
});

describe("TokensView keeps punctuation on the chip's line", () => {
  it("wraps '(' + chip + ').' in one no-wrap span and loses no text", () => {
    const tokens = tokenize("the plan (P0). Next (see adr-0023)", PATTERNS);
    const html = renderToStaticMarkup(<TokensView tokens={tokens} />);
    expect(html).toContain('<span class="ref-glue">(<button');
    expect(html).toMatch(/>P0<\/button>\)\.<\/span>/);
    expect(html.replace(/<[^>]+>/g, "")).toBe("the plan (P0). Next (see adr-0023)");
  });

  it("does not glue words or linked text", () => {
    const html = renderToStaticMarkup(<TokensView tokens={tokenize("phase P1 starts; [the rule](ref:adr-0023).", PATTERNS)} />);
    expect(html).not.toContain("ref-glue");
  });
});

describe("short names instead of internal slugs (review 2026-10-09)", () => {
  it("friendlyId gives the name the owner knows, or null", () => {
    expect(friendlyId("adr-0019")).toBe("Decision 19");
    expect(friendlyId("risk-r04")).toBe("Risk 4");
    expect(friendlyId("rq-01")).toBe("Research question 1");
    expect(friendlyId("hyp-03")).toBe("Hypothesis 3");
    expect(friendlyId("phase-p0-planning")).toBe("P0");
    expect(friendlyId("P1")).toBe("P1");
    expect(friendlyId("p1.3")).toBe("Task p1.3");
    expect(friendlyId("Q-221")).toBe("Q-221");
    expect(friendlyId("ef5dcc5", "commit")).toBe("ef5dcc5");
    for (const id of ["comp-resource-manager", "layer-engine", "metric-objective-j", "ov-research-plan", "wl-news", "application"]) {
      expect(friendlyId(id), id).toBeNull();
    }
  });

  it("popupKind never shows a slug and does not repeat the title", () => {
    expect(popupKind({ id: "adr-0007", kind: "decision", title: "Decision 7: One window" })).toEqual({ head: "Decision 7", extra: null });
    expect(popupKind({ id: "comp-core", kind: "component", title: "Core library" })).toEqual({ head: "Part of the system", extra: null });
    expect(popupKind({ id: "phase-p1-foundation", kind: "phase", title: "P1 Foundation" })).toEqual({ head: "Phase", extra: null });
    expect(popupKind({ id: "Q-221", kind: "question", title: "Rewrite old commits?" })).toEqual({ head: "Question for you", extra: "Q-221" });
    expect(popupKind({ id: "ov-research-plan", kind: "page", title: "Research plan" })).toEqual({ head: "Plan note", extra: null });
  });

  it("on the real refs.json, no popup head shows a slug-shaped id", () => {
    const data = RefsFile.parse(JSON.parse(readFileSync(path.join(PORTAL, "refs.json"), "utf8")));
    for (const r of data.refs) {
      const { head, extra } = popupKind(r);
      expect(`${head} ${extra ?? ""}`, r.id).not.toMatch(/\b(?:comp|layer|metric|wl|exp|cfg|ov|ops|qual|ip|adr|risk|rq|hyp)-[a-z0-9]/);
    }
  });
});
