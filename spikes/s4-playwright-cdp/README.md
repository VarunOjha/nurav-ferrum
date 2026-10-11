# Spike S4: Playwright over CDP (P1, task p1.8)

Throw-away experiment, never shipped. It answers risk-r06: can one Node/TypeScript Playwright harness
drive Ferrum's model (spike S1: Tauri + WebView2 with child web views) and Chrome / Edge through the same
CDP path? Report: `wiki/raw/evidence/phase-p1-foundation/spike-s4-playwright-cdp.md`.

```powershell
npm install                 # playwright 1.64.0, @puppeteer/browsers 3.2.4 (exact pins)
npm run get-cft             # Chrome for Testing into .browsers/ (git-ignored)
npm run check               # needs spike S1 built (spikes/s1-multiwebview); writes out/results.json, targets.json
```

`run.ts` runs on Node 24's built-in TypeScript type stripping (no build step). It starts spike S1 with
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` and a self-exit timer, and starts Chrome for
Testing and Edge with fresh profiles under `profiles/` (git-ignored, never committed). Nothing is killed: S1 exits
by itself and the browsers are closed with the CDP command `Browser.close`. Run it from a **non-elevated** shell:
elevated apps ignore WebView2's environment-variable flags.
