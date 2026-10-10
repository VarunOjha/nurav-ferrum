/**
 * Ref mode (owner request 2026-10-10): the registry of the portal's layout blocks. Every block the
 * owner may want to talk about in layout feedback has a fixed id here ("OV-3 · What happens next").
 * Components mark the block with `{...ui("OV-3")}` (a `data-ui-ref` attribute); the Ref button in the
 * header then outlines each marked block and shows a small label that copies
 * "Overview › OV-3 What happens next" to the clipboard.
 *
 * Rules (tests/unit/ui-refs.test.ts checks them):
 * - Ids are written here by hand and never derived from the order of the page, so they stay the same
 *   when the plan text or the layout changes. A removed block keeps its number retired; a new block
 *   takes the next free number of its prefix. Never renumber.
 * - The prefix says where the block lives (UI_SCOPES). Every id here is used in the portal code, and
 *   every id the code uses is listed here.
 * - A repeated item (one of the phase cards) shows its group id plus a fixed suffix taken from the
 *   item itself, e.g. "OV-4.1" for the card of P1.
 * - A marked element must be able to hold a button: never a <ul>, <ol>, <table>, <tr>, <button> or
 *   <a> (wrap those in a <div> instead).
 * No file access: safe to import from client code.
 */

export const UI_SCOPES = {
  HD: { scope: "header", label: "Header" },
  OV: { scope: "tab", label: "Overview" },
  RM: { scope: "tab", label: "Roadmap" },
  AR: { scope: "tab", label: "Architecture" },
  DE: { scope: "tab", label: "Decisions" },
  RE: { scope: "tab", label: "Research" },
  QU: { scope: "tab", label: "Questions" },
  LO: { scope: "tab", label: "Log" },
  PH: { scope: "popup", label: "Phase popup" },
  IT: { scope: "popup", label: "Item popup" },
  RF: { scope: "popup", label: "Reference popup" },
  SC: { scope: "popup", label: "Script popup" },
} as const;

export type UiPrefix = keyof typeof UI_SCOPES;

export interface UiRefEntry {
  /** Plain name of the block, as the owner would say it. */
  name: string;
  /** For a group of repeated items: the name of one item ("Phase card"). */
  item?: string;
}

export const UI_REFS = {
  // Header (on every tab)
  "HD-1": { name: "Portal name" },
  "HD-2": { name: "Tabs" },
  "HD-3": { name: "Read-only badge" },
  "HD-4": { name: "Ref button" },
  "HD-5": { name: "Colour theme switch" },
  "HD-6": { name: "Data problem note" },

  // Overview
  "OV-1": { name: "Where we are" },
  "OV-2": { name: "Questions for you" },
  "OV-3": { name: "What happens next", item: "Step" },
  "OV-4": { name: "Phase progress", item: "Phase card" },
  "OV-5": { name: "Clickable references" },
  "OV-6": { name: "Latest log" },

  // Roadmap
  "RM-1": { name: "Page heading" },
  "RM-2": { name: "Stages", item: "Stage card" },
  "RM-3": { name: "Phases table" },
  "RM-4": { name: "Same in every phase" },

  // Architecture
  "AR-1": { name: "Page heading" },
  "AR-2": { name: "Group switcher" },
  "AR-3": { name: "Layer diagram", item: "Layer row" },
  "AR-4": { name: "How to read this" },
  "AR-5": { name: "What the group is for" },
  "AR-6": { name: "Parts list" },
  "AR-7": { name: "Other groups at a glance" },
  "AR-8": { name: "Footnote" },

  // Decisions
  "DE-1": { name: "Page heading" },
  "DE-2": { name: "Decision list" },
  "DE-3": { name: "Risks table" },

  // Research
  "RE-1": { name: "Page heading" },
  "RE-2": { name: "Section links" },
  "RE-3": { name: "Questions we want to answer" },
  "RE-4": { name: "What we expect to find" },
  "RE-5": { name: "Experiments" },
  "RE-6": { name: "Measurements" },
  "RE-7": { name: "Test pages and tasks" },

  // Questions
  "QU-1": { name: "Page heading" },
  "QU-2": { name: "Group links" },
  "QU-3": { name: "Open questions" },
  "QU-4": { name: "Answered questions" },
  "QU-5": { name: "Withdrawn questions" },
  "QU-6": { name: "Question card (all look the same)" },

  // Log
  "LO-1": { name: "Page heading" },
  "LO-2": { name: "Filter and count" },
  "LO-3": { name: "Log entry (all look the same)" },
  "LO-4": { name: "What was done, what's next" },
  "LO-5": { name: "Decisions and approvals tables" },
  "LO-6": { name: "Entry footer with the commit" },

  // Phase popup (opens from a phase card, a phase name or a phase id)
  "PH-1": { name: "Popup header" },
  "PH-2": { name: "Step order" },
  "PH-3": { name: "Tasks table" },
  "PH-4": { name: "Test gate" },
  "PH-5": { name: "Gate script" },
  "PH-6": { name: "Same in every phase strip" },

  // Item popup (a decision, risk, research item or part of the system)
  "IT-1": { name: "Popup header" },
  "IT-2": { name: "Details" },
  "IT-3": { name: "Extra (connections or replacement)" },
  "IT-4": { name: "Related links" },

  // Reference popup (opens from any id)
  "RF-1": { name: "Kind and close button" },
  "RF-2": { name: "Title and explanation" },
  "RF-3": { name: "Open the whole phase button" },
  "RF-4": { name: "Related list" },
  "RF-5": { name: "Back button" },

  // Script popup (opens from a script button)
  "SC-1": { name: "Script name" },
  "SC-2": { name: "How to run it" },
  "SC-3": { name: "Script text" },
} as const satisfies Record<string, UiRefEntry>;

export type UiRefId = keyof typeof UI_REFS;

/** The shape every id must have: a known prefix, a dash, a number from 1 without leading zeros. */
export const UI_REF_ID = /^(HD|OV|RM|AR|DE|RE|QU|LO|PH|IT|RF|SC)-[1-9][0-9]*$/;

export function isUiRefId(id: string): id is UiRefId {
  return Object.prototype.hasOwnProperty.call(UI_REFS, id);
}

export function prefixOf(id: string): UiPrefix {
  return id.slice(0, id.indexOf("-")) as UiPrefix;
}

/** The tab, header or popup a block belongs to, in words ("Overview", "Phase popup"). */
export function scopeLabel(id: UiRefId): string {
  return UI_SCOPES[prefixOf(id)].label;
}

/**
 * Attributes that mark a block. For one item of a repeated group pass `index` (a fixed key from the
 * item itself, such as the phase number) and, optionally, a short `item` label ("P1"). `pos` moves
 * the label below the block or just inside its corner, where the default spot would collide or clip.
 */
export function ui(id: UiRefId, opts?: { index?: string | number; item?: string; pos?: "below" | "inside" }): Record<string, string> {
  const attrs: Record<string, string> = { "data-ui-ref": id };
  if (opts?.index !== undefined) attrs["data-ui-index"] = String(opts.index);
  if (opts?.item) attrs["data-ui-item"] = opts.item;
  // Where the label sits (app/globals.css): default just above the block; "below" it or just "inside" it.
  if (opts?.pos) attrs["data-ui-pos"] = opts.pos;
  return attrs;
}

export interface UiLabel {
  /** "OV-4" or "OV-4.1" */
  id: string;
  /** "Phase progress" or "Phase card P1" */
  name: string;
}

/** The label of a marked block, from its attributes. Null for an id that is not in the registry. */
export function uiLabel(ref: string, index?: string | null, item?: string | null): UiLabel | null {
  if (!isUiRefId(ref)) return null;
  const e: UiRefEntry = UI_REFS[ref];
  if (index === undefined || index === null || index === "") return { id: ref, name: e.name };
  const base = e.item ?? e.name;
  return { id: `${ref}.${index}`, name: item ? `${base} ${item}` : base };
}

/** What the chip shows: "OV-3 · What happens next". */
export function chipText(l: UiLabel): string {
  return `${l.id} · ${l.name}`;
}

/** What a click on the chip copies: "Overview › OV-3 What happens next". */
export function copyText(context: string, l: UiLabel): string {
  return `${context} › ${l.id} ${l.name}`;
}

/** The context of a popup block: "Phase popup (P1)", or just "Phase popup" without a detail. */
export function popupContext(prefix: "PH" | "IT" | "RF" | "SC", detail?: string | null): string {
  const label = UI_SCOPES[prefix].label;
  return detail ? `${label} (${detail})` : label;
}

export interface LayoutMapGroup {
  prefix: UiPrefix;
  label: string;
  rows: { id: UiRefId; name: string; item: string | null }[];
}

/** Every id with its name, grouped by header, tab and popup, in registry order (the Layout map). */
export function layoutMap(): LayoutMapGroup[] {
  const groups = new Map<UiPrefix, LayoutMapGroup>();
  for (const p of Object.keys(UI_SCOPES) as UiPrefix[]) groups.set(p, { prefix: p, label: UI_SCOPES[p].label, rows: [] });
  for (const [id, e] of Object.entries(UI_REFS) as [UiRefId, UiRefEntry][]) {
    groups.get(prefixOf(id))!.rows.push({ id, name: e.name, item: e.item ?? null });
  }
  return [...groups.values()].filter((g) => g.rows.length > 0);
}
