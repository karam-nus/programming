#!/usr/bin/env python3
"""Run every ```python block of each chapter, in order, in one namespace per chapter.

Contract (see PROMPT.md §4.4):
  * first line ``# illustrative``          -> block skipped
  * first line ``# requires: mod1, mod2``  -> skipped unless all modules import
  * everything else must run without raising.
  * a ```text block that immediately follows a python block is its expected
    stdout; mismatches are reported as MISMATCH (a failure with --strict).

Usage:
  python3 tools/check_snippets.py                # every *.md in the repo root
  python3 tools/check_snippets.py 15_*.md -v     # selected chapters, echo their stdout
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import re
import sys
import traceback
from pathlib import Path

FENCE = re.compile(r"^```python[ \t]*\n(.*?)^```[ \t]*\n(?:\s*```text[ \t]*\n(.*?)^```[ \t]*$)?", re.M | re.S)
ROOT = Path(__file__).resolve().parent.parent


def blocks(text: str) -> list[tuple[int, str, str | None]]:
    out = []
    for m in FENCE.finditer(text):
        line_no = text.count("\n", 0, m.start()) + 1
        out.append((line_no, m.group(1), m.group(2)))
    return out


def norm(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.strip().splitlines())


def skipped(code: str) -> str | None:
    first = code.lstrip().splitlines()[0] if code.strip() else ""
    if first.startswith("# illustrative"):
        return "illustrative"
    if first.startswith("# requires:"):
        mods = [m.strip() for m in first.split(":", 1)[1].split(",") if m.strip()]
        missing = [m for m in mods if importlib.util.find_spec(m) is None]
        if missing:
            return "missing " + ", ".join(missing)
    return None


def run_chapter(path: Path, verbose: bool, strict: bool = False) -> tuple[int, int, int]:
    ns: dict = {"__name__": f"chapter_{path.stem}"}
    ok = skip = fail = 0
    for line_no, code, expected in blocks(path.read_text(encoding="utf-8")):
        reason = skipped(code)
        if reason:
            skip += 1
            continue
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(compile(code, f"{path.name}:{line_no}", "exec"), ns)
            if expected is not None and norm(expected) != norm(buf.getvalue()):
                print(f"MISMATCH {path.name}:{line_no}\n  expected:\n{expected}  got:\n{buf.getvalue()}")
                if strict:
                    fail += 1
                    continue
            ok += 1
            if verbose and buf.getvalue():
                print(f"--- {path.name}:{line_no}\n{buf.getvalue()}", end="")
        except BaseException:  # noqa: BLE001 - report everything, including SystemExit
            fail += 1
            print(f"FAIL {path.name}:{line_no}")
            traceback.print_exc(limit=3)
    return ok, skip, fail


def main(argv: list[str]) -> int:
    verbose = "-v" in argv
    strict = "--strict" in argv
    names = [a for a in argv if a not in ("-v", "--strict")]
    paths = [Path(n) for n in names] if names else sorted(ROOT.glob("*.md"))
    sys.setrecursionlimit(10_000)
    total_fail = 0
    for p in paths:
        ok, skip, fail = run_chapter(p, verbose, strict)
        if ok or skip or fail:
            print(f"{p.name:48s} ok={ok:3d} skipped={skip:2d} failed={fail}")
        total_fail += fail
    return 1 if total_fail else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
