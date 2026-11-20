---
title: "Chapter 9 — Decorators"
---

[← Back to Table of Contents](./README.md)

# Chapter 9 — Decorators

> *"`@d` is one line of syntax for one line of code: `f = d(f)`. Everything else is what you choose to return."*

## Overview

Metaprogramming is code that inspects, generates or modifies code. Python offers it at six levels of power and danger; this chapter lays out that ladder and then covers the lowest and most-used rung, the decorator, in full: the desugaring, `functools.wraps`, decorator factories, stateful decorators, decorating methods and classes, and typing decorators so that checkers still understand the decorated function. It assumes closures ([Chapter 3](./03_scope_closures_and_binding.md)) and function objects ([Chapter 1](./01_from_source_to_bytecode.md)).

<div class="diagram">
<div class="diagram-title">The metaprogramming ladder — use the lowest rung that solves the problem</div>
<div class="layer-stack">
  <div class="layer green">1. Decorator — wrap or register a function/class after it is built (this chapter)</div>
  <div class="layer teal">2. Descriptor — intercept attribute access on one attribute (Ch 10)</div>
  <div class="layer cyan">3. __init_subclass__ / class decorator — act on every subclass at creation (Ch 11)</div>
  <div class="layer purple">4. Metaclass — control how the class object itself is created and behaves (Ch 11)</div>
  <div class="layer orange">5. AST / code generation — rewrite or generate source (Ch 12)</div>
  <div class="layer red">6. Import hooks / frame-evaluation hooks — change how modules load or how code runs (Ch 12)</div>
</div>
</div>

Each rung up is more powerful, affects more code at a distance, and is harder to debug. Most problems that look like they need a metaclass are solved by `__init_subclass__`; most that look like they need AST rewriting are solved by a decorator. This ladder is the "code is data" thread referenced throughout the book.

---

## Decorators Desugared

| | |
|---|---|
| **Mechanism** | `@expr` above a `def`/`class` rebinds the name to `expr(obj)` |
| **Defined in** | Language Reference §8.7 / §8.8; PEP 318 (functions), PEP 3129 (classes), PEP 614 (any expression) |
| **Since** | 2.4 (functions), 3.0 (classes), 3.9 (arbitrary expressions) |
| **Hooks into** | Executes once, at definition time, after the function object is created |
| **Typical use** | Logging, timing, caching, retry, registration, access control, `torch.no_grad`, `pytest.fixture` |
| **Cost** | Definition time: one call. Per call: whatever the wrapper does — a closure-based wrapper adds one Python call (~2× a bare call) |
| **Prefer instead** | A plain function call at the call site when only one place needs the behaviour |
| **Failure modes** | Lost metadata without `wraps`; decorator order; decorating methods with stateful decorators shares state across instances |

These two are exactly equivalent, except that the decorated form never binds the undecorated function to the name:

```python
# illustrative
@decorator
def f(): ...

def f(): ...
f = decorator(f)
```

Stacked decorators apply **bottom-up** (nearest the `def` first), and the result runs **top-down** at call time:

```python
def tag(label):
    def deco(fn):
        def wrapper(*args, **kwargs):
            return f"<{label}>{fn(*args, **kwargs)}</{label}>"
        return wrapper
    return deco

@tag("b")
@tag("i")
def hello():
    return "hi"

print(hello())     # tag("b")(tag("i")(hello))
```

```text
<b><i>hi</i></b>
```

A decorator is any callable that takes the object and returns something. It need not return a wrapper; it can return the original function after recording it (**registration**), a different kind of object (a descriptor, a class instance), or even `None` (rarely useful, always confusing).

```python
REGISTRY = {}

def register(fn):
    REGISTRY[fn.__name__] = fn
    return fn                       # unchanged: zero per-call overhead

@register
def relu(x): return max(0.0, x)

@register
def identity(x): return x

print(sorted(REGISTRY), REGISTRY["relu"](-2.0))
```

```text
['identity', 'relu'] 0.0
```

Registration decorators are how plugin systems, CLI frameworks (`@app.command()`), routing (`@app.get("/")`), and model zoos (`@register_model`) work. The registry pattern in [Design Patterns ch. 6](https://karam-nus.github.io/design-patterns/06_registry) is this mechanism.

---

## The Wrapper Template and `functools.wraps`

The canonical wrapping decorator:

```python
import functools, time

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            wrapper.last_seconds = time.perf_counter() - t0
    wrapper.last_seconds = None
    return wrapper

@timed
def train_step(batch, *, lr=0.1):
    """One optimisation step."""
    return sum(batch) * lr

print(train_step([1, 2, 3]), train_step.__name__, train_step.__doc__)
print(train_step.__wrapped__.__name__, train_step.last_seconds >= 0)
```

```text
0.6000000000000001 train_step One optimisation step.
train_step True
```

Without `@functools.wraps(fn)`, `train_step.__name__` would be `'wrapper'` and its docstring `None` — which breaks logging, `pytest` test discovery by name, Sphinx docs, `pickle` (functions are pickled by qualified name), and debuggers. `wraps` copies `__module__`, `__name__`, `__qualname__`, `__doc__`, `__dict__`, `__annotations__` (and `__type_params__`, 3.12+), and sets `__wrapped__` to the original. `inspect.signature` follows `__wrapped__`, so the decorated function reports the original's signature:

```python
import inspect
print(inspect.signature(train_step))
```

```text
(batch, *, lr=0.1)
```

`try/finally` matters: the timing is recorded even if `fn` raises, and the exception propagates unchanged. A decorator should never swallow exceptions unless that is its stated purpose.

---

## Decorator Factories: Decorators With Arguments

`@retry(times=3)` is a call that must *return* a decorator — three levels of nesting:

```python
import functools

def retry(times=3, exceptions=(Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == times:
                        raise
                    print(f"attempt {attempt} failed: {e}")
        return wrapper
    return decorator

calls = iter([ConnectionError("reset"), ConnectionError("reset"), "ok"])

@retry(times=3, exceptions=(ConnectionError,))
def fetch():
    r = next(calls)
    if isinstance(r, Exception):
        raise r
    return r

print(fetch())
```

```text
attempt 1 failed: reset
attempt 2 failed: reset
ok
```

### Supporting both `@deco` and `@deco(...)`

Libraries such as `dataclasses.dataclass` and `functools.lru_cache` accept both forms. The trick: if the first positional argument is callable and no other arguments were given, you were applied directly.

```python
import functools

def traced(fn=None, *, prefix="call"):
    if fn is None:                                   # used as @traced(prefix=...)
        return functools.partial(traced, prefix=prefix)
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        print(f"{prefix}: {fn.__name__}{args}")
        return fn(*args, **kwargs)
    return wrapper

@traced
def a(x): return x

@traced(prefix="TRACE")
def b(x): return x

a(1); b(2)
```

```text
call: a(1,)
TRACE: b(2,)
```

Making the options keyword-only (`*, prefix`) is what makes this unambiguous: a positional callable can only be the decorated function.

---

## Stateful Decorators and Classes as Decorators

State that must persist across calls lives either in the closure (`nonlocal`), as an attribute on the wrapper, or in a class instance whose `__call__` is the wrapper:

```python
import functools

class CountCalls:
    def __init__(self, fn):
        functools.update_wrapper(self, fn)
        self.fn, self.calls = fn, 0
    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.fn(*args, **kwargs)

@CountCalls
def predict(x):
    return 2 * x

predict(1); predict(2)
print(predict.calls, predict.__name__)
```

```text
2 predict
```

### The method-decoration trap

A class-based decorator applied to a **method** breaks: the result is a `CountCalls` instance stored on the class, and since `CountCalls` has no `__get__`, accessing `obj.method` does not bind `self` ([Chapter 10](./10_descriptors.md) explains binding). A function-based wrapper works because functions *are* descriptors.

```python
class Model:
    @CountCalls
    def forward(self, x):
        return x

try:
    Model().forward(3)
except TypeError as e:
    print("TypeError:", e)
```

```text
TypeError: Model.forward() missing 1 required positional argument: 'x'
```

The fix is to make the decorator a descriptor by adding `__get__` that returns a bound version (`types.MethodType(self, obj)`) — or, simpler, write function-based decorators. Note also that `calls` is shared by every instance of `Model`, since there is one decorator object per *class attribute*, not per instance. Per-instance caches on methods (`functools.lru_cache` on a method) have the same sharing and additionally keep every `self` alive forever as a cache key; use `functools.cached_property`, or a cache keyed on a weak reference.

---

## Class Decorators

A class decorator receives the finished class and returns a class — usually the same one, modified. It runs once, after the class body and metaclass have done their work, which makes it the right tool for "add generated methods to this one class":

```python
def auto_repr(cls):
    fields = list(cls.__init__.__code__.co_varnames[1:cls.__init__.__code__.co_argcount])
    def __repr__(self):
        args = ", ".join(f"{f}={getattr(self, f)!r}" for f in fields)
        return f"{cls.__name__}({args})"
    cls.__repr__ = __repr__
    return cls

@auto_repr
class Optim:
    def __init__(self, lr, momentum=0.9):
        self.lr, self.momentum = lr, momentum

print(Optim(0.01))
```

```text
Optim(lr=0.01, momentum=0.9)
```

`@dataclass` is the industrial version: it reads `__annotations__`, generates `__init__`, `__repr__`, `__eq__` (and optionally `__hash__`, ordering, `__slots__`, `__match_args__`) as source text, and `exec`s it — see [Chapter 11](./11_metaclasses_and_class_creation.md). Class decorators do **not** propagate to subclasses; when every subclass must be processed, use `__init_subclass__` (rung 3).

---

## Typing Decorators With `ParamSpec`

A naive annotation erases the signature: `def timed(fn: Callable[..., T]) -> Callable[..., T]` tells the type checker the decorated function accepts anything. `ParamSpec` (PEP 612, 3.10+) captures the parameter list so the wrapper preserves it; with PEP 695 syntax (3.12+) the type parameters are declared inline:

```python
import functools
from collections.abc import Callable

def logged[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print("calling", fn.__name__)
        return fn(*args, **kwargs)
    return wrapper

@logged
def scale(x: float, *, by: float = 2.0) -> float:
    return x * by

print(scale(3.0, by=3.0))
# scale("a", by=1)   ← a type checker now rejects this: str is not float
```

```text
calling scale
9.0
```

When the decorator *adds* a parameter (e.g. injects a `session`), use `Concatenate[Session, P]` to describe the transformation. [Chapter 7](./07_types_and_static_typing.md) covers `ParamSpec`, `Concatenate` and variance in full.

---

## Decorators in the Wild

| Decorator | What it returns | Mechanism | Choose this when |
|-----------|-----------------|-----------|------------------|
| **`functools.cache` / `lru_cache`** | a C wrapper with a dict keyed on args | memoization — [Chapter 15](./15_dynamic_programming_foundations.md) | pure function, hashable args, repeated calls |
| **`functools.singledispatch`** | a dispatcher choosing an implementation by the first arg's type | registry + MRO lookup | open-ended per-type behaviour ([Chapter 6](./06_functional_programming.md)) |
| **`property`, `classmethod`, `staticmethod`** | descriptor objects | [Chapter 10](./10_descriptors.md) | attribute-level behaviour on a class |
| **`dataclasses.dataclass`** | the same class, with generated methods | `exec`'d source | record types |
| **`contextlib.contextmanager`** | a factory of context managers | generator split at `yield` — [Chapter 5](./05_iterators_generators_and_coroutines.md) | setup/teardown pairs |
| **`torch.no_grad()`** | context-manager object usable as decorator | `__call__` wraps fn in `with self:` | disabling autograd for a whole function |
| **`torch.compile`** | an optimized module/function wrapper | frame-evaluation hook (PEP 523) — [Chapter 12](./12_introspection_ast_and_codegen.md) | hot PyTorch code on supported backends |
| **`pytest.fixture`, `pytest.mark.*`** | the function, with metadata attached | registration | test setup and selection |
| **`typing.overload`, `final`, `override` (3.12+)** | the function, marked for the checker | no-op at runtime (except `__final__`/`__override__` attributes) | static typing intent |

---

## Key Takeaways

- `@d` on a definition is `name = d(obj)`, run once at definition time; stacked decorators apply bottom-up and execute top-down.
- Climb the metaprogramming ladder only as far as necessary: decorator → descriptor → `__init_subclass__` → metaclass → AST → import/frame hooks.
- Always use `functools.wraps`: it preserves name, docstring, qualname, and `__wrapped__`, which `inspect.signature`, pickling and tooling rely on.
- Decorators with arguments are factories returning decorators; keyword-only options make `@d` and `@d(...)` both work unambiguously.
- Class-based decorators break on methods unless they implement `__get__`; state on a method decorator is shared across all instances.
- Class decorators act on one class and don't propagate to subclasses; `__init_subclass__` does.
- Type decorators with `ParamSpec` (and PEP 695 syntax) so that checkers keep the wrapped signature.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 318 — Decorators for Functions and Methods | Smith et al., 2003 | peps.python.org/pep-0318 | Syntax, desugaring, application order |
| PEP 3129 — Class Decorators | Winter, 2007 | peps.python.org/pep-3129 | Class decorators |
| PEP 614 — Relaxing Grammar Restrictions on Decorators | Bucher, 2020 | peps.python.org/pep-0614 | Arbitrary decorator expressions (3.9) |
| PEP 612 — Parameter Specification Variables | Mendoza, 2019 | peps.python.org/pep-0612 | `ParamSpec`, `Concatenate` |
| PEP 695 — Type Parameter Syntax | Traut, 2022 | peps.python.org/pep-0695 | `def f[**P, R]` syntax |
| `Lib/functools.py` | CPython | github.com/python/cpython | `wraps`, `update_wrapper`, `WRAPPER_ASSIGNMENTS` |
| *Fluent Python*, 2nd ed., ch. 9 | Ramalho, 2022 | O'Reilly | Decorator factories, registration decorators |

---

**Next:** [Chapter 10 — Descriptors](./10_descriptors.md) — the protocol that turns functions into methods and powers `property`.
