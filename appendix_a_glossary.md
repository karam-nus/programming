---
title: "Appendix A — Glossary"
---

[← Back to Table of Contents](./README.md)

# Appendix A — Glossary

> *"One term, one definition, used the same way in every chapter."*

## Overview

Every technical term used in the book, alphabetically, with one canonical definition and the chapter where it is developed. Where Python's documentation and common usage disagree, the documentation's meaning is used and the difference is noted.

---

## A–C

| Term | Definition | Chapter |
|------|------------|:---:|
| **ABC (abstract base class)** | A class with `ABCMeta` as metaclass that can declare abstract methods and register virtual subclasses | [11](./11_metaclasses_and_class_creation.md) |
| **Amortized cost** | Total cost of a sequence of operations divided by its length; bounds the average per operation over any sequence, not over random inputs | [13](./13_complexity_and_cost_models.md) |
| **`Any`** | The gradual type compatible with every type in both directions; disables checking for that value | [7](./07_types_and_static_typing.md) |
| **AST** | Abstract syntax tree: the parser's tree representation of source, exposed by the `ast` module | [1](./01_from_source_to_bytecode.md), [12](./12_introspection_ast_and_codegen.md) |
| **Backtracking** | Depth-first search over partial solutions with choose → explore → un-choose, abandoning partials that violate constraints | [14](./14_recursion_and_divide_and_conquer.md) |
| **Base case** | A DP or recursion state whose value is known directly, without the transition | [14](./14_recursion_and_divide_and_conquer.md), [15](./15_dynamic_programming_foundations.md) |
| **Bitmask / bitset** | An integer whose bits represent membership of small integers in a set | [20](./20_bit_manipulation.md) |
| **Bound method** | The object produced by `function.__get__(obj, type)`; calling it prepends `obj` to the arguments | [10](./10_descriptors.md) |
| **Buffer protocol** | The C-level protocol through which an object exposes raw memory with shape and strides; basis of zero-copy interop | [22](./22_beyond_python.md) |
| **Bytecode** | The instruction sequence in a code object, executed by CPython's stack-based evaluation loop | [1](./01_from_source_to_bytecode.md) |
| **C3 linearization** | The algorithm computing a class's MRO; preserves local precedence and monotonicity | [4](./04_the_data_model_and_attribute_lookup.md) |
| **Cell** | A heap box holding one reference, shared by an outer function and the closures that capture its variable | [3](./03_scope_closures_and_binding.md) |
| **Closure** | A function object together with the cells of the free variables it references | [3](./03_scope_closures_and_binding.md) |
| **Code object** | Immutable compiled form of a function body or module: bytecode, constants, names, local-slot layout | [1](./01_from_source_to_bytecode.md) |
| **Concurrency** | Multiple tasks in progress with interleaved execution; contrast *parallelism* | [8](./08_concurrency_and_parallelism.md) |
| **Contravariant** | A generic type whose subtyping runs opposite to its parameter's (callable parameters) | [7](./07_types_and_static_typing.md) |
| **Coroutine** | An object produced by calling an `async def` function; a suspendable frame driven by an event loop via `send` | [5](./05_iterators_generators_and_coroutines.md) |
| **Covariant** | A generic type whose subtyping follows its parameter's (read-only containers, return types) | [7](./07_types_and_static_typing.md) |
| **CPython** | The reference implementation of Python, written in C; "CPython" in this book marks implementation details | [1](./01_from_source_to_bytecode.md) |

## D–G

| Term | Definition | Chapter |
|------|------------|:---:|
| **Data descriptor** | A descriptor whose type defines `__set__` or `__delete__`; takes precedence over the instance dict | [10](./10_descriptors.md) |
| **Decorator** | A callable applied with `@` syntax at definition time: `name = decorator(obj)` | [9](./09_decorators.md) |
| **Descriptor** | A class attribute whose type defines `__get__`, `__set__` or `__delete__` | [10](./10_descriptors.md) |
| **Divide and conquer** | Solving a problem by splitting it into disjoint subproblems, solving them recursively, and combining | [14](./14_recursion_and_divide_and_conquer.md) |
| **DP recipe** | The seven fields specifying every DP in the book: state, transition, base cases, order, answer, complexity, reconstruction | [15](./15_dynamic_programming_foundations.md) |
| **Dynamic programming** | Solving overlapping subproblems once each and combining stored results, given optimal substructure | [15](./15_dynamic_programming_foundations.md) |
| **EAFP / LBYL** | "Easier to ask forgiveness" (try, catch the failure) vs "look before you leap" (test first); EAFP for rare failures, LBYL or defaulting APIs for common ones | [5](./05_iterators_generators_and_coroutines.md) |
| **Event loop** | The scheduler that runs ready coroutine steps and waits on I/O and timers | [5](./05_iterators_generators_and_coroutines.md), [8](./08_concurrency_and_parallelism.md) |
| **Exception table** | Per-code-object table of protected ranges (3.11+), consulted only when an exception is raised; makes entering `try` free | [5](./05_iterators_generators_and_coroutines.md) |
| **Exchange argument** | A proof that some optimal solution contains the greedy choice, by swapping it into an arbitrary optimal solution | [17](./17_greedy_algorithms.md) |
| **Frame** | The runtime record of one function call: instruction pointer, local slots, value stack, link to the caller | [1](./01_from_source_to_bytecode.md) |
| **Free-threaded build** | A CPython build (`python3.13t`/`3.14t`) without the GIL | [8](./08_concurrency_and_parallelism.md) |
| **Free variable** | A name used in a function but bound in an enclosing function scope | [3](./03_scope_closures_and_binding.md) |
| **Function object** | The object created when a `def` executes: a code object bound to globals, defaults and a closure | [1](./01_from_source_to_bytecode.md) |
| **Generator** | An iterator produced by calling a function containing `yield`; wraps a suspended frame | [5](./05_iterators_generators_and_coroutines.md) |
| **GIL** | Global Interpreter Lock: a per-interpreter mutex required to execute Python bytecode in the default build | [8](./08_concurrency_and_parallelism.md) |
| **Gradual typing** | A type system in which typed and untyped code interoperate through `Any` | [7](./07_types_and_static_typing.md) |
| **Greedy algorithm** | An algorithm that commits to a locally best choice at each step and never revisits it | [17](./17_greedy_algorithms.md) |

## I–N

| Term | Definition | Chapter |
|------|------------|:---:|
| **Immortal object** | An object whose refcount is pinned (3.12+), e.g. `None`, small ints | [2](./02_objects_names_and_memory.md) |
| **Invariant (loop)** | A property true before and after every iteration, used to prove correctness | [14](./14_recursion_and_divide_and_conquer.md) |
| **Invariant (typing)** | A generic type with no subtyping relation between different parameterisations (mutable containers) | [7](./07_types_and_static_typing.md) |
| **Iterable / iterator** | An iterable returns a fresh iterator from `__iter__`; an iterator returns itself and yields values via `__next__` | [5](./05_iterators_generators_and_coroutines.md) |
| **LEGB** | Local → Enclosing → Global → Builtins, the resolution order for a name read in a function | [3](./03_scope_closures_and_binding.md) |
| **Memoization** | Caching a function's results keyed by its arguments; top-down DP | [15](./15_dynamic_programming_foundations.md) |
| **Metaclass** | The class of a class; `type` by default; controls class creation and class-level behaviour | [11](./11_metaclasses_and_class_creation.md) |
| **Metaprogramming** | Code that inspects, generates or modifies code | [9](./09_decorators.md) |
| **Metaprogramming ladder** | decorator → descriptor → `__init_subclass__` → metaclass → AST/codegen → import/frame hooks | [9](./09_decorators.md) |
| **Monotonic stack / deque** | A stack or deque maintained in sorted order of values, giving $\Theta(n)$ next-greater and window-max queries | [19](./19_data_structure_internals.md) |
| **MRO** | Method resolution order: the C3-linearized tuple `cls.__mro__` searched by attribute lookup | [4](./04_the_data_model_and_attribute_lookup.md) |
| **Name** | A binding in a namespace that refers to an object; never "a variable that holds a value" | [2](./02_objects_names_and_memory.md) |
| **Non-data descriptor** | A descriptor defining only `__get__`; can be shadowed by the instance dict (functions, `cached_property`) | [10](./10_descriptors.md) |
| **`NotImplemented`** | A singleton returned by a binary-operator method to defer to the other operand's reflected method | [4](./04_the_data_model_and_attribute_lookup.md) |
| **NP-hard** | At least as hard as every problem in NP; no polynomial algorithm is known | [13](./13_complexity_and_cost_models.md) |

## O–S

| Term | Definition | Chapter |
|------|------------|:---:|
| **Optimal substructure** | An optimal solution contains optimal solutions to its subproblems | [15](./15_dynamic_programming_foundations.md) |
| **Overlapping subproblems** | A recursion revisits the same subproblems; the condition under which DP beats divide and conquer | [15](./15_dynamic_programming_foundations.md) |
| **Parallelism** | Simultaneous execution on multiple cores; contrast *concurrency* | [8](./08_concurrency_and_parallelism.md) |
| **`ParamSpec`** | A type variable capturing a whole parameter list, used to type decorators | [7](./07_types_and_static_typing.md), [9](./09_decorators.md) |
| **Pattern matching** | `match`/`case` (3.10+): test a value against structural patterns that also bind names | [6](./06_functional_programming.md) |
| **Prefix sum** | $P[i] = \sum_{k<i} x_k$; turns range sums into a subtraction | [19](./19_data_structure_internals.md) |
| **Protocol** | A `typing.Protocol` class defining a structural interface | [7](./07_types_and_static_typing.md) |
| **Pseudo-polynomial** | Polynomial in a numeric input's value but exponential in its bit length (knapsack, coin change) | [15](./15_dynamic_programming_foundations.md) |
| **Pure function** | A function whose result depends only on its arguments and which has no observable side effects | [6](./06_functional_programming.md) |
| **Reconstruction** | Recovering the optimal choices of a DP from stored decisions or the full table | [15](./15_dynamic_programming_foundations.md) |
| **Reference count** | Per-object count of references; CPython frees an object when it reaches zero | [2](./02_objects_names_and_memory.md) |
| **Specialization** | CPython 3.11+ rewriting instructions into type-specific variants guarded by cheap checks (PEP 659) | [1](./01_from_source_to_bytecode.md) |
| **State (DP)** | The parameters indexing a DP table, capturing everything about the past that affects the future | [15](./15_dynamic_programming_foundations.md) |
| **Symbol table** | The compiler's per-block classification of names as local, global, free or cell | [1](./01_from_source_to_bytecode.md), [3](./03_scope_closures_and_binding.md) |

## T–Z

| Term | Definition | Chapter |
|------|------------|:---:|
| **`__new__` / `__init__`** | Instance creation in two steps: `__new__` allocates and returns the object, `__init__` initialises it | [11](./11_metaclasses_and_class_creation.md) |
| **Tabulation** | Bottom-up DP: filling a table in an order consistent with dependencies | [15](./15_dynamic_programming_foundations.md) |
| **Tail-call optimisation** | Reusing the caller's frame for a call in tail position; not performed by CPython | [6](./06_functional_programming.md) |
| **Timsort / powersort** | CPython's adaptive, stable merge sort; powersort merge policy since 3.11 | [19](./19_data_structure_internals.md) |
| **Topological order** | A vertex ordering of a DAG in which every edge points forward | [18](./18_graph_algorithms.md) |
| **Transition** | The recurrence computing a DP state from smaller states | [15](./15_dynamic_programming_foundations.md) |
| **Two pointers** | Two indices moving through a sequence so each step discards provably useless candidates; Θ(n) instead of Θ(n²) | [19](./19_data_structure_internals.md) |
| **Union-find** | Disjoint-set forest with path compression and union by size, ~constant time per operation | [18](./18_graph_algorithms.md) |
| **Variance** | How subtyping of a generic type relates to subtyping of its parameter: co-, contra- or invariant | [7](./07_types_and_static_typing.md) |
| **Weak reference** | A reference that does not keep its referent alive | [2](./02_objects_names_and_memory.md) |

---

**Next:** [Appendix B — Complexity Reference](./appendix_b_complexity_reference.md) — the cost of every built-in operation.
