# apps/desktop/ — the Ferrum app

The Tauri 2 application (P2 onwards; layout per adr-0018). Design: `wiki/architecture/components/comp-app-shell.md`.

| Path | What |
|---|---|
| `index.html`, `src/` | the trusted shell UI (vanilla TypeScript + Vite, adr-0006; look per adr-0028) |
| `package.json` | exact pins: @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3, vite 8.3.4, typescript 7.0.2 |
| `src-tauri/` | the Rust app crate `ferrum-desktop` (workspace member), `tauri.conf.json` (strict CSP), `capabilities/shell.json` (the shell only; no remote section) |

```powershell
npm install
npm run tauri -- build --no-bundle      # release build into ../../target/release/ferrum-desktop.exe
$env:FERRUM_EXIT_AFTER = 10             # test switch: the app closes itself after 10 s
```

Website views are WebView2 controllers Ferrum creates itself (adr-0029) and arrive in p2.6.
