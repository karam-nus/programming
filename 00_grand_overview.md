---
title: "Chapter 0 — The Whole Subject on One Page"
---

[← Back to Table of Contents](./README.md)

# Chapter 0 — The Whole Subject on One Page

> *"Programs are data. Solutions are data. Most of this book is about taking those two sentences literally."*

## Overview

"Programming" is too broad to be a subject, so this book cuts it into three floors that a working ML engineer actually needs to reason about: **how code executes** (what the interpreter does with your source), **how code is expressed and generated** (paradigms and metaprogramming), and **how problems are solved efficiently** (algorithmic techniques and performance). Two ideas run between the floors like staircases, and they explain why metaprogramming and dynamic programming — the two topics this repository was started for — sit at its centre. Every room in the drawing below is a chapter; click one.

<div class="svgfig">
<svg viewBox="0 0 860 520" width="860" role="img" aria-label="The book as a three-floor building with two staircases">
<defs>
<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#30363d" stroke-width="2"/></pattern>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1a24"/><stop offset="1" stop-color="#0d1117"/></linearGradient>
</defs>
<rect x="0" y="0" width="860" height="520" fill="url(#sky)"/>
<path d="M60 92 L430 30 L800 92 Z" fill="#161b22" stroke="#8b949e" stroke-width="1.6"/>
<text x="430" y="72" text-anchor="middle" class="th">ROOF · Chapter 23 — the Problem-Solving Playbook</text>
<a href="23_problem_solving_playbook.html"><rect x="300" y="52" width="260" height="30" fill="transparent"/></a>
<rect x="60" y="92" width="740" height="128" fill="#161b22" stroke="#fdba74" stroke-width="1.6"/>
<text x="74" y="114" class="th" style="fill:#fdba74">FLOOR 3 · SOLVING PROBLEMS EFFICIENTLY</text>
<text x="786" y="114" text-anchor="end" class="ts">“is this fast enough, and how do I make it so?”</text>
<a href="13_complexity_and_cost_models.html"><rect x="74" y="126" width="104" height="40" rx="6" fill="#1f1a14" stroke="#fdba74"/><text x="126" y="146" text-anchor="middle" class="t">13 Cost</text></a>
<a href="14_recursion_and_divide_and_conquer.html"><rect x="186" y="126" width="104" height="40" rx="6" fill="#1f1a14" stroke="#fdba74"/><text x="238" y="146" text-anchor="middle" class="t">14 Recursion</text></a>
<a href="15_dynamic_programming_foundations.html"><rect x="298" y="126" width="104" height="40" rx="6" fill="#2a1622" stroke="#f9a8d4" stroke-width="2"/><text x="350" y="146" text-anchor="middle" class="t">15 DP I</text></a>
<a href="16_dynamic_programming_patterns.html"><rect x="410" y="126" width="104" height="40" rx="6" fill="#2a1622" stroke="#f9a8d4" stroke-width="2"/><text x="462" y="146" text-anchor="middle" class="t">16 DP II</text></a>
<a href="17_greedy_algorithms.html"><rect x="522" y="126" width="104" height="40" rx="6" fill="#1f1a14" stroke="#fdba74"/><text x="574" y="146" text-anchor="middle" class="t">17 Greedy</text></a>
<a href="18_graph_algorithms.html"><rect x="634" y="126" width="152" height="40" rx="6" fill="#1f1a14" stroke="#fdba74"/><text x="710" y="146" text-anchor="middle" class="t">18 Graphs</text></a>
<a href="19_data_structure_internals.html"><rect x="74" y="172" width="216" height="38" rx="6" fill="#141c26" stroke="#93c5fd"/><text x="182" y="191" text-anchor="middle" class="t">19 Data structure internals</text></a>
<a href="20_bit_manipulation.html"><rect x="298" y="172" width="104" height="38" rx="6" fill="#141c26" stroke="#93c5fd"/><text x="350" y="191" text-anchor="middle" class="t">20 Bits</text></a>
<a href="21_profiling_and_optimization.html"><rect x="410" y="172" width="188" height="38" rx="6" fill="#1f1e12" stroke="#fde047"/><text x="504" y="191" text-anchor="middle" class="t">21 Profiling</text></a>
<a href="22_beyond_python.html"><rect x="606" y="172" width="180" height="38" rx="6" fill="#1f1e12" stroke="#fde047"/><text x="696" y="191" text-anchor="middle" class="t">22 Beyond Python</text></a>
<rect x="60" y="220" width="740" height="128" fill="#161b22" stroke="#c4b5fd" stroke-width="1.6"/>
<text x="74" y="242" class="th" style="fill:#c4b5fd">FLOOR 2 · EXPRESSING AND GENERATING CODE</text>
<text x="786" y="242" text-anchor="end" class="ts">“how do I say it — or make code say it for me?”</text>
<a href="06_functional_programming.html"><rect x="74" y="256" width="120" height="40" rx="6" fill="#132028" stroke="#67e8f9"/><text x="134" y="276" text-anchor="middle" class="t">06 Functional</text></a>
<a href="07_types_and_static_typing.html"><rect x="202" y="256" width="120" height="40" rx="6" fill="#132028" stroke="#67e8f9"/><text x="262" y="276" text-anchor="middle" class="t">07 Types</text></a>
<a href="08_concurrency_and_parallelism.html"><rect x="330" y="256" width="132" height="40" rx="6" fill="#132028" stroke="#67e8f9"/><text x="396" y="276" text-anchor="middle" class="t">08 Concurrency</text></a>
<a href="09_decorators.html"><rect x="74" y="302" width="168" height="38" rx="6" fill="#1e1830" stroke="#c4b5fd" stroke-width="2"/><text x="158" y="321" text-anchor="middle" class="t">09 Decorators</text></a>
<a href="10_descriptors.html"><rect x="250" y="302" width="168" height="38" rx="6" fill="#1e1830" stroke="#c4b5fd" stroke-width="2"/><text x="334" y="321" text-anchor="middle" class="t">10 Descriptors</text></a>
<a href="11_metaclasses_and_class_creation.html"><rect x="426" y="302" width="168" height="38" rx="6" fill="#1e1830" stroke="#c4b5fd" stroke-width="2"/><text x="510" y="321" text-anchor="middle" class="t">11 Metaclasses</text></a>
<a href="12_introspection_ast_and_codegen.html"><rect x="602" y="302" width="184" height="38" rx="6" fill="#1e1830" stroke="#c4b5fd" stroke-width="2"/><text x="694" y="321" text-anchor="middle" class="t">12 AST &amp; codegen</text></a>
<rect x="60" y="348" width="740" height="112" fill="#161b22" stroke="#4ade80" stroke-width="1.6"/>
<text x="74" y="370" class="th" style="fill:#4ade80">FLOOR 1 · HOW CODE EXECUTES</text>
<text x="786" y="370" text-anchor="end" class="ts">“what does the interpreter actually do?”</text>
<a href="01_from_source_to_bytecode.html"><rect x="74" y="384" width="136" height="60" rx="6" fill="#12221a" stroke="#4ade80"/><text x="142" y="406" text-anchor="middle" class="t">01 Bytecode</text><text x="142" y="428" text-anchor="middle" class="ts">frames · dis · JIT</text></a>
<a href="02_objects_names_and_memory.html"><rect x="218" y="384" width="136" height="60" rx="6" fill="#12221a" stroke="#4ade80"/><text x="286" y="406" text-anchor="middle" class="t">02 Objects</text><text x="286" y="428" text-anchor="middle" class="ts">names · refcounts</text></a>
<a href="03_scope_closures_and_binding.html"><rect x="362" y="384" width="136" height="60" rx="6" fill="#12221a" stroke="#4ade80"/><text x="430" y="406" text-anchor="middle" class="t">03 Scope</text><text x="430" y="428" text-anchor="middle" class="ts">LEGB · closures</text></a>
<a href="04_the_data_model_and_attribute_lookup.html"><rect x="506" y="384" width="136" height="60" rx="6" fill="#12221a" stroke="#4ade80"/><text x="574" y="406" text-anchor="middle" class="t">04 Lookup</text><text x="574" y="428" text-anchor="middle" class="ts">obj.attr · MRO</text></a>
<a href="05_iterators_generators_and_coroutines.html"><rect x="650" y="384" width="136" height="60" rx="6" fill="#12221a" stroke="#4ade80"/><text x="718" y="406" text-anchor="middle" class="t">05 Generators</text><text x="718" y="428" text-anchor="middle" class="ts">for · yield · await</text></a>
<rect x="60" y="460" width="740" height="30" fill="url(#hatch)" stroke="#8b949e" stroke-width="1.2"/>
<text x="430" y="479" text-anchor="middle" class="ts">FOUNDATION · CPython: a C program running a stack machine over PyObject*</text>
<path d="M20 450 L20 140 L52 140" class="ln hot" stroke-width="3"/>
<text x="16" y="300" class="ts" transform="rotate(-90 16 300)" text-anchor="middle" style="fill:#34d399">PROGRAMS ARE DATA →</text>
<path d="M840 450 L840 140 L808 140" class="ln hot" stroke-width="3" style="stroke:#f9a8d4"/>
<text x="846" y="300" class="ts" transform="rotate(90 846 300)" text-anchor="middle" style="fill:#f9a8d4">SOLUTIONS ARE DATA →</text>
<text x="430" y="510" text-anchor="middle" class="ts">Staircases: functions, classes and source are objects you can rewrite (left) · results are values you can store and look up (right)</text>
</svg>
<div class="figcap">The whole book as a building. Floor 1 is the machinery, floor 2 is how you instruct and extend it, floor 3 is how you get answers fast. Purple rooms (metaprogramming) and pink rooms (dynamic programming) are the two centres of gravity.</div>
</div>

---

## Floor 1 — How Code Executes

Python source is compiled to bytecode for a stack machine; a function call creates a frame; names are bindings in namespaces that refer to heap objects; `obj.attr` runs one fixed lookup algorithm over the type's MRO and the instance dict. Almost every surprising behaviour — a closure seeing a later value, `UnboundLocalError`, `super()` reaching a sibling class, a generator that does nothing until iterated — is decided at an identifiable stage of this pipeline, usually at compile time. Follow one line of code through every stage:

<div class="lab" data-lab="pipeline"></div>

| Question | Answered in |
|----------|-------------|
| What does the interpreter actually run? What changed in 3.11–3.15? | [Ch 1 — Source to Bytecode](./01_from_source_to_bytecode.md) |
| Why did my "copy" change the original? When is memory freed? | [Ch 2 — Objects, Names & Memory](./02_objects_names_and_memory.md) |
| Why do all my lambdas return the last value? | [Ch 3 — Scope, Closures & Binding](./03_scope_closures_and_binding.md) |
| What exactly happens on `obj.attr`, `a + b`, `super()`? | [Ch 4 — Data Model & Attribute Lookup](./04_the_data_model_and_attribute_lookup.md) |
| How do `for`, generators, exceptions, `with` and `await` work? | [Ch 5 — Iterators, Generators & Coroutines](./05_iterators_generators_and_coroutines.md) |

---

## Floor 2 — Expressing and Generating Code

**Paradigms** are disciplines for structuring code: functional (pure functions, composition, pattern matching — mandatory under JAX), typed (machine-checked contracts, with variance following from substitution), concurrent (threads, processes, asyncio, and now free threading). **Metaprogramming** is code that operates on code. It comes as a ladder: each rung hooks a deeper point of Floor 1, and each one up is more powerful and harder to debug.

<div class="ladder">
<div class="ladder-title">The metaprogramming ladder — use the lowest rung that removes the repetition</div>
<div class="ladder-legend">power &amp; blast radius →</div>
<div class="rung here"><span class="rung-n">1</span><div><div class="rung-name">Decorator — rebinds a name after <code>def</code>/<code>class</code></div><div class="rung-desc">timing, retry, caching, registration · Ch 9</div></div><div class="rung-meter" style="--p:.18"></div></div>
<div class="rung"><span class="rung-n">2</span><div><div class="rung-name">Descriptor — hooks steps 2 and 4 of attribute lookup</div><div class="rung-desc">property, methods, validated fields, ORMs · Ch 10</div></div><div class="rung-meter" style="--p:.32"></div></div>
<div class="rung"><span class="rung-n">3</span><div><div class="rung-name"><code>__init_subclass__</code> / class decorator — runs as classes are made</div><div class="rung-desc">plugin registries, subclass contracts · Ch 11</div></div><div class="rung-meter" style="--p:.46"></div></div>
<div class="rung"><span class="rung-n">4</span><div><div class="rung-name">Metaclass — controls class creation and class-level behaviour</div><div class="rung-desc">enum, ABCs, namespace control · Ch 11</div></div><div class="rung-meter" style="--p:.62"></div></div>
<div class="rung"><span class="rung-n">5</span><div><div class="rung-name">AST transform / code generation — rewrites or writes source</div><div class="rung-desc">dataclasses, pytest assertion rewriting · Ch 11–12</div></div><div class="rung-meter" style="--p:.8"></div></div>
<div class="rung"><span class="rung-n">6</span><div><div class="rung-name">Import &amp; frame-evaluation hooks — change loading and execution</div><div class="rung-desc">lazy imports, <code>torch.compile</code> (PEP 523) · Ch 12</div></div><div class="rung-meter" style="--p:.97"></div></div>
</div>

| Question | Answered in |
|----------|-------------|
| How do I write and type a decorator properly? | [Ch 9 — Decorators](./09_decorators.md) |
| How does `property` work? How do I validate fields across many classes? | [Ch 10 — Descriptors](./10_descriptors.md) |
| When do I actually need a metaclass? How does `@dataclass` write code? | [Ch 11 — Metaclasses & Class Creation](./11_metaclasses_and_class_creation.md) |
| How do pytest, Dynamo and coverage tools see my code? | [Ch 12 — Introspection, AST & Codegen](./12_introspection_ast_and_codegen.md) |
| Functional style, typing, concurrency | [Ch 6](./06_functional_programming.md), [Ch 7](./07_types_and_static_typing.md), [Ch 8](./08_concurrency_and_parallelism.md) |

---

## Floor 3 — Solving Problems Efficiently

Two cost models — asymptotic growth and CPython's measured constant factors — decide whether a solution is fast enough. Drag the slider: the gap between complexity classes dwarfs every constant factor once $n$ is large.

<div class="lab" data-lab="growth"></div>

Problems are then attacked with a small set of techniques: divide and conquer when subproblems are disjoint, backtracking when you must search, **dynamic programming** when subproblems overlap, greedy when one choice is provably enough, graph algorithms when the structure is dependencies or connections, and the right data structure to make each step cheap. Every DP in the book is developed by the same pipeline:

<div class="steps">
<div class="step"><b>Brute force</b><span>Write the obviously-correct exponential recursion. Keep it forever as the oracle.</span></div>
<div class="step"><b>Memoize</b><span>Index the state by small hashable values; add <code>@functools.cache</code>.</span></div>
<div class="step"><b>Tabulate</b><span>State the seven fields; fill a table in dependency order.</span></div>
<div class="step"><b>Optimize</b><span>Keep only the rows you need; use bounds from the constraints.</span></div>
<div class="step"><b>Verify</b><span>Assert equality with the oracle on hundreds of random small inputs.</span></div>
</div>

| Question | Answered in |
|----------|-------------|
| Is this fast enough? Why is my loop slow? Is the problem even tractable? | [Ch 13 — Complexity & Cost Models](./13_complexity_and_cost_models.md) |
| Recursion, recurrences, binary search, backtracking | [Ch 14 — Recursion & Divide and Conquer](./14_recursion_and_divide_and_conquer.md) |
| How do I design a DP? | [Ch 15 — DP Foundations](./15_dynamic_programming_foundations.md), [Ch 16 — DP Patterns](./16_dynamic_programming_patterns.md) |
| Is the greedy choice safe? | [Ch 17 — Greedy Algorithms](./17_greedy_algorithms.md) |
| Dependencies, paths, connectivity | [Ch 18 — Graph Algorithms](./18_graph_algorithms.md) |
| What do `dict`, `list`, `deque`, `heapq` cost, and why? | [Ch 19 — Data Structure Internals](./19_data_structure_internals.md) |
| Masks, bitsets, float layouts | [Ch 20 — Bit Manipulation](./20_bit_manipulation.md) |
| Profiling and leaving Python | [Ch 21](./21_profiling_and_optimization.md), [Ch 22](./22_beyond_python.md) |
| I have a new problem — where do I start? | [Ch 23 — The Playbook](./23_problem_solving_playbook.md) |

---

## The Periodic Table of Programming

Forty-eight ideas the book develops, grouped by family. Each tile opens the chapter where the idea is derived; the number is the chapter.

<div class="ptable">
<a class="el fam-exec" href="01_from_source_to_bytecode.html"><span class="el-num">1</span><span class="el-sym">Bc</span><span class="el-name">bytecode</span></a>
<a class="el fam-exec" href="01_from_source_to_bytecode.html"><span class="el-num">1</span><span class="el-sym">Fr</span><span class="el-name">frame</span></a>
<a class="el fam-exec" href="02_objects_names_and_memory.html"><span class="el-num">2</span><span class="el-sym">Nm</span><span class="el-name">name ≠ object</span></a>
<a class="el fam-exec" href="02_objects_names_and_memory.html"><span class="el-num">2</span><span class="el-sym">Rc</span><span class="el-name">refcount</span></a>
<a class="el fam-exec" href="02_objects_names_and_memory.html"><span class="el-num">2</span><span class="el-sym">Gc</span><span class="el-name">cycle GC</span></a>
<a class="el fam-exec" href="03_scope_closures_and_binding.html"><span class="el-num">3</span><span class="el-sym">Lg</span><span class="el-name">LEGB</span></a>
<a class="el fam-exec" href="03_scope_closures_and_binding.html"><span class="el-num">3</span><span class="el-sym">Cl</span><span class="el-name">closure</span></a>
<a class="el fam-exec" href="04_the_data_model_and_attribute_lookup.html"><span class="el-num">4</span><span class="el-sym">At</span><span class="el-name">attr lookup</span></a>
<a class="el fam-exec" href="04_the_data_model_and_attribute_lookup.html"><span class="el-num">4</span><span class="el-sym">Mr</span><span class="el-name">MRO / C3</span></a>
<a class="el fam-exec" href="04_the_data_model_and_attribute_lookup.html"><span class="el-num">4</span><span class="el-sym">Ni</span><span class="el-name">NotImpl.</span></a>
<a class="el fam-exec" href="05_iterators_generators_and_coroutines.html"><span class="el-num">5</span><span class="el-sym">It</span><span class="el-name">iterator</span></a>
<a class="el fam-exec" href="05_iterators_generators_and_coroutines.html"><span class="el-num">5</span><span class="el-sym">Gn</span><span class="el-name">generator</span></a>
<a class="el fam-exec" href="05_iterators_generators_and_coroutines.html"><span class="el-num">5</span><span class="el-sym">Ex</span><span class="el-name">exceptions</span></a>
<a class="el fam-exec" href="05_iterators_generators_and_coroutines.html"><span class="el-num">5</span><span class="el-sym">Co</span><span class="el-name">coroutine</span></a>
<a class="el fam-para" href="06_functional_programming.html"><span class="el-num">6</span><span class="el-sym">Pu</span><span class="el-name">pure function</span></a>
<a class="el fam-para" href="06_functional_programming.html"><span class="el-num">6</span><span class="el-sym">Pm</span><span class="el-name">pattern match</span></a>
<a class="el fam-para" href="07_types_and_static_typing.html"><span class="el-num">7</span><span class="el-sym">Pr</span><span class="el-name">Protocol</span></a>
<a class="el fam-para" href="07_types_and_static_typing.html"><span class="el-num">7</span><span class="el-sym">Va</span><span class="el-name">variance</span></a>
<a class="el fam-para" href="08_concurrency_and_parallelism.html"><span class="el-num">8</span><span class="el-sym">Gl</span><span class="el-name">GIL</span></a>
<a class="el fam-para" href="08_concurrency_and_parallelism.html"><span class="el-num">8</span><span class="el-sym">Ev</span><span class="el-name">event loop</span></a>
<a class="el fam-para" href="08_concurrency_and_parallelism.html"><span class="el-num">8</span><span class="el-sym">Ft</span><span class="el-name">free threading</span></a>
<a class="el fam-meta" href="09_decorators.html"><span class="el-num">9</span><span class="el-sym">Dc</span><span class="el-name">decorator</span></a>
<a class="el fam-meta" href="10_descriptors.html"><span class="el-num">10</span><span class="el-sym">Ds</span><span class="el-name">descriptor</span></a>
<a class="el fam-meta" href="11_metaclasses_and_class_creation.html"><span class="el-num">11</span><span class="el-sym">Is</span><span class="el-name">init_subclass</span></a>
<a class="el fam-meta" href="11_metaclasses_and_class_creation.html"><span class="el-num">11</span><span class="el-sym">Mc</span><span class="el-name">metaclass</span></a>
<a class="el fam-meta" href="11_metaclasses_and_class_creation.html"><span class="el-num">11</span><span class="el-sym">Cg</span><span class="el-name">codegen</span></a>
<a class="el fam-meta" href="12_introspection_ast_and_codegen.html"><span class="el-num">12</span><span class="el-sym">As</span><span class="el-name">AST</span></a>
<a class="el fam-meta" href="12_introspection_ast_and_codegen.html"><span class="el-num">12</span><span class="el-sym">Ih</span><span class="el-name">import hook</span></a>
<a class="el fam-meta" href="12_introspection_ast_and_codegen.html"><span class="el-num">12</span><span class="el-sym">Fe</span><span class="el-name">frame eval</span></a>
<a class="el fam-algo" href="13_complexity_and_cost_models.html"><span class="el-num">13</span><span class="el-sym">Θ</span><span class="el-name">asymptotics</span></a>
<a class="el fam-algo" href="13_complexity_and_cost_models.html"><span class="el-num">13</span><span class="el-sym">Am</span><span class="el-name">amortized</span></a>
<a class="el fam-algo" href="13_complexity_and_cost_models.html"><span class="el-num">13</span><span class="el-sym">Np</span><span class="el-name">NP-hard</span></a>
<a class="el fam-algo" href="14_recursion_and_divide_and_conquer.html"><span class="el-num">14</span><span class="el-sym">Mt</span><span class="el-name">master theorem</span></a>
<a class="el fam-algo" href="14_recursion_and_divide_and_conquer.html"><span class="el-num">14</span><span class="el-sym">Bs</span><span class="el-name">binary search</span></a>
<a class="el fam-algo" href="14_recursion_and_divide_and_conquer.html"><span class="el-num">14</span><span class="el-sym">Bt</span><span class="el-name">backtracking</span></a>
<a class="el fam-dp" href="15_dynamic_programming_foundations.html"><span class="el-num">15</span><span class="el-sym">Dp</span><span class="el-name">DP recipe</span></a>
<a class="el fam-dp" href="15_dynamic_programming_foundations.html"><span class="el-num">15</span><span class="el-sym">Mz</span><span class="el-name">memoization</span></a>
<a class="el fam-dp" href="15_dynamic_programming_foundations.html"><span class="el-num">15</span><span class="el-sym">Ks</span><span class="el-name">knapsack</span></a>
<a class="el fam-dp" href="16_dynamic_programming_patterns.html"><span class="el-num">16</span><span class="el-sym">Ed</span><span class="el-name">edit distance</span></a>
<a class="el fam-dp" href="16_dynamic_programming_patterns.html"><span class="el-num">16</span><span class="el-sym">Vt</span><span class="el-name">Viterbi</span></a>
<a class="el fam-algo" href="17_greedy_algorithms.html"><span class="el-num">17</span><span class="el-sym">Xa</span><span class="el-name">exchange arg</span></a>
<a class="el fam-algo" href="18_graph_algorithms.html"><span class="el-num">18</span><span class="el-sym">Ts</span><span class="el-name">topo sort</span></a>
<a class="el fam-algo" href="18_graph_algorithms.html"><span class="el-num">18</span><span class="el-sym">Dj</span><span class="el-name">Dijkstra</span></a>
<a class="el fam-ds" href="19_data_structure_internals.html"><span class="el-num">19</span><span class="el-sym">Hs</span><span class="el-name">hash table</span></a>
<a class="el fam-ds" href="19_data_structure_internals.html"><span class="el-num">19</span><span class="el-sym">Hp</span><span class="el-name">heap</span></a>
<a class="el fam-ds" href="20_bit_manipulation.html"><span class="el-num">20</span><span class="el-sym">Bm</span><span class="el-name">bitmask</span></a>
<a class="el fam-perf" href="21_profiling_and_optimization.html"><span class="el-num">21</span><span class="el-sym">Pf</span><span class="el-name">profiler</span></a>
<a class="el fam-perf" href="22_beyond_python.html"><span class="el-num">22</span><span class="el-sym">Bf</span><span class="el-name">buffer protocol</span></a>
</div>
<div class="ptable-legend"><span class="fam-exec">execution</span><span class="fam-para">paradigms</span><span class="fam-meta">metaprogramming</span><span class="fam-algo">algorithms</span><span class="fam-dp">dynamic programming</span><span class="fam-ds">data structures</span><span class="fam-perf">performance</span></div>

---

## The Two Staircases

**Programs are data.** A function is an object with a code object inside; a class is the result of calling its metaclass on a namespace dict; source is a tree you can rewrite. Metaprogramming treats these as values to inspect, wrap, generate and transform. It turns repetition in *code* into a single definition.

**Solutions are data.** A computed result can be stored and looked up instead of recomputed. `functools.cache` is literally a decorator — a metaprogramming tool — that turns a function's results into a dict; a DP table is the same idea made explicit and ordered. Dynamic programming turns repetition in *computation* into a single evaluation per subproblem.

<div class="versus">
<div class="fighter"><div class="f-name">Programs are data</div><div class="f-sub">Floors 1 → 2 · Chapters 1, 9–12</div><div class="stat">code object<i style="--v:.9"></i></div><div class="stat">function object<i style="--v:.8"></i></div><div class="stat">class namespace<i style="--v:.7"></i></div><div class="stat">AST<i style="--v:.6"></i></div><div class="f-win"><code>@decorator</code>, <code>__set_name__</code>, <code>type(name, bases, ns)</code>, <code>exec</code>: rewrite the program once, run it many times.</div></div>
<div class="vs">=</div>
<div class="fighter p2"><div class="f-name">Solutions are data</div><div class="f-sub">Floors 2 → 3 · Chapters 15–16</div><div class="stat">memo dict<i style="--v:.9"></i></div><div class="stat">DP table<i style="--v:.8"></i></div><div class="stat">rolling rows<i style="--v:.55"></i></div><div class="stat">bitset<i style="--v:.4"></i></div><div class="f-win"><code>@functools.cache</code>, <code>dp[i][j]</code>, <code>reach |= reach &lt;&lt; x</code>: compute each answer once, look it up thereafter.</div></div>
</div>

The bridge between them is a single line of code — `@functools.cache` — and its effect is the whole of Part IV in miniature. Toggle the cache:

<div class="lab" data-lab="fibtree"></div>

The same move — notice the repetition, compute once, look up thereafter — reappears outside the book's chapters in the KV cache of transformer inference, the compiled-graph cache of `torch.compile` keyed by guards, and every build system.

---

## Reading Routes

Four lines through the book. Interchange stations are where the lines share a chapter; every station is a link.

<div class="svgfig">
<svg viewBox="0 0 860 400" width="860" role="img" aria-label="Metro map of reading routes through the book">
<path d="M60 80 L760 80" stroke="#67e8f9" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M140 93 L380 93 L380 190 L700 190" stroke="#c4b5fd" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M140 80 L140 280 L700 280" stroke="#fde047" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M148 280 L148 350 L760 350" stroke="#f9a8d4" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M760 80 L800 80 L800 280 L700 280" stroke="#67e8f9" stroke-width="3" fill="none" stroke-dasharray="6 5"/>
<g>
<a href="00_grand_overview.html"><circle cx="60" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="60" y="58" text-anchor="middle" class="ts">00</text></a>
<a href="01_from_source_to_bytecode.html"><rect x="126" y="68" width="28" height="30" rx="8" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="140" y="56" text-anchor="middle" class="t">01 bytecode</text></a>
<a href="02_objects_names_and_memory.html"><circle cx="220" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="220" y="58" text-anchor="middle" class="ts">02 objects</text></a>
<a href="03_scope_closures_and_binding.html"><rect x="286" y="68" width="28" height="30" rx="8" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="300" y="58" text-anchor="middle" class="ts">03 scope</text></a>
<a href="04_the_data_model_and_attribute_lookup.html"><rect x="366" y="68" width="28" height="30" rx="8" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="380" y="58" text-anchor="middle" class="ts">04 lookup</text></a>
<a href="05_iterators_generators_and_coroutines.html"><circle cx="460" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="460" y="58" text-anchor="middle" class="ts">05 generators</text></a>
<a href="06_functional_programming.html"><circle cx="560" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="560" y="58" text-anchor="middle" class="ts">06 functional</text></a>
<a href="07_types_and_static_typing.html"><circle cx="660" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="660" y="58" text-anchor="middle" class="ts">07 types</text></a>
<a href="08_concurrency_and_parallelism.html"><circle cx="760" cy="80" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="760" y="58" text-anchor="middle" class="ts">08 concurrency</text></a>
<a href="09_decorators.html"><circle cx="460" cy="190" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="460" y="168" text-anchor="middle" class="ts">09 decorators</text></a>
<a href="10_descriptors.html"><circle cx="540" cy="190" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="540" y="214" text-anchor="middle" class="ts">10 descriptors</text></a>
<a href="11_metaclasses_and_class_creation.html"><circle cx="620" cy="190" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="620" y="168" text-anchor="middle" class="ts">11 metaclasses</text></a>
<a href="12_introspection_ast_and_codegen.html"><circle cx="700" cy="190" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="700" y="214" text-anchor="middle" class="ts">12 AST</text></a>
<a href="13_complexity_and_cost_models.html"><rect x="126" y="266" width="36" height="28" rx="8" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="104" y="280" text-anchor="end" class="t">13 cost</text></a>
<a href="19_data_structure_internals.html"><circle cx="300" cy="280" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="300" y="258" text-anchor="middle" class="ts">19 data structures</text></a>
<a href="20_bit_manipulation.html"><circle cx="420" cy="280" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="420" y="258" text-anchor="middle" class="ts">20 bits</text></a>
<a href="21_profiling_and_optimization.html"><circle cx="560" cy="280" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="560" y="258" text-anchor="middle" class="ts">21 profiling</text></a>
<a href="22_beyond_python.html"><rect x="686" y="266" width="28" height="28" rx="8" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="700" y="258" text-anchor="middle" class="ts">22 beyond</text></a>
<a href="14_recursion_and_divide_and_conquer.html"><circle cx="240" cy="350" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="240" y="374" text-anchor="middle" class="ts">14 recursion</text></a>
<a href="15_dynamic_programming_foundations.html"><circle cx="340" cy="350" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="340" y="374" text-anchor="middle" class="ts">15 DP I</text></a>
<a href="16_dynamic_programming_patterns.html"><circle cx="440" cy="350" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="440" y="374" text-anchor="middle" class="ts">16 DP II</text></a>
<a href="17_greedy_algorithms.html"><circle cx="540" cy="350" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="540" y="374" text-anchor="middle" class="ts">17 greedy</text></a>
<a href="18_graph_algorithms.html"><circle cx="640" cy="350" r="9" fill="#0d1117" stroke="#f0f3f6" stroke-width="3"/><text x="640" y="374" text-anchor="middle" class="ts">18 graphs</text></a>
<a href="23_problem_solving_playbook.html"><circle cx="760" cy="350" r="11" fill="#0d1117" stroke="#34d399" stroke-width="4"/><text x="760" y="374" text-anchor="middle" class="t">23 playbook</text></a>
</g>
<g>
<rect x="180" y="128" width="14" height="14" rx="3" fill="#67e8f9"/><text x="202" y="136" class="ts">Foundations</text>
<rect x="180" y="152" width="14" height="14" rx="3" fill="#c4b5fd"/><text x="202" y="160" class="ts">Metaprogramming</text>
<rect x="180" y="176" width="14" height="14" rx="3" fill="#fde047"/><text x="202" y="184" class="ts">"My Python is slow"</text>
<rect x="180" y="200" width="14" height="14" rx="3" fill="#f9a8d4"/><text x="202" y="208" class="ts">Dynamic programming</text>
</g>
</svg>
<div class="figcap">Rounded squares are interchanges. The dashed cyan link: concurrency (Ch 8) is a stop on the performance line, after profiling has told you whether you are computing or waiting.</div>
</div>

---

## Five Chapters to Read First

<div class="steps">
<div class="step"><b><a href="./01_from_source_to_bytecode.html">Ch 1 · Bytecode</a></b><span>The vocabulary of code objects, functions and frames.</span></div>
<div class="step"><b><a href="./04_the_data_model_and_attribute_lookup.html">Ch 4 · Attribute lookup</a></b><span>The algorithm every attribute-level technique hooks.</span></div>
<div class="step"><b><a href="./09_decorators.html">Ch 9 · Decorators</a></b><span>The metaprogramming ladder.</span></div>
<div class="step"><b><a href="./13_complexity_and_cost_models.html">Ch 13 · Cost models</a></b><span>What "fast" means in CPython, measured.</span></div>
<div class="step"><b><a href="./15_dynamic_programming_foundations.html">Ch 15 · DP foundations</a></b><span>The seven-field recipe.</span></div>
</div>

---

## How This Book Is Verified

<div class="receipts">
<div class="receipt"><div class="r-head">PROGRAMMING · VERIFIED</div><div class="r-sub">tools/check_snippets.py --strict</div><div class="r-rule"></div><div class="r-line"><span>snippets executed</span><span>173</span></div><div class="r-line muted"><span>skipped: optional deps, 3.15</span><span>6</span></div><div class="r-line"><span>outputs diffed vs real run</span><span>all</span></div><div class="r-line"><span>type claims checked (mypy)</span><span>Ch 7</span></div><div class="r-rule"></div><div class="r-total"><span>FAILURES</span><span>0</span></div><div class="r-foot">CPython 3.13.18 · re-run any time</div></div>
<div class="receipt"><div class="r-head">MEASUREMENTS</div><div class="r-sub">bench/ · tools/make_figures.py</div><div class="r-rule"></div><div class="r-line"><span>benchmark scripts</span><span>8</span></div><div class="r-line"><span>charts generated from them</span><span>11</span></div><div class="r-line"><span>interactive labs</span><span>18</span></div><div class="r-line muted"><span>numbers typed by hand</span><span>0</span></div><div class="r-rule"></div><div class="r-total"><span>CONDITIONS</span><span>stated</span></div><div class="r-foot">4 vCPU Xeon @ 2.1 GHz · ratios travel, ns don't</div></div>
</div>

The authoring standard is [PROMPT.md](./PROMPT.md). Version-specific claims cite the PEP or What's New page; [Appendix D](./appendix_d_python_versions.md) collects them.

## Key Takeaways

- The book has three floors — execution, expression, technique — and each chapter's question belongs to exactly one.
- Metaprogramming hooks specific points of the execution pipeline; climb its ladder only as far as necessary.
- Dynamic programming is the computational twin of metaprogramming: both replace repetition with a stored, reusable result.
- Every DP is specified by seven fields and developed by a brute → memo → table → optimize pipeline checked against an oracle.
- Every snippet and number in the book is executed or measured, not asserted.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Structure and Interpretation of Computer Programs*, 2nd ed. | Abelson, Sussman, 1996 | MIT Press | "Programs as data", the layered view of computation |
| *Introduction to Algorithms*, 4th ed. | Cormen et al., 2022 | MIT Press | The algorithmic floor's canonical reference |
| *Fluent Python*, 2nd ed. | Ramalho, 2022 | O'Reilly | The Python data model as the organising idea for Floors 1–2 |
| [Appendix E — Bibliography](./appendix_e_bibliography.md) | this book | — | Full reading list and order |

---

**Next:** [Chapter 1 — From Source to Bytecode](./01_from_source_to_bytecode.md) — the pipeline every later chapter refers back to.
