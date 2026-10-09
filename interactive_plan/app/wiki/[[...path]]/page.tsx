// Wiki browser (ip-routes-and-views §3.7): /wiki (tree + index) and /wiki/<path> (any wiki or raw
// file, or a directory listing). Only paths in the loaded file set resolve (lib/wiki/routes.ts).
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApproveBar from "@/components/ApproveBar";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import BootstrapSection from "@/components/BootstrapSection";
import Markdown from "@/components/Markdown";
import { Backlinks, FindingsBanner, FrontmatterPanel, PageHeader, SourcesAndRelated } from "@/components/wiki/PageParts";
import WikiTree from "@/components/wiki/WikiTree";
import { approveBarProps } from "@/lib/server/approveBar";
import { readBootstrap } from "@/lib/server/bootstrap";
import { config, getApprovals, getIndex, getLint } from "@/lib/server/data";
import { backlinkGroups } from "@/lib/wiki/backlinks";
import type { LintFinding } from "@/lib/wiki/findings";
import { linkTargetInfo, type WikiIndex, type WikiPage } from "@/lib/wiki/load";
import { pageHref, resolveWikiParam, wikiHref } from "@/lib/wiki/routes";
import { pageTitle } from "@/lib/wiki/search";
import { ancestorDirs, buildTree, type TreeNode } from "@/lib/wiki/tree";

export const dynamic = "force-dynamic";

const MAX_TEXT_BYTES = 1024 * 1024;

const one = (v: string | string[] | undefined): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
};

export async function generateMetadata({ params }: PageProps<"/wiki/[[...path]]">): Promise<Metadata> {
  const { path: segs } = await params;
  const idx = await getIndex();
  const t = resolveWikiParam(segs, idx.files);
  if (!t) return { title: "Not found" };
  if (t.kind === "root") return { title: "Wiki" };
  if (t.kind === "dir") return { title: t.path };
  const p = idx.byPath.get(t.path);
  return { title: p ? pageTitle(p) : t.path };
}

function findDir(tree: TreeNode, dir: string): TreeNode | null {
  if (tree.path === dir) return tree;
  for (const c of tree.children) {
    if (c.dir && dir.startsWith(c.path)) {
      const hit = findDir(c, dir);
      if (hit) return hit;
    }
  }
  return null;
}

async function pageFindings(p: WikiPage): Promise<LintFinding[]> {
  try {
    const report = await getLint();
    return report.findings.filter((f) => f.path === p.repoPath);
  } catch {
    return p.findings;
  }
}

async function frontmatterYaml(idx: WikiIndex, p: WikiPage): Promise<string | null> {
  if (p.rawFm === null) return null;
  try {
    const text = (await readFile(path.join(idx.wikiDir, p.path), "utf8")).replace(/\r\n?/g, "\n").replace(/^﻿/, "");
    return text.split("\n").slice(1, p.bodyStartLine - 2).join("\n");
  } catch {
    return null;
  }
}

function RawBanner() {
  return (
    <div className="banner banner-grey raw-banner" role="note">
      <strong>Immutable raw source.</strong> Files under <code>wiki/raw/</code> are never edited (SCHEMA §3.1); this view is read-only.
    </div>
  );
}

async function PageView({ idx, page }: { idx: WikiIndex; page: WikiPage }) {
  const fm = (page.fm ?? page.rawFm ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const info = linkTargetInfo(idx);
  const known = (id: string) => idx.byId.has(id) || /^Q-\d{3}$/.test(id);
  const [view, findings, yamlText] = await Promise.all([getApprovals().catch(() => null), pageFindings(page), frontmatterYaml(idx, page)]);
  const approvals = view && page.id ? view.items.filter((i) => i.id === page.id) : [];
  const isRaw = page.kind === "raw" || page.kind === "raw-research";
  const pageItem = approvals.find((a) => !a.exit) ?? null;
  // The schema page also renders root CLAUDE.md; the bar sends the hash of exactly that text (ip-data-contract §6.2).
  const bootstrap = !isRaw && page.id === "schema" ? await readBootstrap(config()) : null;
  const bar = !isRaw && pageItem ? await approveBarProps(pageItem, "Page approval", config(), bootstrap?.hash ?? null) : null;
  const typed = pageHref(page);
  return (
    <article className="page" data-kind={page.kind}>
      {isRaw && <RawBanner />}
      <FindingsBanner findings={findings} />
      <PageHeader
        title={pageTitle(page)}
        id={page.id}
        type={str(fm.type)}
        status={str(fm.status)}
        updated={str(fm.updated)}
        repoPath={page.repoPath}
        approvals={approvals}
        approvable={fm.approvable === true}
      />
      {typed !== wikiHref(page.path) && (
        <p className="small">
          <a href={typed}>Open the {str(fm.type) ?? "typed"} view →</a>
        </p>
      )}
      {bar && <ApproveBar {...bar} />}
      <SourcesAndRelated sources={strs(fm.sources)} related={strs(fm.related)} exists={info.exists} known={known} />
      <FrontmatterPanel rawFm={page.rawFm} yamlText={yamlText} known={known} />
      <div className="page-body">
        <Markdown source={page.body} path={page.path} exists={info.exists} knownIds={new Set(idx.byId.keys())} />
      </div>
      {bootstrap && <BootstrapSection source={bootstrap.source} hash={bootstrap.hash} exists={info.exists} knownIds={new Set(idx.byId.keys())} />}
      {page.id === "schema" && !isRaw && !bootstrap && (
        <p className="banner banner-red" role="alert">
          Root <code>CLAUDE.md</code> is missing or unreadable, so <code>schema</code> cannot be approved (SCHEMA §10.2).
        </p>
      )}
      {page.id && <Backlinks groups={backlinkGroups(idx, page.id)} known={known} />}
    </article>
  );
}

async function FileView({ idx, rel }: { idx: WikiIndex; rel: string }) {
  let content: string | null = null;
  let size = 0;
  let binary = false;
  try {
    const buf = await readFile(path.join(idx.wikiDir, rel));
    size = buf.length;
    binary = buf.subarray(0, 8192).includes(0);
    if (!binary && size <= MAX_TEXT_BYTES) content = buf.toString("utf8");
  } catch {
    content = null;
  }
  const isRaw = rel.startsWith("raw/");
  return (
    <article className="page" data-kind={isRaw ? "raw" : "file"}>
      {isRaw && <RawBanner />}
      <header className="page-header">
        <h1 className="page-title mono-title">{rel.split("/").pop()}</h1>
        <p className="editor-hint small">
          <span className="muted">Path:</span> <code>wiki/{rel}</code> <span className="muted">· {size.toLocaleString("en")} bytes</span>
        </p>
      </header>
      {content !== null ? (
        <pre className="file-text">
          <code>{content}</code>
        </pre>
      ) : (
        <p className="muted">{binary ? "Binary file: not rendered." : "File too large or unreadable: not rendered."}</p>
      )}
    </article>
  );
}

function DirView({ node }: { node: TreeNode }) {
  return (
    <article className="page">
      {node.path.startsWith("raw/") && <RawBanner />}
      <header className="page-header">
        <h1 className="page-title mono-title">wiki/{node.path}</h1>
        <p className="muted small">
          {node.children.length} entries, {node.count} files below
        </p>
      </header>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Id</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {node.children.map((c) => (
              <tr key={c.path}>
                <td>
                  <a href={wikiHref(c.path)}>{c.dir ? c.name + "/" : c.page?.title ?? c.name}</a>
                </td>
                <td className="mono small">{c.page?.id ?? ""}</td>
                <td>
                  <TypeBadge type={c.page?.type} />
                </td>
                <td>
                  <StatusBadge status={c.page?.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function WikiRoute({ params, searchParams }: PageProps<"/wiki/[[...path]]">) {
  const [{ path: segs }, sp] = await Promise.all([params, searchParams]);
  const idx = await getIndex();
  const target = resolveWikiParam(segs, idx.files);
  if (!target) notFound();
  const filter = { type: one(sp.type), status: one(sp.status) };
  const current = target.kind === "root" ? "" : target.path;
  const tree = buildTree(idx, filter);
  const open = new Set(ancestorDirs(current));
  if (target.kind === "dir") open.add(target.path);
  const action = target.kind === "root" ? "/wiki" : wikiHref(target.path);

  let main: React.ReactNode;
  if (target.kind === "root") {
    const index = idx.byPath.get("index.md");
    const info = linkTargetInfo(idx);
    main = (
      <article className="page">
        <header className="page-header">
          <h1 className="page-title">Wiki</h1>
          <p className="muted">
            {idx.pages.filter((p) => p.kind === "wiki").length} pages, {idx.files.size} files and folders. Pick a file on the left, or read the index below.
          </p>
        </header>
        {index ? (
          <div className="page-body">
            <Markdown source={index.body} path="index.md" exists={info.exists} knownIds={new Set(idx.byId.keys())} />
          </div>
        ) : (
          <p className="muted">wiki/index.md is missing.</p>
        )}
      </article>
    );
  } else if (target.kind === "dir") {
    const node = findDir(buildTree(idx), target.path);
    if (!node) notFound();
    main = <DirView node={node} />;
  } else {
    const page = idx.byPath.get(target.path);
    main = page ? <PageView idx={idx} page={page} /> : <FileView idx={idx} rel={target.path} />;
  }

  return (
    <div className="wiki-layout">
      <WikiTree tree={tree} current={current} open={open} filter={filter} action={action} />
      <div className="wiki-main">{main}</div>
    </div>
  );
}
