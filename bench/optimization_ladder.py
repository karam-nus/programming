"""Chapter 21: measured effect of each rung of the optimization ladder."""
import math, random, statistics, timeit
from _harness import env

random.seed(0)
WORDS = [str(random.randint(0, 5000)) for _ in range(5000)]
XS = [float(i) for i in range(100_000)]

def dedup_list(ws):
    out = []
    for w in ws:
        if w not in out:
            out.append(w)
    return out

def dedup_dict(ws):
    return list(dict.fromkeys(ws))

def concat_plus(n):
    s = ""
    for i in range(n):
        s += str(i)
    return s

def concat_join(n):
    return "".join(map(str, range(n)))

def sqrt_sum_global(xs):
    t = 0.0
    for x in xs:
        t += math.sqrt(x)
    return t

def sqrt_sum_local(xs, sqrt=math.sqrt):
    t = 0.0
    for x in xs:
        t += sqrt(x)
    return t

def sqrt_sum_builtin(xs):
    return sum(map(math.sqrt, xs))

def ms(fn, *args, number=3):
    return statistics.median(timeit.repeat(lambda: fn(*args), number=number, repeat=5)) / number * 1e3

if __name__ == "__main__":
    print(f"> {env()}; median of 5 repeats\n")
    print("| rung | variant | ms |\n|---|---|---:|")
    for rung, fn, args in [
        ("data structure: dedup 5000 strings", dedup_list, (WORDS,)),
        ("data structure: dedup 5000 strings", dedup_dict, (WORDS,)),
        ("string building: 100k pieces", concat_plus, (100_000,)),
        ("string building: 100k pieces", concat_join, (100_000,)),
        ("loop body: sum of sqrt, 100k floats", sqrt_sum_global, (XS,)),
        ("loop body: sum of sqrt, 100k floats", sqrt_sum_local, (XS,)),
        ("loop body: sum of sqrt, 100k floats", sqrt_sum_builtin, (XS,)),
    ]:
        print(f"| {rung} | `{fn.__name__}` | {ms(fn, *args):.2f} |")
