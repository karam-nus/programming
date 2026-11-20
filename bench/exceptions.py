"""Chapter 5: what try/except costs when nothing is raised, and when something is."""
from _harness import ns_per_op, table

S = '''
d = {i: i for i in range(100)}
def plain(k): return d[k]
def guarded(k):
    try:
        return d[k]
    except KeyError:
        return -1
def lbyl(k): return d[k] if k in d else -1
def getter(k): return d.get(k, -1)
'''
rows = [
    ("d[k] (no try)",                              ns_per_op("plain(5)", S)),
    ("try: d[k] — key present (nothing raised)",    ns_per_op("guarded(5)", S)),
    ("try: d[k] — key missing (KeyError raised)",   ns_per_op("guarded(500)", S)),
    ("if k in d — key missing (LBYL)",              ns_per_op("lbyl(500)", S)),
    ("d.get(k, -1) — key missing",                  ns_per_op("getter(500)", S)),
]
table(rows, baseline="d[k] (no try)")
