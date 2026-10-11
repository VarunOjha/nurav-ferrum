# RAW SOURCE — Owner request for a Claude design of the Ferrum browser UI (session s01, 2026-10-10)

> Immutable raw source. Transcribed by Claude on 2026-10-10. The owner's words are reproduced verbatim
> (typos preserved); the rest is Claude's note. Answers to the follow-up design questions go in later raw files.

---

## 1. Context

Earlier in the same chat the owner asked "Ferrum architecture is looking like a rust based browser. Is this a full
browser we are building." Claude answered that Ferrum is a lightweight shell around WebView2, not a full browser.
The owner replied (verbatim):

> But it is a lightweight browser using an existing engine. I will pass the site in the web bar and open any website.

Claude agreed: a lightweight browser on an existing engine (WebView2), open browsing with a blocklist, without
extensions, sync, password manager or bookmarks for now; some sites' sign-in may refuse embedded web views (not yet tested).

## 2. The request (verbatim)

> The application part of the design currently doesn't show how the browser will look like. Let's do a claude design for this? And let's add the claude design for this browser. Dark + light mode. Let's build it ? You need to show me several options and feel free to ask me questions. Feel to ask me questions in phases if that helps narrow the design. Some of the design inspiration can be taken for the Comet browser by perplexity

## 3. Claude's note

A design exploration on a Claude design canvas (mockups only). It is planning work in P0, not Ferrum application
code. The chosen design will later be linked from the Architecture view's Application group.
