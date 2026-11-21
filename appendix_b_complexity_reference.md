---
title: "Appendix B — Complexity Reference"
---

[← Back to Table of Contents](./README.md)

# Appendix B — Complexity Reference

> *"If a chapter disagrees with this table, the appendix is the bug — fix both."*

## Overview

The cost of every built-in operation used in the book, for CPython. Average-case costs assume a reasonable hash distribution; worst cases are given where they differ. $n$ is the container's size, $k$ the size of the other operand or slice. Sources: the CPython wiki *TimeComplexity* page, the CPython source files named per section, and the measurements in [bench/RESULTS.md](./bench/RESULTS.md). Derivations are in [Chapter 13](./13_complexity_and_cost_models.md) and [Chapter 19](./19_data_structure_internals.md).

---

## `list` — dynamic array (`Objects/listobject.c`)

| Operation | Average | Worst | Note |
|-----------|:---:|:---:|------|
| `xs[i]`, `xs[i] = v`, `len(xs)` | $\Theta(1)$ | $\Theta(1)$ | |
| `xs.append(v)` | $\Theta(1)$ amortized | $\Theta(n)$ | growth $\approx 1.125\times$ + 6, rounded to 4 |
| `xs.pop()` | $\Theta(1)$ | $\Theta(1)$ | |
| `xs.pop(i)`, `xs.insert(i, v)`, `del xs[i]` | $\Theta(n - i)$ | $\Theta(n)$ | 251 ns vs 22 ns at the front vs end, $n = 1000$ |
| `v in xs`, `xs.index(v)`, `xs.count(v)`, `xs.remove(v)` | $\Theta(n)$ | $\Theta(n)$ | 4.8 µs for $n = 1000$ |
| `xs[a:b]` (get) | $\Theta(k)$ | $\Theta(k)$ | copies $k = b - a$ pointers |
| `xs[a:b] = ys` | $\Theta(k + n)$ | $\Theta(k + n)$ | shifts the tail |
| `xs.extend(ys)`, `xs + ys` | $\Theta(k)$ / $\Theta(n + k)$ | | |
| `xs * m` | $\Theta(nm)$ | | copies references, not elements |
| `xs.sort()`, `sorted(xs)` | $\Theta(n \log n)$ | $\Theta(n \log n)$ | $\Theta(n)$ on sorted or reversed input |
| `xs.reverse()`, `xs.copy()` | $\Theta(n)$ | | |
| `min`, `max`, `sum` | $\Theta(n)$ | | C loop: `sum` ≈ 3.4× a Python `for` loop |

## `dict` — compact hash table (`Objects/dictobject.c`)

| Operation | Average | Worst | Note |
|-----------|:---:|:---:|------|
| `d[k]`, `d[k] = v`, `k in d`, `d.get(k)`, `del d[k]` | $\Theta(1)$ | $\Theta(n)$ | ~21 ns lookup |
| insertion | $\Theta(1)$ amortized | $\Theta(n)$ | resize when used > 2/3 of table size |
| iteration (`keys`, `values`, `items`) | $\Theta(n)$ | | insertion order guaranteed (3.7+) |
| `d.copy()`, `dict(d)` | $\Theta(n)$ | | compacts after deletions |
| <code>d1 &#124; d2</code>, `d1.update(d2)` | $\Theta(n + k)$ / $\Theta(k)$ | | |
| `d.popitem()` | $\Theta(1)$ amortized | | LIFO order |
| memory after deletions | — | — | never shrinks on `del` |

## `set` / `frozenset` (`Objects/setobject.c`)

| Operation | Average | Worst | Note |
|-----------|:---:|:---:|------|
| `v in s`, `s.add(v)`, `s.discard(v)` | $\Theta(1)$ | $\Theta(n)$ | ~19 ns membership |
| `s & t` | $\Theta(\min(n, k))$ | $\Theta(nk)$ | iterates the smaller operand |
| <code>s &#124; t</code> | $\Theta(n + k)$ | | |
| `s - t` | $\Theta(n)$ | | |
| `s ^ t` | $\Theta(n + k)$ | | |
| `s <= t` (subset) | $\Theta(n)$ | | |
| iteration order | — | — | unordered; varies across processes for strings (hash randomization) |

## `collections.deque` (`Modules/_collectionsmodule.c`)

| Operation | Cost | Note |
|-----------|:---:|------|
| `append`, `appendleft`, `pop`, `popleft` | $\Theta(1)$ | ~28 ns for appendleft + popleft |
| `dq[i]` | $\Theta(\min(i, n - i))$ | walks 64-slot blocks |
| `rotate(k)` | $\Theta(k)$ | |
| `maxlen` eviction | $\Theta(1)$ | |
| `v in dq`, `remove` | $\Theta(n)$ | |

## `heapq` (`Lib/heapq.py`, `Modules/_heapqmodule.c`)

| Operation | Cost |
|-----------|:---:|
| `heappush`, `heappop`, `heappushpop`, `heapreplace` | $\Theta(\log n)$ |
| `heapify` | $\Theta(n)$ |
| `heap[0]` | $\Theta(1)$ |
| `nsmallest(k, xs)`, `nlargest(k, xs)` | $\Theta(n \log k)$ |
| `merge(*iterables)` | $\Theta(N \log k)$ for $N$ items from $k$ streams |

## `bisect`

| Operation | Cost | Note |
|-----------|:---:|------|
| `bisect_left`, `bisect_right` | $\Theta(\log n)$ | `key=` since 3.10 |
| `insort` | $\Theta(n)$ | the search is $\log n$; the insert shifts |

## `str`, `bytes`, `int`

| Operation | Cost | Note |
|-----------|:---:|------|
| `s[i]`, `len(s)` | $\Theta(1)$ | fixed-width representation per string (PEP 393) |
| `s[a:b]` | $\Theta(k)$ | copies |
| `sub in s`, `s.find(sub)` | $\Theta(n)$ typical | two-way / Crochemore–Perrin style search for long needles (3.10+) |
| `"".join(parts)` | $\Theta(\text{total length})$ | |
| `s += t` in a loop | $\Theta(\text{total})$ on CPython when `s` has one reference; not guaranteed | measured equal to `join` ([Ch 21](./21_profiling_and_optimization.md)) |
| `hash(s)` | $\Theta(n)$ first time, then cached | |
| `int` `+`, `-`, comparison | $\Theta(\text{digits})$ | 30-bit digits; small ints effectively $\Theta(1)$ |
| `int` `*` | Karatsuba above a threshold, $\Theta(d^{1.585})$ | |
| `int.bit_count()`, `int.bit_length()` | $\Theta(\text{digits})$ | |

## Language-level costs (measured, `bench/`)

| Operation | ns (CPython 3.13, Xeon @ 2.1 GHz) | vs local load |
|-----------|:---:|:---:|
| local variable load | 11.3 | 1.0× |
| attribute read (instance dict / `__slots__`) | 10.8 | 1.0× |
| function call / method call | 18.2 / 19.7 | 1.6× / 1.8× |
| `property` read | 21.4 | 1.9× |
| `__getattr__` fallback | 40.5 | 3.6× |
| pure-Python data descriptor | 62.9 | 5.6× |
| entering a `try` block (nothing raised) | ≈ 0 extra | — |
| raising + catching `KeyError` | +100 over a lookup | ≈ 3.5× a guarded lookup |
| `ctypes` call to a C function | ~250 overhead | — |

---

**Next:** [Appendix C — DP Catalogue](./appendix_c_dp_catalogue.md) — every dynamic program in the book on one page.
