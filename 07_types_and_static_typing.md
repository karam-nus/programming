---
title: "Chapter 7 — Types & Static Typing"
---

[← Back to Table of Contents](./README.md)

# Chapter 7 — Types & Static Typing

> *"The interpreter ignores your annotations. The type checker ignores your runtime. Good typed Python satisfies both."*

## Overview

Python is dynamically typed — every object carries its type at runtime ([Chapter 2](./02_objects_names_and_memory.md)) — and, since PEP 484, *optionally* statically typed: annotations describe intended types, and an external checker (mypy, pyright, pyrefly, ty) verifies them without running the code. This chapter covers what the checker actually reasons about: gradual typing and `Any`, nominal vs structural subtyping, generics in PEP 695 syntax, **variance derived from substitution**, `ParamSpec` for decorators, narrowing with `TypeIs`, and how annotations are evaluated at runtime (and lazily in 3.14). Checker outputs below are from **mypy 2.3**; runtime outputs from CPython 3.13.

<div class="diagram">
<div class="diagram-title">Two worlds that share one syntax</div>
<div class="compare">
  <div class="compare-side left">
    <div class="compare-title">Static (type checker)</div>
    <ul>
      <li>Reads annotations, never runs code</li>
      <li>Reasons about all possible values</li>
      <li>Catches whole classes of bugs before tests</li>
      <li>Is fooled by <code>Any</code>, <code>cast</code>, dynamic attributes</li>
    </ul>
  </div>
  <div class="compare-side right">
    <div class="compare-title">Runtime (interpreter)</div>
    <ul>
      <li>Stores annotations in <code>__annotations__</code>; does not enforce them</li>
      <li>Checks types only when an operation fails</li>
      <li>Libraries may read annotations: <code>dataclasses</code>, pydantic, FastAPI</li>
      <li>Since 3.14 evaluates annotations lazily (PEP 649/749)</li>
    </ul>
  </div>
</div>
</div>

---

## Gradual Typing and `Any`

| | |
|---|---|
| **Mechanism** | Gradual typing: annotated and unannotated code coexist; `Any` is compatible with everything in both directions |
| **Defined in** | PEP 483 (theory), PEP 484 (`typing`); the typing specification at typing.python.org |
| **Since** | 3.5 |
| **Hooks into** | Nothing at runtime |
| **Typical use** | Incrementally typing a codebase; library stubs (`types-*`, bundled `py.typed`) |
| **Cost** | Zero runtime cost; CI time for the checker |
| **Prefer instead** | `object` when you mean "any value, but I won't use it as anything specific" |
| **Failure modes** | `Any` spreads silently: one `Any` return makes every downstream expression unchecked |

`Any` and `object` are opposites in practice. `object` is the top type — everything is assignable *to* it, but you can do almost nothing *with* it without narrowing. `Any` turns the checker off for that value: everything is assignable to it and it is assignable to everything. Unannotated functions are implicitly `Any`-typed, which is why adding a checker to an untyped codebase reports few errors at first. `--strict` (mypy) or `strict` mode (pyright) is what makes the checker complain about implicit `Any`.

---

## Nominal and Structural Subtyping

**Nominal**: `B` is a subtype of `A` because `class B(A)` says so. **Structural**: `B` is a subtype of `A` because it has the right methods. Python's runtime duck typing is structural; PEP 544 `Protocol` makes it checkable:

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class SupportsForward(Protocol):
    def forward(self, x: float) -> float: ...

class Scale:                       # never mentions SupportsForward
    def forward(self, x: float) -> float:
        return 2 * x

def run(layer: SupportsForward, x: float) -> float:
    return layer.forward(x)

print(run(Scale(), 3.0), isinstance(Scale(), SupportsForward))
```

```text
6.0 True
```

| | Nominal (`ABC`) | Structural (`Protocol`) |
|---|---|---|
| Subtype by | explicit inheritance or `register` | having matching members |
| Third-party types | must be registered | conform automatically |
| Runtime `isinstance` | yes | only with `@runtime_checkable`, and it checks member *presence*, not signatures |
| **Choose this when** | you want shared implementation or an explicit contract | you describe what a function *needs* from its argument |

The standard library's `collections.abc` types (`Iterable`, `Sized`, `Mapping`) are ABCs that also behave structurally for `isinstance` via `__subclasshook__` ([Chapter 11](./11_metaclasses_and_class_creation.md)), and type checkers treat them structurally.

---

## Generics and PEP 695 Syntax

A generic function or class is parameterised by type variables. PEP 695 (3.12+) declares them inline; the older `TypeVar` spelling is equivalent:

```python
from collections.abc import Sequence

def first[T](xs: Sequence[T]) -> T:         # 3.12+ syntax
    return xs[0]

class Registry[K, V]:
    def __init__(self) -> None:
        self._items: dict[K, V] = {}
    def add(self, key: K, value: V) -> None:
        self._items[key] = value
    def get(self, key: K) -> V:
        return self._items[key]

type Batch[T] = list[tuple[T, int]]          # generic type alias, 3.12+

r: Registry[str, float] = Registry()
r.add("lr", 0.1)
print(first([3, 4]), r.get("lr"), Batch.__value__)
```

```text
3 0.1 list[tuple[T, int]]
```

The checker infers `first([1, 2])` as `int`. Bounds and constraints: `def f[T: Number](x: T)` (upper bound) or `def f[T: (int, str)](x: T)` (one of a fixed set). PEP 696 (3.13+) adds defaults: `class Box[T = int]`.

---

## Variance, Derived

Generics raise a question: if `Dog` is a subtype of `Animal`, is `list[Dog]` a subtype of `list[Animal]`? The answer follows from the **Liskov substitution principle**: `X` is a subtype of `Y` only if every operation valid on a `Y` is valid on an `X`.

- **Reading** from a container of `Dog` yields `Dog`s, which are valid `Animal`s. So a read-only container is safe to use covariantly: `Sequence[Dog]` ≤ `Sequence[Animal]`. **Covariant.**
- **Writing** an `Animal` into a container is valid for `list[Animal]`. Doing that to a `list[Dog]` would put a non-dog where dogs are promised. So a mutable container can't be covariant. And reading a `list[Animal]` as if it were `list[Dog]` is unsafe too. **Invariant.**
- A **function parameter** of type `Animal` accepts every `Dog`; so a function `Animal → None` can be used wherever a `Dog → None` is required — the subtyping direction flips: `Callable[[Animal], None]` ≤ `Callable[[Dog], None]`. **Contravariant** in parameters, covariant in return type.

```python
from collections.abc import Sequence, Callable

class Animal: ...
class Dog(Animal): ...

def add_animal(xs: list[Animal]) -> None:
    xs.append(Animal())

dogs: list[Dog] = [Dog()]
add_animal(dogs)                             # unsound: dogs now contains a non-Dog

def count(xs: Sequence[Animal]) -> int:
    return len(xs)
count(dogs)                                  # sound: read-only

def handle_animal(a: Animal) -> None: ...
def handle_dog(d: Dog) -> None: ...
def on_dog(f: Callable[[Dog], None]) -> None: ...
def on_animal(f: Callable[[Animal], None]) -> None: ...
on_dog(handle_animal)                        # sound: contravariant parameter
on_animal(handle_dog)                        # unsound

print(type(dogs[-1]).__name__)               # runtime happily ran the unsound call
```

```text
Animal
```

<div class="svgfig">
<svg viewBox="0 0 820 300" width="820" role="img" aria-label="Variance: which way subtyping arrows point for list, Sequence and Callable">
<text x="20" y="26" class="th">Dog ≤ Animal. Which way does the arrow go for the container?</text>
<g>
<rect x="20" y="50" width="240" height="210" rx="10" class="box"/><text x="140" y="76" text-anchor="middle" class="th" style="fill:#fca5a5">list[T] — invariant</text>
<rect x="60" y="100" width="160" height="34" rx="6" class="box"/><text x="140" y="117" text-anchor="middle" class="tm">list[Dog]</text>
<rect x="60" y="190" width="160" height="34" rx="6" class="box"/><text x="140" y="207" text-anchor="middle" class="tm">list[Animal]</text>
<text x="140" y="162" text-anchor="middle" class="t" style="fill:#fca5a5">✕  no arrow either way</text>
<text x="140" y="246" text-anchor="middle" class="ts">read AND write → no substitution</text>
</g>
<g>
<rect x="290" y="50" width="240" height="210" rx="10" class="box"/><text x="410" y="76" text-anchor="middle" class="th" style="fill:#4ade80">Sequence[T] — covariant</text>
<rect x="330" y="100" width="160" height="34" rx="6" class="box"/><text x="410" y="117" text-anchor="middle" class="tm">Sequence[Dog]</text>
<rect x="330" y="190" width="160" height="34" rx="6" class="box"/><text x="410" y="207" text-anchor="middle" class="tm">Sequence[Animal]</text>
<path d="M410 136 L410 184" class="ln hot" stroke-width="3"/><path d="M402 176 L410 188 L418 176" class="ln hot" stroke-width="3"/>
<text x="420" y="162" class="ts">same direction</text>
<text x="410" y="246" text-anchor="middle" class="ts">read only → Dogs are Animals</text>
</g>
<g>
<rect x="560" y="50" width="240" height="210" rx="10" class="box"/><text x="680" y="76" text-anchor="middle" class="th" style="fill:#c4b5fd">Callable[[T], None] — contra</text>
<rect x="590" y="100" width="180" height="34" rx="6" class="box"/><text x="680" y="117" text-anchor="middle" class="tm">Callable[[Animal], …]</text>
<rect x="590" y="190" width="180" height="34" rx="6" class="box"/><text x="680" y="207" text-anchor="middle" class="tm">Callable[[Dog], …]</text>
<path d="M680 136 L680 184" class="ln" stroke-width="3" style="stroke:#c4b5fd"/><path d="M672 176 L680 188 L688 176" class="ln" stroke-width="3" style="stroke:#c4b5fd"/>
<text x="690" y="162" class="ts">arrow flips</text>
<text x="680" y="246" text-anchor="middle" class="ts">a handler of any Animal handles Dogs</text>
</g>
<text x="410" y="290" text-anchor="middle" class="ts">An arrow A → B means "an A may be used wherever a B is expected".</text>
</svg>
</div>

mypy reports exactly the two unsound lines:

```text
error: Argument 1 to "add_animal" has incompatible type "list[Dog]"; expected "list[Animal]"  [arg-type]
note: "list" is invariant -- see https://mypy.readthedocs.io/en/stable/common_issues.html#variance
note: Consider using "Sequence" instead, which is covariant
error: Argument 1 to "on_animal" has incompatible type "Callable[[Dog], None]"; expected "Callable[[Animal], None]"  [arg-type]
```

| Type | Variance in its parameter | Why | Choose this when |
|------|:---:|-----|------------------|
| **`list[T]`, `dict[K, V]`, `set[T]`** | invariant | readable and writable | you mutate the argument |
| **`Sequence[T]`, `Mapping[K, V]` (in `V`), `frozenset[T]`, `tuple[T, ...]`** | covariant | read-only | you only read — the right type for most parameters |
| **`Callable[[P], R]`** | contravariant in `P`, covariant in `R` | consumes `P`, produces `R` | callbacks |
| **`Mapping[K, V]` in `K`** | invariant | keys are used for lookup | — |

The practical rule: **annotate parameters with the most abstract read-only type you need** (`Sequence`, `Mapping`, `Iterable`) and return the concrete type. With PEP 695, a class's variance is **inferred** from how the type variable is used in its methods; with old-style `TypeVar` you declare `covariant=True`.

---

## Typing Callables and Decorators

`ParamSpec` (PEP 612) captures an entire parameter list so a decorator's wrapper can have the same signature as the wrapped function ([Chapter 9](./09_decorators.md)). `Concatenate` describes adding or removing leading parameters:

```python
import functools
from collections.abc import Callable
from typing import Concatenate

class Session:
    def query(self, q: str) -> str:
        return f"rows for {q!r}"

def with_session[**P, R](fn: Callable[Concatenate[Session, P], R]) -> Callable[P, R]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return fn(Session(), *args, **kwargs)
    return wrapper

@with_session
def load_user(session: Session, user_id: int) -> str:
    return session.query(f"user {user_id}")

print(load_user(42))       # the checker sees load_user as (user_id: int) -> str
```

```text
rows for 'user 42'
```

`typing.overload` declares multiple signatures for one implementation when the return type depends on argument types or literal values (`open(..., "rb")` → `BufferedReader`, `"r"` → `TextIOWrapper`). `Self` (PEP 673) types fluent methods so subclasses get the subclass back.

---

## Narrowing: `isinstance`, `TypeGuard`, `TypeIs`

Checkers narrow a variable's type through control flow: after `if isinstance(x, str):`, `x` is `str` in that branch; after `if x is None: return`, `x` is non-optional below. User-defined narrowing functions extend this:

| Annotation | Narrows in the true branch | Narrows in the false branch | Requirement | Choose this when |
|------------|:---:|:---:|-------------|------------------|
| **`TypeGuard[T]`** (3.10, PEP 647) | to `T` | no | none | the narrowed type isn't a subtype of the input |
| **`TypeIs[T]`** (3.13, PEP 742) | to `input ∧ T` | to `input ∧ ¬T` | `T` must be a subtype of the input type | ordinary `isinstance`-like checks — the better default |

The subtype requirement interacts with variance in a way that trips people up: a `TypeIs[list[str]]` function cannot take `list[object]` because `list` is invariant, so `list[str]` is not a subtype of `list[object]`. mypy:

```text
error: Narrowed type "list[str]" is not a subtype of input type "list[object]"  [narrowed-type-not-subtype]
```

Take `Sequence[object]` (covariant) instead, or use `TypeGuard`.

---

## Annotations at Runtime

Annotations are not erased. They live in `__annotations__` and are read by `dataclasses` (field discovery), pydantic and FastAPI (validation and request parsing), `functools.singledispatch` (registration, [Chapter 6](./06_functional_programming.md)), and `typing.get_type_hints` (resolving string forward references).

```python
from dataclasses import dataclass, fields
import typing

@dataclass
class Cfg:
    lr: float
    layers: list[int]

print([(f.name, f.type) for f in fields(Cfg)])
print(typing.get_type_hints(Cfg))
```

```text
[('lr', <class 'float'>), ('layers', list[int])]
{'lr': <class 'float'>, 'layers': list[int]}
```

**When annotations are evaluated** has changed three times:

| Version | Behaviour | Consequence |
|---------|-----------|-------------|
| **3.0 – 3.13 (default)** | evaluated eagerly at `def`/class time | forward references need quotes; annotation expressions cost import time |
| **`from __future__ import annotations`** (PEP 563, 3.7+) | stored as strings | cheap, but libraries must `eval` strings, which breaks with local names |
| **3.14+** (PEP 649/749) | evaluated **lazily** on first access, via a generated `__annotate__` function | forward references just work; `annotationlib.get_annotations(obj, format=Format.FORWARDREF)` handles undefined names |

On 3.14, PEP 563's future import still works but is no longer necessary for forward references; library code that reads annotations should use `annotationlib` rather than touching `__annotations__` directly.

---

## What the Checker Cannot See

- **Dynamic attributes** — `setattr`, `__getattr__` proxies, attributes added by metaclasses. Plugins (the mypy Django/pydantic plugins) or `__getattr__` return annotations patch this.
- **Metaprogramming that generates members** — `@dataclass` is special-cased by checkers; your own class decorator isn't. PEP 681's `@dataclass_transform` tells checkers "this decorator/base class behaves like dataclass" — attrs, pydantic and SQLAlchemy use it.
- **Shapes and dtypes** — `torch.Tensor` is one type regardless of shape. `jaxtyping`-style annotations (`Float[Tensor, "batch dim"]`) are checked at runtime by a decorator, not by the static checker.
- **`cast` and `# type: ignore`** — assertions to the checker, never verified. Keep them rare and commented.

---

## Key Takeaways

- Annotations are metadata for an external checker; the interpreter stores them and doesn't enforce them, but libraries read them at runtime.
- `Any` disables checking and spreads; `object` is the safe "anything" type that forces narrowing.
- `Protocol` gives structural subtyping — describe what a function needs, not what class an argument inherits from.
- Variance follows from substitution: read-only types are covariant, mutable ones invariant, callable parameters contravariant. Annotate parameters with `Sequence`/`Mapping`/`Iterable`.
- `ParamSpec` and `Concatenate` type decorators without erasing signatures; PEP 695 syntax (3.12+) declares type parameters inline and infers variance.
- `TypeIs` (3.13+) narrows in both branches but requires a subtype of the input type; `TypeGuard` is the escape hatch.
- Since 3.14 annotations are evaluated lazily (PEP 649/749); use `annotationlib` to read them.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 483 — The Theory of Type Hints | van Rossum, Levkivskyi, 2014 | peps.python.org/pep-0483 | Gradual typing, `Any`, variance |
| PEP 484 — Type Hints | van Rossum, Lehtosalo, Langa, 2014 | peps.python.org/pep-0484 | The `typing` foundation |
| PEP 544 — Protocols | Levkivskyi, Lehtosalo, Langa, 2017 | peps.python.org/pep-0544 | Structural subtyping |
| PEP 612, 647, 673, 681, 695, 696, 742 | various, 2019–2024 | peps.python.org | `ParamSpec`, `TypeGuard`, `Self`, `dataclass_transform`, type-parameter syntax, defaults, `TypeIs` |
| PEP 563, PEP 649, PEP 749 | Langa 2017; Hastings 2021; Zijlstra 2024 | peps.python.org | Postponed and deferred annotation evaluation |
| Typing specification | Python typing council | typing.python.org/en/latest/spec | Normative rules shared by checkers |
| *A Behavioral Notion of Subtyping* | Liskov, Wing, 1994 | doi.org/10.1145/197320.197383 | The substitution principle behind variance |
| mypy 2.3 | mypy project | mypy.readthedocs.io | Checker outputs shown in this chapter |

---

**Next:** [Chapter 8 — Concurrency & Parallelism](./08_concurrency_and_parallelism.md) — doing more than one thing at a time, and what the GIL actually prevents.
