// Real-wiki suite (`npm run lint:wiki`, `npm run lint:wiki:json`, also part of `npm run verify`): the
// wiki lint (tests/lint/wiki-lint.test.ts, ip-wiki-lint §1) and the real-wiki loader test, both
// read-only over the real wiki/ and STATUS.md. Kept out of `npm test` so unit tests do not depend on
// wiki content (owner answer 2026-10-09, raw/owner/2026-10-09-s01-wave0c.md item 3). The gate report
// (tests/lint/gate-report.test.ts) has its own config, vitest.gate.config.mts (`npm run gate`).
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // The report is the output: print console output of passing tests too. Vitest 5 picks a minimal
    // reporter that hides it ("passed-only") when stdout is not a TTY (verified in IP-5).
    reporters: ["default"],
    silent: false,
    include: ["tests/lint/**/*.test.ts"],
    exclude: ["tests/lint/gate-report.test.ts", "node_modules/**"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
