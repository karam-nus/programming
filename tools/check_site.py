#!/usr/bin/env python3
"""Structural checks for every page: run before committing.

  * every class="…" used in Markdown exists as a selector in assets/css/style.css
  * every relative Markdown link, href and src resolves to a file in the repo
  * every <div class="lab" data-lab="X"> names a lab registered in assets/js/pg-*.js
  * no blank line inside an HTML block (it breaks kramdown)
  * chapter front-matter title == H1, back link present, Next/Back footer present
  * pages containing Liquid delimiters are wrapped in raw/endraw
Usage: python3 tools/check_site.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
css = (ROOT / "assets/css/style.css").read_text()
CLASSES = set(re.findall(r"\.([a-zA-Z][\w-]*)", re.sub(r"/\*.*?\*/", "", css, flags=re.S)))
LABS = set()
for js in (ROOT / "assets/js").glob("pg-*.js"):
    LABS |= set(re.findall(r"P\.lab\('([\w-]+)'", js.read_text()))

pages = sorted([*ROOT.glob("[0-9][0-9]_*.md"), *ROOT.glob("appendix_*.md"), ROOT / "README.md", ROOT / "PROMPT.md", ROOT / "bench/RESULTS.md"])
problems: list[str] = []
for f in pages:
    s = f.read_text(encoding="utf-8")
    body = re.sub(r"^(`{3,4}).*?^\1", "", s, flags=re.M | re.S)          # ignore fenced code
    body_nocode = re.sub(r"`[^`\n]*`", "", body)                         # and inline code
    rel = f.relative_to(ROOT)
    for target in re.findall(r"\]\((\.{1,2}/[^)#\s]+)", body_nocode):
        if not (f.parent / target).resolve().exists():
            problems.append(f"{rel}: broken link {target}")
    for attr, target in re.findall(r'\b(href|src)="([^"#:]+)"', body_nocode):
        if target.startswith(("http", "mailto", "/")):
            continue
        cand = (f.parent / target).resolve()
        if not (cand.exists() or cand.with_suffix(".md").exists() or Path(str(cand).replace(".html", ".md")).exists()):
            problems.append(f"{rel}: unresolved {attr}={target}")
    for cls in re.findall(r'class="([^"]+)"', body_nocode):
        for c in cls.split():
            if c not in CLASSES and c not in {"lab"}:
                problems.append(f"{rel}: unknown class {c}")
    for lab in re.findall(r'data-lab="([\w-]+)"', body_nocode):
        if lab not in LABS:
            problems.append(f"{rel}: unknown lab {lab}")
    depth = 0
    for i, line in enumerate(body.splitlines(), 1):
        if depth > 0 and line.strip() == "":
            problems.append(f"{rel}: blank line inside an HTML block near body line {i}")
        depth += len(re.findall(r"<div\b", line)) - len(re.findall(r"</div>", line))
        depth = max(depth, 0)
    if ("{{" in s or "{%" in s) and "{% raw %}" not in s:
        problems.append(f"{rel}: contains Liquid delimiters but is not wrapped in raw tags")
    if f.name[:2].isdigit() or f.name.startswith("appendix"):
        title = re.search(r'^title: "(.*)"', s, re.M).group(1)
        h1 = re.search(r"^# (.*)$", body, re.M).group(1)
        if title != h1:
            problems.append(f"{rel}: title/H1 mismatch")
        if "[← Back to Table of Contents](./README.md)" not in s:
            problems.append(f"{rel}: missing back link")
        if "**Next:**" not in s and "**Back to:**" not in s:
            problems.append(f"{rel}: missing Next footer")

print("\n".join(problems) or f"site checks passed: {len(pages)} pages, {len(CLASSES)} CSS classes, {len(LABS)} labs")
sys.exit(1 if problems else 0)
