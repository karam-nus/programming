---
title: "Chapter 18 — Graph Algorithms"
---

[← Back to Table of Contents](./README.md)

# Chapter 18 — Graph Algorithms

> *"Most problems become graph problems the moment you draw what depends on what."*

## Overview

Graphs are where the techniques of Part IV meet: traversal is search, shortest paths are greedy (Dijkstra) or DP (Bellman–Ford), topological order is the evaluation order of every DP ([Chapter 16](./16_dynamic_programming_patterns.md)) and of reverse-mode autodiff. This chapter covers representations, iterative BFS and DFS, topological sorting — with a 40-line autograd engine to show why backprop *is* a reverse topological traversal — Dijkstra with `heapq`, Bellman–Ford, union-find, and minimum spanning trees. Each algorithm is cross-checked against an independent one on random graphs.

<div class="diagram">
<div class="diagram-title">Which algorithm for which question</div>
<div class="diagram-grid cols-3">
  <div class="diagram-card accent"><div class="card-title">Reachability / unweighted distance</div><div class="card-desc">BFS · Θ(V + E)</div></div>
  <div class="diagram-card green"><div class="card-title">Dependency order / cycle detection</div><div class="card-desc">Kahn or DFS topological sort · Θ(V + E)</div></div>
  <div class="diagram-card purple"><div class="card-title">Weighted shortest paths, w ≥ 0</div><div class="card-desc">Dijkstra · Θ((V + E) log V)</div></div>
  <div class="diagram-card orange"><div class="card-title">Negative weights</div><div class="card-desc">Bellman–Ford · Θ(VE)</div></div>
  <div class="diagram-card cyan"><div class="card-title">Connectivity under unions</div><div class="card-desc">Union-find · ~Θ(α(n)) per op</div></div>
  <div class="diagram-card pink"><div class="card-title">Cheapest connecting network</div><div class="card-desc">Kruskal / Prim · Θ(E log E)</div></div>
</div>
</div>

---

## Representations

| Representation | Space | Edge query | Iterate neighbours | Choose this when |
|----------------|:---:|:---:|:---:|------------------|
| **Adjacency list** `dict[node, list[node]]` | $\Theta(V + E)$ | $\Theta(\deg)$ | $\Theta(\deg)$ | default — sparse graphs |
| **Adjacency set** `dict[node, set[node]]` | $\Theta(V + E)$ | $\Theta(1)$ avg | $\Theta(\deg)$ | frequent "is there an edge?" queries |
| **Adjacency matrix** (list of lists / NumPy) | $\Theta(V^2)$ | $\Theta(1)$ | $\Theta(V)$ | dense graphs, Floyd–Warshall, matrix-power tricks |
| **Edge list** `list[(u, v, w)]` | $\Theta(E)$ | $\Theta(E)$ | $\Theta(E)$ | Kruskal, Bellman–Ford, input format |

`collections.defaultdict(list)` builds adjacency lists without key checks. For graphs with millions of edges, Python objects dominate memory (an edge in a list-of-lists costs ~36+ bytes, [Chapter 13](./13_complexity_and_cost_models.md)); use CSR arrays (`scipy.sparse`) or a library (`networkx` for convenience, `igraph`/`rustworkx`/`graph-tool` for speed).

---

## BFS and DFS, Iteratively

| | |
|---|---|
| **Problem** | Visit every vertex reachable from a source; BFS also gives unweighted shortest distances |
| **Paradigm** | Search with a frontier: FIFO queue (BFS) or LIFO stack (DFS) |
| **Time** | $\Theta(V + E)$ |
| **Space** | $\Theta(V)$ |
| **Correctness rests on** | BFS: vertices leave the queue in non-decreasing distance order |
| **Python** | `collections.deque` for the queue — never `list.pop(0)` (22× slower at $n = 1000$, [Chapter 13](./13_complexity_and_cost_models.md)) |
| **Failure modes** | Marking visited on pop instead of push (duplicates in the frontier); recursive DFS hitting the recursion limit |

```python
from collections import deque, defaultdict

def bfs_dist(adj, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        v = q.popleft()
        for u in adj[v]:
            if u not in dist:              # mark on push: each vertex enqueued once
                dist[u] = dist[v] + 1
                q.append(u)
    return dist

def dfs_order(adj, src):
    seen, order, stack = set(), [], [src]
    while stack:
        v = stack.pop()
        if v in seen:
            continue
        seen.add(v); order.append(v)
        stack.extend(reversed(adj[v]))     # reversed: visit neighbours in listed order
    return order

adj = defaultdict(list)
for a, b in [(0, 1), (0, 2), (1, 3), (2, 3), (3, 4), (5, 6)]:
    adj[a].append(b); adj[b].append(a)
print(bfs_dist(adj, 0), dfs_order(adj, 0))
```

```text
{0: 0, 1: 1, 2: 1, 3: 2, 4: 3} [0, 1, 3, 2, 4]
```

Vertices 5 and 6 are absent: unreachable from 0. Running BFS from each unvisited vertex enumerates **connected components** in $\Theta(V + E)$ total. On a grid (images, game maps), the "graph" is implicit — neighbours are computed from coordinates — and the same code applies with `adj[v]` replaced by a neighbour function; flood fill and connected-component labelling of segmentation masks are BFS.

Same graph, four algorithms. The only thing that changes between BFS, DFS and Dijkstra is the data structure holding the frontier:

<div class="lab" data-lab="graph" data-alg="bfs"></div>

---

## Topological Sort

A **topological order** of a DAG lists vertices so that every edge goes forward. It exists iff the graph has no cycle, and it is the evaluation order for anything defined by dependencies: build systems, task schedulers, spreadsheet recalculation, DP over a DAG of states, and the forward and backward passes of a computation graph.

| | |
|---|---|
| **Problem** | Order the vertices of a DAG so all edges point forward; detect cycles otherwise |
| **Paradigm** | Kahn: repeatedly remove a vertex with in-degree 0. DFS: reverse post-order |
| **Time** | $\Theta(V + E)$ |
| **Space** | $\Theta(V)$ |
| **Correctness rests on** | A DAG always has an in-degree-0 vertex; removing it leaves a DAG |
| **Python** | `graphlib.TopologicalSorter` (3.9+), which also supports parallel "ready" batches |
| **Failure modes** | Forgetting cycle detection: Kahn ends with unprocessed vertices if there is a cycle |

```python
from collections import deque

def kahn(nodes, edges):
    indeg = {v: 0 for v in nodes}
    out = {v: [] for v in nodes}
    for a, b in edges:
        out[a].append(b); indeg[b] += 1
    q = deque(v for v in nodes if indeg[v] == 0)
    order = []
    while q:
        v = q.popleft(); order.append(v)
        for u in out[v]:
            indeg[u] -= 1
            if indeg[u] == 0:
                q.append(u)
    if len(order) != len(nodes):
        raise ValueError("cycle detected")
    return order

print(kahn("abcde", [("a", "b"), ("a", "c"), ("b", "d"), ("c", "d"), ("d", "e")]))
try:
    kahn("xyz", [("x", "y"), ("y", "z"), ("z", "x")])
except ValueError as e:
    print("ValueError:", e)
```

```text
['a', 'b', 'c', 'd', 'e']
ValueError: cycle detected
```

### Backpropagation is reverse topological order

Reverse-mode automatic differentiation computes $\partial L / \partial x$ for every node $x$ of a computation graph. By the chain rule, a node's gradient is the sum over its consumers $c$ of $\frac{\partial L}{\partial c} \cdot \frac{\partial c}{\partial x}$ — so every consumer's gradient must be complete before the node's is computed. That is exactly the topological order of the **reversed** graph. PyTorch's autograd engine walks the graph from the loss with a dependency count per node — Kahn's algorithm, run backwards — and `loss.backward()` is that traversal.

<details class="code-fold">
<summary>A scalar autograd engine whose <code>backward()</code> is a reverse topological sort (44 lines)</summary>

```python
import math

class Value:
    def __init__(self, data, parents=(), local_grads=()):
        self.data, self.grad = data, 0.0
        self.parents, self.local_grads = parents, local_grads     # d(self)/d(parent)

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data + other.data, (self, other), (1.0, 1.0))
    __radd__ = __add__

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data * other.data, (self, other), (other.data, self.data))
    __rmul__ = __mul__

    def tanh(self):
        t = math.tanh(self.data)
        return Value(t, (self,), (1 - t * t,))

    def backward(self):
        order, seen = [], set()
        stack = [(self, False)]
        while stack:                           # iterative DFS post-order (Chapter 14)
            v, done = stack.pop()
            if done:
                order.append(v); continue
            if id(v) in seen:
                continue
            seen.add(id(v))
            stack.append((v, True))
            stack.extend((p, False) for p in v.parents)
        self.grad = 1.0
        for v in reversed(order):              # reverse topological: consumers before producers
            for p, g in zip(v.parents, v.local_grads):
                p.grad += v.grad * g

x, w, b = Value(0.5), Value(-1.5), Value(2.0)
y = (x * w + b).tanh()
z = y * y + x                                  # x is used twice: gradients must accumulate
z.backward()

h = 1e-6                                       # check against central finite differences
f = lambda xv: math.tanh(xv * -1.5 + 2.0) ** 2 + xv
print(round(x.grad, 6), round((f(0.5 + h) - f(0.5 - h)) / (2 * h), 6))
```

```text
0.286386 0.286386
```

</details>

The `+=` in the last loop is the reason gradients accumulate in PyTorch (and must be zeroed between steps): a tensor used in several places receives a contribution from each consumer.

---

## Dijkstra's Algorithm

| | |
|---|---|
| **Problem** | Single-source shortest paths, non-negative weights |
| **Paradigm** | Greedy with a priority queue |
| **Time** | $\Theta((V + E)\log V)$ with a binary heap |
| **Space** | $\Theta(V + E)$ for the heap with duplicates |
| **Correctness rests on** | No negative edges: when a vertex is popped with distance $d$, no undiscovered path can be shorter |
| **Python** | `heapq` (no decrease-key — push duplicates, skip stale entries) |
| **Failure modes** | Negative edges silently give wrong answers; forgetting the stale-entry check makes it quadratic or wrong |

The greedy-choice argument ([Chapter 17](./17_greedy_algorithms.md)): let $v$ be the unsettled vertex with the smallest tentative distance $d$. Any other path to $v$ leaves the settled set through some unsettled vertex $u$ with tentative distance $\ge d$, and the rest of the path has non-negative length, so it is $\ge d$. Hence $d$ is final.

```python
import heapq, math, random

def dijkstra(adj, src):
    dist = {src: 0}
    heap = [(0, src)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist.get(v, math.inf):
            continue                                  # stale entry: v was already settled closer
        for u, w in adj.get(v, ()):
            nd = d + w
            if nd < dist.get(u, math.inf):
                dist[u] = nd
                heapq.heappush(heap, (nd, u))
    return dist

def bellman_ford(n, edges, src):
    dist = [math.inf] * n
    dist[src] = 0
    for _ in range(n - 1):                            # dp over "paths with at most k edges"
        for a, b, w in edges:
            if dist[a] + w < dist[b]:
                dist[b] = dist[a] + w
    for a, b, w in edges:
        if dist[a] + w < dist[b]:
            raise ValueError("negative cycle reachable from source")
    return dist

random.seed(8)
for _ in range(200):
    n = random.randint(1, 8)
    edges = [(random.randrange(n), random.randrange(n), random.randint(0, 9)) for _ in range(random.randint(0, 20))]
    adj = {}
    for a, b, w in edges:
        adj.setdefault(a, []).append((b, w))
    dj, bf = dijkstra(adj, 0), bellman_ford(n, edges, 0)
    assert all(dj.get(v, math.inf) == bf[v] for v in range(n))
print("Dijkstra agrees with Bellman-Ford on 200 random graphs")
```

```text
Dijkstra agrees with Bellman-Ford on 200 random graphs
```

**Bellman–Ford is a DP**: after $k$ rounds, $\mathrm{dist}[v] \le$ the length of the shortest path to $v$ using at most $k$ edges. A shortest simple path has at most $V - 1$ edges, so $V - 1$ rounds suffice; any improvement in round $V$ proves a negative cycle. It is $\Theta(VE)$ — slower than Dijkstra, but correct with negative weights, which arise in arbitrage detection (log-prices) and in difference-constraint systems. With a target vertex and an admissible heuristic, Dijkstra becomes A\*.

---

## Union-Find

| | |
|---|---|
| **Problem** | Maintain a partition under "merge two sets" and "are $x, y$ in the same set?" |
| **Paradigm** | Forest of parent pointers; path compression + union by size |
| **Time** | $\Theta(\alpha(n))$ amortized per operation — inverse Ackermann, $\le 4$ for any practical $n$ |
| **Space** | $\Theta(n)$ |
| **Correctness rests on** | Each set is a tree; its root is the representative |
| **Python** | ~15 lines; `scipy.cluster.hierarchy.DisjointSet` (SciPy 1.6+) exists |
| **Failure modes** | Omitting both optimizations gives $\Theta(n)$ chains; recursive `find` hits the recursion limit before compression helps |

```python
class DSU:
    def __init__(self, n):
        self.parent, self.size = list(range(n)), [1] * n
    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:                 # path compression, iteratively
            self.parent[x], x = root, self.parent[x]
        return root
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra; self.size[ra] += self.size[rb]   # union by size
        return True

d = DSU(6)
d.union(0, 1); d.union(2, 3); d.union(1, 3)
print(d.find(0) == d.find(2), d.find(4) == d.find(5), len({d.find(i) for i in range(6)}))
```

```text
True False 3
```

Union-find answers connectivity *incrementally* as edges arrive — dataset deduplication (merge near-duplicate pairs into clusters), connected components in a streaming edge list, Kruskal's algorithm below — without re-running BFS after each edge.

---

## Minimum Spanning Trees: Kruskal

| | |
|---|---|
| **Problem** | Connect all vertices of a weighted undirected graph with minimum total edge weight |
| **Paradigm** | Greedy: take edges in increasing weight; skip those that would form a cycle |
| **Time** | $\Theta(E \log E)$ (the sort) |
| **Space** | $\Theta(V)$ |
| **Correctness rests on** | Cut property: the lightest edge crossing any cut belongs to some MST |
| **Python** | `sorted(edges)` + `DSU` |
| **Failure modes** | Applying it to directed graphs (that is the arborescence problem — different algorithm) |

```python
import itertools, random

def kruskal(n, edges):
    d, total, used = DSU(n), 0, 0
    for w, a, b in sorted(edges):
        if d.union(a, b):
            total += w; used += 1
    return total if used == n - 1 else None           # None: graph is disconnected

def mst_brute(n, edges):
    best = None
    for combo in itertools.combinations(edges, n - 1):
        d = DSU(n)
        if all(d.union(a, b) for _, a, b in combo):
            s = sum(w for w, _, _ in combo)
            best = s if best is None else min(best, s)
    return best

random.seed(9)
for _ in range(100):
    n = random.randint(1, 6)
    edges = [(random.randint(1, 9), a, b) for a in range(n) for b in range(a + 1, n) if random.random() < 0.7]
    assert kruskal(n, edges) == mst_brute(n, edges)
print("Kruskal matches brute force on 100 random graphs")
```

```text
Kruskal matches brute force on 100 random graphs
```

Single-linkage hierarchical clustering is Kruskal stopped early: removing the $k - 1$ heaviest MST edges leaves the $k$ single-linkage clusters.

---

## Key Takeaways

- Choose the representation by operation: adjacency lists by default, sets for edge queries, matrices for dense graphs, edge lists for Kruskal and Bellman–Ford.
- BFS with a `deque`, marking on push, gives unweighted distances in $\Theta(V + E)$; write DFS iteratively to avoid the recursion limit.
- Topological order is the evaluation order of every dependency computation; Kahn's algorithm detects cycles as a by-product.
- Backpropagation is a reverse topological traversal with gradient accumulation — which is why gradients add up and must be zeroed.
- Dijkstra is a greedy that is correct only for non-negative weights; with `heapq`, push duplicates and skip stale entries.
- Bellman–Ford is a DP over the number of edges, handles negative weights, and detects negative cycles.
- Union-find with path compression and union by size answers incremental connectivity in near-constant time and powers Kruskal's MST.

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Introduction to Algorithms*, 4th ed., ch. 20–23 | Cormen et al., 2022 | MIT Press | BFS/DFS, topological sort, MST cut property, Dijkstra, Bellman–Ford |
| "A note on two problems in connexion with graphs" | Dijkstra, 1959 | doi.org/10.1007/BF01386390 | Dijkstra's algorithm |
| "Topological sorting of large networks" | Kahn, 1962 | doi.org/10.1145/368996.369025 | Kahn's algorithm |
| "Efficiency of a Good But Not Linear Set Union Algorithm" | Tarjan, 1975 | doi.org/10.1145/321879.321884 | The $\alpha(n)$ bound for union-find |
| "Automatic differentiation in machine learning: a survey" | Baydin et al., 2018 | arXiv:1502.05767 | Reverse mode as reverse topological traversal |
| PyTorch autograd mechanics | PyTorch docs | pytorch.org/docs/stable/notes/autograd.html | Gradient accumulation and the graph traversal |
| `graphlib`, `heapq` | Python docs | docs.python.org/3/library/graphlib.html | `TopologicalSorter`; heap API |

---

**Next:** [Chapter 19 — Data Structure Internals](./19_data_structure_internals.md) — what `list`, `dict`, `deque` and `heapq` actually are, and why they cost what they cost.
