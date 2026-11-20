---
title: "Chapter 14 — Recursion & Divide and Conquer"
---

[← Back to Table of Contents](./README.md)

# Chapter 14 — Recursion & Divide and Conquer

> *"To write a recursive function, assume it already works on smaller inputs. The proof and the program are the same object."*

## Overview

A recursive function is an inductive proof that happens to execute: a base case, and a step that reduces the problem to smaller instances of itself. **Divide and conquer** is the special case where the subproblems are disjoint pieces of the input. This chapter treats recursion as induction, analyses divide-and-conquer running times with recurrences and the master theorem, implements merge sort, quickselect and binary search with their invariants, searches with backtracking, and converts recursion to iteration when Python's stack limit ([Chapter 6](./06_functional_programming.md)) gets in the way. When subproblems *overlap* instead of being disjoint, divide and conquer becomes dynamic programming — the subject of [Chapter 15](./15_dynamic_programming_foundations.md).

<div class="diagram">
<div class="diagram-title">Divide, conquer, combine</div>
<div class="flow-h">
  <div class="flow-node accent">Divide<small>split into a subproblems of size n/b</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple">Conquer<small>solve each recursively; base case directly</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node green">Combine<small>merge results in f(n) work</small></div>
</div>
<div class="flow-label">T(n) = a·T(n/b) + f(n)</div>
</div>

---

## Recursion as Induction

To prove $P(n)$ for all $n \ge 0$: prove $P(0)$, then prove $P(k)$ assuming $P(j)$ for all $j < k$. A recursive function has the same shape, and writing it correctly means **trusting the recursive call** — reasoning about what it returns (the inductive hypothesis), never tracing what it does.

Three checks make a recursive function correct:

1. **Base cases cover every input that can't be reduced.** (Empty list, single element, $n = 0$.)
2. **Every recursive call is on a strictly smaller input**, by some measure that can't decrease forever (length, value, tree height). This is the termination proof.
3. **Assuming the recursive calls are correct, the combination is correct.**

```python
def flatten(tree):
    """Flatten arbitrarily nested lists. Measure: nesting depth + length."""
    if not isinstance(tree, list):      # base case: a leaf
        return [tree]
    out = []
    for sub in tree:                    # each sub is strictly smaller than tree
        out.extend(flatten(sub))        # trust: flatten(sub) is correct
    return out

print(flatten([1, [2, [3, [4]], 5], [[6]]]))
```

```text
[1, 2, 3, 4, 5, 6]
```

Recursion depth equals nesting depth here — fine for data structures, dangerous for chains of length $n$ ([Chapter 13](./13_complexity_and_cost_models.md), space).

---

## Recurrences and the Master Theorem

A divide-and-conquer algorithm that splits size $n$ into $a$ subproblems of size $n/b$ and spends $f(n)$ to divide and combine has running time

$$T(n) = a\,T(n/b) + f(n).$$

Unroll it as a **recursion tree**: level $i$ has $a^i$ nodes of size $n/b^i$, contributing $a^i f(n/b^i)$. The tree has $\log_b n$ levels and $a^{\log_b n} = n^{\log_b a}$ leaves. The **critical exponent** $c^* = \log_b a$ compares leaf work to root work:

| Case | Condition | Which level dominates | $T(n)$ |
|:---:|-----------|-----------------------|--------|
| 1 | $f(n) = O(n^{c^* - \epsilon})$ | leaves (work grows down the tree) | $\Theta(n^{c^*})$ |
| 2 | $f(n) = \Theta(n^{c^*} \log^k n)$ | every level equally | $\Theta(n^{c^*} \log^{k+1} n)$ |
| 3 | $f(n) = \Omega(n^{c^* + \epsilon})$ and $a f(n/b) \le c f(n)$ for some $c < 1$ | root (work shrinks down the tree) | $\Theta(f(n))$ |

**Proof sketch for case 2 with $k = 0$.** Level $i$ costs $a^i \cdot (n/b^i)^{c^*} = n^{c^*} \cdot (a / b^{c^*})^i = n^{c^*}$, since $b^{c^*} = a$. With $\log_b n + 1$ levels, the total is $n^{c^*}(\log_b n + 1) = \Theta(n^{c^*}\log n)$. Cases 1 and 3 are geometric series in $i$ dominated by their last or first term respectively.

| Algorithm | Recurrence | $c^*$ | Case | $T(n)$ |
|-----------|-----------|:---:|:---:|--------|
| **Binary search** | $T(n/2) + \Theta(1)$ | 0 | 2 | $\Theta(\log n)$ |
| **Merge sort** | $2T(n/2) + \Theta(n)$ | 1 | 2 | $\Theta(n \log n)$ |
| **Karatsuba multiplication** | $3T(n/2) + \Theta(n)$ | $\log_2 3 \approx 1.585$ | 1 | $\Theta(n^{1.585})$ |
| **Strassen matrix multiply** | $7T(n/2) + \Theta(n^2)$ | $\log_2 7 \approx 2.807$ | 1 | $\Theta(n^{2.807})$ |
| **Quickselect (expected)** | $T(n/2) + \Theta(n)$ | 0 | 3 | $\Theta(n)$ |

Numerical check of the merge sort row by counting comparisons — $n \log_2 n$ is an upper bound, and the count should track it:

```python
import math, random

def merge_sort(xs, counter):
    if len(xs) <= 1:
        return xs
    mid = len(xs) // 2
    left, right = merge_sort(xs[:mid], counter), merge_sort(xs[mid:], counter)
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        counter[0] += 1
        if left[i] <= right[j]:               # <= keeps equal elements in order: stable
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:]); out.extend(right[j:])
    return out

random.seed(1)
for n in (1_000, 10_000, 100_000):
    c = [0]
    xs = [random.random() for _ in range(n)]
    assert merge_sort(xs, c) == sorted(xs)
    print(n, round(c[0] / (n * math.log2(n)), 3))
```

```text
1000 0.873
10000 0.906
100000 0.925
```

The ratio is a constant just below 1, as $\Theta(n \log n)$ predicts.

---

## Merge Sort and What It Teaches

| | |
|---|---|
| **Problem** | Sort $n$ comparable items |
| **Paradigm** | Divide and conquer |
| **Time** | $\Theta(n \log n)$ worst, average and best |
| **Space** | $\Theta(n)$ auxiliary; $\Theta(\log n)$ recursion depth |
| **Correctness rests on** | Merging two sorted lists yields a sorted list (loop invariant: `out` is sorted and holds the smallest `i + j` elements) |
| **Python** | `sorted` / `list.sort` use **Timsort**, a merge-sort hybrid that exploits existing runs ([Chapter 19](./19_data_structure_internals.md)) |
| **Failure modes** | Using `<` instead of `<=` in the merge breaks stability; slicing copies cost $\Theta(n)$ extra per level |

Never hand-write a sort in production Python — `sorted` is C, stable, and adaptive: $\Theta(n)$ on already-sorted input. Merge sort is worth knowing because the *merge step* generalises. Counting **inversions** (pairs $i < j$ with $x_i > x_j$ — a measure of how unsorted a ranking is, e.g. Kendall's τ between two model rankings) is merge sort plus one line: when the right element wins, it is smaller than every remaining left element.

```python
import itertools, random

def count_inversions(xs):
    if len(xs) <= 1:
        return xs, 0
    mid = len(xs) // 2
    left, a = count_inversions(xs[:mid])
    right, b = count_inversions(xs[mid:])
    out, i, j, inv = [], 0, 0, a + b
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
            inv += len(left) - i            # right[j] jumps over every remaining left element
    out.extend(left[i:]); out.extend(right[j:])
    return out, inv

def brute(xs):
    return sum(1 for i, j in itertools.combinations(range(len(xs)), 2) if xs[i] > xs[j])

random.seed(0)
for _ in range(200):
    xs = [random.randint(0, 9) for _ in range(random.randint(0, 12))]
    assert count_inversions(xs)[1] == brute(xs)
print(count_inversions([3, 1, 2, 5, 4])[1])
```

```text
3
```

This is the cross-check pattern used throughout Part IV: a brute force that is obviously correct, compared on many small random inputs.

---

## Quickselect: Expected Linear Time

| | |
|---|---|
| **Problem** | Find the $k$-th smallest element (median, percentile) without sorting |
| **Paradigm** | Divide and conquer, randomized; recurse into **one** side only |
| **Time** | $\Theta(n)$ expected; $\Theta(n^2)$ worst case (median-of-medians gives $\Theta(n)$ worst case) |
| **Space** | $\Theta(n)$ in this list-partitioning version; $\Theta(1)$ in-place |
| **Correctness rests on** | After partitioning around pivot $p$, the $k$-th element is in the part whose size range contains $k$ |
| **Python** | `heapq.nsmallest(k, xs)` is $\Theta(n \log k)$; `numpy.partition` is introselect in C; `statistics.median` sorts |
| **Failure modes** | A fixed pivot (first element) on sorted input → quadratic; forgetting duplicates of the pivot |

Expected-time argument: a random pivot lands in the middle half with probability 1/2, leaving at most $3n/4$ elements; so the expected size shrinks geometrically, and the expected total work is bounded by $n(1 + 3/4 + (3/4)^2 + \dots) \cdot 2 = 8n = \Theta(n)$.

```python
import random

def quickselect(xs, k):
    """k-th smallest, 0-indexed."""
    while True:
        pivot = random.choice(xs)
        lows = [x for x in xs if x < pivot]
        pivots = [x for x in xs if x == pivot]           # handles duplicates
        if k < len(lows):
            xs = lows
        elif k < len(lows) + len(pivots):
            return pivot
        else:
            k -= len(lows) + len(pivots)
            xs = [x for x in xs if x > pivot]

random.seed(3)
data = [random.randint(0, 100) for _ in range(1001)]
assert all(quickselect(data, k) == sorted(data)[k] for k in (0, 500, 1000))
print(quickselect(data, 500) == sorted(data)[500])
```

```text
True
```

The loop replaces tail recursion: since only one side is explored, recursion is unnecessary. This "recurse on one side → loop" transformation applies to binary search as well.

---

## Binary Search and Its Invariant

Binary search is the most frequently mis-implemented algorithm in the book. The cure is to state the **invariant** and let it dictate every line. To find the first index where a monotone predicate becomes true (`lo` is the answer):

- Invariant: every index $< lo$ is **false**; every index $\ge hi$ is **true**.
- Initialise $lo = 0$, $hi = n$ (the invariant holds vacuously).
- Loop while $lo < hi$; take $mid = (lo + hi) // 2$, so $lo \le mid < hi$.
- If `pred(mid)` is true, set $hi = mid$; else $lo = mid + 1$. Both preserve the invariant and shrink the interval.
- At exit $lo = hi$: the first true index (or $n$ if none).

```python
def first_true(lo, hi, pred):
    while lo < hi:
        mid = (lo + hi) // 2
        if pred(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

xs = [1, 3, 3, 3, 7, 9]
import bisect
print(first_true(0, len(xs), lambda i: xs[i] >= 3), bisect.bisect_left(xs, 3))
print(first_true(0, len(xs), lambda i: xs[i] > 3), bisect.bisect_right(xs, 3))
```

```text
1 1
4 4
```

<div class="lab" data-lab="bsearch"></div>

`bisect_left` and `bisect_right` are exactly `first_true` with `>=` and `>`, implemented in C, and since 3.10 accept `key=`. Use them for sorted lists.

### Binary search on the answer

The predicate doesn't need an array. If feasibility is monotone in a parameter — "can this batch size fit in memory?", "can these jobs finish within time $T$ on $k$ machines?" — binary-search the smallest feasible value:

```python
import math

def min_capacity(weights, days):
    """Smallest per-day capacity that ships `weights` in order within `days`."""
    def feasible(cap):
        used, load = 1, 0
        for w in weights:
            if load + w > cap:
                used, load = used + 1, 0
            load += w
        return used <= days
    return first_true(max(weights), sum(weights) + 1, feasible)

print(min_capacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days=5))
```

```text
15
```

$\Theta(n \log S)$ where $S$ is the sum — the predicate is $\Theta(n)$ and the search takes $\log_2 S$ steps. The required insight is only monotonicity: if capacity $c$ works, every $c' > c$ works.

---

## Backtracking: Search With Undo

| | |
|---|---|
| **Problem** | Enumerate or find configurations satisfying constraints (placements, assignments, subsets, paths) |
| **Paradigm** | Depth-first search over partial solutions: choose → explore → un-choose |
| **Time** | Exponential in the worst case; pruning decides the practical cost |
| **Space** | $\Theta(\text{depth})$ for the partial solution and the call stack |
| **Correctness rests on** | Every complete solution extends some partial solution the search visits; pruning only removes partials that cannot be extended |
| **Python** | Plain recursion (depth is small) with mutable state undone on return; `itertools` for brute-force cross-checks |
| **Failure modes** | Forgetting to undo a choice; pruning too aggressively (losing solutions); copying state at every node |

When a problem asks you to *search* — not to optimise over overlapping subproblems — the tool is backtracking: extend a partial solution one decision at a time, and abandon it the moment it violates a constraint. Abandoning early is **pruning**, and it is where the speed comes from. N-Queens is the canonical example: place one queen per row so that no two share a column or diagonal.

<div class="svgfig">
<svg viewBox="0 0 780 312" width="780" role="img" aria-label="The first 8-queens solution found by the search, with columns 0 4 7 5 2 6 1 3">
<rect x="18" y="18" width="276" height="276" fill="none" stroke="#3b4350" stroke-width="2"/>
<rect x="20" y="20" width="34" height="34" fill="#2d333b"/><rect x="54" y="20" width="34" height="34" fill="#1c2128"/><rect x="88" y="20" width="34" height="34" fill="#2d333b"/><rect x="122" y="20" width="34" height="34" fill="#1c2128"/><rect x="156" y="20" width="34" height="34" fill="#2d333b"/><rect x="190" y="20" width="34" height="34" fill="#1c2128"/><rect x="224" y="20" width="34" height="34" fill="#2d333b"/><rect x="258" y="20" width="34" height="34" fill="#1c2128"/><text x="37" y="38" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="54" width="34" height="34" fill="#1c2128"/><rect x="54" y="54" width="34" height="34" fill="#2d333b"/><rect x="88" y="54" width="34" height="34" fill="#1c2128"/><rect x="122" y="54" width="34" height="34" fill="#2d333b"/><rect x="156" y="54" width="34" height="34" fill="#1c2128"/><rect x="190" y="54" width="34" height="34" fill="#2d333b"/><rect x="224" y="54" width="34" height="34" fill="#1c2128"/><rect x="258" y="54" width="34" height="34" fill="#2d333b"/><text x="173" y="72" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="88" width="34" height="34" fill="#2d333b"/><rect x="54" y="88" width="34" height="34" fill="#1c2128"/><rect x="88" y="88" width="34" height="34" fill="#2d333b"/><rect x="122" y="88" width="34" height="34" fill="#1c2128"/><rect x="156" y="88" width="34" height="34" fill="#2d333b"/><rect x="190" y="88" width="34" height="34" fill="#1c2128"/><rect x="224" y="88" width="34" height="34" fill="#2d333b"/><rect x="258" y="88" width="34" height="34" fill="#1c2128"/><text x="275" y="106" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="122" width="34" height="34" fill="#1c2128"/><rect x="54" y="122" width="34" height="34" fill="#2d333b"/><rect x="88" y="122" width="34" height="34" fill="#1c2128"/><rect x="122" y="122" width="34" height="34" fill="#2d333b"/><rect x="156" y="122" width="34" height="34" fill="#1c2128"/><rect x="190" y="122" width="34" height="34" fill="#2d333b"/><rect x="224" y="122" width="34" height="34" fill="#1c2128"/><rect x="258" y="122" width="34" height="34" fill="#2d333b"/><text x="207" y="140" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="156" width="34" height="34" fill="#2d333b"/><rect x="54" y="156" width="34" height="34" fill="#1c2128"/><rect x="88" y="156" width="34" height="34" fill="#2d333b"/><rect x="122" y="156" width="34" height="34" fill="#1c2128"/><rect x="156" y="156" width="34" height="34" fill="#2d333b"/><rect x="190" y="156" width="34" height="34" fill="#1c2128"/><rect x="224" y="156" width="34" height="34" fill="#2d333b"/><rect x="258" y="156" width="34" height="34" fill="#1c2128"/><text x="105" y="174" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="190" width="34" height="34" fill="#1c2128"/><rect x="54" y="190" width="34" height="34" fill="#2d333b"/><rect x="88" y="190" width="34" height="34" fill="#1c2128"/><rect x="122" y="190" width="34" height="34" fill="#2d333b"/><rect x="156" y="190" width="34" height="34" fill="#1c2128"/><rect x="190" y="190" width="34" height="34" fill="#2d333b"/><rect x="224" y="190" width="34" height="34" fill="#1c2128"/><rect x="258" y="190" width="34" height="34" fill="#2d333b"/><text x="241" y="208" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="224" width="34" height="34" fill="#2d333b"/><rect x="54" y="224" width="34" height="34" fill="#1c2128"/><rect x="88" y="224" width="34" height="34" fill="#2d333b"/><rect x="122" y="224" width="34" height="34" fill="#1c2128"/><rect x="156" y="224" width="34" height="34" fill="#2d333b"/><rect x="190" y="224" width="34" height="34" fill="#1c2128"/><rect x="224" y="224" width="34" height="34" fill="#2d333b"/><rect x="258" y="224" width="34" height="34" fill="#1c2128"/><text x="71" y="242" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text><rect x="20" y="258" width="34" height="34" fill="#1c2128"/><rect x="54" y="258" width="34" height="34" fill="#2d333b"/><rect x="88" y="258" width="34" height="34" fill="#1c2128"/><rect x="122" y="258" width="34" height="34" fill="#2d333b"/><rect x="156" y="258" width="34" height="34" fill="#1c2128"/><rect x="190" y="258" width="34" height="34" fill="#2d333b"/><rect x="224" y="258" width="34" height="34" fill="#1c2128"/><rect x="258" y="258" width="34" height="34" fill="#2d333b"/><text x="139" y="276" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;fill:#fde047">♛</text>
<text x="320" y="40" class="th">First solution found: cols = [0, 4, 7, 5, 2, 6, 1, 3]</text>
<text x="320" y="78" class="t">The search visited 2,057 partial placements</text>
<text x="320" y="104" class="t">to find all 92 solutions.</text>
<text x="320" y="144" class="ts">Trying every permutation of columns: 8! = 40,320</text>
<text x="320" y="168" class="ts">Trying every placement, one per row: 8⁸ = 16,777,216</text>
<text x="320" y="208" class="ts">Constraint checks are O(1): three sets record the</text>
<text x="320" y="230" class="ts">occupied columns, r − c diagonals and r + c diagonals.</text>
</svg>
</div>

```python
import itertools

def n_queens(n):
    cols, diag, anti = set(), set(), set()
    solutions, nodes = [], 0
    placement = []
    def place(r):
        nonlocal nodes
        nodes += 1
        if r == n:
            solutions.append(placement.copy())
            return
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:
                continue                                     # prune: this partial can never complete
            cols.add(c); diag.add(r - c); anti.add(r + c); placement.append(c)       # choose
            place(r + 1)                                                             # explore
            cols.remove(c); diag.remove(r - c); anti.remove(r + c); placement.pop()  # un-choose
    place(0)
    return solutions, nodes

def brute(n):
    return [list(p) for p in itertools.permutations(range(n))
            if all(abs(p[i] - p[j]) != j - i for i in range(n) for j in range(i + 1, n))]

for n in range(1, 8):
    assert n_queens(n)[0] == brute(n)
sols, nodes = n_queens(8)
print(len(sols), nodes, sols[0])
```

```text
92 2057 [0, 4, 7, 5, 2, 6, 1, 3]
```

Backtracking and DP are siblings. Both explore a tree of decisions; DP applies when different branches reach the *same* subproblem (so answers can be cached), backtracking when branches are distinct but most of them die early. Many real searches combine both: memoize what can be shared, prune what cannot succeed, and order choices so that good solutions are found first (the idea behind branch-and-bound and SAT solvers).

---

## From Recursion to an Explicit Stack

Any recursion can be converted to a loop with an explicit stack that holds what the call stack would have held. This removes the recursion limit and is mandatory for deep structures (long linked lists, deep trees, large graphs in [Chapter 18](./18_graph_algorithms.md)).

```python
def depth_recursive(tree):
    if not isinstance(tree, list):
        return 0
    return 1 + max((depth_recursive(t) for t in tree), default=0)

def depth_iterative(tree):
    best, stack = 0, [(tree, 0)]
    while stack:
        node, d = stack.pop()
        if isinstance(node, list):
            best = max(best, d + 1)
            stack.extend((child, d + 1) for child in node)
    return best

deep = []
cursor = deep
for _ in range(5000):                  # nesting depth 5000: beyond the default recursion limit
    cursor.append([]); cursor = cursor[0]
print(depth_iterative([1, [2, [3]]]), depth_recursive([1, [2, [3]]]), depth_iterative(deep))
```

```text
3 3 5001
```

What the stack must hold depends on what work remains after the recursive call returns. For pre-order work (process the node, then children) the node alone suffices, as above. For post-order work (combine children's results), push a marker — `(node, visited)` — and do the combination on the second pop. That is precisely how iterative DFS computes finishing times for topological sort.

---

## Key Takeaways

- A recursive function is an inductive proof: cover the base cases, recurse only on strictly smaller inputs, and trust the recursive call when reasoning about the combination.
- $T(n) = aT(n/b) + f(n)$ is solved by comparing $f(n)$ with $n^{\log_b a}$: leaves dominate, all levels tie (extra $\log n$), or the root dominates.
- Merge sort is $\Theta(n \log n)$ (measured: comparisons / $n\log_2 n$ ≈ 0.9); its merge step extends to inversion counting; in practice use `sorted`.
- Quickselect finds order statistics in expected $\Theta(n)$ by recursing into one side; random pivots avoid the quadratic worst case.
- Write binary search from an invariant (`< lo` false, `≥ hi` true); `bisect` implements it; binary search on the answer needs only a monotone feasibility predicate.
- Backtracking searches by choose → explore → un-choose; pruning invalid partial solutions turned 8-queens from 40,320 permutations into 2,057 visited nodes.
- Convert recursion to an explicit stack whenever depth can approach $n$; post-order work needs a visited marker.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Introduction to Algorithms*, 4th ed., ch. 2, 4, 9 | Cormen et al., 2022 | MIT Press | Merge sort, the master theorem and its proof, selection in linear time |
| *Algorithm Design*, ch. 5 | Kleinberg, Tardos, 2005 | Pearson | Recurrences, counting inversions |
| "Extra, Extra — Read All About It: Nearly All Binary Searches and Mergesorts are Broken" | Bloch, 2006 | research.google/blog | Overflow in `(lo + hi) / 2` (not an issue with Python ints) and why invariants matter |
| "Time bounds for selection" | Blum, Floyd, Pratt, Rivest, Tarjan, 1973 | doi.org/10.1016/S0022-0000(73)80033-9 | Median-of-medians worst-case linear selection |
| `bisect` docs; `Lib/bisect.py` | Python docs / CPython | docs.python.org/3/library/bisect.html | `bisect_left`/`right` semantics, `key=` (3.10) |

---

**Next:** [Chapter 15 — Dynamic Programming I: Foundations](./15_dynamic_programming_foundations.md) — when subproblems overlap, solve each once.
