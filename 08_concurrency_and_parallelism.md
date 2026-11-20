---
title: "Chapter 8 — Concurrency & Parallelism"
---

[← Back to Table of Contents](./README.md)

# Chapter 8 — Concurrency & Parallelism

> *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once." — Rob Pike*

## Overview

Concurrency is a property of program structure — several tasks in progress, interleaved. Parallelism is a property of execution — several tasks literally running at the same instant on different cores. CPython offers four mechanisms with different answers to both: threads, processes, `asyncio`, and (since 3.13) a free-threaded build. This chapter explains what the GIL does and does not protect, measures threads against processes on CPU-bound and I/O-bound work, shows race conditions the GIL does not prevent, and ends with a decision table. It assumes coroutines and the event loop from [Chapter 5](./05_iterators_generators_and_coroutines.md).

<div class="diagram">
<div class="diagram-title">Four mechanisms, two questions</div>
<div class="diagram-grid cols-4">
  <div class="diagram-card accent"><div class="card-title">Threads</div><div class="card-desc">concurrent: yes · parallel Python bytecode: no (GIL build) · shared memory · preemptive</div></div>
  <div class="diagram-card green"><div class="card-title">Processes</div><div class="card-desc">concurrent: yes · parallel: yes · separate memory, pickled messages</div></div>
  <div class="diagram-card purple"><div class="card-title">asyncio</div><div class="card-desc">concurrent: yes · parallel: no · one thread, cooperative switches at await</div></div>
  <div class="diagram-card orange"><div class="card-title">Free-threaded</div><div class="card-desc">3.13t/3.14t: threads that run bytecode in parallel · shared memory · you need locks</div></div>
</div>
</div>

---

## What the GIL Is

| | |
|---|---|
| **Mechanism** | Global Interpreter Lock: one mutex per interpreter that a thread must hold to execute Python bytecode |
| **Defined in** | `Python/ceval_gil.c`; PEP 703 (making it optional), PEP 684 (per-interpreter GIL) |
| **Since** | Always in the default build; optional in the free-threaded build (3.13 experimental, 3.14 officially supported per PEP 779) |
| **Hooks into** | The eval loop drops and re-acquires it on a switch interval (`sys.getswitchinterval()`, default 5 ms) and around blocking calls |
| **Typical use** | Implicit; C extensions release it around long computations and I/O |
| **Cost** | CPU-bound Python threads don't scale past one core |
| **Prefer instead** | Processes, vectorised libraries that release the GIL, or the free-threaded build |
| **Failure modes** | Believing it makes your code thread-safe — it makes *bytecode instructions* atomic, not your operations |

The GIL exists because CPython's memory management — reference counts on every object ([Chapter 2](./02_objects_names_and_memory.md)) — is not thread-safe, and a single lock was far cheaper than fine-grained locking for single-threaded code. Two facts matter in practice:

1. **The GIL is released during blocking I/O** (`socket.recv`, `file.read`, `time.sleep`) and by C extensions during long computations. NumPy releases it inside most array operations; PyTorch releases it around kernel launches and many CPU ops; `hashlib` and `zlib` release it for large buffers. So threads *do* parallelise when the heavy work happens in such code.
2. **It is held while running Python bytecode**, so a loop written in Python can't use more than one core from threads.

---

## Measured: Threads vs Processes

From `bench/concurrency.py` (CPython 3.13.18 GIL build, 4 vCPU Xeon @ 2.1 GHz, 8 jobs on 4 workers):

| Workload | Serial (s) | 4 threads (s) | 4 processes (s) | Choose this when |
|----------|:---:|:---:|:---:|------------------|
| **CPU-bound** (pure-Python loop, 2M iterations/job) | 0.66 | 0.65 | 0.25 | processes for pure-Python CPU work |
| **I/O-bound** (50 ms `sleep`/job) | 0.40 | 0.10 | 0.11 | threads for blocking I/O |

Threads give *no* speedup on the CPU-bound job — the GIL serialises the bytecode — and a near-ideal 4× on the I/O-bound job, because sleeping threads release it. Processes give 2.6× on CPU-bound work with 4 workers (not 4×: process start-up and pickling results cost time, and 4 vCPUs in a container are not 4 dedicated cores) and match threads on I/O, at a higher memory and start-up cost.

### `concurrent.futures` as the common interface

| | |
|---|---|
| **Mechanism** | `ThreadPoolExecutor` / `ProcessPoolExecutor` / `InterpreterPoolExecutor` (3.14+) behind one `Executor` API |
| **Defined in** | PEP 3148; `Lib/concurrent/futures/` |
| **Since** | 3.2 |
| **Hooks into** | `submit` → `Future`; `map`; `as_completed` |
| **Typical use** | Fan-out of independent jobs: downloads, file preprocessing, evaluation shards |
| **Cost** | Threads: ~tens of µs to submit; processes: pickling arguments and results |
| **Prefer instead** | `multiprocessing.Pool` for `imap` with chunking; `DataLoader(num_workers=…)` for training data |
| **Failure modes** | Unpicklable arguments to process pools (lambdas, closures — use `functools.partial`, [Chapter 6](./06_functional_programming.md)); exceptions hidden until `.result()` |

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def fetch(i):
    time.sleep(0.02 * (3 - i))          # later jobs finish first
    if i == 1:
        raise ValueError(f"job {i} failed")
    return i * 10

with ThreadPoolExecutor(max_workers=3) as ex:
    futures = {ex.submit(fetch, i): i for i in range(3)}
    for fut in as_completed(futures):
        try:
            print("job", futures[fut], "->", fut.result())
        except ValueError as e:
            print("job", futures[fut], "-> error:", e)
```

```text
job 2 -> 20
job 1 -> error: job 1 failed
job 0 -> 0
```

`as_completed` yields futures in completion order; the exception raised inside a worker is re-raised by `.result()`. A future nobody calls `.result()` on swallows its exception silently — always collect results.

**Process start methods.** On Linux the default was `fork` (copy the parent's memory) until 3.14, which made it `forkserver`; macOS and Windows use `spawn`. `fork` after CUDA initialisation or after starting threads is unsafe (child processes inherit locks in unknown states), which is why PyTorch recommends `spawn` for multi-GPU work. Under `spawn`, the worker re-imports your module, so process-pool code must sit under `if __name__ == "__main__":`.

---

## Race Conditions the GIL Doesn't Prevent

The GIL guarantees that a single bytecode instruction is not interrupted halfway. A Python *statement* like `balance += 1` is several instructions — load, add, store — and a thread switch can fall between them. Making the window wide shows the effect deterministically:

```python
import threading, time

balance = 0

def deposit(n):
    global balance
    for _ in range(n):
        current = balance      # read
        time.sleep(0)          # yields the GIL: another thread may run here
        balance = current + 1  # write back a stale value

threads = [threading.Thread(target=deposit, args=(1000,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print("expected 4000, lost updates:", balance < 4000)
```

```text
expected 4000, lost updates: True
```

Without the `sleep(0)` the window is a few instructions and the bug appears rarely — which is worse, because it passes tests. The fix is a lock around the read-modify-write:

```python
import threading

balance = 0
lock = threading.Lock()

def deposit(n):
    global balance
    for _ in range(n):
        with lock:
            balance += 1

threads = [threading.Thread(target=deposit, args=(1000,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(balance)
```

```text
4000
```

| Operation on shared builtins | Atomic in the GIL build? | Guaranteed by the language? |
|------------------------------|:---:|:---:|
| `lst.append(x)`, `dct[k] = v`, `x = dct.get(k)` | yes (one C call) | no — free-threaded builds use per-object locks to keep it true |
| `counter += 1` on an int | **no** | no |
| `if k not in d: d[k] = v` | **no** (check-then-act) | no — use `d.setdefault(k, v)` |
| iterating a dict while another thread mutates it | no — may raise `RuntimeError` | no |

**Shared state is the problem, not threads.** The structural fixes are, in order of preference: don't share (each worker owns its data, results come back through futures); share immutable data; communicate through a `queue.Queue` (thread-safe by design); and only then lock.

---

## asyncio: Many Waits, One Thread

`asyncio` runs thousands of concurrent I/O-bound tasks on one thread, switching only at `await` ([Chapter 5](./05_iterators_generators_and_coroutines.md)). There are no preemptive switches, so no data race can occur between two `await`s — but the whole loop blocks if any coroutine computes or calls a blocking function.

```python
import asyncio, time

async def call_api(i):
    await asyncio.sleep(0.05)            # stands in for an HTTP request
    return i

async def main():
    t0 = time.perf_counter()
    async with asyncio.TaskGroup() as tg:          # 3.11+: structured concurrency
        tasks = [tg.create_task(call_api(i)) for i in range(100)]
    elapsed = time.perf_counter() - t0
    return sum(t.result() for t in tasks), elapsed < 0.5

print(asyncio.run(main()))
```

```text
(4950, True)
```

One hundred 50 ms waits finish in about 50 ms total. Threads would achieve the same with 100 OS threads (each with its own stack, default 8 MB of reserved virtual memory on Linux); asyncio does it with 100 small coroutine objects. The trade-off is **colour**: every function on the path must be `async`, and synchronous libraries must be pushed to a thread with `await asyncio.to_thread(fn, …)` (3.9+) so they don't block the loop.

`TaskGroup` cancels the remaining tasks if one fails and raises an `ExceptionGroup` (PEP 654), handled with `except*`. Prefer it to `asyncio.gather`, which leaves sibling tasks running on failure unless told otherwise.

---

## Free-Threaded Python

| | |
|---|---|
| **Mechanism** | A separate CPython build (`python3.13t`, `python3.14t`) with the GIL removed |
| **Defined in** | PEP 703 (design), PEP 779 (3.14: supported, phase II) |
| **Since** | 3.13 experimental; 3.14 officially supported but not the default; 3.15 adds a stable ABI for free-threaded extensions and macOS installers include it by default |
| **Hooks into** | Biased reference counting, per-object mutexes for builtins, mimalloc, deferred refcounting for some objects |
| **Typical use** | CPU-bound pure-Python work that parallelises across threads with shared memory |
| **Cost** | Single-threaded code runs somewhat slower than the GIL build (overhead was reduced substantially in 3.14); C extensions must opt in |
| **Prefer instead** | Processes or vectorised libraries until your dependency stack supports it |
| **Failure modes** | An extension without free-threading support re-enables the GIL at import (with a warning); latent races in your code become real |

Check which build you are on:

```python
import sys, sysconfig
print("free-threaded build:", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
print("GIL currently enabled:", sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True)
```

```text
free-threaded build: False
GIL currently enabled: True
```

(Output from this book's standard 3.13 build.) On a free-threaded build, the CPU-bound row of the benchmark table is expected to look like the process column without the pickling cost — but that depends on every imported C extension declaring support. The race-condition examples above become *more* likely to bite, not less: the GIL was hiding them.

**Subinterpreters** (PEP 734; `concurrent.interpreters` and `InterpreterPoolExecutor` in 3.14) are the third route: multiple interpreters in one process, each with its own GIL (PEP 684), sharing nothing by default. They sit between threads and processes — parallel, isolated, cheaper to start than processes — and are mainly useful when extensions support them.

---

## Decision Table

| Your bottleneck | Use | Because | Avoid |
|-----------------|-----|---------|-------|
| **Waiting on network/disk, tens of tasks** | `ThreadPoolExecutor` | simplest; GIL released while blocked | processes (overhead) |
| **Waiting on network, thousands of tasks** | `asyncio` (+ an async client library) | coroutines are cheap; structured cancellation | threads per connection |
| **Pure-Python CPU work** | `ProcessPoolExecutor` / `multiprocessing` | true parallelism | threads (GIL build) |
| **Array/tensor math** | one thread + NumPy/PyTorch, or threads | the library parallelises and releases the GIL | processes copying large arrays |
| **Training data loading** | `DataLoader(num_workers=N)` | worker processes, pinned-memory handoff | hand-rolled pools |
| **CPU work with large shared read-only state** | free-threaded build (when deps allow), or `multiprocessing.shared_memory` | avoids per-process copies | `fork` after CUDA init |

The overarching rule from [Chapter 21](./21_profiling_and_optimization.md) applies first: profile to learn whether you are CPU-bound or waiting, and fix the algorithm before adding workers.

---

## Key Takeaways

- Concurrency is structure (interleaving); parallelism is simultaneous execution. Threads and asyncio give the first; processes and free-threaded threads give both.
- The GIL serialises bytecode, not I/O: threads give ~no speedup on pure-Python CPU work and near-linear speedup on blocking I/O (measured: 0.66 s → 0.65 s vs 0.40 s → 0.10 s).
- The GIL makes single instructions atomic, not statements: `x += 1` and check-then-act sequences race. Prefer not sharing, then queues, then locks.
- `concurrent.futures` unifies threads and processes; always collect `.result()` or exceptions vanish; process pools need picklable callables and a `__main__` guard.
- asyncio handles thousands of waits on one thread; any blocking call stalls everything, so offload with `asyncio.to_thread` and use `TaskGroup` for structured cancellation.
- Free-threaded CPython (3.14+ supported, not default) removes the GIL; extension support decides whether it helps, and hidden races become real.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 703 — Making the GIL Optional | Gross, 2023 | peps.python.org/pep-0703 | Free-threading design: biased refcounting, per-object locks |
| PEP 779 — Criteria for supported status for free-threaded Python | Wouters, Page, Gross, 2025 | peps.python.org/pep-0779 | Supported status in 3.14 |
| What's New in Python 3.14 / 3.15 | Python docs | docs.python.org/3.15/whatsnew/3.15.html | `forkserver` default, `InterpreterPoolExecutor`, free-threaded stable ABI |
| PEP 684, PEP 734 | Snow, 2022; Snow, 2023 | peps.python.org | Per-interpreter GIL; subinterpreters in the stdlib |
| PEP 3148 — futures | Quinlan, 2009 | peps.python.org/pep-3148 | Executor/Future API |
| PEP 654 — Exception Groups and except* | Katriel, Selivanov, van Rossum, 2021 | peps.python.org/pep-0654 | `TaskGroup` error semantics |
| Python free-threading HOWTO | Python docs | docs.python.org/3/howto/free-threading-python.html | Checking the build, extension compatibility |
| PyTorch multiprocessing best practices | PyTorch docs | pytorch.org/docs/stable/notes/multiprocessing.html | `spawn` vs `fork` with CUDA |
| `bench/concurrency.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Threads vs processes timings |

---

**Next:** [Chapter 9 — Decorators](./09_decorators.md) — Part III begins: code that operates on code.
