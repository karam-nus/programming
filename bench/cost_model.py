"""Chapter 13/21: the CPython constant-factor cost model."""
from _harness import ns_per_op, table

S = "import collections; xs=list(range(1000)); d={i:i for i in range(1000)}; s=set(xs); dq=collections.deque(xs); x=5\nclass C:\n    def __init__(s): s.a=1\n    def m(s): return 1\nc=C()\ndef f(): return 1\n"
rows = [
    ("local variable load (x)",             ns_per_op("x", S)),
    ("integer add (x + 1)",                 ns_per_op("x + 1", S)),
    ("attribute read (c.a)",                ns_per_op("c.a", S)),
    ("method call (c.m())",                 ns_per_op("c.m()", S)),
    ("function call (f())",                 ns_per_op("f()", S)),
    ("dict lookup (d[500])",                ns_per_op("d[500]", S)),
    ("set membership (500 in s)",           ns_per_op("500 in s", S)),
    ("list index (xs[500])",                ns_per_op("xs[500]", S)),
    ("list membership, n=1000 (999 in xs)", ns_per_op("999 in xs", S, number=20_000)),
    ("list.append + pop",                   ns_per_op("xs.append(1); xs.pop()", S)),
    ("list.insert(0) + pop(0), n=1000",     ns_per_op("xs.insert(0, 1); xs.pop(0)", S)),
    ("deque.appendleft + popleft, n=1000",  ns_per_op("dq.appendleft(1); dq.popleft()", S)),
    ("sum(xs), n=1000",                     ns_per_op("sum(xs)", S, number=20_000)),
    ("for-loop sum, n=1000",                ns_per_op("t=0\nfor v in xs: t+=v", S, number=20_000)),
]
table(rows, baseline="local variable load (x)")
