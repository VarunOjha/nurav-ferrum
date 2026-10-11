import { defineConfig } from "@playwright/test";

// One worker: the suite drives one Ferrum window at a time on fixed ports (CDP 9339, fixture server 8443).
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
});
