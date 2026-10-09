/**
 * STATUS.md helpers (ip-data-contract §5.1, SCHEMA §6.16). The frontmatter itself is parsed and
 * validated by the loader like any page (type `status`).
 */
import { blankFencedCode } from "./links";

/**
 * Text of the body section whose heading contains "Next action" (case-insensitive), up to the next
 * heading of the same or a higher level; null when absent.
 */
export function nextActionSection(body: string): string | null {
  const lines = body.split("\n");
  const scan = blankFencedCode(body).split("\n");
  let start = -1;
  let depth = 0;
  for (let i = 0; i < scan.length; i++) {
    const m = /^(#{1,6})\s+(.*)$/.exec(scan[i]);
    if (!m) continue;
    if (start < 0) {
      if (/next action/i.test(m[2])) {
        start = i + 1;
        depth = m[1].length;
      }
    } else if (m[1].length <= depth) {
      return lines.slice(start, i).join("\n").trim();
    }
  }
  return start < 0 ? null : lines.slice(start).join("\n").trim();
}
