---
title: "Appendix E — Bibliography"
---

[← Back to Table of Contents](./README.md)

# Appendix E — Bibliography

> *"Read the source. Then read the PEP that explains why the source looks like that."*

## Overview

The full reading list behind the book, grouped by theme, with a one-line note on why each source matters. Chapter-level `## References` tables cite the specific sections used; this appendix is for reading further. A suggested order for someone starting out closes the page.

---

## Books

| Book | Author(s), Year | Why read it | Chapters |
|------|-----------------|-------------|:---:|
| *Fluent Python*, 2nd ed. | Ramalho, 2022 | The best book-length treatment of the Python data model, descriptors, metaclasses and generators | 2–5, 9–11 |
| *Structure and Interpretation of Computer Programs*, 2nd ed. | Abelson, Sussman, 1996 | "Programs as data", closures, interpreters — the conceptual root of Parts I and III | 0, 3, 12 |
| *CPython Internals* | Shaw, 2021 | A guided tour of the interpreter's source tree (pre-3.11 eval loop; still the best map) | 1, 2 |
| *Introduction to Algorithms*, 4th ed. | Cormen, Leiserson, Rivest, Stein, 2022 | The reference for Part IV: asymptotics, amortization, DP, greedy, graphs | 13–19 |
| *Algorithm Design* | Kleinberg, Tardos, 2005 | The best exposition of *how to design* greedy algorithms and DP states | 15–17 |
| *The Algorithm Design Manual*, 3rd ed. | Skiena, 2020 | Problem catalogue and practical heuristics for choosing techniques | 23 |
| *Hacker's Delight*, 2nd ed. | Warren, 2012 | Bit-level identities with proofs | 20 |
| *Competitive Programmer's Handbook* | Laaksonen, 2018 (free, cses.fi/book) | Compact coverage of bitmask DP, digit DP and constraint heuristics | 16, 20, 23 |
| *High Performance Python*, 2nd ed. | Gorelick, Ozsvald, 2020 | Profiling, NumPy, Cython, Numba in practice | 21, 22 |
| *How to Solve It* | Pólya, 1945 | The problem-solving method behind the playbook | 23 |

## Python Enhancement Proposals

| PEP | Topic | Chapters |
|-----|-------|:---:|
| 227, 3104 | Nested scopes; `nonlocal` | 3 |
| 234, 255, 342, 380, 479, 492 | Iterators; generators; `send`; `yield from`; `StopIteration`; `async`/`await` | 5 |
| 252, 487 | Descriptors; `__init_subclass__` and `__set_name__` | 4, 10, 11 |
| 318, 3129, 614 | Decorators | 9 |
| 3115, 3119, 557 | Metaclass `__prepare__`; ABCs; dataclasses | 11 |
| 302, 451, 810 | Import hooks; module specs; lazy imports | 12 |
| 523, 669 | Frame evaluation API; `sys.monitoring` | 12 |
| 483, 484, 544, 612, 647, 673, 681, 695, 696, 742, 563, 649, 749 | Typing | 7 |
| 617, 659, 744 | PEG parser; specialization; JIT | 1 |
| 393, 683, 205 | Flexible strings; immortal objects; weak references | 2 |
| 703, 779, 684, 734, 3148, 654 | Free threading; subinterpreters; futures; exception groups | 8 |
| 443, 814 | `singledispatch`; `frozendict` | 6 |
| 454, 799 | `tracemalloc`; the `profiling` package | 21 |
| 3118, 688, 384 | Buffer protocol; stable ABI | 22 |
| 456 | String hashing (SipHash) | 19 |

## CPython Source Files

| File | What it teaches |
|------|-----------------|
| `Python/bytecodes.c`, `Python/ceval.c` | The instruction set and evaluation loop |
| `Python/specialize.c` | Which instructions specialize and on what |
| `Python/symtable.c`, `Python/compile.c` | Scope analysis; closure and `__class__` cells |
| `Objects/object.c`, `Objects/typeobject.c` | Generic attribute lookup, `_PyType_Lookup`, class creation, MRO |
| `Objects/descrobject.c`, `Objects/funcobject.c` | Member descriptors, method binding |
| `Objects/dictobject.c` (header comment) | Compact dict design, probing, resizing |
| `Objects/listobject.c`, `Objects/listsort.txt` | Over-allocation; Timsort and powersort |
| `Objects/setobject.c`, `Modules/_collectionsmodule.c` | Set probing; deque blocks |
| `Objects/genobject.c`, `Lib/asyncio/` | Generators, coroutines, the event loop |
| `Lib/functools.py`, `Lib/dataclasses.py`, `Lib/_py_abc.py`, `Lib/enum.py` | Readable reference implementations of decorators, codegen, ABCs, `__prepare__` |
| `Lib/importlib/_bootstrap.py` | The import algorithm |
| `Python/gc.c`, `InternalDocs/garbage_collector.md` | Cycle collection |

## Papers

| Paper | Authors, Year | Chapter |
|-------|---------------|:---:|
| "A Monotonic Superclass Linearization for Dylan" | Barrett et al., 1996 | 4 |
| "A Behavioral Notion of Subtyping" | Liskov, Wing, 1994 | 7 |
| *Dynamic Programming* (book) | Bellman, 1957 | 15 |
| "A Dynamic Programming Approach to Sequencing Problems" | Held, Karp, 1962 | 16 |
| "Error bounds for convolutional codes…" (Viterbi algorithm) | Viterbi, 1967 | 16 |
| "A Tutorial on Hidden Markov Models" | Rabiner, 1989 | 16 |
| "Connectionist Temporal Classification" | Graves et al., 2006 | 16 |
| "Dynamic programming algorithm optimization for spoken word recognition" | Sakoe, Chiba, 1978 | 16 |
| "A linear space algorithm for computing maximal common subsequences" | Hirschberg, 1975 | 15 |
| "A Method for the Construction of Minimum-Redundancy Codes" | Huffman, 1952 | 17 |
| "Optimal bounds for the change-making problem" | Kozen, Zaks, 1994 | 17 |
| "Neural Machine Translation of Rare Words with Subword Units" (BPE) | Sennrich et al., 2016 | 17 |
| "A note on two problems in connexion with graphs" | Dijkstra, 1959 | 18 |
| "Efficiency of a Good But Not Linear Set Union Algorithm" | Tarjan, 1975 | 18 |
| "Automatic differentiation in machine learning: a survey" | Baydin et al., 2018 | 18 |
| "Nearly-Optimal Mergesorts" (powersort) | Munro, Wild, 2018 | 19 |
| "What Every Computer Scientist Should Know About Floating-Point Arithmetic" | Goldberg, 1991 | 20 |
| "Scalene: Scripting-Language Aware Profiling" | Berger et al., 2023 | 21 |

## Official Documentation

- **Python Language Reference** — especially §3 (Data model), §4 (Execution model), §5 (Import system).
- **Descriptor HowTo Guide** (Hettinger) and **The Python 2.3 Method Resolution Order** (Simionato) — both in the Python HOWTOs.
- **What's New** pages for 3.11 through 3.15 — the authoritative record of version changes ([Appendix D](./appendix_d_python_versions.md)).
- **Typing specification** at typing.python.org — the normative rules shared by type checkers.
- **TorchDynamo deep dive** (PyTorch docs) — PEP 523 in production.

---

## Suggested Reading Order

1. *Fluent Python*, Parts I–III (data model, functions as objects, classes) alongside Chapters 1–5 of this book.
2. The **Descriptor HowTo Guide**, then Chapters 9–11. Then read `Lib/dataclasses.py` end to end — it is the best real-world metaprogramming code in the stdlib.
3. Kleinberg–Tardos ch. 4 and 6 (greedy and DP) alongside Chapters 15–17; do the Appendix C problems without looking at the code.
4. CLRS ch. 3, 16 (amortized analysis) and 20–23 (graphs) for depth on Chapters 13 and 18.
5. The `Objects/dictobject.c` header comment and `Objects/listsort.txt` — short, and they explain Chapter 19 better than any book.
6. *High Performance Python* with Chapters 21–22, then the [Vectorization](https://github.com/karam-nus/vectorization) volume.

---

**Back to:** [Table of Contents](./README.md)
