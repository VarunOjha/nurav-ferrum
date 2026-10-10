/**
 * Per-request access to the portal data for server components. React `cache()` dedupes the load
 * inside one request (layout + page + every RichText); loadPortal() itself re-reads only changed files.
 */
import { cache } from "react";
import { getConfig } from "../config";
import { loadPortal, type Portal } from "./load";
import { buildRefData, compilePatterns, type RefData } from "./refs";
import { namedScripts, readNamedScript, scriptHeader } from "./scripts";

export const getPortal = cache((): Promise<Portal> => loadPortal(getConfig()));

/** Explainer lookup for the reference popup (serialisable, handed to the client provider). */
export const getRefData = cache(async (): Promise<RefData> => buildRefData((await getPortal()).files.refs));

/** The id patterns of pipeline.json, compiled once per request. */
export const getPatterns = cache(async (): Promise<RegExp[]> => compilePatterns((await getPortal()).files.pipeline?.id_patterns ?? []));

/** The check scripts the portal text names (the only scripts the portal will show). */
export const getNamedScripts = cache(async (): Promise<string[]> => namedScripts((await getPortal()).files));

/** The plain explanation at the top of a named check script, or null (missing, not named, no header). */
export const getScriptHeader = cache(async (rel: string): Promise<string | null> => {
  const r = readNamedScript(getConfig().repoRoot, rel, await getNamedScripts());
  return r.ok ? scriptHeader(r.text) : null;
});
