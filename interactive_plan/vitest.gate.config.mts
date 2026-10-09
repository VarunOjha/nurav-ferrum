// Gate report (`npm run gate`, ip-wiki-lint §4): prints the SCHEMA §9.7 entry-gate checklist of
// GATE_PHASE (default STATUS.current_phase) and fails when the gate is not passed. Read-only.
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
    include: ["tests/lint/gate-report.test.ts"],
    testTimeout: 60_000,
  },
});
