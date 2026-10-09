// ip-testing §1.2 schema-sync: parses the REAL wiki/SCHEMA.md (read-only) and asserts that the
// constants in lib/wiki/schemas.ts (and the log/integrity regexes) equal it. A SCHEMA change that is
// not mirrored in the app fails here (SCHEMA §15: "in the same change set").
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, ERROR_STATUS } from "@/lib/approvals/errors";
import { SEVERITY } from "@/lib/wiki/findings";
import { UNVERIFIED_TAG } from "@/lib/wiki/links";
import { LOG_BULLET_KEYS, LOG_HEADING, LOG_OPS } from "@/lib/wiki/log";
import {
  CFG_ID_PATTERN,
  EDGE_KINDS,
  ID_PATTERNS,
  PAGE_TYPES,
  QUESTION_ID_PATTERN,
  SINGLETON_IDS,
  STATUS_ENUMS,
  TASK_ID_PATTERN,
} from "@/lib/wiki/schemas";
import { REAL_WIKI } from "./helpers";

let text = "";
let lines: string[] = [];

/** Lines of the section that starts at the heading matching `re`, up to the next heading of the same or higher level. */
function section(re: RegExp): string[] {
  const start = lines.findIndex((l) => re.test(l));
  if (start < 0) throw new Error(`SCHEMA.md: heading ${re} not found`);
  const depth = /^(#+)/.exec(lines[start])![1].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#+) /.exec(lines[i]);
    if (m && m[1].length <= depth) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

/** Splits a markdown table row on unescaped `|`. */
function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .replace(/\\\|/g, "\u0000")
    .split("|")
    .map((c) => c.replace(/\u0000/g, "\\|").trim());
}
const ticks = (s: string) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const enumList = (s: string) => s.split(/\\?\|/).map((x) => x.trim()).filter(Boolean);
const sorted = (a: readonly string[]) => [...a].sort();

beforeAll(() => {
  text = readFileSync(path.join(REAL_WIKI, "SCHEMA.md"), "utf8").replace(/\r\n?/g, "\n");
  lines = text.split("\n");
});

describe("SCHEMA.md <-> lib/wiki/schemas.ts", () => {
  it("§5.1 `type` enum (+ research-note, raw only) equals PAGE_TYPES", () => {
    const row = section(/^### 5\.1 /).find((l) => l.startsWith("| `type` |"));
    expect(row, "§5.1 type row").toBeDefined();
    const values = ticks(cells(row!)[2])[0].split(",").map((s) => s.trim());
    expect(values.length).toBeGreaterThan(10);
    expect(sorted([...values, "research-note"])).toEqual(sorted(PAGE_TYPES));
  });

  it("§6.N `- status:` lines and the §6.16 singleton table equal STATUS_ENUMS", () => {
    const fromSchema: Record<string, string[]> = {};
    const sec6 = section(/^## 6\. /);
    let current: string | null = null;
    for (const l of sec6) {
      const h = /^### 6\.(\d+) `([^`]+)`/.exec(l);
      if (h) {
        current = h[2];
        continue;
      }
      if (/^### /.test(l)) current = null; // e.g. "### 6.16 Special singletons"
      const s = /^- status: `([^`]+)`/.exec(l);
      if (s && current) {
        expect(fromSchema[current], `duplicate status line for ${current}`).toBeUndefined();
        fromSchema[current] = enumList(s[1]);
      }
    }
    const singles = section(/^### 6\.16 /).filter((l) => /^\| `[^`]+`[^|]*\| `/.test(l));
    expect(singles.length).toBe(4);
    for (const row of singles) {
      const c = cells(row);
      const type = ticks(c[2])[0];
      fromSchema[type] = enumList(ticks(c[4].replace(/\\\|/g, "|"))[0]);
    }
    expect(fromSchema["research-note"]).toBeUndefined(); // §6.13: no status
    const ours: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(STATUS_ENUMS)) ours[k] = [...v];
    expect(fromSchema).toEqual(ours);
  });

  it("§6.2 connects `kind` enum equals EDGE_KINDS", () => {
    const sec = section(/^### 6\.2 /).join("\n");
    const m = /`kind`: `([^`]+)`/.exec(sec);
    expect(m, "§6.2 kind enum").not.toBeNull();
    expect(enumList(m![1])).toEqual([...EDGE_KINDS]);
  });

  it("§8 id regexes equal ID_PATTERNS and the non-page patterns", () => {
    const rows = section(/^## 8\. /).filter((l) => l.startsWith("| ") && !l.startsWith("| Type") && !l.startsWith("|---"));
    const seen = new Set<string>();
    const singletonTypes: Record<string, string> = {
      glossary: "glossary",
      index: "index",
      log: "log",
      schema: "schema",
      status: "status-live",
    };
    for (const row of rows) {
      const c = cells(row);
      const label = c[0];
      const pats = ticks(c[1]);
      if (label === "task (inside phase)") expect(pats).toEqual([TASK_ID_PATTERN]);
      else if (label === "configuration (not a page)") expect(pats).toEqual([CFG_ID_PATTERN]);
      else if (label === "open question (section, not page)") expect(pats).toEqual([QUESTION_ID_PATTERN]);
      else if (label === "singletons") {
        const ids = pats[0].split(",").map((s) => s.trim());
        expect(sorted(ids)).toEqual(sorted(SINGLETON_IDS));
        for (const [t, id] of Object.entries(singletonTypes)) {
          expect(ids).toContain(id);
          expect(ID_PATTERNS[t as keyof typeof ID_PATTERNS]).toEqual([`^${id}$`]);
        }
      } else {
        expect((PAGE_TYPES as readonly string[]).includes(label), `unknown §8 row ${label}`).toBe(true);
        expect(ID_PATTERNS[label as keyof typeof ID_PATTERNS], label).toEqual(pats);
      }
      seen.add(label);
    }
    for (const t of PAGE_TYPES) {
      if (!(t in singletonTypes)) expect(seen.has(t), `§8 has no row for ${t}`).toBe(true);
    }
  });

  it("§12 log heading regex, ops and bullet keys equal lib/wiki/log.ts", () => {
    const sec = section(/^## 12\. /).join("\n");
    const m = /Regex: `([^`]+)`/.exec(sec);
    expect(m![1]).toBe(LOG_HEADING.source);
    const ops = /\(([a-z|]+)\)/.exec(m![1])![1].split("|");
    expect(ops).toEqual([...LOG_OPS]);
    const body = sec.split("\n").find((l) => l.startsWith("- Body:"))!;
    const keys = ticks(body).map((t) => /^- ([a-z_]+):/.exec(t)![1]);
    expect(keys).toEqual([...LOG_BULLET_KEYS]);
  });

  it("§7.1 UNVERIFIED regex equals lib/wiki/links.ts", () => {
    const sec = section(/^## 7\. /).join("\n");
    const m = /- Regex: `([^`]+)`/.exec(sec);
    expect(m![1]).toBe(UNVERIFIED_TAG.source);
  });

  it("§9.3 severities equal the lint's default severities, and every §9.3 code is implemented", () => {
    const rows = section(/^### 9\.3 /).filter((l) => /^\| `[A-Z-]+` \|/.test(l));
    const table: Record<string, string> = {};
    for (const r of rows) {
      const c = cells(r);
      // the leading word is the default; e.g. "info (warn when ...)" or "warn ... error if ..." vary per finding
      table[ticks(c[0])[0]] = /^[a-z]+/.exec(c[1])![0];
    }
    expect(Object.keys(table).length).toBeGreaterThanOrEqual(27);
    // SCHEMA-SPLIT is not mechanically checkable: the lint prints the manual reminder as info (ip-wiki-lint §2)
    const NOT_MECHANICAL: Record<string, string> = { "SCHEMA-SPLIT": "info" };
    for (const code of Object.keys(table)) expect(SEVERITY[code], `${code} has no lint severity`).toBeDefined();
    for (const [code, sev] of Object.entries(SEVERITY)) {
      if (code in NOT_MECHANICAL) expect(sev, code).toBe(NOT_MECHANICAL[code]);
      else if (code in table) expect(sev, code).toBe(table[code]);
      // codes outside the §9.3 table are ip-wiki-lint §2.1 proposals: warn until adopted
      else expect(sev, code).toBe("warn");
    }
  });
});

// IP-9 review: the code -> HTTP status table of ip-approvals-api §2.2 equals lib/approvals/errors.ts.
describe("ip-approvals-api §2.2 <-> lib/approvals/errors.ts", () => {
  it("every error code has the status the spec lists, and the spec lists every code", () => {
    const doc = readFileSync(path.join(REAL_WIKI, "interactive-plan", "ip-approvals-api.md"), "utf8").replace(/\r\n/g, "\n");
    const sec = doc.slice(doc.indexOf("### 2.2 Error envelope"), doc.indexOf("## 3. Local-only guard"));
    const table: Record<string, number> = {};
    for (const m of sec.matchAll(/^\| `([A-Z_]+)` \| (\d{3}) \|$/gm)) table[m[1]] = Number(m[2]);
    expect(Object.keys(table).length).toBe(ERROR_CODES.length);
    expect(table).toEqual({ ...ERROR_STATUS });
  });
});
