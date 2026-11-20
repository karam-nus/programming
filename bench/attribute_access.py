"""Chapters 04 and 10: the cost of each rung of attribute lookup."""
from _harness import ns_per_op, table

S = '''
import functools
class Plain:
    def __init__(self): self.a = 1
class Slotted:
    __slots__ = ("a",)
    def __init__(self): self.a = 1
class Prop:
    def __init__(self): self._a = 1
    @property
    def a(self): return self._a
class Desc:
    def __set_name__(self, owner, name): self.n = "_" + name
    def __get__(self, obj, owner=None): return getattr(obj, self.n)
    def __set__(self, obj, v): setattr(obj, self.n, v)
class WithDesc:
    a = Desc()
    def __init__(self): self.a = 1
class Dyn:
    def __getattr__(self, name): return 1
class Cached:
    @functools.cached_property
    def a(self): return 1
p, s, pr, wd, dy, ca = Plain(), Slotted(), Prop(), WithDesc(), Dyn(), Cached(); ca.a
'''
rows = [
    ("instance __dict__ attribute (p.a)",    ns_per_op("p.a", S)),
    ("__slots__ attribute (s.a)",            ns_per_op("s.a", S)),
    ("cached_property after first access",   ns_per_op("ca.a", S)),
    ("property (pr.a)",                      ns_per_op("pr.a", S)),
    ("pure-Python data descriptor (wd.a)",   ns_per_op("wd.a", S)),
    ("__getattr__ fallback (dy.a)",          ns_per_op("dy.a", S)),
]
table(rows, baseline="instance __dict__ attribute (p.a)")
