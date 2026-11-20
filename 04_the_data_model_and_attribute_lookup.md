---
title: "Chapter 4 — The Data Model & Attribute Lookup"
---

[← Back to Table of Contents](./README.md)

# Chapter 4 — The Data Model & Attribute Lookup

> *"Every dot is a function call, and the function is always the same one."*

## Overview

`obj.attr` looks like field access. It is a call to `type(obj).__getattribute__(obj, "attr")`, which runs a fixed algorithm over the class's MRO, the instance dict, and the descriptor protocol. Every metaprogramming technique in Part III — properties, bound methods, `cached_property`, ORMs, `__getattr__` proxies — is a hook into one step of that algorithm. This chapter states the algorithm exactly, derives the MRO, explains `super()`, and covers operator dispatch and the hash/equality contract. It assumes names and objects from [Chapter 2](./02_objects_names_and_memory.md).

<div class="diagram">
<div class="diagram-title">object.__getattribute__(obj, name) — the generic algorithm</div>
<div class="flow">
  <div class="flow-node accent wide">1. Look up name on type(obj).__mro__ → candidate <small>class attribute or descriptor, may be None</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple wide">2. candidate is a DATA descriptor (has __set__ or __delete__)? → return candidate.__get__(obj, type(obj))</div>
  <div class="flow-arrow"></div>
  <div class="flow-node green wide">3. name in obj.__dict__? → return it</div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange wide">4. candidate has __get__ (non-data descriptor)? → return candidate.__get__(obj, type(obj)) · else candidate itself</div>
  <div class="flow-arrow"></div>
  <div class="flow-node red wide">5. Nothing found → AttributeError → type(obj).__getattr__(obj, name) if defined</div>
</div>
</div>

---

## The Attribute Lookup Algorithm

| | |
|---|---|
| **Mechanism** | `object.__getattribute__` (generic attribute lookup) |
| **Defined in** | Language Reference §3.3.2; `Objects/object.c` `_PyObject_GenericGetAttrWithDict`; `Objects/typeobject.c` `_PyType_Lookup` |
| **Since** | 2.2 (new-style classes, PEP 252) |
| **Hooks into** | Every `LOAD_ATTR` instruction |
| **Typical use** | Implicit; overridden only by proxies and debuggers |
| **Cost** | ~11 ns for a plain attribute on CPython 3.13 (specialized, `bench/attribute_access.py`) |
| **Prefer instead** | n/a — override `__getattr__`, not `__getattribute__`, when you need a fallback |
| **Failure modes** | Overriding `__getattribute__` and accessing `self.x` inside it → infinite recursion |

The order in the diagram is the most important table in Part III. A pure-Python reference implementation, faithful to the C version:

<details class="code-fold">
<summary>Reference implementation — generic attribute lookup in pure Python (33 lines)</summary>

```python
_MISSING = object()

def type_lookup(tp, name):
    """_PyType_Lookup: search the MRO dicts, return the raw class attribute."""
    for klass in tp.__mro__:
        if name in vars(klass):
            return vars(klass)[name]
    return _MISSING

def generic_getattr(obj, name):
    tp = type(obj)
    candidate = type_lookup(tp, name)
    if candidate is not _MISSING:
        ctype = type(candidate)
        is_data = hasattr(ctype, "__set__") or hasattr(ctype, "__delete__")
        if is_data and hasattr(ctype, "__get__"):
            return ctype.__get__(candidate, obj, tp)          # step 2
    inst_dict = getattr(obj, "__dict__", None)
    if inst_dict is not None and name in inst_dict:
        return inst_dict[name]                                 # step 3
    if candidate is not _MISSING:
        ctype = type(candidate)
        if hasattr(ctype, "__get__"):
            return ctype.__get__(candidate, obj, tp)          # step 4
        return candidate
    raise AttributeError(name)                                 # step 5 (then __getattr__)

class Demo:
    kind = "class attr"
    @property
    def p(self): return "property"
    def m(self): return "method"

d = Demo(); d.__dict__["p"] = "shadow?"; d.__dict__["kind"] = "instance attr"
for n in ("p", "kind", "m"):
    print(n, "->", generic_getattr(d, n) if n != "m" else generic_getattr(d, n)(), "|", getattr(d, n) if n != "m" else d.m())
```

```text
p -> property | property
kind -> instance attr | instance attr
m -> method | method
```

</details>

Three behaviours fall out, and all are relied on by real libraries:

1. **A data descriptor beats the instance dict.** `property` is a data descriptor (it defines `__set__`, even if only to raise), so `d.__dict__["p"]` can never shadow it. This is how ORMs and pydantic fields intercept every read and write.
2. **The instance dict beats a non-data descriptor.** Functions are non-data descriptors (only `__get__`), so you can shadow a method per instance. `functools.cached_property` exploits this: on first access its `__get__` computes the value and stores it in `obj.__dict__`, after which step 3 finds it and the descriptor is never called again ([Chapter 10](./10_descriptors.md)).
3. **Descriptor methods are looked up on the descriptor's type**, never on the descriptor instance. Same rule as special methods, below.

Measured costs per read (`bench/attribute_access.py`, CPython 3.13.18, Xeon @ 2.1 GHz, median of 7):

| Attribute kind | ns/op | vs plain | Choose this when |
|----------------|:---:|:---:|------------------|
| **Instance `__dict__`** | 10.8 | 1.0× | default |
| **`__slots__`** | 10.8 | 1.0× | millions of instances; memory matters |
| **`cached_property` (after first)** | 17.0 | 1.6× | expensive, immutable derived value |
| **`property`** | 21.4 | 2.0× | computed or validated attribute |
| **`__getattr__` fallback** | 40.5 | 3.8× | proxies, lazy modules, dynamic APIs |
| **Pure-Python data descriptor** | 62.9 | 5.8× | reusable per-field logic across classes |

`cached_property` is slightly slower than a plain attribute even after caching, because the type-level lookup (step 1) still finds the descriptor and the specializer can't use its fastest path.

### `__getattr__` vs `__getattribute__`

`__getattr__` is called **only after** the generic algorithm fails (step 5). `__getattribute__` *replaces* the whole algorithm. Override the first; override the second only for full proxies, and inside it always delegate with `object.__getattribute__(self, name)`:

```python
class Lazy:
    """Load expensive attributes on first use; normal attributes stay fast."""
    def __getattr__(self, name):
        if name == "weights":
            print("loading weights...")
            self.weights = [0.1, 0.2]       # stored in __dict__, so __getattr__ won't fire again
            return self.weights
        raise AttributeError(f"{type(self).__name__!r} has no attribute {name!r}")

m = Lazy()
print(m.weights, m.weights)
```

```text
loading weights...
[0.1, 0.2] [0.1, 0.2]
```

Always raise `AttributeError` for unknown names — `hasattr`, `getattr(obj, n, default)` and `copy`/`pickle` depend on it. Raising anything else (or returning `None`) breaks them.

---

## Special Methods Are Looked Up on the Type

Implicit invocations — `len(x)`, `x + y`, `x[i]`, `with x:`, `for v in x:` — look up the dunder **on `type(x)`**, bypassing the instance dict and `__getattribute__`:

```python
class Box:
    def __len__(self):
        return 1

b = Box()
b.__len__ = lambda: 99
print(len(b), b.__len__())
```

```text
1 99
```

Two reasons: speed (the interpreter reads a C-level slot such as `tp_as_sequence->sq_length` on the type instead of doing a dict lookup) and correctness (if `len(cls)` consulted `cls.__len__`, calling `len` on a *class* would find the instance method). Consequence for metaprogramming: to make `len(SomeClass)` work you must define `__len__` on the **metaclass** ([Chapter 11](./11_metaclasses_and_class_creation.md)). Proxies that wrap objects via `__getattr__` do *not* proxy operators — they must define every dunder explicitly, which is why `unittest.mock.MagicMock` exists separately from `Mock`.

---

## The MRO and C3 Linearization

With multiple inheritance, `type_lookup` needs an order in which to search the classes: the **method resolution order** (`cls.__mro__`). Python uses **C3 linearization**, which guarantees:

- **Local precedence:** a class appears before its bases, and bases appear in the order listed.
- **Monotonicity:** if `A` precedes `B` in the MRO of some class, it does so in the MRO of every subclass.

### The derivation

Write $L[C]$ for the linearization of class $C$ with bases $B_1, \dots, B_k$. Then

$$L[C] = C + \operatorname{merge}\big(L[B_1], \dots, L[B_k],\; [B_1, \dots, B_k]\big)$$

where `merge` repeatedly takes the first **head** (first element of some list) that does not appear in the **tail** (any position but the first) of any list, appends it to the result and removes it from all lists. If no head qualifies, the hierarchy is inconsistent and class creation fails with `TypeError`.

Numerical check on the diamond `class D(B, C)`, `class B(A)`, `class C(A)`:

| Step | Lists being merged | Candidate heads | Chosen | Why |
|:---:|-------------------|----------------|:---:|-----|
| 1 | `[B, A, object]`, `[C, A, object]`, `[B, C]` | B, C, B | **B** | B in no tail |
| 2 | `[A, object]`, `[C, A, object]`, `[C]` | A | — | A is in the tail of `[C, A, object]` → skip |
| 2 | … | C | **C** | C in no tail |
| 3 | `[A, object]`, `[A, object]` | A | **A** | |
| 4 | `[object]`, `[object]` | object | **object** | |

So $L[D] = [D, B, C, A, \text{object}]$ — `A` comes after **both** of its subclasses, which a depth-first search would violate.

<details class="code-fold">
<summary>C3 linearization implemented and checked against <code>__mro__</code> (34 lines)</summary>

```python
def c3_merge(seqs):
    seqs = [list(s) for s in seqs if s]
    result = []
    while seqs:
        for seq in seqs:
            head = seq[0]
            if not any(head in s[1:] for s in seqs):
                break
        else:
            raise TypeError("inconsistent hierarchy: no valid head among "
                            + ", ".join(s[0].__name__ for s in seqs))
        result.append(head)
        seqs = [[c for c in s if c is not head] for s in seqs]
        seqs = [s for s in seqs if s]
    return result

def c3(cls):
    if cls is object:
        return [object]
    return [cls] + c3_merge([c3(b) for b in cls.__bases__] + [list(cls.__bases__)])

class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass
class E(C, B): pass

print([k.__name__ for k in c3(D)])
assert c3(D) == list(D.__mro__) and c3(E) == list(E.__mro__)

try:
    type("Bad", (D, E), {})   # D wants B before C, E wants C before B
except TypeError as e:
    print("TypeError:", e)
```

```text
['D', 'B', 'C', 'A', 'object']
TypeError: Cannot create a consistent method resolution order (MRO) for bases B, C
```

</details>

---

## `super()` Means "Next in the MRO", Not "My Parent"

`super()` returns a proxy that continues the attribute lookup from the class **after** the current one in `type(self).__mro__`. In a diamond, `B`'s `super()` call reaches `C`, a class `B` has never heard of — which is exactly what makes **cooperative multiple inheritance** work:

```python
class Base:
    def setup(self, log):
        log.append("Base")

class Logging(Base):
    def setup(self, log):
        log.append("Logging"); super().setup(log)

class Caching(Base):
    def setup(self, log):
        log.append("Caching"); super().setup(log)

class Service(Logging, Caching):
    def setup(self, log):
        log.append("Service"); super().setup(log)

log = []
Service().setup(log)
print(log)
print([k.__name__ for k in Service.__mro__])
```

```text
['Service', 'Logging', 'Caching', 'Base']
['Service', 'Logging', 'Caching', 'Base', 'object']
```

`Base.setup` runs exactly once. For cooperation to work every class in the chain must (a) call `super()`, and (b) accept and forward arguments it doesn't consume — the usual pattern is keyword-only arguments plus `**kwargs`. Zero-argument `super()` is compiled into `super(__class__, <first argument>)`, using the implicit `__class__` cell described in [Chapter 3](./03_scope_closures_and_binding.md). This is also how PyTorch mixins and `nn.Module.__init__` chains are meant to compose; calling `Base.setup(self, ...)` explicitly breaks the chain and causes double initialisation in diamonds.

---

## Operator Dispatch and `NotImplemented`

`a + b` is not `a.__add__(b)`. The full rule (`Objects/abstract.c`, `binary_op1`):

1. If `type(b)` is a **proper subclass** of `type(a)` and overrides `__radd__`, try `b.__radd__(a)` first.
2. Try `a.__add__(b)`. If it returns the singleton `NotImplemented`, continue.
3. Try `b.__radd__(a)`. If that also returns `NotImplemented`, raise `TypeError`.

Returning `NotImplemented` (not raising `NotImplementedError`) is how a type says "I don't know how; ask the other operand". This is how `2 * tensor` works: `int.__mul__` returns `NotImplemented` for a tensor, so `Tensor.__rmul__` runs.

```python
class Meters:
    def __init__(self, v): self.v = v
    def __add__(self, other):
        if isinstance(other, Meters):
            return Meters(self.v + other.v)
        if isinstance(other, (int, float)):
            return Meters(self.v + other)
        return NotImplemented
    __radd__ = __add__
    def __repr__(self): return f"Meters({self.v})"

print(Meters(2) + 3, 3 + Meters(2), sum([Meters(1), Meters(2)]))
try:
    Meters(1) + "x"
except TypeError as e:
    print("TypeError:", e)
```

```text
Meters(5) Meters(5) Meters(3)
TypeError: unsupported operand type(s) for +: 'Meters' and 'str'
```

`sum` starts from `0`, so `__radd__` is what makes `sum()` of custom objects work. Rich comparisons follow the same protocol with reflected pairs (`__lt__` ↔ `__gt__`, `__eq__` ↔ `__eq__`); `functools.total_ordering` derives the missing ones from `__eq__` and one ordering method.

---

## The `__eq__` / `__hash__` Contract

The rule: **objects that compare equal must have equal hashes**, and an object's hash must not change while it is in a set or dict. Python enforces part of this for you: defining `__eq__` without `__hash__` sets `__hash__ = None`, making instances unhashable.

```python
class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

try:
    {Point(1, 2)}
except TypeError as e:
    print("TypeError:", e)
```

```text
TypeError: unhashable type: 'Point'
```

| Situation | Correct `__hash__` | Choose this when |
|-----------|-------------------|------------------|
| **Immutable value object** | `hash((self.x, self.y))` — the same fields `__eq__` compares | points, keys, config records; or `@dataclass(frozen=True)` |
| **Mutable object compared by value** | leave it `None` (unhashable) | lists, mutable records |
| **Identity semantics** | don't define `__eq__` at all — inherit `object`'s identity eq/hash | entities, nodes, models |

A mutable object whose hash depends on mutable fields will be "lost" inside a set after mutation: it sits in the bucket for its old hash. `@dataclass(eq=True, frozen=True)` generates a correct pair; `@dataclass(eq=True)` alone sets `__hash__` to `None` ([Chapter 11](./11_metaclasses_and_class_creation.md) shows the generated code).

---

## Key Takeaways

- `obj.attr` runs one algorithm: data descriptor on the type → instance dict → non-data descriptor or class attribute → `__getattr__`. Every attribute-level metaprogramming technique hooks one of these steps.
- `property` beats the instance dict because it is a data descriptor; methods and `cached_property` lose to it because they are non-data descriptors.
- Implicit special-method calls look up the type, never the instance; class-level operators require a metaclass.
- The MRO is the C3 linearization: local precedence plus monotonicity, and some hierarchies are rejected as inconsistent.
- `super()` continues the lookup at the next class in `type(self).__mro__`; cooperative hierarchies require every class to call it and forward `**kwargs`.
- Binary operators return `NotImplemented` to defer to the other operand's reflected method; that protocol is what makes `sum()` and `2 * tensor` work.
- Equal objects must hash equal; defining `__eq__` alone makes a class unhashable, which is the safe default for mutable types.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Language Reference §3.3 — Special method names | Python docs | docs.python.org/3/reference/datamodel.html | Attribute access, special-method lookup, `__hash__` rules |
| Descriptor HowTo Guide | Hettinger, Python docs | docs.python.org/3/howto/descriptor.html | Pure-Python equivalent of `object.__getattribute__` |
| The Python 2.3 Method Resolution Order | Simionato, 2003 | docs.python.org/3/howto/mro.html | C3 merge rule and worked examples |
| A Monotonic Superclass Linearization for Dylan | Barrett et al., OOPSLA 1996 | doi.org/10.1145/236337.236343 | Origin of C3 and its monotonicity property |
| PEP 252 — Making Types Look More Like Classes | van Rossum, 2001 | peps.python.org/pep-0252 | Descriptors and generic getattr |
| `Objects/object.c`, `Objects/typeobject.c`, `Objects/abstract.c` | CPython | github.com/python/cpython | Generic getattr, `_PyType_Lookup`, `binary_op1` |
| `bench/attribute_access.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Per-kind attribute read costs |

---

**Next:** [Chapter 5 — Iterators, Generators & Coroutines](./05_iterators_generators_and_coroutines.md) — the protocol behind `for`, and functions that can pause.
