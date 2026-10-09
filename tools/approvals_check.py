#!/usr/bin/env python3
"""Ferrum approval-state checker (read-only). Run from the repo root.
Usage: python tools/approvals_check.py [--gate <phase-id>] [--pending]
Mirrors wiki/SCHEMA.md §10.2 (hashes, bootstrap_hash), §10.3 (states), §9.7 (entry gate: dependencies,
dependency set, open questions with fail-closed Q-FORMAT, unregistered CONTRADICTION blockquotes).
Never writes any file. Exit code 1 when --gate reports BLOCKED or a Q-FORMAT error exists, else 0."""
import glob, hashlib, json, os, re, sys

def norm(b):
    return b.replace(b'\r\n', b'\n').replace(b'\r', b'\n')

def hashes(path):  # identical to the SCHEMA §10.2 reference
    b = norm(open(path, 'rb').read())
    content = hashlib.sha256(b).hexdigest()
    s = b
    if b.startswith(b'---\n'):
        end = b.index(b'\n---\n', 3) + 1
        fm = re.sub(rb'(?m)^(status|updated|last_verified_commit)[ \t]*:.*\n', b'', b[:end])
        s = fm + b[end:]
    return 'sha256:' + content, 'sha256:' + hashlib.sha256(s).hexdigest()

def frontmatter(path):
    """Minimal parser: top-level scalars and lists of scalars only (enough for gates)."""
    t = norm(open(path, 'rb').read()).decode('utf-8')
    if not t.startswith('---\n'):
        return {}
    block = t[4:t.index('\n---\n', 3)]
    fm, key = {}, None
    for line in block.split('\n'):
        m = re.match(r'^([A-Za-z_][\w-]*):\s*(.*)$', line)
        if m:
            key, v = m.group(1), m.group(2).strip()
            if v.startswith('[') and v.endswith(']'):
                fm[key] = [x.strip().strip('"\'') for x in v[1:-1].split(',') if x.strip()]
            elif v == '':
                fm[key] = []
            else:
                fm[key] = v.strip('"\'')
            continue
        m = re.match(r'^\s+-\s+([^:{}\[\]]+)$', line)
        if m and key and isinstance(fm.get(key), list):
            fm[key].append(m.group(1).strip().strip('"\''))
    return fm

pages = {}
for p in glob.glob('wiki/**/*.md', recursive=True):
    p = p.replace('\\', '/')
    if p.startswith('wiki/raw/'):
        continue
    fm = frontmatter(p)
    if 'id' in fm:
        pages[fm['id']] = (p, fm)

try:
    approvals = json.load(open('plan/approvals.json', encoding='utf-8')).get('approvals', {})
except FileNotFoundError:
    approvals = {}

def state(key):
    pid = key.split('#')[0]
    if pid not in pages or pages[pid][1].get('approvable') != 'true':
        return 'INVALID' if key in approvals else 'PENDING' if pid in pages else 'INVALID'
    e = approvals.get(key)
    if not e:
        return 'PENDING'
    if e['status'] == 'rejected':
        return 'REJECTED'
    if e['status'] == 'changes-requested':
        return 'CHANGES_REQUESTED'
    if key == 'schema' and e.get('bootstrap_hash') and os.path.exists('CLAUDE.md'):
        if hashes('CLAUDE.md')[0] != e['bootstrap_hash']:  # SCHEMA §10.2: CLAUDE.md drift stales schema
            return 'STALE'
    c, s = hashes(pages[pid][0])
    if c == e.get('content_hash'):
        return 'APPROVED'
    if s == e.get('scope_hash'):
        return 'APPROVED_VOLATILE_DRIFT'
    return 'STALE'

def questions():
    """ov-open-questions sections -> {qid: (status, blocking set or None)}; None = blocks every phase."""
    oq, out, errs = 'wiki/overview/ov-open-questions.md', {}, []
    if not os.path.exists(oq):
        return out, errs
    for sec in re.split(r'(?m)^## ', norm(open(oq, 'rb').read()).decode('utf-8'))[1:]:
        m = re.match(r'(Q-\d{3}) ', sec)
        if not m:
            continue
        qid, bad = m.group(1), []
        st = re.findall(r'(?m)^- status:\s*(\S*)\s*$', sec)
        bl = re.findall(r'(?m)^- blocking:\s*(.*?)\s*$', sec)
        if len(st) != 1 or st[0] not in ('open', 'answered', 'withdrawn'):
            bad.append('status missing, repeated or unknown')
        ids = None
        if len(bl) == 1 and re.fullmatch(r'\[\s*(?:[a-z0-9#.-]+\s*(?:,\s*[a-z0-9#.-]+\s*)*)?\]', bl[0]):
            ids = {x.strip() for x in bl[0][1:-1].split(',') if x.strip()}
        else:
            bad.append('blocking missing, repeated or unparsable')
        if qid in out:
            bad.append('duplicate question id')
        if bad:  # fail closed (SCHEMA §9.3 Q-FORMAT): open and blocking every phase
            errs.append(f'Q-FORMAT {qid}: ' + '; '.join(bad))
            out[qid] = ('open', None)
        else:
            out[qid] = (st[0], ids)
    return out, errs

def contradictions(path):
    """Open '> **CONTRADICTION:**' blockquotes in a page -> list of (line no, Q ids named in the quote)."""
    lines, out = norm(open(path, 'rb').read()).decode('utf-8').split('\n'), []
    for i, line in enumerate(lines):
        if re.match(r'^> \*\*CONTRADICTION:\*\*', line):
            quote, j = [line], i + 1
            while j < len(lines) and lines[j].startswith('>'):
                quote.append(lines[j]); j += 1
            out.append((i + 1, sorted(set(re.findall(r'Q-\d{3}', ' '.join(quote))))))
    return out

OK = {'APPROVED', 'APPROVED_VOLATILE_DRIFT'}
args = sys.argv[1:]
rc = 0
print('approvals.json entries:', len(approvals))
for k in sorted(approvals):
    print(f'  {state(k):24} {k}')

qs, qerrs = questions()
for e in qerrs:
    print('  ' + e + ' (treated as open, blocking every phase)')
    rc = 1

for pid, (p, fm) in sorted(pages.items()):  # PHASE-DONE-NO-EXIT: done needs an approved #exit key
    if fm.get('type') == 'phase' and fm.get('status') == 'done' and state(pid + '#exit') not in OK:
        print(f'  PHASE-DONE-NO-EXIT {pid}: status done but {pid}#exit is {state(pid + "#exit")}')

if '--pending' in args:
    for pid, (p, fm) in sorted(pages.items()):
        if fm.get('approvable') == 'true' and pid not in approvals:
            print(f'  {"PENDING":24} {pid}')

if '--gate' in args:
    ph = args[args.index('--gate') + 1]
    if ph not in pages:
        sys.exit(f'unknown phase {ph}')
    if ph == 'phase-p0-planning':  # bootstrap: approvals cannot exist before the plan app
        print('BOOTSTRAP: phase-p0-planning has no approval-based entry gate (CLAUDE.md section 1 step 10).')
        print('  Authority: wiki/raw/01-scoping-decisions.md. Plan-app build (p0.9-p0.16) needs the owner chat')
        print('  approval of the ip-* pages and adr-0016 (Approval Wave 0), transcribed to wiki/raw/owner/.')
        sys.exit(rc)
    fm = pages[ph][1]
    deps = {ph, 'schema'} | set(fm.get('decisions', [])) | set(fm.get('experiments', [])) | set(fm.get('components', []))
    deps |= {i for i, (_, f) in pages.items() if f.get('phase_introduced') == ph}
    blocked = []
    for d in fm.get('depends_on', []):
        st = pages.get(d, (None, {}))[1].get('status')
        ex = state(d + '#exit')
        print(f'  depends_on {d}: status={st} exit={ex}')
        if st != 'done' or ex not in OK:
            blocked.append(d)
    for d in sorted(deps):
        st = state(d)
        print(f'  {st:24} {d}')
        if st not in OK:
            blocked.append(d)
    for qid, (st, ids) in sorted(qs.items()):
        if st == 'open' and (ids is None or ids & deps):
            print(f'  OPEN QUESTION {qid} blocks {"every phase (Q-FORMAT)" if ids is None else sorted(ids & deps)}')
            blocked.append(qid)
    for d in sorted(deps):  # SCHEMA §9.7 step 4: a blockquote naming no Q-NNN is unregistered and blocks
        if d in pages:
            for ln, named in contradictions(pages[d][0]):
                named = [q for q in named if q in qs]  # a Q id missing from the register does not register it
                if not named:
                    print(f'  UNREGISTERED CONTRADICTION {pages[d][0]}:{ln}')
                    blocked.append(f'{d}:CONTRADICTION')
                else:
                    print(f'  registered CONTRADICTION {pages[d][0]}:{ln} -> {", ".join(named)}')
    print('ENTRY GATE:', 'PASS' if not blocked else 'BLOCKED by ' + ', '.join(blocked))
    rc = rc or (1 if blocked else 0)
sys.exit(rc)
