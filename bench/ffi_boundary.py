"""Chapter 22: per-call boundary cost vs per-buffer cost."""
import ctypes, ctypes.util, math, statistics, timeit
import numpy as np
from _harness import env

libm = ctypes.CDLL(ctypes.util.find_library("m"))
libm.cos.restype, libm.cos.argtypes = ctypes.c_double, [ctypes.c_double]
N = 1_000_000
xs = [i * 1e-6 for i in range(N)]
arr = np.array(xs)

def per_call(fn):
    return [fn(x) for x in xs]

def t(f, number=1):
    return statistics.median(timeit.repeat(f, number=number, repeat=5)) / number

if __name__ == "__main__":
    print(f"> {env()}; NumPy {np.__version__}; cos over 1,000,000 floats; median of 5\n")
    rows = [("ctypes libm.cos, one call per element", t(lambda: per_call(libm.cos))),
            ("math.cos, one call per element", t(lambda: per_call(math.cos))),
            ("numpy.cos on the whole array (one call)", t(lambda: np.cos(arr), number=10))]
    base = rows[1][1]
    print("| variant | ms | vs math.cos loop |\n|---|---:|---:|")
    for name, v in rows:
        print(f"| {name} | {v * 1e3:.1f} | {v / base:.2f}x |")
