import fs from "node:fs";
import https from "node:https";
import { base, caCert } from "./paths.ts";

/** Asks the test server to stop by itself (no kill). */
export default async function globalTeardown(): Promise<void> {
  const ca = fs.readFileSync(caCert);
  await new Promise<void>((resolve) => {
    https.get(`${base}/__shutdown`, { ca }, (r) => { r.resume(); r.on("end", () => resolve()); }).on("error", () => resolve());
  });
}
