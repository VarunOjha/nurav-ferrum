// @vitest-environment jsdom
// Markdown component (ip-testing §1.7): GFM tables, relative link rewriting, raw HTML rendered as
// text and never executed (verifies the react-markdown claim of ip-routes-and-views §3.7), plus the
// IP-6 link, heading, integrity-tag and CONTRADICTION rules.
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Mermaid client component is exercised in mermaid.test.tsx; here it is a marker element.
vi.mock("@/components/Mermaid", () => ({
  default: ({ source, nodeLinks }: { source: string; nodeLinks?: Record<string, string> }) => (
    <div data-testid="mermaid" data-links={JSON.stringify(nodeLinks ?? null)}>
      {source}
    </div>
  ),
}));

import Markdown, { mermaidNodeLinks } from "@/components/Markdown";

const FILES = new Set(["decisions/adr-0001-x.md", "phases/phase-p1-foundation.md", "raw/", "raw/research/note.md", "SCHEMA.md"]);
const exists = (p: string) => FILES.has(p);

function md(source: string, path = "phases/phase-p1-foundation.md", knownIds?: ReadonlySet<string>) {
  return render(<Markdown source={source} path={path} exists={exists} knownIds={knownIds} />).container;
}

declare global {
  interface Window {
    __pwned?: number;
  }
}

beforeEach(() => {
  window.__pwned = 0;
});
afterEach(cleanup);

describe("Markdown: GFM", () => {
  it("renders a GFM table inside a scroll container", () => {
    const c = md("| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n");
    const table = c.querySelector(".table-wrap > table");
    expect(table).not.toBeNull();
    expect([...table!.querySelectorAll("th")].map((x) => x.textContent)).toEqual(["a", "b"]);
    expect([...table!.querySelectorAll("tbody tr")].map((r) => r.textContent)).toEqual(["12", "34"]);
  });

  it("renders strikethrough and task lists", () => {
    const c = md("~~old~~\n\n- [x] done\n- [ ] todo\n");
    expect(c.querySelector("del")?.textContent).toBe("old");
    expect(c.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });
});

describe("Markdown: links", () => {
  it("rewrites a relative link to /wiki/<resolved path> and keeps the anchor", () => {
    const c = md("[adr](../decisions/adr-0001-x.md#decision)");
    const a = c.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("/wiki/decisions/adr-0001-x.md#decision");
    expect(a.className).not.toContain("link-missing");
  });

  it("resolves links relative to the page directory, including ./ and directory links", () => {
    const c = md("[self](./phase-p1-foundation.md) [raw](../raw/) [schema](../SCHEMA.md)");
    expect([...c.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/wiki/phases/phase-p1-foundation.md",
      "/wiki/raw",
      "/wiki/SCHEMA.md",
    ]);
  });

  it("keeps pure anchors", () => {
    const c = md("[top](#scope)");
    expect(c.querySelector("a")!.getAttribute("href")).toBe("#scope");
  });

  it("styles a link to a missing file as REF-DANGLING", () => {
    const c = md("[gone](../decisions/adr-0999-gone.md)");
    const a = c.querySelector("a")!;
    expect(a.className).toContain("link-missing");
    expect(a.getAttribute("title")).toBe("missing (REF-DANGLING)");
    expect(a.getAttribute("href")).toBe("/wiki/decisions/adr-0999-gone.md");
  });

  it("marks https links external with rel noreferrer noopener and an icon", () => {
    const c = md("[docs](https://example.org/x)");
    const a = c.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://example.org/x");
    expect(a.getAttribute("rel")).toBe("noreferrer noopener");
    expect(a.querySelector("svg.ext-icon")).not.toBeNull();
  });

  it("never renders javascript: links as links", () => {
    const c = md("[x](javascript:window.__pwned=1)");
    expect(c.querySelector("a")).toBeNull();
    expect(c.textContent).toContain("x");
  });

  it("renders repo files outside wiki/ as text, and STATUS.md as the dashboard", () => {
    const c = md("[claude](../../CLAUDE.md) [status](../../STATUS.md)");
    expect(c.querySelector(".link-outside")?.textContent).toBe("claude");
    expect(c.querySelector("a")!.getAttribute("href")).toBe("/");
  });
});

describe("Markdown: raw HTML is text, never executed", () => {
  it("renders a raw <script> block as literal text", () => {
    const c = md("Before\n\n<script>window.__pwned = 1</script>\n\nAfter\n");
    expect(c.querySelector("script")).toBeNull();
    expect(c.textContent).toContain("<script>window.__pwned = 1</script>");
    expect(window.__pwned).toBe(0);
  });

  it("renders inline HTML (img onerror, iframe) as text, creating no elements", () => {
    const c = md('x <img src=x onerror="window.__pwned=2"> y <iframe src="https://evil.example"></iframe>\n');
    expect(c.querySelector("img")).toBeNull();
    expect(c.querySelector("iframe")).toBeNull();
    expect(c.textContent).toContain('<img src=x onerror="window.__pwned=2">');
    expect(window.__pwned).toBe(0);
  });

  it("shows markdown images as alt-text placeholders (no requests)", () => {
    const c = md("![a diagram](https://example.org/x.png)");
    expect(c.querySelector("img")).toBeNull();
    expect(c.querySelector(".md-img-placeholder")?.textContent).toBe("[image: a diagram]");
  });
});

describe("Markdown: headings, mermaid, integrity markers", () => {
  it("shifts headings down one level and keeps rehype-slug ids", () => {
    const c = md("# Title\n\n## Scope (in)\n\n###### Deep\n");
    expect(c.querySelector("h1")).toBeNull();
    expect(c.querySelector("h2")!.id).toBe("title");
    expect(c.querySelector("h3")!.id).toBe("scope-in");
    expect(c.querySelector("h6")!.id).toBe("deep");
  });

  it("renders fenced mermaid through <Mermaid> with node links for page ids", () => {
    const src = 'flowchart LR\n  comp_core["Core"] --> other["X"]';
    const c = md("```mermaid\n" + src + "\n```\n", "phases/phase-p1-foundation.md", new Set(["comp-core"]));
    const m = c.querySelector('[data-testid="mermaid"]')!;
    expect(m.textContent).toBe(src);
    expect(JSON.parse(m.getAttribute("data-links")!)).toEqual({ comp_core: "comp-core" });
    expect(c.querySelector("pre")).toBeNull();
  });

  it("keeps other fenced code as <pre><code>", () => {
    const c = md("```ts\nconst a = 1;\n```\n");
    expect(c.querySelector("pre > code")?.textContent).toBe("const a = 1;\n");
  });

  it("mermaidNodeLinks maps only known page ids", () => {
    expect(mermaidNodeLinks("a_b --> c", new Set(["a-b"]))).toEqual({ a_b: "a-b" });
    expect(mermaidNodeLinks("a_b --> c", new Set(["x"]))).toBeUndefined();
    expect(mermaidNodeLinks("a_b", undefined)).toBeUndefined();
  });

  it("turns integrity tags into amber chips linking to the phase, not inside fenced code", () => {
    const c = md("Claim UNVERIFIED[phase-p2-minimal-container] here.\n\n```text\nUNVERIFIED[phase-p3-tabs-sessions]\n```\n");
    const chips = c.querySelectorAll("a.int-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0].getAttribute("href")).toBe("/go/phase-p2-minimal-container");
    expect(chips[0].textContent).toBe("UNVERIFIED[phase-p2-minimal-container]");
    expect(c.querySelector("pre")!.textContent).toContain("UNVERIFIED[phase-p3-tabs-sessions]");
  });

  it("gives CONTRADICTION blockquotes the red-border class", () => {
    const c = md("> **CONTRADICTION:** a says x, b says y.\n\n> plain quote\n");
    const q = c.querySelectorAll("blockquote");
    expect(q[0].className).toBe("contradiction");
    expect(q[1].className).toBe("");
  });
});
