// Gate report (ip-wiki-lint §4; `npm run gate`, own config vitest.gate.config.mts, not part of
// `npm run lint:wiki`). Prints the SCHEMA §9.7 entry-gate checklist of GATE_PHASE, or of
// STATUS.current_phase when GATE_PHASE is unset, and fails when the gate is not passed. Read-only.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { readApprovals } from "@/lib/approvals/file";
import type { Approvals } from "@/lib/approvals/model";
import { getConfig } from "@/lib/config";
import { gateReport } from "@/lib/lint/gateReport";
import { loadWiki } from "@/lib/wiki/load";
import { APP_DIR } from "../unit/helpers";

const fingerprint = (p: string) =>
  existsSync(p) ? `${statSync(p).mtimeMs}:${createHash("sha256").update(readFileSync(p)).digest("hex")}` : "absent";

it("entry gate of GATE_PHASE (default STATUS.current_phase) is passed", async () => {
  const cfg = getConfig(process.env, APP_DIR);
  const before = fingerprint(cfg.approvalsFile);
  const [idx, file] = await Promise.all([loadWiki(cfg), readApprovals(cfg.approvalsFile)]);
  const fromEnv = process.env.GATE_PHASE?.trim();
  const phase = fromEnv || idx.status?.current_phase;
  expect(phase, "GATE_PHASE unset and STATUS.md has no current_phase").toBeTruthy();
  const rel = path.relative(cfg.repoRoot, cfg.approvalsFile).split(path.sep).join("/");
  const r = gateReport(
    idx,
    {
      exists: file.exists,
      valid: file.valid,
      error: file.error,
      approvals: (file.valid && file.data ? file.data.approvals : {}) as Approvals,
      path: rel,
    },
    phase!,
    fromEnv ? "GATE_PHASE" : "STATUS.current_phase",
  );
  console.log(r.text);
  expect(fingerprint(cfg.approvalsFile)).toBe(before);
  expect(r.ok, r.text).toBe(true);
});
