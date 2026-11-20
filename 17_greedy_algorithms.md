---
title: "Chapter 17 — Greedy Algorithms"
---

[← Back to Table of Contents](./README.md)

# Chapter 17 — Greedy Algorithms

> *"A greedy algorithm is a dynamic program that has proven it only ever needs one branch."*

## Overview

A greedy algorithm builds a solution by repeatedly making the choice that looks best right now and never revisiting it. When it is correct, it is simpler and faster than DP — often a sort plus one pass. When it is wrong, it is wrong silently, returning a plausible answer. This chapter is about telling the two apart: the **greedy-choice property**, the **exchange argument** that proves it, three canonical correct greedies (interval scheduling, Huffman coding, fractional knapsack), the classic failures (0/1 knapsack, non-canonical coin systems), and a mechanical counterexample search that should precede any greedy you ship. It builds on the DP formulation of [Chapter 15](./15_dynamic_programming_foundations.md).

<div class="diagram">
<div class="diagram-title">Greedy vs DP on the same decision tree</div>
<div class="compare">
  <div class="compare-side left">
    <div class="compare-title">Dynamic programming</div>
    <ul>
      <li>Evaluates every choice at each step</li>
      <li>Combines the best sub-results</li>
      <li>Correct whenever optimal substructure holds</li>
      <li>Cost: states × choices</li>
    </ul>
  </div>
  <div class="compare-side right">
    <div class="compare-title">Greedy</div>
    <ul>
      <li>Commits to one choice at each step</li>
      <li>Never backtracks</li>
      <li>Correct only with the greedy-choice property — which needs a proof</li>
      <li>Cost: usually a sort, Θ(n log n)</li>
    </ul>
  </div>
</div>
</div>

---

## What Makes a Greedy Correct

Two properties, mirroring DP's:

1. **Greedy-choice property.** There is an optimal solution that includes the greedy choice. (Not "every" optimal solution — just one.)
2. **Optimal substructure.** After making the greedy choice, what remains is a smaller instance of the same problem, and an optimal solution to it combines with the greedy choice into an optimal solution overall.

The standard proof technique for property 1 is the **exchange argument**: take any optimal solution $O$. If it doesn't contain the greedy choice $g$, show you can swap some element of $O$ for $g$ without making it worse. Then an optimal solution containing $g$ exists.

---

## Interval Scheduling: Earliest Finish Time

| | |
|---|---|
| **Problem** | Given intervals $[s_i, f_i)$, choose the maximum number of pairwise non-overlapping intervals |
| **Paradigm** | Greedy: sort by finish time, take every interval compatible with the last one taken |
| **Time** | $\Theta(n \log n)$ for the sort, $\Theta(n)$ for the scan |
| **Space** | $\Theta(n)$ |
| **Correctness rests on** | Exchange: the earliest-finishing interval can replace the first interval of any optimal schedule |
| **Python** | `sorted(intervals, key=lambda iv: iv[1])` |
| **Failure modes** | Sorting by start time or by length — both have counterexamples; weighted version needs DP |

**The exchange argument.** Let $g$ be the interval with the earliest finish. Let $O$ be an optimal schedule sorted by time, and $o_1$ its first interval. Since $f_g \le f_{o_1}$, replacing $o_1$ with $g$ cannot create an overlap with $o_2, o_3, \dots$ (they all start after $f_{o_1} \ge f_g$). The result has the same size, so it is also optimal and contains $g$. The remaining problem (intervals starting after $f_g$) is a smaller instance: induction finishes the proof.

```python
import itertools, random

def max_non_overlapping(intervals):
    chosen, end = [], float("-inf")
    for s, f in sorted(intervals, key=lambda iv: iv[1]):
        if s >= end:
            chosen.append((s, f)); end = f
    return chosen

def brute(intervals):
    for k in range(len(intervals), -1, -1):
        for combo in itertools.combinations(sorted(intervals), k):
            if all(a[1] <= b[0] for a, b in itertools.pairwise(combo)):
                return k

random.seed(4)
for _ in range(300):
    ivs = [(s, s + random.randint(1, 5)) for s in (random.randint(0, 10) for _ in range(random.randint(0, 8)))]
    assert len(max_non_overlapping(ivs)) == brute(ivs)
print(max_non_overlapping([(1, 4), (3, 5), (0, 6), (5, 7), (3, 9), (5, 9), (6, 10), (8, 11), (8, 12), (2, 14), (12, 16)]))
```

```text
[(1, 4), (5, 7), (8, 11), (12, 16)]
```

Why the plausible alternatives fail — each has a three-interval counterexample:

| Greedy rule | Counterexample | Greedy picks | Optimal |
|-------------|----------------|:---:|:---:|
| **Earliest start** | $[0, 10), [1, 2), [3, 4)$ | 1 | 2 |
| **Shortest interval** | $[0, 5), [4, 6), [5, 10)$ | 1 | 2 |
| **Fewest conflicts** | needs ~11 intervals (Kleinberg–Tardos Fig. 4.1) | — | — |
| **Earliest finish** | none — proved above | — | — |

The **weighted** version (each interval has a value; maximise total value) breaks the exchange argument — a short early interval may be worth little. It becomes a prefix DP: sort by finish, $\mathrm{dp}[i] = \max(\mathrm{dp}[i-1],\ v_i + \mathrm{dp}[p(i)])$ where $p(i)$ is the last interval compatible with $i$, found by `bisect`.

---

## Huffman Coding

| | |
|---|---|
| **Problem** | Given symbol frequencies, build a prefix-free binary code minimising the expected code length |
| **Paradigm** | Greedy: repeatedly merge the two least-frequent nodes |
| **Time** | $\Theta(n \log n)$ with a heap |
| **Space** | $\Theta(n)$ |
| **Correctness rests on** | Exchange: the two least-frequent symbols can be siblings at maximum depth in some optimal tree |
| **Python** | `heapq` with a tie-breaking counter |
| **Failure modes** | Comparing tree nodes on frequency ties (TypeError) — add a counter to the heap tuple |

The exchange argument: in an optimal tree, the deepest level has two sibling leaves. Swapping them with the two least-frequent symbols $x, y$ can only lower the cost (we move low-frequency symbols down and higher-frequency ones up). So some optimal tree has $x, y$ as deepest siblings; merging them into one node of frequency $f_x + f_y$ gives a smaller instance whose optimal tree extends to an optimal tree for the original.

```python
import heapq, itertools

def huffman(freqs):
    tie = itertools.count()                       # avoids comparing dicts on equal frequencies
    heap = [(f, next(tie), {sym: ""}) for sym, f in freqs.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        f1, _, a = heapq.heappop(heap)
        f2, _, b = heapq.heappop(heap)
        merged = {s: "0" + c for s, c in a.items()} | {s: "1" + c for s, c in b.items()}
        heapq.heappush(heap, (f1 + f2, next(tie), merged))
    return heap[0][2]

freqs = {"a": 45, "b": 13, "c": 12, "d": 16, "e": 9, "f": 5}
codes = huffman(freqs)
avg = sum(freqs[s] * len(c) for s, c in codes.items()) / sum(freqs.values())
print(dict(sorted(codes.items())), avg)
```

```text
{'a': '0', 'b': '101', 'c': '100', 'd': '111', 'e': '1101', 'f': '1100'} 2.24
```

2.24 bits per symbol versus 3 for a fixed-length code over six symbols — and within 1 bit of the entropy, as Shannon's source coding theorem guarantees for Huffman codes. The same frequency-merging idea, applied to *pairs of tokens* rather than to code trees, is the greedy heart of **byte-pair encoding** tokenizers: repeatedly merge the most frequent adjacent pair. BPE has no optimality guarantee for its objective — it is a greedy heuristic, which is one reason alternatives like unigram LM tokenization exist.

---

## Fractional vs 0/1 Knapsack

The fractional knapsack (items divisible) has a provably correct greedy: take items in decreasing value-per-weight order, splitting the last. The exchange argument works because you can trade an infinitesimal amount of a low-density item for the same weight of a higher-density one. In the **0/1** knapsack that trade is not available, and the same greedy fails:

```python
import itertools

def fractional_knapsack(items, W):
    total = 0.0
    for w, v in sorted(items, key=lambda it: it[1] / it[0], reverse=True):
        take = min(w, W)
        total += v * take / w
        W -= take
        if W == 0:
            break
    return total

def greedy_01(items, W):
    total = 0
    for w, v in sorted(items, key=lambda it: it[1] / it[0], reverse=True):
        if w <= W:
            total += v; W -= w
    return total

def exact_01(items, W):
    return max(sum(v for _, v in c) for k in range(len(items) + 1)
               for c in itertools.combinations(items, k) if sum(w for w, _ in c) <= W)

items = [(10, 60), (20, 100), (30, 120)]        # (weight, value): densities 6, 5, 4
print(fractional_knapsack(items, 50), greedy_01(items, 50), exact_01(items, 50))
```

```text
240.0 160 220
```

Greedy-by-density takes items 1 and 2 (value 160) and has no room for item 3; the optimum is items 2 and 3 (220). The fractional optimum, 240, is an upper bound on the 0/1 optimum — which is exactly how branch-and-bound solvers prune: the greedy fractional relaxation bounds each subtree.

---

## Coin Systems: When Greedy Change-Making Works

Greedy change-making (largest coin first) is optimal for "canonical" coin systems like {1, 5, 10, 25} and fails for others like {1, 5, 6, 9} ([Chapter 15](./15_dynamic_programming_foundations.md) found 11 = 5 + 6 where greedy uses 9 + 1 + 1). Whether a system is canonical can be checked mechanically: Kozen and Zaks proved that if greedy is non-optimal for some amount, the smallest such amount is below $c_{k-1} + c_k$ (the sum of the two largest coins). So a DP comparison over a bounded range is a complete test:

```python
import math

def dp_min_coins(coins, upto):
    dp = [0] + [math.inf] * upto
    for a in range(1, upto + 1):
        dp[a] = 1 + min(dp[a - c] for c in coins if c <= a)
    return dp

def greedy_coins(coins, a):
    n = 0
    for c in sorted(coins, reverse=True):
        n += a // c; a %= c
    return n

def first_counterexample(coins):
    coins = sorted(coins)
    bound = coins[-1] + coins[-2] if len(coins) > 1 else 1
    dp = dp_min_coins(coins, bound)
    return next((a for a in range(1, bound) if greedy_coins(coins, a) != dp[a]), None)

for system in ([1, 5, 10, 25], [1, 5, 6, 9], [1, 3, 4], [1, 2, 5, 10, 20, 50, 100, 200]):
    print(system, first_counterexample(system))
```

```text
[1, 5, 10, 25] None
[1, 5, 6, 9] 11
[1, 3, 4] 6
[1, 2, 5, 10, 20, 50, 100, 200] None
```

{1, 3, 4} fails at 6 (greedy 4 + 1 + 1, optimal 3 + 3); the US and euro-style systems are canonical. This is the general method in miniature: **prove the greedy, or search for a counterexample against an exact algorithm** — and the search is usually five minutes of code.

---

## Counterexample Hunting as a Habit

Every greedy idea should be tested against a brute force or DP on random small inputs *before* attempting a proof. A failed test gives a concrete counterexample, which is far more informative than a failed proof. The template:

```python
import itertools, random

def hunt(greedy, exact, gen, trials=2000, seed=0):
    rng = random.Random(seed)
    for _ in range(trials):
        x = gen(rng)
        if greedy(x) != exact(x):
            return x, greedy(x), exact(x)
    return None

# Greedy idea: "to maximise the sum of k picks with no two adjacent, take the largest available each time"
def greedy_pick(args):
    xs, k = args
    taken, total = set(), 0
    for i in sorted(range(len(xs)), key=lambda i: -xs[i]):
        if len(taken) == k:
            break
        if i - 1 not in taken and i + 1 not in taken:
            taken.add(i); total += xs[i]
    return total if len(taken) == k else None

def exact_pick(args):
    xs, k = args
    best = None
    for c in itertools.combinations(range(len(xs)), k):
        if all(b - a > 1 for a, b in itertools.pairwise(c)):
            s = sum(xs[i] for i in c)
            best = s if best is None else max(best, s)
    return best

print(hunt(greedy_pick, exact_pick, lambda r: ([r.randint(1, 9) for _ in range(r.randint(2, 7))], 2)))
```

```text
(([5, 9, 6], 2), None, 11)
```

On `[5, 9, 6]` the greedy grabs 9, which blocks both neighbours, and cannot complete a pair at all (`None`), while 5 + 6 = 11 is optimal. A greedy that "feels" right fails on a three-element input. The exact method is the independent-set tree DP of [Chapter 16](./16_dynamic_programming_patterns.md), specialised to a path, with a count dimension for $k$.

---

## Greedy Algorithms Elsewhere in This Book

| Algorithm | Greedy choice | Proof idea | Chapter |
|-----------|---------------|------------|:---:|
| **Dijkstra** | settle the closest unsettled vertex | non-negative edges: no later path can be shorter | [18](./18_graph_algorithms.md) |
| **Kruskal / Prim** | add the cheapest safe edge | cut property | [18](./18_graph_algorithms.md) |
| **Huffman** | merge the two rarest | exchange at maximum depth | this chapter |
| **Interval scheduling** | earliest finish | exchange with the first optimal interval | this chapter |
| **BPE tokenization** | merge the most frequent pair | none — heuristic | this chapter |
| **Beam search** | keep the top-$k$ prefixes | none — heuristic | [16](./16_dynamic_programming_patterns.md) |

---

## Key Takeaways

- A greedy is correct when some optimal solution contains the greedy choice and the remainder is a smaller instance; the exchange argument is the standard proof.
- Interval scheduling by earliest finish is provably optimal; earliest start and shortest-first have three-interval counterexamples; weighted scheduling needs DP.
- Huffman's merge-the-two-rarest is optimal for prefix codes; BPE's merge-the-most-frequent is the same shape without the guarantee.
- Density-greedy is optimal for fractional knapsack and wrong for 0/1; the fractional optimum is an upper bound used to prune exact search.
- Greedy change-making's correctness for a coin system is decidable by comparing against DP below the sum of the two largest coins.
- Test every greedy idea against an exact algorithm on random small inputs before trying to prove it — counterexamples are cheap and decisive.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Algorithm Design*, ch. 4 | Kleinberg, Tardos, 2005 | Pearson | Interval scheduling, exchange arguments, "greedy stays ahead" |
| *Introduction to Algorithms*, 4th ed., ch. 15 | Cormen et al., 2022 | MIT Press | Activity selection, Huffman codes, fractional knapsack |
| "A Method for the Construction of Minimum-Redundancy Codes" | Huffman, 1952 | doi.org/10.1109/JRPROC.1952.273898 | Huffman coding |
| "Optimal bounds for the change-making problem" | Kozen, Zaks, 1994 | doi.org/10.1016/0304-3975(94)90195-3 | The counterexample bound $c_{k-1} + c_k$ |
| "Neural Machine Translation of Rare Words with Subword Units" | Sennrich, Haddow, Birch, 2016 | arXiv:1508.07909 | BPE as greedy pair merging |
| `heapq` docs | Python docs | docs.python.org/3/library/heapq.html | Tie-breaking with a counter in priority tuples |

---

**Next:** [Chapter 18 — Graph Algorithms](./18_graph_algorithms.md) — the structures where greedy, DP and search meet.
