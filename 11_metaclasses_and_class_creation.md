---
title: "Chapter 11 — Metaclasses & Class Creation"
---
{% raw %}

[← Back to Table of Contents](./README.md)

# Chapter 11 — Metaclasses & Class Creation

> *"Metaclasses are deeper magic than 99% of users should ever worry about." — Tim Peters. The remaining 1% should first try `__init_subclass__`.*

## Overview

A `class` statement is executable code that builds an object. Between the `class` keyword and the finished class there are six hooks — `__prepare__`, the body execution, `type.__new__`, `__set_name__`, `__init_subclass__`, and `type.__init__` — and a metaclass can override some of them. This chapter desugars the statement, traces every hook in order, establishes when each one is the right tool, and shows how `dataclasses` uses the same machinery plus `exec` to write methods for you. It builds on attribute lookup ([Chapter 4](./04_the_data_model_and_attribute_lookup.md)), descriptors ([Chapter 10](./10_descriptors.md)) and the metaprogramming ladder ([Chapter 9](./09_decorators.md)).

<div class="diagram">
<div class="diagram-title">What `class Model(Base, metaclass=Meta, tag="x"): body` does</div>
<div class="flow">
  <div class="flow-node accent wide">1. Determine the metaclass <small>explicit metaclass= or the most derived type(base)</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple wide">2. ns = Meta.__prepare__("Model", bases, tag="x") <small>usually a plain dict</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node cyan wide">3. exec(body, globals, ns) <small>defs and assignments fill ns</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange wide">4. cls = Meta("Model", bases, ns, tag="x") <small>→ Meta.__new__ → type.__new__</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node green wide">inside type.__new__: __set_name__ on each attribute, then Base.__init_subclass__(cls, tag="x")</div>
  <div class="flow-arrow"></div>
  <div class="flow-node teal wide">5. Meta.__init__(cls, ...) · 6. class decorators · 7. bind the name Model</div>
</div>
</div>

---

## `type` Is a Class Factory

Every class is an instance of its metaclass, and the default metaclass is `type`. The three-argument form of `type` *is* class creation:

```python
def describe(self):
    return f"{type(self).__name__} with lr={self.lr}"

Optim = type("Optim", (object,), {"lr": 0.1, "describe": describe})
print(Optim().describe(), type(Optim), type(type))
```

```text
Optim with lr=0.1 <class 'type'> <class 'type'>
```

`type(type) is type`: the chain terminates in a fixed point. Every class you have ever written was created by a call equivalent to the one above; the `class` statement is just the friendly syntax that builds the namespace dict by executing the body.

---

## Every Hook, In Order

| | |
|---|---|
| **Mechanism** | Metaclass (`type` subclass) and the class-creation protocol |
| **Defined in** | Language Reference §3.3.3 "Customizing class creation"; PEP 3115, PEP 487; `Objects/typeobject.c` (`type_new`) |
| **Since** | Metaclasses always; `__prepare__` 3.0; `__init_subclass__`/`__set_name__` 3.6 |
| **Hooks into** | `LOAD_BUILD_CLASS` → `builtins.__build_class__` |
| **Typical use** | `ABCMeta`, `EnumType`, ORM declarative bases, namespace control |
| **Cost** | Definition time only — no per-instance cost unless `__call__` is overridden |
| **Prefer instead** | `__init_subclass__` for subclass hooks; class decorators for one-off transforms |
| **Failure modes** | Metaclass conflicts in multiple inheritance; surprising behaviour for every subclass, forever |

A tracing metaclass shows the exact order:

```python
log = []

class Meta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kw):
        log.append(f"1 __prepare__({name!r}, kw={kw})")
        return {}
    def __new__(mcs, name, bases, ns, **kw):
        log.append(f"3 Meta.__new__, ns has {[k for k in ns if not k.startswith('__')]}")
        return super().__new__(mcs, name, bases, ns, **kw)   # forwards kw to __init_subclass__
    def __init__(cls, name, bases, ns, **kw):
        log.append("6 Meta.__init__")
        super().__init__(name, bases, ns)
    def __call__(cls, *args, **kwargs):
        log.append("7 Meta.__call__ (instance creation, every time)")
        return super().__call__(*args, **kwargs)

class Tracked:
    def __set_name__(self, owner, name):
        log.append(f"4 __set_name__({owner.__name__}.{name})")

class Base:
    def __init_subclass__(cls, **kw):
        log.append(f"5 __init_subclass__({cls.__name__}, kw={kw})")
        super().__init_subclass__()

class Model(Base, metaclass=Meta, tag="x"):
    log.append("2 class body executes")
    field = Tracked()

Model()
print("\n".join(log))
```

```text
1 __prepare__('Model', kw={'tag': 'x'})
2 class body executes
3 Meta.__new__, ns has ['field']
4 __set_name__(Model.field)
5 __init_subclass__(Model, kw={'tag': 'x'})
6 Meta.__init__
7 Meta.__call__ (instance creation, every time)
```

Notes on each hook:

- **`__prepare__`** returns the mapping the body executes in. Returning something other than a dict lets a metaclass observe or veto every assignment *as it happens* — `enum` uses a custom `_EnumDict` to reject duplicate member names and to auto-number `auto()` values. Since 3.6 the default dict preserves definition order, which removed the most common historical reason for a custom `__prepare__` (`OrderedDict`).
- **`type.__new__`** copies the namespace into a fresh class `__dict__`, computes `__mro__` ([Chapter 4](./04_the_data_model_and_attribute_lookup.md)), lays out `__slots__`, then calls `__set_name__` on every attribute that has one and finally the **parent's** `__init_subclass__`. Class keyword arguments (`tag="x"`) flow to both `__prepare__` and `__init_subclass__`.
- **`Meta.__call__`** runs on every *instantiation*: it is what calls `cls.__new__` and then `cls.__init__`. Overriding it is how singletons and instance caches are built at the metaclass level — and how you add per-instance cost to every object of every subclass, so do it only deliberately.

---

## `__init_subclass__`: The Hook You Usually Want

| | |
|---|---|
| **Mechanism** | `__init_subclass__(cls, **kwargs)` — an implicit classmethod on a base class |
| **Defined in** | PEP 487 |
| **Since** | 3.6 |
| **Hooks into** | Called by `type.__new__` on the parent after a subclass is created |
| **Typical use** | Plugin registries, validating subclasses, per-subclass configuration via class keywords |
| **Cost** | Definition time only |
| **Prefer instead** | A class decorator if only one class needs it |
| **Failure modes** | Forgetting `super().__init_subclass__(**kwargs)` breaks cooperative bases; it does not run for the base class itself |

Anything that must happen *to every subclass* — registering it, checking it implements something, reading class keywords — belongs here. It composes with other bases (no metaclass conflicts) and reads like ordinary code:

```python
class Layer:
    registry = {}

    def __init_subclass__(cls, /, name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        if not callable(getattr(cls, "forward", None)):
            raise TypeError(f"{cls.__name__} must define forward()")
        Layer.registry[name or cls.__name__.lower()] = cls

class Linear(Layer):
    def forward(self, x): return x

class Conv(Layer, name="conv2d"):
    def forward(self, x): return x

try:
    class Broken(Layer):
        pass
except TypeError as e:
    print("TypeError:", e)
print({k: v.__name__ for k, v in Layer.registry.items()})
```

```text
TypeError: Broken must define forward()
{'linear': 'Linear', 'conv2d': 'Conv'}
```

Compare with the alternatives:

| Tool | Runs for | Can change | Composes with other bases | Choose this when |
|------|----------|------------|:---:|------------------|
| **Class decorator** | one class | anything on the finished class | yes | a one-off transform (`@dataclass`) |
| **`__init_subclass__`** | every subclass (not the base) | the subclass after creation | yes | registries, subclass validation, class keywords |
| **`__set_name__`** | each descriptor attribute | the descriptor / owner | yes | per-field setup ([Chapter 10](./10_descriptors.md)) |
| **Metaclass** | the base and every subclass | the namespace *during* body execution, the class's own behaviour (`len(cls)`, `cls[...]`, `isinstance` checks) | only if metaclasses are compatible | namespace control, operators on classes |

---

## When a Metaclass Is Genuinely Needed

Three things only a metaclass can do:

**1. Control the namespace during body execution** (`__prepare__`) — e.g. reject duplicate method names, which a plain dict silently allows:

```python
class NoDupes(dict):
    def __setitem__(self, key, value):
        if key in self and not key.startswith("__"):
            raise TypeError(f"duplicate definition of {key!r}")
        super().__setitem__(key, value)

class StrictMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kw):
        return NoDupes()
    def __new__(mcs, name, bases, ns, **kw):
        return super().__new__(mcs, name, bases, dict(ns), **kw)

try:
    class Handler(metaclass=StrictMeta):
        def on_event(self): return 1
        def on_event(self): return 2      # a plain class would silently keep only this one
except TypeError as e:
    print("TypeError:", e)
```

```text
TypeError: duplicate definition of 'on_event'
```

**2. Give classes their own behaviour** — operators and protocols on the class object, which are looked up on the *metaclass* because special methods are looked up on the type ([Chapter 4](./04_the_data_model_and_attribute_lookup.md)). This is how `len(Color)`, `Color["RED"]` and `for c in Color` work on enums:

```python
class Indexed(type):
    def __iter__(cls):
        return iter(cls._members)
    def __len__(cls):
        return len(cls._members)
    def __getitem__(cls, key):
        return cls._members[key]

class Split(metaclass=Indexed):
    _members = {"train": 0.8, "val": 0.1, "test": 0.1}

print(len(Split), Split["val"], list(Split))
```

```text
3 0.1 ['train', 'val', 'test']
```

**3. Customise `isinstance`/`issubclass`** via `__instancecheck__`/`__subclasscheck__` on the metaclass. `abc.ABCMeta` does this to support **virtual subclasses** (`Sized.register(MyType)`) and structural checks via `__subclasshook__` — which is why `isinstance([], collections.abc.Sized)` is `True` although `list` doesn't inherit from `Sized`.

```python
import abc, collections.abc

class HasLen:
    def __len__(self): return 0

print(isinstance(HasLen(), collections.abc.Sized), collections.abc.Sized in HasLen.__mro__)
```

```text
True False
```

### Metaclass conflicts

A class's metaclass must be a subclass (non-strict) of the metaclass of **every** base. Mixing two unrelated metaclasses fails at class creation:

```python
class MetaA(type): pass
class MetaB(type): pass
class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass

try:
    class C(A, B): pass
except TypeError as e:
    print("TypeError:", e)
```

```text
TypeError: metaclass conflict: the metaclass of a derived class must be a (non-strict) subclass of the metaclasses of all its bases
```

The fix is a combined `class MetaAB(MetaA, MetaB)` — feasible only if both metaclasses were written cooperatively. This is the practical reason libraries avoid metaclasses: a user who mixes your base class with an `ABC`, a Qt `QObject`, or a Django `Model` will hit this. `__init_subclass__` never conflicts.

---

## How `@dataclass` Writes Your Methods

| | |
|---|---|
| **Mechanism** | Class decorator that generates method source text and `exec`s it |
| **Defined in** | PEP 557; `Lib/dataclasses.py` (`_process_class`, `_FuncBuilder` / `_create_fn`) |
| **Since** | 3.7; `slots=`, `kw_only=` 3.10 |
| **Hooks into** | Reads `cls.__annotations__` (via `annotationlib` in 3.14+) and class attributes for defaults |
| **Typical use** | Record types, configs, value objects |
| **Cost** | Definition-time `exec`; generated `__init__` is as fast as hand-written |
| **Prefer instead** | `NamedTuple` for immutable tuples; attrs/pydantic for validation |
| **Failure modes** | Mutable defaults rejected (`field(default_factory=list)`); `eq=True` without `frozen=True` makes instances unhashable |

`dataclasses` is a class decorator (rung 1 of the ladder) that performs **code generation** (rung 5). It builds the source of `__init__` as a string, compiles it with `exec` in a namespace containing the defaults and field types, and attaches the resulting function. A miniature version shows the whole technique:

<details class="code-fold">
<summary>A 28-line <code>dataclass</code> clone: generate source, <code>exec</code>, attach (28 lines)</summary>

```python
_MISSING = object()

def mini_dataclass(cls):
    fields = list(cls.__dict__.get("__annotations__", {}))
    defaults = {f: cls.__dict__[f] for f in fields if f in cls.__dict__}
    params = ", ".join(f"{f}=_dflt_{f}" if f in defaults else f for f in fields)
    body = "\n".join(f"    self.{f} = {f}" for f in fields) or "    pass"
    src = {
        "__init__": f"def __init__(self, {params}):\n{body}",
        "__repr__": "def __repr__(self):\n    return f'{type(self).__name__}("
                    + ", ".join(f"{f}={{self.{f}!r}}" for f in fields) + ")'",
        "__eq__": "def __eq__(self, other):\n"
                  "    if type(other) is not type(self): return NotImplemented\n"
                  f"    return ({', '.join(f'self.{f}' for f in fields)},) == "
                  f"({', '.join(f'other.{f}' for f in fields)},)",
    }
    ns = {f"_dflt_{f}": v for f, v in defaults.items()}
    for name, code in src.items():
        exec(code, ns)                      # compile the generated source
        fn = ns[name]
        fn.__qualname__ = f"{cls.__qualname__}.{name}"
        setattr(cls, name, fn)
    cls.__hash__ = None                     # eq without frozen → unhashable, as dataclasses does
    cls.__generated_source__ = src
    return cls

@mini_dataclass
class Point:
    x: float
    y: float = 0.0

print(Point(1.5), Point(1.5) == Point(1.5, 0.0))
print(Point.__generated_source__["__init__"])
```

```text
Point(x=1.5, y=0.0) True
def __init__(self, x, y=_dflt_y):
    self.x = x
    self.y = y
```

</details>

Why generate source instead of writing one generic `__init__(self, **kwargs)` that loops over fields? Because the generated function has the **real signature** — positional parameters, defaults, correct error messages for missing arguments, `inspect.signature` support — and runs at hand-written speed with no per-call loop over field metadata. The same reasoning drives `collections.namedtuple` (historically also `exec`-based) and attrs. [Chapter 12](./12_introspection_ast_and_codegen.md) covers `exec`, `compile` and building code from ASTs instead of strings.

---

## Decision Guide

<div class="diagram">
<div class="diagram-title">Which class-creation hook?</div>
<div class="flow">
  <div class="flow-node accent wide">Does every subclass need processing (registry, validation, class kwargs)? → __init_subclass__</div>
  <div class="flow-arrow"></div>
  <div class="flow-node green wide">Is it one class, transformed once? → class decorator</div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple wide">Is it per-attribute behaviour? → descriptor + __set_name__</div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange wide">Must you intercept the body as it executes, or give the CLASS operators / isinstance logic? → metaclass</div>
</div>
</div>

---

## Key Takeaways

- A class is an object created by calling its metaclass, `type` by default: `type(name, bases, namespace)` is class creation.
- The order is `__prepare__` → body → `Meta.__new__` → (`__set_name__` for each attribute → parent `__init_subclass__`) → `Meta.__init__` → class decorators → name binding.
- `__init_subclass__` handles registries, subclass validation and class keyword arguments without metaclass conflicts; reach for it first.
- Only a metaclass can control the namespace during body execution, give the class object its own operators, or customise `isinstance`/`issubclass`.
- Mixing bases with unrelated metaclasses raises a metaclass conflict — the main reason libraries avoid metaclasses.
- `@dataclass` is a class decorator that generates method source and `exec`s it, so generated methods have real signatures and hand-written speed.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Language Reference §3.3.3 — Customizing class creation | Python docs | docs.python.org/3/reference/datamodel.html | Metaclass determination, `__prepare__`, the creation sequence |
| PEP 3115 — Metaclasses in Python 3000 | Talin, 2007 | peps.python.org/pep-3115 | `__prepare__` and class keyword arguments |
| PEP 487 — Simpler customisation of class creation | Teichmann, 2016 | peps.python.org/pep-0487 | `__init_subclass__`, `__set_name__` |
| PEP 557 — Data Classes | Smith, 2017 | peps.python.org/pep-0557 | Field rules, generated methods, hash semantics |
| PEP 3119 — Introducing Abstract Base Classes | van Rossum, Talin, 2007 | peps.python.org/pep-3119 | `ABCMeta`, `register`, `__subclasshook__` |
| `Lib/dataclasses.py`, `Lib/enum.py`, `Lib/_py_abc.py`, `Objects/typeobject.c` | CPython | github.com/python/cpython | Source generation; `_EnumDict`; `__instancecheck__`; `type_new` |

---

**Next:** [Chapter 12 — Introspection, AST & Code Generation](./12_introspection_ast_and_codegen.md) — the top rungs: reading, rewriting and generating code, and changing how modules load.
{% endraw %}
