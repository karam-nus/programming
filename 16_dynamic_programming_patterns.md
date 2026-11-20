---
title: "Chapter 16 — Dynamic Programming II: Patterns"
---

[← Back to Table of Contents](./README.md)

# Chapter 16 — Dynamic Programming II: Patterns

> *"There are perhaps a dozen DP state shapes. Learn the shapes and new problems stop being new."*

## Overview

[Chapter 15](./15_dynamic_programming_foundations.md) established the seven-field recipe on single problems. This chapter is a catalogue organised by **state shape** — what the indices of $\mathrm{dp}$ range over — because recognising the shape is how you design the state for an unfamiliar problem. Each pattern gets the recipe in compact form, a verified implementation, and a brute-force cross-check. The second half covers DP inside ML systems — edit distance for WER, Viterbi decoding, the CTC forward algorithm and dynamic time warping — and closes with when DP is the wrong tool. Every problem here is indexed in [Appendix C](./appendix_c_dp_catalogue.md).

<div class="fieldguide">
<div class="species c-pink"><div class="sp-name">Prefix</div><div class="sp-latin">dp[i]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><rect x="8" y="34" width="16" height="16" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="26" y="34" width="16" height="16" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="44" y="34" width="16" height="16" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="62" y="34" width="16" height="16" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="80" y="34" width="16" height="16" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="98" y="34" width="16" height="16" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="116" y="34" width="16" height="16" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="134" y="34" width="16" height="16" rx="2" fill="#161b22" stroke="#3b4350"/><path d="M60 26 L 96 26" stroke="#f9a8d4" stroke-width="2" marker-end=""/><text x="75" y="70" text-anchor="middle" style="fill:#c9d1d9;font-size:12px">left to right</text></svg></div><div class="sp-marks"><b>Marks:</b> a sequence; the answer at i depends on earlier positions. <b>Examples:</b> coin change, LIS, word break, Viterbi.</div></div>
<div class="species c-cyan"><div class="sp-name">Two prefixes</div><div class="sp-latin">dp[i][j]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><rect x="20" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="35" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="50" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="65" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="80" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="95" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="110" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="20" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="35" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="50" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="65" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="80" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="95" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="110" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="20" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="35" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="50" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="65" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="80" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="95" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="110" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="20" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="35" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="50" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="65" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="80" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="95" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="110" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="20" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="35" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="50" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="65" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="80" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="95" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="110" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/></svg></div><div class="sp-marks"><b>Marks:</b> two sequences to align or compare. <b>Fill:</b> row by row, each cell reads up, left, diagonal. <b>Examples:</b> LCS, edit distance / WER, DTW.</div></div>
<div class="species c-purple"><div class="sp-name">Interval</div><div class="sp-latin">dp[i][j], i ≤ j</div><div class="sp-shape"><svg viewBox="0 0 150 84"><rect x="30" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="45" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="60" y="4" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="75" y="4" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="90" y="4" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="105" y="4" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="45" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="60" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="75" y="19" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="90" y="19" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="105" y="19" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="60" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="75" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="90" y="34" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="105" y="34" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="75" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="90" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="105" y="49" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="90" y="64" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/><rect x="105" y="64" width="13" height="13" rx="2" fill="#4a2238" stroke="#3b4350"/></svg></div><div class="sp-marks"><b>Marks:</b> "split a range", "merge adjacent", parenthesise. <b>Fill:</b> by interval length. <b>Examples:</b> matrix-chain order, palindromic partitions.</div></div>
<div class="species c-teal"><div class="sp-name">Grid</div><div class="sp-latin">dp[r][c]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><rect x="20" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="35" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="50" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="65" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="80" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="95" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="110" y="4" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="20" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="35" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="50" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="65" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="80" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="95" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="110" y="19" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="20" y="34" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="35" y="34" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="50" y="34" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="65" y="34" width="13" height="13" rx="2" fill="#163a36" stroke="#3b4350"/><rect x="80" y="34" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="95" y="34" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="110" y="34" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="20" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="35" y="49" width="13" height="13" rx="2" fill="#5b2a2a" stroke="#3b4350"/><rect x="50" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="65" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="80" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="95" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="110" y="49" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="20" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="35" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="50" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="65" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="80" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="95" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/><rect x="110" y="64" width="13" height="13" rx="2" fill="#161b22" stroke="#3b4350"/></svg></div><div class="sp-marks"><b>Marks:</b> moves on a 2-D board (right/down). <b>Fill:</b> row-major, one row of memory. <b>Examples:</b> path counts, min-cost paths.</div></div>
<div class="species c-green"><div class="sp-name">Tree</div><div class="sp-latin">in[v], out[v]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><line x1="75" y1="14" x2="40" y2="44" stroke="#8b949e" stroke-width="2"/><line x1="75" y1="14" x2="110" y2="44" stroke="#8b949e" stroke-width="2"/><line x1="40" y1="44" x2="22" y2="72" stroke="#8b949e" stroke-width="2"/><line x1="40" y1="44" x2="58" y2="72" stroke="#8b949e" stroke-width="2"/><line x1="110" y1="44" x2="110" y2="72" stroke="#8b949e" stroke-width="2"/><circle cx="75" cy="14" r="8" fill="#163a24" stroke="#4ade80" stroke-width="2"/><circle cx="40" cy="44" r="8" fill="#161b22" stroke="#4ade80" stroke-width="2"/><circle cx="110" cy="44" r="8" fill="#163a24" stroke="#4ade80" stroke-width="2"/><circle cx="22" cy="72" r="7" fill="#163a24" stroke="#4ade80" stroke-width="2"/><circle cx="58" cy="72" r="7" fill="#163a24" stroke="#4ade80" stroke-width="2"/><circle cx="110" cy="72" r="7" fill="#161b22" stroke="#4ade80" stroke-width="2"/></svg></div><div class="sp-marks"><b>Marks:</b> a hierarchy; a node's answer combines its children's. <b>Fill:</b> post-order. <b>Examples:</b> max independent set, tree diameter.</div></div>
<div class="species c-orange"><div class="sp-name">Subset</div><div class="sp-latin">dp[mask][v]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><rect x="6" y="26" width="22" height="26" rx="3" fill="#3a2a12" stroke="#fdba74"/><text x="17" y="40" text-anchor="middle" dominant-baseline="middle" style="fill:#f0f3f6;font-size:14px;font-family:monospace">1</text><rect x="34" y="26" width="22" height="26" rx="3" fill="#161b22" stroke="#fdba74"/><text x="45" y="40" text-anchor="middle" dominant-baseline="middle" style="fill:#f0f3f6;font-size:14px;font-family:monospace">0</text><rect x="62" y="26" width="22" height="26" rx="3" fill="#3a2a12" stroke="#fdba74"/><text x="73" y="40" text-anchor="middle" dominant-baseline="middle" style="fill:#f0f3f6;font-size:14px;font-family:monospace">1</text><rect x="90" y="26" width="22" height="26" rx="3" fill="#3a2a12" stroke="#fdba74"/><text x="101" y="40" text-anchor="middle" dominant-baseline="middle" style="fill:#f0f3f6;font-size:14px;font-family:monospace">1</text><rect x="118" y="26" width="22" height="26" rx="3" fill="#161b22" stroke="#fdba74"/><text x="129" y="40" text-anchor="middle" dominant-baseline="middle" style="fill:#f0f3f6;font-size:14px;font-family:monospace">0</text></svg></div><div class="sp-marks"><b>Marks:</b> "visit every element once", n ≤ 20. <b>Fill:</b> increasing mask. <b>Examples:</b> Held–Karp TSP, assignment.</div></div>
<div class="species c-yellow"><div class="sp-name">DAG</div><div class="sp-latin">dp[v]</div><div class="sp-shape"><svg viewBox="0 0 150 84"><circle cx="20" cy="42" r="9" fill="#161b22" stroke="#fde047" stroke-width="2"/><circle cx="70" cy="18" r="9" fill="#161b22" stroke="#fde047" stroke-width="2"/><circle cx="70" cy="66" r="9" fill="#161b22" stroke="#fde047" stroke-width="2"/><circle cx="125" cy="42" r="9" fill="#161b22" stroke="#fde047" stroke-width="2"/><line x1="28" y1="37" x2="61" y2="22" stroke="#8b949e" stroke-width="2"/><line x1="28" y1="47" x2="61" y2="62" stroke="#8b949e" stroke-width="2"/><line x1="79" y1="22" x2="116" y2="37" stroke="#8b949e" stroke-width="2"/><line x1="79" y1="62" x2="116" y2="47" stroke="#8b949e" stroke-width="2"/><line x1="70" y1="27" x2="70" y2="57" stroke="#8b949e" stroke-width="2"/></svg></div><div class="sp-marks"><b>Marks:</b> dependencies, prerequisites, "longest/critical path". <b>Fill:</b> topological order. <b>Examples:</b> critical path, path counting.</div></div>
<div class="species c-blue"><div class="sp-name">Digit</div><div class="sp-latin">f(pos, state, tight)</div><div class="sp-shape"><svg viewBox="0 0 150 84"><text x="75" y="30" text-anchor="middle" style="fill:#f0f3f6;font-size:22px;font-family:monospace">5 0 0 0</text><rect x="22" y="44" width="34" height="8" rx="3" fill="#93c5fd"/><text x="75" y="70" text-anchor="middle" style="fill:#c9d1d9;font-size:12px">tight while equal to N</text></svg></div><div class="sp-marks"><b>Marks:</b> "count numbers ≤ N with a digit property". <b>Fill:</b> memoized over digits. <b>Examples:</b> digit sums, numbers without a repeated digit.</div></div>
</div>

---

## Prefix DP: Longest Increasing Subsequence

| Field | LIS — $\Theta(n^2)$ version |
|-------|------------------------------|
| **State** | $\mathrm{dp}[i]$ = length of the longest strictly increasing subsequence that **ends at** index $i$ |
| **Transition** | $\mathrm{dp}[i] = 1 + \max\{\mathrm{dp}[j] : j < i,\ x_j < x_i\}$ (max of empty set = 0) |
| **Base cases** | Implicit: every element alone is an increasing subsequence of length 1 |
| **Order** | $i$ increasing |
| **Answer** | $\max_i \mathrm{dp}[i]$ — the LIS can end anywhere |
| **Complexity** | $n$ states × $\Theta(n)$ = $\Theta(n^2)$ time, $\Theta(n)$ space |
| **Reconstruction** | Store the argmax predecessor $j$ for each $i$ |

"Ends at $i$" is the key state-design move for subsequence problems: it makes the transition need only *one* fact about the past (the last element), which is what the comparison $x_j < x_i$ uses.

### The $\Theta(n \log n)$ patience method

Keep `tails[k]` = the **smallest possible last element** of an increasing subsequence of length $k + 1$ seen so far. `tails` is strictly increasing (a length-$(k+1)$ subsequence contains a length-$k$ one with a smaller tail), so each new $x$ can be placed by binary search: it extends the longest subsequence whose tail is $< x$, replacing the first tail $\ge x$.

```python
import bisect, itertools, random

def lis_length(xs):
    tails = []
    for x in xs:
        k = bisect.bisect_left(tails, x)       # first tail >= x (strictly increasing LIS)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x                        # a smaller tail for length k+1
    return len(tails)

def lis_brute(xs):
    for k in range(len(xs), 0, -1):
        if any(all(a < b for a, b in itertools.pairwise(c)) for c in itertools.combinations(xs, k)):
            return k
    return 0

random.seed(5)
for _ in range(300):
    xs = [random.randint(0, 9) for _ in range(random.randint(0, 9))]
    assert lis_length(xs) == lis_brute(xs)
print(lis_length([10, 9, 2, 5, 3, 7, 101, 18]))
```

```text
4
```

`tails` is **not** an LIS — it mixes elements from different subsequences — but its length is the LIS length. Use `bisect_right` for non-decreasing subsequences. This is the classic case where a DP's state can be compressed by a monotonicity argument into a structure with faster queries.

---

## Two-Prefix DP: Edit Distance and WER

| Field | Levenshtein distance |
|-------|----------------------|
| **State** | $\mathrm{dp}[i][j]$ = minimum number of insertions, deletions and substitutions turning $a[:i]$ into $b[:j]$ |
| **Transition** | $\mathrm{dp}[i][j] = \min\big(\mathrm{dp}[i-1][j] + 1,\ \mathrm{dp}[i][j-1] + 1,\ \mathrm{dp}[i-1][j-1] + [a_{i-1} \ne b_{j-1}]\big)$ — delete, insert, substitute/match |
| **Base cases** | $\mathrm{dp}[i][0] = i$ (delete everything), $\mathrm{dp}[0][j] = j$ (insert everything) |
| **Order** | Row by row |
| **Answer** | $\mathrm{dp}[n][m]$ |
| **Complexity** | $\Theta(nm)$ time; $\Theta(\min(n, m))$ space with two rows |
| **Reconstruction** | Backtrack choosing whichever predecessor achieved the min → an alignment |

Applied to **token** sequences instead of characters, this is **word error rate**: $\mathrm{WER} = \mathrm{dp}[n][m] / n$ for reference length $n$ — the standard ASR metric (and its character-level twin CER).

```python
def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[-1]

ref = "the cat sat on the mat".split()
hyp = "the cat sit on mat".split()
print(edit_distance("kitten", "sitting"), edit_distance(ref, hyp), round(edit_distance(ref, hyp) / len(ref), 3))
```

```text
3 2 0.333
```

The same function works on strings and lists because it only uses indexing, `len` and `!=` — duck typing paying off. Libraries like `jiwer` add normalisation and alignment output; the core is these eight lines.

<div class="lab" data-lab="dptable" data-problem="edit"></div>

---

## Interval DP: Matrix-Chain Multiplication

| Field | Optimal parenthesisation of $A_1 A_2 \cdots A_n$, where $A_k$ is $p_{k-1} \times p_k$ |
|-------|------------------------------|
| **State** | $\mathrm{dp}[i][j]$ = minimum scalar multiplications to compute $A_i \cdots A_j$ |
| **Transition** | $\mathrm{dp}[i][j] = \min_{i \le k < j} \big(\mathrm{dp}[i][k] + \mathrm{dp}[k+1][j] + p_{i-1} p_k p_j\big)$ — choose the last split |
| **Base cases** | $\mathrm{dp}[i][i] = 0$: a single matrix needs no multiplication |
| **Order** | By **interval length** increasing — a range depends only on shorter ranges |
| **Answer** | $\mathrm{dp}[1][n]$ |
| **Complexity** | $\Theta(n^2)$ states × $\Theta(n)$ splits = $\Theta(n^3)$ time, $\Theta(n^2)$ space |
| **Reconstruction** | Store the best split $k$; recurse to print parentheses |

Interval DP's signature is "the answer for a range is a choice of where to split it". Ordering by length (not by $i$) is what makes the dependencies ready. This problem is directly relevant to `torch.einsum` / `numpy.einsum(..., optimize=True)` and `opt_einsum`, which search contraction orders for the same reason: $(AB)C$ and $A(BC)$ can differ in cost by orders of magnitude.

```python
import functools

def matrix_chain(p):
    n = len(p) - 1
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    split = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(2, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j], split[i][j] = min((dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j], k) for k in range(i, j))
    def paren(i, j):
        return f"A{i}" if i == j else f"({paren(i, split[i][j])}{paren(split[i][j] + 1, j)})"
    return dp[1][n], paren(1, n)

dims = [10, 100, 5, 50]            # A1: 10×100, A2: 100×5, A3: 5×50
print(matrix_chain(dims))
print("worst order cost:", 100 * 5 * 50 + 10 * 100 * 50)
```

```text
(7500, '((A1A2)A3)')
worst order cost: 75000
```

A 10× difference from parenthesisation alone.

---

## Grid DP: Paths With Obstacles

| Field | Number of monotone (right/down) paths from top-left to bottom-right |
|-------|----------------------|
| **State** | $\mathrm{dp}[r][c]$ = number of paths from $(0,0)$ to $(r,c)$ |
| **Transition** | $\mathrm{dp}[r][c] = \mathrm{dp}[r-1][c] + \mathrm{dp}[r][c-1]$, or 0 on an obstacle |
| **Base cases** | $\mathrm{dp}[0][0] = 1$ if open; out-of-grid neighbours contribute 0 |
| **Order** | Row-major |
| **Answer** | $\mathrm{dp}[R-1][C-1]$ |
| **Complexity** | $\Theta(RC)$ time; $\Theta(C)$ space with one row updated in place |
| **Reconstruction** | Not needed for counting |

```python
def grid_paths(grid):
    C = len(grid[0])
    row = [0] * C
    row[0] = 1
    for r in range(len(grid)):
        for c in range(C):
            if grid[r][c] == "#":
                row[c] = 0
            elif c > 0:
                row[c] += row[c - 1]          # row[c] still holds the value from the row above
    return row[-1]

print(grid_paths(["...", ".#.", "..."]), grid_paths(["." * 10] * 10))
```

```text
2 48620
```

Without obstacles a 10×10 grid has $\binom{18}{9} = 48620$ paths — a closed-form check of the recurrence.

---

## Tree DP: Maximum-Weight Independent Set

| Field | Choose vertices of a tree, no two adjacent, maximising total weight |
|-------|----------------------|
| **State** | $\mathrm{in}[v]$, $\mathrm{out}[v]$ = best weight in $v$'s subtree with $v$ taken / not taken |
| **Transition** | $\mathrm{in}[v] = w_v + \sum_{c} \mathrm{out}[c]$; $\mathrm{out}[v] = \sum_c \max(\mathrm{in}[c], \mathrm{out}[c])$ |
| **Base cases** | A leaf: $\mathrm{in} = w_v$, $\mathrm{out} = 0$ (the sums are empty) |
| **Order** | Post-order: children before parents |
| **Answer** | $\max(\mathrm{in}[\text{root}], \mathrm{out}[\text{root}])$ |
| **Complexity** | $\Theta(n)$ — each edge examined once |
| **Reconstruction** | Top-down: take root if $\mathrm{in} > \mathrm{out}$; a taken vertex forces children out |

Tree DP's state is "the subtree, plus the minimum interface information the parent needs" — here, one bit. On a general graph the same problem is NP-hard; the tree's lack of cycles is what makes the subtree decomposition valid.

```python
import itertools

def tree_mis(n, edges, w, root=0):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b); adj[b].append(a)
    order, parent, stack = [], [-1] * n, [root]
    seen = [False] * n; seen[root] = True
    while stack:                                    # iterative DFS: no recursion limit
        v = stack.pop(); order.append(v)
        for u in adj[v]:
            if not seen[u]:
                seen[u] = True; parent[u] = v; stack.append(u)
    inc, exc = w[:], [0] * n
    for v in reversed(order):                       # reversed pre-order = children first
        p = parent[v]
        if p >= 0:
            inc[p] += exc[v]
            exc[p] += max(inc[v], exc[v])
    return max(inc[root], exc[root])

def mis_brute(n, edges, w):
    best = 0
    for picks in itertools.product([0, 1], repeat=n):
        if all(not (picks[a] and picks[b]) for a, b in edges):
            best = max(best, sum(wi for wi, p in zip(w, picks) if p))
    return best

edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5)]
w = [3, 2, 1, 10, 1, 5]
print(tree_mis(6, edges, w), mis_brute(6, edges, w))
```

```text
19 19
```

---

## Subset (Bitmask) DP: Travelling Salesman

| Field | Held–Karp: shortest tour visiting all $n$ cities once, returning to city 0 |
|-------|----------------------|
| **State** | $\mathrm{dp}[S][v]$ = length of the shortest path that starts at 0, visits exactly the set $S$ (a bitmask containing 0 and $v$), and ends at $v$ |
| **Transition** | $\mathrm{dp}[S][v] = \min_{u \in S \setminus \{v\}} \mathrm{dp}[S \setminus \{v\}][u] + d(u, v)$ |
| **Base cases** | $\mathrm{dp}[\{0\}][0] = 0$ |
| **Order** | Increasing mask value (a subset's mask is smaller than its superset's) |
| **Answer** | $\min_v \mathrm{dp}[\text{all}][v] + d(v, 0)$ |
| **Complexity** | $2^n \cdot n$ states × $n$ = $\Theta(2^n n^2)$ time, $\Theta(2^n n)$ space |
| **Reconstruction** | Store the argmin $u$; walk back |

The state forgets the *order* in which $S$ was visited and keeps only the set and the endpoint — the only facts that affect future costs. That compression takes $n!$ tours down to $2^n n$ states: for $n = 15$, $1.3 \times 10^{12}$ permutations vs $4.9 \times 10^5$ states. Bit operations on masks are [Chapter 20](./20_bit_manipulation.md).

```python
import itertools, math, random

def held_karp(d):
    n = len(d)
    dp = [[math.inf] * n for _ in range(1 << n)]
    dp[1][0] = 0
    for S in range(1 << n):
        if not S & 1:
            continue
        for v in range(n):
            if dp[S][v] == math.inf or not S >> v & 1:
                continue
            for u in range(n):
                if not S >> u & 1:
                    T = S | 1 << u
                    dp[T][u] = min(dp[T][u], dp[S][v] + d[v][u])     # push-style transition
    full = (1 << n) - 1
    return min(dp[full][v] + d[v][0] for v in range(1, n))

def tsp_brute(d):
    n = len(d)
    return min(sum(d[a][b] for a, b in itertools.pairwise((0, *p, 0))) for p in itertools.permutations(range(1, n)))

random.seed(2)
for n in range(2, 8):
    d = [[0 if i == j else random.randint(1, 20) for j in range(n)] for i in range(n)]
    assert held_karp(d) == tsp_brute(d)
print("Held-Karp matches brute force for n = 2..7")
```

```text
Held-Karp matches brute force for n = 2..7
```

This version uses **push** transitions (from each state, update its successors) rather than **pull** (each state reads its predecessors, as in the table above). Both are valid whenever states are processed in an order consistent with the dependencies; push is often simpler when successors are easier to enumerate than predecessors.

---

## DAG DP: Longest Path and Path Counting

Every DP is a computation over a **DAG of subproblems** — states are vertices, dependencies are edges, and "order" is a topological order. Making the DAG explicit solves problems on actual DAGs: critical paths in build or task graphs, longest chains of dependent jobs, counting paths.

| Field | Longest (weighted) path in a DAG |
|-------|----------------------|
| **State** | $\mathrm{dp}[v]$ = weight of the longest path ending at $v$ |
| **Transition** | $\mathrm{dp}[v] = \max_{(u,v) \in E}\ \mathrm{dp}[u] + w(u,v)$ (0 if no in-edges) |
| **Base cases** | Sources: $\mathrm{dp}[v] = 0$ |
| **Order** | Topological — computed by Kahn's algorithm ([Chapter 18](./18_graph_algorithms.md)) |
| **Answer** | $\max_v \mathrm{dp}[v]$ |
| **Complexity** | $\Theta(\lvert V\rvert + \lvert E\rvert)$ |
| **Reconstruction** | Store the argmax predecessor |

```python
import graphlib

def critical_path(durations, deps):
    """durations: task -> time; deps: task -> set of prerequisites."""
    finish = {}
    for t in graphlib.TopologicalSorter(deps).static_order():   # stdlib topological sort (3.9+)
        finish[t] = durations[t] + max((finish[p] for p in deps.get(t, ())), default=0)
    return max(finish.values()), finish

durations = {"download": 3, "tokenize": 2, "train": 10, "eval": 1, "export": 2}
deps = {"tokenize": {"download"}, "train": {"tokenize"}, "eval": {"train"}, "export": {"train"}}
print(critical_path(durations, deps)[0])
```

```text
17
```

On a graph with cycles, "longest simple path" loses optimal substructure (the prefix and suffix may share vertices) and is NP-hard. Shortest paths survive cycles as long as there are no negative cycles — that is Bellman–Ford, a DP over "paths with at most $k$ edges" ([Chapter 18](./18_graph_algorithms.md)).

---

## Digit DP: Counting Numbers Up to $N$

| Field | Count integers in $[0, N]$ whose digit sum is divisible by $k$ |
|-------|----------------------|
| **State** | $f(\text{pos}, \text{rem}, \text{tight})$ = number of ways to fill digits from position pos onward, given the digit-sum remainder so far and whether all previous digits equal $N$'s (tight) |
| **Transition** | Try each digit $d$ from 0 to ($N$'s digit if tight, else 9): $f(\text{pos}+1, (\text{rem}+d) \bmod k, \text{tight} \wedge d = N_{\text{pos}})$ |
| **Base cases** | pos = number of digits: return 1 if rem = 0 else 0 |
| **Order** | Memoized recursion (depth = number of digits) |
| **Answer** | $f(0, 0, \text{True})$ |
| **Complexity** | $\Theta(D \cdot k \cdot 2)$ states × 10 = $\Theta(10 D k)$, for $D$ digits |
| **Reconstruction** | n/a — counting |

The `tight` flag is the signature of digit DP: once a digit is strictly below $N$'s, the rest are free. This turns "count over $10^{18}$ numbers" into a few thousand states.

```python
import functools

def count_digit_sum_divisible(N, k):
    digits = list(map(int, str(N)))
    @functools.cache
    def f(pos, rem, tight):
        if pos == len(digits):
            return int(rem == 0)
        limit = digits[pos] if tight else 9
        return sum(f(pos + 1, (rem + d) % k, tight and d == limit) for d in range(limit + 1))
    return f(0, 0, True)

brute = sum(1 for x in range(0, 5001) if sum(map(int, str(x))) % 7 == 0)
print(count_digit_sum_divisible(5000, 7), brute, count_digit_sum_divisible(10**18, 7))
```

```text
713 713 142857142856594042
```

---

## DP Inside ML Systems

### Viterbi decoding

The most probable hidden-state sequence of an HMM — the decoding step of classical speech recognition, POS tagging, and the CRF layer on top of NER models — is a prefix DP over time with the current state as the second index.

| Field | Viterbi |
|-------|---------|
| **State** | $\delta_t(s)$ = log-probability of the best state sequence ending in state $s$ at time $t$, jointly with observations $o_{1..t}$ |
| **Transition** | $\delta_t(s) = \log B_s(o_t) + \max_{s'} \big(\delta_{t-1}(s') + \log A_{s's}\big)$ |
| **Base cases** | $\delta_1(s) = \log \pi_s + \log B_s(o_1)$ |
| **Order** | $t$ increasing |
| **Answer** | $\max_s \delta_T(s)$ |
| **Complexity** | $\Theta(T S^2)$ time, $\Theta(TS)$ space for back-pointers |
| **Reconstruction** | Back-pointers $\psi_t(s) = \arg\max_{s'}$, followed from $T$ to 1 |

Working in log space turns products of small probabilities (which underflow after a few hundred steps) into sums — the standard numerical move in every sequence DP.

<details class="code-fold">
<summary>Viterbi in log space, checked against exhaustive search (34 lines)</summary>

```python
import itertools, math

def viterbi(obs, states, log_pi, log_A, log_B):
    delta = [{s: log_pi[s] + log_B[s][obs[0]] for s in states}]
    back = [{}]
    for o in obs[1:]:
        prev, cur, ptr = delta[-1], {}, {}
        for s in states:
            best_prev = max(states, key=lambda p: prev[p] + log_A[p][s])
            cur[s] = prev[best_prev] + log_A[best_prev][s] + log_B[s][o]
            ptr[s] = best_prev
        delta.append(cur); back.append(ptr)
    last = max(states, key=lambda s: delta[-1][s])
    path = [last]
    for ptr in reversed(back[1:]):
        path.append(ptr[path[-1]])
    return path[::-1], delta[-1][last]

L = math.log
states = ("Rainy", "Sunny")
log_pi = {"Rainy": L(0.6), "Sunny": L(0.4)}
log_A = {"Rainy": {"Rainy": L(0.7), "Sunny": L(0.3)}, "Sunny": {"Rainy": L(0.4), "Sunny": L(0.6)}}
log_B = {"Rainy": {"walk": L(0.1), "shop": L(0.4), "clean": L(0.5)},
         "Sunny": {"walk": L(0.6), "shop": L(0.3), "clean": L(0.1)}}
obs = ["walk", "shop", "clean"]

def joint(seq):
    lp = log_pi[seq[0]] + log_B[seq[0]][obs[0]]
    for t in range(1, len(obs)):
        lp += log_A[seq[t - 1]][seq[t]] + log_B[seq[t]][obs[t]]
    return lp

path, lp = viterbi(obs, states, log_pi, log_A, log_B)
best = max(itertools.product(states, repeat=len(obs)), key=joint)
print(path, round(math.exp(lp), 5), list(best) == path)
```

```text
['Sunny', 'Rainy', 'Rainy'] 0.01344 True
```

</details>

Replace `max` with log-sum-exp and the same recurrence becomes the **forward algorithm**, which computes the total probability of the observations — the denominator needed for training.

### CTC: the forward algorithm over alignments

Connectionist Temporal Classification (used to train ASR and OCR models whose output length differs from input length) defines the probability of a label sequence as the sum over all **alignments** — frame-level paths that collapse to it after merging repeats and removing blanks. There are exponentially many alignments; the CTC loss computes their total probability with a DP over (time, position in the blank-extended label sequence $\ell' = (\varnothing, \ell_1, \varnothing, \ell_2, \dots, \varnothing)$):

$$\alpha_t(s) = y_t(\ell'_s)\cdot\begin{cases}\alpha_{t-1}(s) + \alpha_{t-1}(s-1) & \ell'_s = \varnothing \ \text{or}\ \ell'_s = \ell'_{s-2} \\ \alpha_{t-1}(s) + \alpha_{t-1}(s-1) + \alpha_{t-1}(s-2) & \text{otherwise}\end{cases}$$

The skip from $s-2$ is allowed only between *different* labels, because a blank is required to separate repeated characters ("ll" in "hello" needs a blank between the two l's). `torch.nn.functional.ctc_loss` implements this in log space on the GPU; gradients come from the matching backward recursion $\beta$.

### Dynamic time warping

DTW aligns two time series that vary in speed — gesture templates, sensor traces, early speech recognisers. It is edit distance with a continuous cost and no insertion penalty:

$$D[i][j] = |x_i - y_j| + \min(D[i-1][j],\ D[i][j-1],\ D[i-1][j-1]), \quad D[0][0] = 0,\ D[i][0] = D[0][j] = \infty$$

```python
import math

def dtw(x, y):
    n, m = len(x), len(y)
    D = [[math.inf] * (m + 1) for _ in range(n + 1)]
    D[0][0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = abs(x[i - 1] - y[j - 1]) + min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
    return D[n][m]

print(dtw([0, 1, 2, 3, 2, 0], [0, 0, 1, 2, 2, 3, 2, 0]), dtw([0, 1, 2], [2, 1, 0]))
```

```text
0.0 4.0
```

The slower series is a time-stretched copy of the first, so the warped distance is exactly 0.

---

## When DP Is the Wrong Tool

- **Beam search is not DP.** It keeps the top-$k$ partial hypotheses per step and discards the rest, so it is not exact: the optimal sequence can be pruned early. Exact decoding is possible only when the model's state is small and Markov (HMMs → Viterbi). A transformer's "state" is the entire prefix, so there is no compact state to tabulate — the overlapping-subproblems property fails.
- **The state space is too large.** $\Theta(nW)$ knapsack with $W = 10^{12}$ is infeasible; switch the DP dimension (DP over value instead of weight), use approximation schemes, or use an ILP solver.
- **A greedy choice is provably optimal.** Then DP wastes time and memory. [Chapter 17](./17_greedy_algorithms.md) shows how to prove (or disprove) that.
- **No optimal substructure.** Longest simple path in a general graph; problems with global constraints that cut across subproblems.

---

## Key Takeaways

- Recognise the state shape first: prefix, two prefixes, interval, grid, tree, subset, DAG, digit; each comes with a natural order.
- "Ends at $i$" states make subsequence transitions local; LIS then compresses to $\Theta(n \log n)$ via the monotone `tails` array and binary search.
- Edit distance over tokens *is* WER; interval DP over split points is the einsum contraction-order problem.
- Tree DP passes minimal interface state up from children; bitmask DP forgets order and keeps the set — $n!$ → $2^n n$.
- Every DP is a computation over a DAG of states; on real DAGs, process in topological order (`graphlib`).
- Viterbi (max), the forward algorithm and CTC (sum in log space), and DTW are the same DP template with different semirings and costs.
- Beam search is a heuristic, not DP: when the state is the whole prefix, there are no overlapping subproblems to exploit.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Introduction to Algorithms*, 4th ed., ch. 14 | Cormen et al., 2022 | MIT Press | Matrix-chain multiplication, optimal BSTs, interval-DP ordering |
| "A Dynamic Programming Approach to Sequencing Problems" | Held, Karp, 1962 | doi.org/10.1137/0110015 | Held–Karp TSP recurrence |
| "Error bounds for convolutional codes and an asymptotically optimum decoding algorithm" | Viterbi, 1967 | doi.org/10.1109/TIT.1967.1054010 | The Viterbi algorithm |
| "A Tutorial on Hidden Markov Models" | Rabiner, 1989 | doi.org/10.1109/5.18626 | Forward, Viterbi, log-space computation |
| "Connectionist Temporal Classification" | Graves et al., ICML 2006 | doi.org/10.1145/1143844.1143891 | The CTC forward recursion and blank-separation rule |
| "Dynamic programming algorithm optimization for spoken word recognition" | Sakoe, Chiba, 1978 | doi.org/10.1109/TASSP.1978.1163055 | DTW |
| "Binary codes capable of correcting deletions, insertions, and reversals" | Levenshtein, 1966 | Soviet Physics Doklady 10(8) | Edit distance |
| `graphlib`, `bisect` docs | Python docs | docs.python.org/3/library/graphlib.html | `TopologicalSorter`, `bisect_left` |

---

**Next:** [Chapter 17 — Greedy Algorithms](./17_greedy_algorithms.md) — when one locally best choice at each step is provably enough.
