---
title: "Appendix C — DP Catalogue"
---

[← Back to Table of Contents](./README.md)

# Appendix C — DP Catalogue

> *"Every DP in the book, by state shape — the index you consult when a new problem looks familiar."*

## Overview

One row per dynamic program worked in the book. Each entry gives the state sentence and transition in the notation of the chapter where it is derived with all seven recipe fields ([Chapter 15](./15_dynamic_programming_foundations.md)), the complexity before and after space optimization, and where it appears in practice. Every implementation listed here is verified against a brute force in its chapter.

---

## Prefix and Linear

| Problem | State | Transition | Time | Space (optimized) | Where it shows up | Ch |
|---------|-------|-----------|:---:|:---:|-------------------|:---:|
| **Fibonacci** | $F(n)$ | $F(n-1) + F(n-2)$ | $\Theta(n)$ | $\Theta(1)$ | the overlap demonstration | [15](./15_dynamic_programming_foundations.md) |
| **Coin change — min coins** | $\mathrm{dp}[a]$ = fewest coins summing to $a$ | $1 + \min_c \mathrm{dp}[a - c]$ | $\Theta(Ak)$ | $\Theta(A)$ | change-making; greedy check | [15](./15_dynamic_programming_foundations.md), [17](./17_greedy_algorithms.md) |
| **Coin change — count combinations** | $\mathrm{dp}[a]$ over first $i$ coin types | $\mathrm{dp}[a] \mathrel{+}= \mathrm{dp}[a - c]$, coins outer | $\Theta(Ak)$ | $\Theta(A)$ | counting multisets | [15](./15_dynamic_programming_foundations.md) |
| **Coin change — count sequences** | $\mathrm{dp}[a]$ = ordered sequences summing to $a$ | same, amounts outer | $\Theta(Ak)$ | $\Theta(A)$ | compositions; "climbing stairs" | [15](./15_dynamic_programming_foundations.md) |
| **Longest increasing subsequence** | $\mathrm{dp}[i]$ = LIS ending at $i$ | $1 + \max_{j<i, x_j<x_i} \mathrm{dp}[j]$ | $\Theta(n^2)$ → $\Theta(n \log n)$ | $\Theta(n)$ | patience sorting; longest chains | [16](./16_dynamic_programming_patterns.md) |
| **Weighted interval scheduling** | $\mathrm{dp}[i]$ over first $i$ by finish time | $\max(\mathrm{dp}[i-1], v_i + \mathrm{dp}[p(i)])$ | $\Theta(n \log n)$ | $\Theta(n)$ | scheduling with values | [17](./17_greedy_algorithms.md) |
| **Word break — min words** | $\mathrm{dp}[j]$ = fewest words for $s[:j]$ | $\min_{j-L \le i<j,\ s[i:j]\in V} \mathrm{dp}[i] + 1$ | $\Theta(nL^2)$ | $\Theta(n)$ | subword segmentation | [23](./23_problem_solving_playbook.md) |
| **Viterbi** | $\delta_t(s)$ = best log-prob ending in $s$ at $t$ | $\log B_s(o_t) + \max_{s'} \delta_{t-1}(s') + \log A_{s's}$ | $\Theta(TS^2)$ | $\Theta(TS)$ back-pointers | HMM/CRF decoding | [16](./16_dynamic_programming_patterns.md) |
| **HMM forward** | $\alpha_t(s)$ = log-prob of $o_{1..t}$ ending in $s$ | Viterbi with log-sum-exp for max | $\Theta(TS^2)$ | $\Theta(S)$ | likelihood, training | [16](./16_dynamic_programming_patterns.md) |
| **CTC forward** | $\alpha_t(s)$ over blank-extended labels | sum of stay, step, skip (skip only between distinct labels) | $\Theta(T \lvert\ell\rvert)$ | $\Theta(\lvert\ell\rvert)$ | ASR/OCR loss | [16](./16_dynamic_programming_patterns.md) |

## Two Sequences

| Problem | State | Transition | Time | Space (optimized) | Where it shows up | Ch |
|---------|-------|-----------|:---:|:---:|-------------------|:---:|
| **Longest common subsequence** | $\mathrm{dp}[i][j]$ on prefixes | match: $+1$ diagonal; else $\max$(up, left) | $\Theta(nm)$ | $\Theta(\min(n,m))$ | `diff`, alignment | [15](./15_dynamic_programming_foundations.md) |
| **Edit distance / WER** | $\mathrm{dp}[i][j]$ = edits $a[:i] \to b[:j]$ | $\min$(del, ins, sub/match) | $\Theta(nm)$ | $\Theta(\min(n,m))$ | WER/CER, fuzzy matching | [16](./16_dynamic_programming_patterns.md) |
| **Dynamic time warping** | $D[i][j]$ = min warped cost | $\lvert x_i - y_j\rvert + \min$(three neighbours) | $\Theta(nm)$ | $\Theta(m)$ | time-series alignment | [16](./16_dynamic_programming_patterns.md) |

## Knapsack Family

| Problem | State | Transition | Time | Space (optimized) | Where it shows up | Ch |
|---------|-------|-----------|:---:|:---:|-------------------|:---:|
| **0/1 knapsack** | $\mathrm{dp}[i][c]$ = best value, first $i$ items, capacity $c$ | $\max(\mathrm{dp}[i-1][c], \mathrm{dp}[i-1][c-w_i]+v_i)$ | $\Theta(nW)$ | $\Theta(W)$, **downward** | budgeted selection | [15](./15_dynamic_programming_foundations.md) |
| **Unbounded knapsack** | same, items reusable | same, **upward** | $\Theta(nW)$ | $\Theta(W)$ | cutting stock, coin change | [15](./15_dynamic_programming_foundations.md) |
| **Subset sum (bitset)** | bit $s$ = sum $s$ reachable | <code>reach &#124;= reach &lt;&lt; x</code> | $\Theta(nS/w)$ word ops | $\Theta(S)$ bits | partition, feasibility | [20](./20_bit_manipulation.md) |

## Interval, Grid, Tree, Subset, DAG, Digit

| Problem | State | Transition | Time | Space | Where it shows up | Ch |
|---------|-------|-----------|:---:|:---:|-------------------|:---:|
| **Matrix-chain order** | $\mathrm{dp}[i][j]$ = min cost for $A_i..A_j$ | $\min_k \mathrm{dp}[i][k] + \mathrm{dp}[k+1][j] + p_{i-1}p_kp_j$, by length | $\Theta(n^3)$ | $\Theta(n^2)$ | einsum contraction order | [16](./16_dynamic_programming_patterns.md) |
| **Grid paths with obstacles** | $\mathrm{dp}[r][c]$ = paths to $(r,c)$ | up + left | $\Theta(RC)$ | $\Theta(C)$ | lattice counting | [16](./16_dynamic_programming_patterns.md) |
| **Tree max-weight independent set** | $\mathrm{in}[v], \mathrm{out}[v]$ | $w_v + \sum \mathrm{out}[c]$; $\sum \max(\mathrm{in}[c], \mathrm{out}[c])$ | $\Theta(n)$ | $\Theta(n)$ | selection on hierarchies | [16](./16_dynamic_programming_patterns.md) |
| **TSP (Held–Karp)** | $\mathrm{dp}[S][v]$ = shortest path over set $S$ ending at $v$ | $\min_u \mathrm{dp}[S \setminus v][u] + d(u,v)$ | $\Theta(2^n n^2)$ | $\Theta(2^n n)$ | small routing, ordering | [16](./16_dynamic_programming_patterns.md) |
| **Longest path / critical path in a DAG** | $\mathrm{dp}[v]$ = longest path ending at $v$ | $\max_{(u,v)} \mathrm{dp}[u] + w$, topological order | $\Theta(V + E)$ | $\Theta(V)$ | pipeline scheduling | [16](./16_dynamic_programming_patterns.md) |
| **Bellman–Ford** | $\mathrm{dist}_k[v]$ = shortest with ≤ $k$ edges | relax all edges, $V - 1$ rounds | $\Theta(VE)$ | $\Theta(V)$ | negative weights, cycle detection | [18](./18_graph_algorithms.md) |
| **Digit DP — digit sum divisible by $k$** | $f(\text{pos}, \text{rem}, \text{tight})$ | try digits up to the bound when tight | $\Theta(10Dk)$ | $\Theta(Dk)$ | counting numbers ≤ $N$ | [16](./16_dynamic_programming_patterns.md) |

---

## Not DP (and Why)

| Problem | Why not | Use instead | Ch |
|---------|---------|-------------|:---:|
| **Beam search decoding** | the state is the whole prefix; no overlapping subproblems | heuristic search; exact only for Markov models | [16](./16_dynamic_programming_patterns.md) |
| **Longest simple path, general graph** | no optimal substructure (prefix and suffix may share vertices) | NP-hard; exponential search | [16](./16_dynamic_programming_patterns.md) |
| **N-Queens and constraint search** | branches are distinct partial placements, not overlapping subproblems | backtracking with pruning | [14](./14_recursion_and_divide_and_conquer.md) |
| **Interval scheduling (unweighted)** | greedy-choice property holds | earliest finish greedy | [17](./17_greedy_algorithms.md) |
| **Fractional knapsack** | greedy-choice property holds | density greedy | [17](./17_greedy_algorithms.md) |

---

**Next:** [Appendix D — Python Version Matrix](./appendix_d_python_versions.md) — which feature arrived when.
