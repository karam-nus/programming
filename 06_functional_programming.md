---
title: "Chapter 6 — Functional Programming"
---

[← Back to Table of Contents](./README.md)

# Chapter 6 — Functional Programming

> *"Python is not a functional language. It is a language in which you can write functions that behave."*

## Overview

Functional programming is a discipline more than a feature set: functions are values, functions don't change the world, and programs are built by composing small functions. Python supports the first fully, the second by convention only, and the third with a modest standard library. This chapter covers what transfers well — first-class and higher-order functions, `functools`, structural pattern matching, immutability, pure cores with effectful shells — and what doesn't: unbounded recursion and the absence of tail-call optimisation. It closes with the place functional style matters most in ML today: JAX's requirement that transformed functions be pure. It assumes closures from [Chapter 3](./03_scope_closures_and_binding.md).

<div class="diagram">
<div class="diagram-title">What Python gives you, and what it doesn't</div>
<div class="compare">
  <div class="compare-side left">
    <div class="compare-title">Supported well</div>
    <ul>
      <li>First-class functions, closures, lambdas</li>
      <li>Higher-order builtins: <code>map</code>, <code>filter</code>, <code>sorted(key=)</code>, <code>max(key=)</code></li>
      <li><code>functools</code>: <code>partial</code>, <code>reduce</code>, <code>cache</code>, <code>singledispatch</code></li>
      <li>Immutable builtins: <code>tuple</code>, <code>frozenset</code>, <code>str</code>, frozen dataclasses, <code>frozendict</code> (3.15+)</li>
    </ul>
  </div>
  <div class="compare-side right">
    <div class="compare-title">Not supported</div>
    <ul>
      <li>Enforced purity or immutability</li>
      <li>Tail-call optimisation; default recursion limit 1000</li>
      <li>Multi-statement lambdas</li>
      <li>Built-in function composition or currying</li>
    </ul>
  </div>
</div>
</div>

---

## Functions Are Values

A function is an object ([Chapter 1](./01_from_source_to_bytecode.md)): it can be stored, passed, returned and given attributes. A **higher-order function** takes or returns functions. Most of Python's higher-order use is through `key=` parameters:

```python
runs = [("resnet", 0.76, 25.6), ("vit", 0.81, 86.0), ("mobilenet", 0.72, 3.5)]
print(max(runs, key=lambda r: r[1])[0])
print([name for name, *_ in sorted(runs, key=lambda r: r[2])])
```

```text
vit
['mobilenet', 'resnet', 'vit']
```

`operator.itemgetter`, `attrgetter` and `methodcaller` build the common key functions in C — faster than the equivalent lambda and self-describing:

```python
import operator
print(sorted(runs, key=operator.itemgetter(1), reverse=True)[0][0])
```

```text
vit
```

### Comprehensions vs `map` and `filter`

| Form | Example | Choose this when |
|------|---------|------------------|
| **Comprehension** | `[f(x) for x in xs if p(x)]` | almost always — readable, supports filtering and nesting |
| **`map(f, xs)`** | `map(str.upper, names)` | `f` already exists as a named function; you want a lazy iterator |
| **`filter(p, xs)`** | `filter(None, xs)` drops falsy | `p` already exists; `filter(None, …)` idiom |
| **Generator expression** | `sum(x * x for x in xs)` | feeding a reduction without materialising a list |

`map(lambda x: x * 2, xs)` is strictly worse than `[x * 2 for x in xs]`: same cost plus a function call per element, and harder to read.

---

## Purity and Referential Transparency

A **pure function** returns a value determined only by its arguments and has no observable side effects (no mutation of arguments or globals, no I/O). An expression is **referentially transparent** if it can be replaced by its value without changing the program. Purity buys three concrete things:

1. **Caching is safe.** `functools.cache` on an impure function is a bug ([Chapter 15](./15_dynamic_programming_foundations.md)).
2. **Testing needs no setup.** Inputs in, outputs out.
3. **Parallelism and reordering are safe.** Nothing shared means nothing to race on ([Chapter 8](./08_concurrency_and_parallelism.md)).

Python cannot enforce purity, so it is a design decision. The practical architecture is **functional core, imperative shell**: pure functions compute decisions from data; a thin outer layer performs I/O, logging and mutation.

```python
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class State:
    step: int
    lr: float
    best: float

def next_state(s: State, val_loss: float, patience_lr=0.5) -> State:      # pure core
    if val_loss < s.best:
        return replace(s, step=s.step + 1, best=val_loss)
    return replace(s, step=s.step + 1, lr=s.lr * patience_lr)

s = State(step=0, lr=0.1, best=float("inf"))
for loss in [0.9, 0.7, 0.8, 0.6]:                                           # imperative shell
    s = next_state(s, loss)
print(s)
```

```text
State(step=4, lr=0.05, best=0.6)
```

`dataclasses.replace` returns a modified copy — the standard way to "update" an immutable record. `frozen=True` makes assignment raise `FrozenInstanceError`; it is shallow: a frozen dataclass holding a list still has a mutable list.

---

## `functools`: The Functional Toolkit

### `partial`: fixing arguments

| | |
|---|---|
| **Mechanism** | `functools.partial(fn, *args, **kwargs)` — a callable object with pre-bound arguments |
| **Defined in** | `Lib/functools.py` / `Modules/_functoolsmodule.c` |
| **Since** | 2.5 |
| **Hooks into** | `__call__` merges stored and new arguments |
| **Typical use** | Callbacks, `DataLoader(collate_fn=partial(pad, value=0))`, `map` over a two-argument function |
| **Cost** | One C-level call layer |
| **Prefer instead** | A lambda when you need to reorder arguments |
| **Failure modes** | Later keyword arguments override bound ones silently |

`partial` objects are picklable when the underlying function is — unlike lambdas and closures — which is why they work as `collate_fn` or `worker_init_fn` with multiprocessing data loaders while lambdas fail under the `spawn` start method.

```python
import functools, pickle

def pad(batch, length, value=0):
    return [row + [value] * (length - len(row)) for row in batch]

collate = functools.partial(pad, length=4)
print(collate([[1], [2, 3]]), len(pickle.dumps(collate)) > 0)
try:
    pickle.dumps(lambda b: pad(b, 4))
except (pickle.PicklingError, AttributeError) as e:
    print(type(e).__name__)
```

```text
[[1, 0, 0, 0], [2, 3, 0, 0]] True
PicklingError
```

### `reduce`: folding

`reduce(f, xs, init)` computes `f(f(f(init, x0), x1), x2)…`. Python moved it out of builtins in 3.0 because explicit loops and specialised reductions (`sum`, `max`, `any`, `math.prod`, `"".join`) are clearer. It remains right for genuinely custom associative combinations — composing functions, merging dicts, intersecting sets:

```python
import functools, operator

def compose(*fns):
    return functools.reduce(lambda f, g: lambda x: g(f(x)), fns, lambda x: x)

normalize = compose(str.strip, str.lower, lambda s: s.replace(" ", "_"))
print(normalize("  Learning Rate "))
print(functools.reduce(operator.and_, [{1, 2, 3}, {2, 3}, {3, 4}]))
```

```text
learning_rate
{3}
```

### `singledispatch`: open functions over types

| | |
|---|---|
| **Mechanism** | `functools.singledispatch` / `singledispatchmethod` — dispatch on the type of the first argument via MRO |
| **Defined in** | PEP 443; `Lib/functools.py` |
| **Since** | 3.4; registration by annotation 3.7; union types 3.11 |
| **Hooks into** | A registry keyed by class, resolved with the C3 MRO (and ABC virtual subclasses) |
| **Typical use** | Serialisers, pretty-printers, `to_device(obj)` for nested structures |
| **Cost** | A dict lookup (cached per type) plus a call |
| **Prefer instead** | A method on the class, when you own the class |
| **Failure modes** | Dispatches on the first argument only; ambiguous registrations under multiple inheritance |

Methods put behaviour *in* the class; `singledispatch` adds behaviour *for* classes you don't own — the functional answer to the visitor pattern:

```python
import functools

@functools.singledispatch
def to_device(obj, device):
    return obj                                   # leaves (ints, strings) pass through

@to_device.register
def _(obj: list, device):
    return [to_device(x, device) for x in obj]

@to_device.register
def _(obj: dict, device):
    return {k: to_device(v, device) for k, v in obj.items()}

class FakeTensor:
    def __init__(self, dev="cpu"): self.dev = dev
    def to(self, dev): return FakeTensor(dev)
    def __repr__(self): return f"T({self.dev})"

@to_device.register
def _(obj: FakeTensor, device):
    return obj.to(device)

print(to_device({"x": [FakeTensor(), FakeTensor()], "step": 3}, "cuda"))
```

```text
{'x': [T(cuda), T(cuda)], 'step': 3}
```

PyTorch's `torch.utils._pytree` solves the same problem — mapping over nested containers — with a registry of flatten/unflatten functions, the same idea as JAX's pytrees below.

---

## Structural Pattern Matching

| | |
|---|---|
| **Mechanism** | `match` / `case`: test a value against patterns that both check shape and bind names |
| **Defined in** | PEP 634 (specification), PEP 635 (motivation), PEP 636 (tutorial) |
| **Since** | 3.10 |
| **Hooks into** | `__match_args__` for positional class patterns; `isinstance` for class patterns; `collections.abc.Sequence`/`Mapping` for structural patterns |
| **Typical use** | Interpreters and tree rewriters, message/event dispatch, parsing JSON-like data, command lines |
| **Cost** | Cases are tested top to bottom like an `if/elif` chain — not a jump table |
| **Prefer instead** | A dict of handlers for flat dispatch on one key; `singledispatch` for open-ended types |
| **Failure modes** | A bare name in a pattern *captures* instead of comparing; `str` is not matched as a sequence; order matters |

Pattern matching comes from the ML family of functional languages and pairs naturally with immutable data: describe the *shape* of the input, and the match both checks it and destructures it. Its home turf is recursive data — expression trees, ASTs ([Chapter 12](./12_introspection_ast_and_codegen.md)), nested configs:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Num:
    value: float

@dataclass(frozen=True)
class BinOp:
    op: str
    left: object
    right: object

def simplify(e):
    match e:
        case BinOp("*", x, Num(1)) | BinOp("*", Num(1), x):      # class patterns via __match_args__
            return simplify(x)
        case BinOp("+", x, Num(0)) | BinOp("+", Num(0), x):
            return simplify(x)
        case BinOp("*", _, Num(0)) | BinOp("*", Num(0), _):
            return Num(0)
        case BinOp(op, l, r):
            new = BinOp(op, simplify(l), simplify(r))
            return new if new == e else simplify(new)   # children changed: try the rules again
        case _:
            return e

expr = BinOp("+", BinOp("*", Num(7), Num(1)), BinOp("*", Num(3), Num(0)))
print(simplify(expr), Num.__match_args__)
```

```text
Num(value=7) ('value',)
```

`@dataclass` generates `__match_args__` from the field order, which is what lets `BinOp("*", x, Num(1))` match positionally. Note the last rule: a rewrite that changes children must re-run the rules on the rebuilt node, or `(7 * 1) + (3 * 0)` stops at `7 + 0` — the fixed-point iteration every optimizing compiler pass needs. The pattern kinds, all in one table:

| Pattern | Example | Matches when | Binds |
|---------|---------|--------------|-------|
| **Literal** | `case 0:` / `case "add":` / `case None:` | `==` (or `is` for `None`, `True`, `False`) | — |
| **Capture** | `case x:` | always | `x` |
| **Wildcard** | `case _:` | always | — |
| **Value** (dotted name) | `case Color.RED:` | `==` the constant | — |
| **Sequence** | `case [first, *rest]:` | a `Sequence` (not `str`/`bytes`) of fitting length | `first`, `rest` |
| **Mapping** | `case {"lr": float(lr), **extra}:` | a `Mapping` containing those keys | `lr`, `extra` |
| **Class** | `case Point(x=0, y=y):` | `isinstance` + attribute patterns | `y` |
| **OR / AS / guard** | <code>case 1 &#124; 2 as n if n &gt; 1:</code> | any alternative, then the guard | `n` |

The classic trap: a bare name is always a capture pattern. `case RED:` does not compare against a variable `RED` — it binds a new `RED` to the subject and matches everything. Constants must be dotted names (`Color.RED`) or literals:

```python
RED = "red"
def describe(c):
    match c:
        case RED:                     # captures! matches anything
            return f"captured {RED!r}"
print(describe("blue"))
```

```text
captured 'blue'
```

---

## Recursion Without Tail Calls

Functional languages express iteration as recursion and rely on **tail-call optimisation** (TCO) to run it in constant stack space. CPython deliberately has no TCO: Guido van Rossum's stated reasons are that it destroys tracebacks and encourages a style that doesn't fit the language. Every recursive call pushes a frame, and the depth is capped:

```python
import sys

def length(xs):
    return 0 if not xs else 1 + length(xs[1:])

old = sys.getrecursionlimit()
sys.setrecursionlimit(1000)
try:
    length(list(range(5000)))
except RecursionError as e:
    print("RecursionError:", e)
finally:
    sys.setrecursionlimit(old)
```

```text
RecursionError: maximum recursion depth exceeded
```

(Message text varies slightly across versions; 3.12+ also tracks C-stack depth separately.) The rules this implies, used throughout Part IV:

- Recursion is fine when depth is **logarithmic** (balanced trees, divide and conquer — [Chapter 14](./14_recursion_and_divide_and_conquer.md)) or small and bounded.
- Recursion over a list or a linked chain of length $n$ is a bug waiting for large $n$. Convert to a loop, or to an explicit stack for tree/graph traversal ([Chapter 18](./18_graph_algorithms.md)).
- Raising `sys.setrecursionlimit` trades a `RecursionError` for a possible segfault when the C stack overflows; it is acceptable for memoized DP of known depth, not as a general fix. Note also `xs[1:]` copies — this `length` is $\Theta(n^2)$ even before the stack problem.

---

## Immutability in a Mutable Language

| Type | Immutable? | Hashable? | Choose this when |
|------|:---:|:---:|------------------|
| **`tuple`** | yes (shallow) | if elements are | fixed-length records, dict keys, cache keys |
| **`frozenset`** | yes | yes | set-valued keys, e.g. DP over subsets ([Chapter 16](./16_dynamic_programming_patterns.md)) |
| **`@dataclass(frozen=True)`** | yes (shallow) | yes (generated) | named immutable records |
| **`typing.NamedTuple`** | yes | yes | tuple compatibility plus names |
| **`types.MappingProxyType`** | read-only *view* | no | exposing a dict without allowing writes |
| **`frozendict`** (3.15+, PEP 814) | yes | if values are | immutable mappings as keys or defaults |

Immutability's practical payoff in Python is less about "safety" and more about **hashability**: only hashable values can be dict keys, set members, or `functools.cache` arguments. Converting a list argument to a tuple at a cache boundary is the everyday functional move.

---

## Functional Style in ML: JAX

JAX makes purity load-bearing. `jax.jit`, `jax.grad` and `jax.vmap` are **function transformations**: they take a Python function, trace it with abstract values to build an intermediate representation, and return a new function. Tracing runs the Python body **once per input shape/dtype**, so:

- Side effects inside a jitted function (printing, appending to a global list, mutating an argument) happen at trace time, once — not on every call.
- Randomness must be explicit: you pass a PRNG key and split it, instead of mutating hidden global state.
- Model state is passed in and returned out (`params, opt_state = update(params, opt_state, batch)`), which is the functional-core pattern above at scale.
- Nested containers of arrays are handled as **pytrees**: `jax.tree_util.tree_map(f, params)` is the `to_device` dispatch above, generalised.

```python
# requires: jax
import jax, jax.numpy as jnp

def loss(w, x, y):
    return jnp.mean((x @ w - y) ** 2)

grad_fn = jax.jit(jax.grad(loss))            # transformations compose
w = jnp.zeros(3)
x, y = jnp.ones((4, 3)), jnp.ones(4)
print(grad_fn(w, x, y))
```

```text
[-2. -2. -2.]
```

PyTorch's `torch.func` (`grad`, `vmap`, `functional_call`) brings the same model to PyTorch, and requires the same discipline. The [JAX Essentials](https://github.com/karam-nus/jax-essentials) volume covers this in depth.

---

## Key Takeaways

- Functions are values; most higher-order Python is `key=` arguments, and `operator.itemgetter`/`attrgetter` are the fast, readable key functions.
- Prefer comprehensions to `map`/`filter` with a lambda; use `map` only with an existing named function.
- Purity is a design choice in Python: keep a pure core that computes decisions and an imperative shell that performs effects.
- `functools.partial` is picklable and therefore safe for multiprocessing callbacks where lambdas fail; `singledispatch` adds per-type behaviour to types you don't own.
- `match`/`case` (3.10+) checks shape and destructures in one step — ideal for trees and messages; bare names in patterns capture, so constants must be dotted names or literals.
- CPython has no tail-call optimisation and a default recursion limit of 1000: recurse only when depth is logarithmic or small, otherwise loop or use an explicit stack.
- In Python, immutability's main payoff is hashability — the precondition for dict keys, sets and caching.
- JAX transformations trace Python functions; impure code inside them misbehaves, which makes the functional discipline mandatory there.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Functional Programming HOWTO | Kuchling, Python docs | docs.python.org/3/howto/functional.html | Iterators, `functools`, `operator` in a functional style |
| PEP 443 — Single-dispatch generic functions | Langa, 2013 | peps.python.org/pep-0443 | `singledispatch` semantics |
| PEP 814 — frozendict | Python, 2025 | peps.python.org/pep-0814 | Built-in immutable mapping (3.15) |
| PEP 634, PEP 635, PEP 636 — Structural Pattern Matching | Bucher, van Rossum et al., 2020 | peps.python.org/pep-0634 | Pattern semantics, `__match_args__`, capture vs value patterns |
| "Tail Recursion Elimination" | van Rossum, 2009 | neopythonic.blogspot.com/2009/04/tail-recursion-elimination.html | Why CPython has no TCO |
| *Boundaries* (functional core, imperative shell) | Bernhardt, 2012 | destroyallsoftware.com/talks/boundaries | The architecture pattern |
| JAX — The Sharp Bits; Pytrees | Google / JAX docs | docs.jax.dev | Purity requirements under tracing; pytrees |
| `Lib/functools.py`, `Modules/_functoolsmodule.c` | CPython | github.com/python/cpython | `partial`, `reduce`, `singledispatch` |

---

**Next:** [Chapter 7 — Types & Static Typing](./07_types_and_static_typing.md) — describing what functions accept and return, precisely enough for a machine to check.
