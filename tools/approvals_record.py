#!/usr/bin/env python3
"""Record an owner approval decision in plan/approvals.json (adr-0023, SCHEMA §10.1). Run from the repo root.

Why: the owner approves in Claude Code (chat). Claude first saves the owner's words to
wiki/raw/owner/<date>-<slug>.md, then runs this script so the decision is stored with the page's
fingerprints (content_hash, scope_hash and, for `schema`, bootstrap_hash of CLAUDE.md). A later edit of the
page changes its fingerprint, so the approval shows as STALE and Claude asks again before dependent work.

Usage:
  python tools/approvals_record.py <key> <approved|changes-requested|rejected> --source wiki/raw/owner/<file>.md
                                   [--comment "<owner's words, short>"] [--dry-run]
  <key> is a page id, or <phase-id>#exit for a milestone exit.

Rules it enforces: the page exists and has `approvable: true`; `#exit` only on a phase page; the source is an
existing file under wiki/raw/owner/ that names the key; the previous decision moves into `history`
(append-only); the file is written atomically (temp file, then rename). Hashes are the SCHEMA §10.2
reference. Exit code 0 = recorded (or dry run), 1 = refused, with the reason printed.
"""
import datetime
import glob
import hashlib
import json
import os
import re
import sys

APPROVALS = os.path.join('plan', 'approvals.json')


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


def top_scalars(path):
    t = norm(open(path, 'rb').read()).decode('utf-8')
    if not t.startswith('---\n'):
        return {}
    out = {}
    for line in t[4:t.index('\n---\n', 3)].split('\n'):
        m = re.match(r'^([A-Za-z_][\w-]*):\s*(.*?)\s*$', line)
        if m:
            out[m.group(1)] = m.group(2).strip('"\'')
    return out


def find_page(pid):
    for p in glob.glob('wiki/**/*.md', recursive=True):
        p = p.replace('\\', '/')
        if p.startswith('wiki/raw/'):
            continue
        fm = top_scalars(p)
        if fm.get('id') == pid:
            return p, fm
    return None, None


def fail(msg):
    print('REFUSED: ' + msg)
    sys.exit(1)


def main(argv):
    args = list(argv)
    dry = '--dry-run' in args
    if dry:
        args.remove('--dry-run')
    opts = {}
    for flag in ('--source', '--comment'):
        if flag in args:
            i = args.index(flag)
            if i + 1 >= len(args):
                fail(f'{flag} needs a value')
            opts[flag] = args[i + 1]
            del args[i:i + 2]
    if len(args) != 2 or '--source' not in opts:
        print(__doc__)
        sys.exit(1)
    key, decision = args
    if decision not in ('approved', 'changes-requested', 'rejected'):
        fail(f'decision must be approved, changes-requested or rejected, not {decision!r}')
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]*(#exit)?', key):
        fail(f'{key!r} is not a page id or <phase-id>#exit')
    pid = key.split('#')[0]
    path, fm = find_page(pid)
    if not path:
        fail(f'no wiki page has id {pid}')
    if fm.get('approvable') != 'true':
        fail(f'{pid} has approvable: {fm.get("approvable")}, so it cannot be approved (SCHEMA §10.1)')
    if key.endswith('#exit') and fm.get('type') != 'phase':
        fail(f'{key}: an #exit key needs a phase page')
    src = opts['--source'].replace('\\', '/')
    if not (src.startswith('wiki/raw/owner/') and src.endswith('.md') and os.path.isfile(src)):
        fail(f'--source must be an existing wiki/raw/owner/*.md file (the owner\'s words), got {src!r}')
    if pid not in open(src, encoding='utf-8').read():
        fail(f'{src} does not mention {pid}; transcribe the owner\'s words for this key first')

    content, scope = hashes(path)
    now = datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
    rec = {
        'status': decision,
        'comment': opts.get('--comment', ''),
        'timestamp': now,
        'path': path,
        'content_hash': content,
        'scope_hash': scope,
        'approved_by': 'owner',
        'recorded_by': 'claude',
        'owner_words': src,
        'history': [],
    }
    if pid == 'schema':
        if not os.path.isfile('CLAUDE.md'):
            fail('CLAUDE.md is missing; the schema approval needs its bootstrap_hash (SCHEMA §10.2)')
        rec['bootstrap_hash'] = 'sha256:' + hashlib.sha256(norm(open('CLAUDE.md', 'rb').read())).hexdigest()

    try:
        data = json.load(open(APPROVALS, encoding='utf-8'))
    except FileNotFoundError:
        data = {'schema_version': 1, 'approvals': {}}
    if data.get('schema_version') != 1 or not isinstance(data.get('approvals'), dict):
        fail(f'{APPROVALS} is not a schema_version 1 approvals file; fix it by hand with the owner')
    prev = data['approvals'].get(key)
    if prev:
        rec['history'] = list(prev.get('history', [])) + [{k: v for k, v in prev.items() if k != 'history'}]
    data['approvals'][key] = rec
    text = json.dumps(data, indent=2, ensure_ascii=False) + '\n'

    print(f'{key}: {decision} (page {path})')
    print(f'  content_hash {content}')
    print(f'  scope_hash   {scope}')
    if 'bootstrap_hash' in rec:
        print(f'  bootstrap_hash {rec["bootstrap_hash"]} (CLAUDE.md)')
    print(f'  owner words  {src}; earlier decisions kept in history: {len(rec["history"])}')
    if dry:
        print('DRY RUN: nothing written.')
        return
    os.makedirs(os.path.dirname(APPROVALS), exist_ok=True)
    tmp = f'{APPROVALS}.tmp-{os.getpid()}'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.replace(tmp, APPROVALS)
    print(f'written {APPROVALS}. Next: append an `approval` log entry naming {key} and {src}.')


if __name__ == '__main__':
    main(sys.argv[1:])
