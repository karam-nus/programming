---
title: "Programming — The Complete Guide"
permalink: /
---

# ⌨️ Programming — The Complete Guide

> **From Bytecode to Dynamic Programming**: how a Python program actually executes, how to write code that writes code, and the algorithmic techniques that keep recurring in real work. Every mechanism demonstrated, every algorithm derived, every timing measured.

## Who This Is For

You write Python every day — training loops, data pipelines, services. You can make things work. This book is about knowing **why** they work: why a closure in a loop captures the wrong value, why `super()` doesn't call the parent, why a `property` is twice as slow as an attribute, how `@dataclass` writes your `__init__` for you, when a metaclass is the right tool (rarely), and how to turn an exponential brute force into a polynomial dynamic program without guessing.

The two load-bearing parts are **metaprogramming** (Part III) and **dynamic programming** (Part IV). Everything in Part I exists to make Part III precise; everything in Part IV is presented through one recipe so that new problems look like old ones.

Sibling volumes own adjacent ground — this book links to them rather than repeating them: [Software Engineering for ML](https://karam-nus.github.io/software/) (tooling, testing, process), [Design Patterns](https://karam-nus.github.io/design-patterns/) (architecture), [ML Coding 101](https://karam-nus.github.io/code/) (library APIs), and [Vectorization](https://github.com/karam-nus/vectorization) (array programming).

The authoring standard is checked in at [PROMPT.md](./PROMPT.md). Every timing comes from a script in [`bench/`](./bench/RESULTS.md); every snippet is executed by [`tools/check_snippets.py`](https://github.com/karam-nus/programming/blob/main/tools/check_snippets.py).

## 📋 Table of Contents

| # | Chapter | What You'll Learn |
|---|---------|-------------------|
| **Orientation** | | |
| 0 | [The Whole Subject on One Page](./00_grand_overview.md) | Three layers — execution, expression, technique — and the two ideas that tie them together: *programs are data* and *solutions are data* |
| **Part I — How Python Executes** | | |
| 1 | [From Source to Bytecode](./01_from_source_to_bytecode.md) | Tokens → PEG parser → AST → symtable → bytecode → the evaluation loop; code objects, frames, specialization, the JIT |
| 2 | [Objects, Names & Memory](./02_objects_names_and_memory.md) | Names are bindings, aliasing, `is` vs `==`, refcounting, the cycle collector, `weakref`, why `getsizeof` lies |
| 3 | [Scope, Closures & Binding](./03_scope_closures_and_binding.md) | LEGB decided at compile time, `UnboundLocalError`, cells, `nonlocal`, late binding, comprehension and class scopes |
| 4 | [The Data Model & Attribute Lookup](./04_the_data_model_and_attribute_lookup.md) | The exact `obj.attr` algorithm, special-method lookup, **C3 linearization derived**, `super()`, `NotImplemented`, hashing |
| 5 | [Iterators, Generators & Coroutines](./05_iterators_generators_and_coroutines.md) | `for` desugared, generators as suspended frames, `send`/`yield from`, pipelines, coroutines as the same machine |
| **Part II — Paradigms** | | |
| 6 | [Functional Programming](./06_functional_programming.md) | Purity, higher-order functions, `functools`, immutability, recursion without TCO, composition as in JAX |
| 7 | [Types & Static Typing](./07_types_and_static_typing.md) | Gradual, nominal vs structural, PEP 695 generics, **variance derived**, `ParamSpec`, `TypeIs`, deferred annotations |
| 8 | [Concurrency & Parallelism](./08_concurrency_and_parallelism.md) | What the GIL protects, threads vs processes measured, the asyncio event loop, races, free-threaded Python |
| **Part III — Metaprogramming** | | |
| 9 | [Decorators](./09_decorators.md) | **The metaprogramming ladder**, `f = d(f)`, `wraps`, factories, class decorators, typing decorators with `ParamSpec` |
| 10 | [Descriptors](./10_descriptors.md) | How methods bind, `property`/`classmethod`/`staticmethod` rebuilt in Python, `__set_name__`, a validated-field framework |
| 11 | [Metaclasses & Class Creation](./11_metaclasses_and_class_creation.md) | The `class` statement desugared, `__prepare__`, `__init_subclass__` first, metaclass conflicts, how `dataclass` writes code |
| 12 | [Introspection, AST & Code Generation](./12_introspection_ast_and_codegen.md) | `inspect`, AST transforms, `exec` scoping, import hooks, monkeypatching, PEP 523 and `torch.compile`, lazy imports |
| **Part IV — Algorithmic Techniques** | | |
| 13 | [Complexity & Cost Models](./13_complexity_and_cost_models.md) | Asymptotics done right, amortized analysis derived from `list_resize`, the measured Python cost model |
| 14 | [Recursion & Divide and Conquer](./14_recursion_and_divide_and_conquer.md) | Recursion as induction, the master theorem, merge sort, quickselect, binary search invariants, explicit stacks |
| 15 | [Dynamic Programming I — Foundations](./15_dynamic_programming_foundations.md) | **The seven-field DP recipe**, memoization vs tabulation, coin change, LCS, knapsack, space optimization, reconstruction |
| 16 | [Dynamic Programming II — Patterns](./16_dynamic_programming_patterns.md) | Interval, LIS in $O(n\log n)$, edit distance, tree, bitmask, DAG and digit DP — and Viterbi, CTC, DTW in ML |
| 17 | [Greedy Algorithms](./17_greedy_algorithms.md) | The greedy-choice property, exchange arguments, interval scheduling, Huffman, and hunting counterexamples |
| 18 | [Graph Algorithms](./18_graph_algorithms.md) | BFS/DFS, topological sort (autograd's backbone), Dijkstra with `heapq`, Bellman–Ford, union-find, MST |
| 19 | [Data Structure Internals](./19_data_structure_internals.md) | CPython's `list`, `dict`, `set`, `deque`, `heapq` from the source; monotonic stacks, prefix sums, tries |
| 20 | [Bit Manipulation](./20_bit_manipulation.md) | Two's complement with infinite-precision ints, lowbit tricks, subset enumeration, bitsets, IEEE-754 via `struct` |
| **Part V — Performance** | | |
| 21 | [Profiling & Optimization](./21_profiling_and_optimization.md) | `timeit`, `cProfile`, sampling profilers, `tracemalloc`, and the optimization ladder with measured effects |
| 22 | [Beyond Python](./22_beyond_python.md) | `ctypes`, Cython, Numba, mypyc, pybind11/nanobind, PyO3 — what crosses the boundary cheaply and what doesn't |
| **Part VI — Synthesis** | | |
| 23 | [The Problem-Solving Playbook](./23_problem_solving_playbook.md) | From constraints to technique, brute → memo → table → optimize, and when to reach for metaprogramming |
| **Appendices** | | |
| A | [Glossary](./appendix_a_glossary.md) | Every term, one canonical definition |
| B | [Complexity Reference](./appendix_b_complexity_reference.md) | The cost of every built-in operation used in the book |
| C | [DP Catalogue](./appendix_c_dp_catalogue.md) | Every DP problem — state, transition, complexity, chapter |
| D | [Python Version Matrix](./appendix_d_python_versions.md) | Every version-gated feature, 3.8 → 3.15 |
| E | [Bibliography](./appendix_e_bibliography.md) | Books, PEPs, source files, and a reading order |

## 🗺️ Learning Path

<div class="diagram">
<div class="diagram-title">Recommended Reading Order</div>
<div class="flow">
  <div class="flow-node accent wide">⚙️ Ch 1–5: How Python Executes <small>bytecode, objects, scope, attribute lookup, generators</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node purple wide">🪄 Ch 9–12: Metaprogramming <small>decorators, descriptors, metaclasses, AST, imports</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node cyan wide">🧭 Ch 6–8: Paradigms <small>functional, typed, concurrent</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node orange wide">🧮 Ch 13–20: Algorithmic Techniques <small>complexity, recursion, DP, greedy, graphs, bits</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node green wide">🚀 Ch 21–22: Performance <small>profile, then leave Python only if you must</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node pink wide">🧩 Ch 23: The Playbook</div>
</div>
</div>

## ⚡ Quick Start Paths

### Path A: "I want to understand metaprogramming properly"

1. [01 — Source to Bytecode](./01_from_source_to_bytecode.md) — code objects and frames
2. [03 — Scope & Closures](./03_scope_closures_and_binding.md) — what a decorator closes over
3. [04 — Attribute Lookup](./04_the_data_model_and_attribute_lookup.md) — the algorithm everything hooks into
4. [09 — Decorators](./09_decorators.md) → [10 — Descriptors](./10_descriptors.md) → [11 — Metaclasses](./11_metaclasses_and_class_creation.md)
5. [12 — Introspection, AST & Codegen](./12_introspection_ast_and_codegen.md)

### Path B: "I want to stop being scared of dynamic programming"

1. [13 — Complexity & Cost Models](./13_complexity_and_cost_models.md) — what "fast enough" means
2. [14 — Recursion](./14_recursion_and_divide_and_conquer.md) — DP is recursion plus a table
3. [15 — DP Foundations](./15_dynamic_programming_foundations.md) — the recipe
4. [16 — DP Patterns](./16_dynamic_programming_patterns.md) — the catalogue
5. [17 — Greedy](./17_greedy_algorithms.md) — when you don't need DP
6. [Appendix C](./appendix_c_dp_catalogue.md) — practice index

### Path C: "My Python is slow"

1. [21 — Profiling](./21_profiling_and_optimization.md) — measure first
2. [13 — Cost Models](./13_complexity_and_cost_models.md) → [19 — Data Structure Internals](./19_data_structure_internals.md)
3. [08 — Concurrency](./08_concurrency_and_parallelism.md) — threads, processes, or neither
4. [22 — Beyond Python](./22_beyond_python.md)

## Conventions

- **Python baseline 3.12.** Newer features are tagged `(3.13+)`, `(3.14+)`, `(3.15+)`. Outputs were produced with CPython 3.13 unless stated.
- **"Python"** means language-guaranteed behaviour; **"CPython"** means an implementation detail.
- Long implementations are folded — click the ▸ to expand.
- Every DP uses the same seven fields: *state, transition, base cases, order, answer, complexity, reconstruction*.

## Running the Code

```bash
python3 tools/check_snippets.py          # execute every snippet in every chapter
```

```bash
cd bench && python3 cost_model.py        # reproduce a measurement table
```

To preview the site locally:

```bash
bundle install && bundle exec jekyll serve
```

---

*Part of the [karam-nus knowledge base](https://karam-nus.github.io/). MIT licensed.*
