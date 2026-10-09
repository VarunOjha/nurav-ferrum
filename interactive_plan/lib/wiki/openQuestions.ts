/**
 * ov-open-questions register parsing (ip-data-contract §5.3, SCHEMA §6.1, §9.3 Q-FORMAT).
 * Fail closed: a malformed section is reported as Q-FORMAT and treated as open and blocking every
 * phase (`blocksAll: true`). The rules match tools/approvals_check.py (`questions()`).
 */
import { blankFencedCode } from "./links";
import { finding, type LintFinding } from "./findings";

export const Q_HEADING = /^## (Q-\d{3}) (.+)$/;
export const Q_FIELD = /^- (asked|blocking|status|answer):\s*(.*)$/;
export const Q_STATUSES = ["open", "answered", "withdrawn"] as const;
export type QStatus = (typeof Q_STATUSES)[number];

/** Inline list of ids (`[]` allowed); `#` is allowed for `<phase-id>#exit` keys. Same as approvals_check.py. */
const BLOCKING_LIST = /^\[\s*(?:[a-z0-9#.-]+\s*(?:,\s*[a-z0-9#.-]+\s*)*)?\]$/;

export interface OpenQuestion {
  id: string;
  title: string;
  asked: string | null;
  /** Effective status: `open` whenever the section is malformed (fail closed). */
  status: QStatus;
  blocking: string[];
  /** True when the section is malformed: the gate evaluator treats it as blocking every phase. */
  blocksAll: boolean;
  answer: string | null;
  /** 1-based file line of the `## Q-NNN` heading. */
  line: number;
}

export function parseOpenQuestions(
  body: string,
  repoPath = "wiki/overview/ov-open-questions.md",
  bodyStartLine = 1,
): { questions: OpenQuestion[]; findings: LintFinding[] } {
  const lines = blankFencedCode(body).split("\n");
  const questions: OpenQuestion[] = [];
  const findings: LintFinding[] = [];
  const seen = new Set<string>();
  type Sec = { id: string; title: string; line: number; fields: Record<string, string[]> };
  const sections: Sec[] = [];
  let cur: Sec | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      const m = Q_HEADING.exec(line);
      cur = m ? { id: m[1], title: m[2], line: bodyStartLine + i, fields: {} } : null;
      if (cur) sections.push(cur);
      continue;
    }
    if (!cur) continue;
    const f = Q_FIELD.exec(line);
    if (f) (cur.fields[f[1]] ??= []).push(f[2].trim());
  }
  for (const s of sections) {
    const bad: string[] = [];
    const st = s.fields.status ?? [];
    const bl = s.fields.blocking ?? [];
    if (st.length !== 1) bad.push(st.length === 0 ? "no `- status:` line" : "`- status:` repeated");
    else if (!(Q_STATUSES as readonly string[]).includes(st[0])) bad.push(`unknown status ${JSON.stringify(st[0])}`);
    let blocking: string[] | null = null;
    if (bl.length === 1 && BLOCKING_LIST.test(bl[0])) {
      blocking = bl[0]
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x !== "");
    } else {
      bad.push(bl.length === 0 ? "no `- blocking:` line" : bl.length > 1 ? "`- blocking:` repeated" : `unparsable blocking ${JSON.stringify(bl[0])}`);
    }
    if (seen.has(s.id)) bad.push("duplicate question id");
    seen.add(s.id);
    if (bad.length > 0) {
      findings.push(
        finding("Q-FORMAT", repoPath, `${s.id}: ${bad.join("; ")} (treated as open, blocking every phase)`, {
          line: s.line,
        }),
      );
    }
    questions.push({
      id: s.id,
      title: s.title,
      asked: s.fields.asked?.[0] ?? null,
      status: bad.length > 0 ? "open" : (st[0] as QStatus),
      blocking: blocking ?? [],
      blocksAll: bad.length > 0,
      answer: s.fields.answer?.[0] ?? null,
      line: s.line,
    });
  }
  return { questions, findings };
}
