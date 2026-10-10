// Masked labels for machine addresses printed by the bind probe (adr-0027). Evidence files are committed,
// so a test must never print a real IP address. The label comes from the repo-root `.env.local-map`
// (gitignored; lines `MASK=real`, e.g. LAN_IPV4_1=192.0.2.10 -> <LAN_IPV4_1>), the same map
// tools/mask.ps1 uses. An address the map does not know gets a numbered stand-in (<IPV4_1>, <IPV6_1>,
// <LINK_LOCAL_IPV6_1>), so the real value is never printed even without a map.
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

export interface MaskEntry {
  key: string;
  value: string;
}

/** Parses map text: `MASK=real` per line, `#` comments and blank lines ignored, malformed lines skipped. */
export function parseMaskMap(text: string): MaskEntry[] {
  const out: MaskEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (/^[A-Z][A-Z0-9_]*$/.test(key) && value !== "") out.push({ key, value });
  }
  return out;
}

/** Reads `<repoRoot>/.env.local-map`; an absent or unreadable map gives no entries. */
export function loadMaskMap(repoRoot = path.resolve(process.cwd(), "..")): MaskEntry[] {
  const file = path.join(repoRoot, ".env.local-map");
  try {
    return existsSync(file) ? parseMaskMap(readFileSync(file, "utf8")) : [];
  } catch {
    return [];
  }
}

/** Returns a function that turns an address (link-local IPv6 may carry `%scope`) into its masked label. */
export function addressLabeler(entries: MaskEntry[]): (address: string) => string {
  const exact = new Map<string, string>();
  const prefixes: [string, string][] = [];
  for (const e of entries) {
    if (e.key.endsWith("_PREFIX")) prefixes.push([e.value.toLowerCase(), e.key.slice(0, -"_PREFIX".length)]);
    else exact.set(e.value.toLowerCase(), e.key);
  }
  const assigned = new Map<string, string>();
  const counters = new Map<string, number>();
  return (address: string) => {
    const [bare, scope] = address.split("%");
    const lower = bare.toLowerCase();
    const suffix = scope !== undefined ? `%${scope}` : "";
    const known = exact.get(lower) ?? prefixes.find(([p]) => lower.startsWith(p))?.[1];
    if (known) return `<${known}>${suffix}`;
    let label = assigned.get(lower);
    if (!label) {
      const kind = net.isIPv4(bare) ? "IPV4" : lower.startsWith("fe80") ? "LINK_LOCAL_IPV6" : "IPV6";
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      label = `<${kind}_${n}>`;
      assigned.set(lower, label);
    }
    return `${label}${suffix}`;
  };
}
