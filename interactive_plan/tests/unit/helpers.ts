import path from "node:path";
import { loadWiki, type WikiIndex } from "@/lib/wiki/load";

/** interactive_plan/ */
export const APP_DIR = path.resolve(__dirname, "..", "..");
/** Repo root (read-only for tests). */
export const REPO_ROOT = path.resolve(APP_DIR, "..");
export const REAL_WIKI = path.join(REPO_ROOT, "wiki");
export const REAL_STATUS = path.join(REPO_ROOT, "STATUS.md");
export const FIXTURES = path.join(APP_DIR, "tests", "fixtures");
export const MINI_WIKI = path.join(FIXTURES, "mini-wiki");
export const MINI_STATUS = path.join(FIXTURES, "status", "STATUS.md");
export const BROKEN_WIKI = path.join(FIXTURES, "broken-wiki");

export function loadMini(): Promise<WikiIndex> {
  return loadWiki({ wikiDir: MINI_WIKI, statusFile: MINI_STATUS, repoRoot: FIXTURES });
}

export function loadBroken(): Promise<WikiIndex> {
  return loadWiki({ wikiDir: BROKEN_WIKI, statusFile: path.join(BROKEN_WIKI, "no-STATUS.md"), repoRoot: FIXTURES });
}

/** Builds a page from frontmatter lines and a body, LF endings. */
export function page(fmLines: string[], body = "# T\n"): Buffer {
  return Buffer.from("---\n" + fmLines.map((l) => l + "\n").join("") + "---\n" + body, "utf8");
}

export const codes = (fs: { code: string }[]) => fs.map((f) => f.code).sort();
