---
title: "Chapter 2 — Objects, Names & Memory"
---

[← Back to Table of Contents](./README.md)

# Chapter 2 — Objects, Names & Memory

> *"Variables don't hold values. Names refer to objects. Almost every Python bug about 'copies' is a forgotten second name."*

## Overview

This chapter fixes the vocabulary the rest of the book uses: an **object** lives on the heap and has an identity, a type and a value; a **name** is an entry in a namespace that refers to an object. From those two definitions follow aliasing, the mutable-default trap, `is` vs `==`, and CPython's memory management — reference counting, the cycle collector, weak references and immortal objects. It assumes [Chapter 1](./01_from_source_to_bytecode.md)'s picture of frames holding local slots.

<div class="diagram">
<div class="diagram-title">Names in namespaces → objects on the heap</div>
<div class="diagram-grid cols-2">
  <div class="diagram-card accent"><div class="card-title">Namespaces</div><div class="card-desc">frame local slots · module <code>__dict__</code> · instance <code>__dict__</code> · class <code>__dict__</code> · container slots. Each entry is a reference.</div></div>
  <div class="diagram-card green"><div class="card-title">Objects</div><div class="card-desc">a header (refcount + type pointer) followed by type-specific data. Identity = address for the object's lifetime.</div></div>
</div>
</div>

---

## The Object Header

Every CPython object begins with a `PyObject` header (`Include/object.h`): a reference count and a pointer to its type. Variable-sized objects (`int`, `tuple`, `list`) add a size field (`PyVarObject`).

| | |
|---|---|
| **Mechanism** | `PyObject` header: `ob_refcnt`, `ob_type` |
| **Defined in** | `Include/object.h`; Language Reference §3.1 "Objects, values and types" |
| **Since** | Always; immortal objects 3.12 (PEP 683) |
| **Hooks into** | Every `Py_INCREF`/`Py_DECREF` in the interpreter |
| **Typical use** | n/a — the substrate |
| **Cost** | 16 bytes per object on 64-bit builds (more in the free-threaded build) |
| **Prefer instead** | n/a |
| **Failure modes** | Millions of tiny objects: header overhead dominates (see `__slots__`, arrays) |

The Language Reference guarantees three properties of every object:

- **Identity** — never changes while the object lives; `id(obj)` returns it (in CPython, the address). `a is b` compares identity.
- **Type** — determines the supported operations; `type(obj)`. (Assignable to `__class__` only under narrow layout-compatibility rules.)
- **Value** — may or may not change. Objects whose value can change are **mutable**.

```python
import sys

for obj in (0, 2**100, 1.0, "a", "é", [], [1, 2, 3], {}, (), object()):
    print(f"{type(obj).__name__:>6} {sys.getsizeof(obj):>3}")
```

CPython 3.13, 64-bit build:

```text
   int  28
   int  40
 float  24
   str  42
   str  61
  list  56
  list  88
  dict  64
 tuple  40
object  16
```

Three lessons. An `int` is 28 bytes, not 4 or 8 — a Python list of a million ints costs ~36 MB (8-byte pointer + 28-byte object), versus 8 MB for a NumPy `int64` array. Strings choose a per-character width (1, 2 or 4 bytes, PEP 393) from their widest character, so one `'é'` changes the representation. And `getsizeof` is **shallow**:

```python
import sys

nested = [[0] * 1000]
print(sys.getsizeof(nested), sys.getsizeof(nested[0]))
```

```text
64 8056
```

The outer list reports 64 bytes; the inner list it points to is 8 KB. For deep sizes, walk references (`gc.get_referents`) or measure the process with `tracemalloc` ([Chapter 21](./21_profiling_and_optimization.md)).

---

## Names Are Bindings

Assignment never copies. `b = a` makes the name `b` refer to the same object as `a`:

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a, a is b)
```

```text
[1, 2, 3, 4] True
```

**Rebinding vs mutating** is the distinction that matters. `b = b + [5]` builds a new list and rebinds `b`; `b += [5]` calls `list.__iadd__`, which mutates in place and then rebinds `b` to the same object. For immutable types, `+=` necessarily rebinds to a new object:

```python
a = [1]; b = a; b += [2];      print(a)   # mutated through b
a = [1]; b = a; b = b + [2];   print(a)   # b now refers to a new list
t = (1,); u = t; u += (2,);    print(t)   # tuples cannot mutate
```

```text
[1, 2]
[1]
(1,)
```

The augmented-assignment protocol (try `__iadd__`, fall back to `__add__`, then rebind) produces one of the stranger corner cases in the language — the operation succeeds *and* raises:

```python
t = ([1],)
try:
    t[0] += [2]
except TypeError as e:
    print("TypeError:", e)
print(t)
```

```text
TypeError: 'tuple' object does not support item assignment
([1, 2],)
```

`list.__iadd__` mutated the inner list, then `STORE_SUBSCR` into the tuple failed.

### Shallow and deep copies

| Operation | New outer object? | New inner objects? | Choose this when |
|-----------|:---:|:---:|-------------------|
| **`b = a`** | no | no | you want a second name, not a copy |
| **`a[:]`, `list(a)`, `a.copy()`, `copy.copy(a)`** | yes | no | elements are immutable, or sharing them is intended |
| **`copy.deepcopy(a)`** | yes | yes (memoised, cycle-safe) | nested mutable state must be independent — and you accept the cost |

```python
import copy

grid = [[0] * 3] * 3          # three references to ONE row
grid[0][0] = 1
print(grid)
grid = [[0] * 3 for _ in range(3)]
grid[0][0] = 1
print(grid)
print(copy.deepcopy(grid) == grid, copy.deepcopy(grid)[0] is grid[0])
```

```text
[[1, 0, 0], [1, 0, 0], [1, 0, 0]]
[[1, 0, 0], [0, 0, 0], [0, 0, 0]]
True False
```

`[[0] * 3] * 3` is the most common way to get a DP table wrong ([Chapter 15](./15_dynamic_programming_foundations.md)): sequence repetition copies *references*.

---

## The Mutable Default Argument

Default values are evaluated **once**, when `def` executes, and stored on the function object (`__defaults__`). A mutable default is therefore shared by every call that doesn't pass the argument:

```python
def append_to(item, bucket=[]):
    bucket.append(item)
    return bucket

print(append_to(1), append_to(2), append_to.__defaults__)
```

```text
[1, 2] [1, 2] ([1, 2],)
```

The idiom is a sentinel:

```python
def append_to(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

print(append_to(1), append_to(2))
```

```text
[1] [2]
```

When `None` is itself a meaningful argument, use a private sentinel object: `_MISSING = object()`, then `if bucket is _MISSING`. The same evaluated-once rule makes a default argument the classic workaround for late-binding closures ([Chapter 3](./03_scope_closures_and_binding.md)).

---

## `is` Versus `==`

`==` calls `__eq__` and asks "same value?"; `is` compares identity and cannot be overridden. Use `is` only for singletons (`None`, `True`, `False`, `NotImplemented`, `Ellipsis`, sentinels) and when you truly mean identity.

CPython caches small integers (−5 to 256) and interns many strings, which makes `is` *appear* to work on values — until it doesn't:

```python
x = 256; y = 256
print(x is y)                        # cached small int
print(int("1000") is int("1000"))    # two separate objects
print(1000 == 1000.0, hash(1000) == hash(1000.0))
```

```text
True
False
True True
```

Both caches are implementation details; code that depends on them is wrong. Note the last line: values that compare equal must hash equal, across types — the `__eq__`/`__hash__` contract is in [Chapter 4](./04_the_data_model_and_attribute_lookup.md).

---

## Reference Counting

| | |
|---|---|
| **Mechanism** | Deterministic reference counting |
| **Defined in** | `Include/object.h` (`Py_INCREF`, `Py_DECREF`), `Objects/object.c` |
| **Since** | Always; biased refcounting in the free-threaded build (PEP 703) |
| **Hooks into** | Every binding, container insertion, argument pass |
| **Typical use** | Automatic; deterministic freeing of files, locks, GPU tensors |
| **Cost** | An increment/decrement on almost every operation |
| **Prefer instead** | n/a |
| **Failure modes** | Cycles are never freed by refcounting alone; `__del__` timing differs on PyPy |

Each reference adds one to `ob_refcnt`; when the count reaches zero the object is deallocated *immediately*, its type's `tp_dealloc` runs, and the references it held are released in turn.

```python
import sys

a = [1]
print(sys.getrefcount(a))   # the name a, plus getrefcount's own argument
b = a
print(sys.getrefcount(a))
del b
print(sys.getrefcount(a))
```

```text
2
3
2
```

Deterministic freeing is why `open(...)` without `with` usually closes promptly in CPython and why a PyTorch tensor's GPU memory is returned to the caching allocator the moment the last name to it goes away. It is **not** a language guarantee — PyPy and GraalPy use tracing GCs — so resources must still be closed with `with` ([Chapter 5](./05_iterators_generators_and_coroutines.md)).

### Immortal objects

Since 3.12 (PEP 683), objects such as `None`, `True`, small ints and interned strings are **immortal**: their refcount is pinned to a sentinel and `Py_INCREF`/`Py_DECREF` leave it untouched. This avoids cache-line writes to shared objects and is a prerequisite for both per-interpreter GILs and free threading.

```python
import sys
print(sys.getrefcount(None) > 10**9)
```

```text
True
```

---

## The Cycle Collector

Reference counting cannot free a cycle: each object in it keeps the others' counts above zero.

```python
import gc

class Node:
    def __init__(self):
        self.other = None

gc.collect()
a, b = Node(), Node()
a.other, b.other = b, a
del a, b                    # unreachable, but each refcount is still 1
print("collected:", gc.collect() >= 2)
```

```text
collected: True
```

The collector (`Python/gc.c`) tracks only *container* objects (those that can hold references). To find garbage it copies each tracked object's refcount, subtracts references that come from *other tracked objects*, and anything left at zero is reachable only from inside the set — unreachable from the outside world. Objects surviving a collection are promoted; older objects are scanned less often (thresholds in `gc.get_threshold()`; 3.14 switched the default build to an incremental collector to bound pause times).

**When it matters in ML code.** Cycles that hold large tensors (a model referencing a callback that references the trainer that references the model) are freed only when the collector runs, so GPU memory may appear to "leak" until a `gc.collect()`. Break the cycle with a weak reference, or delete explicitly.

---

## Weak References

| | |
|---|---|
| **Mechanism** | `weakref.ref`, `WeakValueDictionary`, `WeakKeyDictionary`, `finalize` |
| **Defined in** | `Lib/weakref.py`, `Objects/weakrefobject.c`; PEP 205 |
| **Since** | 2.1 |
| **Hooks into** | The object's weakref list, cleared at deallocation |
| **Typical use** | Caches that must not keep keys alive; back-pointers (child → parent); observer lists |
| **Cost** | One extra pointer per object for types that support it (`__weakref__` slot) |
| **Prefer instead** | Explicit lifetimes (`with`, `close()`) where possible |
| **Failure modes** | `int`, `str`, `tuple`, `list` instances cannot be weakly referenced; dereferencing returns `None` after collection |

```python
import weakref

class Model:
    pass

m = Model()
r = weakref.ref(m)
print(r() is m)
del m
print(r())
```

```text
True
None
```

`weakref.finalize(obj, fn, *args)` is the safe replacement for `__del__`: it runs `fn` when `obj` dies, survives interpreter shutdown ordering better, and cannot resurrect the object. `__del__` methods can resurrect `self`, run at unpredictable times on other implementations, and swallow exceptions (printed to stderr, never raised).

---

## Attribute Storage and `__slots__`

An ordinary instance stores attributes in a per-instance dict. Since 3.11–3.13 CPython stores them as **inline values** and only materialises a real `dict` when something asks for `__dict__` — which is why the measurement below depends on whether you look:

```python
import sys

class P:
    def __init__(self):
        self.x, self.y = 1, 2

class S:
    __slots__ = ("x", "y")
    def __init__(self):
        self.x, self.y = 1, 2

p = P()
print(sys.getsizeof(p), sys.getsizeof(S()))
print(sys.getsizeof(p.__dict__))   # asking for __dict__ materialises it
```

```text
48 48
296
```

`__slots__` replaces the per-instance dict with fixed descriptors on the class ([Chapter 10](./10_descriptors.md)): it removes the possibility of a 300-byte materialised dict, forbids typo'd attributes, and gives predictable memory for millions of small objects. It costs flexibility (no ad-hoc attributes, no `__weakref__` unless listed, multiple-inheritance layout conflicts). Use it for record-like classes created in bulk; `@dataclass(slots=True)` (3.10+) generates it for you.

---

## Key Takeaways

- A name is a binding in a namespace; an object has identity, type and value. Assignment binds; it never copies.
- `+=` on a mutable object mutates in place *and* rebinds; on an immutable one it only rebinds — the difference is visible through aliases.
- Defaults are evaluated once at `def` time; mutable defaults are shared state. Use a `None` or private sentinel.
- `is` is identity and is correct only for singletons and sentinels; small-int caching and string interning are implementation details.
- CPython frees objects deterministically when their refcount hits zero; cycles wait for the generational (3.14: incremental) collector.
- `sys.getsizeof` is shallow and includes only the object itself; Python ints are 28+ bytes, so bulk numeric data belongs in arrays.
- Use `weakref` for caches and back-pointers and `weakref.finalize` instead of `__del__`.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Python Language Reference §3.1 — Objects, values and types | Python docs | docs.python.org/3/reference/datamodel.html | Identity, type, value; mutability definitions |
| PEP 393 — Flexible String Representation | v. Löwis, 2010 | peps.python.org/pep-0393 | 1/2/4-byte string kinds |
| PEP 683 — Immortal Objects | Snow, Eric & Trejo, 2022 | peps.python.org/pep-0683 | Immortal refcounts in 3.12 |
| PEP 205 — Weak References | Drake, 2000 | peps.python.org/pep-0205 | Weak reference semantics |
| PEP 703 — Making the GIL Optional | Gross, 2023 | peps.python.org/pep-0703 | Biased reference counting in free-threaded builds |
| `Include/object.h`, `Python/gc.c`, `InternalDocs/garbage_collector.md` | CPython | github.com/python/cpython | Header layout, the cycle-detection algorithm |
| `gc` module docs | Python docs | docs.python.org/3/library/gc.html | Thresholds, generations, incremental GC in 3.14 |

---

**Next:** [Chapter 3 — Scope, Closures & Binding](./03_scope_closures_and_binding.md) — which namespace a name is looked up in, and how inner functions keep outer names alive.
