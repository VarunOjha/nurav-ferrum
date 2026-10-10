// The portal's zod schemas (lib/portal/schemas.gen.ts) agree with the JSON Schemas in
// plan/portal/schema/ (adr-0024):
// 1. the committed file is exactly what scripts/gen-portal-schemas.mjs generates now (no drift);
// 2. every real portal file passes;
// 3. for every keyword in the JSON Schemas, a minimal break of a real file is rejected by zod exactly
//    where JSON Schema rejects it (missing required key, unknown key, too long, pattern, enum, type,
//    minimum/maximum, minItems/maxItems, uniqueItems), and setting a nullable field to null passes;
// 4. PowerShell 7's Test-Json, used as an independent referee, gives the same verdict as zod on each.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMAS_BY_FILE } from "@/lib/portal/schemas.gen";
import { generate, OUT_FILE, SCHEMA_DIR, toZod } from "../../scripts/gen-portal-schemas.mjs";
import { REPO_ROOT } from "./helpers";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Schema = { [k: string]: unknown };

const PORTAL = path.join(REPO_ROOT, "plan", "portal");
const readJson = (p: string): Json => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as Json;
const COMMON = (readJson(path.join(SCHEMA_DIR, "common.schema.json")) as { $defs: Record<string, Schema> }).$defs;

/** Data files validated by each schema (pipeline.json "files"). */
function dataFiles(schemaFile: string): string[] {
  if (schemaFile === "phase.schema.json") {
    return readdirSync(path.join(PORTAL, "phases"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => `phases/${f}`);
  }
  return [schemaFile.replace(".schema.json", ".json")];
}

function deref(s: Schema): Schema {
  let cur = s;
  while (typeof cur.$ref === "string") cur = COMMON[cur.$ref.replace("#/$defs/", "")];
  return cur;
}

const types = (s: Schema): string[] => (Array.isArray(s.type) ? (s.type as string[]) : typeof s.type === "string" ? [s.type] : []);

interface Mutation {
  where: string;
  what: string;
  apply: (root: Json) => Json;
  valid: boolean;
}

const clone = (j: Json): Json => structuredClone(j);

/** Applies `fn` to the node at `ptr` (array of keys) in a copy of `root`. */
function at(root: Json, ptr: (string | number)[], fn: (parent: Json, key: string | number) => void): Json {
  const copy = clone(root);
  let node = copy as Record<string | number, Json>;
  for (const k of ptr.slice(0, -1)) node = node[k] as Record<string | number, Json>;
  fn(node as Json, ptr[ptr.length - 1]);
  return copy;
}
const setAt = (root: Json, ptr: (string | number)[], value: Json) =>
  at(root, ptr, (p, k) => {
    (p as Record<string | number, Json>)[k] = value;
  });

/** Walks a JSON Schema alongside a real document and lists keyword-by-keyword breaks. */
function mutations(schema: Schema, data: Json, ptr: (string | number)[], out: Mutation[]): void {
  const s = deref(schema);
  const where = "/" + ptr.join("/");
  const t = types(s);
  if (ptr.length > 0) {
    if (Array.isArray(s.enum)) out.push({ where, what: "enum", apply: (r) => setAt(r, ptr, "__not_in_enum__"), valid: false });
    if (typeof s.maxLength === "number" && typeof data === "string") {
      // Code points: an astral character counts as one in JSON Schema (two UTF-16 units).
      const exact = "a".repeat(s.maxLength - 1) + "😀";
      if (typeof s.pattern !== "string" || new RegExp(s.pattern as string).test(exact)) {
        out.push({ where, what: "maxLength (code points)", apply: (r) => setAt(r, ptr, exact), valid: true });
      }
      out.push({ where, what: "maxLength", apply: (r) => setAt(r, ptr, "a".repeat(s.maxLength as number) + "→ab"), valid: false });
    }
    if (typeof s.pattern === "string" && typeof data === "string") out.push({ where, what: "pattern", apply: (r) => setAt(r, ptr, "\n"), valid: false });
    if (t.includes("null") && data !== null) out.push({ where, what: "nullable", apply: (r) => setAt(r, ptr, null), valid: true });
    if (!t.includes("null") && t.length > 0) out.push({ where, what: "type (null)", apply: (r) => setAt(r, ptr, null), valid: false });
    if (t.includes("string")) out.push({ where, what: "type (number for string)", apply: (r) => setAt(r, ptr, 7), valid: false });
    if (typeof s.minimum === "number") out.push({ where, what: "minimum", apply: (r) => setAt(r, ptr, (s.minimum as number) - 1), valid: false });
    if (typeof s.maximum === "number") out.push({ where, what: "maximum", apply: (r) => setAt(r, ptr, (s.maximum as number) + 1), valid: false });
    if (t.includes("integer") && typeof data === "number") out.push({ where, what: "integer", apply: (r) => setAt(r, ptr, data + 0.5), valid: false });
  }
  if (data !== null && typeof data === "object" && !Array.isArray(data) && s.properties) {
    for (const key of (s.required as string[] | undefined) ?? []) {
      out.push({ where: `${where}/${key}`, what: "required", apply: (r) => at(r, [...ptr, key], (p, k) => delete (p as Record<string | number, Json>)[k]), valid: false });
    }
    if (s.additionalProperties === false) {
      out.push({ where, what: "additionalProperties", apply: (r) => setAt(r, [...ptr, "__extra__"], "x"), valid: false });
    }
    for (const [key, sub] of Object.entries(s.properties as Record<string, Schema>)) {
      if (key in data) mutations(sub, data[key], [...ptr, key], out);
    }
  }
  if (Array.isArray(data) && s.items) {
    if (typeof s.minItems === "number" && s.minItems > 0) out.push({ where, what: "minItems", apply: (r) => setAt(r, ptr, []), valid: false });
    if (typeof s.maxItems === "number" && data.length > 0) {
      const many = Array.from({ length: (s.maxItems as number) + 1 }, (_, i) => (s.uniqueItems ? `${String(data[0])}-${i}` : data[0]));
      if (!s.uniqueItems || typeof data[0] === "string") out.push({ where, what: "maxItems", apply: (r) => setAt(r, ptr, many as Json), valid: false });
    }
    if (s.uniqueItems && data.length > 0) out.push({ where, what: "uniqueItems", apply: (r) => setAt(r, ptr, [data[0], data[0]]), valid: false });
    if (data.length > 0) mutations(s.items as Schema, data[0], [...ptr, 0], out);
  }
}

describe("generated zod schemas are in sync with plan/portal/schema", () => {
  it("lib/portal/schemas.gen.ts equals a fresh generation", () => {
    expect(readFileSync(OUT_FILE, "utf8").replace(/\r\n/g, "\n")).toBe(generate());
  });

  it("there is one zod schema per JSON Schema file", () => {
    const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".schema.json") && f !== "common.schema.json");
    expect(Object.keys(SCHEMAS_BY_FILE).sort()).toEqual(files.sort());
  });

  it("the generator refuses keywords it does not understand", () => {
    expect(() => toZod({ type: "string", format: "email" }, "x")).toThrow(/unsupported keyword "format"/);
    expect(() => toZod({ anyOf: [{ type: "string" }] }, "x")).toThrow(/unsupported keyword "anyOf"/);
    expect(() => toZod({ type: ["string", "integer"] }, "x")).toThrow(/type lists/);
  });
});

for (const [schemaFile, zod] of Object.entries(SCHEMAS_BY_FILE)) {
  const schema = readJson(path.join(SCHEMA_DIR, schemaFile)) as Schema;
  describe(schemaFile, () => {
    for (const rel of dataFiles(schemaFile)) {
      const data = readJson(path.join(PORTAL, rel));
      it(`the real ${rel} passes`, () => {
        const r = zod.safeParse(data);
        expect(r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3))).toBe(true);
      });
    }
    // Keyword-by-keyword agreement on the first data file.
    const first = readJson(path.join(PORTAL, dataFiles(schemaFile)[0]));
    const list: Mutation[] = [];
    mutations(schema, first, [], list);
    it(`agrees with the JSON Schema on ${list.length} single-keyword changes`, () => {
      expect(list.length).toBeGreaterThan(10);
      const wrong = list.filter((m) => zod.safeParse(m.apply(first)).success !== m.valid).map((m) => `${m.what} at ${m.where} (JSON Schema: ${m.valid ? "valid" : "invalid"})`);
      expect(wrong).toEqual([]);
    });
  });
}

// Independent referee: PowerShell 7's Test-Json (the validator tools/portal-sync-check.ps1 uses) judges
// the same single-keyword changes. Skipped, visibly, when pwsh is not on PATH.
describe("PowerShell Test-Json agrees with zod on every single-keyword change", () => {
  const probe = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.Major"], { encoding: "utf8" });
  const hasPwsh = probe.status === 0 && Number(probe.stdout.trim()) >= 7;
  it.skipIf(!hasPwsh)("same verdict for every case", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ferrum zod referee "));
    try {
      const cases: { schema: string; doc: string; zod: boolean; label: string }[] = [];
      for (const [schemaFile, zod] of Object.entries(SCHEMAS_BY_FILE)) {
        const schema = readJson(path.join(SCHEMA_DIR, schemaFile)) as Schema;
        // Merge the shared definitions into the file schema, exactly like the checker does.
        const merged = { ...schema, $defs: { ...COMMON, ...((schema.$defs as Record<string, Schema>) ?? {}) } };
        const schemaPath = path.join(dir, schemaFile);
        writeFileSync(schemaPath, JSON.stringify(merged));
        const first = readJson(path.join(PORTAL, dataFiles(schemaFile)[0]));
        const list: Mutation[] = [];
        mutations(schema, first, [], list);
        for (const m of list) {
          const doc = m.apply(first);
          cases.push({ schema: schemaPath, doc: JSON.stringify(doc), zod: zod.safeParse(doc).success, label: `${schemaFile} ${m.what} at ${m.where}` });
        }
      }
      const input = path.join(dir, "cases.json");
      writeFileSync(input, JSON.stringify(cases.map((c) => ({ schema: c.schema, doc: c.doc }))));
      const script = path.join(dir, "referee.ps1");
      writeFileSync(
        script,
        [
          "param([string]$In)",
          "$cases = Get-Content -LiteralPath $In -Raw | ConvertFrom-Json",
          "$cache = @{}",
          "foreach ($c in $cases) {",
          "  if (-not $cache.ContainsKey($c.schema)) { $cache[$c.schema] = Get-Content -LiteralPath $c.schema -Raw }",
          "  $ok = Test-Json -Json $c.doc -Schema $cache[$c.schema] -ErrorAction SilentlyContinue",
          "  if ($ok) { 'T' } else { 'F' }",
          "}",
        ].join("\n"),
      );
      const r = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script, "-In", input], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      expect(r.status, r.stderr).toBe(0);
      const verdicts = r.stdout.split(/\r?\n/).filter((l) => l === "T" || l === "F");
      expect(verdicts).toHaveLength(cases.length);
      const disagree = cases.filter((c, i) => (verdicts[i] === "T") !== c.zod).map((c) => `${c.label}: zod ${c.zod ? "valid" : "invalid"}, Test-Json ${c.zod ? "invalid" : "valid"}`);
      expect(disagree).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
