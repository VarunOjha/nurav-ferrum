/**
 * Root CLAUDE.md for the schema page (ip-data-contract §6.2, SCHEMA §10.2): the bytes are read once,
 * and the hash shown and sent as `seen_bootstrap_hash` is the content_hash of exactly the text that is
 * rendered. Read-only.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentHash } from "../approvals/hash";
import type { PlanConfig } from "../config";

export interface Bootstrap {
  /** CLAUDE.md as text (UTF-8, BOM removed). */
  source: string;
  /** content_hash of the bytes read (SCHEMA §10.2). */
  hash: string;
}

export async function readBootstrap(cfg: Pick<PlanConfig, "repoRoot">): Promise<Bootstrap | null> {
  try {
    const bytes = await readFile(path.join(cfg.repoRoot, "CLAUDE.md"));
    return { source: bytes.toString("utf8").replace(/^﻿/, ""), hash: contentHash(bytes) };
  } catch {
    return null;
  }
}
