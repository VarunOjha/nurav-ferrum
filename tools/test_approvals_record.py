"""Tests for tools/approvals_record.py (stdlib only).

Run from the repo root:  python -m unittest discover -s tools -p "test_*.py"
Every run uses a temporary fixture repo; the real plan/approvals.json is never written (checked).
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
SCRIPT = os.path.join(TOOLS, 'approvals_record.py')
CHECK = os.path.join(TOOLS, 'approvals_check.py')
REAL = os.path.join(REPO, 'plan', 'approvals.json')


def state(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest() if os.path.exists(p) else 'absent'


PAGE = '---\nid: {id}\ntype: {type}\ntitle: "T"\nstatus: draft\nupdated: 2026-10-09\nsources: []\nrelated: []\napprovable: {appr}\n---\n\n# T\n'


class RecordTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.real_before = state(REAL)

    @classmethod
    def tearDownClass(cls):
        assert state(REAL) == cls.real_before, 'real plan/approvals.json changed'

    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='ar ')
        for rel, text in {
            'wiki/decisions/adr-0099-x.md': PAGE.format(id='adr-0099', type='decision', appr='true'),
            'wiki/phases/phase-p1-foundation.md': PAGE.format(id='phase-p1-foundation', type='phase', appr='true'),
            'wiki/overview/ov-x.md': PAGE.format(id='ov-x', type='overview', appr='false'),
            'wiki/SCHEMA.md': PAGE.format(id='schema', type='schema', appr='true'),
            'wiki/raw/owner/2026-10-09-a.md': 'Owner: approve adr-0099, schema, phase-p1-foundation and ov-x.\n',
            'wiki/raw/owner/2026-10-09-b.md': 'Owner said something else.\n',
            'CLAUDE.md': '# bootstrap\n',
        }.items():
            p = os.path.join(self.d, *rel.split('/'))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'w', encoding='utf-8', newline='\n').write(text)

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def run_tool(self, script, *args):
        r = subprocess.run([sys.executable, script, *args], cwd=self.d, capture_output=True, text=True)
        return r.returncode, r.stdout

    def data(self):
        return json.load(open(os.path.join(self.d, 'plan', 'approvals.json'), encoding='utf-8'))

    def test_records_with_hashes_and_the_checker_reads_it(self):
        rc, out = self.run_tool(SCRIPT, 'adr-0099', 'approved', '--source', 'wiki/raw/owner/2026-10-09-a.md', '--comment', 'ok')
        self.assertEqual(rc, 0, out)
        r = self.data()['approvals']['adr-0099']
        self.assertEqual((r['status'], r['approved_by'], r['recorded_by'], r['owner_words']),
                         ('approved', 'owner', 'claude', 'wiki/raw/owner/2026-10-09-a.md'))
        self.assertRegex(r['content_hash'], r'^sha256:[0-9a-f]{64}$')
        rc, out = self.run_tool(CHECK)
        self.assertIn('APPROVED', out)
        self.assertNotIn('STALE', out)
        # A content edit makes it STALE (change detection).
        p = os.path.join(self.d, 'wiki', 'decisions', 'adr-0099-x.md')
        open(p, 'a', encoding='utf-8', newline='\n').write('more\n')
        rc, out = self.run_tool(CHECK)
        self.assertIn('STALE', out)

    def test_history_is_kept_and_schema_gets_bootstrap_hash(self):
        src = ['--source', 'wiki/raw/owner/2026-10-09-a.md']
        self.assertEqual(self.run_tool(SCRIPT, 'schema', 'changes-requested', *src)[0], 0)
        self.assertEqual(self.run_tool(SCRIPT, 'schema', 'approved', *src)[0], 0)
        r = self.data()['approvals']['schema']
        self.assertEqual(r['status'], 'approved')
        self.assertEqual([h['status'] for h in r['history']], ['changes-requested'])
        self.assertTrue(r['bootstrap_hash'].startswith('sha256:'))

    def test_refusals(self):
        src = ['--source', 'wiki/raw/owner/2026-10-09-a.md']
        for args in (['ov-x', 'approved', *src],                     # approvable: false
                     ['adr-0099#exit', 'approved', *src],            # #exit on a non-phase
                     ['adr-0042', 'approved', *src],                 # no such page
                     ['adr-0099', 'maybe', *src],                    # bad decision
                     ['adr-0099', 'approved', '--source', 'wiki/raw/owner/2026-10-09-b.md'],  # source does not name it
                     ['adr-0099', 'approved', '--source', 'CLAUDE.md'],                       # not an owner raw file
                     ['adr-0099', 'approved']):                      # no source
            rc, out = self.run_tool(SCRIPT, *args)
            self.assertEqual(rc, 1, (args, out))
        self.assertFalse(os.path.exists(os.path.join(self.d, 'plan', 'approvals.json')))

    def test_exit_key_and_dry_run(self):
        rc, out = self.run_tool(SCRIPT, 'phase-p1-foundation#exit', 'approved', '--source', 'wiki/raw/owner/2026-10-09-a.md', '--dry-run')
        self.assertEqual(rc, 0, out)
        self.assertIn('DRY RUN', out)
        self.assertFalse(os.path.exists(os.path.join(self.d, 'plan', 'approvals.json')))


if __name__ == '__main__':
    unittest.main()
