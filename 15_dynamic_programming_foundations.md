---
title: "Chapter 15 — Dynamic Programming I: Foundations"
---

[← Back to Table of Contents](./README.md)

# Chapter 15 — Dynamic Programming I: Foundations

> *"Dynamic programming is recursion that refuses to solve the same problem twice."*

## Overview

Dynamic programming (DP) applies when a problem decomposes into subproblems that **overlap** — the same subproblem is reached by many paths — and whose optimal solutions combine into an optimal solution for the whole (**optimal substructure**). Divide and conquer ([Chapter 14](./14_recursion_and_divide_and_conquer.md)) re-solves overlapping subproblems; DP solves each once and stores the answer. This chapter introduces the **seven-field DP recipe** used for every DP in the book, the two implementation styles (memoization and tabulation) and their measured costs, and works five foundational problems: Fibonacci, coin change (two variants, and why loop order matters), longest common subsequence with reconstruction, and 0/1 knapsack with space optimization. [Chapter 16](./16_dynamic_programming_patterns.md) extends the recipe to the pattern catalogue.

<div class="diagram">
<div class="diagram-title">The DP pipeline: from brute force to optimized table</div>
<div class="flow-h">
  <div class="flow-node red">Brute-force recursion<small>correct, exponential</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange">+ cache<small>memoization, top-down</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple">Table in dependency order<small>tabulation, bottom-up</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node accent">Keep only needed rows<small>space optimization</small></div>
</div>
</div>

---

## When Is a Problem a DP?

Two properties, both required:

1. **Optimal substructure.** An optimal solution contains optimal solutions to subproblems. Shortest paths have it (a shortest path's prefix is a shortest path); *longest simple* paths in a general graph don't (the prefix may need to avoid vertices the suffix uses).
2. **Overlapping subproblems.** The recursion revisits the same subproblems. Merge sort's subproblems are disjoint (no DP gain); Fibonacci's overlap massively.

Fibonacci shows the overlap concretely. The naive recursion's call count satisfies $C(n) = C(n-1) + C(n-2) + 1$, which grows like $\varphi^n$ with $\varphi \approx 1.618$:

```python
import functools

calls = 0
def fib_naive(n):
    global calls
    calls += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

@functools.cache
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

for n in (10, 20, 25):
    calls = 0
    fib_naive(n)
    fib_memo.cache_clear()
    fib_memo(n)
    print(n, calls, fib_memo.cache_info().misses)
```

```text
10 177 11
20 21891 21
25 242785 26
```

177 calls for $n = 10$ — the same count `sys.monitoring` observed in [Chapter 12](./12_introspection_ast_and_codegen.md) — versus 11 distinct subproblems. Adding a cache changes $\Theta(\varphi^n)$ to $\Theta(n)$ without changing the recursion. That is the whole idea; everything else is engineering.

---

## The Seven-Field Recipe

Every DP in this book is specified through the same fields **before any code** (PROMPT §3.3). The discipline matters because most DP bugs are specification bugs — an ambiguous state, a missing base case, a wrong evaluation order — that no amount of debugging the code will find.

| # | Field | Question it answers |
|:---:|-------|--------------------|
| 1 | **State** | What does $\mathrm{dp}[\cdot]$ mean, in one English sentence? |
| 2 | **Transition** | How is a state computed from smaller states? (The recurrence.) |
| 3 | **Base cases** | Which states are known directly, and why are those values right? |
| 4 | **Order** | In what order must states be computed so dependencies are ready? |
| 5 | **Answer** | Which state (or reduction over states) is the answer? |
| 6 | **Complexity** | (number of states) × (work per state); space, and space after optimization |
| 7 | **Reconstruction** | How do we recover the optimal *choice*, not just the optimal *value*? |

**Designing the state** is the creative step. The state must capture *everything about the past that affects the future* and nothing more. A useful test: if two different partial solutions lead to the same state, every completion that works for one must work equally well for the other. If not, the state is missing information.

---

## Memoization vs Tabulation

| | |
|---|---|
| **Mechanism** | Memoization: cache a recursive function's results by argument. Tabulation: fill an array in dependency order |
| **Defined in** | `functools.cache` / `lru_cache` (`Lib/functools.py`, C implementation in `Modules/_functoolsmodule.c`) |
| **Since** | `lru_cache` 3.2; `cache` 3.9 |
| **Hooks into** | A dict keyed on the hashed argument tuple |
| **Typical use** | Memo: prototyping, sparse state spaces. Table: large dense state spaces, space optimization |
| **Cost** | Memo: a hashed call per state, recursion depth up to the longest dependency chain. Table: an index per state |
| **Prefer instead** | Tabulation once the recurrence is validated and $n$ is large |
| **Failure modes** | Memo: `RecursionError`, unhashable args, caching impure functions, cache holding memory forever. Table: wrong loop order |

Measured on LCS of two random 400-character DNA strings (`bench/dp_memo.py`, CPython 3.13.18, Xeon @ 2.1 GHz, median of 5):

| Variant | Time (ms) | Peak recursion depth | Choose this when |
|---------|:---:|:---:|------------------|
| **`functools.cache` top-down** | 44 | up to $n + m$ | first correct version; only some states reachable |
| **2-D table bottom-up** | 14 | 1 | need reconstruction; $nm$ fits in memory |
| **Two rolling rows** | 11 | 1 | value only; large $n, m$ |

The memoized version is ~3× slower — a Python function call plus a dict lookup on a tuple key per state, versus a list index — and needs `sys.setrecursionlimit` beyond ~1000 levels. Its advantages are that it computes only the states actually reachable from the answer and that it is a mechanical transformation of the brute force. The workflow this book recommends: **write the brute-force recursion, add `@cache`, check against brute force on small inputs, then convert to a table if size or speed require it.**

Two memoization traps specific to Python:

- **Arguments must be hashable.** Pass tuples or indices, not lists. Indices into immutable inputs (captured by closure) are the cleanest state.
- **Module-level `@cache` persists across calls.** Define the memoized helper *inside* the solving function so each input gets a fresh cache, and the cache is freed when the function returns.

---

## Problem 1: Coin Change — Minimum Coins

Given coin denominations and a target amount, find the fewest coins summing to the amount (unlimited supply of each coin).

1. **State.** $\mathrm{dp}[a]$ = the minimum number of coins that sum to exactly $a$, or $\infty$ if impossible.
2. **Transition.** The last coin used is some $c \le a$:

$$\mathrm{dp}[a] = 1 + \min_{c \in \text{coins},\ c \le a} \mathrm{dp}[a - c]$$

3. **Base cases.** $\mathrm{dp}[0] = 0$: the empty set of coins sums to 0. All other entries start at $\infty$.
4. **Order.** Increasing $a$ — $\mathrm{dp}[a]$ depends only on smaller amounts.
5. **Answer.** $\mathrm{dp}[A]$ (report $-1$ if $\infty$).
6. **Complexity.** $A$ states × $k$ coins = $\Theta(Ak)$ time, $\Theta(A)$ space.
7. **Reconstruction.** Store the coin that achieved each minimum; walk back from $A$.

This is a *pseudo-polynomial* algorithm: polynomial in the numeric value $A$, exponential in the number of bits needed to write $A$.

```python
import functools, math, itertools

def min_coins(coins, amount):
    dp = [0] + [math.inf] * amount
    choice = [None] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a], choice[a] = dp[a - c] + 1, c
    if dp[amount] == math.inf:
        return -1, []
    used, a = [], amount
    while a:
        used.append(choice[a]); a -= choice[a]
    return dp[amount], used

def min_coins_brute(coins, amount):
    for k in range(amount + 1):
        if any(sum(combo) == amount for combo in itertools.combinations_with_replacement(coins, k)):
            return k
    return -1

print(min_coins([1, 5, 6, 9], 11))
for amt in range(25):
    assert min_coins([1, 5, 6, 9], amt)[0] == min_coins_brute([1, 5, 6, 9], amt)
```

```text
(2, [5, 6])
```

Greedy (take the largest coin first) gives 9 + 1 + 1 = 3 coins for 11; the DP finds 6 + 5. [Chapter 17](./17_greedy_algorithms.md) explains exactly which coin systems greedy is correct for.

The table for a tiny instance, to check by hand (coins {1, 5, 6, 9}):

| $a$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| $\mathrm{dp}[a]$ | 0 | 1 | 2 | 3 | 4 | 1 | 1 | 2 | 3 | 1 | 2 | 2 |

---

## Problem 2: Coin Change — Counting Ways, and Why Loop Order Matters

Now count the number of distinct **combinations** (multisets) of coins that sum to $A$. 1+2 and 2+1 are the same combination.

1. **State.** $\mathrm{dp}[i][a]$ = the number of combinations using only the first $i$ coin types that sum to $a$.
2. **Transition.** Either use no coin of type $i$, or use at least one (and stay at type $i$):

$$\mathrm{dp}[i][a] = \mathrm{dp}[i-1][a] + \mathrm{dp}[i][a - c_i]$$

3. **Base cases.** $\mathrm{dp}[i][0] = 1$ (one way to make 0: take nothing); $\mathrm{dp}[0][a > 0] = 0$.
4. **Order.** $i$ increasing in the outer loop, $a$ increasing in the inner.
5. **Answer.** $\mathrm{dp}[k][A]$.
6. **Complexity.** $\Theta(kA)$ time; $\Theta(A)$ space after collapsing the $i$ dimension (row $i$ overwrites row $i-1$ in place, left to right).
7. **Reconstruction.** Enumeration of all combinations is exponential; for one example, backtrack through the table.

Collapsing to one dimension gives the famous two-line loop — and **the order of the two loops is the state definition**:

```python
def count_combinations(coins, amount):
    dp = [1] + [0] * amount
    for c in coins:                 # outer: coin types → each multiset counted once
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

def count_sequences(coins, amount):
    dp = [1] + [0] * amount
    for a in range(1, amount + 1):  # outer: amounts → ordered sequences counted
        for c in coins:
            if c <= a:
                dp[a] += dp[a - c]
    return dp[amount]

print(count_combinations([1, 2, 5], 5), count_sequences([1, 2, 5], 5))
```

```text
4 9
```

Combinations of {1, 2, 5} summing to 5: {5}, {2,2,1}, {2,1,1,1}, {1,1,1,1,1} — four. With amounts in the outer loop, $\mathrm{dp}[a]$ means "number of *ordered sequences* summing to $a$" (the last coin can be any type), so 1+2+2, 2+1+2 and 2+2+1 are counted separately — nine. Both are correct DPs, for different states. Swapping loops without changing the state sentence is the most common DP bug in the wild.

---

## Problem 3: Longest Common Subsequence

Given strings $a$ (length $n$) and $b$ (length $m$), find the longest sequence that appears in both, in order but not necessarily contiguously. LCS underlies `diff`, and its close relative edit distance ([Chapter 16](./16_dynamic_programming_patterns.md)) underlies word error rate.

1. **State.** $\mathrm{dp}[i][j]$ = length of the LCS of the prefixes $a[:i]$ and $b[:j]$.
2. **Transition.** Look at the last characters:

$$\mathrm{dp}[i][j] = \begin{cases} \mathrm{dp}[i-1][j-1] + 1 & a_{i-1} = b_{j-1} \\ \max(\mathrm{dp}[i-1][j],\ \mathrm{dp}[i][j-1]) & \text{otherwise} \end{cases}$$

   If the last characters match, some LCS uses them (an exchange argument: any LCS not ending with this pair can be modified to end with it). If not, at least one of them is unused, so drop one and take the better.
3. **Base cases.** $\mathrm{dp}[0][j] = \mathrm{dp}[i][0] = 0$: an empty prefix has an empty LCS.
4. **Order.** Row by row, left to right — each cell needs up, left and up-left.
5. **Answer.** $\mathrm{dp}[n][m]$.
6. **Complexity.** $\Theta(nm)$ time and space; $\Theta(\min(n, m))$ space for the length alone (two rows); Hirschberg's divide-and-conquer recovers the string itself in linear space.
7. **Reconstruction.** Walk back from $(n, m)$: on a match go diagonally and emit the character; otherwise move toward the larger neighbour.

```python
def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]      # NOT [[0] * (m + 1)] * (n + 1): see Chapter 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    out, i, j = [], n, m
    while i and j:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return dp, "".join(reversed(out))

dp, s = lcs("ABCBDAB", "BDCABA")
print(s, len(s))
print("    " + "  ".join("ε" + "BDCABA"))
for i, row in enumerate(dp):
    print(("ε" + "ABCBDAB")[i], row)
```

```text
BCBA 4
    ε  B  D  C  A  B  A
ε [0, 0, 0, 0, 0, 0, 0]
A [0, 0, 0, 0, 1, 1, 1]
B [0, 1, 1, 1, 1, 2, 2]
C [0, 1, 1, 2, 2, 2, 2]
B [0, 1, 1, 2, 2, 3, 3]
D [0, 1, 2, 2, 2, 3, 3]
A [0, 1, 2, 2, 3, 3, 4]
B [0, 1, 2, 2, 3, 4, 4]
```

Cross-check against brute force (all subsequences of the shorter string) on random small inputs:

```python
import itertools, random

def lcs_brute(a, b):
    def is_subseq(s, t):
        it = iter(t)
        return all(ch in it for ch in s)         # `in` on an iterator consumes it: an O(n) subsequence test
    for k in range(min(len(a), len(b)), -1, -1):
        if any(is_subseq(c, b) for c in itertools.combinations(a, k)):
            return k

random.seed(7)
for _ in range(300):
    a = "".join(random.choices("AB C", k=random.randint(0, 7)))
    b = "".join(random.choices("AB C", k=random.randint(0, 7)))
    assert len(lcs(a, b)[1]) == lcs_brute(a, b)
print("ok")
```

```text
ok
```

---

## Problem 4: 0/1 Knapsack and Space Optimization

Items with weights $w_i$ and values $v_i$; capacity $W$; each item used **at most once**. Maximise total value.

1. **State.** $\mathrm{dp}[i][c]$ = the best value achievable using only the first $i$ items with capacity $c$.
2. **Transition.** Skip item $i$, or take it if it fits:

$$\mathrm{dp}[i][c] = \max\big(\mathrm{dp}[i-1][c],\ \mathrm{dp}[i-1][c - w_i] + v_i\big)$$

3. **Base cases.** $\mathrm{dp}[0][c] = 0$ for all $c$: no items, no value.
4. **Order.** $i$ increasing; any order of $c$ in the 2-D table.
5. **Answer.** $\mathrm{dp}[n][W]$.
6. **Complexity.** $\Theta(nW)$ time; $\Theta(nW)$ space, or $\Theta(W)$ with one row iterated **downward**.
7. **Reconstruction.** Requires the 2-D table (or storing take/skip decisions): item $i$ was taken iff $\mathrm{dp}[i][c] \ne \mathrm{dp}[i-1][c]$.

The one-row version is where the iteration direction encodes "at most once". Row $i$ must read row $i-1$'s value at $c - w_i$. Iterating $c$ **downward** means $\mathrm{dp}[c - w_i]$ hasn't been overwritten yet in this pass — it still holds row $i-1$. Iterating **upward** reads the already-updated value, which allows the item to be taken again — that is the *unbounded* knapsack, exactly like the coin-combinations loop above.

```python
import itertools

def knapsack_01(items, W):
    dp = [0] * (W + 1)
    for w, v in items:
        for c in range(W, w - 1, -1):        # downward: each item at most once
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]

def knapsack_unbounded(items, W):
    dp = [0] * (W + 1)
    for w, v in items:
        for c in range(w, W + 1):            # upward: items reusable
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]

def knapsack_brute(items, W):
    return max(sum(v for _, v in s) for k in range(len(items) + 1)
               for s in itertools.combinations(items, k) if sum(w for w, _ in s) <= W)

items = [(2, 5), (3, 6)]                     # (weight, value)
print(knapsack_01(items, 6), knapsack_brute(items, 6), knapsack_unbounded(items, 6))
```

```text
11 11 15
```

With capacity 6, the 0/1 version takes both items (weight 5, value 11); the unbounded version takes the weight-2 item three times (value 15). One loop direction, two different problems.

Hand-picked cases like this one confirm a *known* difference; they don't establish correctness. Randomized comparison against independent brute forces does, and it is cheap:

```python
import random

def unbounded_brute(items, W):
    best = 0
    def go(i, cap, val):
        nonlocal best
        best = max(best, val)
        for j in range(i, len(items)):
            w, v = items[j]
            if w <= cap:
                go(j, cap - w, val + v)              # j, not j + 1: reuse allowed
    go(0, W, 0)
    return best

random.seed(11)
trials = differ = 0
for _ in range(500):
    its = [(random.randint(1, 6), random.randint(1, 9)) for _ in range(random.randint(1, 4))]
    W = random.randint(0, 12)
    assert knapsack_01(its, W) == knapsack_brute(its, W)
    assert knapsack_unbounded(its, W) == unbounded_brute(its, W)
    trials += 1
    differ += knapsack_01(its, W) != knapsack_unbounded(its, W)
print(f"{trials} random instances verified; the two variants differ on {differ}")
```

```text
500 random instances verified; the two variants differ on 301
```

---

## Memoization Is "Programs Are Data"

`functools.cache` is a decorator ([Chapter 9](./09_decorators.md)) that replaces a function with a wrapper consulting a dict keyed on the arguments — the function's *results* become data. That is the bridge between the two halves of this book: metaprogramming manipulates code as data; dynamic programming stores computation as data. In both, the move is to notice that something you were recomputing can be computed once and looked up. The same move appears in KV caches in transformer inference (attention keys and values for past tokens are a memo table indexed by position) and in build systems and `torch.compile`'s compiled-graph cache keyed by guards.

---

## Key Takeaways

- DP requires optimal substructure and overlapping subproblems; caching the brute-force recursion turns $\Theta(\varphi^n)$ Fibonacci into $\Theta(n)$ (177 calls → 11 for $n = 10$).
- Specify every DP with the seven fields — state, transition, base cases, order, answer, complexity, reconstruction — before writing code; most DP bugs are specification bugs.
- Memoization is a mechanical upgrade of brute force but ~3× slower than tabulation in CPython (44 ms vs 14 ms for 400×400 LCS) and bounded by the recursion limit.
- Loop order defines the state: coins outside counts combinations, amounts outside counts sequences.
- In one-row knapsack, iterating capacity downward means "each item once" and upward means "unlimited reuse".
- Reconstruction needs the full table or stored decisions; space-optimized rolling rows give the value only.
- Hand-picked tests demonstrate known behaviour; randomized comparison against an independent brute force is the standard of evidence for a DP.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Dynamic Programming* | Bellman, 1957 | Princeton University Press | The principle of optimality |
| *Introduction to Algorithms*, 4th ed., ch. 14 | Cormen et al., 2022 | MIT Press | Elements of DP; LCS (and the ABCBDAB/BDCABA example); memoization vs bottom-up |
| *Algorithm Design*, ch. 6 | Kleinberg, Tardos, 2005 | Pearson | Subset sum and knapsack; designing the state |
| "A linear space algorithm for computing maximal common subsequences" | Hirschberg, 1975 | doi.org/10.1145/360825.360861 | Linear-space LCS reconstruction |
| `functools.cache` / `lru_cache` | Python docs | docs.python.org/3/library/functools.html | Cache semantics and `cache_info` |
| `bench/dp_memo.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Memo vs table vs rolling-row timings |

---

**Next:** [Chapter 16 — Dynamic Programming II: Patterns](./16_dynamic_programming_patterns.md) — the recurring state shapes, and DP inside ML systems.
