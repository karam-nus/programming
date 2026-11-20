---
title: "Chapter 21 — Profiling & Optimization"
---

[← Back to Table of Contents](./README.md)

# Chapter 21 — Profiling & Optimization

> *"The first rule of optimization is: measure. The second rule is: measure the thing you changed."*

## Overview

Programmers are reliably wrong about where time goes. This chapter is the discipline that replaces guessing: microbenchmarks with `timeit`, deterministic profiling with `cProfile`, sampling profilers for production processes (`py-spy`, and the new `profiling` package in 3.15), and memory profiling with `tracemalloc`. Then the **optimization ladder** — algorithm, data structure, builtins, caching, batching, leaving Python — with each rung's effect measured. The headline result: the data-structure rung was worth 300×, the classic micro-optimisation 1.2×, and one folk rule (avoid `s +=`) measured as no effect at all on current CPython. It builds on the cost model of [Chapter 13](./13_complexity_and_cost_models.md).

<div class="diagram">
<div class="diagram-title">The measurement loop</div>
<div class="cycle">
  <div class="cycle-step accent">Profile<br><small>where is the time?</small></div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step green">Hypothesise<br><small>which rung fixes it?</small></div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step purple">Change one thing</div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step orange">Re-measure<br><small>and check correctness</small></div>
</div>
</div>

---

## Microbenchmarks with `timeit`

| | |
|---|---|
| **Mechanism** | Run a statement in a loop with the GC disabled; report total time |
| **Defined in** | `Lib/timeit.py` |
| **Since** | 2.3 |
| **Hooks into** | `time.perf_counter` |
| **Typical use** | Comparing two implementations of a small, hot operation |
| **Cost** | n/a |
| **Prefer instead** | A profiler when you don't yet know what is slow |
| **Failure modes** | Benchmarking a cached or constant-folded expression; measuring warm-up; ignoring variance |

Rules that make numbers trustworthy, all followed by this book's `bench/` scripts:

1. **Repeat and summarise.** `timeit.repeat(..., repeat=5)`, then `min` for "best achievable" or `median` for "typical". Report which.
2. **Keep setup out of the timed statement.** Build inputs in `setup` (or outside the lambda).
3. **Beware constant folding and caching.** `timeit("2 ** 10")` measures loading a constant — the compiler folded it ([Chapter 1](./01_from_source_to_bytecode.md)).
4. **State conditions.** Interpreter version and build, CPU, input size. Prefer ratios.
5. **Check the answers are equal** before comparing speeds.

From the command line: `python -m timeit -s "xs = list(range(1000))" "sum(xs)"`.

---

## Deterministic Profiling: `cProfile`

| | |
|---|---|
| **Mechanism** | A C-level hook records every function call and return with timestamps |
| **Defined in** | `Lib/cProfile.py`, `Modules/_lsprof.c`, `Lib/pstats.py` |
| **Since** | 2.5 |
| **Hooks into** | `sys.setprofile`-style call/return events (3.12+: `sys.monitoring` underneath) |
| **Typical use** | Finding which functions dominate a script's runtime |
| **Cost** | Adds overhead per call — inflates programs with many tiny calls |
| **Prefer instead** | A sampling profiler for long-running or production processes |
| **Failure modes** | Function-level only (no line detail); overhead distorts call-heavy code; C-extension internals are opaque |

```python
import cProfile, io, pstats

def parse(lines):
    return [line.split(",") for line in lines]

def featurize(rows):
    vocab = []
    for row in rows:
        for tok in row:
            if tok not in vocab:          # Θ(V) membership on a list
                vocab.append(tok)
    return vocab

def pipeline():
    lines = [f"tok{i % 700},tok{(i * 7) % 700}" for i in range(4000)]
    return featurize(parse(lines))

prof = cProfile.Profile()
prof.enable(); pipeline(); prof.disable()
stats = pstats.Stats(prof, stream=io.StringIO()).sort_stats("cumulative")
top = [(func[2], round(cum / stats.total_tt, 2)) for func, (cc, nc, tt, cum, callers) in stats.stats.items()]
print(max((t for t in top if t[0] in ("parse", "featurize")), key=lambda t: t[1])[0])
```

```text
featurize
```

The profile points at `featurize`, and the cause is visible in its body: membership testing on a growing list, $\Theta(V)$ per token. In practice, run `python -m cProfile -o out.prof script.py` and explore `out.prof` with `pstats` (`sort_stats("cumulative").print_stats(15)`) or a viewer such as `snakeviz`. Read **cumulative** time to find the expensive subtree and **tottime** (time in the function itself, excluding callees) to find the hot leaf.

---

## Sampling Profilers

A sampling profiler interrupts the program at a fixed rate and records the current stack. Overhead is low and independent of call frequency, so it can attach to a running process — a stuck training job, a slow inference server — without restarting it.

| Tool | Attaches to running process | Native (C/C++) frames | Line-level | Choose this when |
|------|:---:|:---:|:---:|------------------|
| **`py-spy`** | yes (`py-spy dump --pid`, `top`, `record`) | yes (`--native`) | yes | production processes, flame graphs |
| **`profiling.sampling`** (3.15+, PEP 799) | yes | — | yes | stdlib-only environments on 3.15 |
| **Scalene** | no | separates Python vs native vs GPU time | yes | "is my time in Python or in C?" plus memory |
| **`line_profiler`** (`@profile` + `kernprof`) | no | no | yes, deterministic | one known-hot function, line by line |
| **PyTorch profiler / Nsight Systems** | — | CUDA kernels | op-level | GPU workloads ([NVIDIA](https://karam-nus.github.io/nvidia/) volume) |

```bash
py-spy record -o profile.svg --pid 12345          # flame graph of a live process
```

```bash
py-spy dump --pid 12345                           # where is every thread right now? (a hang)
```

PEP 799 (3.15) reorganised the stdlib's profilers into a `profiling` package — `profiling.tracing` for the deterministic profiler (what `cProfile` provides) and `profiling.sampling` for a built-in statistical profiler that can attach to a running process. `cProfile` remains available as an alias.

---

## Memory Profiling: `tracemalloc`

| | |
|---|---|
| **Mechanism** | Hooks CPython's allocator and records the traceback of each allocation |
| **Defined in** | PEP 454; `Lib/tracemalloc.py` |
| **Since** | 3.4 |
| **Hooks into** | `PyMem_*` / `PyObject_*` allocator domains |
| **Typical use** | Finding which lines allocate the most; diffing snapshots to find leaks |
| **Cost** | Significant slowdown and memory while tracing |
| **Prefer instead** | `memray` for native allocations and flame graphs; `torch.cuda.memory_summary()` for GPU |
| **Failure modes** | Doesn't see memory allocated by C libraries with their own allocators (most of NumPy's and PyTorch's buffers) |

```python
import tracemalloc

tracemalloc.start()
before = tracemalloc.take_snapshot()
cache = {i: [0.0] * 100 for i in range(2000)}         # ~2000 lists of 100 floats
after = tracemalloc.take_snapshot()
tracemalloc.stop()

top = after.compare_to(before, "lineno")[0]
print(top.size_diff > 1_000_000, top.count_diff >= 2000)
```

```text
True True
```

The largest diff entry points at the dict comprehension's line, with ~1.6 MB across ≥2000 new blocks. Snapshot diffs taken between iterations of a training loop are the standard way to find a Python-side leak — usually a list that accumulates loss tensors (keeping their graphs alive) or an unbounded cache ([Chapter 19](./19_data_structure_internals.md)).

---

## The Optimization Ladder, Measured

From `bench/optimization_ladder.py` (CPython 3.13.18, Xeon @ 2.1 GHz, median of 5):

| Rung | Before | After | ms before → after | Speedup | Choose this when |
|------|--------|-------|:---:|:---:|------------------|
| **1. Algorithm / data structure** | dedup via `if w not in out` on a list | `list(dict.fromkeys(ws))` | 61.2 → 0.20 | **~300×** | any membership test or lookup inside a loop |
| **2. Builtins** | `for` loop accumulating `math.sqrt(x)` | `sum(map(math.sqrt, xs))` | 3.04 → 1.91 | 1.6× | a hot loop has a builtin equivalent |
| **3. Micro: cache a global in a local** | `math.sqrt` looked up each iteration | `sqrt=math.sqrt` default arg | 3.04 → 2.49 | 1.2× | rarely — after the above, in a measured hot loop |
| **Folk rule: avoid `s += piece`** | `s += str(i)` | `"".join(map(str, …))` | 6.42 → 6.82 | **none** | use `join` for clarity and portability, not speed, on CPython |

The ordering is the lesson. The data-structure change is worth more than every micro-optimisation in this chapter combined, and it is the change a profile points at directly. The `s +=` result reflects a CPython-specific optimisation: when the left operand's refcount is 1, `BINARY_OP` resizes the string in place instead of copying. It is not guaranteed by the language — PyPy and other implementations may be quadratic — and it breaks as soon as another reference to `s` exists, so `"".join` remains the correct idiom; but "`+=` is slow" is no longer true on CPython as a measured fact.

The remaining rungs, in order:

4. **Caching** — `functools.cache` for pure functions with repeated arguments ([Chapter 15](./15_dynamic_programming_foundations.md)); `cached_property` for derived attributes ([Chapter 10](./10_descriptors.md)). Check the hit rate (`cache_info()`); a cache with a 0% hit rate is pure overhead.
5. **Batching** — amortise per-call overhead: one `executemany` instead of $n$ `execute`s, one tensor op on a batch instead of a Python loop over samples, one HTTP request with 100 items. Per-call costs in Python (~20 ns, [Chapter 13](./13_complexity_and_cost_models.md)) and per-kernel-launch costs on a GPU (microseconds) make batching the most important rung for ML code.
6. **Concurrency** — only once the single-threaded program is efficient, and only of the kind that matches the bottleneck ([Chapter 8](./08_concurrency_and_parallelism.md)).
7. **Leaving Python** — vectorise with NumPy/PyTorch, or compile the hot kernel ([Chapter 22](./22_beyond_python.md)).

---

## Idioms With Real Effects

| Slow pattern | Fast pattern | Why |
|--------------|--------------|-----|
| `x in list_` in a loop | `x in set_` (build once) | $\Theta(n)$ → $\Theta(1)$ avg |
| `list.pop(0)` / `insert(0, x)` | `deque.popleft()` / `appendleft` | $\Theta(n)$ → $\Theta(1)$ |
| `sorted(xs)[:k]` for small $k$ | `heapq.nsmallest(k, xs)` | $\Theta(n \log n)$ → $\Theta(n \log k)$ |
| repeated `re.compile`-free `re.match(pattern, s)` in a loop | compile once | `re` caches, but the lookup still costs; compiled patterns are clearer |
| building a dict of counts by hand | `collections.Counter(xs)` | C loop |
| `for i in range(len(xs)): ... xs[i]` | `for x in xs` / `enumerate` | fewer index operations, clearer |
| appending tensors' `.item()` per step in a training loop | accumulate on device, sync once | each `.item()` forces a GPU→CPU synchronisation |
| a Python loop over NumPy elements | a vectorised NumPy expression | interpreter dispatch per element → one C loop |

The last two rows are where ML code most often loses orders of magnitude: per-element Python work on data that lives in an array library.

---

## Key Takeaways

- Measure before and after every change: `timeit` with repeats and stated conditions for small operations, `cProfile` for "which function", sampling profilers for live processes.
- Read cumulative time to find the expensive subtree, `tottime` to find the hot leaf.
- `tracemalloc` snapshot diffs find Python-level leaks; it cannot see buffers allocated by NumPy/PyTorch's own allocators.
- Climb the ladder in order: algorithm/data structure (measured 300×), builtins (1.6×), micro-optimisations (1.2×), then caching, batching, concurrency, leaving Python.
- `s +=` string building measured no slower than `join` on CPython 3.13 because of in-place resizing; use `join` anyway for portability.
- Batching is the decisive rung for ML code: per-call overhead in Python and per-launch or per-sync overhead on GPUs dominate small operations.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| `timeit`, `cProfile`/`pstats`, `tracemalloc` docs | Python docs | docs.python.org/3/library/profile.html | APIs and measurement caveats |
| PEP 454 — tracemalloc | Stinner, 2013 | peps.python.org/pep-0454 | Allocation tracing design |
| PEP 799 — A dedicated profiling package | Galindo Salgado, 2025 | peps.python.org/pep-0799 | `profiling.tracing` / `profiling.sampling` (3.15) |
| What's New in Python 3.15 | Python docs, 2026 | docs.python.org/3.15/whatsnew/3.15.html | Profiling package availability |
| py-spy | Frederickson | github.com/benfred/py-spy | Sampling a live process, native frames |
| "Scalene: Scripting-Language Aware Profiling" | Berger, Stern, Altmayer Pizzorno, OSDI 2023 | usenix.org/conference/osdi23 | Separating Python, native and GPU time |
| `Objects/unicodeobject.c` / `Python/bytecodes.c` (in-place `+=` for unique strings) | CPython | github.com/python/cpython | Why `s +=` is not quadratic on CPython |
| `bench/optimization_ladder.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Every speedup in the ladder table |

---

**Next:** [Chapter 22 — Beyond Python](./22_beyond_python.md) — the top rung: moving the hot loop into compiled code.
