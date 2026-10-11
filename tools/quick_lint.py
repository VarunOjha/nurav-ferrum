#!/usr/bin/env python3
"""Ferrum quick wiki lint (read-only, stdlib only). Run from the repo root.
Covers the SCHEMA §9.3 subset needed at HANDOFF: FILE-ENCODING, FM-MISSING, FM-ENUM, FM-TYPE-DIR,
ID-PATTERN, ID-DUP, REF-DANGLING (frontmatter ids + relative body links), UNV-NOPHASE, INDEX-MISSING
(raw evidence/bench files per first-level folder, SCHEMA §11 / adr-0020), LOG-FORMAT (wiki/log.md: §12
heading regex, date order, body keys, and a `- time:` value must be HH:MM).
Not covered (do by hand or with the plan app's lint): REF-RECIPROCAL, ORPHAN, STALE-UPDATED, ADR-CHAIN,
PHASE-ORDER, TRUST-EDGE, UNV-PASTDUE, INT-NUMBER-NOSRC, HYP-NO-DATA, RAW-IMMUTABLE, APPROVAL-STALE."""
import glob, os, re, sys

REQ = ['id', 'type', 'title', 'status', 'updated', 'sources', 'related', 'approvable']
EXTRA = {
    'component': ['path', 'crate', 'trust_level', 'phase_introduced', 'responsibilities', 'connects'],
    'phase': ['milestone', 'order', 'depends_on', 'est_sessions', 'entry_criteria', 'deliverables', 'tasks',
              'test_gate', 'exit_criteria', 'risks', 'decisions', 'experiments'],
    'decision': ['date', 'decided_by', 'supersedes'],
    'risk': ['likelihood', 'impact', 'mitigation', 'spike', 'owner_phase'],
    'research-question': ['question', 'hypotheses'],
    'hypothesis': ['rq', 'prediction', 'null_hypothesis', 'metrics', 'experiments'],
    'experiment': ['hypotheses', 'workloads', 'configurations', 'metrics', 'trials', 'analysis', 'phase'],
    'metric': ['unit', 'definition', 'boundary_start', 'boundary_end', 'method', 'tool', 'normalization', 'support'],
    'workload': ['workload_kind', 'master_prompt_ref', 'parameters', 'fixture_path'],
    'quality': ['scope', 'test_kinds', 'tooling'],
    'operations': ['audience', 'trigger'],
    'handoff': ['session', 'phase', 'next_action', 'uncommitted', 'open_questions'],
    'status': ['session', 'current_phase', 'current_task', 'next_action', 'blocked_on', 'last_handoff'],
}  # SCHEMA §4.1 as amended 2026-10-08: overview also allowed directly under research/ and risks/
STATUS = {
    'overview': 'draft review approved outdated', 'component': 'planned in-progress implemented verified deprecated',
    'phase': 'planned ready in-progress gate-review done blocked', 'decision': 'proposed accepted superseded rejected',
    'risk': 'open mitigating resolved realized tolerated', 'research-question': 'open investigating answered dropped',
    'hypothesis': 'draft preregistered testing supported not-supported inconclusive withdrawn',
    'experiment': 'designed ready running complete analyzed aborted', 'metric': 'proposed defined validated retired',
    'workload': 'proposed implemented validated retired', 'quality': 'draft active retired',
    'operations': 'draft active retired', 'handoff': 'final partial', 'glossary': 'draft active',
    'index': 'active', 'log': 'active', 'schema': 'draft review approved', 'status': 'active blocked awaiting-owner'}
IDPAT = {
    'overview': r'ov-[a-z0-9-]+', 'component': r'comp-[a-z0-9-]+', 'phase': r'phase-p[0-8]-[a-z0-9-]+',
    'decision': r'adr-[0-9]{4}', 'risk': r'risk-r[0-9]{2,}', 'research-question': r'rq-[0-9]{2,}',
    'hypothesis': r'hyp-[0-9]{2,}', 'experiment': r'exp-[a-z0-9-]+', 'metric': r'metric-[a-z0-9-]+',
    'workload': r'wl-[a-z0-9-]+', 'quality': r'qual-[a-z0-9-]+', 'operations': r'(ops|ip)-[a-z0-9-]+',
    'handoff': r'handoff-[0-9]{4}-[0-9]{2}-[0-9]{2}-s[0-9]{2,}', 'glossary': 'glossary', 'index': 'index',
    'log': 'log', 'schema': 'schema', 'status': 'status-live', 'research-note': r'research-[a-z0-9-]+'}
DIRS = [('wiki/architecture/components/', {'component'}), ('wiki/operations/handoffs/', {'handoff'}),
        ('wiki/research/questions/', {'research-question'}), ('wiki/research/hypotheses/', {'hypothesis'}),
        ('wiki/research/experiments/', {'experiment'}), ('wiki/research/metrics/', {'metric'}),
        ('wiki/research/workloads/', {'workload'}), ('wiki/research/', {'overview'}),
        ('wiki/overview/', {'overview', 'glossary'}),
        ('wiki/architecture/', {'overview'}), ('wiki/phases/', {'phase'}), ('wiki/decisions/', {'decision'}),
        ('wiki/risks/', {'risk', 'overview'}), ('wiki/quality/', {'quality'}), ('wiki/operations/', {'operations'}),
        ('wiki/interactive-plan/', {'overview', 'operations'}), ('wiki/raw/research/', {'research-note'}),
        ('wiki/', {'schema', 'index', 'log'}), ('', {'status'})]
REFKEYS = ['related', 'depends_on', 'risks', 'decisions', 'experiments', 'rq', 'hypotheses', 'metrics',
           'workloads', 'supersedes', 'superseded_by', 'phase', 'owner_phase', 'phase_introduced', 'current_phase']

errs, warns = [], []
def E(code, f, msg): errs.append(f'{code:16} {f}: {msg}')

def split(t):
    if not t.startswith('---\n'):
        return None, t
    i = t.find('\n---\n', 3)
    return (t[4:i], t[i + 5:]) if i > 0 else (None, t)

def parse(block):
    fm, key = {}, None
    for line in block.split('\n'):
        m = re.match(r'^([A-Za-z_][\w-]*):\s*(.*)$', line)
        if m:
            key, v = m.group(1), m.group(2).strip()
            if v.startswith('[') and v.endswith(']'):
                fm[key] = [x.strip().strip('"\'') for x in v[1:-1].split(',') if x.strip()]
            else:
                fm[key] = [] if v == '' else v.strip('"\'')
            continue
        m = re.match(r'^\s+-\s+([^:{}\[\]]+)$', line)
        if m and key and isinstance(fm.get(key), list):
            fm[key].append(m.group(1).strip().strip('"\''))
    fm['_connects_to'] = re.findall(r'(?m)^\s+-?\s*to:\s*([a-z0-9-]+)\s*$', block)
    return fm

files = [p.replace('\\', '/') for p in glob.glob('wiki/**/*.md', recursive=True)] + ['STATUS.md']
docs, ids = {}, {}
for f in files:
    if f.startswith('wiki/raw/') and not f.startswith('wiki/raw/research/'):
        continue
    if not os.path.exists(f):
        continue
    raw = open(f, 'rb').read()
    if raw.startswith(b'\xef\xbb\xbf'):
        E('FILE-ENCODING', f, 'BOM present')
    if not raw.endswith(b'\n') or raw.endswith(b'\n\n'):
        E('FILE-ENCODING', f, 'must end in exactly one LF')
    t = raw.decode('utf-8', 'replace').replace('\r\n', '\n')
    block, body = split(t)
    if block is None:
        E('FM-MISSING', f, 'no frontmatter'); continue
    fm = parse(block)
    docs[f] = (fm, body)
    if 'id' in fm:
        if fm['id'] in ids:
            E('ID-DUP', f, f"{fm['id']} also in {ids[fm['id']]}")
        ids[fm['id']] = f

for f, (fm, body) in docs.items():
    ty = fm.get('type', '')
    req = ['id', 'type', 'title', 'updated', 'sources'] if ty == 'research-note' else REQ + EXTRA.get(ty, [])
    for k in req:
        if k not in fm:
            E('FM-MISSING', f, f'missing {k}')
    if ty not in IDPAT:
        E('FM-ENUM', f, f'unknown type {ty!r}'); continue
    if ty in STATUS and fm.get('status') not in STATUS[ty].split():
        E('FM-ENUM', f, f"status {fm.get('status')!r} not allowed for {ty}")
    allowed = next((s for d, s in DIRS if f.startswith(d) and (d != 'wiki/' or f.count('/') == 1) and (d != '' or '/' not in f)), set())  # no match = FM-TYPE-DIR, not a crash
    if ty not in allowed or (ty == 'glossary' and not f.endswith('overview/glossary.md')):
        E('FM-TYPE-DIR', f, f'type {ty} not allowed here')
    i = fm.get('id', '')
    base = os.path.basename(f)[:-3]
    if not re.fullmatch(IDPAT[ty], i):
        E('ID-PATTERN', f, f'id {i!r} does not match {IDPAT[ty]}')
    special = {'SCHEMA': 'schema', 'STATUS': 'status-live'}
    if special.get(base) != i and not (base == i or base.startswith(i + '-')) and not (ty == 'research-note' and 'research-' + base == i):
        E('ID-PATTERN', f, f'basename {base!r} does not start with id {i!r}')
    for k in REFKEYS:
        v = fm.get(k)
        for r in (v if isinstance(v, list) else [v] if isinstance(v, str) and v not in ('null', '') else []):
            if r not in ids and not (k == 'phase' and ty == 'handoff' and r in ids):
                E('REF-DANGLING', f, f'{k}: {r}')
    for r in fm['_connects_to']:
        if r not in ids:
            E('REF-DANGLING', f, f'connects.to: {r}')
    nofence = re.sub(r'(?ms)^(```|~~~).*?^\1', '', body)
    nofence = re.sub(r'`[^`\n]*`', '', nofence)
    if f != 'wiki/SCHEMA.md' and not f.startswith('wiki/raw/'):
        for m in re.finditer(r'UNVERIFIED(?!\[phase-p[0-8]-[a-z0-9-]+\])', nofence):
            E('UNV-NOPHASE', f, 'bare UNVERIFIED: ...' + nofence[max(0, m.start() - 40):m.end() + 10].replace('\n', ' '))
    for m in re.finditer(r'\]\(([^)\s]+)\)', nofence):
        link = m.group(1).split('#')[0]
        if not link or re.match(r'^[a-z]+:', link):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f), link))):
            E('REF-DANGLING', f, f'body link {m.group(1)}')

LOGHEAD = re.compile(r'^## \[(\d{4}-\d{2}-\d{2})\] (ingest|query|lint|decide|handoff|resume|gate|code|approval|schema|correct|plan) \| (.+)$')
LOGKEYS = ['session', 'time', 'pages', 'sources', 'result', 'stales', 'next', 'commit']  # SCHEMA §12
if 'wiki/log.md' in docs:  # LOG-FORMAT, as the TS lint (lib/wiki/log.ts) plus the time value
    prev, cur = None, False
    for line in re.sub(r'(?ms)^(```|~~~).*?^\1[^\n]*$', lambda m: re.sub(r'[^\n]', '', m.group(0)), docs['wiki/log.md'][1]).split('\n'):
        if line.startswith('## '):
            m = LOGHEAD.match(line)
            cur = bool(m)
            if m:
                if prev and m.group(1) < prev:
                    E('LOG-FORMAT', 'wiki/log.md', f'entry dated {m.group(1)} follows an entry dated {prev}')
                prev = m.group(1)
            elif line.startswith('## ['):
                E('LOG-FORMAT', 'wiki/log.md', f'heading does not match the SCHEMA §12 regex: {line}')
            continue
        b = re.match(r'^- ([A-Za-z_][\w-]*):(?:\s+(.*))?$', line) if cur else None
        if not b:
            continue
        if b.group(1) not in LOGKEYS:
            E('LOG-FORMAT', 'wiki/log.md', f'bullet key {b.group(1)!r} is not one of {", ".join(LOGKEYS)}')
        elif b.group(1) == 'time' and not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', (b.group(2) or '').strip()):
            E('LOG-FORMAT', 'wiki/log.md', f'time {(b.group(2) or "").strip()!r} is not HH:MM (24-hour, 00:00 to 23:59)')

if os.path.exists('wiki/index.md'):
    idx = open('wiki/index.md', encoding='utf-8').read()
    listed = set(re.findall(r'(?m)^- \[([a-z0-9.-]+)\]\(', idx))
    for i, f in ids.items():
        if i not in listed and i not in ('index', 'status-live'):
            E('INDEX-MISSING', f, f'{i} not in index.md')
    raw = set()  # SCHEMA §11 raw index labels (research notes use their own id)
    for p in glob.glob('wiki/raw/**/*', recursive=True):
        p = p.replace(os.sep, '/')
        if not os.path.isfile(p) or p.endswith('MANIFEST.sha256') or 'raw/research/' in p:
            continue
        r = p.split('wiki/raw/', 1)[1].split('/')
        if r[0] in ('evidence', 'bench'):  # adr-0020: one line per first-level evidence/bench folder
            if len(r) < 3:
                E('INDEX-MISSING', p, 'evidence/bench file must sit in a folder (SCHEMA §11)'); continue
            raw.add(re.sub(r'[^a-z0-9.-]', '-', (r[0] + '/' + r[1]).lower()).rstrip('-'))
        else:
            raw.add(os.path.basename(p).rsplit('.', 1)[0])
    for i in raw - listed - set(ids):
        E('INDEX-MISSING', 'wiki/index.md', f'raw file or folder {i} not listed')
    for i in listed - set(ids) - raw:
        E('INDEX-MISSING', 'wiki/index.md', f'lists unknown id {i}')
else:
    warns.append('INDEX-MISSING    wiki/index.md does not exist yet')

only = sys.argv[1] if len(sys.argv) > 1 else ''
for line in errs:
    if only in line:
        print('ERROR', line)
for w in warns:
    print('WARN ', w)
print(f'{len(docs)} files checked, {len(errs)} errors, {len(warns)} warnings')
sys.exit(1 if errs else 0)  # non-zero when any error was found (owner answer 2026-10-09, wave 0c item 6)
