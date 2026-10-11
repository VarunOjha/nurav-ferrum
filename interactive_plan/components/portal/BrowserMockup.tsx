"use client";
/**
 * "How the browser will look" (owner's choice of 2026-10-10, option A): a static picture of the Ferrum
 * browser window, rebuilt in HTML and CSS from the design canvas source (Main.dc.html, option A "side
 * panel"). Tabs across the top with the Windows 11 window buttons at the right; a toolbar with back,
 * forward, reload, the rounded address bar with a lock, the shield with its blocked count, the panel
 * button and the menu; the website in the middle; the Ferrum panel at the right (memory, CPU, sleeping
 * tabs, blocked sites, this tab's network log).
 *
 * Decorative only: nothing in it can be clicked or focused, and the whole picture is one image for
 * screen readers (role="img" with a summary). Every number, site and log line is a SAMPLE from the
 * design, not a measurement: Ferrum is not built yet.
 *
 * The picture is drawn at the design size, 1440 x 900, and scaled to the width of its box (a
 * ResizeObserver sets --bm-scale), so it fits from a 390 px phone to a wide screen. On narrow screens a
 * close-up of the Ferrum panel follows it, because the whole window is too small to read there. The "Light / Dark"
 * switch above it starts on the portal's own theme and then follows the owner's clicks. Both palettes
 * are copied exactly from the source's renderVals.
 */
import { useEffect, useRef, useState } from "react";
import { useEffectiveTheme, type Theme } from "@/components/theme";
import { ui } from "@/lib/portal/uiRefs";

export const DESIGN_W = 1440;
export const DESIGN_H = 900;

/** The two palettes of the design source (Main.dc.html, renderVals), unchanged. */
export const PALETTES = {
  dark: {
    strip: "#141414", toolbar: "#262626", tabActive: "#262626", text: "#ECEAE6", body: "#CFCBC4", muted: "#A9A59D", faint: "#5F5C57",
    border: "#383735", pill: "#1C1C1C", page: "#1A1A1A", pageLine: "#2C2B29", pageBlock: "#2E2D2B", panel: "#1F1F1F", card: "#262626",
    track: "#34332F", accent: "#EC8A5C", accentSoft: "#3D2A1F", onAccent: "#1A1A1A", good: "#7CC4A0", sleep: "#A3B1E6", warn: "#E9B872",
  },
  light: {
    strip: "#E8E6E1", toolbar: "#FFFFFF", tabActive: "#FFFFFF", text: "#1C1B19", body: "#3B3934", muted: "#5F5B54", faint: "#B5B1AA",
    border: "#DAD7D0", pill: "#F3F1ED", page: "#FFFFFF", pageLine: "#ECEAE5", pageBlock: "#EFEDE8", panel: "#FAF9F6", card: "#FFFFFF",
    track: "#ECE9E3", accent: "#A8471B", accentSoft: "#F7E7DD", onAccent: "#FFFFFF", good: "#2E6B4E", sleep: "#3F55A3", warn: "#8A5A00",
  },
} as const satisfies Record<Theme, Record<string, string>>;

type Palette = (typeof PALETTES)[Theme];

/** The palette as CSS custom properties (--bm-strip, --bm-text, ...), read by the .bm-* rules. */
export function paletteVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) out[`--bm-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = v;
  return out;
}

// Sample content of the design (all invented, nothing measured).
const TABS = [
  { title: "Getting started · example.org", letter: "E", active: true, sleeping: false },
  { title: "Weather · example.net", letter: "W", active: false, sleeping: false },
  { title: "Team notes · example.com", letter: "T", active: false, sleeping: true },
  { title: "Docs search · example.dev", letter: "D", active: false, sleeping: true },
];
const STATS = [
  { value: "289 MB", label: "All tabs" },
  { value: "1.2%", label: "CPU" },
  { value: "2", label: "Sleeping" },
];
type Bar = "accent" | "warn" | "sleep";
const MEM_TABS: { host: string; mem: string; w: string; bar: Bar; state: string; sleeping: boolean }[] = [
  { host: "example.org", mem: "182 MB", w: "74%", bar: "accent", state: "Active", sleeping: false },
  { host: "example.net", mem: "96 MB", w: "39%", bar: "warn", state: "Idle · goes to sleep in 4 min", sleeping: false },
  { host: "example.com", mem: "6 MB", w: "3%", bar: "sleep", state: "Sleeping", sleeping: true },
  { host: "example.dev", mem: "5 MB", w: "2%", bar: "sleep", state: "Sleeping", sleeping: true },
];
const BLOCKED = ["tracker.example-ads.net", "metrics.example-cdn.io"];
const NETLOG = [
  { method: "GET", host: "example.org/getting-started", status: "200", size: "18 KB" },
  { method: "GET", host: "example.org/app.css", status: "200", size: "42 KB" },
  { method: "GET", host: "images.example.org/hero.webp", status: "200", size: "210 KB" },
  { method: "POST", host: "tracker.example-ads.net/collect", status: "blocked", size: "—" },
  { method: "GET", host: "example.org/api/menu", status: "304", size: "0 KB" },
];

/** What a screen reader hears for the whole picture. */
export const MOCKUP_LABEL =
  "Picture of the planned Ferrum browser window, with sample values only. Tabs across the top, the sleeping ones with a moon; " +
  "a toolbar with back, forward, reload, a rounded address bar with a lock, a shield with 2 blocked sites, a panel button and a menu; " +
  "the website in the middle; and on the right the Ferrum panel: memory of all tabs, CPU, sleeping tabs, memory per tab, " +
  "sites blocked on this page and this tab's network log (addresses and sizes only, never page content).";

function Icon({ size, children, fill, stroke = "currentColor", width = 2, box = 24 }: {
  size: number;
  children: React.ReactNode;
  fill?: string;
  stroke?: string;
  width?: number;
  box?: number;
}) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox={`0 0 ${box} ${box}`} fill={fill ?? "none"} stroke={fill ? undefined : stroke} strokeWidth={fill ? undefined : width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const Close = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

/** The Ferrum panel (about 352 px wide in the design). Used inside the window and, on narrow screens, alone as a close-up. */
function FerrumPanel({ testId }: { testId: string }) {
  return (
    <div className="bm-panel" data-testid={testId}>
      <div className="bm-panel-head">
        <span className="bm-panel-title">Ferrum</span>
        <span className="bm-panel-close">
          <Close />
        </span>
      </div>
      <div className="bm-panel-body">
        <div className="bm-stats">
          {STATS.map((s) => (
            <div key={s.label} className="bm-stat">
              <span className="bm-stat-value">{s.value}</span>
              <span className="bm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="bm-section">
          <div className="bm-h3">TABS · MEMORY</div>
          {MEM_TABS.map((m) => (
            <div key={m.host} className="bm-mem">
              <div className="bm-mem-row">
                <span className="bm-mem-host">{m.host}</span>
                <span className="bm-mono bm-muted">{m.mem}</span>
              </div>
              <div className="bm-track">
                <div className={`bm-fill bm-fill-${m.bar}`} style={{ width: m.w }} />
              </div>
              <span className={m.sleeping ? "bm-state bm-state-sleep" : "bm-state"}>{m.state}</span>
            </div>
          ))}
        </div>

        <div className="bm-section bm-section-8">
          <div className="bm-h3">BLOCKED ON THIS PAGE</div>
          {BLOCKED.map((h) => (
            <div key={h} className="bm-blocked">
              <Icon size={14} stroke="var(--bm-accent)">
                <circle cx="12" cy="12" r="9" />
                <path d="M5.7 5.7l12.6 12.6" />
              </Icon>
              <span className="bm-mono bm-blocked-host">{h}</span>
            </div>
          ))}
        </div>

        <div className="bm-section bm-section-8">
          <div className="bm-h3">NETWORK LOG · THIS TAB</div>
          <div className="bm-log">
            {NETLOG.map((n) => (
              <div key={n.host} className="bm-log-row">
                <span className="bm-log-method">{n.method}</span>
                <span className="bm-log-host">{n.host}</span>
                <span className={n.status === "blocked" ? "bm-log-blocked" : "bm-log-ok"}>{n.status}</span>
                <span className="bm-log-size">{n.size}</span>
              </div>
            ))}
          </div>
          <div className="bm-log-foot">
            <span className="bm-log-note">Addresses and sizes only, never page content</span>
            <span className="bm-log-btn">Open log folder</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The window itself, at the design size (1440 x 900). Static: spans, no controls. */
export function BrowserWindow({ theme }: { theme: Theme }) {
  return (
    <div className="bm-window" data-theme-mock={theme} style={paletteVars(PALETTES[theme]) as React.CSSProperties}>
      <div className="bm-strip">
        <div className="bm-tabs">
          {TABS.map((t) => (
            <span key={t.letter} className={`bm-tab${t.active ? " bm-tab-active" : ""}${t.sleeping ? " bm-tab-sleeping" : ""}`} data-sleeping={t.sleeping || undefined}>
              <span className="bm-tab-icon">{t.letter}</span>
              <span className="bm-tab-title">{t.title}</span>
              {t.sleeping && (
                <span className="bm-moon">
                  <Icon size={14} stroke="var(--bm-sleep)">
                    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
                  </Icon>
                </span>
              )}
              <Close />
            </span>
          ))}
          <span className="bm-newtab">
            <Icon size={16}>
              <path d="M12 5v14M5 12h14" />
            </Icon>
          </span>
        </div>
        <div className="bm-caption">
          <span className="bm-caption-btn">
            <Icon size={12} box={12} width={1}>
              <path d="M1 6h10" />
            </Icon>
          </span>
          <span className="bm-caption-btn">
            <Icon size={12} box={12} width={1}>
              <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
            </Icon>
          </span>
          <span className="bm-caption-btn bm-caption-close">
            <Icon size={12} box={12} width={1}>
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
            </Icon>
          </span>
        </div>
      </div>

      <div className="bm-toolbar">
        <span className="bm-tool">
          <Icon size={18}>
            <path d="M15 18l-6-6 6-6" />
          </Icon>
        </span>
        <span className="bm-tool bm-tool-faint">
          <Icon size={18}>
            <path d="M9 18l6-6-6-6" />
          </Icon>
        </span>
        <span className="bm-tool">
          <Icon size={17}>
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </Icon>
        </span>
        <div className="bm-address-wrap">
          <span className="bm-address">
            <Icon size={14} stroke="var(--bm-good)">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </Icon>
            <span className="bm-address-text">example.org/getting-started</span>
          </span>
        </div>
        <span className="bm-tool bm-shield">
          <Icon size={18}>
            <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
          </Icon>
          <span className="bm-badge">2</span>
        </span>
        <span className="bm-tool bm-tool-on">
          <Icon size={18}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </Icon>
        </span>
        <span className="bm-tool">
          <Icon size={18} fill="currentColor">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </Icon>
        </span>
      </div>

      <div className="bm-body">
        <div className="bm-page">
          <div className="bm-site-nav">
            <span className="bm-logo" />
            <span>Home</span>
            <span>Docs</span>
            <span>Blog</span>
          </div>
          <div className="bm-article">
            <div className="bm-kicker">SAMPLE WEBSITE</div>
            <div className="bm-h1">Getting started</div>
            <p>
              This stands in for whatever website you open. Ferrum draws it with WebView2, the same engine Edge uses, so pages look and behave as they do
              there.
            </p>
            <div className="bm-hero" />
            <p>Everything around this area is Ferrum: the tabs, the address bar, the buttons and the panel on the right.</p>
          </div>
        </div>

        <FerrumPanel testId="mockup-panel" />
      </div>
    </div>
  );
}

/** What a screen reader hears for the close-up of the panel (narrow screens only). */
export const CLOSEUP_LABEL =
  "Close-up of the Ferrum panel from the picture above, with sample values only: memory of all tabs, CPU, sleeping tabs, " +
  "memory per tab with its state, sites blocked on this page and this tab's network log.";

/** Height of the panel in the design: the window (900) minus the tab strip (46) and the toolbar (52). */
export const PANEL_W = 352;
export const PANEL_H = DESIGN_H - 46 - 52;

/**
 * Scales a box drawn at `designW` pixels to the width of `ref` (--bm-scale). Until the first real
 * measurement the box has no data-ready, and CSS keeps the drawing hidden, so it never shows at a wrong
 * size (review 2026-10-10). A hidden box (width 0) waits for the ResizeObserver to report a width.
 */
function useFitScale(ref: React.RefObject<HTMLDivElement | null>, designW: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      el.style.setProperty("--bm-scale", String(w / designW));
      el.setAttribute("data-ready", "");
    };
    fit();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, designW]);
}

/** A small tag in the picture's corner, in portal colours, so even a cut-out of the picture says it is a sample. */
const SampleTag = () => (
  <span className="bm-sample-tag" aria-hidden="true">
    Sample values
  </span>
);

/**
 * The Light / Dark switch and the scaled picture. Starts on the portal's theme. `note` (the sample note)
 * sits directly under the picture. On narrow screens (CSS, max-width 900 px) a close-up of the Ferrum
 * panel follows, drawn at its design size 352 x 802 and scaled to the column, so its words stay readable.
 */
export default function BrowserMockup({ note }: { note?: React.ReactNode }) {
  const portalTheme = useEffectiveTheme();
  const [picked, setPicked] = useState<Theme | null>(null);
  const theme = picked ?? portalTheme;
  const frame = useRef<HTMLDivElement>(null);
  const closeup = useRef<HTMLDivElement>(null);
  useFitScale(frame, DESIGN_W);
  useFitScale(closeup, PANEL_W);

  return (
    <div className="stack-12">
      <div className="bm-switch-row" {...ui("AR-9", { key: "switch" })}>
        <div role="group" aria-label="Colours of the picture" className="pill-row" data-testid="mockup-theme">
          {(["light", "dark"] as const).map((t) => (
            <button key={t} type="button" className="pill" aria-pressed={theme === t} data-mock-theme={t} onClick={() => setPicked(t)}>
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
      <div className="stack-12" {...ui("AR-9", { key: "mockup" })}>
        <div ref={frame} className="bm-frame" role="img" aria-label={MOCKUP_LABEL} data-testid="browser-mockup" data-mock={theme}>
          <BrowserWindow theme={theme} />
          <SampleTag />
        </div>
        {note}
        <div className="bm-closeup-wrap stack-8" data-testid="browser-closeup-wrap">
          <p className="small strong">The Ferrum panel, close up</p>
          <div ref={closeup} className="bm-frame bm-closeup-frame" role="img" aria-label={CLOSEUP_LABEL} data-testid="browser-closeup" data-mock={theme}>
            <div className="bm-closeup" style={paletteVars(PALETTES[theme]) as React.CSSProperties}>
              <FerrumPanel testId="mockup-panel-closeup" />
            </div>
            <SampleTag />
          </div>
        </div>
      </div>
    </div>
  );
}
