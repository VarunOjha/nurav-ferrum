// ip-testing §1.1: frontmatter parsing (ip-data-contract §3).
import { describe, expect, it } from "vitest";
import { datesToStrings, normalizeEol, parseFrontmatterBytes } from "@/lib/wiki/frontmatter";
import { codes, page } from "./helpers";

const P = "wiki/test/page.md";
const parse = (b: Buffer | string, requireFrontmatter = true) =>
  parseFrontmatterBytes(typeof b === "string" ? Buffer.from(b, "utf8") : b, { repoPath: P, requireFrontmatter });

const VALID = page(["id: ip-x", "type: operations", 'title: "T"', "status: draft", "updated: 2026-10-08"], "# Body\n\ntext\n");

describe("splitter", () => {
  it("valid page -> fm + body, no findings", () => {
    const r = parse(VALID);
    expect(r.findings).toEqual([]);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.rawFm).toEqual({ id: "ip-x", type: "operations", title: "T", status: "draft", updated: "2026-10-08" });
    expect(r.body).toBe("# Body\n\ntext\n");
    expect(r.bodyStartLine).toBe(8);
  });

  it("CRLF input parses the same as LF", () => {
    const crlf = Buffer.from(VALID.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    const a = parse(VALID);
    const b = parse(crlf);
    expect(b.findings).toEqual([]);
    expect(b.rawFm).toEqual(a.rawFm);
    expect(b.body).toBe(a.body);
  });

  it("lone CR is normalised before fence detection", () => {
    const r = parse("---\rid: ip-x\rstatus: draft\r---\ra\rb\n");
    expect(r.findings).toEqual([]);
    expect(r.rawFm).toEqual({ id: "ip-x", status: "draft" });
    expect(r.body).toBe("a\nb\n");
  });

  it("no opening fence -> FM-MISSING", () => {
    const r = parse("# Just text\nstatus: draft\n");
    expect(codes(r.findings)).toEqual(["FM-MISSING"]);
    expect(r.hasFrontmatter).toBe(false);
    expect(r.rawFm).toBeNull();
    expect(r.body).toBe("# Just text\nstatus: draft\n");
  });

  it("opening fence not at byte 0 -> FM-MISSING", () => {
    expect(codes(parse("\n---\nid: x\n---\n").findings)).toEqual(["FM-MISSING"]);
  });

  it("no closing fence -> FM-MISSING", () => {
    const r = parse("---\nid: x\nno close\n");
    expect(codes(r.findings)).toEqual(["FM-MISSING"]);
    expect(r.findings[0].message).toMatch(/closing/);
    expect(r.rawFm).toBeNull();
  });

  it("BOM -> FILE-ENCODING, and the page still parses", () => {
    const r = parse(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), VALID]));
    expect(codes(r.findings)).toEqual(["FILE-ENCODING"]);
    expect(r.findings[0].message).toMatch(/BOM/);
    expect((r.rawFm as { id: string }).id).toBe("ip-x");
  });

  it("final-newline rule: zero, one and two trailing \\n", () => {
    const text = VALID.toString("utf8");
    expect(codes(parse(text.replace(/\n$/, "")).findings)).toEqual(["FILE-ENCODING"]);
    expect(parse(text).findings).toEqual([]);
    expect(codes(parse(text + "\n").findings)).toEqual(["FILE-ENCODING"]);
    // CRLF final newline counts as one \n
    expect(parse(text.replace(/\n/g, "\r\n")).findings).toEqual([]);
  });

  it("empty frontmatter block parses to {}", () => {
    const r = parse("---\n---\nbody\n");
    expect(r.findings).toEqual([]);
    expect(r.rawFm).toEqual({});
  });

  it("raw files (requireFrontmatter false) get no findings", () => {
    expect(parse("# raw\n\n", false).findings).toEqual([]);
    expect(parse(Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x0a]), false).findings).toEqual([]);
    expect(parse("no newline", false).findings).toEqual([]);
  });
});

describe("YAML subset (SCHEMA §5)", () => {
  it("anchors and aliases -> FM-YAML-SUBSET", () => {
    const r = parse(page(["a: &x 1", "b: *x"]));
    expect(codes(r.findings)).toEqual(["FM-YAML-SUBSET", "FM-YAML-SUBSET"]);
    expect(r.findings.map((f) => f.message).join(" ")).toMatch(/anchor &x.*alias \*x/);
  });

  it("explicit tags -> FM-YAML-SUBSET", () => {
    const r = parse(page(["a: !!str 5"]));
    expect(codes(r.findings)).toEqual(["FM-YAML-SUBSET"]);
    expect(r.findings[0].line).toBe(2);
  });

  it("multi-document stream -> FM-YAML-SUBSET (and no frontmatter object)", () => {
    const r = parse(page(["a: 1", "...", "--- ", "b: 2"]));
    expect(codes(r.findings)).toEqual(["FM-MISSING", "FM-YAML-SUBSET"]);
    expect(r.rawFm).toBeNull();
  });

  it("duplicate keys are rejected", () => {
    const r = parse(page(["a: 1", "a: 2"]));
    expect(codes(r.findings)).toEqual(["FM-MISSING"]);
    expect(r.findings[0].message).toMatch(/DUPLICATE_KEY/);
    expect(r.rawFm).toBeNull();
  });

  it("unquoted `: ` in a string is a YAML error, not a silent mis-parse", () => {
    const r = parse(page(["title: Foo: bar"]));
    expect(codes(r.findings)).toEqual(["FM-MISSING"]);
    expect(r.findings[0].message).toMatch(/YAML error/);
    expect(r.rawFm).toBeNull();
  });

  it("dates stay strings: 2026-10-08 -> \"2026-10-08\" (yaml 2.9.1, YAML 1.2 core schema)", () => {
    const r = parse(page(["updated: 2026-10-08", "date: 2026-01-31", "list: [2026-10-08]"]));
    expect(r.findings).toEqual([]);
    const fm = r.rawFm as Record<string, unknown>;
    expect(fm.updated).toBe("2026-10-08");
    expect(typeof fm.updated).toBe("string");
    expect(fm.date).toBe("2026-01-31");
    expect(fm.list).toEqual(["2026-10-08"]);
  });

  it("datesToStrings converts a Date back to YYYY-MM-DD (UTC), recursively", () => {
    const d = new Date(Date.UTC(2026, 9, 8));
    expect(datesToStrings({ a: d, b: [d], c: { d } })).toEqual({
      a: "2026-10-08",
      b: ["2026-10-08"],
      c: { d: "2026-10-08" },
    });
  });

  it("booleans and integers keep their types", () => {
    const fm = parse(page(["approvable: true", "order: 3"])).rawFm as Record<string, unknown>;
    expect(fm.approvable).toBe(true);
    expect(fm.order).toBe(3);
  });
});

describe("volatile keys (SCHEMA §5, §10.2)", () => {
  it("block scalars for status/updated -> FM-VOLATILE", () => {
    expect(codes(parse(page(["status: |", "  draft"])).findings)).toEqual(["FM-VOLATILE"]);
    expect(codes(parse(page(["updated: >-", "  2026-10-08"])).findings)).toEqual(["FM-VOLATILE"]);
  });

  it("a multi-line plain scalar -> FM-VOLATILE", () => {
    const r = parse(page(["last_verified_commit: abc1234", "  def5678"]));
    expect(codes(r.findings)).toEqual(["FM-VOLATILE"]);
    expect(r.findings[0].line).toBe(2);
  });

  it("a mapping or list value -> FM-VOLATILE", () => {
    expect(codes(parse(page(["status:", "  a: 1"])).findings)).toEqual(["FM-VOLATILE"]);
    expect(codes(parse(page(["status: [a]"])).findings)).toEqual(["FM-VOLATILE"]);
  });

  it("single-line plain, double- and single-quoted values are fine; nested status is not volatile", () => {
    expect(parse(page(["status: draft", 'updated: "2026-10-08"', "last_verified_commit: 'abc1234'"])).findings).toEqual([]);
    expect(parse(page(["sub:", "  status: |", "    nested"])).findings).toEqual([]);
  });
});

describe("normalizeEol (SCHEMA §10.2 N)", () => {
  it("CRLF -> LF, lone CR -> LF, nothing else", () => {
    const out = normalizeEol(Buffer.from("a\r\nb\rc\n\r\r\nd", "latin1")).toString("latin1");
    expect(out).toBe("a\nb\nc\n\n\nd");
  });
});
