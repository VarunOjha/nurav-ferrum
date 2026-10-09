// Hashes (ip-testing §1.3; ip-data-contract §6-§7; SCHEMA §10.2). The vectors are read from the
// fenced json block of ip-data-contract §7 at test time (single source of truth), and the Python
// reference is extracted from SCHEMA.md §10.2 and re-run on every vector and on generated inputs.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contentHash, HashError, hashes, hashFile, normalizeEol, tryHashes } from "@/lib/approvals/hash";
import { BROKEN_WIKI, loadBroken, REPO_ROOT } from "./helpers";

interface Vector {
  name: string;
  input: string;
  content_hash: string;
  scope_hash: string;
}

const CONTRACT = path.join(REPO_ROOT, "wiki", "interactive-plan", "ip-data-contract.md");
const SCHEMA_MD = path.join(REPO_ROOT, "wiki", "SCHEMA.md");

function readVectors(): Vector[] {
  const text = readFileSync(CONTRACT, "utf8").replace(/\r\n/g, "\n");
  const sec = text.slice(text.indexOf("\n## 7. "), text.indexOf("\n## 8. "));
  const m = /```json\n([\s\S]*?)```/.exec(sec);
  if (!m) throw new Error("no json block in ip-data-contract §7");
  return JSON.parse(m[1]) as Vector[];
}

/** The ```python block of SCHEMA.md §10.2, verbatim. */
function readPythonReference(): string {
  const text = readFileSync(SCHEMA_MD, "utf8").replace(/\r\n/g, "\n");
  const sec = text.slice(text.indexOf("\n### 10.2 Hashes"), text.indexOf("\n### 10.3 "));
  const m = /```python\n([\s\S]*?)```/.exec(sec);
  if (!m) throw new Error("no python block in SCHEMA §10.2");
  return m[1];
}

const vectors = readVectors();
const NO_FENCE = "---\nid: x\nno close\n";

describe("hash vectors (ip-data-contract §7)", () => {
  it("has the expected vector set (v01-v15, unique names)", () => {
    expect(vectors.map((v) => v.name.slice(0, 3))).toEqual(
      Array.from({ length: 15 }, (_, i) => "v" + String(i + 1).padStart(2, "0")),
    );
    expect(new Set(vectors.map((v) => v.name)).size).toBe(vectors.length);
  });

  it.each(vectors.map((v) => [v.name, v] as const))("%s: content and scope hash match exactly", (_n, v) => {
    const h = hashes(Buffer.from(v.input, "utf8"));
    expect(h.content).toBe(v.content_hash);
    expect(h.scope).toBe(v.scope_hash);
  });

  const by = (p: string) => vectors.find((v) => v.name.startsWith(p))!;
  it("pins the documented properties (LF = CRLF = mixed, volatile-only change keeps scope, body change does not)", () => {
    for (const p of ["v02", "v11"]) expect([by(p).content_hash, by(p).scope_hash]).toEqual([by("v01").content_hash, by("v01").scope_hash]);
    expect(by("v03").content_hash).not.toBe(by("v01").content_hash);
    expect(by("v03").scope_hash).toBe(by("v01").scope_hash);
    expect([by("v13").content_hash, by("v13").scope_hash]).toEqual([by("v03").content_hash, by("v01").scope_hash]);
    expect(by("v04").content_hash).not.toBe(by("v01").content_hash);
    expect(by("v04").scope_hash).not.toBe(by("v01").scope_hash);
    for (const p of ["v05", "v10", "v12"]) expect(by(p).scope_hash).toBe(by(p).content_hash);
  });

  it("throws HashError('NO_CLOSING_FENCE') for an opening fence without a closing one", () => {
    let err: unknown;
    try {
      hashes(Buffer.from(NO_FENCE));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(HashError);
    expect((err as HashError).code).toBe("NO_CLOSING_FENCE");
    expect(tryHashes(Buffer.from(NO_FENCE))).toBeNull();
    expect(hashes(Buffer.from("--- \nid: x\n")).scope).toBe(contentHash(Buffer.from("--- \nid: x\n"))); // not a fence
  });

  it("hashes raw bytes: a BOM is not stripped, and contentHash() equals hashes().content", () => {
    const v = Buffer.from(by("v01").input, "utf8");
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), v]);
    expect(hashes(bom).content).not.toBe(by("v01").content_hash);
    expect(hashes(bom).scope).toBe(hashes(bom).content); // BOM: no `---\n` at byte 0, so no frontmatter
    for (const x of vectors) expect(contentHash(Buffer.from(x.input, "utf8"))).toBe(x.content_hash);
  });

  it("latin1 decode/encode round-trips all 256 byte values (ip-data-contract §6.1 claim)", () => {
    const all = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    expect(Buffer.from(all.toString("latin1"), "latin1").equals(all)).toBe(true);
    expect(all.toString("latin1").length).toBe(256);
  });

  it("hashFile() hashes the file bytes; the loader leaves an unhashable page with null hashes", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ip3 hash "));
    try {
      const f = path.join(dir, "p.md");
      writeFileSync(f, Buffer.from(by("v02").input, "utf8"));
      expect(await hashFile(f)).toEqual({ content: by("v02").content_hash, scope: by("v02").scope_hash });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const idx = await loadBroken();
    const noFence = idx.pages.find((p) => p.path === "decisions/adr-0954--FM-MISSING.md")!;
    expect(readFileSync(path.join(BROKEN_WIKI, noFence.path), "utf8").startsWith("---\n")).toBe(true);
    expect([noFence.contentHash, noFence.scopeHash]).toEqual([null, null]);
  });
});

describe("normalizeEol (SCHEMA §10.2 N)", () => {
  const ref = (b: Buffer) => Buffer.from(b.toString("latin1").replace(/\r\n/g, "\n").replace(/\r/g, "\n"), "latin1");
  it("equals replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n') on 1,000 random arrays over {\\r, \\n, a, 0xFF}", () => {
    let seed = 0x1234567;
    const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 8) / 0x1000000;
    const alphabet = [0x0d, 0x0a, 0x61, 0xff];
    for (let k = 0; k < 1000; k++) {
      const len = Math.floor(rnd() * 41);
      const b = Buffer.from(Array.from({ length: len }, () => alphabet[Math.floor(rnd() * 4)]));
      expect(normalizeEol(b).equals(ref(b)), `case ${k}: ${b.toString("hex")}`).toBe(true);
    }
  });
  it("handles the edge cases explicitly", () => {
    const n = (s: string) => normalizeEol(Buffer.from(s, "latin1")).toString("latin1");
    expect(n("")).toBe("");
    expect(n("\r")).toBe("\n");
    expect(n("\r\n")).toBe("\n");
    expect(n("\r\r\n")).toBe("\n\n");
    expect(n("\n\r")).toBe("\n\n");
    expect(n("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });
});

// ---------------------------------------------------------------------------------------------
// Python cross-check (ip-testing §1.3). Skipped with a visible message only when python is absent;
// IP3_REQUIRE_PYTHON=1 (set by the IP-3 gate run) turns a missing python into a failure.

const py = spawnSync("python", ["--version"], { encoding: "utf8" });
const PYTHON = py.status === 0 ? (py.stdout || py.stderr).trim() : null;
if (!PYTHON) console.warn("[hash.vectors] python not found: the Python cross-check is SKIPPED (ip-testing §1.3)");

describe("python availability", () => {
  it(`python on PATH: ${PYTHON ?? "NOT FOUND"}`, () => {
    if (process.env.IP3_REQUIRE_PYTHON === "1") expect(PYTHON, "IP3_REQUIRE_PYTHON=1 but python is missing").not.toBeNull();
  });
});

describe.skipIf(!PYTHON)("Python cross-check against the SCHEMA §10.2 reference", () => {
  let dir: string;
  let refPy: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "ip3 pyref "));
    refPy = path.join(dir, "schema_10_2_reference.py");
    writeFileSync(refPy, readPythonReference());
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const runRef = (bytes: Uint8Array, name: string) => {
    const f = path.join(dir, name + ".md");
    writeFileSync(f, bytes);
    return spawnSync("python", [refPy, f], { encoding: "utf8" });
  };

  it("extracted the reference implementation verbatim from SCHEMA.md", () => {
    const code = readPythonReference();
    expect(code).toContain("rb'(?m)^(status|updated|last_verified_commit)[ \\t]*:.*\\n'");
    expect(code).toContain("b.index(b'\\n---\\n', 3) + 1");
  });

  it.each(vectors.map((v) => [v.name, v] as const))("%s: python reference = TS = expected", (name, v) => {
    const r = runRef(Buffer.from(v.input, "utf8"), name);
    expect(r.status, r.stderr).toBe(0);
    const [c, s] = r.stdout.trim().split(/\s+/);
    const ts = hashes(Buffer.from(v.input, "utf8"));
    expect([c, s]).toEqual([v.content_hash, v.scope_hash]);
    expect([ts.content, ts.scope]).toEqual([c, s]);
  });

  it("missing closing fence: python raises ValueError, TS throws HashError", () => {
    const r = runRef(Buffer.from(NO_FENCE), "no-fence");
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/ValueError/);
    expect(() => hashes(Buffer.from(NO_FENCE))).toThrow(HashError);
  });

  it("agrees on 400 generated inputs (CR/LF/CRLF mixes, volatile look-alikes, fences, all byte values)", () => {
    // One python process runs the extracted reference code once per listed file (sys.argv set per file),
    // so the code under test is still exactly the SCHEMA block.
    const driver = path.join(dir, "driver.py");
    writeFileSync(
      driver,
      [
        "import io, sys, contextlib",
        "code = compile(open(sys.argv[1], encoding='utf-8').read(), 'ref', 'exec')",
        "for f in open(sys.argv[2], encoding='utf-8').read().splitlines():",
        "    sys.argv = ['ref', f]",
        "    buf = io.StringIO()",
        "    try:",
        "        with contextlib.redirect_stdout(buf):",
        "            exec(code, {'__name__': '__main__'})",
        "        print(buf.getvalue().strip())",
        "    except ValueError:",
        "        print('ValueError')",
        "",
      ].join("\n"),
    );
    let seed = 0xc0ffee;
    const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 8) / 0x1000000;
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    const tokens = [
      "---", "--- ", "status", "status:", "status :", "status\t:", "statuses:", " status:", "Status:", "updated:",
      "last_verified_commit:", "id: x", ": ", "\n", "\r", "\r\n", "\n\r", "\t", " ", "a", "é", "✓", " ",
    ];
    const inputs: Buffer[] = [];
    for (let k = 0; k < 400; k++) {
      const parts: Buffer[] = [];
      if (rnd() < 0.8) parts.push(Buffer.from(pick(["---\n", "---\r\n", "---\r"])));
      const n = Math.floor(rnd() * 30);
      for (let i = 0; i < n; i++) {
        parts.push(rnd() < 0.08 ? Buffer.from([Math.floor(rnd() * 256)]) : Buffer.from(pick(tokens), "utf8"));
        if (rnd() < 0.15) parts.push(Buffer.from(pick(["\n---\n", "\r\n---\r\n", "\n---\r"])));
      }
      inputs.push(Buffer.concat(parts));
    }
    inputs.push(Buffer.concat([Buffer.from("---\nid: x\nstatus: "), Buffer.from(Array.from({ length: 256 }, (_, i) => i)), Buffer.from("\n---\nbody\n")]));
    const files = inputs.map((b, i) => {
      const f = path.join(dir, `gen-${i}.md`);
      writeFileSync(f, b);
      return f;
    });
    const list = path.join(dir, "files.txt");
    writeFileSync(list, files.join("\n") + "\n", "utf8");
    const r = spawnSync("python", [driver, refPy, list], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect(r.status, r.stderr).toBe(0);
    const lines = r.stdout.replace(/\r\n/g, "\n").trimEnd().split("\n");
    expect(lines.length).toBe(inputs.length);
    let raised = 0;
    inputs.forEach((b, i) => {
      if (lines[i] === "ValueError") {
        raised++;
        expect(() => hashes(b), `input ${i}: ${b.toString("hex")}`).toThrow(HashError);
      } else {
        const h = hashes(b);
        expect(`${h.content} ${h.scope}`, `input ${i}: ${b.toString("hex")}`).toBe(lines[i]);
      }
    });
    // Both branches were exercised.
    expect(raised).toBeGreaterThan(0);
    expect(raised).toBeLessThan(inputs.length);
  });
});
