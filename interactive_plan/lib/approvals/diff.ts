/**
 * "Diff since approval" (ip-routes-and-views §3.11; ip-testing §1.3): a line diff between an
 * approval snapshot (the normalised bytes that were hashed, ip-approvals-api §2.1 step 8) and the
 * current file. Pure. Both sides are line-ending normalised first (SCHEMA §10.2 N), so a CRLF
 * checkout never shows as a whole-file change.
 */
import { normalizeEol } from "./hash";

export type DiffOp = "equal" | "del" | "add";

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** 1-based line in the old (snapshot) text; absent for `add`. */
  oldLine?: number;
  /** 1-based line in the new (current) text; absent for `del`. */
  newLine?: number;
}

const toLines = (s: string | Uint8Array): string[] => {
  const text = typeof s === "string" ? s.replace(/\r\n?/g, "\n") : normalizeEol(s).toString("utf8");
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop(); // final LF ends the last line
  return text === "" ? [] : lines;
};

/** Longest-common-subsequence line diff (common prefix/suffix trimmed first). Deletions precede additions in a hunk. */
export function diffLines(oldText: string | Uint8Array, newText: string | Uint8Array): DiffLine[] {
  const a = toLines(oldText);
  const b = toLines(newText);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const am = a.slice(pre, a.length - suf);
  const bm = b.slice(pre, b.length - suf);
  const n = am.length;
  const m = bm.length;
  // lcs[i][j] = LCS length of am[i..] and bm[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = am[i] === bm[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  for (let k = 0; k < pre; k++) out.push({ op: "equal", text: a[k], oldLine: k + 1, newLine: k + 1 });
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && am[i] === bm[j]) {
      out.push({ op: "equal", text: am[i], oldLine: pre + i + 1, newLine: pre + j + 1 });
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push({ op: "del", text: am[i], oldLine: pre + i + 1 });
      i++;
    } else {
      out.push({ op: "add", text: bm[j], newLine: pre + j + 1 });
      j++;
    }
  }
  for (let k = 0; k < suf; k++) {
    out.push({ op: "equal", text: a[a.length - suf + k], oldLine: a.length - suf + k + 1, newLine: b.length - suf + k + 1 });
  }
  return out;
}

/** Only the changed lines (`del` and `add`). */
export const changes = (d: DiffLine[]): DiffLine[] => d.filter((l) => l.op !== "equal");
