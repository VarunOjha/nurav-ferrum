// lib/config.ts: env -> absolute paths (ip-spec §6).
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/lib/config";

const cwd = path.resolve("/tmp/repo root/interactive_plan");

describe("getConfig", () => {
  it("defaults are relative to the app directory's parent", () => {
    const c = getConfig({}, cwd);
    const root = path.resolve("/tmp/repo root");
    expect(c).toEqual({
      repoRoot: root,
      wikiDir: path.join(root, "wiki"),
      statusFile: path.join(root, "STATUS.md"),
      dataDir: path.join(root, "plan"),
      approvalsFile: path.join(root, "plan", "approvals.json"),
      portalDir: path.join(root, "plan", "portal"),
      port: 3417,
    });
  });

  it("environment overrides (relative values resolve against cwd)", () => {
    const c = getConfig(
      {
        PLAN_REPO_ROOT: "/x",
        PLAN_WIKI_DIR: "fixtures/wiki",
        PLAN_STATUS_FILE: "/s/STATUS.md",
        PLAN_DATA_DIR: "/d",
        PLAN_PORT: "3418",
      },
      cwd,
    );
    expect(c.repoRoot).toBe(path.resolve("/x"));
    expect(c.wikiDir).toBe(path.resolve(cwd, "fixtures/wiki"));
    expect(c.statusFile).toBe(path.resolve("/s/STATUS.md"));
    expect(c.approvalsFile).toBe(path.join(path.resolve("/d"), "approvals.json"));
    expect(c.portalDir).toBe(path.join(path.resolve("/d"), "portal"));
    expect(c.port).toBe(3418);
  });

  it("PLAN_REPO_ROOT moves the derived defaults; junk values fall back", () => {
    const c = getConfig({ PLAN_REPO_ROOT: "/r", PLAN_PORT: "80a", PLAN_WIKI_DIR: "  " }, cwd);
    expect(c.wikiDir).toBe(path.join(path.resolve("/r"), "wiki"));
    expect(c.port).toBe(3417);
  });
});
