#!/usr/bin/env python3
"""Generate every chart in assets/images/ from recorded measurements and exact formulas.

Data sources (never hand-typed numbers):
  * bench/RESULTS.md  — tables written by the bench/*.py scripts
  * exact computations — CPython's list growth rule, fib call counts, sys.getsizeof on this interpreter
  * a deterministic stack profile of Chapter 21's pipeline example (sys.setprofile)

Run:  python3 tools/make_figures.py      (requires matplotlib)
Never hand-edit a generated SVG; change this script and re-run it.
"""
from __future__ import annotations

import collections
import math
import re
import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)

BG, PANEL, GRID, INK, INK2, INK3 = "#0d1117", "#0d1117", "#30363d", "#f0f3f6", "#c9d1d9", "#9da7b3"
ACC, CYAN, ORANGE, PURPLE, PINK, YELLOW, RED, BLUE, GREEN = (
    "#34d399", "#67e8f9", "#fdba74", "#c4b5fd", "#f9a8d4", "#fde047", "#fca5a5", "#93c5fd", "#4ade80")

plt.rcParams.update({
    "figure.facecolor": BG, "axes.facecolor": PANEL, "savefig.facecolor": BG,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "axes.titlecolor": INK, "text.color": INK,
    "xtick.color": INK2, "ytick.color": INK2, "grid.color": GRID, "grid.linewidth": 0.8,
    "font.size": 13, "axes.titlesize": 15, "axes.titleweight": "bold", "axes.labelsize": 13,
    "xtick.labelsize": 12, "ytick.labelsize": 12, "legend.fontsize": 12, "legend.frameon": False,
    "font.family": ["Inter", "DejaVu Sans"], "svg.fonttype": "none", "axes.spines.top": False, "axes.spines.right": False,
    "axes.axisbelow": True, "axes.titlepad": 12,
})


def results() -> dict[str, list[list[str]]]:
    """Parse bench/RESULTS.md into {script name: table rows (header excluded)}."""
    text = (ROOT / "bench" / "RESULTS.md").read_text()
    out, current = {}, None
    for line in text.splitlines():
        m = re.match(r"## (\w+)\.py", line)
        if m:
            current = m.group(1)
            out[current] = []
        elif current and line.startswith("|") and not re.match(r"\|\s*:?-", line):
            cells = [c.strip().strip("`") for c in line.strip("|").split("|")]
            out[current].append(cells)
    return {k: v[1:] for k, v in out.items()}       # drop header row


def conditions() -> str:
    m = re.search(r"Machine: (.*?)\.\n", (ROOT / "bench" / "RESULTS.md").read_text())
    return m.group(1) if m else ""


def save(fig, name: str, note: str = "") -> None:
    if note:
        fig.text(0.995, -0.03, note, ha="right", va="top", fontsize=10, color=INK3)
    fig.savefig(OUT / name, format="svg", bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)
    print("wrote", OUT / name)


R = results()
NOTE = "CPython 3.13.18 · 4 vCPU Xeon @ 2.1 GHz · bench/RESULTS.md"


# 1. Constant-factor cost model (Chapter 13)
def fig_cost_model():
    rows = [(r[0], float(r[1])) for r in R["cost_model"]]
    rows.sort(key=lambda r: r[1])
    fig, ax = plt.subplots(figsize=(10, 6.2))
    colors = [ACC if v < 40 else (ORANGE if v < 1000 else RED) for _, v in rows]
    ax.barh([n for n, _ in rows], [v for _, v in rows], color=colors, height=0.66)
    ax.set_xscale("log")
    for i, (_, v) in enumerate(rows):
        ax.text(v * 1.08, i, f"{v:,.0f} ns" if v >= 100 else f"{v:.1f} ns", va="center", fontsize=11.5, color=INK2)
    ax.set_xlabel("nanoseconds per operation (log scale)")
    ax.set_title("What one operation costs in CPython", loc="left", pad=30)
    ax.grid(axis="x", which="major")
    ax.set_xlim(5, 1e5)
    ax.text(0, 1.02, "green: Θ(1) operations, 10–30 ns   ·   orange: Θ(n) memmove at n = 1000   ·   red: Θ(n) element-by-element at n = 1000",
            transform=ax.transAxes, fontsize=11, color=INK2, va="bottom")
    save(fig, "cost_model.svg", NOTE)


# 2. Attribute access costs (Chapters 4, 10)
def fig_attribute():
    rows = [(r[0], float(r[1])) for r in R["attribute_access"]]
    fig, ax = plt.subplots(figsize=(10, 4.2))
    ax.barh([n for n, _ in rows][::-1], [v for _, v in rows][::-1], color=[CYAN, CYAN, PURPLE, PURPLE, ORANGE, RED][::-1], height=0.62)
    base = rows[0][1]
    for i, (_, v) in enumerate(rows[::-1]):
        ax.text(v + 0.8, i, f"{v:.1f} ns  ({v / base:.1f}×)", va="center", fontsize=12, color=INK2)
    ax.set_xlim(0, max(v for _, v in rows) * 1.35)
    ax.set_xlabel("nanoseconds per read")
    ax.set_title("Each rung of attribute lookup, measured", loc="left")
    ax.grid(axis="x")
    save(fig, "attribute_costs.svg", NOTE)


# 3. Threads vs processes (Chapter 8)
def fig_concurrency():
    rows = R["concurrency"]
    fig, ax = plt.subplots(figsize=(9.5, 4.4))
    labels = ["CPU-bound\n(pure-Python loop)", "I/O-bound\n(50 ms sleeps)"]
    serial = [float(r[1]) for r in rows]; thr = [float(r[2]) for r in rows]; proc = [float(r[3]) for r in rows]
    x = range(len(rows)); w = 0.26
    for off, vals, c, lab in [(-w, serial, INK3, "serial"), (0, thr, CYAN, "4 threads (GIL build)"), (w, proc, ORANGE, "4 processes")]:
        bars = ax.bar([i + off for i in x], vals, w * 0.92, color=c, label=lab)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + 0.012, f"{v:.2f} s", ha="center", fontsize=11.5, color=INK2)
    ax.set_xticks(list(x), labels)
    ax.set_ylabel("wall-clock seconds, 8 jobs")
    ax.set_title("Threads help when waiting, processes help when computing", loc="left")
    ax.legend(loc="upper right")
    ax.grid(axis="y")
    save(fig, "concurrency.svg", NOTE)


# 4. List growth: capacity steps and amortized copies (Chapters 13, 19) — exact, from list_resize's rule
def fig_list_growth():
    def cap(m): return (m + (m >> 3) + 6) & ~3
    size = c = copies = 0
    caps, ratio = [], []
    for n in range(1, 100_001):
        if size == c:
            copies += size
            c = cap(size + 1)
        size += 1
        if n <= 200:
            caps.append((n, c))
        ratio.append(copies / n)
    # cross-check the rule against this interpreter's real lists
    xs, real = [], []
    for i in range(200):
        xs.append(i)
        real.append((sys.getsizeof(xs) - sys.getsizeof([])) // 8)
    assert real == [c for _, c in caps], "growth rule does not match this interpreter"
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 4.4))
    a1.step([n for n, _ in caps], [c for _, c in caps], where="post", color=CYAN, lw=2.2, label="allocated slots (capacity)")
    a1.plot([n for n, _ in caps], [n for n, _ in caps], color=INK3, lw=1.2, ls="--", label="used slots (len)")
    a1.set_xlabel("len(xs) after n appends"); a1.set_ylabel("slots")
    a1.set_title("Capacity grows ≈12.5% + 6 per resize", loc="left"); a1.legend(loc="upper left"); a1.grid()
    a2.plot(range(1, len(ratio) + 1), ratio, color=ACC, lw=2)
    a2.axhline(9, color=RED, ls="--", lw=1.5); a2.text(1.4e3, 9.2, "bound r/(r−1) = 9 for r = 9/8", color=RED, fontsize=11.5)
    a2.set_xscale("log"); a2.set_ylim(0, 10)
    a2.set_xlabel("n appends (log scale)"); a2.set_ylabel("pointer copies ÷ n")
    a2.set_title("…so total copying stays Θ(n): amortized O(1)", loc="left"); a2.grid()
    save(fig, "list_growth.svg", "exact: CPython list_resize rule, verified against sys.getsizeof on 3.13")


# 5. Fibonacci: naive calls vs memoized (Chapter 15)
def fig_fib():
    naive = [1, 1]
    for i in range(2, 31):
        naive.append(naive[-1] + naive[-2] + 1)
    ns = list(range(31))
    fig, ax = plt.subplots(figsize=(9.5, 4.4))
    ax.semilogy(ns, naive, color=RED, lw=2.4, marker="o", ms=4, label="naive recursion: C(n) = C(n−1) + C(n−2) + 1")
    ax.semilogy(ns, [n + 1 for n in ns], color=ACC, lw=2.4, marker="o", ms=4, label="@functools.cache: n + 1 distinct calls")
    for n in (10, 20, 30):
        ax.annotate(f"{naive[n]:,}", (n, naive[n]), textcoords="offset points", xytext=(-10, 10), ha="right", color=INK2, fontsize=11.5)
    ax.annotate("11", (10, 11), textcoords="offset points", xytext=(0, -18), ha="center", color=ACC, fontsize=11.5)
    ax.set_xlabel("n"); ax.set_ylabel("function calls (log scale)")
    ax.set_title("fib(n): the same answer, φⁿ calls vs n + 1", loc="left"); ax.legend(loc="upper left"); ax.grid()
    save(fig, "fib_calls.svg", "exact call counts; fib(10) = 177 calls matches sys.monitoring in Chapter 12")


# 6. dict and set sizes as they grow (Chapter 19) — measured with sys.getsizeof on this interpreter
def fig_dict_set():
    d, s, dn, sn = {}, set(), [], []
    for i in range(1, 301):
        d[i] = i; s.add(i)
        dn.append(sys.getsizeof(d)); sn.append(sys.getsizeof(s))
    fig, ax = plt.subplots(figsize=(10, 4.4))
    ax.step(range(1, 301), dn, where="post", color=CYAN, lw=2.2, label="dict (resize when > 2/3 full)")
    ax.step(range(1, 301), sn, where="post", color=ORANGE, lw=2.2, label="set (resize when > 60% full, ×4 while small)")
    for n in (6, 11, 22, 43, 86, 171):
        ax.axvline(n, color=GRID, lw=0.9)
        ax.text(n + 1, max(dn) * 0.97, str(n), color=CYAN, fontsize=10.5, va="top")
    ax.set_xlabel("number of keys"); ax.set_ylabel("sys.getsizeof (bytes)")
    ax.set_title("Hash tables grow in steps; dict resizes on the 6th, 11th, 22nd… key", loc="left")
    ax.legend(loc="lower right"); ax.grid(axis="y")
    save(fig, "dict_set_growth.svg", f"sys.getsizeof on CPython {sys.version.split()[0]} (64-bit)")


# 7. Optimization ladder (Chapter 21)
def fig_ladder():
    rows = R["optimization_ladder"]
    groups = collections.OrderedDict()
    for rung, variant, ms in rows:
        groups.setdefault(rung, []).append((variant, float(ms)))
    fig, axes = plt.subplots(1, len(groups), figsize=(13, 4.3))
    palette = [RED, ACC, ORANGE, CYAN, PURPLE]
    for ax, (rung, vals) in zip(axes, groups.items()):
        names = [v for v, _ in vals]; ts = [t for _, t in vals]
        ranked = sorted(ts)
        bars = ax.bar(range(len(vals)), ts, color=[ACC if t == ranked[0] else (RED if t == ranked[-1] else ORANGE) for t in ts], width=0.6)
        for b, t in zip(bars, ts):
            ax.text(b.get_x() + b.get_width() / 2, t * 1.02, f"{t:.2f} ms", ha="center", va="bottom", fontsize=11, color=INK2)
        ax.set_xticks(range(len(vals)), [n.replace("_", "_\n", 1) for n in names], fontsize=10.5)
        ax.set_title(rung.split(":")[0] + f"\n{ts[0] / min(ts):.1f}× best/worst", fontsize=13, loc="left")
        ax.set_ylim(0, max(ts) * 1.2); ax.grid(axis="y")
    axes[0].set_ylabel("milliseconds")
    fig.suptitle("The optimization ladder, measured: the data-structure rung dwarfs the rest", x=0.01, ha="left", fontsize=15, fontweight="bold", color=INK)
    fig.tight_layout()
    save(fig, "optimization_ladder.svg", NOTE)


# 8. FFI boundary (Chapter 22)
def fig_ffi():
    rows = [(r[0], float(r[1])) for r in R["ffi_boundary"]]
    fig, ax = plt.subplots(figsize=(10, 3.6))
    ax.barh([n for n, _ in rows][::-1], [v for _, v in rows][::-1], color=[ACC, CYAN, RED], height=0.6)
    for i, (_, v) in enumerate(rows[::-1]):
        ax.text(v + 4, i, f"{v:.1f} ms", va="center", fontsize=12, color=INK2)
    ax.set_xlim(0, max(v for _, v in rows) * 1.25)
    ax.set_xlabel("milliseconds for cos() of 1,000,000 floats — the same C function each time")
    ax.set_title("Crossing into C: cheap per byte, expensive per call", loc="left"); ax.grid(axis="x")
    save(fig, "ffi_boundary.svg", NOTE)


# 9. Memo vs table (Chapter 15)
def fig_memo():
    rows = [(r[0], float(r[1])) for r in R["dp_memo"]]
    fig, ax = plt.subplots(figsize=(9, 3.2))
    labels = {"lcs_memo": "@functools.cache (top-down)", "lcs_table": "2-D table (bottom-up)", "lcs_rows": "two rolling rows"}
    ax.barh([labels[n] for n, _ in rows][::-1], [v for _, v in rows][::-1], color=[ACC, CYAN, ORANGE], height=0.6)
    for i, (_, v) in enumerate(rows[::-1]):
        ax.text(v + 0.6, i, f"{v:.0f} ms", va="center", fontsize=12, color=INK2)
    ax.set_xlim(0, max(v for _, v in rows) * 1.25)
    ax.set_xlabel("milliseconds — LCS of two random 400-character strings")
    ax.set_title("Same recurrence, three implementations", loc="left"); ax.grid(axis="x")
    save(fig, "memo_vs_table.svg", NOTE)


# 10. Front insertion scaling (Chapters 13, 19)
def fig_front():
    rows = [(int(r[0]), float(r[1]), float(r[2])) for r in R["front_insert"]]
    fig, ax = plt.subplots(figsize=(9.5, 4.4))
    ax.loglog([r[0] for r in rows], [r[1] for r in rows], color=RED, marker="o", lw=2.4, label="list.insert(0, x) + pop(0)   Θ(n)")
    ax.loglog([r[0] for r in rows], [r[2] for r in rows], color=ACC, marker="o", lw=2.4, label="deque.appendleft(x) + popleft()   Θ(1)")
    for n, l, d in rows:
        ax.annotate(f"{l:,.0f}", (n, l), textcoords="offset points", xytext=(-6, 8), ha="right", fontsize=11, color=INK2)
    ax.set_xlabel("container length n (log)"); ax.set_ylabel("ns per operation pair (log)")
    ax.set_title("Front of a list vs front of a deque", loc="left"); ax.legend(loc="upper left"); ax.grid(which="major")
    save(fig, "front_insert.svg", NOTE)


# 11. Icicle (flame) graph of Chapter 21's pipeline, from a deterministic stack profile
def fig_flame():
    def parse(lines):
        return [line.split(",") for line in lines]

    def featurize(rows):
        vocab = []
        for row in rows:
            for tok in row:
                if tok not in vocab:
                    vocab.append(tok)
        return vocab

    def pipeline():
        lines = [f"tok{i % 700},tok{(i * 7) % 700}" for i in range(4000)]
        return featurize(parse(lines))

    totals: dict[tuple, int] = collections.Counter()
    stack: list[tuple[str, int]] = []

    def prof(frame, event, arg):
        now = time.perf_counter_ns()
        if event in ("call", "c_call"):
            name = frame.f_code.co_name if event == "call" else getattr(arg, "__name__", "c")
            stack.append((name, now))
        elif event in ("return", "c_return", "c_exception") and stack:
            path = tuple(n for n, _ in stack)
            _, t0 = stack.pop()
            totals[path] += now - t0
    sys.setprofile(prof)
    pipeline()
    sys.setprofile(None)
    # keep paths rooted at pipeline
    tree = {p[p.index("pipeline"):]: t for p, t in totals.items() if "pipeline" in p}
    root = tree[("pipeline",)]
    fig, ax = plt.subplots(figsize=(12, 3.6))
    palette = {"pipeline": PURPLE, "featurize": RED, "parse": CYAN, "<listcomp>": BLUE, "split": ORANGE, "append": YELLOW, "<genexpr>": BLUE}
    offsets: dict[tuple, float] = {("pipeline",): 0.0}
    for path in sorted(tree, key=lambda p: (len(p), p)):
        if len(path) == 1:
            x = 0.0
        else:
            parent = path[:-1]
            if parent not in offsets:
                continue
            x = offsets.get(("__next",) + parent, offsets[parent])
            offsets[("__next",) + parent] = x + tree[path] / root
        offsets[path] = x
        w = tree[path] / root
        depth = len(path) - 1
        ax.add_patch(Rectangle((x, depth), w, 0.92, color=palette.get(path[-1], INK3), alpha=0.9))
        if w > 0.06:
            ax.text(x + 0.005, depth + 0.46, f"{path[-1]}  {100 * w:.0f}%", va="center", fontsize=12, color="#0d1117", fontweight="bold")
    ax.set_xlim(0, 1); ax.set_ylim(0, max(len(p) for p in tree) + 0.1)
    ax.set_yticks([]); ax.set_xticks([0, 0.25, 0.5, 0.75, 1], ["0%", "25%", "50%", "75%", "100%"])
    ax.set_xlabel("share of pipeline() wall time (width) · call depth grows upward")
    share = 100 * tree.get(("pipeline", "featurize"), 0) / root
    ax.set_title(f"Icicle graph: featurize's list-membership loop takes {share:.0f}% of pipeline()", loc="left")
    ax.spines["left"].set_visible(False)
    save(fig, "flame_pipeline.svg", "deterministic stack profile via sys.setprofile, CPython 3.13 (profiler overhead included)")


if __name__ == "__main__":
    for fn in (fig_cost_model, fig_attribute, fig_concurrency, fig_list_growth, fig_fib, fig_dict_set,
               fig_ladder, fig_ffi, fig_memo, fig_front, fig_flame):
        fn()
    print("conditions:", conditions())
