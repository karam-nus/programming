---
title: "Chapter 0 — The Whole Subject on One Page"
---

[← Back to Table of Contents](./README.md)

# Chapter 0 — The Whole Subject on One Page

> *"Programs are data. Solutions are data. Most of this book is about taking those two sentences literally."*

## Overview

"Programming" is too broad to be a subject, so this book cuts it into three layers that a working ML engineer actually needs to reason about: **how code executes** (what the interpreter does with your source), **how code is expressed and generated** (paradigms and metaprogramming), and **how problems are solved efficiently** (algorithmic techniques and performance). Two ideas connect the layers, and they explain why metaprogramming and dynamic programming — the two topics this repository was started for — sit at its centre.

<div class="diagram">
<div class="diagram-title">Three layers, two bridges</div>
<div class="layer-stack">
  <div class="layer accent">Layer 3 — Solving problems efficiently: complexity, recursion, DP, greedy, graphs, data structures, bits, profiling (Ch 13–23)</div>
  <div class="layer purple">Layer 2 — Expressing and generating code: functional, typed, concurrent; decorators → descriptors → metaclasses → AST → import hooks (Ch 6–12)</div>
  <div class="layer green">Layer 1 — How code executes: bytecode, frames, objects, scope, attribute lookup, generators (Ch 1–5)</div>
</div>
</div>

---

## Layer 1: How Code Executes

Python source is compiled to bytecode for a stack machine; a function call creates a frame; names are bindings in namespaces that refer to heap objects; `obj.attr` runs one fixed lookup algorithm over the type's MRO and the instance dict. Almost every surprising behaviour — a closure seeing a later value, `UnboundLocalError`, `super()` reaching a sibling class, a generator that does nothing until iterated — is decided at an identifiable stage of this pipeline, usually at compile time.

| Question | Answered in |
|----------|-------------|
| What does the interpreter actually run? What changed in 3.11–3.15? | [Ch 1 — Source to Bytecode](./01_from_source_to_bytecode.md) |
| Why did my "copy" change the original? When is memory freed? | [Ch 2 — Objects, Names & Memory](./02_objects_names_and_memory.md) |
| Why do all my lambdas return the last value? | [Ch 3 — Scope, Closures & Binding](./03_scope_closures_and_binding.md) |
| What exactly happens on `obj.attr`, `a + b`, `super()`? | [Ch 4 — Data Model & Attribute Lookup](./04_the_data_model_and_attribute_lookup.md) |
| How do `for`, generators, `with` and `await` work? | [Ch 5 — Iterators, Generators & Coroutines](./05_iterators_generators_and_coroutines.md) |

---

## Layer 2: Expressing and Generating Code

**Paradigms** are disciplines for structuring code: functional (pure functions, composition — mandatory under JAX), typed (machine-checked contracts, with variance following from substitution), concurrent (threads, processes, asyncio, and now free threading). **Metaprogramming** is code that operates on code, available at six rungs of increasing power:

<div class="diagram">
<div class="diagram-title">The metaprogramming ladder (Chapter 9)</div>
<div class="flow-h">
  <div class="flow-node green narrow">decorator</div>
  <div class="flow-arrow"></div>
  <div class="flow-node teal narrow">descriptor</div>
  <div class="flow-arrow"></div>
  <div class="flow-node cyan narrow">__init_subclass__</div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple narrow">metaclass</div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange narrow">AST / codegen</div>
  <div class="flow-arrow"></div>
  <div class="flow-node red narrow">import / frame hooks</div>
</div>
<div class="flow-label">Use the lowest rung that removes the repetition</div>
</div>

Each rung hooks a specific point of Layer 1: decorators rebind names after `def`; descriptors hook steps 2 and 4 of attribute lookup; `__init_subclass__` and metaclasses hook class creation; AST transforms hook the compiler; import and frame-evaluation hooks hook module loading and execution — which is how `torch.compile` reads your bytecode.

| Question | Answered in |
|----------|-------------|
| How do I write and type a decorator properly? | [Ch 9 — Decorators](./09_decorators.md) |
| How does `property` work? How do I validate fields across many classes? | [Ch 10 — Descriptors](./10_descriptors.md) |
| When do I actually need a metaclass? How does `@dataclass` write code? | [Ch 11 — Metaclasses & Class Creation](./11_metaclasses_and_class_creation.md) |
| How do pytest, Dynamo and coverage tools see my code? | [Ch 12 — Introspection, AST & Codegen](./12_introspection_ast_and_codegen.md) |
| Functional style, typing, concurrency | [Ch 6](./06_functional_programming.md), [Ch 7](./07_types_and_static_typing.md), [Ch 8](./08_concurrency_and_parallelism.md) |

---

## Layer 3: Solving Problems Efficiently

Two cost models — asymptotic growth and CPython's measured constant factors — decide whether a solution is fast enough. Problems are then attacked with a small set of techniques: divide and conquer when subproblems are disjoint, **dynamic programming** when they overlap, greedy when one choice is provably enough, graph algorithms when the structure is dependencies or connections, and the right data structure to make each step cheap.

Every DP in the book is specified by the same seven fields — *state, transition, base cases, order, answer, complexity, reconstruction* — and developed by the same pipeline:

<div class="diagram">
<div class="diagram-title">Brute force → memoize → tabulate → optimize (Chapters 15, 23)</div>
<div class="flow-h">
  <div class="flow-node red">brute force<small>the oracle</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange">@cache<small>index the state</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple">table<small>state the recipe</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node accent">rolling rows / bounds<small>use the constraints</small></div>
</div>
</div>

| Question | Answered in |
|----------|-------------|
| Is this fast enough? Why is my loop slow? | [Ch 13 — Complexity & Cost Models](./13_complexity_and_cost_models.md) |
| Recursion, recurrences, binary search | [Ch 14 — Recursion & Divide and Conquer](./14_recursion_and_divide_and_conquer.md) |
| How do I design a DP? | [Ch 15 — DP Foundations](./15_dynamic_programming_foundations.md), [Ch 16 — DP Patterns](./16_dynamic_programming_patterns.md) |
| Is the greedy choice safe? | [Ch 17 — Greedy Algorithms](./17_greedy_algorithms.md) |
| Dependencies, paths, connectivity | [Ch 18 — Graph Algorithms](./18_graph_algorithms.md) |
| What do `dict`, `list`, `deque`, `heapq` cost, and why? | [Ch 19 — Data Structure Internals](./19_data_structure_internals.md) |
| Masks, bitsets, float layouts | [Ch 20 — Bit Manipulation](./20_bit_manipulation.md) |
| Profiling and leaving Python | [Ch 21](./21_profiling_and_optimization.md), [Ch 22](./22_beyond_python.md) |
| I have a new problem — where do I start? | [Ch 23 — The Playbook](./23_problem_solving_playbook.md) |

---

## The Two Bridges

**Programs are data.** A function is an object with a code object inside; a class is the result of calling its metaclass on a namespace dict; source is a tree you can rewrite. Metaprogramming is the practice of treating these as values to inspect, wrap, generate and transform. It turns repetition in *code* into a single definition.

**Solutions are data.** A computed result can be stored and looked up instead of recomputed. `functools.cache` is literally a decorator — a metaprogramming tool — that turns a function's results into a dict; a DP table is the same idea made explicit and ordered. Dynamic programming turns repetition in *computation* into a single evaluation per subproblem.

The same move — notice the repetition, compute once, look up thereafter — reappears outside the book's chapters in the KV cache of transformer inference, the compiled-graph cache of `torch.compile` keyed by guards, and every build system.

---

## Five Chapters to Read First

1. [Chapter 1 — Source to Bytecode](./01_from_source_to_bytecode.md): the vocabulary of code objects, functions and frames.
2. [Chapter 4 — Attribute Lookup](./04_the_data_model_and_attribute_lookup.md): the algorithm every attribute-level technique hooks.
3. [Chapter 9 — Decorators](./09_decorators.md): the metaprogramming ladder.
4. [Chapter 13 — Cost Models](./13_complexity_and_cost_models.md): what "fast" means in CPython, measured.
5. [Chapter 15 — DP Foundations](./15_dynamic_programming_foundations.md): the seven-field recipe.

---

## How This Book Is Verified

- Every Python snippet is executed by [`tools/check_snippets.py`](https://github.com/karam-nus/programming/blob/main/tools/check_snippets.py), and every printed output in a chapter is compared against the real run (`--strict`).
- Every timing comes from a checked-in script in [`bench/`](./bench/RESULTS.md) with the interpreter, CPU and repeat count stated.
- Typing claims in [Chapter 7](./07_types_and_static_typing.md) were checked with mypy; version-specific claims cite the PEP or What's New page.
- The authoring standard is [PROMPT.md](./PROMPT.md).

## Key Takeaways

- The book has three layers — execution, expression, technique — and each chapter's question belongs to exactly one.
- Metaprogramming hooks specific points of the execution pipeline; climb its ladder only as far as necessary.
- Dynamic programming is the computational twin of metaprogramming: both replace repetition with a stored, reusable result.
- Every DP is specified by seven fields and developed by a brute → memo → table → optimize pipeline checked against an oracle.
- Every snippet and number in the book is executed or measured, not asserted.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Structure and Interpretation of Computer Programs*, 2nd ed. | Abelson, Sussman, 1996 | MIT Press | "Programs as data", the layered view of computation |
| *Introduction to Algorithms*, 4th ed. | Cormen et al., 2022 | MIT Press | The algorithmic layer's canonical reference |
| *Fluent Python*, 2nd ed. | Ramalho, 2022 | O'Reilly | The Python data model as the organising idea for Layers 1–2 |
| [Appendix E — Bibliography](./appendix_e_bibliography.md) | this book | — | Full reading list and order |

---

**Next:** [Chapter 1 — From Source to Bytecode](./01_from_source_to_bytecode.md) — the pipeline every later chapter refers back to.
