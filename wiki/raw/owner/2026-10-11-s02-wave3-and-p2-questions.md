# RAW SOURCE — Owner approves Approval Wave 3 and answers Q-109, Q-202, Q-214 (session s02, 2026-10-11 17:56)

> Immutable raw source. Transcribed by Claude on 2026-10-11. Owner answers verbatim (Claude Code AskUserQuestion).
> Follows: [2026-10-11-s02-p2-go-ahead.md](2026-10-11-s02-p2-go-ahead.md).

## 1. Questions and answers (verbatim)

| Question (Claude) | Owner answer |
|---|---|
| Do you approve the six phase 2 pages (Approval Wave 3): the phase 2 plan, decision 15 (navigation rules), and the app shell, view manager, security engine and website-content pages? | **"Approve all six (Recommended)"** |
| Google sign-in (Q-109): Google blocks sign-in inside embedded web views like Ferrum's, and Ferrum must never trick it. When a site sends you to Google sign-in, what should Ferrum do? | **"Offer a button (Recommended)"** (option text: "Ferrum shows a clear bar: 'Google sign-in must open in your normal browser' with an 'Open in browser' button; nothing happens without your click.") |
| Local test pages (Q-202): phase 2's tests load small local web pages. How should they be served? (Real certificate checks are never weakened in the shipped app.) | **"Local HTTPS certificate (Recommended)"** (option text: "Claude creates a development certificate authority and installs it into YOUR user certificate store (with your click), so tests run over real HTTPS on this PC only. Its private key stays on this PC, never in git.") |
| Settings file format (Q-214): Ferrum keeps its settings (start page, navigation rules, data folder) in a file you can edit. Which format? | **"TOML (Recommended)"** |

## 2. Meaning recorded by Claude

- Approved: adr-0015, comp-app-shell, comp-security-engine, comp-tab-content, comp-webview-manager, phase-p2-minimal-container.
- Q-109: detect the Google OAuth flow and show a bar with an "Open in browser" button; nothing opens without the user's click.
- Q-202: a local development CA, installed into the owner's user certificate store with his confirmation; fixtures over HTTPS
  on loopback; the CA private key stays on this PC and is never committed.
- Q-214: TOML (`config.toml`).
