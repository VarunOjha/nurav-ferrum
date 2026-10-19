"""p5.4: read one process with psutil, the independent reader the sampler is compared with.

Prints one JSON line: psutil version, private commit (memory_info().private, PrivateUsage on Windows), working set
(rss), private working set as psutil computes it (memory_full_info().uss), page faults, and user plus system CPU
time in 100 ns units. Usage: python tools/psutil_read.py <pid>
"""
import json
import sys

import psutil

p = psutil.Process(int(sys.argv[1]))
m = p.memory_info()
t = p.cpu_times()
print(json.dumps({
    "psutil": psutil.__version__,
    "private_commit_bytes": m.private,
    "working_set_bytes": m.rss,
    "uss_bytes": p.memory_full_info().uss,
    "page_faults": m.num_page_faults,
    "cpu_100ns": round((t.user + t.system) * 1e7),
}))
