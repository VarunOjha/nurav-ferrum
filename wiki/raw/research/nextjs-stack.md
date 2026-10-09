---
id: research-nextjs-stack
type: research-note
title: Next.js stack for the interactive_plan dashboard (versions, config, risks)
updated: 2026-10-08
sources:
  - https://registry.npmjs.org/<pkg>/latest (22 packages + extras, queried 2026-10-08)
  - https://nodejs.org/dist/index.json
  - https://raw.githubusercontent.com/nodejs/Release/main/schedule.json
  - https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/o/OpenJS/NodeJS/LTS
  - https://nextjs.org/docs/app/getting-started/installation
  - https://nextjs.org/docs/app/api-reference/cli/create-next-app
  - https://nextjs.org/blog/next-16
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  - https://nextjs.org/docs/app/api-reference/file-conventions/route
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
  - https://nextjs.org/docs/app/guides/testing/vitest
  - https://nextjs.org/docs/app/guides/testing/playwright
  - https://raw.githubusercontent.com/vercel/next.js/v16.4.0/packages/create-next-app/templates/index.ts
  - https://github.com/mermaid-js/mermaid/releases (mermaid@12.0.0)
---

# Next.js stack for `interactive_plan/` — research note

> Immutable raw source (research). Access date for every source: **2026-10-08**.
> Status legend: **VERIFIED** = read directly in the cited primary source on 2026-10-08.
> **UNCERTAIN** = inference or not stated in a primary source; must be verified in the phase named.
> No application code has been written; nothing here is a measurement.

## 1. npm registry — current `latest` dist-tags (VERIFIED)

Source: `https://registry.npmjs.org/<pkg>/latest` (and full packument for dist-tags/dates), 2026-10-08.

| Package | latest | engines.node | Relevant peerDependencies |
|---|---|---|---|
| next | 16.4.0 (published 2026-10-06) | >=20.9.0 | react/react-dom `^18.2.0 \|\| ^19.0.0`; optional `@playwright/test ^1.51.1`, `sass`, `babel-plugin-react-compiler` |
| react | 19.3.0 | — | — |
| react-dom | 19.3.0 | — | react ^19.3.0 |
| typescript | **7.0.2** (published 2026-07-08; `next` tag 7.1.0-dev) | >=16.20.0 | — |
| @types/react | 19.3.0 | — | — |
| @types/react-dom | 19.3.0 | — | — |
| @types/node | 26.6.4 | — | — |
| tailwindcss | 4.3.3 | — | — |
| @tailwindcss/postcss | 4.3.3 | — | — |
| @tailwindcss/turbopack | 4.3.3 ("A Turbopack loader for Tailwind CSS v4") | — | — |
| @xyflow/react | 12.12.0 (2026-09-24) | — | react, react-dom, @types/react `>=17` |
| mermaid | **12.1.0** (12.0.0 released 2026-09-10; last 11.x = 11.17.2) | >=22.12.0 | — |
| gray-matter | 4.0.3 (last publish **2021-04-24**) | >=6.0 | — |
| yaml | 2.9.1 (2026-09-11) | — | — |
| zod | 4.6.5 (2026-09-13) | — | — |
| react-markdown | 10.1.0 (2025-03-07) | — | react >=18 |
| remark-gfm | 4.0.1 | — | — |
| rehype-slug | 6.0.0 | — | — |
| vitest | 5.0.3 | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | vite `^6.4 \|\| ^7 \|\| ^8` |
| vite | 8.3.4 | — | — |
| @vitejs/plugin-react | 6.1.2 | `^20.19.0 \|\| >=22.12.0` | vite ^8.0.0 |
| vite-tsconfig-paths | 6.1.1 | — | vite * |
| @testing-library/react | 16.3.3 | >=18 | react/react-dom ^18 \|\| ^19 |
| @testing-library/dom | 10.4.2 | — | — |
| @testing-library/jest-dom | 7.0.1 | >=22 | vitest >=0.32, @testing-library/dom >=10 <11 |
| jsdom | 30.1.2 | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | — |
| @playwright/test | 1.64.0 | >=20 | — |
| eslint | **10.12.0** (maintenance tag 9.39.5) | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | — |
| eslint-config-next | 16.4.0 | — | eslint >=9.0.0, typescript >=3.3.1 |
| @dagrejs/dagre | 3.1.1 | — | — |
| elkjs | 0.12.0 | — | — |

### 1.1 Compatibility conflicts found in registry metadata (VERIFIED metadata; install behaviour UNCERTAIN, verify in P1)

1. **TypeScript 7 vs typescript-eslint.** `eslint-config-next@16.4.0` depends on `typescript-eslint ^8.56.0`; `typescript-eslint@8.71.1` (latest) declares peer `typescript >=4.8.4 <6.1.0`. So `typescript@latest` (7.0.2) is **outside** the supported range. The create-next-app 16.4.0 template itself pins `typescript: "^5"` (source: templates/index.ts @ v16.4.0). Latest 5.x = 5.9.3; latest 6.x = 6.0.3.
2. **ESLint 10 vs eslint-config-next plugins.** `eslint-config-next@16.4.0` depends on `eslint-plugin-react ^7.37.0` (latest 7.37.5, peer eslint `... ^9.7`), `eslint-plugin-import` 2.32.0 (peer up to `^9`), `eslint-plugin-jsx-a11y` 6.10.2 (peer up to `^9`). So `eslint@latest` (10.x) is outside those peers. The template pins `eslint: "^9"`.
3. **@types/node.** Template pins `@types/node: "^20"`; latest is 26.x. Recommend matching the installed Node major (24) — UNCERTAIN whether any mismatch matters for this app (low risk).

**Implication:** do NOT blindly `npm i <pkg>@latest` for typescript/eslint. Use the versions create-next-app writes (`typescript ^5`, `eslint ^9`), then pin exact versions in `package-lock.json`.

## 2. Node.js (VERIFIED)

- Current LTS line: **v24 "Krypton"**, latest **v24.21.0** (2026-09-07), bundles npm 11.19.0. Current (non-LTS): v26.11.1 (2026-10-07). Source: nodejs.org/dist/index.json.
- Release schedule: **v26 enters LTS on 2026-10-28**; v24 moves to maintenance 2026-10-20, EOL 2028-04-30. Source: nodejs/Release schedule.json.
- **winget id `OpenJS.NodeJS.LTS` exists** in microsoft/winget-pkgs (`manifests/o/OpenJS/NodeJS/LTS`); highest manifest listed on 2026-10-08 is **24.20.0** (24.21.0 not yet present). Source: GitHub contents API.
- Next 16 minimum Node: **20.9** (installation doc + `engines`). Stricter floors in the stack: vitest 5 (`^22.12 || ^24 || >=26`), jsdom 30 (`^24.15.0` on the 24 line), mermaid 12 (`>=22.12`). Node 24.20/24.21 satisfies all.
- **Risk (UNCERTAIN):** after 2026-10-28 `winget install OpenJS.NodeJS.LTS` will presumably resolve to Node 26 rather than 24, so two machines/sessions may get different majors. Mitigation: record the exact installed version in the wiki, add `"engines": {"node": ">=24.15 <27"}` and `.nvmrc`, or install with `winget install -e --id OpenJS.NodeJS.LTS --version 24.20.0` (winget `--version` flag behaviour UNCERTAIN, verify in P1).

## 3. Next.js 16 facts (VERIFIED, docs version 16.4.0)

### 3.1 create-next-app
- Command: `npx create-next-app@latest [project-name] [options]`.
- `--yes` default setup: TypeScript, Tailwind CSS, ESLint, App Router, Turbopack, import alias `@/*`, `AGENTS.md`; recommended defaults also include **Cache Components** and (per CLI reference) **Agent feedback**.
- Flags (full list in source): `--ts`, `--js`, `--tailwind`, `--react-compiler`, `--cache-components` (default for App Router), `--eslint`, `--biome`, `--no-linter`, `--app`, `--api`, `--src-dir`, `--turbopack` (default), `--webpack`, `--import-alias <alias>`, `--empty`, `--use-npm|pnpm|yarn|bun`, `-e/--example`, `--example-path`, `--reset-preferences`, `--skip-install`, `--disable-git`, `--agents-md` (default), `--agent-feedback`, `--no-agent-feedback`, `--yes`; `--no-*` negates defaults.
- With Tailwind + Turbopack, the generator uses **`@tailwindcss/turbopack`** (not `@tailwindcss/postcss`), adds a `turbopack.rules["*.css"]` loader entry to `next.config.ts`, and omits `postcss.config.mjs` (source: templates/index.ts @ v16.4.0). → The brief's `@tailwindcss/postcss` is not what the 16.4 generator emits.
- Recommended invocation for this repo (inside repo root, which is already a git repo):
  `npx create-next-app@16.4.0 interactive_plan --ts --tailwind --eslint --app --turbopack --import-alias "@/*" --use-npm --disable-git --no-cache-components --no-agent-feedback --no-react-compiler`
  (flag set VERIFIED in reference; the combined command's behaviour is UNCERTAIN until run in P1. `--no-react-compiler`/`--no-src-dir` rely on documented `--no-*` negation.)

### 3.2 Breaking changes in v16 relevant to a small local app
- Turbopack is the default bundler for `next dev` and `next build`; opt out with `--webpack`.
- `next lint` removed; `next build` no longer lints. Use `eslint` directly via npm scripts; flat config `eslint.config.mjs`.
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async only.
- `middleware.ts` deprecated → `proxy.ts` (not needed here).
- Minimum TypeScript 5.1.0; browsers Chrome/Edge/Firefox 111+, Safari 16.4+.
- `next dev` and `next build` use separate output dirs; a lockfile prevents two `next dev`/`next build` instances on the same project (relevant for Playwright `webServer` + a manually-run dev server — they will collide).
- Parallel route slots require explicit `default.js`.
- `revalidateTag()` needs a second (cacheLife) argument.

### 3.3 Cache Components
- `cacheComponents: true` enables `use cache` and PPR; doc says to also set `partialPrefetching` explicitly or a warning is logged; requires Node runtime. It is a default in the create-next-app recommended preset.
- **Recommendation:** disable (`--no-cache-components`) for a local-only dashboard whose whole point is to always show the current state of `wiki/` and `plan/approvals.json`. How uncached `fs` reads behave under Cache Components (Suspense requirements / build errors) was NOT confirmed in the page read → UNCERTAIN; avoided by disabling.

### 3.4 Route Handlers for writing a local JSON file
- `app/**/route.ts` supports GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS; `request.json()` reads the body; segment config includes `export const runtime = 'nodejs'` and `export const dynamic`. Since v15 GET handlers are dynamic (not static) by default. (VERIFIED)
- Using `node:fs/promises` in a nodejs-runtime handler to write `../plan/approvals.json` is standard Node behaviour but not shown explicitly in the doc → UNCERTAIN (verify in P1 with an e2e test). Recommend atomic write (write temp file + `rename`), zod-validate the body, and refuse non-loopback requests (check `Host`/origin) since `next dev` binds to a network interface — exact default bind address UNCERTAIN; pass `-H 127.0.0.1` explicitly.

### 3.5 Reading files outside the app dir (`../wiki`, `../plan`)
- Turbopack: "Turbopack uses the root directory to resolve modules. **Files outside of the project root are not resolved.**" Root auto-detected via lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock(b)`); can be set via `turbopack.root` (absolute path). Don't set it too broad (watching cost). (VERIFIED)
  → Consequence: do **not** `import` markdown/JSON from `../wiki`; read it at runtime with `fs.readFile(path.resolve(process.cwd(), '..', 'wiki', ...))` in server components / route handlers. That runtime fs reads outside the root work under Turbopack in `next dev`/`next start` is UNCERTAIN (very likely, since it is plain Node I/O, not module resolution) → P1 spike test.
- `outputFileTracingRoot` / `outputFileTracingIncludes` only affect **build-time file tracing for deployment** (`.nft.json`, `output: 'standalone'`). (VERIFIED from caveats.) For a local app run in place with `next dev`/`next start`, they are not needed (UNCERTAIN-but-low-risk; required only if we ever use `standalone`).
- **Risk:** the repo root will later contain other Node projects (Playwright benchmark scripts, Q10) with their own lockfiles; Next may then mis-infer the workspace root (UNCERTAIN, known class of "multiple lockfiles" warning). Mitigation: set `turbopack.root: path.resolve(__dirname)` (the `interactive_plan` dir) explicitly and keep a lockfile inside `interactive_plan/`.
- Third-party search result (non-primary, UNCERTAIN): `process.cwd()` path patterns can produce "overly broad file pattern" tracing warnings; `turbopack.ignoreIssue` exists to suppress specific issues (https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackIgnoreIssue — not read directly).

### 3.6 Testing guidance (VERIFIED)
- Vitest guide installs: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`; config `vitest.config.mts` with `plugins: [tsconfigPaths(), react()]`, `test.environment: 'jsdom'`.
- **Vitest does not support async Server Components**; test those via E2E. → Design implication: put parsing/graph-building logic in pure TS modules (unit-testable), keep async server components thin.
- Playwright guide: recommends running E2E against a production build (`npm run build && npm run start`) or Playwright `webServer`.

## 4. Mermaid 12 (VERIFIED from release notes)
- 12.0.0 (2026-09-10) is a breaking release: ES2024 target, Safari 17.4+, Node 22.12+; **ELK is bundled and now the default layout** for flowchart/state/class/ER etc.; new default look/theme. To keep classic output set `layout: dagre`, `theme: default`, `look: classic`.
- Mermaid "requires a browser" (release notes) → render in a client component (dynamic import inside `useEffect`). WebView2/Edge 154 and Chrome 154 exceed Safari/ES2024 floors.
- Choice: 12.1.0 (newest, one month old major) vs 11.17.2 (mature). Recommend 12.x pinned exactly, with snapshot/e2e tests; fall back to 11.17.2 if rendering problems appear (decision for owner).

## 5. Recommended minimal stack (recommendation, not a fact)

| Concern | Choice | Pin |
|---|---|---|
| Runtime | Node 24 LTS (24.20+/24.21) | record exact |
| Framework | next 16.4.0, react/react-dom 19.3.0, App Router, Turbopack, **no** Cache Components, no React Compiler | exact |
| Language | typescript **5.9.3** (not 7.x; see §1.1) | exact |
| Styling | tailwindcss 4.3.3 + @tailwindcss/turbopack 4.3.3 (as generator emits) | exact |
| Lint | eslint **9.39.x** + eslint-config-next 16.4.0 (flat config) | exact |
| Graphs | @xyflow/react 12.12.0 for architecture graph, phase DAG, traceability; layout via @dagrejs/dagre 3.1.1 (simple) — elkjs optional | exact |
| Markdown | react-markdown 10.1.0 + remark-gfm 4.0.1 + rehype-slug 6.0.0; mermaid code fences → client `<Mermaid>` component | exact |
| Frontmatter | `yaml` 2.9.1 + ~10-line frontmatter splitter (gray-matter is unmaintained since 2021; still usable) | exact |
| Validation | zod 4.6.5 for wiki frontmatter, plan JSON and approvals API bodies | exact |
| Approvals API | `app/api/approvals/route.ts`, runtime nodejs, zod-validated POST, atomic write to `../plan/approvals.json`, loopback-only | — |
| Unit tests | vitest 5.0.3 + @vitejs/plugin-react 6.1.2 + vite-tsconfig-paths 6.1.1 + jsdom 30.1.2 + @testing-library/react 16.3.3 + @testing-library/dom 10.4.2 (+ optional @testing-library/jest-dom 7.0.1) | exact |
| E2E | @playwright/test 1.64.0, `webServer` = `next build && next start -H 127.0.0.1 -p <port>`, Chromium (+ `msedge` channel optional); approvals tests write to a temp copy via env var (e.g. `PLAN_DATA_DIR`) so tests never mutate the real `plan/approvals.json` | exact |

Compatibility of vitest 5 + vite 8 + plugin-react 6 together is satisfied by declared peers (VERIFIED metadata); actual run UNCERTAIN until P1.

## 6. Open items to verify in P1 (plan-app build phase)
1. `create-next-app@16.4.0` with the §3.1 flags produces the expected files on Windows (path with a space).
2. `fs` reads of `../wiki/**` from server components and writes to `../plan/approvals.json` from a route handler work under Turbopack dev and `next start`.
3. `npm install` resolves without ERESOLVE using typescript 5.9.3 + eslint 9.39.x.
4. Mermaid 12 renders inside a client component under React 19.3 / Next 16.4.
5. Node version actually installed by winget (24.x vs 26.x after 2026-10-28).
