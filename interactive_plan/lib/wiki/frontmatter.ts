/**
 * In-house frontmatter splitter + YAML subset enforcement (ip-data-contract §3).
 * Works on raw bytes; hashing (lib/approvals/hash.ts, IP-3) uses the raw bytes separately.
 */
import { isAlias, isMap, isNode, isScalar, parseAllDocuments, parseDocument, visit, Scalar } from "yaml";
import { finding, type LintFinding } from "./findings";

export const YAML_OPTIONS = { version: "1.2", schema: "core", uniqueKeys: true } as const;
export const VOLATILE_KEYS = ["status", "updated", "last_verified_commit"] as const;

/** N(bytes) from SCHEMA §10.2: CRLF -> LF, then lone CR -> LF. Nothing else. */
export function normalizeEol(buf: Uint8Array): Buffer {
  const out = Buffer.allocUnsafe(buf.length);
  let j = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x0d) {
      out[j++] = 0x0a;
      if (buf[i + 1] === 0x0a) i++;
    } else out[j++] = b;
  }
  return out.subarray(0, j);
}

export interface ParsedFile {
  /** True when an opening and a closing fence were both found. */
  hasFrontmatter: boolean;
  /** YAML text between the fences (LF-normalised, BOM stripped), or null. */
  yamlText: string | null;
  /** Parsed YAML (plain JS) before zod; null when absent or unparsable. */
  rawFm: unknown;
  /** Markdown after the closing fence (or the whole text when there is no frontmatter). */
  body: string;
  /** 1-based file line number of the first body line. */
  bodyStartLine: number;
  findings: LintFinding[];
}

export interface ParseOptions {
  /** Repo-relative path used in findings. */
  repoPath: string;
  /** false for raw files that need no frontmatter (no FM-MISSING / FILE-ENCODING findings). */
  requireFrontmatter?: boolean;
}

/** Converts any Date the parser might return back to YYYY-MM-DD (UTC), recursively. */
export function datesToStrings(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(datesToStrings);
  if (v !== null && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = datesToStrings(x);
    return o;
  }
  return v;
}

const lineOf = (text: string, offset: number) => text.slice(0, offset).split("\n").length;

export function parseFrontmatterBytes(bytes: Uint8Array, opts: ParseOptions): ParsedFile {
  const { repoPath } = opts;
  const require = opts.requireFrontmatter !== false;
  const findings: LintFinding[] = [];
  let b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    if (require) findings.push(finding("FILE-ENCODING", repoPath, "UTF-8 BOM present (SCHEMA §5)"));
    b = b.subarray(3);
  }
  const n = normalizeEol(b);
  if (require) {
    if (n.length === 0 || n[n.length - 1] !== 0x0a) {
      findings.push(finding("FILE-ENCODING", repoPath, "file does not end with a newline (needs exactly one \\n)"));
    } else if (n.length >= 2 && n[n.length - 2] === 0x0a) {
      findings.push(finding("FILE-ENCODING", repoPath, "file ends with more than one \\n (needs exactly one)"));
    }
  }
  const text = n.toString("utf8");
  const noFm = (message: string | null): ParsedFile => {
    if (message && require) findings.push(finding("FM-MISSING", repoPath, message, { line: 1 }));
    return { hasFrontmatter: false, yamlText: null, rawFm: null, body: text, bodyStartLine: 1, findings };
  };
  if (!text.startsWith("---\n")) return noFm("no frontmatter: the file must start with a `---` line");
  const close = text.indexOf("\n---\n", 3);
  if (close < 0) return noFm("frontmatter has no closing `---` line");
  const yamlText = text.slice(4, close + 1);
  const body = text.slice(close + 5);
  const bodyStartLine = lineOf(text, close + 5);
  const result: ParsedFile = { hasFrontmatter: true, yamlText, rawFm: null, body, bodyStartLine, findings };
  if (!require) {
    // Raw files: best-effort parse for display only, no findings.
    const d = parseDocument(yamlText, YAML_OPTIONS);
    if (d.errors.length === 0) result.rawFm = datesToStrings(d.toJS());
    return result;
  }
  const all = parseAllDocuments(yamlText, YAML_OPTIONS);
  if (Array.isArray(all) && all.length > 1) {
    findings.push(finding("FM-YAML-SUBSET", repoPath, "multi-document YAML stream in frontmatter", { line: 2 }));
    findings.push(finding("FM-MISSING", repoPath, "frontmatter is not a single YAML document", { line: 2 }));
    return result;
  }
  const doc = parseDocument(yamlText, YAML_OPTIONS);
  if (doc.errors.length > 0) {
    for (const e of doc.errors) {
      const line = e.linePos?.[0]?.line;
      findings.push(
        finding("FM-MISSING", repoPath, `YAML error ${e.code}: ${e.message.split("\n")[0]}`, {
          line: line !== undefined ? line + 1 : 2,
        }),
      );
    }
    return result;
  }
  // YAML subset (SCHEMA §5): no anchors, aliases or explicit tags.
  visit(doc, {
    Node(_key, node) {
      const at = node.range ? lineOf(yamlText, node.range[0]) + 1 : 2;
      if (isAlias(node)) {
        findings.push(finding("FM-YAML-SUBSET", repoPath, `alias *${node.source} is not allowed`, { line: at }));
      } else if (isNode(node)) {
        if (node.anchor) {
          findings.push(finding("FM-YAML-SUBSET", repoPath, `anchor &${node.anchor} is not allowed`, { line: at }));
        }
        if (node.tag) {
          findings.push(finding("FM-YAML-SUBSET", repoPath, `explicit tag ${node.tag} is not allowed`, { line: at }));
        }
      }
    },
  });
  // Volatile keys (SCHEMA §5, §10.2): top-level single-line plain or quoted scalars.
  if (isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      const k = isScalar(pair.key) ? pair.key.value : undefined;
      if (typeof k !== "string" || !(VOLATILE_KEYS as readonly string[]).includes(k)) continue;
      const v = pair.value;
      const at = isNode(pair.key) && pair.key.range ? lineOf(yamlText, pair.key.range[0]) + 1 : 2;
      const okType =
        isScalar(v) && (v.type === Scalar.PLAIN || v.type === Scalar.QUOTE_DOUBLE || v.type === Scalar.QUOTE_SINGLE);
      const singleLine = isScalar(v) && v.range ? !yamlText.slice(v.range[0], v.range[1]).includes("\n") : false;
      if (!okType || !singleLine) {
        findings.push(
          finding("FM-VOLATILE", repoPath, `\`${k}\` must be a top-level single-line plain or quoted scalar`, {
            line: at,
          }),
        );
      }
    }
  }
  const js = doc.toJS();
  result.rawFm = datesToStrings(js === null || js === undefined ? {} : js);
  return result;
}
