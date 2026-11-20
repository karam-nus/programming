"""Shared timing harness: median of 7 repeats, reported as ns per operation."""
from __future__ import annotations

import platform
import statistics
import sys
import timeit


def env() -> str:
    impl = platform.python_implementation()
    v = ".".join(map(str, sys.version_info[:3]))
    ft = " (free-threaded)" if hasattr(sys, "_is_gil_enabled") and not sys._is_gil_enabled() else ""
    return f"{impl} {v}{ft}, {platform.system()} {platform.machine()}, {platform.processor() or 'cpu'}"


def ns_per_op(stmt: str, setup: str = "pass", number: int = 200_000, repeat: int = 7, g: dict | None = None) -> float:
    t = timeit.Timer(stmt, setup, globals=g)
    runs = t.repeat(repeat=repeat, number=number)
    return statistics.median(runs) / number * 1e9


def table(rows: list[tuple[str, float]], baseline: str | None = None) -> None:
    base = dict(rows).get(baseline) if baseline else None
    print(f"> {env()}; median of 7 repeats\n")
    print(f"| {'operation':44s} | ns/op | ratio |")
    print(f"|{'-'*46}|------:|------:|")
    for name, v in rows:
        r = f"{v / base:5.1f}x" if base else "  -  "
        print(f"| {name:44s} | {v:5.1f} | {r} |")
