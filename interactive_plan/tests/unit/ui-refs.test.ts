// Ref mode registry (lib/portal/uiRefs.ts): ids are unique and well formed, every id the portal code
// uses is in the registry and every registry id is used somewhere, no id is attached to an element
// that cannot hold the label button, and the label and copy texts have the agreed format.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  chipText,
  copyText,
  isUiRefId,
  layoutMap,
  popupContext,
  prefixOf,
  scopeLabel,
  ui,
  uiLabel,
  UI_REF_ID,
  UI_REFS,
  UI_SCOPES,
} from "@/lib/portal/uiRefs";

const APP = path.resolve(__dirname, "..", "..");
const REGISTRY = path.join(APP, "lib", "portal", "uiRefs.ts");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(f) && p !== REGISTRY) out.push(p);
  }
  return out;
}
const files = [...sources(path.join(APP, "app")), ...sources(path.join(APP, "components")), ...sources(path.join(APP, "lib"))];
const ID_LITERAL = /["']((?:HD|OV|RM|AR|DE|RE|QU|LO|PH|IT|RF|SC)-[0-9]+)["']/g;

/** Every quoted id-shaped literal in the portal code, with the file it is in. */
function usedIds(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(ID_LITERAL)) {
      const list = used.get(m[1]) ?? [];
      list.push(path.relative(APP, f));
      used.set(m[1], list);
    }
  }
  return used;
}

describe("ui ref registry", () => {
  const ids = Object.keys(UI_REFS);

  it("has well-formed ids with a known prefix", () => {
    expect(ids.length).toBeGreaterThan(40);
    for (const id of ids) expect(id, id).toMatch(UI_REF_ID);
    for (const id of ids) expect(Object.keys(UI_SCOPES)).toContain(prefixOf(id));
  });

  it("has unique ids (also in the source text, where a duplicate key would silently win)", () => {
    const text = readFileSync(REGISTRY, "utf8");
    const keys = [...text.matchAll(/^\s*"([A-Z]{2}-[0-9]+)":/gm)].map((m) => m[1]);
    expect(keys.length).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has short plain names", () => {
    for (const [id, e] of Object.entries(UI_REFS)) {
      expect(e.name.trim(), id).toBe(e.name);
      expect(e.name.length, id).toBeGreaterThan(2);
      expect(e.name.length, id).toBeLessThanOrEqual(40);
      expect(e.name, id).not.toMatch(/[A-Z]{2}-[0-9]/);
    }
  });

  it("every id used in the portal code is in the registry", () => {
    const unknown = [...usedIds().keys()].filter((id) => !isUiRefId(id));
    expect(unknown).toEqual([]);
  });

  it("every registry id is used somewhere in the portal code", () => {
    const used = usedIds();
    expect(ids.filter((id) => !used.has(id))).toEqual([]);
  });

  it("never marks an element that cannot hold the label button", () => {
    const bad: string[] = [];
    let seen = 0;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // The opening tag that carries a ui(...) spread or a data-ui-ref attribute.
      for (const m of text.matchAll(/<([a-zA-Z][\w.]*)\b((?:[^<>]|=>|\s>\s)*?)(?:\{\.\.\.(?:\([^?]*\?\s*)?ui\(|data-ui-ref=)/g)) {
        seen++;
        if (/^(ul|ol|table|thead|tbody|tr|button|a|Link|input|select|textarea|img|svg)$/.test(m[1])) bad.push(`${path.relative(APP, f)}: <${m[1]}>`);
      }
    }
    expect(bad).toEqual([]);
    expect(seen).toBeGreaterThanOrEqual(55);
  });

  it("uses each id where its prefix says (popup ids only in the popup components)", () => {
    const where: Record<string, RegExp> = {
      PH: /PhasePopup\.tsx$/,
      IT: /DetailPopup\.tsx$/,
      RF: /RefProvider\.tsx$/,
      SC: /ScriptProvider\.tsx$/,
      HD: /(layout\.tsx|TopNav\.tsx|RefMode\.tsx)$/,
    };
    for (const [id, inFiles] of usedIds()) {
      const rule = where[prefixOf(id)];
      if (rule) for (const f of inFiles) expect(f, id).toMatch(rule);
    }
  });
});

describe("ui ref labels", () => {
  it("ui() builds the marking attributes", () => {
    expect(ui("OV-3")).toEqual({ "data-ui-ref": "OV-3" });
    expect(ui("OV-4", { index: 1, item: "P1" })).toEqual({ "data-ui-ref": "OV-4", "data-ui-index": "1", "data-ui-item": "P1" });
    expect(ui("PH-1", { pos: "inside" })).toEqual({ "data-ui-ref": "PH-1", "data-ui-pos": "inside" });
    expect(ui("RM-2", { index: 0 })).toEqual({ "data-ui-ref": "RM-2", "data-ui-index": "0" });
  });

  it("labels a block, an item, and refuses unknown ids", () => {
    expect(uiLabel("OV-3")).toEqual({ id: "OV-3", name: "What happens next" });
    expect(uiLabel("OV-3", "")).toEqual({ id: "OV-3", name: "What happens next" });
    expect(uiLabel("OV-4", "1", "P1")).toEqual({ id: "OV-4.1", name: "Phase card P1" });
    expect(uiLabel("RM-2", "2", null)).toEqual({ id: "RM-2.2", name: "Stage card" });
    expect(uiLabel("DE-2", "3")).toEqual({ id: "DE-2.3", name: "Decision list" });
    expect(uiLabel("ZZ-1")).toBeNull();
    expect(uiLabel("OV-99")).toBeNull();
    expect(uiLabel("toString")).toBeNull();
  });

  it("shows 'ID · name' on the chip and copies 'Context › ID name'", () => {
    const l = uiLabel("OV-3")!;
    expect(chipText(l)).toBe("OV-3 · What happens next");
    expect(copyText(scopeLabel("OV-3"), l)).toBe("Overview › OV-3 What happens next");
    expect(copyText(popupContext("PH", "P1"), uiLabel("PH-3")!)).toBe("Phase popup (P1) › PH-3 Tasks table");
    expect(copyText(scopeLabel("HD-4"), uiLabel("HD-4")!)).toBe("Header › HD-4 Ref button");
    expect(copyText(scopeLabel("OV-4"), uiLabel("OV-4", "1", "P1")!)).toBe("Overview › OV-4.1 Phase card P1");
  });

  it("names popups with or without a detail", () => {
    expect(popupContext("RF", "Decision 7")).toBe("Reference popup (Decision 7)");
    expect(popupContext("SC", "p1-gate.ps1")).toBe("Script popup (p1-gate.ps1)");
    expect(popupContext("IT", null)).toBe("Item popup");
    expect(popupContext("SC")).toBe("Script popup");
  });

  it("lists every id once in the Layout map, grouped in registry order", () => {
    const map = layoutMap();
    const all = map.flatMap((g) => g.rows.map((r) => r.id));
    expect(all).toEqual(Object.keys(UI_REFS));
    expect(map.map((g) => g.label)).toEqual(Object.values(UI_SCOPES).map((s) => s.label));
    expect(map.find((g) => g.prefix === "OV")!.rows.find((r) => r.id === "OV-4")!.item).toBe("Phase card");
    expect(map.find((g) => g.prefix === "OV")!.rows.find((r) => r.id === "OV-1")!.item).toBeNull();
  });
});
