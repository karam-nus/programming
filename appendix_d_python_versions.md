---
title: "Appendix D — Python Version Matrix"
---

[← Back to Table of Contents](./README.md)

# Appendix D — Python Version Matrix

> *"Python changes every October. This table is the list of things that changed under this book's feet."*

## Overview

Every version-gated feature mentioned in the book, by the release that introduced it, with the PEP and the chapter that uses it. The book's baseline is **3.12**; features from 3.13 onward are tagged inline in the chapters. Release dates: 3.8 (Oct 2019), 3.9 (Oct 2020), 3.10 (Oct 2021), 3.11 (Oct 2022), 3.12 (Oct 2023), 3.13 (Oct 2024), 3.14 (Oct 2025), 3.15 (Oct 9, 2026).

---

## Timeline

<div class="timeline">
  <div class="timeline-item"><div class="timeline-year">3.9</div><div class="timeline-title">PEG parser</div><div class="timeline-desc">PEP 617; <code>functools.cache</code>; <code>graphlib</code>; dict <code>|</code></div></div>
  <div class="timeline-item"><div class="timeline-year">3.10</div><div class="timeline-title">Pattern matching, ParamSpec</div><div class="timeline-desc">PEP 634, PEP 612; <code>int.bit_count</code>; <code>itertools.pairwise</code>; <code>bisect key=</code></div></div>
  <div class="timeline-item"><div class="timeline-year">3.11</div><div class="timeline-title">Faster CPython</div><div class="timeline-desc">PEP 659 specialization; lazy frames; <code>TaskGroup</code>; exception groups; powersort</div></div>
  <div class="timeline-item"><div class="timeline-year">3.12</div><div class="timeline-title">Type parameter syntax</div><div class="timeline-desc">PEP 695; inlined comprehensions (PEP 709); immortal objects (PEP 683); <code>sys.monitoring</code> (PEP 669)</div></div>
  <div class="timeline-item"><div class="timeline-year">3.13</div><div class="timeline-title">Free threading (experimental), JIT (experimental)</div><div class="timeline-desc">PEP 703, PEP 744; <code>TypeIs</code>; <code>locals()</code> semantics (PEP 667)</div></div>
  <div class="timeline-item"><div class="timeline-year">3.14</div><div class="timeline-title">Deferred annotations, supported free threading</div><div class="timeline-desc">PEP 649/749; PEP 779; incremental GC; <code>forkserver</code> default; subinterpreters in stdlib (PEP 734)</div></div>
  <div class="timeline-item"><div class="timeline-year">3.15</div><div class="timeline-title">Lazy imports</div><div class="timeline-desc">PEP 810; <code>frozendict</code> (PEP 814); <code>profiling</code> package (PEP 799); UTF-8 mode default; free-threaded stable ABI</div></div>
</div>

---

## Feature Matrix

| Feature | Version | PEP | Chapter |
|---------|:---:|:---:|:---:|
| Assignment expressions `:=` | 3.8 | 572 | [3](./03_scope_closures_and_binding.md) |
| `functools.cached_property` | 3.8 | — | [10](./10_descriptors.md) |
| Positional-only parameters `/` | 3.8 | 570 | [11](./11_metaclasses_and_class_creation.md) |
| PEG parser | 3.9 | 617 | [1](./01_from_source_to_bytecode.md) |
| `functools.cache` | 3.9 | — | [15](./15_dynamic_programming_foundations.md) |
| `graphlib.TopologicalSorter` | 3.9 | — | [16](./16_dynamic_programming_patterns.md), [18](./18_graph_algorithms.md) |
| Arbitrary decorator expressions | 3.9 | 614 | [9](./09_decorators.md) |
| `ast.unparse` | 3.9 | — | [12](./12_introspection_ast_and_codegen.md) |
| `math.nextafter`, `math.ulp` | 3.9 | — | [20](./20_bit_manipulation.md) |
| `asyncio.to_thread` | 3.9 | — | [8](./08_concurrency_and_parallelism.md) |
| `ParamSpec`, `Concatenate` | 3.10 | 612 | [7](./07_types_and_static_typing.md), [9](./09_decorators.md) |
| `TypeGuard` | 3.10 | 647 | [7](./07_types_and_static_typing.md) |
| `int.bit_count()` | 3.10 | — | [20](./20_bit_manipulation.md) |
| `itertools.pairwise` | 3.10 | — | [5](./05_iterators_generators_and_coroutines.md) |
| `bisect` `key=` | 3.10 | — | [14](./14_recursion_and_divide_and_conquer.md) |
| `@dataclass(slots=True, kw_only=True)` | 3.10 | — | [2](./02_objects_names_and_memory.md), [11](./11_metaclasses_and_class_creation.md) |
| Specializing adaptive interpreter | 3.11 | 659 | [1](./01_from_source_to_bytecode.md) |
| Lazily materialised frames | 3.11 | — | [1](./01_from_source_to_bytecode.md) |
| `ExceptionGroup`, `except*` | 3.11 | 654 | [8](./08_concurrency_and_parallelism.md) |
| `asyncio.TaskGroup`, `asyncio.timeout` | 3.11 | — | [5](./05_iterators_generators_and_coroutines.md), [8](./08_concurrency_and_parallelism.md) |
| `Self` | 3.11 | 673 | [7](./07_types_and_static_typing.md) |
| Powersort merge policy in `list.sort` | 3.11 | — | [19](./19_data_structure_internals.md) |
| `contextlib.chdir` | 3.11 | — | [5](./05_iterators_generators_and_coroutines.md) |
| `@dataclass_transform` | 3.11 | 681 | [7](./07_types_and_static_typing.md) |
| Type parameter syntax `def f[T]`, `type X = …` | 3.12 | 695 | [7](./07_types_and_static_typing.md), [9](./09_decorators.md) |
| Inlined comprehensions | 3.12 | 709 | [3](./03_scope_closures_and_binding.md) |
| Immortal objects | 3.12 | 683 | [2](./02_objects_names_and_memory.md) |
| `sys.monitoring` | 3.12 | 669 | [12](./12_introspection_ast_and_codegen.md) |
| Per-interpreter GIL (C API) | 3.12 | 684 | [8](./08_concurrency_and_parallelism.md) |
| `itertools.batched` | 3.12 | — | [5](./05_iterators_generators_and_coroutines.md) |
| `typing.override` | 3.12 | 698 | [9](./09_decorators.md) |
| Python-level buffer protocol `__buffer__` | 3.12 | 688 | [22](./22_beyond_python.md) |
| `cached_property` per-instance lock removed | 3.12 | — | [10](./10_descriptors.md) |
| Free-threaded build (experimental) | 3.13 | 703 | [8](./08_concurrency_and_parallelism.md) |
| Experimental JIT (build option) | 3.13 | 744 | [1](./01_from_source_to_bytecode.md) |
| `TypeIs` | 3.13 | 742 | [7](./07_types_and_static_typing.md) |
| Type parameter defaults | 3.13 | 696 | [7](./07_types_and_static_typing.md) |
| `locals()` snapshot / `f_locals` proxy | 3.13 | 667 | [3](./03_scope_closures_and_binding.md) |
| `itertools.batched(strict=True)` | 3.13 | — | [5](./05_iterators_generators_and_coroutines.md) |
| Deferred evaluation of annotations, `annotationlib` | 3.14 | 649, 749 | [7](./07_types_and_static_typing.md) |
| Free threading officially supported | 3.14 | 779 | [8](./08_concurrency_and_parallelism.md) |
| Incremental cycle GC | 3.14 | — | [2](./02_objects_names_and_memory.md) |
| `multiprocessing` default `forkserver` on Linux | 3.14 | — | [8](./08_concurrency_and_parallelism.md) |
| `concurrent.interpreters`, `InterpreterPoolExecutor` | 3.14 | 734 | [8](./08_concurrency_and_parallelism.md) |
| Explicit lazy imports `lazy import` | 3.15 | 810 | [12](./12_introspection_ast_and_codegen.md) |
| `frozendict` | 3.15 | 814 | [6](./06_functional_programming.md) |
| `profiling` package (`tracing`, `sampling`) | 3.15 | 799 | [21](./21_profiling_and_optimization.md) |
| Stable ABI for free-threaded builds | 3.15 | — | [8](./08_concurrency_and_parallelism.md), [22](./22_beyond_python.md) |
| UTF-8 mode on by default | 3.15 | 686 | — |

---

## Behaviour That Changed

| Behaviour | Before | After | Chapter |
|-----------|--------|-------|:---:|
| `dict` iteration order | arbitrary (≤ 3.5) | insertion order (implementation 3.6, guarantee 3.7) | [19](./19_data_structure_internals.md) |
| `StopIteration` escaping a generator | silently ends it | `RuntimeError` (3.7, PEP 479) | [5](./05_iterators_generators_and_coroutines.md) |
| Instance attribute storage | always a materialised dict | inline values, dict created on demand (3.11–3.13) | [2](./02_objects_names_and_memory.md) |
| Annotation evaluation | eager | lazy (3.14) | [7](./07_types_and_static_typing.md) |
| Bytecode | — | changes every release; read with `dis` on the version you run | [1](./01_from_source_to_bytecode.md) |

Exact object sizes (`sys.getsizeof`) are build-specific; [Chapter 2](./02_objects_names_and_memory.md)'s figures were measured on 3.13 (and `int` sizes confirmed identical on 3.11 and 3.12).

---

**Next:** [Appendix E — Bibliography](./appendix_e_bibliography.md) — what to read next, and in what order.
