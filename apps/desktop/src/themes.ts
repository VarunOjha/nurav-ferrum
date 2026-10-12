// Themes (P3 feature set, p3.22, adr-0033). A theme is data: one record of named design tokens for light and dark.
// The shell's styles use only these token names (CSS custom properties); no colour is written anywhere else (a unit
// test checks style.css). Accent colour and density are the user's settings applied on top of any theme. Adding a
// theme later is adding a record here and its name to the app's list ([appearance] theme); no other code changes.

/** The colour tokens every theme defines, for light and for dark. */
export const COLOUR_TOKENS = [
  "bg", "chrome", "surface", "raised", "field", "border", "text", "muted", "sel", "page", "on-accent", "brush", "shadow",
] as const;
export type ColourToken = (typeof COLOUR_TOKENS)[number];
export type Palette = Record<ColourToken, string>;
export type Theme = { name: string; label: string; dark: Palette; light: Palette };

const BRUSH_DARK = "repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 3px)";
const BRUSH_LIGHT = "repeating-linear-gradient(90deg, rgba(0,0,0,0.018) 0px, rgba(0,0,0,0.018) 1px, transparent 1px, transparent 3px)";

/** Graphite: dark and metallic, neutral brushed grey (the owner's pick, adr-0033; colours from the frozen design). */
export const GRAPHITE: Theme = {
  name: "graphite",
  label: "Graphite",
  dark: {
    bg: "#141619", chrome: "#1D2024", surface: "#24282C", raised: "#2A2E33", field: "#111316", border: "#383D43",
    text: "#E9ECEF", muted: "#A2A9B1", sel: "#31363C", page: "#1A1C1F", "on-accent": "#1A1D20", brush: BRUSH_DARK,
    shadow: "0 18px 40px rgba(0,0,0,0.35)",
  },
  light: {
    bg: "#F2F3F4", chrome: "#E4E6E8", surface: "#FFFFFF", raised: "#FFFFFF", field: "#FFFFFF", border: "#C9CED3",
    text: "#1A1D20", muted: "#59616A", sel: "#E8EBEE", page: "#FFFFFF", "on-accent": "#FFFFFF", brush: BRUSH_LIGHT,
    shadow: "0 10px 28px rgba(20,30,40,0.12)",
  },
};

/** Every theme by name. */
export const THEMES: Record<string, Theme> = { graphite: GRAPHITE };

/** Accent colours: a brighter one for dark mode, a darker one for light mode (contrast on light grounds). */
export const ACCENTS: Record<string, { label: string; dark: string; light: string }> = {
  orange: { label: "Orange", dark: "#F97316", light: "#C2410C" },
  blue: { label: "Blue", dark: "#3B82F6", light: "#1D4ED8" },
  green: { label: "Green", dark: "#22C55E", light: "#15803D" },
  violet: { label: "Violet", dark: "#8B5CF6", light: "#6D28D9" },
};

/** Sizes for the two densities (px). */
export const DENSITIES: Record<string, { label: string; tabH: number; barH: number; bmH: number; font: number }> = {
  roomy: { label: "Roomy", tabH: 40, barH: 52, bmH: 34, font: 13 },
  compact: { label: "Compact", tabH: 34, barH: 44, bmH: 30, font: 12 },
};

export type Look = { theme: string; accent: string; density: string; mode: "dark" | "light" };

/** The CSS custom properties for a look (unknown names fall back to Graphite, orange, roomy). */
export function tokensFor(look: Look): Record<string, string> {
  const t = THEMES[look.theme] ?? GRAPHITE;
  const p = look.mode === "light" ? t.light : t.dark;
  const a = ACCENTS[look.accent] ?? ACCENTS.orange!;
  const d = DENSITIES[look.density] ?? DENSITIES.roomy!;
  const out: Record<string, string> = {};
  for (const k of COLOUR_TOKENS) out[`--${k}`] = p[k];
  out["--accent"] = look.mode === "light" ? a.light : a.dark;
  out["--tab-h"] = `${d.tabH}px`;
  out["--bar-h"] = `${d.barH}px`;
  out["--bm-h"] = `${d.bmH}px`;
  out["--font-size"] = `${d.font}px`;
  return out;
}

/** Applies a look to the page: tokens on the root element, plus data attributes for the few rules that differ. */
export function applyLook(root: HTMLElement, look: Look): void {
  for (const [k, v] of Object.entries(tokensFor(look))) root.style.setProperty(k, v);
  root.dataset.mode = look.mode;
  root.dataset.density = look.density;
  root.dataset.theme = look.theme;
  root.style.colorScheme = look.mode;
}
