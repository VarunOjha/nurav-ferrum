import path from "node:path";
import fs from "node:fs";

export const here = import.meta.dirname;
export const repo = path.resolve(here, "..", "..", "..", "..");
export const fixtureExe = path.join(repo, "target", "debug", "fixture-server.exe");
export const ferrumExe = path.join(repo, "target", "debug", "ferrum-desktop.exe");
export const base = "https://localhost:8443";
/** The same test pages over plain HTTP (p4.17: the "not secure" bar). */
export const httpBase = "http://localhost:8080";
export const cdpPort = 9339;
export const caCert = path.join(process.env.LOCALAPPDATA ?? "", "Ferrum", "dev-ca", "ca-cert.pem");

/** A fresh data folder for this run (WebView2 profile data of the app under test; never the user's real one). */
export function dataDir(name: string): string {
  const d = path.join(here, ".data", `${name}-${process.pid}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
