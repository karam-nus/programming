---
title: "Chapter 23 — The Problem-Solving Playbook"
---

[← Back to Table of Contents](./README.md)

# Chapter 23 — The Problem-Solving Playbook

> *"You rarely meet a new problem. You meet an old problem wearing new variable names."*

## Overview

This chapter contains no new techniques. It is an index into the book organised by the question you actually have when facing an unfamiliar problem: *given these constraints, what complexity must the solution have; given these words in the statement, which technique is likely; how do I get from a correct brute force to a fast solution without guessing; and when is metaprogramming the right answer to a design problem?* One problem is worked end to end through the brute → memoize → tabulate → optimize pipeline to show the method as a sequence of checked steps.

<div class="diagram">
<div class="diagram-title">The method</div>
<div class="flow">
  <div class="flow-node accent wide">1. Read constraints → required complexity (table below)</div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple wide">2. Read the statement → candidate techniques (signal table)</div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange wide">3. Write the obviously-correct brute force; keep it forever as the oracle</div>
  <div class="flow-arrow"></div>
  <div class="flow-node green wide">4. Improve one step at a time; after each step, assert equality with the oracle on random inputs</div>
  <div class="flow-arrow"></div>
  <div class="flow-node cyan wide">5. Profile only once the complexity is right (Ch 21)</div>
</div>
</div>

---

## Step 1: Constraints Determine the Complexity

With roughly $10^7$ simple Python operations per second (an order-of-magnitude estimate consistent with [Chapter 13](./13_complexity_and_cost_models.md)'s ~10–30 ns per operation; 10–100× more with NumPy or compiled code), input size bounds the admissible complexity:

| Input size $n$ | Admissible complexity | Likely techniques | Chapter |
|---------------:|:---:|-------------------|:---:|
| $\le 10$ | $\Theta(n!)$ | permutations, exhaustive search | [14](./14_recursion_and_divide_and_conquer.md) |
| $\le 20$ | $\Theta(2^n \cdot n)$ | subset enumeration, bitmask DP | [16](./16_dynamic_programming_patterns.md), [20](./20_bit_manipulation.md) |
| $\le 40$ | $\Theta(2^{n/2})$ | meet in the middle | — |
| $\le 200$ | $\Theta(n^3)$ | interval DP, Floyd–Warshall | [16](./16_dynamic_programming_patterns.md) |
| $\le 3000$ | $\Theta(n^2)$ | two-sequence DP, all pairs | [15](./15_dynamic_programming_foundations.md) |
| $\le 10^6$ | $\Theta(n \log n)$ | sorting, heaps, binary search, divide and conquer | [14](./14_recursion_and_divide_and_conquer.md), [19](./19_data_structure_internals.md) |
| $\le 10^7$ | $\Theta(n)$ | one pass, prefix sums, two pointers, monotonic stack, hashing | [19](./19_data_structure_internals.md) |
| $> 10^8$ or a numeric value like $10^{18}$ | $\Theta(\log n)$ or $\Theta(\text{digits})$ | binary search on the answer, digit DP, math | [14](./14_recursion_and_divide_and_conquer.md), [16](./16_dynamic_programming_patterns.md) |

Read the table in both directions. If the constraint is $n \le 20$, the intended solution is almost certainly exponential in $n$ — searching for a polynomial algorithm is wasted effort. If $n \le 10^6$ and you have an $\Theta(n^2)$ idea, it is not the answer.

---

## Step 2: Signal Phrases

| The statement says… | Think | Chapter |
|---------------------|-------|:---:|
| "minimum / maximum number of ways / cost", "count the ways" | DP — design the state | [15](./15_dynamic_programming_foundations.md) |
| "subsequence", "two strings", "align", "edit" | two-prefix DP | [15](./15_dynamic_programming_foundations.md), [16](./16_dynamic_programming_patterns.md) |
| "split a range / merge adjacent / parenthesise" | interval DP | [16](./16_dynamic_programming_patterns.md) |
| "visit every element exactly once", $n \le 20$ | bitmask DP | [16](./16_dynamic_programming_patterns.md) |
| "schedule", "non-overlapping", "earliest / latest" | sort + greedy, check with exchange argument | [17](./17_greedy_algorithms.md) |
| "smallest $X$ such that…" with monotone feasibility | binary search on the answer | [14](./14_recursion_and_divide_and_conquer.md) |
| "dependencies", "prerequisites", "order of evaluation" | topological sort | [18](./18_graph_algorithms.md) |
| "shortest path", "fewest steps" | BFS (unweighted) / Dijkstra / Bellman–Ford | [18](./18_graph_algorithms.md) |
| "connected", "groups", "merge sets" | union-find or BFS components | [18](./18_graph_algorithms.md) |
| "top $k$", "running median", "merge sorted streams" | heaps | [19](./19_data_structure_internals.md) |
| "subarray sum", "range query" | prefix sums (+ hash map) | [19](./19_data_structure_internals.md) |
| "next greater / previous smaller", "sliding window max" | monotonic stack / deque | [19](./19_data_structure_internals.md) |
| "prefix of a string", "autocomplete" | trie | [19](./19_data_structure_internals.md) |
| "count numbers $\le N$ with property" | digit DP | [16](./16_dynamic_programming_patterns.md) |
| "pairs that cancel", "subsets as flags" | XOR / bitmasks | [20](./20_bit_manipulation.md) |

---

## Steps 3–4: The Pipeline, Worked

**Problem (word break).** Given a string $s$ and a vocabulary of words, return the minimum number of vocabulary words whose concatenation is $s$ (or `None` if impossible). Constraints: $|s| \le 5000$, vocabulary ≤ 10 000 words of length ≤ 20. This is the shape of greedy-vs-optimal subword tokenization.

**Constraints → complexity.** $|s| = 5000$ allows $\Theta(n^2)$ but the vocabulary bound $L = 20$ suggests $\Theta(nL)$. **Signals:** "minimum number", "split the string" → prefix DP.

### 3. The oracle: brute force

Try every first word, recurse on the rest. Exponential, obviously correct, kept as the oracle.

```python
def min_words_brute(s, vocab):
    if not s:
        return 0
    best = None
    for k in range(1, len(s) + 1):
        if s[:k] in vocab:
            rest = min_words_brute(s[k:], vocab)
            if rest is not None and (best is None or rest + 1 < best):
                best = rest + 1
    return best

vocab = {"un", "believ", "able", "unbeliev", "believable", "a", "ble"}
print(min_words_brute("unbelievable", vocab))
```

```text
2
```

### 4a. Memoize

The recursion depends only on the suffix, i.e. on its start index $i$. Replace the string argument with an index (hashable, cheap) and add a cache — a mechanical transformation ([Chapter 15](./15_dynamic_programming_foundations.md)):

```python
import functools

def min_words_memo(s, vocab):
    @functools.cache                            # fresh cache per call: defined inside
    def go(i):
        if i == len(s):
            return 0
        best = None
        for j in range(i + 1, len(s) + 1):
            if s[i:j] in vocab:
                rest = go(j)
                if rest is not None and (best is None or rest + 1 < best):
                    best = rest + 1
        return best
    return go(0)
```

### 4b. Tabulate, with the recipe stated

| Field | Word break (minimum words) |
|-------|------------------|
| **State** | $\mathrm{dp}[i]$ = minimum words to build the prefix $s[:i]$ ($\infty$ if impossible) |
| **Transition** | $\mathrm{dp}[j] = \min_{i < j,\ s[i:j] \in V} \mathrm{dp}[i] + 1$ |
| **Base cases** | $\mathrm{dp}[0] = 0$ — the empty prefix needs no words |
| **Order** | $j$ increasing |
| **Answer** | $\mathrm{dp}[n]$ |
| **Complexity** | $n$ states × $n$ split points × $\Theta(n)$ slicing/hashing = $\Theta(n^3)$ as written; $\Theta(nL^2)$ once $j - i \le L$ |
| **Reconstruction** | store the argmin $i$ for each $j$ |

### 4c. Optimize: bound the word length

Only split points with $j - i \le L$ (the longest vocabulary word) can match. That one observation, read off the constraints, removes a factor of $n / L = 250$:

```python
import math

def min_words_table(s, vocab):
    L = max(map(len, vocab), default=0)
    dp = [0] + [math.inf] * len(s)
    back = [None] * (len(s) + 1)
    for j in range(1, len(s) + 1):
        for i in range(max(0, j - L), j):
            if dp[i] + 1 < dp[j] and s[i:j] in vocab:
                dp[j], back[j] = dp[i] + 1, i
    if dp[-1] == math.inf:
        return None, []
    words, j = [], len(s)
    while j:
        words.append(s[back[j]:j]); j = back[j]
    return dp[-1], words[::-1]

print(min_words_table("unbelievable", vocab))
```

```text
(2, ['un', 'believable'])
```

### Verify every version against the oracle

```python
import random

random.seed(42)
alphabet = "ab"
for _ in range(500):
    v = {"".join(random.choices(alphabet, k=random.randint(1, 3))) for _ in range(random.randint(1, 5))}
    s = "".join(random.choices(alphabet, k=random.randint(0, 10)))
    expected = min_words_brute(s, v)
    assert min_words_memo(s, v) == expected
    assert min_words_table(s, v)[0] == expected
print("memo and table agree with brute force on 500 random cases")
```

```text
memo and table agree with brute force on 500 random cases
```

The final version is $\Theta(nL^2)$ (the $L$ split points each slice and hash a string of up to $L$ characters) — about $5000 \times 400 = 2 \times 10^6$ character operations, well within budget. A trie over the vocabulary ([Chapter 19](./19_data_structure_internals.md)) brings it to $\Theta(nL)$ by extending matches character by character instead of re-slicing. Note what the pipeline did *not* require: insight in advance. Each step was a local, checkable transformation.

---

## Debugging a DP That Gives Wrong Answers

Work down this list; each item has caused a real bug in this book's drafts or in code it cites.

1. **Restate the state sentence.** Does the code's loop order match it? (Coins outside vs amounts outside — [Chapter 15](./15_dynamic_programming_foundations.md).)
2. **Check base cases by hand** on the smallest inputs: empty, one element.
3. **Print the table** for a tiny input and verify three cells manually.
4. **Check iteration direction** in space-optimized versions (downward = each item once).
5. **Check aliasing**: `[[0] * m] * n` creates one shared row ([Chapter 2](./02_objects_names_and_memory.md)).
6. **Check the answer cell**: is the answer `dp[n]`, or a max over all `dp[i]` (as in LIS)?
7. **Compare with brute force on random small inputs** — and shrink the first failing input by hand until it is minimal.

---

## When to Reach for Metaprogramming

The same discipline applies to design problems. Climb the ladder from [Chapter 9](./09_decorators.md) only as far as needed:

| Symptom in the code | Lowest sufficient tool | Chapter |
|---------------------|------------------------|:---:|
| The same wrapper logic (timing, retry, logging) around many functions | decorator | [9](./09_decorators.md) |
| A registry that must list every implementation | decorator or `__init_subclass__` | [9](./09_decorators.md), [11](./11_metaclasses_and_class_creation.md) |
| The same validation on many attributes | descriptor with `__set_name__` | [10](./10_descriptors.md) |
| Every subclass must satisfy a contract, checked at definition time | `__init_subclass__` | [11](./11_metaclasses_and_class_creation.md) |
| Boilerplate methods generated from field declarations | `@dataclass`, or code generation with `exec` | [11](./11_metaclasses_and_class_creation.md) |
| Operators on the class object itself; intercepting the class body | metaclass | [11](./11_metaclasses_and_class_creation.md) |
| Changing the meaning of syntax (assertion rewriting, DSL) | AST transform in an import hook | [12](./12_introspection_ast_and_codegen.md) |
| Calling functions with what they ask for | `inspect.signature` + cache | [12](./12_introspection_ast_and_codegen.md) |

And the opposite test: if a newcomer can't find where a behaviour comes from by reading the class and its imports, the mechanism is too high on the ladder. Explicit code that repeats itself a little is often the better trade.

---

## Key Takeaways

- Constraints imply the admissible complexity; read them first and discard ideas that can't fit.
- Statement phrases map to a small set of techniques; the signal table indexes them.
- Keep the brute force as a permanent oracle and verify every optimization step against it on random inputs.
- Brute force → memoize (index the state) → tabulate (state the recipe) → optimize (use a bound from the constraints) is a sequence of checkable steps that needs no prior insight.
- Debug DPs by restating the state sentence, then checking base cases, loop direction, aliasing and the answer cell — in that order.
- Use the lowest rung of the metaprogramming ladder that removes the repetition; if the behaviour becomes hard to locate, step back down.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *The Algorithm Design Manual*, 3rd ed. | Skiena, 2020 | Springer | Problem-to-technique cataloguing ("war stories", the catalogue) |
| *How to Solve It* | Pólya, 1945 | Princeton University Press | The heuristic method: understand, plan, carry out, look back |
| *Competitive Programmer's Handbook* | Laaksonen, 2018 | cses.fi/book | Constraint-size heuristics |
| Chapters 9–20 of this book | — | [Table of Contents](./README.md) | Every technique indexed here |

---

**Next:** [Appendix A — Glossary](./appendix_a_glossary.md) — every term used in the book, defined once.
