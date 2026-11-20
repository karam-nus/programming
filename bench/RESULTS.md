---
title: "Benchmark Results"
---

[← Back to Table of Contents](../README.md)

# Benchmark Results

Recorded 2026-11-20. Machine: 4 vCPU Intel Xeon @ 2.10 GHz (cloud container), Linux x86-64, CPython 3.13.18 (GIL build).
Re-run any script with `python3 bench/<name>.py` from the repo root's `bench/` directory. Ratios are the portable part; absolute ns will differ on your machine.

## cost_model.py

> CPython 3.13.18, Linux x86_64, x86_64; median of 7 repeats

| operation                                    | ns/op | ratio |
|----------------------------------------------|------:|------:|
| local variable load (x)                      |  11.3 |   1.0x |
| integer add (x + 1)                          |  16.2 |   1.4x |
| attribute read (c.a)                         |  10.8 |   1.0x |
| method call (c.m())                          |  19.7 |   1.8x |
| function call (f())                          |  18.2 |   1.6x |
| dict lookup (d[500])                         |  20.9 |   1.9x |
| set membership (500 in s)                    |  19.2 |   1.7x |
| list index (xs[500])                         |  13.9 |   1.2x |
| list membership, n=1000 (999 in xs)          | 4832.2 | 429.0x |
| list.append + pop                            |  21.6 |   1.9x |
| list.insert(0) + pop(0), n=1000              | 251.3 |  22.3x |
| deque.appendleft + popleft, n=1000           |  28.1 |   2.5x |
| sum(xs), n=1000                              | 5385.8 | 478.1x |
| for-loop sum, n=1000                         | 18242.0 | 1619.4x |

## attribute_access.py

> CPython 3.13.18, Linux x86_64, x86_64; median of 7 repeats

| operation                                    | ns/op | ratio |
|----------------------------------------------|------:|------:|
| instance __dict__ attribute (p.a)            |  10.8 |   1.0x |
| __slots__ attribute (s.a)                    |  10.8 |   1.0x |
| cached_property after first access           |  17.0 |   1.6x |
| property (pr.a)                              |  21.4 |   2.0x |
| pure-Python data descriptor (wd.a)           |  62.9 |   5.8x |
| __getattr__ fallback (dy.a)                  |  40.5 |   3.8x |

## dp_memo.py

> CPython 3.13.18, Linux x86_64, x86_64; LCS of two random 400-char DNA strings; median of 5

| variant | ms |
|---|---:|
| lcs_memo | 44 |
| lcs_table | 14 |
| lcs_rows | 11 |

## concurrency.py

> CPython 3.13.18, Linux x86_64, x86_64; 4 workers, 8 jobs

| workload | serial (s) | 4 threads (s) | 4 processes (s) |
|---|---:|---:|---:|
| CPU: sum of squares, 2M iters/job | 0.66 | 0.65 | 0.25 |
| I/O: sleep 50 ms/job | 0.40 | 0.10 | 0.11 |
