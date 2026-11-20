"""Chapter 15: memoization vs tabulation vs space-optimized tabulation (LCS)."""
import functools, random, sys, timeit, statistics
from _harness import env

sys.setrecursionlimit(20_000)
random.seed(0)
A = "".join(random.choice("ACGT") for _ in range(400))
B = "".join(random.choice("ACGT") for _ in range(400))

def lcs_memo(a, b):
    @functools.cache
    def go(i, j):
        if i == len(a) or j == len(b): return 0
        if a[i] == b[j]: return 1 + go(i + 1, j + 1)
        return max(go(i + 1, j), go(i, j + 1))
    return go(0, 0)

def lcs_table(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            dp[i][j] = 1 + dp[i+1][j+1] if a[i] == b[j] else max(dp[i+1][j], dp[i][j+1])
    return dp[0][0]

def lcs_rows(a, b):
    m = len(b); nxt = [0] * (m + 1)
    for i in range(len(a) - 1, -1, -1):
        cur = [0] * (m + 1); ai = a[i]
        for j in range(m - 1, -1, -1):
            cur[j] = 1 + nxt[j+1] if ai == b[j] else (nxt[j] if nxt[j] > cur[j+1] else cur[j+1])
        nxt = cur
    return nxt[0]

if __name__ == "__main__":
    assert lcs_memo(A, B) == lcs_table(A, B) == lcs_rows(A, B)
    print(f"> {env()}; LCS of two random 400-char DNA strings; median of 5\n")
    print("| variant | ms |\n|---|---:|")
    for f in (lcs_memo, lcs_table, lcs_rows):
        t = statistics.median(timeit.repeat(lambda: f(A, B), number=1, repeat=5))
        print(f"| {f.__name__} | {t*1e3:.0f} |")
