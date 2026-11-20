"""Chapter 08: threads vs processes on CPU-bound and I/O-bound work."""
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from _harness import env

def cpu(n: int) -> int:
    t = 0
    for i in range(n):
        t += i * i
    return t

def io(_: int) -> None:
    time.sleep(0.05)

def timed(fn, pool_cls, work, jobs, workers):
    t0 = time.perf_counter()
    if pool_cls is None:
        for _ in range(jobs): fn(work)
    else:
        with pool_cls(max_workers=workers) as ex:
            list(ex.map(fn, [work] * jobs))
    return time.perf_counter() - t0

if __name__ == "__main__":
    print(f"> {env()}; 4 workers, 8 jobs\n")
    print("| workload | serial (s) | 4 threads (s) | 4 processes (s) |")
    print("|---|---:|---:|---:|")
    for name, fn, work in [("CPU: sum of squares, 2M iters/job", cpu, 2_000_000), ("I/O: sleep 50 ms/job", io, 0)]:
        r = [timed(fn, p, work, 8, 4) for p in (None, ThreadPoolExecutor, ProcessPoolExecutor)]
        print(f"| {name} | {r[0]:.2f} | {r[1]:.2f} | {r[2]:.2f} |")
