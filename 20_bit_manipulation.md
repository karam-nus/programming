---
title: "Chapter 20 — Bit Manipulation"
---

[← Back to Table of Contents](./README.md)

# Chapter 20 — Bit Manipulation

> *"An integer is a set of small numbers that the CPU can intersect in one cycle."*

## Overview

Bits are the representation underneath every number, flag and mask, and a Python `int` used as a bit vector is a compact set with $\Theta(n/64)$-word set operations implemented in C. This chapter covers Python's peculiar integer model — arbitrary precision, behaving as if two's complement with infinitely many sign bits — the core identities (lowbit, clear-lowest, power-of-two tests), subset and submask enumeration for bitmask DP ([Chapter 16](./16_dynamic_programming_patterns.md)), bitsets that speed up subset-sum by three orders of magnitude, IEEE-754 float layouts inspected with `struct`, and XOR tricks. It assumes integers are objects ([Chapter 2](./02_objects_names_and_memory.md)).

<div class="diagram">
<div class="diagram-title">The operators</div>
<div class="diagram-grid cols-4">
  <div class="diagram-card accent"><div class="card-title">&amp; | ^</div><div class="card-desc">intersection, union, symmetric difference of bit sets</div></div>
  <div class="diagram-card green"><div class="card-title">~x</div><div class="card-desc">complement: equals −x − 1 for every int</div></div>
  <div class="diagram-card purple"><div class="card-title">x &lt;&lt; k, x &gt;&gt; k</div><div class="card-desc">multiply / floor-divide by 2^k (arithmetic shift for negatives)</div></div>
  <div class="diagram-card orange"><div class="card-title">bit_count(), bit_length()</div><div class="card-desc">popcount (3.10+) and position of the highest set bit</div></div>
</div>
</div>

---

## Python's Integer Model

| | |
|---|---|
| **Mechanism** | Arbitrary-precision integers (sign + magnitude in 30-bit "digits"), with bitwise operators defined as on infinite two's complement |
| **Defined in** | Language Reference §6.9 (shifting), §6.8 (bitwise); `Objects/longobject.c` |
| **Since** | Unified `int` in 3.0 (PEP 237) |
| **Hooks into** | `__and__`, `__or__`, `__xor__`, `__invert__`, `__lshift__`, `__rshift__` |
| **Typical use** | Flags, masks, bitsets, hashing, binary formats |
| **Cost** | Small ints: ~one C operation plus object overhead; big ints: $\Theta(\text{bits}/30)$ |
| **Prefer instead** | NumPy `uint64` arrays or `bitarray` for fixed-width bulk bit arrays |
| **Failure modes** | No overflow, so C idioms that rely on wraparound need an explicit `& mask`; `>>` on negatives rounds toward $-\infty$ |

There is no fixed width, so a negative number behaves as if it had infinitely many leading 1 bits. That keeps the identities clean — and makes "the 32-bit pattern of $-1$" something you must ask for explicitly with a mask:

```python
x = -6
print(bin(x), bin(x & 0xFF), bin(x & 0xFFFFFFFF))
print(~5, -5 >> 1, 5 >> 1, -1 >> 100)
print((2**64 - 1) + 1, ((2**64 - 1) + 1) & (2**64 - 1))   # emulate uint64 wraparound with a mask
```

```text
-0b110 0b11111010 0b11111111111111111111111111111010
-6 -3 2 -1
18446744073709551616 0
```

`bin(-6)` prints sign-and-magnitude (`-0b110`), but `-6 & 0xFF` reveals the two's-complement byte `0b11111010`. Right-shifting a negative number floors (`-5 >> 1 == -3`, like `-5 // 2`), and shifting $-1$ right by any amount stays $-1$: the infinite sign bits shift in forever. To interpret a fixed-width unsigned value as signed: `v - (1 << w) if v >> (w - 1) else v`, or `int.from_bytes(b, signed=True)`.

---

## Core Identities

All follow from how binary subtraction borrows: $x - 1$ flips the lowest set bit of $x$ and every 0 below it.

| Expression | Result | Example ($x = 0b10110100$) | Use |
|------------|--------|:---:|-----|
| `x & (x - 1)` | clear the lowest set bit | `0b10110000` | count bits (Kernighan), power-of-two test |
| `x & -x` | isolate the lowest set bit ("lowbit") | `0b00000100` | Fenwick trees, iterate set bits |
| <code>x &#124; (x + 1)</code> | set the lowest clear bit | `0b10110101` | |
| `x ^ (x >> 1)` | binary → Gray code | | Gray-code enumeration |
| `x > 0 and x & (x - 1) == 0` | is a power of two | `False` | alignment, buffer sizes |
| `x.bit_length()` | $\lfloor \log_2 x \rfloor + 1$ for $x > 0$ | 8 | integer log₂ without floats |
| `x.bit_count()` (3.10+) | popcount | 4 | Hamming weight / distance |

```python
x = 0b10110100
print(bin(x & (x - 1)), bin(x & -x), x.bit_length(), x.bit_count())

def set_bits(mask):
    """Yield indices of set bits, lowest first, in Θ(popcount) iterations."""
    while mask:
        low = mask & -mask
        yield low.bit_length() - 1
        mask ^= low

print(list(set_bits(x)), [i for i in range(8) if x >> i & 1])
```

```text
0b10110000 0b100 8 4
[2, 4, 5, 7] [2, 4, 5, 7]
```

Type any integer — negative ones too — and see every identity at once. Switch to float mode to take an IEEE-754 double apart (the subject of the last section):

<div class="lab" data-lab="bits"></div>

`int.bit_length()` is exact for any size, unlike `math.log2`, which rounds: `math.log2(2**53 + 1)` returns exactly `53.0`. Use `bit_length` for integer logarithms.

**Hamming distance** between binary codes — the comparison metric for binary embeddings, locality-sensitive hashing and perceptual image hashes — is `(a ^ b).bit_count()`.

---

## Masks as Sets

An integer $S$ with bit $i$ set represents a set containing $i$. With $n \le 64$ elements, set operations are single machine instructions (plus Python's object overhead); for larger $n$ they remain $\Theta(n/30)$ word operations in C.

| Set operation | Bit expression |
|---------------|----------------|
| $\{i\}$ | `1 << i` |
| $i \in S$ | `S >> i & 1` |
| $S \cup \{i\}$, $S \setminus \{i\}$ | <code>S &#124; 1 &lt;&lt; i</code>, `S & ~(1 << i)` |
| $S \cup T$, $S \cap T$, $S \setminus T$ | <code>S &#124; T</code>, `S & T`, `S & ~T` |
| $T \subseteq S$ | `T & S == T` |
| $\lvert S\rvert$ | `S.bit_count()` |
| full set of $n$ | `(1 << n) - 1` |

Operator precedence differs from C, in Python's favour. Shifts bind tighter than `&`, so `S >> i & 1` is `(S >> i) & 1`. Comparisons bind *looser* than all bitwise operators, so `S & 1 << i == 0` is `(S & (1 << i)) == 0` — the reading you intended. In C, `==` binds tighter than `&` and the same expression is a bug. Parenthesise anyway when the code will be read by people who also write C.

### Enumerating subsets and submasks

All subsets of $n$ elements: `range(1 << n)`. All **submasks** of a given mask $M$ — needed when a DP over subsets transitions from a set to its subsets — use the decrement-and-mask trick: `sub = (sub - 1) & M` steps to the next smaller submask.

```python
def submasks(M):
    sub = M
    while True:
        yield sub
        if sub == 0:
            return
        sub = (sub - 1) & M

M = 0b1011
print([bin(s) for s in submasks(M)])
print(sum(1 for M in range(1 << 10) for _ in submasks(M)) == 3 ** 10)
```

```text
['0b1011', '0b1010', '0b1001', '0b1000', '0b11', '0b10', '0b1', '0b0']
True
```

Summing over all masks of their submasks visits $3^n$ pairs (each element is in neither, the submask, or only the mask) — the complexity of "DP over subsets of subsets", e.g. optimally partitioning $n$ tasks into groups. $3^{15} \approx 1.4 \times 10^7$ is feasible in Python; $3^{20} \approx 3.5 \times 10^9$ is not.

---

## Bitsets: Subset Sum in One Shift

Subset-sum asks which totals are reachable from a multiset of non-negative integers. The DP is a boolean array: $\mathrm{reach}[s]$ is true if some subset sums to $s$; adding item $x$ sets $\mathrm{reach}[s + x] \mathrel{|}= \mathrm{reach}[s]$ for all $s$ (iterating downward for 0/1 semantics — the knapsack loop of [Chapter 15](./15_dynamic_programming_foundations.md)).

Store the whole array as **one integer**, bit $s$ meaning "sum $s$ reachable". Adding item $x$ is then a single expression, `reach |= reach << x` — the shift computes $\mathrm{reach}[s - x]$ for all $s$ at once, and because the right-hand side is evaluated before assignment there is no reuse problem.

```python
import random, timeit

def subset_sums_list(xs):
    """Number of distinct reachable subset sums, boolean-array DP."""
    total = sum(xs)
    reach = [True] + [False] * total
    for x in xs:
        for s in range(total, x - 1, -1):          # downward: each item once
            if reach[s - x]:
                reach[s] = True
    return sum(reach)

def subset_sums_bits(xs):
    reach = 1                                      # bit 0: the empty subset sums to 0
    for x in xs:
        reach |= reach << x                        # one whole DP row per item
    return reach.bit_count()

random.seed(3)
xs = [random.randint(1, 200) for _ in range(60)]
assert subset_sums_list(xs) == subset_sums_bits(xs)
t_list = min(timeit.repeat(lambda: subset_sums_list(xs), number=1, repeat=5))
t_bits = min(timeit.repeat(lambda: subset_sums_bits(xs), number=3, repeat=5)) / 3
print(f"{subset_sums_bits(xs)} reachable sums; bitset faster by more than 100x: {t_list / t_bits > 100}")
```

```text
6295 reachable sums; bitset faster by more than 100x: True
```

Measured on this book's machine (CPython 3.13, Xeon @ 2.1 GHz): 12 ms for the list DP, 10 µs for the bitset — about 1200×. The bit version is still $\Theta(n \cdot S)$ bit operations, but they run 30 bits per C word operation instead of one Python bytecode loop iteration per entry. Keep the answer as an integer — `reach >> target & 1` answers "is `target` reachable?" — because converting it back into a Python set of sums costs more than the DP itself. The same trick accelerates transitive closure, string matching (Shift-Or/bitap), and LCS on small alphabets.

---

## IEEE-754 Floats, Bit by Bit

A Python `float` is an IEEE-754 binary64 value: 1 sign bit, 11 exponent bits (bias 1023), 52 fraction bits with an implicit leading 1 for normal numbers.

<div class="bitfield">
  <div class="bf-seg sign">S<small>1 bit</small></div>
  <div class="bf-seg exponent">exponent (bias 1023)<small>11 bits</small></div>
  <div class="bf-seg mantissa">fraction (implicit leading 1)<small>52 bits</small></div>
</div>
<div class="bitfield-label">binary64 — value = (−1)^S × 1.fraction × 2^(exponent − 1023)</div>

`struct` reinterprets the 8 bytes as an integer, so the fields can be extracted with shifts and masks:

```python
import struct, math

def float_bits(x):
    (u,) = struct.unpack(">Q", struct.pack(">d", x))
    return u >> 63, (u >> 52) & 0x7FF, u & ((1 << 52) - 1)

for x in (1.0, -2.5, 0.1, 2.0**-1074, math.inf):
    s, e, f = float_bits(x)
    print(f"{x!r:<8} sign={s} exp_field={e:4d}  frac=0x{f:013x}")
```

```text
1.0      sign=0 exp_field=1023  frac=0x0000000000000
-2.5     sign=1 exp_field=1024  frac=0x4000000000000
0.1      sign=0 exp_field=1019  frac=0x999999999999a
5e-324   sign=0 exp_field=   0  frac=0x0000000000001
inf      sign=0 exp_field=2047  frac=0x0000000000000
```

Readings: a normal number's power of two is `exp_field − 1023` (so 1.0 is $1.0 \times 2^0$ and −2.5 is $-1.25 \times 2^1$); `0.1` has a repeating binary fraction (`0x999999999999a`, rounded up at the end), which is why `0.1 + 0.2 != 0.3`; `5e-324` (= $2^{-1074}$) is the smallest **subnormal** (exponent field 0, no implicit 1, value $0.\text{fraction} \times 2^{-1022}$); infinity is the all-ones exponent with zero fraction (NaN has a non-zero fraction). Neighbouring floats are adjacent integers in this encoding: `math.nextafter` (3.9+) and `math.ulp` expose the spacing directly. The same field anatomy, with fewer bits, defines BF16 (8 exponent, 7 fraction) and FP8 (E4M3/E5M2) — covered in the [Quantization](https://karam-nus.github.io/quantization/) volume.

---

## XOR Tricks

XOR is addition without carry: associative, commutative, $a \oplus a = 0$, $a \oplus 0 = a$. Three uses that recur:

```python
import functools, operator, random

pairs = [7, 3, 9, 3, 7]                      # every value twice except one
print(functools.reduce(operator.xor, pairs))   # paired values cancel

a, b = 12, 25
a ^= b; b ^= a; a ^= b                       # XOR swap (in Python, prefer a, b = b, a)
print(a, b)

random.seed(0)                               # Zobrist hashing: incremental hash of a set of features
table = {feat: random.getrandbits(64) for feat in ("lr=0.1", "bs=32", "opt=adam", "aug=on")}
h = 0
for f in ("lr=0.1", "bs=32", "opt=adam"):
    h ^= table[f]
h_toggled = h ^ table["aug=on"] ^ table["aug=on"]   # add then remove a feature: Θ(1) update each
print(h == h_toggled)
```

```text
9
25 12
True
```

Zobrist hashing — a random 64-bit code per feature, XORed together — gives a hash of a *set* that updates in $\Theta(1)$ when one element is added or removed, independent of order. It is used in game-tree search for transposition tables, and it is a convenient cache key for configuration search where configurations differ by one setting at a time.

---

## Key Takeaways

- Python ints are arbitrary precision and behave like two's complement with infinite sign bits; mask with `& ((1 << w) - 1)` to get fixed-width behaviour.
- `x & (x - 1)` clears the lowest set bit and `x & -x` isolates it; iterating set bits costs $\Theta(\text{popcount})$.
- Use `bit_length` for exact integer $\log_2$ and `bit_count` (3.10+) for popcount and Hamming distance.
- An int is a set: union, intersection and membership are single operators; submasks enumerate with `(sub - 1) & M`, and all mask–submask pairs total $3^n$.
- Bitset DP (`reach |= reach << x`) performs a whole DP row in one C-level operation — ~1200× faster than the list DP for subset sum here.
- `struct.pack`/`unpack` exposes IEEE-754 fields; 0.1's repeating binary fraction and subnormals are visible directly.
- XOR cancels pairs and gives order-independent, incrementally updatable set hashes (Zobrist).

## References

| Source | Author / Org, Year | Link | What this chapter takes from it |
|--------|--------------------|------|--------------------------------|
| *Hacker's Delight*, 2nd ed. | Warren, 2012 | Addison-Wesley | Lowest-bit identities, popcount, Gray code |
| Language Reference §6.8–6.9; `int` methods | Python docs | docs.python.org/3/library/stdtypes.html | Infinite two's-complement semantics, `bit_count` (3.10) |
| IEEE 754-2019 — Standard for Floating-Point Arithmetic | IEEE, 2019 | doi.org/10.1109/IEEESTD.2019.8766229 | binary64 layout, subnormals, NaN/Inf encodings |
| "What Every Computer Scientist Should Know About Floating-Point Arithmetic" | Goldberg, 1991 | doi.org/10.1145/103162.103163 | Rounding of decimal fractions, ULPs |
| "A New Hashing Method with Application for Game Playing" | Zobrist, 1970 | University of Wisconsin TR 88 | Zobrist hashing |
| *Competitive Programmer's Handbook*, ch. 10 | Laaksonen, 2018 | cses.fi/book | Submask enumeration, $3^n$ bound, bitset DP |

---

**Next:** [Chapter 21 — Profiling & Optimization](./21_profiling_and_optimization.md) — Part V: measuring before changing anything.
