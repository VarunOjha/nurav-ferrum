// Unit + component tests (ip-testing §0, §1). The real-wiki lint suite (tests/lint) has its own
// config (vitest.lint.config.mts, IP-5) and E2E runs under Playwright (tests/e2e).
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/lint/**", "tests/e2e/**", "node_modules/**"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      // ip-testing §1.6 targets, enforced by `npm run test:coverage` (IP-9): a glob below its
      // threshold fails the run. Plain `npm test` collects no coverage.
      thresholds: {
        "lib/approvals/**": { lines: 90, branches: 90 },
        "lib/wiki/**": { lines: 80, branches: 80 },
        "lib/lint/**": { lines: 80, branches: 80 },
      },
    },
  },
});
