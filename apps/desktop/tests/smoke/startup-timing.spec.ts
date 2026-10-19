// p5.6: the startup chain (owner's Q-115 answer): process created -> window visible -> the shell's first paint -> the
// first tab's first contentful paint -> its largest contentful paint. Ferrum starts with a fresh profile and the
// /landing fixture as its only start page. The paint times are read by the host through DevTools calls in an isolated
// world of each page (test_startup), never sent by page script. Every boundary must be present and in order.
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";

const START = "https://site-a.localhost:8443/landing";

type Startup = {
  tab: number;
  unix_ms: Record<string, number | null>;
  shell: Record<string, number | null>;
  page: Record<string, number | null>;
  marks: { type: string; t_ms: number; mark: string; tab: number | null }[] | null;
  error: string | null;
};

let f: Ferrum | undefined;

test.beforeAll(async () => {
  f = await launch("startup-timing", {
    extraSettings: `[session]\nrestore_on_startup = false\nstartup_urls = [${JSON.stringify(START)}]\n`,
  });
});

test.afterAll(async () => {
  await f?.quit();
});

test("every startup boundary is present and in order", async () => {
  test.setTimeout(90_000);
  const ferrum = f!;
  await expect.poll(async () => {
    const t = (await tabList(ferrum)).tabs;
    return t.length === 1 && t[0].url === START && !t[0].loading;
  }, { timeout: 30_000 }).toBe(true);
  await new Promise((r) => setTimeout(r, 1000)); // the largest-contentful-paint entry is final once the page is idle
  const s = await call<Startup>(ferrum, "test_startup");
  expect(s.error, JSON.stringify(s)).toBeNull();
  const marks = s.marks!;
  const at = (m: string) => marks.find((x) => x.mark === m)!.t_ms;
  expect(marks.map((m) => m.mark).sort()).toEqual(
    ["process_created", "shell_first_paint", "tab_first_contentful_paint", "tab_largest_contentful_paint", "window_visible"]);
  expect(at("process_created")).toBe(0);
  expect(at("window_visible")).toBeGreaterThan(0);
  expect(at("shell_first_paint")).toBeGreaterThan(0);
  expect(at("tab_first_contentful_paint")).toBeGreaterThanOrEqual(at("window_visible"));
  expect(at("tab_largest_contentful_paint")).toBeGreaterThanOrEqual(at("tab_first_contentful_paint"));
  expect(marks.filter((m) => m.mark.startsWith("tab_")).every((m) => m.tab === s.tab)).toBe(true);
  // the page's own reading: first paint, first contentful paint and largest contentful paint all exist
  expect(s.page.fcp).not.toBeNull();
  expect(s.page.lcp).not.toBeNull();
  expect(s.shell.first_paint ?? s.shell.fcp).not.toBeNull();
  console.log(`STARTUP: ${marks.map((m) => `${m.mark} ${m.t_ms} ms`).join(", ")} (fresh profile, debug build, start page /landing)`);
});
