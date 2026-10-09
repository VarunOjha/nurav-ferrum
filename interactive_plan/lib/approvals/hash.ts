/**
 * content_hash and scope_hash (ip-data-contract §6; SCHEMA §10.2). Must equal the SCHEMA §10.2
 * Python reference byte for byte: hashing works on raw bytes, never on decoded UTF-8 strings.
 * Cross-checked against that reference in tests/unit/hash.vectors.test.ts.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export type HashErrorCode = "NO_CLOSING_FENCE";

/** Thrown for a page that starts with `---\n` but has no closing fence (the Python reference raises ValueError). */
export class HashError extends Error {
  readonly code: HashErrorCode;
  constructor(code: HashErrorCode) {
    super(code);
    this.name = "HashError";
    this.code = code;
  }
}

export interface Hashes {
  /** `sha256:<64 hex>` of N(bytes). The normative hash. */
  content: string;
  /** `sha256:<64 hex>` of N(bytes) with the volatile frontmatter lines removed. */
  scope: string;
}

/** N(bytes): CRLF -> LF, then lone CR -> LF. Nothing else. */
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

/**
 * SCHEMA §10.2 `(?m)^(status|updated|last_verified_commit)[ \t]*:.*\n`. Applied to latin1 text (one
 * char per byte) after N(), so `.` matches every byte except `\n` exactly like Python's bytes regex
 * (`\r`, U+2028 and U+2029 cannot occur: CR is normalised away and latin1 stops at U+00FF).
 */
const VOLATILE = /^(status|updated|last_verified_commit)[ \t]*:.*\n/gm;

const sha = (b: Uint8Array) => "sha256:" + createHash("sha256").update(b).digest("hex");

export function hashes(raw: Uint8Array): Hashes {
  const n = normalizeEol(raw);
  const content = sha(n);
  let s: Buffer = n;
  if (n.subarray(0, 4).toString("latin1") === "---\n") {
    const idx = n.indexOf("\n---\n", 3, "latin1");
    if (idx < 0) throw new HashError("NO_CLOSING_FENCE");
    const end = idx + 1; // start of the closing fence line
    const fm = n.subarray(0, end).toString("latin1").replace(VOLATILE, "");
    s = Buffer.concat([Buffer.from(fm, "latin1"), n.subarray(end)]);
  }
  return { content, scope: sha(s) };
}

/** hashes() or null when the page is unhashable (ip-data-contract §6.3). Other errors propagate. */
export function tryHashes(raw: Uint8Array): Hashes | null {
  try {
    return hashes(raw);
  } catch (e) {
    if (e instanceof HashError) return null;
    throw e;
  }
}

/** content_hash only (no frontmatter handling): used for `bootstrap_hash` = content_hash of CLAUDE.md. */
export function contentHash(raw: Uint8Array): string {
  return sha(normalizeEol(raw));
}

/** Hashes of a file on disk (raw bytes). */
export async function hashFile(absPath: string): Promise<Hashes> {
  return hashes(await readFile(absPath));
}
