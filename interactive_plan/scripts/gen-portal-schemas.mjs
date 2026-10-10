// Generates lib/portal/schemas.gen.ts (zod) from the portal JSON Schemas in ../plan/portal/schema/
// (adr-0024). The JSON Schemas are the source of truth; the portal validates every file it reads with
// the generated zod schemas, so the two can never drift apart:
//   node scripts/gen-portal-schemas.mjs          write the file
//   node scripts/gen-portal-schemas.mjs --check  exit 1 if the file is out of date
// tests/unit/portal-schemas.test.ts runs the same generator and fails when the committed file differs.
//
// Only the JSON Schema keywords the portal schemas use are supported. Any other keyword makes the
// generator throw, so a schema change that needs new handling cannot be ignored silently.
// Lengths are counted in Unicode code points, as JSON Schema does (zod's .min/.max count UTF-16 units).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SCHEMA_DIR = path.resolve(APP_DIR, "..", "plan", "portal", "schema");
export const OUT_FILE = path.join(APP_DIR, "lib", "portal", "schemas.gen.ts");

const ANNOTATIONS = new Set(["$schema", "$id", "title", "description", "$comment"]);
const SUPPORTED = new Set([
  ...ANNOTATIONS,
  "$defs",
  "$ref",
  "type",
  "enum",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
]);

/** "phase.schema.json" -> "PhaseFile"; "common.schema.json" holds only shared definitions. */
export function exportName(file) {
  const stem = file.replace(/\.schema\.json$/, "");
  return stem.charAt(0).toUpperCase() + stem.slice(1) + "File";
}

const defName = (name) => "def_" + name.replace(/[^A-Za-z0-9_]/g, "_");

function check(schema, where) {
  for (const k of Object.keys(schema)) {
    if (!SUPPORTED.has(k)) throw new Error(`gen-portal-schemas: unsupported keyword "${k}" at ${where}`);
  }
}

function stringCode(s) {
  let c = "z.string()";
  if (s.pattern !== undefined) c += `.regex(new RegExp(${JSON.stringify(s.pattern)}))`;
  if (s.minLength !== undefined) c += `.refine((v) => cpLen(v) >= ${s.minLength}, "at least ${s.minLength} characters")`;
  if (s.maxLength !== undefined) c += `.refine((v) => cpLen(v) <= ${s.maxLength}, "at most ${s.maxLength} characters")`;
  return c;
}

function numberCode(s, integer) {
  let c = integer ? "z.number().int()" : "z.number()";
  if (s.minimum !== undefined) c += `.min(${s.minimum})`;
  if (s.maximum !== undefined) c += `.max(${s.maximum})`;
  return c;
}

function arrayCode(s, where) {
  if (!s.items) throw new Error(`gen-portal-schemas: array without items at ${where}`);
  let c = `z.array(${toZod(s.items, where + "/items")})`;
  if (s.minItems !== undefined) c += `.min(${s.minItems})`;
  if (s.maxItems !== undefined) c += `.max(${s.maxItems})`;
  if (s.uniqueItems) c += `.refine(uniqueItems, "items must be unique")`;
  return c;
}

function objectCode(s, where) {
  const req = new Set(s.required ?? []);
  const props = s.properties ?? {};
  for (const r of req) if (!(r in props)) throw new Error(`gen-portal-schemas: required "${r}" has no property at ${where}`);
  const fields = Object.entries(props).map(([k, v]) => {
    const code = toZod(v, `${where}/properties/${k}`);
    return `${JSON.stringify(k)}: ${req.has(k) ? code : code + ".optional()"}`;
  });
  const fn = s.additionalProperties === false ? "z.strictObject" : "z.looseObject";
  if (s.additionalProperties !== undefined && typeof s.additionalProperties !== "boolean") {
    throw new Error(`gen-portal-schemas: additionalProperties must be a boolean at ${where}`);
  }
  return `${fn}({ ${fields.join(", ")} })`;
}

function typedCode(type, s, where) {
  switch (type) {
    case "string":
      return stringCode(s);
    case "integer":
      return numberCode(s, true);
    case "number":
      return numberCode(s, false);
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "array":
      return arrayCode(s, where);
    case "object":
      return objectCode(s, where);
    default:
      throw new Error(`gen-portal-schemas: unsupported type "${type}" at ${where}`);
  }
}

/** One JSON Schema node -> zod source code (an expression). */
export function toZod(s, where) {
  check(s, where);
  if (s.$ref !== undefined) {
    const m = /^#\/\$defs\/([A-Za-z0-9_]+)$/.exec(s.$ref);
    if (!m) throw new Error(`gen-portal-schemas: only #/$defs/<name> references are supported at ${where}`);
    if (Object.keys(s).some((k) => k !== "$ref" && !ANNOTATIONS.has(k))) {
      throw new Error(`gen-portal-schemas: keywords next to $ref are not supported at ${where}`);
    }
    return defName(m[1]);
  }
  if (s.enum !== undefined) {
    const literals = s.enum.map((v) => `z.literal(${JSON.stringify(v)})`);
    return literals.length === 1 ? literals[0] : `z.union([${literals.join(", ")}])`;
  }
  if (Array.isArray(s.type)) {
    const nonNull = s.type.filter((t) => t !== "null");
    if (nonNull.length !== 1) throw new Error(`gen-portal-schemas: type lists must be [<type>, "null"] at ${where}`);
    const base = typedCode(nonNull[0], s, where);
    return s.type.includes("null") ? `${base}.nullable()` : base;
  }
  if (typeof s.type === "string") return typedCode(s.type, s, where);
  throw new Error(`gen-portal-schemas: node without type, enum or $ref at ${where}`);
}

/** Shared $defs in dependency order (a def may refer to another def). */
function orderDefs(defs) {
  const refsOf = (node, out = new Set()) => {
    if (Array.isArray(node)) node.forEach((n) => refsOf(n, out));
    else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (k === "$ref" && typeof v === "string") out.add(v.replace("#/$defs/", ""));
        else refsOf(v, out);
      }
    }
    return out;
  };
  const done = [];
  const visit = (name, stack) => {
    if (done.includes(name)) return;
    if (stack.includes(name)) throw new Error(`gen-portal-schemas: cyclic $defs ${stack.join(" -> ")} -> ${name}`);
    if (!(name in defs)) throw new Error(`gen-portal-schemas: unknown definition ${name}`);
    for (const d of refsOf(defs[name])) visit(d, [...stack, name]);
    done.push(name);
  };
  for (const name of Object.keys(defs)) visit(name, []);
  return done;
}

/** Reads every *.schema.json in `dir` and returns the generated TypeScript source. */
export function generate(dir = SCHEMA_DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
  const read = (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  if (!files.includes("common.schema.json")) throw new Error("gen-portal-schemas: common.schema.json is missing");
  const defs = { ...read("common.schema.json").$defs };
  const out = [];
  out.push("// GENERATED by scripts/gen-portal-schemas.mjs from plan/portal/schema/*.schema.json. Do not edit.");
  out.push("// Regenerate: node scripts/gen-portal-schemas.mjs (tests/unit/portal-schemas.test.ts fails when stale).");
  out.push('import { z } from "zod";');
  out.push("");
  out.push("/** Length in Unicode code points (JSON Schema minLength/maxLength). */");
  out.push("const cpLen = (v: string): number => Array.from(v).length;");
  out.push("const uniqueItems = (a: unknown[]): boolean => new Set(a.map((x) => JSON.stringify(x))).size === a.length;");
  out.push("");
  for (const f of files) {
    if (f === "common.schema.json") continue;
    const s = read(f);
    for (const [k, v] of Object.entries(s.$defs ?? {})) {
      if (k in defs && JSON.stringify(defs[k]) !== JSON.stringify(v)) throw new Error(`gen-portal-schemas: ${f} redefines $defs/${k}`);
      defs[k] = v;
    }
  }
  for (const name of orderDefs(defs)) {
    out.push(`export const ${defName(name)} = ${toZod(defs[name], `common.schema.json#/$defs/${name}`)};`);
  }
  out.push("");
  for (const f of files) {
    if (f === "common.schema.json") continue;
    const s = read(f);
    const root = { ...s };
    delete root.$defs;
    const name = exportName(f);
    out.push(`/** ${f}: ${String(s.title ?? "").replace(/\*\//g, "* /")} */`);
    out.push(`export const ${name} = ${toZod(root, f)};`);
    out.push(`export type ${name.replace(/File$/, "")} = z.infer<typeof ${name}>;`);
    out.push("");
  }
  out.push("/** File name (relative to plan/portal/schema/) -> zod schema. */");
  out.push("export const SCHEMAS_BY_FILE = {");
  for (const f of files) if (f !== "common.schema.json") out.push(`  ${JSON.stringify(f)}: ${exportName(f)},`);
  out.push("} as const;");
  return out.join("\n") + "\n";
}

function main() {
  const code = generate();
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(OUT_FILE, "utf8");
    } catch {
      // missing counts as stale
    }
    if (current.replace(/\r\n/g, "\n") !== code) {
      console.error(`${path.relative(APP_DIR, OUT_FILE)} is out of date: run node scripts/gen-portal-schemas.mjs`);
      process.exit(1);
    }
    console.log(`${path.relative(APP_DIR, OUT_FILE)} is up to date`);
    return;
  }
  writeFileSync(OUT_FILE, code);
  console.log(`wrote ${path.relative(APP_DIR, OUT_FILE)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
