"""Tests for tools/quick_lint.py (stdlib only).

Run from the repo root:  python -m unittest discover -s tools -p "test_*.py"
Fixtures are built in temporary directories; the real wiki is only read.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
SCRIPT = os.path.join(TOOLS, 'quick_lint.py')
DOC = os.path.join(REPO, 'wiki', 'operations', 'ops-wiki-maintenance.md')


def run_lint(cwd, *args):
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, SCRIPT, *args], cwd=cwd, capture_output=True, text=True, encoding='utf-8',
                       env=env)
    out = r.stdout.replace('\r', '')
    m = re.search(r'(\d+) files checked, (\d+) errors, (\d+) warnings', out)
    if not m:
        raise AssertionError(f'unexpected output (rc={r.returncode}):\n{out}\n{r.stderr}')
    n = int(m.group(2))
    # Exit status 1 iff the summary reports errors (owner answer 2026-10-09, wave 0c item 6).
    if r.returncode != (1 if n else 0):
        raise AssertionError(f'exit status {r.returncode} does not match {n} errors:\n{out}\n{r.stderr}')
    return n, out


INDEX_FM = ('---\nid: index\ntype: index\ntitle: "Index"\nstatus: active\nupdated: 2026-10-08\n'
            'sources: []\nrelated: []\napprovable: false\n---\n\n# Index\n\n## Raw sources\n\n')
LINES = {
    'master': '- [00-master](raw/00-master.md) | raw | Master | Master prompt\n',
    'owner': '- [2026-10-08-s01-x](raw/owner/2026-10-08-s01-x.md) | raw | Owner | Owner answers\n',
    'evidence': '- [evidence-phase-p0-planning](raw/evidence/phase-p0-planning/) | raw | Evidence folder | P0 evidence\n',
    'bench': '- [bench-run-01](raw/bench/Run_01/) | raw | Bench folder | Run 01\n',
}


class QuickLintFixture(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='ql-')
        self.write('wiki/raw/00-master.md', '# master\n')
        self.write('wiki/raw/owner/2026-10-08-s01-x.md', '# owner\n')
        self.write('wiki/raw/evidence/phase-p0-planning/interactive-plan/IP-0-toolchain.txt', 'node v24\n')
        self.write('wiki/raw/evidence/phase-p0-planning/env.txt', 'pv\n')
        self.write('wiki/raw/bench/Run_01/segment-01/Trial_A.csv', 'x\n')
        self.write('wiki/raw/MANIFEST.sha256', '')

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def write(self, rel, text):
        p = os.path.join(self.d, *rel.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(text)

    def index(self, *keys, extra=''):
        self.write('wiki/index.md', INDEX_FM + ''.join(LINES[k] for k in keys) + extra)

    def test_folder_lines_cover_nested_upper_case_files(self):
        self.index('master', 'owner', 'evidence', 'bench')
        n, out = run_lint(self.d)
        self.assertEqual(n, 0, out)

    def test_missing_evidence_folder_line_is_an_error(self):
        self.index('master', 'owner', 'bench')
        n, out = run_lint(self.d)
        self.assertEqual(n, 1, out)
        self.assertIn('INDEX-MISSING', out)
        self.assertIn('evidence-phase-p0-planning not listed', out)

    def test_bench_label_is_lower_cased_and_sanitised(self):
        self.index('master', 'owner', 'evidence')
        n, out = run_lint(self.d)
        self.assertEqual(n, 1, out)
        self.assertIn('bench-run-01 not listed', out)

    def test_file_directly_under_evidence_is_an_error(self):
        self.index('master', 'owner', 'evidence', 'bench')
        self.write('wiki/raw/evidence/stray.txt', 'x\n')
        n, out = run_lint(self.d)
        self.assertEqual(n, 1, out)
        self.assertIn('evidence/bench file must sit in a folder', out)

    def test_folder_line_without_folder_is_an_error(self):
        self.index('master', 'owner', 'evidence', 'bench',
                   extra='- [evidence-phase-p9-gone](raw/evidence/phase-p9-gone/) | raw | Gone | Gone\n')
        n, out = run_lint(self.d)
        self.assertGreaterEqual(n, 1, out)
        self.assertIn('lists unknown id evidence-phase-p9-gone', out)

    def test_exit_status_is_0_when_clean_and_1_on_errors(self):
        self.index('master', 'owner', 'evidence', 'bench')
        self.assertEqual(run_lint(self.d)[0], 0)
        self.index('master', 'owner', 'evidence')
        self.assertEqual(run_lint(self.d)[0], 1)
        # A filter that hides every error line still exits 1: the status follows the summary count.
        n, out = run_lint(self.d, 'NO-SUCH-CODE')
        self.assertEqual(n, 1, out)
        self.assertNotIn('ERROR', out)

    def test_owner_raw_files_are_still_listed_individually(self):
        self.index('master', 'evidence', 'bench')
        n, out = run_lint(self.d)
        self.assertEqual(n, 1, out)
        self.assertIn('raw file or folder 2026-10-08-s01-x not listed', out)


class QuickLintRepo(unittest.TestCase):
    def test_script_equals_embedded_block(self):
        with open(DOC, encoding='utf-8', newline='') as f:
            doc = f.read()
        sec = doc[doc.index('## 5. Lint'):]
        block = re.search(r'```python\n(.*?)\n```\n', sec, re.S).group(1) + '\n'
        with open(SCRIPT, encoding='utf-8', newline='') as f:
            script = f.read().replace('\r\n', '\n')
        self.assertEqual(script, block, 'tools/quick_lint.py differs from ops-wiki-maintenance section 5')

    def test_real_wiki_has_zero_errors(self):
        n, out = run_lint(REPO)
        self.assertEqual(n, 0, out)


if __name__ == '__main__':
    unittest.main()
