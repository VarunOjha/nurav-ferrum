import { spawn } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import { fixtureExe, base, caCert } from "./paths.ts";

/** Starts the local HTTPS test server (task p2.1) for the whole run; global-teardown stops it with /__shutdown. */
export default async function globalSetup(): Promise<void> {
  if (!fs.existsSync(fixtureExe)) throw new Error(`build first: ${fixtureExe}`);
  // --exit-after is a safety net: the server stops by itself even if teardown never runs.
  const child = spawn(fixtureExe, ["serve", "--port", "8443", "--exit-after", "1800"], { stdio: "ignore", detached: false });
  child.unref();
  const ca = fs.readFileSync(caCert);
  for (let i = 0; i < 50; i++) {
    const ok = await new Promise<boolean>((resolve) => {
      https.get(`${base}/landing`, { ca }, (r) => { r.resume(); resolve(r.statusCode === 200); }).on("error", () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("fixture server did not start on 8443");
}
