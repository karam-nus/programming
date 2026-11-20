---
title: "Chapter 3 — Scope, Closures & Binding"
---

[← Back to Table of Contents](./README.md)

# Chapter 3 — Scope, Closures & Binding

> *"Python decides where a name lives before your code runs, and decides what it refers to only when your code asks."*

## Overview

Scope answers *which namespace* a name is resolved in; binding answers *which object* it refers to at that moment. Python fixes the first at compile time (the symbol table of [Chapter 1](./01_from_source_to_bytecode.md)) and the second at run time. Every closure bug — `UnboundLocalError`, the loop of lambdas that all return the last value, a class body that can't see its own names — is a mismatch between those two moments. Decorators ([Chapter 9](./09_decorators.md)) are closures, so this chapter is their prerequisite.

<div class="diagram">
<div class="diagram-title">LEGB — the resolution order for a name read inside a function</div>
<div class="layer-stack">
  <div class="layer accent">L — Local: the function's own slots (LOAD_FAST)</div>
  <div class="layer purple">E — Enclosing: cells of enclosing functions (LOAD_DEREF)</div>
  <div class="layer orange">G — Global: the module's __dict__ (LOAD_GLOBAL)</div>
  <div class="layer green">B — Builtins: builtins.__dict__ (LOAD_GLOBAL fallback)</div>
</div>
</div>

---

## Scope Is Decided at Compile Time

The compiler classifies each name once per code block. The decisive rule:

> If a name is **bound** anywhere in a function body — by assignment, augmented assignment, `for` target, `with … as`, `except … as`, `import`, `def`, `class`, or a walrus — it is local to that function for the **entire** body, unless declared `global` or `nonlocal`.

The instruction emitted follows from the classification: `LOAD_FAST` for locals, `LOAD_DEREF` for closure cells, `LOAD_GLOBAL` for everything else. There is no runtime search through scopes for a local: the compiler has already chosen the instruction.

### `UnboundLocalError` explained

```python
count = 0

def increment():
    try:
        count += 1          # count is local here, because it is assigned here
    except UnboundLocalError as e:
        print("UnboundLocalError:", e)

increment()
```

```text
UnboundLocalError: cannot access local variable 'count' where it is not associated with a value
```

The augmented assignment binds `count`, so the compiler made `count` local for the whole function and emitted `LOAD_FAST count` for the read half of `+=`. The local slot is empty, so the load fails. The global `count = 0` is never consulted. The fix is to say what you mean:

<div class="comic">
<div class="panel"><span class="cap">compile time</span><div class="who">Compiler</div><div class="bubble">Scanning <code>increment()</code>… I see <code>count += 1</code>. That <em>assigns</em> count.</div><div class="bubble think">So count is LOCAL for the whole function. Emit <code>LOAD_FAST count</code>.</div></div>
<div class="panel"><span class="cap">run time</span><div class="who">You</div><div class="bubble r">But <code>count = 0</code> is right there at module level!</div><div class="who">Interpreter</div><div class="bubble">Slot <code>count</code> in this frame is empty. I never look at globals for a local.</div></div>
<div class="panel dark"><div class="sfx">UnboundLocalError!</div><div class="bubble">cannot access local variable 'count' where it is not associated with a value</div></div>
<div class="panel"><span class="cap">the fix</span><div class="who">You</div><div class="bubble r">Say what I mean: <code>global count</code> — or better, pass the value in and return the new one.</div></div>
</div>

| Declaration | Effect | Choose this when |
|-------------|--------|------------------|
| **`global count`** | binds/reads the module-level name | true module state (rare; prefer passing values or an object) |
| **`nonlocal count`** | binds/reads the nearest enclosing *function* scope's name | a closure that maintains a counter or accumulator |
| **neither** | name is local if assigned, else free/global | the default — almost always |

`nonlocal` requires the name to exist in an enclosing function scope at compile time; it can never refer to a module global.

---

## Closures and Cells

| | |
|---|---|
| **Mechanism** | Closure: a function object carrying cells for its free variables |
| **Defined in** | Language Reference §4.2 "Naming and binding"; `Objects/cellobject.c`, `Python/compile.c` |
| **Since** | 2.2 (nested scopes, PEP 227); `nonlocal` 3.0 (PEP 3104) |
| **Hooks into** | `MAKE_CELL`, `LOAD_DEREF`/`STORE_DEREF`, `func.__closure__` |
| **Typical use** | Decorators, callbacks, factories, partial application |
| **Cost** | One indirection per access (cell → object); negligible |
| **Prefer instead** | A small class when the closure grows more than one or two pieces of mutable state |
| **Failure modes** | Late binding in loops; capturing large objects keeps them alive |

When an inner function reads a name of an enclosing function, the compiler turns that name into a **cell variable** in the outer function and a **free variable** in the inner. A cell is a tiny heap box containing one reference. Both functions access the variable through the same box, so the inner function sees *rebinding* done by the outer, and vice versa (with `nonlocal`).

```python
def make_counter():
    n = 0
    def step():
        nonlocal n
        n += 1
        return n
    return step

c = make_counter()
c(); c()
print(c(), c.__code__.co_freevars, c.__closure__[0].cell_contents)
print(make_counter.__code__.co_cellvars)
```

```text
3 ('n',) 3
('n',)
```

<div class="callstack">
  <div class="frame"><div class="frame-name">&lt;module&gt;</div><div class="frame-body">c = make_counter()  # make_counter's frame is gone after return</div></div>
  <div class="frame accent"><div class="frame-name">step()</div><div class="frame-body">LOAD_DEREF n → cell → int 3 · the cell outlives make_counter's frame</div></div>
</div>
<div class="callstack-label">The cell, not the frame, keeps n alive</div>

The outer frame is discarded when `make_counter` returns; the cell survives because the function object `step` references it through `__closure__`. That is the whole mechanism of a closure.

---

## Late Binding: The Loop-of-Lambdas Bug

A closure captures the **variable** (the cell), not the **value** at the time the inner function was defined. If the variable is rebound later, every closure sees the latest binding:

```python
callbacks = [lambda: i for i in range(3)]
print([f() for f in callbacks])
```

```text
[2, 2, 2]
```

<div class="svgfig">
<svg viewBox="0 0 820 250" width="820" role="img" aria-label="Late binding: three closures share one cell; the default-argument fix gives each its own value">
<text x="20" y="24" class="th" style="fill:#fca5a5">late binding: three closures, ONE cell</text>
<text x="440" y="24" class="th" style="fill:#4ade80">lambda i=i: i — one default per closure</text>
<rect x="20" y="44" width="150" height="34" rx="6" class="box"/><text x="95" y="61" text-anchor="middle" class="tm">callbacks[0]</text>
<rect x="20" y="104" width="150" height="34" rx="6" class="box"/><text x="95" y="121" text-anchor="middle" class="tm">callbacks[1]</text>
<rect x="20" y="164" width="150" height="34" rx="6" class="box"/><text x="95" y="181" text-anchor="middle" class="tm">callbacks[2]</text>
<rect x="250" y="94" width="130" height="54" rx="8" fill="#2a1622" stroke="#f9a8d4" stroke-width="2"/><text x="315" y="113" text-anchor="middle" class="ts">cell for i</text><text x="315" y="134" text-anchor="middle" class="tm" style="fill:#f9a8d4">→ 2</text>
<path d="M170 61 C 210 61, 220 110, 250 112" class="ln warn"/><path d="M170 121 L250 121" class="ln warn"/><path d="M170 181 C 210 181, 220 132, 250 130" class="ln warn"/>
<text x="20" y="228" class="ts">every call reads the cell after the loop → 2, 2, 2</text>
<rect x="440" y="44" width="150" height="34" rx="6" class="box"/><text x="515" y="61" text-anchor="middle" class="tm">by_default[0]</text>
<rect x="440" y="104" width="150" height="34" rx="6" class="box"/><text x="515" y="121" text-anchor="middle" class="tm">by_default[1]</text>
<rect x="440" y="164" width="150" height="34" rx="6" class="box"/><text x="515" y="181" text-anchor="middle" class="tm">by_default[2]</text>
<rect x="650" y="44" width="150" height="34" rx="6" fill="#12221a" stroke="#4ade80"/><text x="725" y="61" text-anchor="middle" class="tm">__defaults__ (0,)</text>
<rect x="650" y="104" width="150" height="34" rx="6" fill="#12221a" stroke="#4ade80"/><text x="725" y="121" text-anchor="middle" class="tm">__defaults__ (1,)</text>
<rect x="650" y="164" width="150" height="34" rx="6" fill="#12221a" stroke="#4ade80"/><text x="725" y="181" text-anchor="middle" class="tm">__defaults__ (2,)</text>
<path d="M590 61 L650 61" class="ln hot"/><path d="M590 121 L650 121" class="ln hot"/><path d="M590 181 L650 181" class="ln hot"/>
<text x="440" y="228" class="ts">each function object keeps its own value → 0, 1, 2</text>
</svg>
</div>

All three lambdas close over the same `i`, which is `2` when they finally run. Three fixes, in order of preference:

```python
import functools

by_default = [lambda i=i: i for i in range(3)]               # default evaluated at def time
by_factory = [(lambda k: (lambda: k))(i) for i in range(3)]  # a new scope per iteration
by_partial = [functools.partial(lambda k: k, i) for i in range(3)]
print([f() for f in by_default], [f() for f in by_factory], [f() for f in by_partial])
```

```text
[0, 1, 2] [0, 1, 2] [0, 1, 2]
```

The default-argument trick works because defaults are evaluated once when `def`/`lambda` executes ([Chapter 2](./02_objects_names_and_memory.md)). Its cost is that the callable now has an optional parameter a caller could override; `functools.partial` is explicit and introspectable, and is what you should reach for in library code. This bug shows up in ML code when registering hooks in a loop: `for name, m in model.named_modules(): m.register_forward_hook(lambda *a: log(name))` logs only the last module's name.

---

## Comprehension Scope

Comprehensions have their own scope: the loop variable doesn't leak.

```python
x = "outer"
squares = [x * x for x in range(4)]
print(x, squares)
```

```text
outer [0, 1, 4, 9]
```

Historically (≤ 3.11) a list comprehension compiled to a hidden nested function called immediately. **PEP 709 (3.12)** inlined list, dict and set comprehensions into the enclosing function's bytecode — faster (no function object or frame per comprehension) — while preserving the isolation semantics. Generator expressions are still separate functions, because they must suspend. One semantic edge survived: the *first* iterable is evaluated in the enclosing scope, the rest inside the comprehension.

The walrus operator (`:=`) inside a comprehension deliberately binds in the **enclosing** function scope, which is what makes "find the first match" idioms work:

```python
data = [3, 8, 12, 5]
if any((hit := v) > 10 for v in data):
    print("first > 10:", hit)
```

```text
first > 10: 12
```

---

## Class Bodies Are Not Enclosing Scopes

A class body executes as a code block whose namespace becomes the class dict ([Chapter 11](./11_metaclasses_and_class_creation.md)). Names defined there are **not** visible to functions defined inside it — methods must go through `self` or the class name — and the same exclusion applies to the *body* of a comprehension written in the class body:

```python
class Config:
    base = 10
    sizes = [k * 2 for k in range(base)][:3]     # first iterable: evaluated in class scope
    try:
        scaled = [base * k for k in range(3)]    # body: cannot see class-level names
    except NameError as e:
        scaled = f"NameError: {e}"

print(Config.sizes, Config.scaled)
```

```text
[0, 2, 4] NameError: name 'base' is not defined
```

The outermost iterable of a comprehension is evaluated in the enclosing scope and passed in; everything else runs in the comprehension's own scope, which skips class bodies exactly as methods do. PEP 709 inlined comprehensions in 3.12 but deliberately preserved this behaviour (verified on 3.11, 3.12 and 3.13). The fix is to move the computation into a function, or to bind the class-level value as the first iterable (`[b * k for b in [base] for k in range(3)]`).

| Code block | Can see enclosing function locals? | Can see class-body names? | Rebinds via |
|------------|:---:|:---:|----------|
| **Function** | yes (as free variables) | no (use `self`/`cls`) | `nonlocal`, `global` |
| **Class body** | yes | its own, yes | plain assignment (into class dict) |
| **Method inside a class** | yes (skips the class scope) | no | `nonlocal` cannot target a class scope |
| **Comprehension** | yes | only in its first iterable | walrus binds in the enclosing function |

The one magic name inside methods is `__class__`: if a method uses `super()` or `__class__`, the compiler creates an implicit closure cell holding the class being defined. That is how zero-argument `super()` finds its class ([Chapter 4](./04_the_data_model_and_attribute_lookup.md)).

---

## Globals, Builtins, and Shadowing

`LOAD_GLOBAL` checks the module's `__dict__` and then `__builtins__`. A module-level name that shadows a builtin (`list = [...]`, `id = 3`, `input = ...`) silently changes every later use of that name in the module:

```python
import builtins

def total(xs):
    return sum(xs)

sum = lambda xs: "shadowed!"
print(total([1, 2]))
del sum
print(total([1, 2]), builtins.sum is sum)
```

```text
shadowed!
3 True
```

Because the resolution happens at call time, monkeypatching a module global affects functions already defined in that module — the basis of `unittest.mock.patch("pkg.module.name")`, and the reason you must patch the name *where it is looked up*, not where it is defined ([Chapter 12](./12_introspection_ast_and_codegen.md)).

---

## `locals()`, `globals()`, and `exec`

`globals()` returns the live module dict; writes take effect. Inside a function, `locals()` returns a dict **snapshot** of the fast-local array; writing to it has never rebound a real local. PEP 667 (3.13) made this precise: in a function `locals()` returns an independent snapshot each call, and `frame.f_locals` returns a *write-through proxy* — the mechanism debuggers use to change a variable.

```python
def f():
    x = 1
    locals()["x"] = 99
    return x

print(f())
```

```text
1
```

Consequently, `exec("y = 2")` inside a function cannot create a local `y` that later code can read by plain name. Pass an explicit namespace dict to `exec` and read from it ([Chapter 12](./12_introspection_ast_and_codegen.md)).

---

## Key Takeaways

- The compiler fixes each name's scope (local, cell, free, global) from the presence of bindings; runtime never searches for a local.
- `UnboundLocalError` is a read of a name the compiler made local because it is assigned somewhere in the function.
- A closure captures cells — variables — not values; late binding in loops is a direct consequence, fixed by `functools.partial`, a factory, or a default argument.
- Comprehensions isolate their loop variable; since 3.12 most are inlined (PEP 709) without changing semantics, a class body's names are visible only to the first iterable, and the walrus binds in the enclosing function by design.
- Class bodies are not enclosing scopes for methods; zero-argument `super()` works through an implicit `__class__` cell.
- Globals and builtins are resolved at call time, so shadowing and patching affect already-defined functions — patch where the name is looked up.
- In functions, `locals()` is a snapshot; `frame.f_locals` (3.13, PEP 667) is the write-through view.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Language Reference §4.2 — Naming and binding | Python docs | docs.python.org/3/reference/executionmodel.html | The binding rule, class-scope exclusion, `global`/`nonlocal` |
| PEP 227 — Statically Nested Scopes | Hylton, 2000 | peps.python.org/pep-0227 | Closures and free variables |
| PEP 3104 — Access to Names in Outer Scopes | Yee, 2006 | peps.python.org/pep-3104 | `nonlocal` |
| PEP 572 — Assignment Expressions | Angelico, Peters, van Rossum, 2018 | peps.python.org/pep-0572 | Walrus scope inside comprehensions |
| PEP 709 — Inlined comprehensions | Meyer, 2023 | peps.python.org/pep-0709 | Comprehension inlining in 3.12, with class-scope semantics preserved |
| PEP 667 — Consistent views of namespaces | Shannon, Galindo, 2021 | peps.python.org/pep-0667 | `locals()` snapshot vs `f_locals` proxy (3.13) |
| `Python/symtable.c`, `Objects/cellobject.c` | CPython | github.com/python/cpython | Scope classification, cell objects |

---

**Next:** [Chapter 4 — The Data Model & Attribute Lookup](./04_the_data_model_and_attribute_lookup.md) — names resolved, now attributes: the algorithm behind every `.`.
