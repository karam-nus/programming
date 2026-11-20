---
title: "Chapter 5 — Iterators, Generators & Coroutines"
---

[← Back to Table of Contents](./README.md)

# Chapter 5 — Iterators, Generators & Coroutines

> *"A generator is a function whose frame refuses to die."*

## Overview

The `for` statement is sugar for a two-method protocol. Generators implement that protocol by suspending a frame mid-execution and resuming it later; `send`, `throw` and `yield from` turn the same machinery into a two-way channel; and native coroutines (`async def`) are that machinery with a different type tag and an event loop driving it. This chapter goes from the protocol to the frame to the event loop, then covers generator pipelines and generator-based context managers. It assumes frames from [Chapter 1](./01_from_source_to_bytecode.md).

<div class="diagram">
<div class="diagram-title">One mechanism, four surfaces</div>
<div class="diagram-grid cols-4">
  <div class="diagram-card accent"><div class="card-title">Iterator</div><div class="card-desc"><code>__iter__</code> + <code>__next__</code>; <code>StopIteration</code> ends it</div></div>
  <div class="diagram-card green"><div class="card-title">Generator</div><div class="card-desc">a suspended frame that implements the iterator protocol</div></div>
  <div class="diagram-card purple"><div class="card-title">Coroutine</div><div class="card-desc">a generator you can <code>send</code> into; <code>async def</code> + <code>await</code></div></div>
  <div class="diagram-card orange"><div class="card-title">Context manager</div><div class="card-desc">a generator split at its single <code>yield</code></div></div>
</div>
</div>

---

## The Iterator Protocol

| | |
|---|---|
| **Mechanism** | Iterable (`__iter__`) and iterator (`__iter__` returning self + `__next__`) |
| **Defined in** | Language Reference §3.3 / stdlib "Iterator Types"; PEP 234 |
| **Since** | 2.2 |
| **Hooks into** | `GET_ITER` and `FOR_ITER` instructions; `iter()`, `next()` |
| **Typical use** | Every `for` loop, unpacking, `list(x)`, `sum(x)`, `zip`, comprehensions |
| **Cost** | One `__next__` call per item (C-level for builtins) |
| **Prefer instead** | A generator function — rarely write `__next__` by hand |
| **Failure modes** | Re-iterating an exhausted iterator silently yields nothing; returning `self` from a container's `__iter__` makes it single-pass |

`for x in xs: body` compiles to `GET_ITER` then a `FOR_ITER` loop ([Chapter 1](./01_from_source_to_bytecode.md)). Desugared:

```python
def for_loop(xs, body):
    it = iter(xs)                 # calls type(xs).__iter__(xs)
    while True:
        try:
            x = next(it)          # calls type(it).__next__(it)
        except StopIteration:
            break
        body(x)

for_loop([1, 2, 3], print)
```

```text
1
2
3
```

The distinction between **iterable** and **iterator** matters. A list is iterable: each `iter(lst)` returns a fresh iterator. An iterator is iterable *once*: its `__iter__` returns itself.

```python
nums = [1, 2, 3]
it = iter(nums)
print(sum(it), sum(it))           # second pass: iterator already exhausted
gen = (n * n for n in nums)
print(list(gen), list(gen))
```

```text
6 0
[1, 4, 9] []
```

This is the single most common generator bug: passing a generator to a function that iterates its argument twice (computing a mean then a variance, validating then processing). A `DataLoader` is an iterable — each epoch's `for batch in loader` calls `__iter__` and gets a new iterator — which is why it can be looped over every epoch.

`iter()` has a second form, `iter(callable, sentinel)`, that calls `callable()` until it returns `sentinel` — the clean way to read fixed-size chunks:

```python
import io, functools

stream = io.BytesIO(b"abcdefgh")
print([chunk for chunk in iter(functools.partial(stream.read, 3), b"")])
```

```text
[b'abc', b'def', b'gh']
```

---

## Generators Are Suspended Frames

| | |
|---|---|
| **Mechanism** | Generator function: any `def` whose body contains `yield` |
| **Defined in** | PEP 255 (generators), PEP 342 (`send`/`throw`), PEP 380 (`yield from`); `Objects/genobject.c` |
| **Since** | 2.2 / 2.5 / 3.3 |
| **Hooks into** | Calling the function creates a generator object holding an unstarted frame |
| **Typical use** | Lazy sequences, streaming pipelines, coroutines, context managers |
| **Cost** | Resuming a generator is cheaper than a function call: the frame already exists |
| **Prefer instead** | A list, when the data is small and needed more than once |
| **Failure modes** | Single-pass; code before the first `yield` runs lazily (validation errors appear late) |

Calling a generator function runs **none** of its body. It returns a generator object that owns a frame with the instruction pointer at the start. Each `next()` resumes the frame until the next `yield`, which returns a value *and keeps the frame*:

```python
def countdown(n):
    print("  start")
    while n > 0:
        yield n
        n -= 1
    print("  done")

g = countdown(2)
print("created; state:", __import__("inspect").getgeneratorstate(g))
print(next(g))
print(next(g))
try:
    next(g)
except StopIteration:
    print("StopIteration")
```

```text
created; state: GEN_CREATED
  start
2
1
  done
StopIteration
```

<div class="callstack">
  <div class="frame"><div class="frame-name">&lt;module&gt;</div><div class="frame-body">next(g) — pushes the generator's existing frame</div></div>
  <div class="frame green"><div class="frame-name">countdown(n=1)</div><div class="frame-body">resumed after <code>yield n</code>; locals survived between calls</div></div>
</div>
<div class="callstack-label">A generator frame is pushed on next() and popped — not destroyed — on yield</div>

`return value` inside a generator raises `StopIteration(value)`; the value is what `yield from` evaluates to. Since PEP 479 (3.7), a `StopIteration` that *escapes* from inside the body (e.g. an inner bare `next()` on an exhausted iterator) is converted to `RuntimeError` instead of silently ending the outer generator.

### The argument-validation trap

Because the body doesn't start until the first `next()`, errors in arguments surface far from the call:

```python
def batches(xs, size):
    if size <= 0:
        raise ValueError("size must be positive")
    for i in range(0, len(xs), size):
        yield xs[i:i + size]

b = batches([1, 2, 3], 0)          # no error here
try:
    next(b)
except ValueError as e:
    print("raised at first next():", e)
```

```text
raised at first next(): size must be positive
```

The fix is a plain function that validates eagerly and returns an inner generator:

```python
def batches(xs, size):
    if size <= 0:
        raise ValueError("size must be positive")
    def gen():
        for i in range(0, len(xs), size):
            yield xs[i:i + size]
    return gen()

print(list(batches([1, 2, 3, 4, 5], 2)))
```

```text
[[1, 2], [3, 4], [5]]
```

---

## Two-Way Generators: `send`, `throw`, `close`

`yield` is an **expression**. `g.send(v)` resumes the frame and makes the paused `yield` evaluate to `v`. The first resume must be `next(g)` (or `send(None)`) to advance to the first `yield` ("priming").

```python
def running_mean():
    total, count, mean = 0.0, 0, None
    while True:
        x = yield mean           # receive a value, emit the current mean
        total += x; count += 1
        mean = total / count

avg = running_mean()
next(avg)                        # prime
print([avg.send(v) for v in (10, 20, 60)])
```

```text
[10.0, 15.0, 30.0]
```

`g.throw(exc)` raises `exc` at the paused `yield`; `g.close()` throws `GeneratorExit`, which runs `finally` blocks. This is why a generator with a `try/finally` or `with` inside releases its resource when closed or garbage-collected — and why it doesn't if you keep a half-consumed generator alive indefinitely.

### `yield from` delegation

`yield from sub` (PEP 380) does far more than `for x in sub: yield x`: it forwards `send`, `throw` and `close` to the subgenerator, and evaluates to the subgenerator's return value. That makes generators **composable as subroutines**, which is exactly what coroutines needed:

```python
def read_block():
    rows = []
    while (line := (yield)) != "END":
        rows.append(line)
    return rows                              # becomes the value of `yield from`

def read_file(blocks):
    while True:
        blocks.append((yield from read_block()))

out = []
p = read_file(out); next(p)
for line in ["a", "b", "END", "c", "END"]:
    p.send(line)
print(out)
```

```text
[['a', 'b'], ['c']]
```

---

## Generator Pipelines and `itertools`

Generators compose into lazy pipelines where each stage pulls one item at a time from the previous one. Memory stays $O(1)$ in the stream length, and the first result is available before the input is fully read:

```python
import itertools

def read(lines):
    for line in lines:
        yield line.strip()

def parse(rows):
    for row in rows:
        if row and not row.startswith("#"):
            name, score = row.split(",")
            yield name, float(score)

raw = ["# header", "alice,0.9", "", "bob,0.4", "carol,0.7"]
pipeline = parse(read(raw))
top = [n for n, s in itertools.islice(pipeline, 2)]
print(top)
```

```text
['alice', 'bob']
```

`itertools` is the standard vocabulary for these stages, implemented in C:

| Function | Does | Choose this when |
|----------|------|------------------|
| **`islice(it, start, stop)`** | lazy slicing | taking the first $k$ of an unbounded stream |
| **`chain.from_iterable(its)`** | flatten one level | concatenating shards or files |
| **`groupby(it, key)`** | group *consecutive* equal keys | input already sorted by key (sort first otherwise) |
| **`accumulate(it, fn)`** | running reduction | prefix sums ([Chapter 19](./19_data_structure_internals.md)), running max |
| **`pairwise(it)`** (3.10+) | overlapping pairs | differences, edges of a path |
| **`batched(it, n)`** (3.12+) | non-overlapping tuples of size $n$ | mini-batching a stream; `strict=True` (3.13+) to reject a short last batch |
| **`tee(it, n)`** | $n$ independent iterators | multiple consumers — beware it buffers everything between the fastest and slowest |
| **`product`, `permutations`, `combinations`** | combinatorial generation | brute-force cross-checks in Part IV |

```python
import itertools
print(list(itertools.batched(range(7), 3)))
print(list(itertools.accumulate([3, 1, 4, 1, 5], max)))
print([(k, len(list(g))) for k, g in itertools.groupby("aaabccdd")])
```

```text
[(0, 1, 2), (3, 4, 5), (6,)]
[3, 3, 4, 4, 5]
[('a', 3), ('b', 1), ('c', 2), ('d', 2)]
```

---

## Context Managers From Generators

The `with` protocol is `__enter__` / `__exit__(exc_type, exc, tb)`. `contextlib.contextmanager` turns a generator with exactly one `yield` into a context manager: code before the `yield` is `__enter__`, the yielded value is bound by `as`, and code after is `__exit__`. An exception in the `with` body is **thrown into the generator** at the `yield` — the `throw` mechanism above — so `try/finally` around the `yield` is mandatory for cleanup.

```python
import contextlib, time

@contextlib.contextmanager
def timer(label, sink):
    t0 = time.perf_counter()
    try:
        yield
    finally:
        sink.append((label, time.perf_counter() - t0 >= 0))

events = []
try:
    with timer("step", events):
        raise RuntimeError("boom")
except RuntimeError:
    pass
print(events)
```

```text
[('step', True)]
```

`contextlib` also provides `ExitStack` (a dynamic number of managers, e.g. opening $n$ files), `suppress`, `nullcontext` (an optional manager), and `chdir` (3.11+). `torch.no_grad()` and `torch.autocast` are class-based context managers that also work as decorators, via `contextlib.ContextDecorator`-style `__call__` ([Chapter 9](./09_decorators.md)).

---

## Native Coroutines and the Event Loop

`async def` creates a **coroutine function**; calling it returns a coroutine object — structurally a generator (same frame-suspension machinery in `Objects/genobject.c`), but a distinct type that cannot be iterated and must be awaited. `await x` is `yield from x.__await__()`: it suspends the coroutine and passes whatever the innermost awaitable yields all the way up to the driver.

The driver is the **event loop** (`Lib/asyncio/base_events.py`). Stripped to its essence: a queue of ready callbacks, and a selector that waits for I/O or timers. A task wraps a coroutine and calls `coro.send(None)` each time it is scheduled; when the coroutine suspends on a future, the task registers a callback to be rescheduled when the future completes.

<div class="cycle">
  <div class="cycle-step accent">run ready callbacks<br><small>task.send(None)</small></div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step green">coroutine awaits a future<br><small>suspends, yields it up</small></div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step purple">selector waits<br><small>I/O ready or timer due</small></div>
  <div class="cycle-arrow"></div>
  <div class="cycle-step orange">future resolved<br><small>its task becomes ready</small></div>
</div>

A complete toy event loop using plain generators makes the mechanism concrete:

<details class="code-fold">
<summary>A 30-line round-robin event loop driving generator "tasks" (30 lines)</summary>

```python
import collections, heapq

class Sleep:
    def __init__(self, ticks): self.ticks = ticks

def run(*tasks):
    ready = collections.deque((t, None) for t in tasks)
    sleeping, now, log = [], 0, []
    while ready or sleeping:
        if not ready:                                  # advance the clock to the next wake-up
            now, _, task = heapq.heappop(sleeping)
            ready.append((task, None))
            continue
        task, value = ready.popleft()
        try:
            request = task.send(value)
        except StopIteration as stop:
            log.append((now, stop.value))
            continue
        if isinstance(request, Sleep):
            heapq.heappush(sleeping, (now + request.ticks, id(task), task))
        else:
            ready.append((task, None))
    return log

def worker(name, delays):
    for d in delays:
        yield Sleep(d)
    return name

print(run(worker("a", [3, 3]), worker("b", [1, 1, 1]), worker("c", [5])))
```

```text
[(3, 'b'), (5, 'c'), (6, 'a')]
```

</details>

`asyncio` adds real I/O readiness via `selectors`, cancellation (throwing `CancelledError` into the coroutine), structured concurrency (`asyncio.TaskGroup`, 3.11+), and timeouts (`asyncio.timeout`, 3.11+). The essential property is visible in the toy: **switches happen only at `await`/`yield`**. A coroutine that runs a CPU-bound loop without awaiting blocks every other task — the event loop is cooperative, not preemptive. When to choose asyncio over threads or processes is a [Chapter 8](./08_concurrency_and_parallelism.md) decision.

---

## Key Takeaways

- `for` is `iter()` once plus `next()` until `StopIteration`; an iterable produces fresh iterators, an iterator is single-pass.
- Calling a generator function runs nothing; the body runs lazily between `yield`s on a frame that survives suspension — validate arguments eagerly in a wrapper.
- `yield` is an expression: `send`, `throw` and `close` make generators two-way, and `yield from` forwards all three and returns the subgenerator's result.
- Generator pipelines process streams in constant memory; `itertools` is the C-implemented vocabulary of pipeline stages.
- `@contextmanager` splits a generator at its `yield`; exceptions from the `with` body are thrown in at that point, so cleanup belongs in `finally`.
- Coroutines are the same suspension machinery driven by an event loop; switches happen only at `await`, so CPU-bound work in a coroutine blocks the whole loop.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 234 — Iterators | Yee, van Rossum, 2001 | peps.python.org/pep-0234 | The iterator protocol, `iter(callable, sentinel)` |
| PEP 255 — Simple Generators | Schemenauer, Peters, Hetland, 2001 | peps.python.org/pep-0255 | Generators as resumable frames |
| PEP 342 — Coroutines via Enhanced Generators | van Rossum, Eby, 2005 | peps.python.org/pep-0342 | `send`, `throw`, `close`, `yield` as expression |
| PEP 380 — Syntax for Delegating to a Subgenerator | Ewing, 2009 | peps.python.org/pep-0380 | `yield from` semantics and return values |
| PEP 479 — Change StopIteration handling inside generators | Angelico, van Rossum, 2014 | peps.python.org/pep-0479 | `StopIteration` → `RuntimeError` |
| PEP 492 — Coroutines with async and await | Selivanov, 2015 | peps.python.org/pep-0492 | Native coroutines, `__await__` |
| `itertools`, `contextlib`, `asyncio` docs | Python docs | docs.python.org/3/library/ | `batched`, `pairwise`, `TaskGroup`, `timeout` |
| `Objects/genobject.c`, `Lib/asyncio/base_events.py`, `Lib/asyncio/tasks.py` | CPython | github.com/python/cpython | Generator/coroutine objects, the loop and `Task.__step` |

---

**Next:** [Chapter 6 — Functional Programming](./06_functional_programming.md) — functions as values, and what Python does and doesn't give you for programming with them.
