// Real-wiki suite (`npm run lint:wiki`, also part of `npm run verify`): tests that read the real
// wiki/ and STATUS.md (read-only). Kept out of `npm test` so unit tests do not depend on wiki content
// (owner answer 2026-10-09, raw/owner/2026-10-09-s01-wave0c.md item 3). IP-5 adds the wiki lint
// (tests/lint/wiki-lint.test.ts) and its report to this suite (ip-wiki-lint §1).
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/lint/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
