// p4.15: the three isolation modes, each run on the same two-site fixture (site-a.localhost, site-b.localhost). In every
// mode a site writes a cookie, localStorage and IndexedDB, and the other site sees none of it (browsers keep sites
// apart by origin anyway). What the modes change is shown by a named profile: site A moved to profile "other" sees an
// empty store under per-site and per-site-udf (another profile; under per-site-udf also another folder), but its own
// data under shared (one profile for all; named profiles do not apply). The test pages report what they see in their
// title, because in per-site-udf a site's page runs in its own browser process, which the test cannot reach over CDP.
// The process inventory per mode (browser processes, helpers) is printed for the evidence file. A mode change applies
// after a restart, and an unknown mode is refused (Ferrum starts with the standard settings).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { launch, call, tabList, type Ferrum } from "./ferrum.ts";
import { dataDir } from "./paths.ts";

const A = "https://site-a.localhost:8443";
const B = "https://site-b.localhost:8443";
const stored = (v: string) => `stored c=${v} l=${v} i=${v}`;

type Inventory = {
  mode: string;
  environments: string[];
  tabs: { id: number; url: string; profile: string }[];
  processes: { pid: number; kind: string; frames: string[]; environment: string }[];
};
type View = Record<string, unknown> & { isolation: string; sites: { site: string; profile: string; permissions?: string[] }[] };

/** Opens `url` in a new tab and waits until its page has reported in the title; returns the tab id and the title. */
async function openAndRead(f: Ferrum, url: string): Promise<[number, string]> {
  const id = await call<number>(f, "tab_new", { url });
  let title = "";
  await expect.poll(async () => {
    title = (await tabList(f)).tabs.find((t) => t.id === id)?.title ?? "";
    return title.startsWith("stored ");
  }, { timeout: 30_000 }).toBe(true);
  return [id, title];
}
const profileOf = async (f: Ferrum, id: number) => (await tabList(f)).tabs.find((t) => t.id === id)?.profile;
async function close(f: Ferrum, id: number) {
  await call(f, "tab_close", { id });
  await expect.poll(async () => (await tabList(f)).tabs.some((t) => t.id === id)).toBe(false);
}
async function setSiteProfile(f: Ferrum, site: string, profile: string | null) {
  const v = await call<View>(f, "settings_get");
  v.sites = v.sites.filter((s) => s.site !== site);
  if (profile) v.sites.push({ site, profile });
  await call(f, "settings_set", { input: v });
}
const modeSettings = (mode: string) => `[isolation]\nmode = "${mode}"\n`;

const MODES = [
  { mode: "shared", cfg: "cfg-ferrum-shared-profile", profileA: "ferrum-default", otherSeparates: false },
  { mode: "per-site", cfg: "cfg-ferrum-profile-per-site", profileA: "site-site-a.localhost", otherSeparates: true },
  { mode: "per-site-udf", cfg: "cfg-ferrum-udf-per-site", profileA: "site-site-a.localhost", otherSeparates: true },
] as const;

for (const m of MODES) {
  test(`mode ${m.mode}: the two-site fixture shows the expected separation`, async () => {
    // perSite: the helper then adds no [isolation] table of its own; the mode comes from extraSettings.
    const f = await launch(`iso-${m.mode}`, { perSite: true, extraSettings: modeSettings(m.mode) });
    try {
      expect((await call<View>(f, "settings_get")).isolation).toBe(m.mode);
      // Site A writes; it reads its own data back.
      const [a1, ta1] = await openAndRead(f, `${A}/storage?auto=write:A1`);
      expect(ta1).toBe(stored("A1"));
      expect(await profileOf(f, a1)).toBe(m.profileA);
      // Site B, open at the same time, sees none of it.
      const [b1, tb1] = await openAndRead(f, `${B}/storage?auto=read`);
      expect(tb1).toBe(stored(""));
      // The process inventory with both sites open.
      const inv = await call<Inventory>(f, "test_processes");
      expect(inv.mode).toBe(m.mode);
      const browsers = inv.processes.filter((p) => p.kind === "browser");
      const kinds: Record<string, number> = {};
      for (const p of inv.processes) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
      const hosts = (site: string) => inv.processes.filter((p) => p.kind === "renderer" && p.frames.some((u) => u.startsWith(site)));
      if (m.mode === "per-site-udf") {
        // Tauri's environment (shell, empty tabs) plus one per open site, each with its own browser process.
        // The inventory lists environments in the order they answer, so compare without order (gate run 4).
        expect([...inv.environments].sort()).toEqual(["shell", "site-site-a.localhost", "site-site-b.localhost"]);
        expect(browsers.length).toBe(3);
        expect(new Set(browsers.map((p) => p.environment)).size).toBe(3);
        expect(hosts(A).every((p) => p.environment === "site-site-a.localhost")).toBe(true);
        expect(hosts(B).every((p) => p.environment === "site-site-b.localhost")).toBe(true);
        // The site folders exist on disk, next to the shell's.
        for (const s of ["site-site-a.localhost", "site-site-b.localhost"]) {
          expect(fs.existsSync(path.join(f.data, "udf", s))).toBe(true);
        }
      } else {
        expect(inv.environments).toEqual(["shell"]);
        expect(browsers.length).toBe(1);
        expect(fs.existsSync(path.join(f.data, "udf"))).toBe(false);
      }
      expect(hosts(A).length).toBeGreaterThan(0);
      expect(hosts(B).length).toBeGreaterThan(0);
      console.log("ISOLATION-MODE " + JSON.stringify({
        mode: m.mode, cfg: m.cfg, environments: inv.environments, browsers: browsers.length, kinds,
        processes: inv.processes.length,
        renderers_a: hosts(A).length, renderers_b: hosts(B).length,
        shared_renderers: hosts(A).filter((p) => hosts(B).includes(p)).length,
      }));
      await close(f, a1);
      await close(f, b1);
      // Site A in the named profile "other": an empty store where profiles separate, its own data under shared.
      await setSiteProfile(f, "site-a.localhost", "other");
      const [a2, ta2] = await openAndRead(f, `${A}/storage?auto=read`);
      expect(ta2).toBe(m.otherSeparates ? stored("") : stored("A1"));
      expect(await profileOf(f, a2)).toBe(m.otherSeparates ? "user-other" : "ferrum-default");
      if (m.mode === "per-site-udf") expect(fs.existsSync(path.join(f.data, "udf", "user-other"))).toBe(true);
      await close(f, a2);
      // Back in its own profile, the data is there again (the empty read was the other profile, not lost data).
      await setSiteProfile(f, "site-a.localhost", null);
      const [a3, ta3] = await openAndRead(f, `${A}/storage?auto=read`);
      expect(ta3).toBe(stored("A1"));
      await close(f, a3);
    } finally {
      await f.quit();
    }
  });
}

test("a mode change applies after a restart; an unknown mode is refused", async () => {
  const data = dataDir("iso-switch");
  // The run's settings live in the user settings file only, which Ferrum reads at start.
  const f1 = await launch("iso-switch", { data, perSite: true, userFileOnly: true, extraSettings: modeSettings("shared") });
  try {
    expect((await call<Inventory>(f1, "test_processes")).mode).toBe("shared");
  } finally {
    await f1.quit();
  }
  const userFile = path.join(data, "user-config.toml");
  const text = fs.readFileSync(userFile, "utf8");
  expect(text).toContain('mode = "shared"');
  fs.writeFileSync(userFile, text.replace('mode = "shared"', 'mode = "per-site-udf"'));
  const f2 = await launch("iso-switch", { data, perSite: true, userFileOnly: true });
  try {
    expect((await call<Inventory>(f2, "test_processes")).mode).toBe("per-site-udf");
    const [id] = await openAndRead(f2, `${A}/storage?auto=read`);
    expect(await profileOf(f2, id)).toBe("site-site-a.localhost");
    expect((await call<Inventory>(f2, "test_processes")).environments).toContain("site-site-a.localhost");
  } finally {
    await f2.quit();
  }
  // An unknown value in the user's settings file: that file is not used (a copy is kept aside); Ferrum runs with the
  // standard mode (a profile per site) and logs why. The run's own override file still applies, so the run keeps its
  // data folder.
  const badData = dataDir("iso-bad");
  fs.writeFileSync(path.join(badData, "user-config.toml"), `version = 3\n${modeSettings("per-site-udf-x")}`);
  const bad = await launch("iso-bad", { data: badData, perSite: true });
  try {
    expect((await call<Inventory>(bad, "test_processes")).mode).toBe("per-site");
    expect(readLogs(badData)).toMatch(/settings not used/);
    expect(fs.readdirSync(badData).some((n) => n.startsWith("user-config.toml.broken-"))).toBe(true);
  } finally {
    await bad.quit();
  }
});

/** Ferrum's own log files in the run's data folder (logs/*.log), joined. */
function readLogs(data: string): string {
  const dir = path.join(data, "logs");
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir).map((n) => fs.readFileSync(path.join(dir, n), "utf8")).join("\n");
}
