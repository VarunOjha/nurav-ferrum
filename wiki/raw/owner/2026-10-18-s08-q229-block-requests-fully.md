# RAW SOURCE — Owner answers Q-229: requests to blocked sites are stopped fully (session s08, 2026-10-18)

> Immutable raw source. Transcribed by Claude on 2026-10-18. Owner answer verbatim (Claude Code chat,
> AskUserQuestion, one question). Follows: [2026-10-18-s08-p5-8-telemetry-reapproval.md](2026-10-18-s08-p5-8-telemetry-reapproval.md).

## 1. Context

While building p5.9 (network log), Claude found that a typed address refused by the blocklist is never shown, but its
request still reaches the server
([evidence](../evidence/phase-p5-telemetry/blocked-request-reaches-server-p5.9.txt)). Registered as Q-229.

## 2. The question and options (as asked)

Question: "A site on your blocked list never shows its page, but the request still reaches it. What should Ferrum do?"
Options: "Block it fully (Recommended)" ("Ferrum also stops the request itself, so nothing reaches a blocked site:
pages, frames and their images or scripts alike. Added as a security follow-up task, with a test that the server sees
no request and a check of the cost."), "Keep as is, document it" ("The page stays hidden, but the site may still see
one request. The security pages say so plainly.") and "Check other ways first" ("First test whether links, redirects
and frames do the same, then decide.").

## 3. The owner's answer (verbatim)

> Block it fully (Recommended)

## 4. Meaning recorded by Claude

Q-229 answered: Ferrum also stops requests to blocked sites at the network level, for pages, frames and their
sub-resources, as a security follow-up task with a test that the server sees no request and a cost check. Placement
chosen by Claude (not asked): a new task p5.15 in the current phase, before the P5 exit review, because P4 is closed;
this edits the P5 phase page, so the owner re-approves it.
