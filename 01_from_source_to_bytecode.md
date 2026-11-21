---
title: "Chapter 1 — From Source to Bytecode"
---

[← Back to Table of Contents](./README.md)

# Chapter 1 — From Source to Bytecode

> *"Python is compiled. It is just compiled to a machine that happens to be written in C."*

## Overview

Every behaviour later in this book — why a closure sees a later value, why `super()` is not "the parent", why `torch.compile` can intercept your function — is decided at one of five stages between your `.py` file and the CPU. This chapter walks those stages with real outputs, and establishes three objects you will meet in every later chapter: the **code object**, the **function object**, and the **frame**. It assumes only that you have run Python.

<div class="diagram">
<div class="diagram-title">The CPython pipeline</div>
<div class="flow-h">
  <div class="flow-node narrow">source<small>.py text</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node blue narrow">tokens<small>tokenize</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple narrow">AST<small>PEG parser</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange narrow">symtable<small>scopes</small></div>
  <div class="flow-arrow"></div>
  <div class="flow-node green narrow">code object<small>bytecode</small></div>
  <div class="flow-arrow accent"></div>
  <div class="flow-node accent narrow">eval loop<small>frames</small></div>
</div>
</div>

---

## Stage 1 and 2 — Tokens and the Parse Tree

The tokenizer turns characters into a stream of typed tokens; it is also where indentation becomes explicit `INDENT`/`DEDENT` tokens, which is why Python's grammar can be context-free despite significant whitespace.

```python
import io, tokenize

for tok in tokenize.generate_tokens(io.StringIO("y = x * k\n").readline):
    if tok.type != tokenize.ENDMARKER:
        print(tokenize.tok_name[tok.type], repr(tok.string))
```

```text
NAME 'y'
OP '='
NAME 'x'
OP '*'
NAME 'k'
NEWLINE '\n'
```

Since 3.9 the parser is a **PEG parser** generated from `Grammar/python.gram` (PEP 617). PEG parsers try alternatives in order with unlimited lookahead, which is what made parenthesised context managers (3.10) and `match` statements (3.10) — where `match` is a *soft* keyword that is still a valid variable name — expressible. The parser emits an **abstract syntax tree** directly:

```python
import ast
print(ast.dump(ast.parse("y = x * k"), indent=1))
```

```text
Module(
 body=[
  Assign(
   targets=[
    Name(id='y', ctx=Store())],
   value=BinOp(
    left=Name(id='x', ctx=Load()),
    op=Mult(),
    right=Name(id='k', ctx=Load())))])
```

Note `ctx=Store()` vs `ctx=Load()`: already at the AST level the compiler knows which names are *assigned*. That single bit drives the scope analysis of Stage 3. The AST is a public, mutable data structure — [Chapter 12](./12_introspection_ast_and_codegen.md) transforms it and compiles the result.

---

## Stage 3 — The Symbol Table Decides Every Scope

Before emitting a single instruction, the compiler walks the AST and builds a **symbol table** (`Python/symtable.c`) that classifies every name in every block as *local*, *global*, *free* (captured from an enclosing function), or *cell* (captured *by* an inner function). The rule is simple and absolute: **a name assigned anywhere in a function body is local to that function for the whole body**, unless declared `global` or `nonlocal`.

```python
import symtable

src = """
def outer():
    n = 0
    def inner():
        return n + 1
    return inner
"""
top = symtable.symtable(src, "<demo>", "exec")
outer = top.get_children()[0]
inner = outer.get_children()[0]
print("outer:", [(s.get_name(), s.is_local(), s.is_free()) for s in outer.get_symbols()])
print("inner:", [(s.get_name(), s.is_local(), s.is_free()) for s in inner.get_symbols()])
```

```text
outer: [('n', True, False), ('inner', True, False)]
inner: [('n', False, True)]
```

`n` is local to `outer` and *free* in `inner`. This compile-time decision is the whole explanation of `UnboundLocalError` and of closures; [Chapter 3](./03_scope_closures_and_binding.md) builds on it.

---

## Stage 4 — Bytecode and the Code Object

The compiler emits a **code object**: an immutable bundle of bytecode plus everything needed to run it.

```python
import dis

def scale_sum(xs, k):
    total = 0
    for x in xs:
        total += x * k
    return total

dis.dis(scale_sum)
```

CPython 3.13 output (bytecode changes **every** release — never memorise it, always re-run `dis`):

```text
  3           RESUME                   0

  4           LOAD_CONST               1 (0)
              STORE_FAST               2 (total)

  5           LOAD_FAST                0 (xs)
              GET_ITER
      L1:     FOR_ITER                10 (to L2)
              STORE_FAST               3 (x)

  6           LOAD_FAST_LOAD_FAST     35 (total, x)
              LOAD_FAST                1 (k)
              BINARY_OP                5 (*)
              BINARY_OP               13 (+=)
              STORE_FAST               2 (total)
              JUMP_BACKWARD           12 (to L1)

  5   L2:     END_FOR
              POP_TOP

  7           LOAD_FAST                2 (total)
              RETURN_VALUE
```

Read it as a **stack machine**: `LOAD_*` pushes, `BINARY_OP` pops two and pushes one, `STORE_FAST` pops into a numbered slot. Locals are accessed by index (`STORE_FAST 2`) into a fixed-size array — not by name in a dict. That is why local variables are the fastest names in Python and why `locals()` inside a function is a *snapshot*, not the storage.

Step through the same function and watch the stack and the slots change. The listing, and the path through it, were captured from CPython 3.13 with an opcode trace — including a detail the static listing hides: when `FOR_ITER` runs out, 3.13 pops the iterator and jumps *past* `END_FOR` and `POP_TOP`, which therefore never execute on this path.

<div class="lab" data-lab="bytecode"></div>

The code object's fields are inspectable:

```python
co = scale_sum.__code__
print(co.co_varnames)   # local slots, arguments first
print(co.co_argcount, co.co_consts, co.co_stacksize)
```

```text
('xs', 'k', 'total', 'x')
2 (None, 0) 4
```

| Field | Meaning |
|-------|---------|
| `co_code` | the raw bytecode bytes (2-byte "code units": opcode + arg, plus inline caches) |
| `co_varnames` | names of local slots; the first `co_argcount` are parameters |
| `co_cellvars` / `co_freevars` | names captured by inner functions / captured from outer ones |
| `co_consts` | literal constants referenced by `LOAD_CONST` |
| `co_names` | global and attribute names referenced by `LOAD_GLOBAL`, `LOAD_ATTR` |
| `co_stacksize` | the maximum evaluation-stack depth, computed at compile time |
| `co_qualname` (3.11+) | dotted path like `Outer.method.<locals>.inner` |

---

## Code Objects, Function Objects, Frames

These three are routinely conflated. Keep them apart:

| | | |
|---|---|---|
| **Mechanism** | Code object → function object → frame |
| **Defined in** | `Include/cpython/code.h`, `Objects/funcobject.c`, `Include/internal/pycore_frame.h` |
| **Since** | Always; frames became lazily materialised in 3.11 |
| **Hooks into** | `def` executes `MAKE_FUNCTION`; a call pushes a frame |
| **Typical use** | Introspection, decorators, debuggers, tracing JITs |
| **Cost** | Creating a function object costs ~an allocation; calling it costs a frame push |
| **Prefer instead** | n/a — this is the machine itself |
| **Failure modes** | Holding a frame (via a traceback or `sys._getframe`) keeps all its locals alive |

- A **code object** is created once, at compile time. It has no idea what globals it will run against or what defaults it has.
- A **function object** is created every time a `def` statement *executes*. It binds a code object to a globals dict, default values, a closure (tuple of cells), `__dict__`, annotations and `__qualname__`. Two lambdas created in a loop share one code object and are two function objects.
- A **frame** is created every time a function is *called*. It holds the instruction pointer, the local-variable array, the value stack, and a pointer to the caller's frame.

```python
makers = [lambda: i for i in range(3)]
print(makers[0] is makers[1], makers[0].__code__ is makers[1].__code__)
```

```text
False True
```

<div class="callstack">
  <div class="frame"><div class="frame-name">&lt;module&gt;</div><div class="frame-body">calls train()</div></div>
  <div class="frame green"><div class="frame-name">train(model, loader)</div><div class="frame-body">f_back → &lt;module&gt; · locals: model, loader, epoch</div></div>
  <div class="frame accent"><div class="frame-name">step(batch)</div><div class="frame-body">f_back → train · ip at BINARY_OP · stack: [loss, 2]</div></div>
</div>
<div class="callstack-label">A call stack: each frame links to its caller via f_back; innermost on top</div>

Frames are reachable from Python, which is the foundation of debuggers, profilers, `inspect.stack()`, and every "magic" that peeks at the caller:

```python
import sys

def who_called_me():
    caller = sys._getframe(1)
    return caller.f_code.co_name, caller.f_lineno

def train():
    return who_called_me()

print(train()[0])
```

```text
train
```

Since 3.11, CPython stores frame data in a contiguous per-thread stack of lightweight `_PyInterpreterFrame` structs and only materialises a full Python `frame` object when someone asks for one (a traceback, `sys._getframe`, a debugger). This is part of why 3.11 calls are cheaper than 3.10's — function calls in pure Python no longer recurse in C (`Python/ceval.c`, "inlined" calls).

---

## Stage 5 — The Evaluation Loop and Specialization

The evaluation loop (`_PyEval_EvalFrameDefault`, with instruction bodies defined in `Python/bytecodes.c` and generated into `Python/generated_cases.c.h`) is, at its core, a `switch` over opcodes executed once per instruction. Each generic instruction must handle every type: `BINARY_OP` must work for ints, floats, strings, NumPy arrays and your class with `__add__`.

| | |
|---|---|
| **Mechanism** | Specializing adaptive interpreter ("quickening") |
| **Defined in** | PEP 659; `Python/specialize.c` |
| **Since** | 3.11 |
| **Hooks into** | Inline cache entries after each specializable instruction |
| **Typical use** | Automatic — no user code changes |
| **Cost** | Small warm-up; a guard check per specialized instruction |
| **Prefer instead** | n/a |
| **Failure modes** | Type-polymorphic hot code keeps de-specializing; monkeypatching classes invalidates attribute caches |

After an instruction has executed a few times, CPython rewrites it in place to a **specialized** variant that assumes the types it has seen, guarded by a cheap check. If the guard fails, it *de-optimizes* back to the generic form and may re-specialize later:

```python
import dis

def add(a, b):
    return a + b

for _ in range(1000):
    add(1, 2)
dis.dis(add, adaptive=True)
for _ in range(1000):
    add(1.0, 2.0)
dis.dis(add, adaptive=True)
```

```text
  3           RESUME_CHECK             0

  4           LOAD_FAST_LOAD_FAST      1 (a, b)
              BINARY_OP_ADD_INT        0 (+)
              RETURN_VALUE
  3           RESUME_CHECK             0

  4           LOAD_FAST_LOAD_FAST      1 (a, b)
              BINARY_OP_ADD_FLOAT      0 (+)
              RETURN_VALUE
```

The same function, same source, now runs `BINARY_OP_ADD_FLOAT`. Attribute access specializes similarly — `LOAD_ATTR_INSTANCE_VALUE` for a plain instance attribute, `LOAD_ATTR_PROPERTY`, `LOAD_ATTR_SLOT`, `LOAD_ATTR_METHOD_WITH_VALUES` — which is why the cost ratios in [Chapter 10](./10_descriptors.md) are smaller than older blog posts claim.

**The practical consequence.** Monomorphic code (a hot loop that always sees the same types) is what CPython is now optimised for. Code that alternates types at one call site, or that mutates classes at runtime, pays for de-specialization.

### The JIT

| | |
|---|---|
| **Mechanism** | Copy-and-patch JIT compiling traces of specialized micro-ops ("tier 2") |
| **Defined in** | PEP 744; `Python/jit.c`, `Tools/jit/` |
| **Since** | 3.13 experimental, build-time opt-in (`--enable-experimental-jit`) |
| **Hooks into** | Hot `JUMP_BACKWARD` loops are projected into micro-op traces |
| **Typical use** | None yet in production; watch the release notes |
| **Cost** | Build-time LLVM dependency; memory for machine code |
| **Prefer instead** | Algorithmic fixes ([Ch 21](./21_profiling_and_optimization.md)), Numba/Cython ([Ch 22](./22_beyond_python.md)) |
| **Failure modes** | Speedups are modest and workload-dependent; not enabled in standard builds |

The 3.15 release notes report a geometric-mean improvement of 7–8% for the JIT over the standard interpreter on x86-64 Linux. Treat that as a sign of direction, not as a reason to change how you write code.

---

## Why This Matters: Reasoning From Bytecode

Three rules fall out of this chapter and are used throughout the book.

1. **Local names are array slots; globals and builtins are dict lookups.** `LOAD_FAST` indexes an array; `LOAD_GLOBAL` checks the module dict, then builtins (with a specialized cache since 3.11). Caching a global in a local in a hot loop used to be a reliable micro-optimisation; with specialization it rarely matters — measure ([Chapter 21](./21_profiling_and_optimization.md)).
2. **Every Python-level operation is at least one instruction dispatch.** `sum(xs)` runs one instruction that loops in C; a `for` loop with `+=` runs roughly six instructions per element. The measured ratio is ~3.4× on 1000 ints (`bench/cost_model.py`: 5.4 µs vs 18.2 µs, CPython 3.13, Xeon @ 2.1 GHz).
3. **Decisions made at compile time cannot be changed at runtime.** Scope classification, constant folding, and whether a function is a generator (any `yield` in the body) are fixed before the first line runs.

```python
def maybe_gen(flag):
    if flag:
        yield 1
    return 2

print(type(maybe_gen(False)).__name__)   # the yield makes it a generator, flag is irrelevant
```

```text
generator
```

---

## Key Takeaways

- Python source passes through tokenizer → PEG parser → AST → symbol table → bytecode compiler → evaluation loop; each later chapter's "surprising" behaviour is decided at one identifiable stage.
- Scope is decided by the symbol table at compile time: assignment anywhere in a function makes a name local for the entire function.
- A code object is created once per `def` in the source; a function object every time the `def` executes; a frame every time the function is called.
- Local variables are indexed array slots, which is why they are fast and why `locals()` is a snapshot.
- Since 3.11 the interpreter specializes instructions to the types it observes; monomorphic hot code is the fast path, polymorphic call sites pay de-specialization.
- Bytecode is an implementation detail that changes every release — read it with `dis` on the version you run, never from memory.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 617 — New PEG parser for CPython | van Rossum, Galindo, Nikolaou, 2020 | peps.python.org/pep-0617 | The PEG parser and why it replaced LL(1) |
| PEP 659 — Specializing Adaptive Interpreter | Shannon, 2021 | peps.python.org/pep-0659 | Quickening, inline caches, de-optimization |
| PEP 744 — JIT Compilation | Bucher, 2024 | peps.python.org/pep-0744 | Copy-and-patch JIT status and tiers |
| `dis` — Disassembler for Python bytecode | Python docs | docs.python.org/3/library/dis.html | Instruction semantics, `adaptive=True` |
| `Python/bytecodes.c`, `Python/specialize.c`, `Python/symtable.c` | CPython | github.com/python/cpython | Instruction bodies, specialization families, scope analysis |
| What's New in Python 3.11 — Faster CPython | Python docs, 2022 | docs.python.org/3/whatsnew/3.11.html | Lazy frames, inlined Python-to-Python calls |
| What's New in Python 3.15 | Python docs, 2026 | docs.python.org/3.15/whatsnew/3.15.html | JIT performance figure (7–8% geomean, x86-64 Linux) |
| `bench/cost_model.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | `sum` vs explicit loop timing |

---

**Next:** [Chapter 2 — Objects, Names & Memory](./02_objects_names_and_memory.md) — the values those `LOAD_FAST` slots point to.
