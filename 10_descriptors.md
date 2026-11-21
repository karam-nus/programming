---
title: "Chapter 10 — Descriptors"
---

[← Back to Table of Contents](./README.md)

# Chapter 10 — Descriptors

> *"A method is a function that knows how to bind itself. That 'knowing how' is the descriptor protocol."*

## Overview

A descriptor is an object, stored as a **class** attribute, whose type defines `__get__`, `__set__` or `__delete__`. The attribute lookup algorithm of [Chapter 4](./04_the_data_model_and_attribute_lookup.md) calls those methods instead of returning the object, so a descriptor gets to decide what `obj.attr`, `obj.attr = v` and `del obj.attr` mean. This one protocol implements bound methods, `property`, `classmethod`, `staticmethod`, `__slots__`, `functools.cached_property`, and the field machinery of every ORM and validation library. This chapter rebuilds each of them in pure Python, then builds a reusable validated-field framework.

<div class="diagram">
<div class="diagram-title">Data vs non-data descriptors in the lookup order</div>
<div class="compare">
  <div class="compare-side left">
    <div class="compare-title">Data descriptor (__get__ + __set__ / __delete__)</div>
    <ul>
      <li>Wins over the instance <code>__dict__</code></li>
      <li>Controls reads and writes</li>
      <li><code>property</code>, slots, ORM/pydantic-style fields</li>
    </ul>
  </div>
  <div class="compare-side right">
    <div class="compare-title">Non-data descriptor (__get__ only)</div>
    <ul>
      <li>Loses to the instance <code>__dict__</code></li>
      <li>Controls reads until shadowed</li>
      <li>functions → methods, <code>classmethod</code>, <code>cached_property</code></li>
    </ul>
  </div>
</div>
</div>

---

## The Protocol

| | |
|---|---|
| **Mechanism** | `__get__(self, obj, objtype=None)`, `__set__(self, obj, value)`, `__delete__(self, obj)`, `__set_name__(self, owner, name)` |
| **Defined in** | Language Reference §3.3.2.2–3.3.2.4; Descriptor HowTo Guide; `Objects/descrobject.c` |
| **Since** | 2.2 (PEP 252); `__set_name__` 3.6 (PEP 487) |
| **Hooks into** | Steps 2 and 4 of `object.__getattribute__`; `type.__getattribute__` for class access |
| **Typical use** | Methods, properties, validated fields, lazy attributes, ORMs |
| **Cost** | A pure-Python `__get__` is one Python call per read: 5.8× a plain attribute (`bench/attribute_access.py`) |
| **Prefer instead** | `property` for one attribute on one class; a descriptor when the same logic repeats across fields or classes |
| **Failure modes** | Storing per-instance values on the descriptor (shared by all instances); name collision between the descriptor and its storage key |

`__get__` is called with `obj=None` when the attribute is accessed on the class itself (`Cls.attr`); by convention a descriptor returns itself in that case so that introspection works.

```python
class Loud:
    def __set_name__(self, owner, name):
        print(f"__set_name__: {owner.__name__}.{name}")
        self.name = name
    def __get__(self, obj, objtype=None):
        print(f"__get__(obj={'instance' if obj is not None else None}, objtype={objtype.__name__})")
        return self if obj is None else 42

class C:
    x = Loud()

C.x; C().x
```

```text
__set_name__: C.x
__get__(obj=None, objtype=C)
__get__(obj=instance, objtype=C)
```

`__set_name__` is called by `type.__new__` for every attribute in the class namespace that defines it ([Chapter 11](./11_metaclasses_and_class_creation.md)) — which is how a descriptor learns the attribute name it was assigned to, without repeating it (`x = Field("x")` was the pre-3.6 idiom).

---

## How Functions Become Methods

Functions are non-data descriptors. `function.__get__(obj, type)` returns a **bound method**: a tiny object holding `__func__` and `__self__` whose call prepends `__self__` to the arguments.

<div class="svgfig">
<svg viewBox="0 0 820 190" width="820" role="img" aria-label="n.forward(5): function.__get__ builds a bound method that prepends n">
<rect x="20" y="60" width="130" height="44" rx="8" class="box"/><text x="85" y="82" text-anchor="middle" class="tm">n.forward</text>
<path d="M150 82 L218 82" class="ln hot"/><path d="M210 76 L220 82 L210 88" class="ln hot"/>
<rect x="222" y="40" width="250" height="84" rx="8" fill="#1e1830" stroke="#c4b5fd" stroke-width="1.6"/>
<text x="347" y="62" text-anchor="middle" class="t" style="fill:#c4b5fd">Net.__dict__['forward']</text>
<text x="347" y="86" text-anchor="middle" class="tm">function.__get__(n, Net)</text>
<text x="347" y="110" text-anchor="middle" class="ts">non-data descriptor, step 4 of lookup</text>
<path d="M472 82 L540 82" class="ln hot"/><path d="M532 76 L542 82 L532 88" class="ln hot"/>
<rect x="544" y="34" width="256" height="96" rx="8" fill="#12221a" stroke="#4ade80" stroke-width="1.6"/>
<text x="672" y="56" text-anchor="middle" class="t" style="fill:#4ade80">bound method</text>
<text x="560" y="82" class="tm">__func__ = forward</text>
<text x="560" y="106" class="tm">__self__ = n</text>
<text x="420" y="164" text-anchor="middle" class="ts">calling it: method(5)  →  forward(n, 5)   ·   a new bound-method object per access (n.forward is n.forward → False)</text>
</svg>
</div>

```python
class Net:
    def forward(self, x):
        return x * 2

n = Net()
f = Net.__dict__["forward"]              # the raw function in the class dict
bound = f.__get__(n, Net)                # what n.forward does
print(type(f).__name__, type(bound).__name__, bound.__self__ is n, bound(5))
print(n.forward == bound, n.forward is n.forward)
```

```text
function method True 10
True False
```

`n.forward is n.forward` is `False`: each access builds a new bound-method object. CPython avoids that allocation for the common `n.forward(5)` pattern with the `LOAD_ATTR` method-call specialization, which pushes the function and `self` separately and calls directly. Storing `fwd = n.forward` before a hot loop saves the lookup but still pays the bound-method call.

### `staticmethod`, `classmethod` and `property` in pure Python

These are the reference implementations from the Descriptor HowTo, condensed:

<details class="code-fold">
<summary>Pure-Python <code>StaticMethod</code>, <code>ClassMethod</code>, <code>Property</code> (42 lines)</summary>

```python
import types

class StaticMethod:
    def __init__(self, f):
        self.f = f
    def __get__(self, obj, objtype=None):
        return self.f                                  # no binding at all
    def __call__(self, *args, **kwargs):               # 3.10+: staticmethods are callable
        return self.f(*args, **kwargs)

class ClassMethod:
    def __init__(self, f):
        self.f = f
    def __get__(self, obj, objtype=None):
        if objtype is None:
            objtype = type(obj)
        return types.MethodType(self.f, objtype)       # bind the class, not the instance

class Property:
    def __init__(self, fget=None, fset=None, fdel=None, doc=None):
        self.fget, self.fset, self.fdel = fget, fset, fdel
        self.__doc__ = doc if doc is not None else getattr(fget, "__doc__", None)
    def __set_name__(self, owner, name):
        self.__name__ = name
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self.fget(obj)
    def __set__(self, obj, value):                     # always defined → always a DATA descriptor
        if self.fset is None:
            raise AttributeError(f"property {self.__name__!r} has no setter")
        self.fset(obj, value)
    def __delete__(self, obj):
        if self.fdel is None:
            raise AttributeError(f"property {self.__name__!r} has no deleter")
        self.fdel(obj)
    def setter(self, fset):
        return type(self)(self.fget, fset, self.fdel, self.__doc__)

class Temperature:
    def __init__(self, c): self._c = c
    @Property
    def celsius(self): return self._c
    @celsius.setter
    def celsius(self, v):
        if v < -273.15: raise ValueError("below absolute zero")
        self._c = v
    @ClassMethod
    def freezing(cls): return cls(0.0)
    @StaticMethod
    def to_f(c): return c * 9 / 5 + 32

t = Temperature.freezing(); t.celsius = 25
print(t.celsius, Temperature.to_f(t.celsius), type(t).__name__)
try:
    t.celsius = -300
except ValueError as e:
    print("ValueError:", e)
```

```text
25 77.0 Temperature
ValueError: below absolute zero
```

</details>

Two details from the real implementations. `property.setter` returns a **new** property object (properties are immutable), which is why the setter must reuse the getter's name — otherwise you'd bind the new property to a different attribute. And `Property` defines `__set__` even with no setter: that is what makes a read-only property a *data* descriptor that the instance dict cannot shadow.

---

## Data vs Non-Data: Why It Matters

| | Data descriptor | Non-data descriptor |
|---|:---:|:---:|
| Defines | `__get__` + (`__set__` or `__delete__`) | `__get__` only |
| Instance dict can shadow it | no | yes |
| Examples | `property`, slot member, `Field` below | function, `classmethod`, `staticmethod`, `cached_property` |

`functools.cached_property` is a non-data descriptor **on purpose**: the first read runs `__get__`, which computes the value and writes it into `obj.__dict__` under the same name; every later read is satisfied by step 3 of the lookup and never touches the descriptor.

```python
import functools

class Dataset:
    def __init__(self, path):
        self.path = path
    @functools.cached_property
    def stats(self):
        print("computing stats once")
        return {"mean": 0.5}

d = Dataset("train.bin")
print(d.stats, d.stats, "stats" in vars(d))
del d.stats                      # invalidate: next access recomputes
print(d.stats)
```

```text
computing stats once
{'mean': 0.5} {'mean': 0.5} True
computing stats once
{'mean': 0.5}
```

| | |
|---|---|
| **Mechanism** | `functools.cached_property` |
| **Defined in** | `Lib/functools.py` |
| **Since** | 3.8; per-instance lock removed in 3.12 |
| **Hooks into** | Non-data `__get__`, then the instance `__dict__` |
| **Typical use** | Expensive derived values on effectively-immutable objects |
| **Cost** | First access: the computation; after: 1.6× a plain attribute |
| **Prefer instead** | `property` when the value must track mutable state |
| **Failure modes** | Requires an instance `__dict__` (fails with `__slots__` unless `__dict__` is a slot); stale if inputs change; in 3.12+ not thread-safe — two threads may both compute |

The 3.12 change is a good example of descriptor design trade-offs: the original implementation held one lock **per descriptor** — shared across all instances — so concurrent access to *different* instances serialized. It was removed rather than fixed; if you need exactly-once computation under threads, add your own lock.

---

## `__slots__` Are Descriptors

Declaring `__slots__ = ("x", "y")` makes `type.__new__` reserve fixed offsets in the instance layout and put a **member descriptor** on the class for each name:

```python
class P:
    __slots__ = ("x", "y")

print(type(P.__dict__["x"]).__name__, hasattr(P.__dict__["x"], "__set__"))
p = P(); p.x = 1
try:
    p.z = 3
except AttributeError as e:
    print("AttributeError:", e)
```

```text
member_descriptor True
AttributeError: 'P' object has no attribute 'z' and no __dict__ for setting new attributes
```

The member descriptor's `__get__`/`__set__` read and write a pointer at a fixed offset — the data-descriptor path, specialized in 3.11+ as `LOAD_ATTR_SLOT`, which is why slots measured the same speed as a dict attribute in [Chapter 4](./04_the_data_model_and_attribute_lookup.md).

---

## Building a Validated-Field Framework

The motivating problem: ten classes, forty fields, each needing a type check and range check on assignment. Forty properties is copy-paste; one descriptor class is the abstraction.

<details class="code-fold">
<summary>A typed, validated field descriptor with defaults and introspection (49 lines)</summary>

```python
class Field:
    """A data descriptor: validates on set, stores in the instance __dict__ under the same name."""
    def __init__(self, kind, *, default=None, check=None, doc=""):
        self.kind, self.default, self.check, self.__doc__ = kind, default, check, doc

    def __set_name__(self, owner, name):
        self.name = name
        owner.__fields__ = {**getattr(owner, "__fields__", {}), name: self}

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name, self.default)

    def __set__(self, obj, value):
        if not isinstance(value, self.kind):
            raise TypeError(f"{self.name} must be {self.kind.__name__}, got {type(value).__name__}")
        if self.check is not None and not self.check(value):
            raise ValueError(f"{self.name}={value!r} failed validation")
        obj.__dict__[self.name] = value       # same key is safe: data descriptor wins on read

class Record:
    def __init__(self, **kwargs):
        unknown = kwargs.keys() - self.__fields__.keys()
        if unknown:
            raise TypeError(f"unknown fields: {sorted(unknown)}")
        for k, v in kwargs.items():
            setattr(self, k, v)
    def __repr__(self):
        body = ", ".join(f"{k}={getattr(self, k)!r}" for k in self.__fields__)
        return f"{type(self).__name__}({body})"

class TrainConfig(Record):
    lr = Field(float, default=1e-3, check=lambda v: 0 < v < 1, doc="learning rate")
    epochs = Field(int, default=10, check=lambda v: v > 0)
    optimizer = Field(str, default="adamw", check=lambda v: v in {"sgd", "adamw"})

cfg = TrainConfig(lr=3e-4, epochs=5)
print(cfg, list(TrainConfig.__fields__), TrainConfig.lr.__doc__)
for bad in ({"lr": 2.0}, {"epochs": "5"}, {"momentum": 0.9}):
    try:
        TrainConfig(**bad)
    except (TypeError, ValueError) as e:
        print(type(e).__name__, "-", e)
```

```text
TrainConfig(lr=0.0003, epochs=5, optimizer='adamw') ['lr', 'epochs', 'optimizer'] learning rate
ValueError - lr=2.0 failed validation
TypeError - epochs must be int, got str
TypeError - unknown fields: ['momentum']
```

</details>

Design decisions worth copying:

- **State lives on the instance, not the descriptor.** One `Field` object is shared by every `TrainConfig`; storing `self.value = v` on it would make all configs share one learning rate. Storing in `obj.__dict__[self.name]` is safe because a data descriptor wins over the instance dict on reads (step 2 before step 3).
- **`__set_name__` both learns the name and registers the field** on the owner. That registration is a lightweight form of what a metaclass or `__init_subclass__` would do; note the dict is copied (`{**…}`) so subclasses extend rather than mutate their parent's registry.
- **Class access returns the descriptor** (`TrainConfig.lr.__doc__`), which is what makes schema introspection — documentation generators, CLI builders, JSON-schema exporters — possible.

This is the skeleton of Django model fields, SQLAlchemy's `InstrumentedAttribute`, attrs validators and the pydantic v1 field model. pydantic v2 moved validation into compiled Rust (`pydantic-core`) and runs it in the generated `__init__`, trading the per-assignment hook for speed — validation on assignment is opt-in (`validate_assignment=True`).

---

## Key Takeaways

- A descriptor is a class attribute whose type defines `__get__`/`__set__`/`__delete__`; attribute lookup calls these instead of returning the object.
- Defining `__set__` or `__delete__` makes a data descriptor that outranks the instance dict; `__get__` alone makes a non-data descriptor the instance dict can shadow.
- Bound methods, `classmethod`, `staticmethod`, `property` and `__slots__` are all descriptors; each can be rewritten in a few lines of Python.
- `cached_property` works by being non-data: it writes the value into the instance dict so that the descriptor is never consulted again — and it is not thread-safe since 3.12.
- `__set_name__` lets a descriptor learn its attribute name and register itself on the owner class.
- Per-instance state belongs in the instance, never on the shared descriptor object.
- A pure-Python descriptor costs roughly one function call per access; reserve it for logic reused across many attributes.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Descriptor HowTo Guide | Hettinger, Python docs | docs.python.org/3/howto/descriptor.html | Pure-Python `property`, `classmethod`, `staticmethod`, method binding |
| Language Reference §3.3.2 — Customizing attribute access | Python docs | docs.python.org/3/reference/datamodel.html | Descriptor invocation rules, `__slots__` |
| PEP 252 — Making Types Look More Like Classes | van Rossum, 2001 | peps.python.org/pep-0252 | Origin of descriptors |
| PEP 487 — Simpler customisation of class creation | Teichmann, 2016 | peps.python.org/pep-0487 | `__set_name__` |
| `Lib/functools.py` (`cached_property`), What's New 3.12 | CPython | github.com/python/cpython | Non-data caching, lock removal |
| `Objects/descrobject.c`, `Objects/funcobject.c` | CPython | github.com/python/cpython | Member descriptors, `func_descr_get` |
| pydantic v2 docs — Validators / `validate_assignment` | pydantic, 2024 | docs.pydantic.dev | How a production library moved away from per-assignment descriptors |
| `bench/attribute_access.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Descriptor and property costs |

---

**Next:** [Chapter 11 — Metaclasses & Class Creation](./11_metaclasses_and_class_creation.md) — who calls `__set_name__`, and what happens between `class` and the finished class object.
