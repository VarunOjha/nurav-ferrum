// @vitest-environment jsdom
// Mermaid component (ip-testing §1.7): the error path shows the source and the message (mermaid
// mocked); the configuration is strict; a node naming a page is wired to /go/<id>. Real rendering is
// covered by the Playwright wiki spec.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));
vi.mock("mermaid", () => ({ default: mermaidMock }));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import Mermaid, { applyMinScale, MIN_SCALE, nodeIdOf, stripExternalResources } from "@/components/Mermaid";

beforeEach(() => {
  mermaidMock.initialize.mockReset();
  mermaidMock.render.mockReset();
  document.documentElement.removeAttribute("data-theme");
});
afterEach(cleanup);

describe("Mermaid", () => {
  it("shows the source and the error message when rendering fails, without throwing", async () => {
    mermaidMock.render.mockRejectedValue(new Error("Parse error on line 2"));
    const src = "flowchart LR\n  a -->";
    const { container } = render(<Mermaid source={src} />);
    await waitFor(() => expect(container.querySelector('[data-state="error"]')).not.toBeNull());
    expect(screen.getByText("Parse error on line 2")).toBeTruthy();
    expect(container.querySelector(".mermaid-error pre")!.textContent).toBe(src);
  });

  it("also handles a non-Error rejection", async () => {
    mermaidMock.render.mockRejectedValue("bad diagram");
    const { container } = render(<Mermaid source="x" />);
    await waitFor(() => expect(container.querySelector('[data-state="error"]')).not.toBeNull());
    expect(screen.getByText("bad diagram")).toBeTruthy();
  });

  it("initialises mermaid with securityLevel strict, dagre, classic and the app theme", async () => {
    mermaidMock.render.mockResolvedValue({ svg: "<svg><g class='node' id='flowchart-a-0'></g></svg>" });
    document.documentElement.setAttribute("data-theme", "dark");
    const { container } = render(<Mermaid source={"flowchart LR\n a"} />);
    await waitFor(() => expect(container.querySelector('[data-state="rendered"]')).not.toBeNull());
    expect(mermaidMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: "strict", layout: "dagre", look: "classic", theme: "dark" }),
    );
  });

  it("re-renders with the default theme when the app theme changes to light", async () => {
    mermaidMock.render.mockResolvedValue({ svg: "<svg></svg>" });
    document.documentElement.setAttribute("data-theme", "dark");
    render(<Mermaid source={"flowchart LR\n a"} />);
    await waitFor(() => expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" })));
    await act(async () => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    await waitFor(() => expect(mermaidMock.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "default" })));
  });

  it("toggles the source view", async () => {
    mermaidMock.render.mockResolvedValue({ svg: "<svg></svg>" });
    const { container } = render(<Mermaid source={"flowchart LR\n a"} />);
    await waitFor(() => expect(container.querySelector('[data-state="rendered"]')).not.toBeNull());
    const btn = screen.getByRole("button", { name: "Show source" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Hide source" }).getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".mermaid-source")!.textContent).toBe("flowchart LR\n a");
  });

  it("wires nodes that name a page: focusable link with a tooltip", async () => {
    mermaidMock.render.mockResolvedValue({
      svg: '<svg><g class="node" id="flowchart-comp_core-0"><rect></rect></g><g class="node" data-id="other"></g></svg>',
    });
    const { container } = render(<Mermaid source={"flowchart LR\n comp_core --> other"} nodeLinks={{ comp_core: "comp-core" }} />);
    await waitFor(() => expect(container.querySelector("g.mmd-link")).not.toBeNull());
    const g = container.querySelector("g.mmd-link")!;
    expect(g.getAttribute("tabindex")).toBe("0");
    expect(g.getAttribute("role")).toBe("link");
    expect(g.getAttribute("aria-label")).toBe("Open comp-core");
    expect(g.querySelector("title")!.textContent).toContain("comp-core");
    expect(container.querySelectorAll("g.mmd-link")).toHaveLength(1);
    fireEvent.keyDown(g, { key: "Enter" });
    fireEvent.click(g);
    expect(push.mock.calls).toEqual([["/go/comp-core"], ["/go/comp-core"]]);
  });

  it("nodeIdOf reads data-id, else the flowchart element id", () => {
    const a = document.createElementNS("http://www.w3.org/2000/svg", "g");
    a.setAttribute("data-id", "x_y");
    const b = document.createElementNS("http://www.w3.org/2000/svg", "g");
    b.setAttribute("id", "flowchart-comp_core-12");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const d = document.createElementNS("http://www.w3.org/2000/svg", "g");
    d.setAttribute("id", "mmdR1einpfiv5b-1-flowchart-comp_fixture_shell-0");
    expect([nodeIdOf(a), nodeIdOf(b), nodeIdOf(c), nodeIdOf(d)]).toEqual(["x_y", "comp_core", null, "comp_fixture_shell"]);
  });

  // IP-9 review: mermaid strict keeps <img src> in HTML labels (beacon to another host observed).
  it("strips external images and URLs from the rendered SVG before insertion", async () => {
    mermaidMock.render.mockResolvedValue({
      svg:
        '<svg viewBox="0 0 1000 200"><foreignObject><div><img src="http://127.0.0.1:3473/beacon.png?leak=1"><span>label</span></div></foreignObject>' +
        '<image href="https://evil.example/x.png"></image><image href="data:image/png;base64,AAAA"></image>' +
        '<a href="https://evil.example/">x</a><use href="#arrow"></use><rect style="fill: url(https://evil.example/p.svg); stroke: url(#grad)"></rect></svg>',
    });
    const { container } = render(<Mermaid source={"flowchart LR\n a"} />);
    await waitFor(() => expect(container.querySelector('[data-state="rendered"]')).not.toBeNull());
    const html = container.querySelector(".mermaid-svg")!.innerHTML;
    expect(html).not.toContain("beacon.png");
    expect(html).not.toContain("evil.example");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("image")).toHaveLength(1);
    expect(container.querySelector("use")!.getAttribute("href")).toBe("#arrow");
    expect(container.querySelector("rect")!.getAttribute("style")).toContain("url(#grad)");
    expect(html).toContain("label");
  });

  it("stripExternalResources drops srcset images and protocol-relative sources", () => {
    const out = stripExternalResources('<svg><img src="data:image/png;base64,AA" srcset="//x.example/a.png 2x"><img src="//x.example/b.png"></svg>');
    expect(out).not.toContain("x.example");
    expect(out).not.toContain("<img");
  });

  it("keeps wide diagrams at MIN_SCALE of their viewBox width (the holder scrolls)", async () => {
    mermaidMock.render.mockResolvedValue({ svg: '<svg viewBox="0 0 3000 400" style="max-width: 3000px"></svg>' });
    const { container } = render(<Mermaid source={"flowchart LR\n a"} />);
    await waitFor(() => expect((container.querySelector(".mermaid-svg svg") as SVGSVGElement | null)?.style.minWidth).toBe(`${3000 * MIN_SCALE}px`));
    const bare = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    applyMinScale(bare);
    expect(bare.style.minWidth).toBe("");
  });
});
