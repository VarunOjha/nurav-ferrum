"""Tests for tools/approvals_check.py (stdlib only).

Run from the repo root:  python -m unittest discover -s tools -p "test_*.py"
Every approvals.json used here is a temporary fixture. The real plan/approvals.json is never written:
the module records its state (absent, or its sha256) before the tests and asserts it is unchanged after.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import warnings

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
SCRIPT = os.path.join(TOOLS, 'approvals_check.py')
DOC = os.path.join(REPO, 'wiki', 'operations', 'ops-approval-workflow.md')
CONTRACT = os.path.join(REPO, 'wiki', 'interactive-plan', 'ip-data-contract.md')
REAL_APPROVALS = os.path.join(REPO, 'plan', 'approvals.json')


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def file_state(path):
    if not os.path.exists(path):
        return 'absent'
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


_REAL_BEFORE = None


def setUpModule():
    global _REAL_BEFORE
    _REAL_BEFORE = file_state(REAL_APPROVALS)


def tearDownModule():
    after = file_state(REAL_APPROVALS)
    if after != _REAL_BEFORE:
        raise AssertionError(f'real plan/approvals.json changed during the tests: {_REAL_BEFORE} -> {after}')


def hash_functions():
    """norm() and hashes() exactly as defined in the script (exec of that slice only)."""
    src = read(SCRIPT)
    ns = {}
    exec('import hashlib, re\n' + src[src.index('def norm'):src.index('def frontmatter')], ns)
    return ns['hashes']


def run(cwd, *args):
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, SCRIPT, *args], cwd=cwd, capture_output=True, text=True,
                       encoding='utf-8', env=env)
    return r.returncode, r.stdout.replace('\r', '') + r.stderr.replace('\r', '')


PHASE = """---
id: phase-p1-foundation
type: phase
title: "P1"
status: planned
updated: 2026-10-08
sources: []
related: []
approvable: true
depends_on: []
decisions: [adr-0001]
experiments: []
---

# P1
"""
ADR = """---
id: adr-0001
type: decision
title: "A"
status: proposed
updated: 2026-10-08
sources: []
related: []
approvable: true
---

# ADR-0001

## Decision

Body.
"""
SCHEMA = """---
id: schema
type: schema
title: "Schema"
status: review
updated: 2026-10-08
sources: []
related: []
approvable: true
---

# Schema
"""
P0 = SCHEMA.replace('id: schema', 'id: phase-p0-planning').replace('type: schema', 'type: phase')
QHEAD = '---\nid: ov-open-questions\ntype: overview\ntitle: "Q"\nstatus: draft\nupdated: 2026-10-08\nsources: []\nrelated: []\napprovable: false\n---\n\n# Q\n\n'


def q(qid, status='answered', blocking='[]'):
    lines = [f'## {qid} Question {qid}', '', '- asked: 2026-10-08']
    if blocking is not None:
        lines.append(f'- blocking: {blocking}')
    if status is not None:
        lines.append(f'- status: {status}')
    lines.append('- answer: none yet')
    return '\n'.join(lines) + '\n\nText.\n\n'


class ApprovalsFixture(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='ac-')
        self.hashes = hash_functions()
        self.write('wiki/phases/phase-p1-foundation.md', PHASE)
        self.write('wiki/phases/phase-p0-planning.md', P0)
        self.write('wiki/decisions/adr-0001-a.md', ADR)
        self.write('wiki/SCHEMA.md', SCHEMA)
        self.write('CLAUDE.md', '# bootstrap\n')
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001'))
        self.approve('phase-p1-foundation', 'wiki/phases/phase-p1-foundation.md')
        self.approve('adr-0001', 'wiki/decisions/adr-0001-a.md')
        self.approve('schema', 'wiki/SCHEMA.md', bootstrap=True)

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def path(self, rel):
        return os.path.join(self.d, *rel.split('/'))

    def write(self, rel, text):
        p = self.path(rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(text)

    def approve(self, key, rel, bootstrap=False):
        """Writes the FIXTURE approvals file in the temp dir (never the real one)."""
        ap = self.path('plan/approvals.json')
        data = json.loads(read(ap)) if os.path.exists(ap) else {'schema_version': 1, 'approvals': {}}
        c, s = self.hashes(self.path(rel))
        rec = {'status': 'approved', 'comment': '', 'timestamp': '2026-10-08T12:00:00+05:30', 'path': rel,
               'content_hash': c, 'scope_hash': s, 'approved_by': 'owner', 'history': []}
        if bootstrap:
            rec['bootstrap_hash'] = self.hashes(self.path('CLAUDE.md'))[0]
        data['approvals'][key] = rec
        self.write('plan/approvals.json', json.dumps(data, indent=2) + '\n')

    def gate(self):
        before = file_state(self.path('plan/approvals.json'))
        rc, out = run(self.d, '--gate', 'phase-p1-foundation')
        self.assertEqual(file_state(self.path('plan/approvals.json')), before, 'checker wrote approvals.json')
        return rc, out

    def test_all_approved_passes(self):
        rc, out = self.gate()
        self.assertIn('ENTRY GATE: PASS', out)
        self.assertEqual(rc, 0, out)

    def test_volatile_only_edit_keeps_approval(self):
        self.write('wiki/decisions/adr-0001-a.md', ADR.replace('status: proposed', 'status: accepted').replace('\n', '\r\n'))
        rc, out = self.gate()
        self.assertIn('APPROVED_VOLATILE_DRIFT  adr-0001', out)
        self.assertIn('ENTRY GATE: PASS', out)

    def test_body_edit_is_stale_and_blocks(self):
        self.write('wiki/decisions/adr-0001-a.md', ADR.replace('Body.', 'Changed body.'))
        rc, out = self.gate()
        self.assertIn('STALE                    adr-0001', out)
        self.assertIn('BLOCKED by adr-0001', out)
        self.assertEqual(rc, 1)

    def test_claude_md_change_stales_schema_via_bootstrap_hash(self):
        self.write('CLAUDE.md', '# bootstrap changed\n')
        rc, out = self.gate()
        self.assertIn('STALE                    schema', out)
        self.assertIn('BLOCKED by schema', out)

    def test_missing_claude_md_stales_schema_fail_closed(self):
        os.remove(self.path('CLAUDE.md'))
        rc, out = self.gate()
        self.assertIn('STALE                    schema', out)
        self.assertIn('BLOCKED by schema', out)

    def test_open_question_blocking_dependency_blocks(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', 'open', '[adr-0001]'))
        rc, out = self.gate()
        self.assertIn('OPEN QUESTION Q-001 blocks', out)
        self.assertIn('BLOCKED by Q-001', out)

    def test_open_question_elsewhere_does_not_block(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', 'open', '[phase-p6-other]'))
        rc, out = self.gate()
        self.assertIn('ENTRY GATE: PASS', out)

    def test_q_format_missing_status_fails_closed(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', None, '[]'))
        rc, out = self.gate()
        self.assertIn('Q-FORMAT Q-001', out)
        self.assertIn('blocks every phase', out)
        self.assertIn('BLOCKED by Q-001', out)
        self.assertEqual(rc, 1)

    def test_q_format_unknown_status_fails_closed(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', 'maybe', '[]'))
        rc, out = self.gate()
        self.assertIn('Q-FORMAT Q-001', out)
        self.assertIn('BLOCKED by Q-001', out)

    def test_q_format_unparsable_blocking_fails_closed(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', 'answered', 'adr-0001, phase-p1-foundation'))
        rc, out = self.gate()
        self.assertIn('Q-FORMAT Q-001', out)
        self.assertIn('BLOCKED by Q-001', out)

    def test_q_format_duplicate_id_fails_closed(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001') + q('Q-001'))
        rc, out = self.gate()
        self.assertIn('duplicate question id', out)
        self.assertIn('BLOCKED by Q-001', out)

    def test_q_format_error_sets_exit_code_without_gate(self):
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001', None, '[]'))
        rc, out = run(self.d)
        self.assertIn('Q-FORMAT Q-001', out)
        self.assertEqual(rc, 1)

    def contradiction(self, text):
        self.write('wiki/decisions/adr-0001-a.md', ADR.replace('Body.', 'Body.\n\n> **CONTRADICTION:** ' + text))

    def test_unregistered_contradiction_blocks(self):
        self.contradiction('research disagrees with the decision.')
        self.approve('adr-0001', 'wiki/decisions/adr-0001-a.md')
        rc, out = self.gate()
        self.assertIn('UNREGISTERED CONTRADICTION', out)
        self.assertIn('BLOCKED by adr-0001:CONTRADICTION', out)

    def test_registered_contradiction_follows_its_question(self):
        self.contradiction('research disagrees,\n> registered as Q-002.')
        self.approve('adr-0001', 'wiki/decisions/adr-0001-a.md')
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001') + q('Q-002', 'open', '[phase-p6-other]'))
        rc, out = self.gate()
        self.assertIn('registered CONTRADICTION', out)
        self.assertIn('ENTRY GATE: PASS', out)
        self.write('wiki/overview/ov-open-questions.md', QHEAD + q('Q-001') + q('Q-002', 'open', '[phase-p1-foundation]'))
        rc, out = self.gate()
        self.assertIn('BLOCKED by Q-002', out)

    def test_contradiction_naming_unknown_question_is_unregistered(self):
        self.contradiction('see Q-999.')
        self.approve('adr-0001', 'wiki/decisions/adr-0001-a.md')
        rc, out = self.gate()
        self.assertIn('UNREGISTERED CONTRADICTION', out)

    def test_p0_bootstrap(self):
        rc, out = run(self.d, '--gate', 'phase-p0-planning')
        self.assertIn('BOOTSTRAP', out)
        self.assertEqual(rc, 0)

    def test_missing_approvals_file_means_pending(self):
        os.remove(self.path('plan/approvals.json'))
        rc, out = self.gate()
        self.assertIn('PENDING                  adr-0001', out)
        self.assertFalse(os.path.exists(self.path('plan/approvals.json')))


class ApprovalsRepo(unittest.TestCase):
    def test_script_equals_embedded_block(self):
        doc = read(DOC)
        sec = doc[doc.index('## 4. Checking approval state as Claude'):doc.index('## 5. Editing an approved page')]
        block = re.search(r'```python\n(.*?)\n```\n', sec, re.S).group(1) + '\n'
        self.assertEqual(read(SCRIPT).replace('\r\n', '\n'), block,
                         'tools/approvals_check.py differs from ops-approval-workflow section 4')

    def test_hash_vectors_from_data_contract(self):
        warnings.simplefilter('ignore', ResourceWarning)  # the SCHEMA reference opens files without 'with'
        hashes = hash_functions()
        doc = read(CONTRACT)
        sec = doc[doc.index('## 7. Hash test vectors'):]
        vectors = json.loads(re.search(r'```json\n(.*?)\n```', sec, re.S).group(1))
        self.assertEqual(len(vectors), 15)  # v01-v10 (2026-10-08) + v11-v15 (IP-3, 2026-10-09)
        d = tempfile.mkdtemp(prefix='hv-')
        try:
            for v in vectors:
                p = os.path.join(d, v['name'] + '.md')
                with open(p, 'wb') as f:
                    f.write(v['input'].encode('utf-8'))
                self.assertEqual(hashes(p), (v['content_hash'], v['scope_hash']), v['name'])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_real_repo_read_only(self):
        before = file_state(REAL_APPROVALS)
        rc, out = run(REPO, '--gate', 'phase-p1-foundation')
        self.assertIn('ENTRY GATE:', out)
        self.assertNotIn('Q-FORMAT', out)
        self.assertEqual(file_state(REAL_APPROVALS), before)


if __name__ == '__main__':
    unittest.main()
