/** The PowerShell 7 command that runs a script from the repo folder (no file access; client-safe). */
export const runCommand = (script: string): string => `pwsh -NoProfile -File ${script}`;

/**
 * True for the check scripts (task checks, phase gates and the gate runner): they only read, print
 * PASS, FAIL or NOT READY per step and write nothing unless -SaveEvidence is added. Other scripts, such
 * as scripts/start-portal.ps1, do something else and explain it in their own header.
 */
export const isCheckScript = (script: string): boolean =>
  /^scripts\/(verify|gates)\/[^/]+\.ps1$/.test(script) || script === "scripts/run-all-checks.ps1";
