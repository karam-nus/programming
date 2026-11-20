---
title: "Chapter 22 — Beyond Python"
---

[← Back to Table of Contents](./README.md)

# Chapter 22 — Beyond Python

> *"Crossing into C is cheap per byte and expensive per call. Design the boundary around that sentence."*

## Overview

When a profiled, algorithmically sound hot loop is still too slow ([Chapter 21](./21_profiling_and_optimization.md)), the remaining move is to run it as compiled code. There are many routes — calling an existing C library (`ctypes`, `cffi`), writing an extension (C API, Cython, pybind11/nanobind, PyO3), compiling Python itself (Numba, mypyc), or expressing the work as array operations — and one rule that decides which pays off: **the boundary has a per-call cost and nearly no per-element cost**. This chapter measures that rule, surveys each route with what it costs to adopt, and shows the zero-copy buffer protocol that lets data cross without copying. Array programming as a discipline belongs to the [Vectorization](https://github.com/karam-nus/vectorization) volume; this chapter is the bridge to it.

<div class="diagram">
<div class="diagram-title">Routes out of the interpreter</div>
<div class="diagram-grid cols-3">
  <div class="diagram-card accent"><div class="card-title">Call existing native code</div><div class="card-desc">ctypes, cffi — no compiler needed</div></div>
  <div class="diagram-card green"><div class="card-title">Write an extension</div><div class="card-desc">C API, Cython, pybind11 / nanobind, PyO3 (Rust)</div></div>
  <div class="diagram-card purple"><div class="card-title">Compile Python</div><div class="card-desc">Numba (JIT, numeric), mypyc (AOT, typed), torch.compile</div></div>
</div>
</div>

---

## The Boundary Rule, Measured

From `bench/ffi_boundary.py` (CPython 3.13.18, NumPy 2.5.3, Xeon @ 2.1 GHz, $\cos$ of 1 000 000 floats, median of 5):

| Variant | ms | vs `math.cos` loop | Choose this when |
|---------|:---:|:---:|------------------|
| **`ctypes` call to libm `cos` per element** | 299.5 | 6.0× slower | never per element — only for coarse-grained calls |
| **`math.cos` per element** (a C builtin) | 50.1 | 1.0× | scalar code, small $n$ |
| **`numpy.cos(arr)`** — one call for the whole buffer | 6.1 | 8.2× faster | any elementwise work on arrays |

All three run the *same* C `cos`. What differs is how often execution crosses between the interpreter and native code. `ctypes` performs argument conversion and a dynamic foreign call each time (~250 ns of overhead per call); `math.cos` is a builtin with a fast calling convention (~20 ns of call overhead plus the list comprehension's per-element bytecode); `numpy.cos` crosses once and loops over a contiguous `double` buffer in C (and may use SIMD). The lesson generalises to every route below: **move the loop, not just the body**. A Rust or C++ function called a million times from a Python loop is often *slower* than the pure-Python version.

---

## Calling Existing Native Code

| | |
|---|---|
| **Mechanism** | `ctypes`: load a shared library at runtime, declare signatures, call. `cffi`: parse C declarations, ABI or compiled API mode |
| **Defined in** | `Lib/ctypes/`, `Modules/_ctypes/`; cffi (PyPI) |
| **Since** | `ctypes` 2.5 |
| **Hooks into** | libffi dynamic calls |
| **Typical use** | Wrapping a vendor SDK, a system library, a quick experiment |
| **Cost** | No compiler; ~250 ns per call; manual memory and type management |
| **Prefer instead** | pybind11/nanobind or PyO3 for anything with a non-trivial API surface |
| **Failure modes** | Wrong `argtypes`/`restype` → silent garbage or segfaults (default return type is C `int`) |

```python
import ctypes, ctypes.util

libm = ctypes.CDLL(ctypes.util.find_library("m"))
libm.cos.restype = ctypes.c_double            # without this, the double is read as a C int
libm.cos.argtypes = [ctypes.c_double]
print(libm.cos(0.0))

buf = (ctypes.c_double * 4)(1.0, 2.0, 3.0, 4.0)   # a C array, usable as a Python buffer
print(list(memoryview(buf).cast("B").cast("d")))
```

```text
1.0
[1.0, 2.0, 3.0, 4.0]
```

---

## Sharing Memory: The Buffer Protocol

| | |
|---|---|
| **Mechanism** | A C-level protocol through which an object exposes a raw memory buffer with shape, strides and format |
| **Defined in** | PEP 3118; `Include/cpython/object.h` (`Py_buffer`); Python-level `__buffer__` (3.12+, PEP 688) |
| **Since** | 3.0 |
| **Hooks into** | `memoryview`, `bytes`/`bytearray`, `array.array`, NumPy, PyTorch (`torch.frombuffer`), `struct` |
| **Typical use** | Zero-copy interop between libraries; reading binary formats; passing data to extensions |
| **Cost** | Zero-copy views; slicing a `memoryview` is $\Theta(1)$ |
| **Prefer instead** | DLPack (`torch.from_dlpack`, `np.from_dlpack`) for device-aware tensor exchange |
| **Failure modes** | Resizing a `bytearray` while a view exists raises `BufferError`; views keep the exporter alive |

The buffer protocol is how data crosses the boundary *without* per-element cost: every array-like library can view every other's memory.

```python
import array
import numpy as np

a = array.array("f", [0.5, 1.5, 2.5, 3.5])       # contiguous float32, stdlib
view = np.frombuffer(a, dtype=np.float32)        # no copy: NumPy views the same bytes
view[0] = 9.0
print(a[0], np.shares_memory(view, np.frombuffer(a, dtype=np.float32)))

raw = bytearray(b"header..payload")
mv = memoryview(raw)[8:]                          # Θ(1) slice of a buffer, no copy
print(bytes(mv))
try:
    raw.extend(b"!")                              # resizing would invalidate the view
except BufferError as e:
    print("BufferError:", e)
```

```text
9.0 True
b'payload'
BufferError: Existing exports of data: object cannot be re-sized
```

`array.array` (typed, contiguous, ~8× smaller than a list of floats — [Chapter 13](./13_complexity_and_cost_models.md)) plus `memoryview` is the stdlib's answer when NumPy is unavailable; when it is available, NumPy and PyTorch interoperate through this protocol on CPU and through DLPack across devices.

---

## Writing Extensions

| Route | Language | Build | Releases the GIL | Free-threaded support | Choose this when |
|-------|----------|-------|:---:|:---:|------------------|
| **C API** | C | setuptools / meson-python | manual (`Py_BEGIN_ALLOW_THREADS`) | manual (declare `Py_mod_gil`) | maximum control; you're writing CPython-level infrastructure |
| **Cython** | Python superset with C types | `cythonize` | `with nogil:` | 3.1+ | incrementally speeding up existing Python/NumPy code |
| **pybind11 / nanobind** | C++ | CMake / scikit-build-core | `py::gil_scoped_release` | nanobind: yes | wrapping an existing C++ library (PyTorch's own bindings use pybind11) |
| **PyO3 + maturin** | Rust | `maturin build` | `py.allow_threads` | yes | new performance-critical code with memory safety (pydantic-core, polars, tokenizers, ruff) |
| **mypyc** | type-annotated Python | `mypyc module.py` | no | — | speeding up a typed pure-Python codebase without rewriting it (mypy and black ship compiled with it) |

Three things every route must handle, whatever the syntax:

1. **Reference counting** ([Chapter 2](./02_objects_names_and_memory.md)). The C API makes you do it by hand (`Py_INCREF`/`Py_DECREF`, "new" vs "borrowed" references); every other route automates it. Refcount bugs are the main source of extension crashes and leaks.
2. **The GIL.** An extension that computes for a long time without releasing it blocks every other Python thread ([Chapter 8](./08_concurrency_and_parallelism.md)). Release it around pure-native work that touches no Python objects.
3. **The ABI.** Extensions compiled against one CPython minor version don't load on another unless built for the **stable ABI** (`abi3`, PEP 384). Free-threaded builds had their own ABI until 3.15 added a stable ABI for them. This is why wheels are built per Python version and why new Python releases take time to get full library support.

A Cython kernel shows how small the change can be — type the variables, and the loop compiles to C:

```python
# illustrative — Cython (.pyx), compiled with cythonize
def sqrt_sum(double[::1] xs):            # typed memoryview: a buffer, no per-element boxing
    cdef Py_ssize_t i
    cdef double t = 0.0
    with nogil:
        for i in range(xs.shape[0]):
            t += xs[i] ** 0.5
    return t
```

---

## Compiling Python Itself

| | |
|---|---|
| **Mechanism** | Numba: JIT-compile a typed subset of Python + NumPy to LLVM at first call, specialised on argument types |
| **Defined in** | numba.pydata.org |
| **Since** | 2012 |
| **Hooks into** | Decorator (`@njit`) wrapping the function; type inference from the first call's arguments ([Chapter 9](./09_decorators.md)) |
| **Typical use** | Numeric loops that don't vectorise cleanly: DP tables, simulations, custom distance functions |
| **Cost** | First-call compile time (~0.1–1 s); restricted language (no arbitrary objects) |
| **Prefer instead** | NumPy vectorisation when the computation is expressible as array ops |
| **Failure modes** | Falling back to object mode / typing errors on unsupported features; compile time dominating short runs |

DP inner loops ([Chapters 15](./15_dynamic_programming_foundations.md)–[16](./16_dynamic_programming_patterns.md)) are the canonical case: each cell depends on its neighbours, so the computation doesn't vectorise, but it is pure arithmetic over arrays — exactly Numba's domain.

```python
# requires: numba, numpy
import numpy as np
from numba import njit

@njit(cache=True)
def edit_distance_nb(a, b):                 # a, b: int arrays of token ids
    n, m = a.shape[0], b.shape[0]
    prev = np.arange(m + 1)
    cur = np.empty(m + 1, dtype=np.int64)
    for i in range(1, n + 1):
        cur[0] = i
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev, cur = cur, prev
    return prev[m]

print(edit_distance_nb(np.array([1, 2, 3]), np.array([1, 3, 4])))
```

```text
2
```

`torch.compile` ([Chapter 12](./12_introspection_ast_and_codegen.md)) is the analogous route for tensor programs: it captures the graph from bytecode and generates fused kernels (Triton on GPU, C++/OpenMP on CPU). The [Vectorization](https://github.com/karam-nus/vectorization) volume covers when to express work as array operations versus compiled loops.

---

## Decision Guide

<div class="diagram">
<div class="diagram-title">Choosing a route after profiling</div>
<div class="flow">
  <div class="flow-node accent wide">Can the hot loop be written as array operations? → NumPy / PyTorch (one boundary crossing per buffer)</div>
  <div class="flow-arrow"></div>
  <div class="flow-node green wide">Numeric loop with cell-to-cell dependencies (DP, simulation)? → Numba, or Cython with typed memoryviews</div>
  <div class="flow-arrow"></div>
  <div class="flow-node purple wide">An existing C/C++ library to expose? → pybind11 / nanobind (ctypes / cffi for a few coarse calls)</div>
  <div class="flow-arrow"></div>
  <div class="flow-node orange wide">New performance-critical component with a long life? → Rust + PyO3</div>
  <div class="flow-arrow"></div>
  <div class="flow-node cyan wide">A large typed pure-Python codebase? → mypyc</div>
</div>
</div>

---

## Key Takeaways

- The native boundary costs per call, not per element: the same C `cos` ran 6× slower than `math.cos` through `ctypes` per element and 8× faster through one `numpy.cos` call (measured).
- Move the loop across the boundary, not just the loop body; a compiled function called per element can lose to pure Python.
- The buffer protocol and `memoryview` give zero-copy, $\Theta(1)$-slice views shared by `array`, NumPy, PyTorch and extensions; DLPack extends this across devices.
- Every extension route must get refcounting, GIL release and the ABI right; higher-level tools (Cython, pybind11/nanobind, PyO3) automate the first.
- Numba fits non-vectorisable numeric loops such as DP tables; `torch.compile` is the equivalent for tensor programs.
- Wheels are per Python version unless built for the stable ABI; free-threaded builds gained a stable ABI only in 3.15.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| Extending and Embedding / C API Reference | Python docs | docs.python.org/3/extending/ | Reference ownership, GIL macros, module definition |
| PEP 3118 — Revising the buffer protocol | Oliphant, Banks, 2006 | peps.python.org/pep-3118 | `Py_buffer`, shapes and strides |
| PEP 688 — Making the buffer protocol accessible in Python | Zijlstra, 2022 | peps.python.org/pep-0688 | `__buffer__` (3.12) |
| PEP 384 — Defining a Stable ABI | v. Löwis, 2009 | peps.python.org/pep-0384 | `abi3` wheels |
| What's New in Python 3.15 | Python docs, 2026 | docs.python.org/3.15/whatsnew/3.15.html | Stable ABI for free-threaded builds |
| Cython, pybind11, nanobind, PyO3, mypyc, Numba documentation | respective projects | cython.org, pybind11.readthedocs.io, nanobind.readthedocs.io, pyo3.rs, mypyc.readthedocs.io, numba.pydata.org | Capabilities, GIL handling, free-threading status |
| DLPack | DMLC / Data APIs consortium | dmlc.github.io/dlpack | Cross-library, cross-device tensor exchange |
| `bench/ffi_boundary.py` | this repo | [bench/RESULTS.md](./bench/RESULTS.md) | Boundary-cost measurements |

---

**Next:** [Chapter 23 — The Problem-Solving Playbook](./23_problem_solving_playbook.md) — putting the whole book to work on a problem you haven't seen.
