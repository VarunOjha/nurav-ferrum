# RAW SOURCE — Owner answer: frames of another site ask like in Chrome (session s07, 2026-10-15)

> Immutable raw source. Transcribed by Claude on 2026-10-15. Owner answer verbatim (Claude Code chat, AskUserQuestion).
> Follows: [2026-10-15-s07-p4-20-approvals.md](2026-10-15-s07-p4-20-approvals.md).

## 1. Context

While building p4.20, Claude stopped (the owner's rule: stop and tell before fixing) and reported: the live test of the
approved rule "a frame of another site gets no question" (adr-0034) failed. Observed with two temporary probe runs
(debug build, throwaway test folders):

- a frame of `site-a.localhost` inside a `localhost` page that did **not** delegate the permission: the page script got
  "denied" at once; no question; Ferrum's handler was not called (Chromium refused it itself);
- the same frame with the page's `allow="geolocation; clipboard-read"` attribute: WebView2 reported the request with the
  page's origin (`https://localhost:8443`), so Ferrum asked "localhost wants to know your location".

Claude's summary to the owner: Ferrum only learns the page's address, so the approved rule cannot hold as written;
Chrome works the same way (the page vouches for its frame and the question names the page).

## 2. The question

"A frame from another site can ask only when the page deliberately allows it, and the question then names the page
(Chrome works this way). What should Ferrum do?"

Options offered:

- "Like Chrome (Recommended)": "Keep it: the question names the page, which chose to let its frame ask; frames the page
  did not allow are still refused. Claude corrects the wording in decision 34 and the test (you re-approve decision 34)."
- "Stricter than Chrome": "Ferrum also tracks every frame's address and refuses such requests without a question. More
  engine code and testing; embedded video-call or map widgets would not work."

## 3. The owner's answer (verbatim)

> Like Chrome (Recommended)

## 4. Meaning recorded by Claude

Registered as Q-228 (asked and answered the same turn). adr-0034's "other-site frame" rule is corrected to what WebView2
does; the p4.20 test checks both cases. adr-0034 needs the owner's re-approval.
