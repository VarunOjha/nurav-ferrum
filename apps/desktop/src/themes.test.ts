// p3.22 (adr-0033): themes are data. Every theme defines every token for light and dark; style.css writes no colour
// of its own and uses only tokens that a theme defines.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ACCENTS, COLOUR_TOKENS, DENSITIES, THEMES, tokensFor } from "./themes.ts";

const css = fs.readFileSync(new URL("./style.css", import.meta.url), "utf8");

test("every theme defines every colour token for light and dark", () => {
  assert.ok(THEMES.graphite, "Graphite is a theme");
  for (const t of Object.values(THEMES)) {
    for (const mode of ["dark", "light"] as const) {
      for (const k of COLOUR_TOKENS) assert.ok(t[mode][k] && t[mode][k].length > 0, `${t.name} ${mode} ${k}`);
    }
  }
});

test("the look's tokens: theme colours, the accent for light or dark, the density's sizes", () => {
  const dark = tokensFor({ theme: "graphite", accent: "orange", density: "roomy", mode: "dark" });
  assert.equal(dark["--bg"], "#141619");
  assert.equal(dark["--accent"], "#F97316");
  assert.equal(dark["--tab-h"], "40px");
  const light = tokensFor({ theme: "graphite", accent: "violet", density: "compact", mode: "light" });
  assert.equal(light["--bg"], "#F2F3F4");
  assert.equal(light["--accent"], ACCENTS.violet!.light);
  assert.equal(light["--bar-h"], `${DENSITIES.compact!.barH}px`);
  // Unknown names fall back to Graphite, orange, roomy.
  assert.deepEqual(tokensFor({ theme: "neon", accent: "pink", density: "huge", mode: "dark" }), dark);
});

test("style.css writes no colour of its own", () => {
  const found = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|:\s*(white|black)\b|\s(white|black)\s*[;}]/g) ?? [];
  assert.deepEqual(found, []);
});

test("every token style.css uses is one a look sets", () => {
  const defined = new Set(Object.keys(tokensFor({ theme: "graphite", accent: "orange", density: "roomy", mode: "dark" })));
  const used = new Set([...css.matchAll(/var\((--[a-z-]+)/g)].map((m) => m[1]!));
  for (const u of used) assert.ok(defined.has(u), `style.css uses ${u}, which no theme sets`);
});
