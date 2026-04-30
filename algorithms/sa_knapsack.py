from __future__ import annotations
import math

ITEMS = [
    {"id":  1, "w": 63, "v": 13},
    {"id":  2, "w": 21, "v":  2},
    {"id":  3, "w":  2, "v": 20},
    {"id":  4, "w": 32, "v": 10},
    {"id":  5, "w": 13, "v":  7},
    {"id":  6, "w": 80, "v": 14},
    {"id":  7, "w": 19, "v":  7},
    {"id":  8, "w": 37, "v":  2},
    {"id":  9, "w": 56, "v":  2},
    {"id": 10, "w": 41, "v":  4},
    {"id": 11, "w": 14, "v": 16},
    {"id": 12, "w":  8, "v": 17},
    {"id": 13, "w": 32, "v": 17},
    {"id": 14, "w": 42, "v":  3},
    {"id": 15, "w":  7, "v": 21},
]
CAPACITY = 275
N = len(ITEMS)


def _r4(x: float) -> float:
    return round(x, 4)


def _sol_w(x: list) -> int:
    return sum(x[i] * ITEMS[i]["w"] for i in range(N))


def _sol_v(x: list) -> int:
    return sum(x[i] * ITEMS[i]["v"] for i in range(N))


def _neighbors(x: list, cap: int) -> list:
    nb = []
    for i in range(N):
        xn = x[:]
        xn[i] = 1 - xn[i]
        w = _sol_w(xn)
        v = _sol_v(xn)
        if w <= cap:
            nb.append({
                "item":   i,
                "action": "ADD" if xn[i] == 1 else "REM",
                "x":      xn,
                "w":      w,
                "v":      v,
            })
    return sorted(nb, key=lambda m: -m["v"])


def _rng(seed: int):
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def run(alpha: float = 0.9,
        L: int = 1,
        T0: float = 19.0,
        V: int = 3,
        max_iter: int = 50,
        capacity: int | None = None,
        seed: int = 42) -> dict:

    cap = capacity if capacity is not None else CAPACITY
    rng = _rng(seed)
    S = [0] * N
    best_S = S[:]
    best_val = _sol_v(S)
    T = T0
    steps: list[dict] = []

    for iteration in range(1, max_iter + 1):
        nsucess = 0
        i_count = 0
        nb = _neighbors(S, cap)
        val_current = _sol_v(S)
        it_tries: list[dict] = []

        while nsucess < L and i_count < V and i_count < len(nb):
            m = nb[i_count]
            i_count += 1
            # Maximize value: ΔE = val_current - val_new (positive = worse)
            delta_E = _r4(val_current - m["v"])

            if delta_E <= 0:
                P = 1.0; r = 0.0; accept = True
            else:
                P = _r4(math.exp(-delta_E / T))
                r = _r4(rng())
                accept = P > r

            it_tries.append({
                "try_n":   i_count,
                "item":    m["item"],
                "action":  m["action"],
                "x_new":   m["x"][:],
                "w_new":   m["w"],
                "v_new":   m["v"],
                "delta_E": delta_E,
                "P":       P,
                "r":       r,
                "accept":  accept,
            })

            if accept:
                nsucess += 1
                S = m["x"][:]
                if _sol_v(S) > best_val:
                    best_S = S[:]
                    best_val = _sol_v(S)

        steps.append({
            "iter":        iteration,
            "T":           T,
            "x_before":    [0] * N,  # fixed below
            "val_before":  val_current,
            "w_before":    0,        # fixed below
            "tries":       it_tries,
            "nsucess":     nsucess,
            "x_after":     S[:],
            "val_after":   _sol_v(S),
            "w_after":     _sol_w(S),
            "best_val":    best_val,
            "best_x":      best_S[:],
        })

        T = _r4(alpha * T)

        if nsucess == 0:
            break

    # Fix x_before tracking
    x_track = [0] * N
    for step in steps:
        step["x_before"]  = x_track[:]
        step["val_before"] = _sol_v(x_track)
        step["w_before"]   = _sol_w(x_track)
        for t in step["tries"]:
            if t["accept"]:
                x_track = t["x_new"][:]

    return {
        "algorithm": "sa_knapsack",
        "config": {
            "alpha":    alpha,
            "L":        L,
            "T0":       T0,
            "V":        V,
            "max_iter": max_iter,
            "capacity": cap,
            "n_items":  N,
        },
        "items":     ITEMS,
        "capacity":  cap,
        "steps":     steps,
        "best_x":    best_S,
        "best_val":  best_val,
        "best_w":    _sol_w(best_S),
    }


if __name__ == "__main__":
    r = run()
    print(f"SA Knapsack  α={r['config']['alpha']}  L={r['config']['L']}"
          f"  T0={r['config']['T0']}  V={r['config']['V']}")
    for s in r["steps"]:
        for t in s["tries"]:
            acc = "ACCEPT" if t["accept"] else "REJECT"
            print(f"  I{s['iter']:2d} T={s['T']:.4f} {t['action']} item {t['item']+1}"
                  f"  v={t['v_new']}  ΔE={t['delta_E']:+.4f}  {acc}")
        print(f"       items={[i+1 for i in range(N) if s['x_after'][i]]}"
              f"  val={s['val_after']}  best={s['best_val']}")
    print(f"\nBest: val={r['best_val']}  w={r['best_w']}")
    print(f"Items: {[i+1 for i in range(N) if r['best_x'][i]]}")
