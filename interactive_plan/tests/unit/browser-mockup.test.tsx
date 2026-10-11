// @vitest-environment jsdom
// "How the browser will look" (owner's choice of 2026-10-10, option A): the static picture of the
// planned Ferrum window. It is one image for screen readers with nothing to click or focus inside; it
// starts on the portal's theme; the Light / Dark switch swaps the two design palettes (copied exactly
// from the design source); it shows the parts the owner chose, with sample values only; and
// architecture.json's optional "browser_design" block is checked by the generated schema.
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BrowserMockup, { BrowserWindow, DESIGN_H, DESIGN_W, MOCKUP_LABEL, PALETTES, paletteVars } from "@/components/portal/BrowserMockup";
import { ArchitectureFile } from "@/lib/portal/schemas.gen";
import { uiLabel } from "@/lib/portal/uiRefs";
import { REPO_ROOT } from "./helpers";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

const mockup = () => screen.getByTestId("browser-mockup");
const win = () => mockup().querySelector(".bm-window") as HTMLElement;
const switchBtn = (t: "light" | "dark") => screen.getByTestId("mockup-theme").querySelector(`[data-mock-theme="${t}"]`) as HTMLButtonElement;

describe("BrowserMockup", () => {
  it("is one image with a plain summary and nothing inside to click or focus", () => {
    render(<BrowserMockup />);
    expect(mockup().getAttribute("role")).toBe("img");
    expect(mockup().getAttribute("aria-label")).toBe(MOCKUP_LABEL);
    expect(MOCKUP_LABEL).toMatch(/sample values only/);
    expect(mockup().querySelectorAll("button, a, input, select, textarea, [tabindex], h1, h2, h3, main, aside, nav")).toHaveLength(0);
    for (const svg of mockup().querySelectorAll("svg")) expect(svg.getAttribute("aria-hidden"), svg.outerHTML).toBe("true");
  });

  it("draws the window at the design size, 1440 x 900", () => {
    expect([DESIGN_W, DESIGN_H]).toEqual([1440, 900]);
  });

  it("starts on the portal theme (light) and the switch swaps the palettes", () => {
    render(<BrowserMockup />);
    expect(mockup().getAttribute("data-mock")).toBe("light");
    expect(switchBtn("light").getAttribute("aria-pressed")).toBe("true");
    expect(switchBtn("dark").getAttribute("aria-pressed")).toBe("false");
    expect(win().style.getPropertyValue("--bm-strip")).toBe(PALETTES.light.strip);
    fireEvent.click(switchBtn("dark"));
    expect(mockup().getAttribute("data-mock")).toBe("dark");
    expect(switchBtn("dark").getAttribute("aria-pressed")).toBe("true");
    expect(win().style.getPropertyValue("--bm-strip")).toBe(PALETTES.dark.strip);
    expect(win().style.getPropertyValue("--bm-accent")).toBe("#EC8A5C");
    fireEvent.click(switchBtn("light"));
    expect(mockup().getAttribute("data-mock")).toBe("light");
  });

  it("starts dark when the portal is dark", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<BrowserMockup />);
    expect(mockup().getAttribute("data-mock")).toBe("dark");
    expect(switchBtn("dark").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the two palettes of the design source exactly", () => {
    const keys = ["strip", "toolbar", "tabActive", "text", "body", "muted", "faint", "border", "pill", "page", "pageLine", "pageBlock", "panel", "card", "track", "accent", "accentSoft", "onAccent", "good", "sleep", "warn"];
    expect(Object.keys(PALETTES.light)).toEqual(keys);
    expect(Object.keys(PALETTES.dark)).toEqual(keys);
    expect(PALETTES.light).toMatchObject({ strip: "#E8E6E1", accent: "#A8471B", sleep: "#3F55A3", warn: "#8A5A00", faint: "#B5B1AA" });
    expect(PALETTES.dark).toMatchObject({ strip: "#141414", accent: "#EC8A5C", sleep: "#A3B1E6", warn: "#E9B872", onAccent: "#1A1A1A" });
    expect(paletteVars(PALETTES.light)).toMatchObject({ "--bm-tab-active": "#FFFFFF", "--bm-page-line": "#ECEAE5", "--bm-on-accent": "#FFFFFF" });
  });

  it("shows the parts of option A with the sample values of the design", () => {
    render(<BrowserWindow theme="light" />);
    const tabs = document.querySelectorAll(".bm-tab");
    expect(tabs).toHaveLength(4);
    // Sleeping tabs show a moon and grey text.
    const sleeping = document.querySelectorAll(".bm-tab[data-sleeping]");
    expect(sleeping).toHaveLength(2);
    for (const t of sleeping) {
      expect(t.classList.contains("bm-tab-sleeping")).toBe(true);
      expect(t.querySelector(".bm-moon")).not.toBeNull();
    }
    expect(document.querySelectorAll(".bm-caption-btn")).toHaveLength(3);
    expect(document.querySelector(".bm-address-text")?.textContent).toBe("example.org/getting-started");
    expect(document.querySelector(".bm-badge")?.textContent).toBe("2");
    const panel = screen.getByTestId("mockup-panel");
    expect(within(panel).getByText("Ferrum")).toBeTruthy();
    expect([...panel.querySelectorAll(".bm-stat-label")].map((e) => e.textContent)).toEqual(["All tabs", "CPU", "Sleeping"]);
    for (const h of ["TABS · MEMORY", "BLOCKED ON THIS PAGE", "NETWORK LOG · THIS TAB"]) expect(within(panel).getByText(h)).toBeTruthy();
    expect(within(panel).getByText("Idle · goes to sleep in 4 min")).toBeTruthy();
    expect(panel.querySelectorAll(".bm-log-row")).toHaveLength(5);
    expect(within(panel).getByText("Addresses and sizes only, never page content")).toBeTruthy();
    expect(within(panel).getByText("Open log folder")).toBeTruthy();
    // No AI assistant: the owner chose Ferrum's own panel.
    expect(document.body.textContent).not.toMatch(/\bAI\b|assistant|Ask anything/i);
  });

  it("marks the switch and the picture for Ref mode", () => {
    render(<BrowserMockup />);
    const marked = [...document.querySelectorAll("[data-ui-ref=AR-9]")].map((e) => uiLabel("AR-9", e.getAttribute("data-ui-index"), e.getAttribute("data-ui-item"))!.id);
    expect(marked).toEqual(["AR-9.1", "AR-9.2"]);
    // The label button goes into the marked element, so the role="img" box is never the marked one.
    expect(mockup().hasAttribute("data-ui-ref")).toBe(false);
  });
});

describe("architecture.json browser_design (generated schema)", () => {
  const real = JSON.parse(readFileSync(path.join(REPO_ROOT, "plan", "portal", "architecture.json"), "utf8").replace(/^﻿/, ""));
  const design = {
    title: "How the browser will look",
    summary: "Tabs on top, the website in the middle and Ferrum's own panel on the right.",
    decision: "adr-0001",
    canvas_url: "https://claude.ai/artifact/abc123",
    sample_note: "Every number, site and log line in the picture is a sample. Nothing is measured yet.",
    callouts: [{ label: "Sleeping tabs", text: "A moon and grey text show a tab that is asleep." }],
  };

  it("is optional and passes when well formed", () => {
    const without = structuredClone(real);
    delete without.browser_design;
    expect(ArchitectureFile.safeParse(without).success).toBe(true);
    expect(ArchitectureFile.safeParse({ ...real, browser_design: design }).success).toBe(true);
  });

  it("rejects a bad decision id, a link to another site, no callouts or an unknown key", () => {
    for (const bad of [
      { ...design, decision: "decision-1" },
      { ...design, canvas_url: "https://example.com/x" },
      { ...design, canvas_url: "http://claude.ai/artifact/x" },
      { ...design, callouts: [] },
      { ...design, extra: true },
    ]) {
      expect(ArchitectureFile.safeParse({ ...real, browser_design: bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
});
