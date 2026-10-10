/**
 * Environment -> absolute paths (ip-spec §6). Pure apart from reading the env object it is given,
 * so tests can pass their own env and cwd. The portal only reads (adr-0023): plan/portal/*.json and
 * plan/approvals.json for the pages, wiki/ and STATUS.md for the wiki check (npm run lint:wiki).
 */
import path from "node:path";

export interface PlanConfig {
  /** Repo root (absolute). */
  repoRoot: string;
  /** wiki/ directory (absolute, read-only for the app). */
  wikiDir: string;
  /** Root STATUS.md (absolute, read-only). */
  statusFile: string;
  /** The plan/ directory (absolute): approvals.json and portal/. */
  dataDir: string;
  /** dataDir/approvals.json (absolute, read-only for the portal; Claude records approvals). */
  approvalsFile: string;
  /** dataDir/portal (absolute): the plain-language JSON the portal renders (adr-0024). */
  portalDir: string;
  /** PLAN_PORT (default 3417). */
  port: number;
}

type Env = Record<string, string | undefined>;

function abs(value: string | undefined, fallback: string, base: string): string {
  const v = value?.trim();
  return v ? path.resolve(base, v) : fallback;
}

export function getConfig(env: Env = process.env, cwd: string = process.cwd()): PlanConfig {
  const repoRoot = abs(env.PLAN_REPO_ROOT, path.resolve(cwd, ".."), cwd);
  const wikiDir = abs(env.PLAN_WIKI_DIR, path.join(repoRoot, "wiki"), cwd);
  const statusFile = abs(env.PLAN_STATUS_FILE, path.join(repoRoot, "STATUS.md"), cwd);
  const dataDir = abs(env.PLAN_DATA_DIR, path.join(repoRoot, "plan"), cwd);
  const portRaw = env.PLAN_PORT?.trim();
  const port = portRaw && /^[0-9]+$/.test(portRaw) ? Number(portRaw) : 3417;
  return {
    repoRoot,
    wikiDir,
    statusFile,
    dataDir,
    approvalsFile: path.join(dataDir, "approvals.json"),
    portalDir: path.join(dataDir, "portal"),
    port,
  };
}
