# RAW SOURCE — Owner decides how to fix the out-of-order MANIFEST line of commit ff7292e (session s03, 2026-10-13)

> Immutable raw source. Transcribed by Claude on 2026-10-13. Owner answer verbatim (Claude Code chat, AskUserQuestion).
> Follows: [2026-10-13-s03-p4-3-components-reapproval.md](2026-10-13-s03-p4-3-components-reapproval.md).

## 1. Context

`npm run lint:wiki` reports RAW-IMMUTABLE for commit ff7292e (task p4.1): it inserted the line for
`evidence/phase-p4-security/check-p4.1.txt` into `wiki/raw/MANIFEST.sha256` above the previous last line
(`owner/2026-10-13-s03-alt-tab-claim-reapproval.md`) instead of appending it. Every hash in the file is correct; only
the append-only rule was broken. Removing the finding needs a history rewrite, which only the owner may allow.

## 2. The question

"The wiki check found a slip of mine from earlier today (the threat-model commit). The evidence register is a list of
fingerprints that may only grow at the end, and I inserted one new line just above the last line instead. Every
fingerprint is still correct; only the order rule was broken. A true fix means rewriting that old commit, which needs
your permission. How should I handle it?"

Options offered: "Fix it in the history cleanup (Recommended)" ("Rewrite that commit during the history cleanup you
already have planned before the first GitHub upload. Until then the wiki check shows this one known error."),
"Record an exception now" and "Leave it as is".

## 3. The owner's answer (verbatim)

> Fix it in the history cleanup (Recommended)

## 4. Meaning recorded by Claude

The planned history rewrite before the first push (Q-221) also rewrites commit ff7292e so that its MANIFEST change only
appends. Until then lint:wiki reports this one known RAW-IMMUTABLE error; it is not dispositioned or hidden, and no
other raw-file finding is acceptable.
