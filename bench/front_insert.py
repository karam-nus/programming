"""Chapters 13 and 19: cost of one front insertion as the container grows (list vs deque)."""
import collections, statistics, timeit
from _harness import env

if __name__ == "__main__":
    print(f"> {env()}; ns per insert+pop at the front; median of 5\n")
    print("| n | list.insert(0)+pop(0) | deque.appendleft+popleft |\n|---:|---:|---:|")
    for n in (100, 1_000, 10_000, 100_000, 1_000_000):
        xs, dq = list(range(n)), collections.deque(range(n))
        number = 2000 if n <= 100_000 else 200
        t_l = statistics.median(timeit.repeat(lambda: (xs.insert(0, 1), xs.pop(0)), number=number, repeat=5)) / number * 1e9
        t_d = statistics.median(timeit.repeat(lambda: (dq.appendleft(1), dq.popleft()), number=number, repeat=5)) / number * 1e9
        print(f"| {n} | {t_l:.0f} | {t_d:.0f} |")
