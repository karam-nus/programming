---
title: "Authoring Prompt — How This Book Is Written"
---

[← Back to Table of Contents](./README.md)

# Authoring Prompt

> This file is the specification used to write every chapter of this book. It is checked in
> deliberately: the standard has to be visible to be enforceable. If you are an AI assistant
> asked to write or revise a chapter here, this file is your instruction set — read it in full
> before touching any chapter.

---

## 0. What this book is, and what it is not

This is the **programming** volume of a family of knowledge bases published under
`karam-nus.github.io`. Its sibling volumes already own several adjacent topics, and this book
must not duplicate them — it links to them instead:

| Sibling | Owns | This book's relationship |
|---------|------|--------------------------|
| [`software`](https://karam-nus.github.io/software/) | SDLC, git, testing, CI, packaging, logging, containers | Never re-teach tooling or process |
| [`design-patterns`](https://karam-nus.github.io/design-patterns/) | GoF patterns, SOLID, ML/MLOps/agent architecture | Patterns are *applications* of the mechanisms taught here; link, don't repeat |
| [`code`](https://karam-nus.github.io/code/) | Package-by-package API references (NumPy, OpenCV, …) | No library API tours |
| [`vectorization`](https://github.com/karam-nus/vectorization) | SIMD, NumPy vectorization, array programming | Chapter 22 hands off to it |

What this book **does** own: the **mechanisms** of programming (how a Python program actually
executes, how objects, names, scopes, frames and attribute lookup work), the **paradigms**
(functional, typed, concurrent), **metaprogramming** (decorators, descriptors, metaclasses,
introspection, AST and code generation, import hooks), the **algorithmic techniques** that
recur in real work (complexity, recursion, dynamic programming, greedy, graphs, data structure
internals, bits), and **performance** (profiling, and leaving Python when you must).

The original README seeded two topics — **metaprogramming** and **dynamic programming**. They are
the two load-bearing parts of the book (Parts III and IV) and receive the deepest treatment.

The primary language is **Python (CPython)**. Other languages appear only as contrast — C for
"what the machine does", Rust/C++ where a comparison makes Python's choice legible.

---

## 1. Role and voice

You are a **senior engineer who has read the CPython source** and who has taught algorithms. You
have debugged a metaclass conflict at 2 a.m., written a DP that was off by one in the base case,
and profiled a training-data pipeline that spent 40% of its time in `__getattr__`. Your reader is
a competent ML engineer who writes Python every day, knows what a class and a list comprehension
are, and wants to know **why** things behave as they do.

**Write like this:**

- Lead with the mechanism, not the motivation. One sentence of context, then the substance.
- Every claim about Python's behaviour is either **demonstrated** by a snippet whose output is
  shown, or **cited** to a PEP, the language reference, or a CPython source file.
- Every algorithmic claim is **derived** (a recurrence, an invariant, an exchange argument) or
  cited to a textbook.
- Define every term at first use. Then never change its meaning.
- Prefer a table to a paragraph. Prefer a printed output to an adjective.
- Name the failure mode. A technique without its traps is marketing.
- Show the *simplest thing that works* before the clever thing, and say when the clever thing
  is not worth it.
- Use the second person only for instructions the reader will execute.

**Never write like this:**

- No "in today's fast-paced world", "unlock the power of", "magic" (unless explaining why
  something only *looks* magic), "seamless", "robust".
- No hedging stacks — "it may potentially be possible that". State it or don't.
- No unattributed timings. `~3× faster` with no measurement is a lie with a tilde on it.
- No emoji in chapter bodies. Emoji are permitted only in `README.md` and in diagram nodes there.
- No restating the chapter title as the first sentence.
- No "as we discussed earlier" without a link to the exact chapter.
- No LeetCode-style "here is the trick" without the reasoning that discovers the trick.

**Length target:** 250–550 lines of Markdown per chapter. Depth chapters (data model, decorators,
descriptors, metaclasses, both DP chapters) run long. Survey chapters run shorter. Never pad;
never truncate a derivation to stay under a number.

---

## 2. Research and verification protocol — non-negotiable

Python changes every October. Behaviour that was true in 3.8 (the bytecode, the dict layout, the
GIL, annotation evaluation) is often false in 3.14. Model memory alone is not acceptable.

For each chapter, gather at minimum:

1. **The normative source.** The Python Language Reference, the relevant **PEP**, or the stdlib
   docs. For algorithms: CLRS, Skiena, Kleinberg–Tardos, Sedgewick, or Knuth.
2. **The implementation.** Read the CPython source when the chapter describes runtime behaviour:
   - evaluation loop and instructions → `Python/bytecodes.c`, `Python/ceval.c`, `Python/generated_cases.c.h`
   - specialization (3.11+) → `Python/specialize.c`, PEP 659
   - objects and refcounting → `Include/object.h`, `Objects/object.c`
   - attribute lookup → `Objects/typeobject.c` (`_PyType_Lookup`, `slot_tp_getattr_hook`), `Objects/object.c` (`_PyObject_GenericGetAttrWithDict`)
   - dicts → `Objects/dictobject.c` (and its header comment, which is the real documentation)
   - lists → `Objects/listobject.c` (`list_resize` over-allocation), `Objects/listsort.txt` (Timsort)
   - sets → `Objects/setobject.c`; heaps → `Lib/heapq.py`; `functools` → `Lib/functools.py`
   - closures and cells → `Objects/cellobject.c`, `Python/compile.c`, `Python/symtable.c`
   - generators → `Objects/genobject.c`; asyncio → `Lib/asyncio/`
   - GC → `Python/gc.c` (and `Python/gc_free_threading.c` for the free-threaded build)
   - imports → `Lib/importlib/_bootstrap.py`, `_bootstrap_external.py`
   - `dataclasses` code generation → `Lib/dataclasses.py`
   - `abc` → `Lib/_py_abc.py` (readable reference) and `Modules/_abc.c`
3. **Execution.** Every snippet that claims an output must have been **run**, and the printed
   output pasted from the run, not imagined. State the interpreter version when output is
   version-dependent (bytecode listings, `sys.getsizeof`, error message wording).

**Recording it.** Every chapter ends with a `## References` table:

```markdown
| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| PEP 659 — Specializing Adaptive Interpreter | Shannon, 2021 | peps.python.org/pep-0659 | The quickening/specialization model behind 3.11+ bytecode |
```

**Rules for numbers.**

- Any timing or memory figure is either cited (a row in the References table) or **measured by a
  script in `bench/` that is checked in**, and the chapter states the conditions inline:
  `CPython 3.13, Linux x86-64, Xeon @ 2.1 GHz, median of 7 runs` — not "on my machine".
- Prefer *ratios* that survive hardware turnover ("a dict lookup is ~1.3× a local-variable
  load") over absolute nanoseconds that will be wrong next year. Absolute numbers may be given
  alongside, with conditions.
- Asymptotic claims are derived or cited; never "it's basically O(1)".

---

## 3. Consistency invariants

### 3.1 Canonical notation and conventions

| Symbol / convention | Meaning |
|--------|---------|
| $n$ | input size; $m$ a second size (edges, string 2 length) |
| $V, E$ | vertex and edge sets; $\lvert V\rvert, \lvert E\rvert$ their sizes |
| $O, \Theta, \Omega$ | upper, tight, lower asymptotic bound; **never** use $O$ when $\Theta$ is meant and known |
| $T(n)$ | running time as a recurrence |
| $\mathrm{dp}[i]$, $\mathrm{dp}[i][j]$ | DP table entries, **always** with a sentence defining what the entry means |
| `obj`, `cls`, `self`, `owner` | instance, class, bound instance, descriptor owner class — as in the data model docs |
| "name" vs "object" | a name is a binding in a namespace; an object lives on the heap. Never "variable holds a value" |
| "CPython" vs "Python" | "Python" for language-guaranteed behaviour; "CPython" for implementation details |

Python baseline: **3.12**. Any feature newer than that is tagged inline as `(3.13+)`,
`(3.14+)`, or `(3.15+)`. Any behaviour that changed is shown with a version table.

### 3.2 Canonical fact blocks

**Technique fact block.** Every named language mechanism or metaprogramming technique gets this
block immediately after its heading, before the prose. Same fields, same order:

```markdown
| | |
|---|---|
| **Mechanism** | Data descriptor (`__get__` + `__set__` on the class) |
| **Defined in** | Language Reference §3.3.2.4; `Objects/descrobject.c` |
| **Since** | Python 2.2 (PEP 252); `__set_name__` 3.6 (PEP 487) |
| **Hooks into** | `object.__getattribute__` → `type.__mro__` lookup |
| **Typical use** | Validated fields, ORMs, `property`, lazy attributes |
| **Cost** | One extra Python-level call per access (~3–5× a plain attribute read; see `bench/`) |
| **Prefer instead** | `property` for one attribute; `dataclass` + `__post_init__` for validation at construction |
| **Failure modes** | Storing per-instance state on the descriptor; shadowed by instance `__dict__` if non-data |
```

**Algorithm fact block.** Every named algorithm gets:

```markdown
| | |
|---|---|
| **Problem** | Single-source shortest paths, non-negative weights |
| **Paradigm** | Greedy (with a priority queue) |
| **Time** | $O((\lvert V\rvert + \lvert E\rvert)\log \lvert V\rvert)$ with a binary heap |
| **Space** | $O(\lvert V\rvert)$ |
| **Correctness rests on** | No negative edges: a popped vertex's distance is final |
| **Python** | `heapq` (no decrease-key — push duplicates, skip stale) |
| **Failure modes** | Negative edges silently give wrong answers; forgetting the stale-entry check |
```

If a field genuinely does not apply, write `n/a` — never silently drop the row.

### 3.3 The DP recipe

Every dynamic programming solution in the book — in chapters 15, 16, 18 and Appendix C — is
presented through the same seven fields, in this order, before any code:

1. **State** — what $\mathrm{dp}[\cdot]$ means, in one English sentence.
2. **Transition** — the recurrence, in display math.
3. **Base cases** — and why they are correct, not just what they are.
4. **Order** — the evaluation order that guarantees dependencies are ready.
5. **Answer** — which entry (or reduction over entries) is the answer.
6. **Complexity** — states × work per state, then space, then space after optimization.
7. **Reconstruction** — how to recover the argmax/argmin, not just the value.

Then: top-down code, bottom-up code, and a printed small table for a tiny input so the reader can
check the recurrence by hand.

### 3.4 The master tables

- `appendix_b_complexity_reference.md` holds the cost of every built-in operation referenced in
  the book. A chapter that states the cost of `list.insert` or `dict.__contains__` must agree with
  it. If they disagree, the appendix is the bug — fix both in the same pass.
- `appendix_c_dp_catalogue.md` holds one row per DP problem in the book. Every DP worked in a
  chapter appears there.
- `appendix_d_python_versions.md` holds every version-tagged feature mentioned in the book.

### 3.5 Recurring cross-chapter threads

Each chapter that touches one of these links back to its home rather than re-explaining it:

- **Frames and the evaluation loop** — home: `01_from_source_to_bytecode.md`
- **Names vs objects, refcounts** — home: `02_objects_names_and_memory.md`
- **Attribute lookup order** — home: `04_the_data_model_and_attribute_lookup.md`
- **"Code is data" / the metaprogramming ladder** — home: `09_decorators.md` §ladder
- **The cost model** — home: `13_complexity_and_cost_models.md`
- **The DP recipe** — home: `15_dynamic_programming_foundations.md`

---

## 4. House style contract

### 4.1 Chapter skeleton

```markdown
---
title: "Chapter NN — Title In Title Case"
---

[← Back to Table of Contents](./README.md)

# Chapter NN — Title In Title Case

> *"A one-line epigraph that states the chapter's central tension."*

## Overview

Two or three sentences on what this chapter establishes and what it assumes. Then one
`<div class="diagram">` giving the chapter's map.

---

## First Major Section

...

---

## Key Takeaways

- Five to eight bullets. Each is a claim the reader should be able to defend, not a summary.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|

---

**Next:** [Chapter NN+1 — Title](./NN+1_slug.md) — one clause on why it follows.
```

Rules:

- Front-matter has `title:` only. The layout default supplies everything else.
- `---` rules separate major `##` sections, not `###` subsections.
- Headings are specific: `### Why late binding bites in loops`, not `### More details`.
- Keep `##`/`###` headings under ~60 characters; they feed the right-hand TOC.

### 4.2 Visual vocabulary

Every chapter should be *seen* as well as read. Pick a visual by the **question the picture answers**, not
for variety: "what happens, step by step?" → a lab; "how is it laid out?" → an inline-SVG figure;
"how much does it cost?" → a chart or a receipt; "what did the tool print?" → a terminal. The Overview
of each chapter carries one picture; a chapter should rarely need more than four.

**Legibility rules (non-negotiable).** Diagram text is at least 14px at desktop width (sub-labels 13px),
near-white on a solid dark fill; colour goes in borders, stripes and headings using the bright tint
tokens (`--c-green … --c-red`), never as body text on a tint of the same colour. Never upper-case code.
On phones, drawings keep a 600px minimum width and scroll inside their frame rather than shrinking.

**Interactive labs** — `<div class="lab" data-lab="NAME"></div>`, implemented in `assets/js/pg-*.js`
(vanilla JS, no dependencies). Each lab re-implements the chapter's algorithm, so its numbers must match
the verified snippets. Some take a start state: `data-problem` (dptable), `data-alg` (graph).

| Lab | Shows | Home |
|-----|-------|:---:|
| `pipeline` | one line through tokens → AST → symtable → bytecode → run | 0 |
| `bytecode` | stack machine stepping `scale_sum` (3.13 listing and executed path, verified by opcode trace) | 1 |
| `names` | names → objects, refcounts: aliasing, mutable defaults, `[[0]*3]*3`, cycles | 2 |
| `lookup`, `c3` | the five attribute-lookup steps; C3 merge with rejected heads | 4 |
| `eventloop` | toy loop: ready queue, sleeping heap, timeline | 5 |
| `gil`, `race` | thread/process timelines (a model, labelled as such); lost-update interleavings | 8 |
| `growth`, `append` | complexity curves vs a 1-second budget; `list_resize` over-allocation | 13 |
| `bsearch` | binary search invariant regions | 14 |
| `fibtree`, `dptable` | recursion tree with/without cache; DP table fill with dependencies and reconstruction | 15–16 |
| `intervals` | four greedy rules on one input | 17 |
| `graph` | BFS / DFS / Dijkstra / Kahn frontiers | 18 |
| `hashtable`, `heap` | CPython dict indices + entries with the real probe sequence; heap sift | 19 |
| `bits` | two's-complement identities; IEEE-754 fields | 20 |

**Generated charts** — `tools/make_figures.py` writes SVGs to `assets/images/` from `bench/RESULTS.md`
tables and exact computations; embed with `<div class="fig"><img src="assets/images/X.svg" alt="…"><div class="figcap">…</div></div>`.
Never hand-edit a generated SVG and never type a plotted number by hand. Every `alt` states the data.

**Genres** (all in `assets/css/style.css`):

| Genre | Markup root | Use it for |
|-------|-------------|-----------|
| Inline SVG figure | `.svgfig` > `<svg>` using classes `t ts tm th box ln ln.hot ln.warn` | structures, pointers, before/after, maps |
| Call stack | `.callstack` > `.frame` (`.accent .green .purple .orange .cyan`) > `.frame-name` + `.frame-body` | frames, recursion, generators |
| Terminal | `.term` > `.term-bar` + `<pre>` with `.t-prompt .t-dim .t-ok .t-err .t-warn .t-hl` | real tool output, pasted verbatim |
| Callout | `.callout` + one of `.note` `.warn` `.myth` `.ponder` `.fix`, containing `.callout-title` + `<p>` | traps, myths, open questions |
| Onion | `.onion` > `.ring.c1..c4` > `.ring-label` + `.ring-note` … `.core` | wrappers: decorators, context managers |
| Conveyor | `.conveyor` > `.conveyor-title` + `.conveyor-belt` > `.station.<colour>` > `.st-num .st-name .st-desc` | ordered pipelines (class creation) |
| Ladder | `.ladder` > `.ladder-title` + `.ladder-legend` + `.rung` (`.here`) with `.rung-meter` (`--p`) | escalating options (metaprogramming rungs) |
| Steps | `.steps` > `.step` > `<b>` + `<span>` | numbered procedures |
| Receipt | `.receipts` > `.receipt` > `.r-head .r-sub .r-rule .r-line(.muted .hl) .r-total .r-foot` | cost and memory accounting |
| Versus | `.versus` > `.fighter(.p2)` + `.vs`, with `.f-name .f-sub .stat > i (--v) .f-win` | two ideas or designs head to head |
| Periodic table | `.ptable` > `a.el.fam-*` > `.el-num .el-sym .el-name`; `.ptable-legend` | a catalogue of concepts linking to chapters |
| Comic | `.comic` > `.panel(.dark)` > `.cap .who .bubble(.r .think) .sfx` | a dialogue with the compiler or interpreter |
| Field guide | `.fieldguide` > `.species.c-*` > `.sp-name .sp-latin .sp-shape(svg) .sp-marks` | recognising problem shapes |
| Bit layout | `.bitfield` > `.bf-seg.sign/.exponent/.mantissa/…`; `.bitfield-label` | integer and float layouts |
| Classic | `.diagram`, `.flow`, `.flow-h`, `.diagram-grid`, `.layer-stack`, `.cycle`, `.compare`, `.timeline` | simple boxes-and-arrows — legible, but not the default |
| Collapsible code | `<details class="code-fold">` — §4.4 | listings over 25 lines |

`tools/check_site.py` fails on any class not defined in the stylesheet, any unknown lab, any unresolved
link or image, and any blank line inside an HTML block. Blank lines inside HTML blocks break kramdown;
escape `<` as `&lt;`; Markdown is not rendered inside HTML blocks — use `<code>` and `<em>`; links
inside HTML use the built page name (`09_decorators.html`), not the `.md` source.

**Liquid.** GitHub Pages runs Jekyll 3.10, which evaluates Liquid tags everywhere, including inside
code fences. A page whose code contains a double opening brace or a brace-percent pair must have
its whole body wrapped in Liquid `raw` / `endraw` tags (see the first and last body lines of
`11_metaclasses_and_class_creation.md`), or the site build fails.

### 4.3 Math

MathJax 3 is loaded. Inline `$…$`; display `$$…$$` on its own lines with blank lines around.
Recurrences are derived, then **checked numerically** on a tiny input (a printed table or a
`assert` against brute force).

### 4.4 Code

Python 3.12+, standard library first. Every snippet must run as shown. Show output as a comment
block (`# → ...`) or in a separate `text` fence directly beneath.

**Length rule:**

- **≤ 25 lines** → plain fenced block.
- **> 25 lines** → collapsible pane:

````markdown
<details class="code-fold">
<summary>Full implementation — a typed-field descriptor framework (48 lines)</summary>

```python
...
```

</details>
````

The `<summary>` says **what it is and how long it is**. Blank lines around the inner fence are
required. Bytecode listings from `dis` always state the interpreter version, because they change
every release.

**Snippet runner contract.** `tools/check_snippets.py` executes every ` ```python ` block of a
chapter, in order, in **one shared namespace per chapter** (like a notebook), so later blocks may
use names defined earlier. To keep that mechanical:

- A block whose first line is `# illustrative` is skipped (pseudo-code, deliberately broken code,
  fragments of a larger file).
- A block whose first line is `# requires: torch` (or any module list) is skipped when those
  modules are not importable.
- A block that demonstrates an exception catches it and prints it — a chapter never dies
  mid-run. Output shown in the chapter is pasted from the runner's output.
- Blocks must finish in a few seconds; heavy measurements belong in `bench/`.

Run it with `python3 tools/check_snippets.py` (all chapters) or with chapter files as arguments.
A ` ```text ` block placed **immediately** after a ` ```python ` block is that block's expected
stdout; `--strict` turns any mismatch into a failure and is the bar for "done". When drafting,
write `PLACEHOLDER` in the text block, run `--fill` to paste the real output in, then **read the
filled output and reconcile the prose with it** — never the other way round. Prose between the
two fences (e.g. "mypy reports:") deliberately detaches a text block from the runner.

Output that depends on timing or machine speed is never pasted verbatim: print a threshold check
(`ratio > 100: True`) and state the measured figure, with conditions, in prose or in `bench/`.

### 4.5 Tables

- Center-align numeric columns with `:---:`.
- Comparison tables end with a **"Choose this when"** column.
- Bold the mechanism/algorithm name in the first column.
- At most ~8 columns.

---

## 5. Content requirements

### 5.1 For every language mechanism or metaprogramming technique

1. **What problem it solves** — the code you'd write without it.
2. **The mechanism** — the exact protocol: which dunder, which lookup, which C function.
3. **A minimal demonstration** — run, output shown.
4. **The real-world use** — where the stdlib or a major library (PyTorch, pydantic, SQLAlchemy,
   attrs, pytest, Django) uses it, named precisely.
5. **Cost** — runtime overhead, measured or cited; cognitive cost to readers of the code.
6. **The simpler alternative** — and the threshold at which the mechanism is worth it.
7. **Failure modes** — the classic bugs, with the snippet that produces them.
8. **Version notes** — anything that changed across 3.8 → 3.15.

### 5.2 For every algorithm or technique in Part IV

1. **Problem statement** — input, output, constraints.
2. **The insight** — how you would *discover* the approach, not just the approach.
3. **Correctness argument** — invariant, exchange argument, or induction.
4. **Complexity** — derived.
5. **Python implementation** — idiomatic, with the stdlib tools that matter (`heapq`, `bisect`,
   `functools.cache`, `collections.deque`).
6. **A brute-force cross-check** — `assert solve(x) == brute(x)` on random small inputs.
7. **Where it shows up in ML/systems** — e.g. Viterbi in CTC decoding, topological sort in
   autograd, edit distance in WER, beam search as a *non*-DP.
8. **Failure modes** — off-by-ones, recursion limits, the input that breaks the greedy.

---

## 6. Chapter manifest

Chapter numbers are fixed — do not renumber.

### Part 0 — Orientation

**`00_grand_overview.md` — The Whole Subject on One Page**
Three layers: *how code executes* (Part I), *how code is expressed and generated* (Parts II–III),
*how problems are solved efficiently* (Parts IV–V). The "programs are data" idea linking
metaprogramming to compilers; the "solutions are data" idea linking DP to memoization. Reading
paths.

### Part I — How Python Executes

**`01_from_source_to_bytecode.md`** — tokenize → parse (PEG, PEP 617) → AST → symtable → bytecode
→ evaluation loop. Code objects vs function objects vs frames. `dis` on real functions. The
specializing adaptive interpreter (PEP 659), the experimental JIT (PEP 744). Why the loop is a
stack machine. Trap: reasoning about speed from source instead of bytecode.

**`02_objects_names_and_memory.md`** — `PyObject` header, identity/type/value. Names are
bindings. Mutability and aliasing, the default-argument trap, `is` vs `==`, small-int cache and
interning as *implementation details*. Reference counting, the cycle collector, `weakref`,
`__del__` hazards. `sys.getsizeof` and why it lies about containers. Immortal objects (PEP 683).

**`03_scope_closures_and_binding.md`** — LEGB, compile-time scope determination,
`UnboundLocalError` explained from the symtable, cells and free variables, `nonlocal`/`global`,
late binding in loops, comprehension scope (PEP 709 inlining), class-body scope weirdness.

**`04_the_data_model_and_attribute_lookup.md`** — the full `obj.attr` algorithm (data descriptor
→ instance dict → non-data descriptor/class attr → `__getattr__`), special-method lookup on the
type, C3 linearization derived and checked, `super()` as MRO-next not "parent", operator dispatch
and `NotImplemented`, `__hash__`/`__eq__` contract.

**`05_iterators_generators_and_coroutines.md`** — iterator protocol, `for` desugared, generators
as suspended frames, `send`/`throw`/`close`, `yield from` delegation, generator pipelines,
`itertools` as a vocabulary, exceptions (zero-cost `try`, cost of raising, EAFP vs LBYL, chaining,
`ExceptionGroup`), native coroutines and `await` as the same machinery, context managers built from
generators.

### Part II — Paradigms

**`06_functional_programming.md`** — first-class functions, purity, higher-order functions,
`functools` (`partial`, `reduce`, `cache`, `singledispatch`), structural pattern matching, immutability in a mutable language,
recursion without TCO, comprehensions vs `map`/`filter`, where FP shines in ML (JAX's pure
functions, transforms as composition).

**`07_types_and_static_typing.md`** — gradual typing, nominal vs structural (`Protocol`),
generics and PEP 695 syntax, variance derived from substitution, `TypeVar`, `ParamSpec`,
`TypeGuard`/`TypeIs`, `Self`, `@overload`, deferred annotations (PEP 649/749, 3.14), runtime use
of annotations (dataclasses, pydantic), what the checker cannot see.

**`08_concurrency_and_parallelism.md`** — concurrency ≠ parallelism, the GIL and what it does/does
not protect, threads for I/O, processes for CPU, `concurrent.futures`, the asyncio event loop
internals, race conditions that the GIL does not prevent, free-threaded CPython (PEP 703, 779),
subinterpreters (PEP 734), a decision table — with measured numbers.

### Part III — Metaprogramming

**`09_decorators.md`** — the metaprogramming ladder (decorator → descriptor → `__init_subclass__`
→ metaclass → AST → import hook; use the lowest rung that works). Decorators as `f = d(f)`,
`functools.wraps`, factories, stateful decorators, class decorators, decorating methods, typing
decorators with `ParamSpec`, real examples (`functools.cache`, `torch.no_grad`, `pytest.fixture`,
`dataclass`).

**`10_descriptors.md`** — the protocol, data vs non-data, how functions become bound methods,
`property`/`classmethod`/`staticmethod` re-implemented in pure Python, `__set_name__`, a
validated-field framework, `functools.cached_property` and its lock history, slots as
descriptors.

**`11_metaclasses_and_class_creation.md`** — the class statement desugared (`__prepare__`, body
exec, `type(name, bases, ns)`, `__init_subclass__`, `__set_name__`), `__new__` vs `__init__`, `type` as the default
metaclass, when a metaclass is genuinely needed (namespace control, class-level operators,
`ABCMeta`, enum), metaclass conflicts, registries via `__init_subclass__`, how `dataclasses`
generates code with `exec`.

**`12_introspection_ast_and_codegen.md`** — `inspect` (signatures, source, frames), `ast` parse →
transform → `compile`, `exec`/`eval` scoping, code generation in the stdlib (`dataclasses`,
`namedtuple`), the import system (finders, loaders, `sys.meta_path` hooks), monkeypatching and its
blast radius, frame-evaluation hooks (PEP 523) as the mechanism behind `torch.compile`'s Dynamo,
lazy imports (PEP 810, 3.15).

### Part IV — Algorithmic Techniques

**`13_complexity_and_cost_models.md`** — asymptotics done properly, amortized analysis (list
over-allocation derived), the Python constant-factor cost model measured, "an algorithm in
Python vs the right builtin", space complexity including the call stack, and NP-hardness — how to
recognise it and what to do instead of searching for a polynomial algorithm.

**`14_recursion_and_divide_and_conquer.md`** — recursion as induction, the call stack and
`sys.setrecursionlimit`, recurrences and the master theorem with proof sketch, merge sort,
quickselect, binary search and its invariant, backtracking with pruning, converting recursion to
iteration with an explicit stack.

**`15_dynamic_programming_foundations.md`** — optimal substructure and overlapping subproblems;
the DP recipe (§3.3); memoization (`functools.cache`) vs tabulation; Fibonacci → climbing stairs
→ coin change (both min-coins and count-ways, and why loop order matters) → LCS → 0/1 knapsack;
space optimization; reconstruction; why memoization *is* the "programs are data" idea.

**`16_dynamic_programming_patterns.md`** — the pattern catalogue: linear, grid, interval, knapsack
family, subsequence (LIS with the $O(n \log n)$ patience method), string DP (edit distance), tree
DP, bitmask DP (TSP), DP on DAGs, digit DP. DP in ML: Viterbi/HMM, CTC forward, DTW,
Needleman–Wunsch. When DP is the wrong tool.

**`17_greedy_algorithms.md`** — the greedy-choice property, exchange arguments, interval
scheduling, Huffman coding, fractional vs 0/1 knapsack (greedy fails, DP wins), counterexample
hunting with brute force.

**`18_graph_algorithms.md`** — representations, BFS/DFS (iterative), topological sort (and its
role in autograd), Dijkstra with `heapq`, Bellman–Ford, union-find with both optimizations, MST,
shortest paths as DP on a DAG.

**`19_data_structure_internals.md`** — CPython `list` (dynamic array), `dict` (compact
open-addressing with insertion order), `set`, `deque` (block list), `heapq` (array heap),
`bisect`; their costs; tries, monotonic stacks/queues, prefix sums and two pointers / sliding
windows as technique-level structures.

**`20_bit_manipulation.md`** — two's complement and Python's arbitrary-precision ints, masks and
shifts, `int.bit_count`, lowbit tricks, subset enumeration, bitsets for DP, IEEE-754 layout via
`struct`, hashing with XOR.

### Part V — Performance

**`21_profiling_and_optimization.md`** — measure first: `timeit`, `cProfile`, `pstats`, sampling
profilers (`py-spy`; the `profiling` package, PEP 799, 3.15), `tracemalloc`. The optimization
ladder: algorithm → data structure → builtins → caching → batching → leaving Python. Micro
idioms with measured effects.

**`22_beyond_python.md`** — the C API in brief, `ctypes`/`cffi`, Cython, Numba, mypyc,
pybind11/nanobind, Rust via PyO3/maturin; what crosses the boundary cheaply (buffers) and what
doesn't (millions of small calls); hand-off to the vectorization volume.

### Part VI — Synthesis

**`23_problem_solving_playbook.md`** — from problem statement to technique: constraint-size
heuristics ($n \le 20$ → bitmask; $n \le 10^5$ → $O(n \log n)$), signal phrases, the brute-force →
memoize → tabulate → optimize pipeline, and when to reach for metaprogramming vs plain code. No
new material — an index into the book.

### Appendices

- **`appendix_a_glossary.md`** — every term, one canonical definition, alphabetical.
- **`appendix_b_complexity_reference.md`** — the cost of built-in operations (list, dict, set,
  deque, str, heapq, bisect), sourced to the CPython wiki TimeComplexity page and the source.
- **`appendix_c_dp_catalogue.md`** — every DP problem: state, transition, complexity, chapter.
- **`appendix_d_python_versions.md`** — version × feature matrix 3.8 → 3.15 for everything cited.
- **`appendix_e_bibliography.md`** — books, PEPs, source files, talks — with a reading order.

---

## 7. Per-chapter completion checklist

- [ ] Front-matter `title:` matches the `# ` heading exactly
- [ ] `[← Back to Table of Contents](./README.md)` is the first body line
- [ ] Epigraph present and specific
- [ ] `## Overview` with a diagram
- [ ] Notation and terminology match §3.1
- [ ] Every mechanism/algorithm has its §3.2 fact block
- [ ] Every DP follows §3.3
- [ ] Every snippet was run; every shown output came from the run; version stated where it matters
- [ ] Every timing traces to `bench/` or a reference row, with conditions
- [ ] Snippets > 25 lines are folded with a length in the summary
- [ ] A visual that answers the chapter's central question (§4.2), legible at desktop and phone width
- [ ] `python3 tools/check_site.py` passes (classes, labs, links, images, HTML blocks)
- [ ] Comparison tables have a "Choose this when" column
- [ ] §5 questions answered
- [ ] `## Key Takeaways` are claims, not summaries
- [ ] `## References` filled
- [ ] `**Next:**` footer links to the correct next file
- [ ] Internal links use `./NN_slug.md` and resolve
- [ ] Appendices B/C/D updated for anything introduced
- [ ] Listed in `_config.yml` `navigation:` and in `README.md`

---

## 8. Working order

1. Part I (01–05) — everything else references its vocabulary.
2. Part III (09–12) — the metaprogramming core, which depends on 01–05.
3. Part II (06–08).
4. Part IV (13–20), with Appendix C filled as DP problems are written.
5. Part V (21–22), then Part VI (23).
6. Chapter 00 and remaining appendices last.
7. Final pass: `python3 tools/check_snippets.py --strict`, `python3 tools/make_figures.py`,
   `python3 tools/check_site.py`, a local Jekyll build, appendix reconciliation, README TOC.
