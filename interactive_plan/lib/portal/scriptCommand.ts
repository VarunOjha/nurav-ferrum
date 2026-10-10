/** The PowerShell 7 command that runs a check script from the repo folder (no file access; client-safe). */
export const runCommand = (script: string): string => `pwsh -NoProfile -File ${script}`;
