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

## optimization_ladder.py

> CPython 3.13.18, Linux x86_64, x86_64; median of 5 repeats

| rung | variant | ms |
|---|---|---:|
| data structure: dedup 5000 strings | `dedup_list` | 61.16 |
| data structure: dedup 5000 strings | `dedup_dict` | 0.20 |
| string building: 100k pieces | `concat_plus` | 6.42 |
| string building: 100k pieces | `concat_join` | 6.82 |
| loop body: sum of sqrt, 100k floats | `sqrt_sum_global` | 3.04 |
| loop body: sum of sqrt, 100k floats | `sqrt_sum_local` | 2.49 |
| loop body: sum of sqrt, 100k floats | `sqrt_sum_builtin` | 1.91 |

## ffi_boundary.py

> CPython 3.13.18, Linux x86_64, x86_64; NumPy 2.5.3; cos over 1,000,000 floats; median of 5

| variant | ms | vs math.cos loop |
|---|---:|---:|
| ctypes libm.cos, one call per element | 299.5 | 5.98x |
| math.cos, one call per element | 50.1 | 1.00x |
| numpy.cos on the whole array (one call) | 6.1 | 0.12x |

## front_insert.py

> CPython 3.13.18, Linux x86_64, x86_64; ns per insert+pop at the front; median of 5

| n | list.insert(0)+pop(0) | deque.appendleft+popleft |
|---:|---:|---:|
| 100 | 133 | 94 |
| 1000 | 439 | 86 |
| 10000 | 4400 | 85 |
| 100000 | 40164 | 54 |
| 1000000 | 608707 | 54 |

## exceptions.py

> CPython 3.13.18, Linux x86_64, x86_64; median of 7 repeats

| operation                                    | ns/op | ratio |
|----------------------------------------------|------:|------:|
| d[k] (no try)                                |  39.9 |   1.0x |
| try: d[k] — key present (nothing raised)     |  41.2 |   1.0x |
| try: d[k] — key missing (KeyError raised)    | 140.4 |   3.5x |
| if k in d — key missing (LBYL)               |  43.0 |   1.1x |
| d.get(k, -1) — key missing                   |  45.6 |   1.1x |
