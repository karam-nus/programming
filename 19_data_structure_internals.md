---
title: "Chapter 19 — Data Structure Internals"
---

[← Back to Table of Contents](./README.md)

# Chapter 19 — Data Structure Internals

> *"Every complexity bound in your head is a claim about a C struct. Read the struct."*

## Overview

Part IV's algorithms are only as fast as the containers they run on. This chapter opens the CPython implementations of `list`, `dict`, `set`, `deque` and `heapq`, derives their costs from their layouts, and shows the observable consequences: when dicts resize, why `-1` and `-2` hash the same, why deleting from a dict doesn't shrink it, why `deque` beats `list` at one end but loses at indexing. It then covers technique-level structures that are built from these — prefix sums, monotonic stacks and queues, tries — which turn whole classes of $\Theta(n^2)$ problems into $\Theta(n)$. All costs here are collected in [Appendix B](./appendix_b_complexity_reference.md). Sizes are from CPython 3.13 on 64-bit Linux.

<div class="diagram">
<div class="diagram-title">The four core layouts</div>
<div class="diagram-grid cols-4">
  <div class="diagram-card accent"><div class="card-title">list</div><div class="card-desc">contiguous array of PyObject* with geometric over-allocation</div></div>
  <div class="diagram-card green"><div class="card-title">dict</div><div class="card-desc">sparse index table + dense, insertion-ordered entries array</div></div>
  <div class="diagram-card purple"><div class="card-title">set</div><div class="card-desc">open-addressed hash table of (hash, key) with linear-probe runs</div></div>
  <div class="diagram-card orange"><div class="card-title">deque</div><div class="card-desc">doubly-linked list of fixed 64-slot blocks</div></div>
</div>
</div>

---

## `list`: A Dynamic Array

The `PyListObject` (`Include/cpython/listobject.h`) holds `ob_item`, a pointer to a C array of `PyObject*`, plus `allocated` (capacity). [Chapter 13](./13_complexity_and_cost_models.md) derived amortized $\Theta(1)$ append from the over-allocation rule. Everything else follows from contiguity:

| Operation | Cost | Why |
|-----------|:---:|-----|
| `xs[i]`, `xs[i] = v`, `len(xs)` | $\Theta(1)$ | pointer arithmetic |
| `append`, `pop()` | $\Theta(1)$ amortized | end of the array |
| `insert(i, v)`, `pop(i)`, `del xs[i]` | $\Theta(n - i)$ | `memmove` of the tail |
| `v in xs`, `xs.index(v)`, `xs.count(v)` | $\Theta(n)$ | linear scan calling `__eq__` |
| `xs[a:b]` | $\Theta(b - a)$ | copies pointers (and increments refcounts) |
| `xs.sort()` | $\Theta(n \log n)$; $\Theta(n)$ on sorted/reversed runs | Timsort |

Because the array holds *pointers*, a list of floats is an array of addresses of separately allocated 24-byte float objects scattered on the heap — cache-hostile compared with NumPy's contiguous `float64` buffer. That layout difference, more than interpretation overhead alone, is why vectorised array code is 10–100× faster ([Chapter 22](./22_beyond_python.md), and the [Vectorization](https://github.com/karam-nus/vectorization) volume).

### Timsort

`list.sort` is **Timsort** (Peters, 2002; `Objects/listsort.txt`): find natural ascending or strictly descending **runs**, extend short runs to a minimum length with binary insertion sort, and merge runs with a stack discipline that keeps merges balanced, using "galloping" (exponential search) when one run dominates. Consequences: stable; $\Theta(n)$ on already-sorted or reverse-sorted data; very fast on "mostly sorted" data such as appending a few items to a sorted list and re-sorting. Since 3.11, the run-merging policy is **powersort** (Munro & Wild), which provably merges near-optimally.

```python
import random, timeit

random.seed(0)
data = list(range(200_000))
almost = data[:]
for _ in range(100):
    i, j = random.randrange(len(almost)), random.randrange(len(almost))
    almost[i], almost[j] = almost[j], almost[i]
shuffled = data[:]
random.shuffle(shuffled)
t = {name: min(timeit.repeat(lambda xs=xs: sorted(xs), number=3, repeat=3)) for name, xs in
     [("sorted", data), ("100 swaps", almost), ("shuffled", shuffled)]}
print({k: t[k] / t["shuffled"] < 0.2 for k in ("sorted", "100 swaps")})
```

```text
{'sorted': True, '100 swaps': True}
```

On this book's machine (CPython 3.13, Xeon @ 2.1 GHz), sorting 200 000 already-sorted ints took 3% of the time for the shuffled list, and the list with 100 random swaps 5% — run detection turns "mostly sorted" into nearly linear work.

---

## `dict`: Compact, Ordered, Open-Addressed

Since 3.6 (an implementation detail made a language guarantee in 3.7), a dict is two arrays (`Objects/dictobject.c`; its header comment is the best documentation):

- **`dk_indices`** — a sparse hash table of small integers (1, 2, 4 or 8 bytes each, depending on table size) pointing into the entries array, or marked empty/deleted.
- **`dk_entries`** — a dense array of `(hash, key, value)` in **insertion order**.

A lookup hashes the key, probes `dk_indices` starting at `hash & mask`, and for each non-empty slot compares the stored hash and then (only if the hashes match) the key with `==`. The probe sequence is not linear: `i = (5*i + 1 + perturb) & mask` with `perturb >>= 5` each step, which mixes in the high bits of the hash so that keys with equal low bits don't collide forever.

Why two arrays? The index table must be sparse (load ≤ 2/3) for short probes, but with 1-byte indices for small dicts the sparse part is tiny; the 24-byte entries are dense. That roughly halved memory relative to the pre-3.6 layout, and iteration order became insertion order for free.

**When dicts resize.** The usable size is 2/3 of the table size; inserting beyond it triggers a resize to a larger power of two:

```python
import sys

d, last, events = {}, sys.getsizeof({}), []
for i in range(200):
    d[i] = i
    if sys.getsizeof(d) != last:
        last = sys.getsizeof(d); events.append((len(d), last))
print(events)
```

```text
[(1, 224), (6, 352), (11, 632), (22, 1168), (43, 2264), (86, 4688), (171, 9304)]
```

Resizes happen on inserting the 6th, 11th, 22nd, 43rd, 86th and 171st keys — one more than $\lfloor 2/3 \cdot 2^k \rfloor$ for tables of size 8, 16, 32, 64, 128, 256. Each resize is $\Theta(n)$ and the table doubles, so insertion is $\Theta(1)$ amortized by the argument of [Chapter 13](./13_complexity_and_cost_models.md).

**Deletion doesn't shrink.** `del d[k]` marks the index slot as deleted (a "dummy", needed so probe chains stay intact) and leaves a hole in the entries array. A dict that grew large and was emptied keeps its memory until it is copied:

```python
import sys

d = {i: i for i in range(1000)}
for i in range(990):
    del d[i]
print(len(d), sys.getsizeof(d), sys.getsizeof(dict(d)))
```

```text
10 36952 352
```

A long-lived cache dict that churns keys should be rebuilt periodically (`d = dict(d)`), or bounded (`functools.lru_cache(maxsize=…)`, an `OrderedDict` with `popitem(last=False)`).

### Hashes

| | |
|---|---|
| **Mechanism** | `hash(x)` → `type(x).__hash__`; ints hash to themselves modulo the Mersenne prime $2^{61}-1$ |
| **Defined in** | `Python/pyhash.c`, `Objects/longobject.c` (`long_hash`); Language Reference §3.3.1 `__hash__` |
| **Since** | Numeric hash unification 3.2; randomized `str`/`bytes` hashing (SipHash) 3.3, PEP 456 |
| **Hooks into** | dict/set insertion and lookup |
| **Typical use** | Implicit |
| **Cost** | Strings cache their hash after the first computation |
| **Prefer instead** | n/a |
| **Failure modes** | Relying on `hash(str)` across processes (randomized per process; set `PYTHONHASHSEED` for reproducibility); mutable keys |

```python
print(hash(1), hash(2**61 - 1), hash(2**61), hash(-1), hash(-2), hash(1.5) == hash(3 / 2))
```

```text
1 0 1 -2 -2 True
```

`hash(-1)` is `-2` because `-1` is the C API's error return value from `tp_hash`, so it can never be a real hash. Collisions like this are harmless — the dict compares keys after hashes match — but they show that a hash is a bucket hint, not an identity.

**Hash randomization matters for reproducibility.** String hashes differ between processes, so iteration order of a **set** of strings differs from run to run (dicts are insertion-ordered and unaffected). Code that builds a vocabulary by iterating a `set` of tokens produces different token ids per run. Sort the set, or use a dict.

---

## `set`: Open Addressing With Linear-Probe Runs

`set` and `frozenset` (`Objects/setobject.c`) use a single table of `(hash, key)` entries — no separate entries array, so **no insertion order**. The probe strategy checks a short run of adjacent slots (`LINEAR_PROBES = 9`) before jumping with the same perturbation scheme as dicts, which is cache-friendly for the common case. Sets keep load below 60% and grow by 4× while small (2× beyond 50 000 elements):

```python
import sys

s, last, events = set(), sys.getsizeof(set()), []
for i in range(200):
    s.add(i)
    if sys.getsizeof(s) != last:
        last = sys.getsizeof(s); events.append((len(s), last))
print(events)
```

```text
[(5, 728), (19, 2264), (77, 8408)]
```

Set algebra costs follow from iteration plus lookup: `a & b` is $\Theta(\min(|a|, |b|))$ (iterate the smaller, probe the larger), `a | b` is $\Theta(|a| + |b|)$, `a - b` is $\Theta(|a|)$, `a <= b` is $\Theta(|a|)$.

---

## `deque`: A Linked List of Blocks

`collections.deque` (`Modules/_collectionsmodule.c`) is a doubly-linked list of **blocks**, each holding 64 object pointers, with `leftindex`/`rightindex` marking the used range of the end blocks. Appending at either end writes into the end block, allocating a new block every 64 operations.

| Operation | `list` | `deque` | Choose `deque` when |
|-----------|:---:|:---:|---------------------|
| **append / pop at right** | $\Theta(1)$ amortized | $\Theta(1)$ | equal — either |
| **append / pop at left** | $\Theta(n)$ | $\Theta(1)$ | queues, BFS, sliding windows |
| **index `[i]`** | $\Theta(1)$ | $\Theta(\min(i, n - i))$ — walks blocks | rarely indexed |
| **`maxlen=` bounded buffer** | n/a | evicts from the far end automatically | "last $k$ items", moving averages |
| **thread-safe append/popleft** | — | atomic in the GIL build | producer/consumer without `queue.Queue` overhead |

Measured at $n = 1000$: `deque.appendleft` + `popleft` costs 28 ns vs 251 ns for `list.insert(0)` + `pop(0)` (`bench/cost_model.py`) — and the list version grows linearly with $n$.

---

## `heapq`: A Binary Heap in a List

`heapq` (`Lib/heapq.py`, accelerated by `Modules/_heapqmodule.c`) treats a plain list as a complete binary tree: the children of index $i$ are $2i + 1$ and $2i + 2$, the parent of $i$ is $\lfloor (i - 1)/2 \rfloor$, and the **heap invariant** is `heap[parent] <= heap[child]` — so `heap[0]` is the minimum.

| Operation | Cost | Mechanism |
|-----------|:---:|-----------|
| `heappush` | $\Theta(\log n)$ | append, sift up |
| `heappop` | $\Theta(\log n)$ | move last to root, sift down |
| `heapify` | $\Theta(n)$ | sift down from the last parent to the root |
| `heap[0]` | $\Theta(1)$ | peek |
| `nsmallest(k, xs)` / `nlargest` | $\Theta(n \log k)$ | bounded heap of size $k$ |
| `merge(*sorted_iters)` | $\Theta(N \log k)$ lazily | $k$-way merge of sorted streams |

`heapify` being linear, not $\Theta(n \log n)$, is a classic result: most nodes are near the leaves and sift down only a short distance; summing $\sum_h (n / 2^{h+1}) \cdot h = \Theta(n)$. Python's heap is a min-heap only — negate keys (`-score`) for a max-heap, and put a tie-breaking counter in tuples so that payloads are never compared ([Chapter 17](./17_greedy_algorithms.md)'s Huffman).

```python
import heapq, random

random.seed(1)
scores = [(random.random(), f"doc{i}") for i in range(10_000)]
top3 = heapq.nlargest(3, scores)
assert top3 == sorted(scores, reverse=True)[:3]
streams = [sorted(random.sample(range(100), 5)) for _ in range(3)]
merged = list(heapq.merge(*streams))
print(merged == sorted(sum(streams, [])), [round(s, 4) for s, _ in top3])
```

```text
True [0.9999, 0.9996, 0.9994]
```

`heapq.merge` is how you merge sorted shards (log files, sorted embedding-search results from multiple indices) without loading them all.

---

## Technique-Level Structures

These are not containers but **patterns of use** that change complexity classes.

### Prefix sums: range queries in $\Theta(1)$

With $P[i] = x_0 + \dots + x_{i-1}$ (and $P[0] = 0$), the sum of $x[a:b]$ is $P[b] - P[a]$. $\Theta(n)$ preprocessing, $\Theta(1)$ per query. The same works in 2-D (summed-area tables — the trick behind Viola–Jones features and box filters) and for any invertible associative operation (XOR prefix, counts per category).

```python
import itertools

xs = [3, 1, 4, 1, 5, 9, 2, 6]
P = [0, *itertools.accumulate(xs)]
range_sum = lambda a, b: P[b] - P[a]
print(range_sum(2, 6), sum(xs[2:6]))

def count_subarrays_with_sum(xs, k):                # prefix sums + hash map: Θ(n)
    seen, total, count = {0: 1}, 0, 0
    for x in xs:
        total += x
        count += seen.get(total - k, 0)             # earlier prefix p with total - p == k
        seen[total] = seen.get(total, 0) + 1
    return count

brute = lambda xs, k: sum(1 for a in range(len(xs)) for b in range(a + 1, len(xs) + 1) if sum(xs[a:b]) == k)
print(count_subarrays_with_sum([1, 2, 3, -2, 2, 1], 3), brute([1, 2, 3, -2, 2, 1], 3))
```

```text
19 19
5 5
```

### Monotonic stack: next greater element in $\Theta(n)$

Keep a stack of indices whose values are decreasing. When a larger value arrives, it is the "next greater" for every smaller value it pops. Each index is pushed and popped at most once: $\Theta(n)$ total, versus $\Theta(n^2)$ for the nested loop. Variants solve "largest rectangle in a histogram", "stock span", and "days until warmer".

```python
def next_greater(xs):
    out, stack = [-1] * len(xs), []
    for i, x in enumerate(xs):
        while stack and xs[stack[-1]] < x:
            out[stack.pop()] = x
        stack.append(i)
    return out

print(next_greater([2, 1, 2, 4, 3, 1]))
```

```text
[4, 2, 4, -1, -1, -1]
```

### Monotonic deque: sliding-window maximum in $\Theta(n)$

A deque of indices with decreasing values; drop from the back anything smaller than the incoming value (it can never be a future maximum) and from the front anything that left the window. The front is always the window's maximum.

```python
from collections import deque

def window_max(xs, k):
    dq, out = deque(), []
    for i, x in enumerate(xs):
        while dq and xs[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(xs[dq[0]])
    return out

xs = [1, 3, -1, -3, 5, 3, 6, 7]
print(window_max(xs, 3), [max(xs[i:i + 3]) for i in range(len(xs) - 2)])
```

```text
[3, 3, 5, 5, 6, 7] [3, 3, 5, 5, 6, 7]
```

### Trie: prefix queries over strings

A trie stores strings as paths in a tree of characters; lookup and insertion cost $\Theta(L)$ for a string of length $L$, independent of how many strings are stored, and "all words with prefix $p$" is a subtree walk. In Python a dict-of-dicts is the idiomatic trie. Tokenizers use trie-like structures for longest-match vocabulary lookup.

```python
def build_trie(words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w                                # end-of-word marker
    return root

def with_prefix(trie, prefix):
    node = trie
    for ch in prefix:
        if ch not in node:
            return []
        node = node[ch]
    out, stack = [], [node]
    while stack:
        n = stack.pop()
        out.extend(v for k, v in n.items() if k == "$")
        stack.extend(v for k, v in n.items() if k != "$")
    return sorted(out)

t = build_trie(["train", "trainer", "training", "transformer", "test"])
print(with_prefix(t, "train"), with_prefix(t, "tr")[-1], with_prefix(t, "x"))
```

```text
['train', 'trainer', 'training'] transformer []
```

---

## Key Takeaways

- `list` is a contiguous array of pointers: $\Theta(1)$ at the end and by index, $\Theta(n)$ at the front and for membership; Timsort/powersort makes sorting nearly-sorted data close to linear.
- `dict` is a sparse index table over a dense insertion-ordered entries array, resized at 2/3 load; deleting keys never shrinks it — copy to reclaim memory.
- String hashes are randomized per process, so set iteration order of strings varies across runs; sort before assigning ids.
- `set` has no order, keeps load under 60%, and its algebra costs are driven by the smaller operand for intersection.
- `deque` is a linked list of 64-slot blocks: $\Theta(1)$ at both ends, slow indexing, and `maxlen` gives a bounded buffer.
- `heapq` is a min-heap in a list with linear `heapify`; use tie-breaking counters and `nlargest`/`merge` for top-$k$ and sorted-stream merging.
- Prefix sums, monotonic stacks/deques and tries convert recurring $\Theta(n^2)$ query patterns into $\Theta(n)$ or $\Theta(L)$.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| `Objects/dictobject.c` (header comment), `Objects/setobject.c` | CPython | github.com/python/cpython | Compact dict layout, probing, resize thresholds, set linear probes |
| "More compact dictionaries with faster iteration" | Hettinger, python-dev, 2012 | mail.python.org/pipermail/python-dev/2012-December/123028.html | The two-array design |
| `Objects/listsort.txt` | Peters, 2002 (updated 3.11) | github.com/python/cpython | Timsort runs, galloping, powersort merge policy |
| "Nearly-Optimal Mergesorts" | Munro, Wild, ESA 2018 | arXiv:1805.04154 | Powersort |
| PEP 456 — Secure and interchangeable hash algorithm | Heimes, 2013 | peps.python.org/pep-0456 | SipHash for str/bytes |
| `Modules/_collectionsmodule.c`, `Lib/heapq.py` | CPython | github.com/python/cpython | Deque blocks; heap invariant and `heapify` |
| *Introduction to Algorithms*, 4th ed., ch. 6 | Cormen et al., 2022 | MIT Press | Linear-time `BUILD-MAX-HEAP` analysis |
| `bench/cost_model.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | deque vs list end-operation timings |

---

**Next:** [Chapter 20 — Bit Manipulation](./20_bit_manipulation.md) — the cheapest data structure of all: an integer used as a set.
