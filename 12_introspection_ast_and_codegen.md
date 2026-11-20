---
title: "Chapter 12 — Introspection, AST & Code Generation"
---

[← Back to Table of Contents](./README.md)

# Chapter 12 — Introspection, AST & Code Generation

> *"Once code is data, every program is also a compiler. The question is whether it should be."*

## Overview

The top rungs of the metaprogramming ladder ([Chapter 9](./09_decorators.md)) treat code itself as a data structure: reading it (`inspect`), rewriting it (`ast`), creating it (`compile`, `exec`), changing how it is found and loaded (the import system), patching it at runtime, and observing or replacing its execution (`sys.monitoring`, PEP 523). These are the mechanisms behind pytest's assertion rewriting, `torch.compile`, coverage tools, and every hot-reloader. Each is powerful enough to make a codebase unreadable, so every section ends with when *not* to use it.

<div class="diagram">
<div class="diagram-title">Where each tool intervenes in the pipeline from Chapter 1</div>
<div class="flow-h">
  <div class="flow-node narrow">import<small>sys.meta_path</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple narrow">source → AST<small>ast.parse / NodeTransformer</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange narrow">AST → code<small>compile</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node green narrow">code → run<small>exec / eval</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node accent narrow">running frames<small>inspect · sys.monitoring · PEP 523</small></div>
</div>
</div>

---

## `inspect`: Reading Live Objects

| | |
|---|---|
| **Mechanism** | `inspect` module over function/code/frame attributes |
| **Defined in** | `Lib/inspect.py`; PEP 362 (`Signature`) |
| **Since** | `signature` 3.3 |
| **Hooks into** | `__code__`, `__defaults__`, `__kwdefaults__`, `__annotations__`, `__wrapped__`, frames |
| **Typical use** | Dependency injection (pytest fixtures, FastAPI), CLI generation, validation, debugging |
| **Cost** | Slow (tens of µs per `signature` call) — compute once and cache |
| **Prefer instead** | Explicit configuration when the set of callables is small |
| **Failure modes** | `getsource` needs a file on disk; C functions may lack signatures; frame references leak memory |

`inspect.signature` reconstructs a function's parameter list from its code object and defaults; `Signature.bind` performs Python's argument-binding algorithm without calling anything. Together they are the basis of every framework that decides what to pass to your function by looking at its parameters:

```python
import inspect

def train(model: str, *, epochs: int = 3, lr: float = 1e-3, **extra) -> None: ...

sig = inspect.signature(train)
for p in sig.parameters.values():
    default = "-" if p.default is p.empty else repr(p.default)
    ann = "-" if p.annotation is p.empty else p.annotation.__name__
    print(f"{p.name:7} {p.kind.name:22} default={default:6} annotation={ann}")

bound = sig.bind("resnet", lr=0.1, seed=7)
bound.apply_defaults()
print(bound.arguments)
```

```text
model   POSITIONAL_OR_KEYWORD  default=-      annotation=str
epochs  KEYWORD_ONLY           default=3      annotation=int
lr      KEYWORD_ONLY           default=0.001  annotation=float
extra   VAR_KEYWORD            default=-      annotation=-
{'model': 'resnet', 'epochs': 3, 'lr': 0.1, 'extra': {'seed': 7}}
```

A minimal pytest-style fixture injector — call a function with whichever registered resources its parameter names ask for:

```python
import inspect

RESOURCES = {"tmp_dir": "/tmp/run1", "device": "cuda:0", "seed": 0}

def inject(fn):
    wanted = inspect.signature(fn).parameters
    return fn(**{name: RESOURCES[name] for name in wanted if name in RESOURCES})

def test_training(device, seed):
    return f"training on {device} with seed {seed}"

print(inject(test_training))
```

```text
training on cuda:0 with seed 0
```

Frames are introspectable too (`inspect.currentframe()`, `inspect.stack()`), which is how loggers find the caller's file and line. Holding a frame keeps all its locals alive; delete frame references in a `finally`.

---

## The `ast` Module: Code as a Tree

| | |
|---|---|
| **Mechanism** | `ast.parse` → `ast.NodeVisitor` / `NodeTransformer` → `compile(tree, ...)` |
| **Defined in** | `Lib/ast.py`, `Parser/Python.asdl` |
| **Since** | 2.5 (`_ast`); `ast.unparse` 3.9 |
| **Hooks into** | Between parsing and bytecode compilation |
| **Typical use** | Linters (ruff's Python ancestors, pylint), pytest assertion rewriting, safe expression evaluation, codemods |
| **Cost** | Parse-time only; the result runs as ordinary bytecode |
| **Prefer instead** | A decorator, if the goal is to wrap behaviour rather than change syntax-level meaning |
| **Failure modes** | Lost line numbers (call `ast.fix_missing_locations`); node shapes change between versions; debuggers show the original source, not the rewritten code |

### Analysis with `NodeVisitor`

Reading a tree is the safe half — no execution, no rewriting. A visitor that finds every attribute call on `torch` in a source string, the core of a migration checker:

```python
import ast

SOURCE = """
import torch
x = torch.randn(3)
y = torch.cuda.amp.autocast()
z = x.sum()
"""

class TorchCalls(ast.NodeVisitor):
    def __init__(self):
        self.found = []
    def visit_Call(self, node):
        name = ast.unparse(node.func)
        if name.startswith("torch."):
            self.found.append((node.lineno, name))
        self.generic_visit(node)

v = TorchCalls()
v.visit(ast.parse(SOURCE))
print(v.found)
```

```text
[(3, 'torch.randn'), (4, 'torch.cuda.amp.autocast')]
```

### Transformation with `NodeTransformer`

A transformer returns a replacement node from each `visit_*`. This one rewrites every division `a / b` into `safe_div(a, b)`, then compiles and runs the result — a toy version of how pytest rewrites `assert a == b` into code that reports both operands:

```python
import ast

class SafeDivision(ast.NodeTransformer):
    def visit_BinOp(self, node):
        self.generic_visit(node)                   # transform children first
        if isinstance(node.op, ast.Div):
            return ast.copy_location(
                ast.Call(func=ast.Name("safe_div", ast.Load()), args=[node.left, node.right], keywords=[]),
                node)
        return node

def safe_div(a, b):
    return a / b if b else float("nan")

src = "ratio = hits / total\nnested = (hits / total) / 0"
tree = ast.fix_missing_locations(SafeDivision().visit(ast.parse(src)))
print(ast.unparse(tree))
ns = {"safe_div": safe_div, "hits": 3, "total": 4}
exec(compile(tree, "<rewritten>", "exec"), ns)
print(ns["ratio"], ns["nested"])
```

```text
ratio = safe_div(hits, total)
nested = safe_div(safe_div(hits, total), 0)
0.75 nan
```

### Safe evaluation of literals

`eval` on untrusted input is arbitrary code execution. `ast.literal_eval` accepts only literals (strings, numbers, tuples, lists, dicts, sets, booleans, `None`) and is the correct way to parse a Python-literal config value:

```python
import ast
print(ast.literal_eval("{'lr': 1e-3, 'betas': (0.9, 0.999)}"))
try:
    ast.literal_eval("__import__('os').system('echo pwned')")
except ValueError as e:
    print("rejected:", type(e).__name__)
```

```text
{'lr': 0.001, 'betas': (0.9, 0.999)}
rejected: ValueError
```

---

## `compile`, `exec`, `eval`, and Their Namespaces

`compile(source_or_ast, filename, mode)` produces a code object; `mode` is `"exec"` (statements), `"eval"` (one expression) or `"single"` (REPL). `exec(code, globals, locals)` runs it; `eval` returns the expression's value. The rules that bite:

| Call | Name resolution | Choose this when |
|------|-----------------|------------------|
| **`exec(code)`** at module level | current globals and locals | almost never — implicit and fragile |
| **`exec(code, ns)`** | `ns` is both globals and locals; `__builtins__` inserted automatically | generating functions (the `dataclass` pattern) |
| **`exec(code, g, l)`** with distinct dicts | top-level code behaves like a **class body**: functions defined in it can't see names in `l` | rarely; it surprises everyone |
| **`exec` inside a function** | cannot create real locals of that function ([Chapter 3](./03_scope_closures_and_binding.md)) | never for rebinding locals |

```python
code = "def f():\n    return helper()\nresult = f()"
g, l = {"helper": lambda: "from globals"}, {}
exec(code, g, l)
print(l["result"])
try:
    exec("def helper2(): return 1\ndef f2(): return helper2()\nr = f2()", {}, {})
except NameError as e:
    print("NameError:", e)
```

```text
from globals
NameError: name 'helper2' is not defined
```

`helper2` was defined into the *locals* dict, but `f2`'s body looks names up in *globals* — the class-body rule. Pass one dict.

**Generating source vs building ASTs.** Generating strings (as `dataclasses` does, [Chapter 11](./11_metaclasses_and_class_creation.md)) is readable and easy to debug — you can print the source. Building ASTs avoids quoting and injection bugs. Either way, always pass a meaningful `filename` (`"<generated __init__ for Point>"`) so tracebacks are interpretable, and never interpolate untrusted strings into generated source.

---

## The Import System

| | |
|---|---|
| **Mechanism** | `import` → `importlib._bootstrap._find_and_load` → `sys.meta_path` finders → spec → loader |
| **Defined in** | Language Reference §5 "The import system"; PEP 302, PEP 451; `Lib/importlib/_bootstrap.py` |
| **Since** | Meta-path hooks 2.3; module specs 3.4 |
| **Hooks into** | `sys.modules` cache, `sys.meta_path`, `sys.path_hooks` |
| **Typical use** | Plugin loading, importing from zip/remote/encrypted sources, pytest's assertion rewriter, lazy loading |
| **Cost** | Import-time only; but import time itself is a startup cost (`python -X importtime`) |
| **Prefer instead** | Entry points (`importlib.metadata.entry_points`) for plugins |
| **Failure modes** | Stale `sys.modules` entries; circular imports observing half-initialised modules; finders that break tooling |

`import x` first checks `sys.modules["x"]`. On a miss, it asks each **finder** on `sys.meta_path` for a **module spec**; the spec's **loader** creates the module object, inserts it into `sys.modules` *before* executing it (which is why circular imports see partially-initialised modules), and executes its code in the module's `__dict__`.

A meta-path finder that serves modules from an in-memory dict — the same structure as a loader that reads from a database, an archive, or a network:

```python
import importlib.abc, importlib.util, sys

class DictFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    SOURCES = {"virtual_cfg": "LR = 0.1\nprint('virtual_cfg executing')\n"}

    def find_spec(self, name, path, target=None):
        if name in self.SOURCES:
            return importlib.util.spec_from_loader(name, self)
        return None                       # let the next finder try

    def create_module(self, spec):
        return None                       # use the default module object

    def exec_module(self, module):
        exec(compile(self.SOURCES[module.__name__], f"<virtual {module.__name__}>", "exec"), module.__dict__)

sys.meta_path.insert(0, DictFinder())
import virtual_cfg
import virtual_cfg                        # second import: served from sys.modules, no re-execution
print(virtual_cfg.LR, type(virtual_cfg.__spec__.loader).__name__)
```

```text
virtual_cfg executing
0.1 DictFinder
```

### Lazy imports

Large ML codebases often spend seconds importing modules they never use in a given run. Two mechanisms:

- **`importlib.util.LazyLoader`** (3.5+) wraps a loader so the module's code runs on first attribute access. It works today but must be wired up per module.
- **PEP 810 explicit lazy imports (3.15+)** add a soft keyword: `lazy import torch` binds a lightweight proxy and loads the module the first time the name is *used*; errors surface at first use rather than at the import line. Lazy imports are allowed only at module scope; star imports and `__future__` imports cannot be lazy. `-X lazy_imports` / `PYTHON_LAZY_IMPORTS` and `sys.set_lazy_imports()` with a filter control them globally.

```python
# illustrative — requires Python 3.15+
lazy import torch                    # nothing loaded yet
lazy from transformers import AutoModel

def main():
    model = AutoModel.from_pretrained("...")   # transformers (and torch) load here
```

---

## Monkeypatching

Replacing an attribute of a module or class at runtime is legal and occasionally necessary (tests, hotfixes for third-party bugs). The rule that decides whether it works is name resolution ([Chapter 3](./03_scope_closures_and_binding.md)): patch the name **where it is looked up**.

```python
import types, sys

clock = types.ModuleType("clock")
clock.now = lambda: "real time"
sys.modules["clock"] = clock

app = types.ModuleType("app")
exec("from clock import now\ndef stamp(): return now()\nimport clock\ndef stamp2(): return clock.now()", app.__dict__)

clock.now = lambda: "patched"            # patch the defining module
print(app.stamp(), "|", app.stamp2())
```

```text
real time | patched
```

`app.stamp` copied the reference at import (`from clock import now` binds `app.now`), so patching `clock.now` doesn't reach it; `app.stamp2` looks up `clock.now` at call time, so it does. That is why `unittest.mock.patch("app.now")` is right for the first style and `patch("clock.now")` for the second. Always undo patches (`mock.patch` as a context manager or decorator does) — a leaked patch makes test order matter.

---

## Observing and Replacing Execution

### `sys.monitoring` (3.12+)

| | |
|---|---|
| **Mechanism** | Low-overhead event callbacks per tool ID (PEP 669) |
| **Defined in** | `sys.monitoring`; `Python/instrumentation.c` |
| **Since** | 3.12 |
| **Hooks into** | Bytecode instrumentation; events such as `PY_START`, `LINE`, `CALL`, `BRANCH`, `RAISE` |
| **Typical use** | Coverage (coverage.py uses it on 3.12+), profilers, debuggers |
| **Cost** | Zero when no events are enabled; only instrumented code pays |
| **Prefer instead** | `cProfile`/`py-spy` for ordinary profiling ([Chapter 21](./21_profiling_and_optimization.md)) |
| **Failure modes** | Forgetting to free the tool ID; callbacks that themselves trigger events |

```python
import collections, sys

mon = sys.monitoring
TOOL = mon.PROFILER_ID
mon.use_tool_id(TOOL, "call-counter")
calls = collections.Counter()
mon.register_callback(TOOL, mon.events.PY_START, lambda code, offset: calls.update([code.co_name]))
mon.set_events(TOOL, mon.events.PY_START)

def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(10)
mon.set_events(TOOL, 0)
mon.free_tool_id(TOOL)
print(calls)
```

```text
Counter({'fib': 177})
```

177 calls to compute `fib(10)` — the exponential call tree that [Chapter 15](./15_dynamic_programming_foundations.md) collapses to 11 calls with a cache. Unlike `sys.settrace`, which fires a Python callback on every line of every function, `sys.monitoring` instruments only the events a tool asks for and can disable events per code location (by returning `sys.monitoring.DISABLE` from the callback).

### Frame evaluation hooks: how `torch.compile` sees your code

PEP 523 (3.6) lets a C extension replace the function that evaluates frames (`_PyInterpreterState_SetEvalFrameFunc`). **TorchDynamo**, the front end of `torch.compile`, installs such a hook. When a compiled function is called, Dynamo intercepts the frame *before* it runs, symbolically executes its **bytecode** (Chapter 1), records the tensor operations into an FX graph, emits guards (on types, shapes, global values) under which that graph is valid, and hands the graph to a backend such as Inductor. Unsupported operations cause a **graph break**: Dynamo compiles the graph so far, lets CPython run the offending bytecode normally, and resumes tracing afterwards.

Consequences that follow directly from the mechanism:

- Dynamo works on bytecode, so it must be updated for every CPython release's bytecode changes — new Python versions get `torch.compile` support some time after release.
- Guards are what make recompilation happen: change a shape, a Python constant read from a global, or a type, and the guard fails.
- Data-dependent Python control flow (`if tensor.sum() > 0:`) is a graph break, because the bytecode branch depends on a runtime tensor value.

```python
# requires: torch
import torch

@torch.compile
def f(x):
    return torch.sin(x) ** 2 + torch.cos(x) ** 2

print(torch.allclose(f(torch.randn(8)), torch.ones(8)))
```

```text
True
```

---

## Choosing a Rung

| Need | Lowest sufficient tool | Avoid |
|------|------------------------|-------|
| **Call a function with what it asks for** | `inspect.signature` + cache | parsing source |
| **Find patterns in code** | `ast.NodeVisitor` (or a linter rule) | regex over source |
| **Change the meaning of syntax** (assertion rewriting, DSLs) | `ast.NodeTransformer` in an import hook | string replacement |
| **Generate many similar methods** | source generation + `exec` with a real filename | per-call reflection loops |
| **Load modules from somewhere unusual** | meta-path finder | editing `sys.path` at runtime |
| **Swap a dependency in tests** | `unittest.mock.patch` where looked up | permanent monkeypatches |
| **Observe execution** | `sys.monitoring` (3.12+) | `sys.settrace` |
| **Compile Python to something faster** | `torch.compile` / Numba ([Chapter 22](./22_beyond_python.md)) | writing your own PEP 523 hook |

---

## Key Takeaways

- `inspect.signature` and `Signature.bind` implement argument binding without calling; dependency-injecting frameworks are built on them.
- `ast` gives a version-specific tree you can visit (safe analysis) or transform and compile (code rewriting); always fix locations and keep filenames meaningful.
- `exec(code, ns)` with a single namespace behaves like module code; separate globals and locals behave like a class body and surprise.
- `ast.literal_eval`, never `eval`, for parsing untrusted literals.
- Imports go `sys.modules` → `sys.meta_path` finders → spec → loader, and the module is cached before it executes; PEP 810 lazy imports (3.15) defer loading to first use.
- Monkeypatch where a name is looked up, not where it is defined, and always undo it.
- `sys.monitoring` (3.12+) is the low-overhead observation API; PEP 523 frame-evaluation hooks are how TorchDynamo traces bytecode into graphs, which explains graph breaks and recompilation.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 362 — Function Signature Object | Hastings et al., 2012 | peps.python.org/pep-0362 | `Signature`, `bind` |
| `ast` module docs; *Green Tree Snakes* | Python docs; Kluyver | docs.python.org/3/library/ast.html | Node types, `NodeTransformer`, `unparse`, `literal_eval` |
| Language Reference §5 — The import system; PEP 302, PEP 451 | Python docs; Moore & Hylton 2002; Snow 2013 | docs.python.org/3/reference/import.html | Finders, loaders, specs, `sys.modules` ordering |
| PEP 810 — Explicit lazy imports | Python Steering Council-accepted, 2025 | peps.python.org/pep-0810 | `lazy import` semantics and controls (3.15) |
| What's New in Python 3.15 | Python docs, 2026 | docs.python.org/3.15/whatsnew/3.15.html | Lazy import restrictions and `-X lazy_imports` |
| PEP 669 — Low Impact Monitoring for CPython | Shannon, 2022 | peps.python.org/pep-0669 | `sys.monitoring` events and tool IDs |
| PEP 523 — Adding a frame evaluation API to CPython | Cannon, Brown, 2016 | peps.python.org/pep-0523 | The frame-evaluation hook |
| TorchDynamo deep dive | PyTorch docs | pytorch.org/docs/stable/torch.compiler_dynamo_deepdive.html | Bytecode tracing, guards, graph breaks |
| pytest — assertion rewriting | pytest docs | docs.pytest.org/en/stable/how-to/assert.html | Import-hook AST rewriting in practice |

---

**Next:** [Chapter 6 — Functional Programming](./06_functional_programming.md) — back to Part II: functions as values, without the metaprogramming.
