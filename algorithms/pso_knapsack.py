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
SEEDS = [14, 0, 18]


def _sol_w(x: list) -> int:
    return sum(x[i] * ITEMS[i]["w"] for i in range(N))


def _sol_v(x: list) -> int:
    return sum(x[i] * ITEMS[i]["v"] for i in range(N))


def _subtraction(x_target: list, x_current: list) -> list:
    adds    = [i for i in range(N) if x_current[i] == 0 and x_target[i] == 1]
    removes = [i for i in range(N) if x_current[i] == 1 and x_target[i] == 0]
    k = min(len(adds), len(removes))
    return [(adds[i], removes[i]) for i in range(k)]


def _scalar_mul(c: float, v: list) -> list:
    if c <= 0 or not v:
        return []
    return v[:int(c * len(v))]


def _apply_velocity(x: list, v: list) -> list:
    r = x[:]
    for (i, j) in v:
        r[i], r[j] = r[j], r[i]
    return r


def _repair(x: list, capacity: int) -> list:
    r = x[:]
    while _sol_w(r) > capacity:
        selected = [(ITEMS[i]["v"] / ITEMS[i]["w"], i) for i in range(N) if r[i] == 1]
        if not selected:
            break
        r[min(selected)[1]] = 0
    return r


def _rng(seed: int):
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def _random_feasible(seed: int, capacity: int) -> list:
    rng = _rng(seed)
    idx = list(range(N))
    for i in range(N - 1, 0, -1):
        j = int(rng() * (i + 1))
        idx[i], idx[j] = idx[j], idx[i]
    x = [0] * N
    w = 0
    for i in idx:
        if w + ITEMS[i]["w"] <= capacity:
            x[i] = 1
            w += ITEMS[i]["w"]
    return x


def run(w: float = 0.2,
        n1: float = 0.3,
        n2: float = 0.5,
        n_iters: int = 10,
        capacity: int | None = None) -> dict:

    cap = capacity if capacity is not None else CAPACITY

    init_state = []
    for seed in SEEDS:
        x = _random_feasible(seed, cap)
        init_state.append({
            "id":  len(init_state) + 1,
            "x":   x[:],
            "v":   [],
            "w":   _sol_w(x),
            "val": _sol_v(x),
        })

    particles = []
    for p in init_state:
        particles.append({
            "id":        p["id"],
            "x":         p["x"][:],
            "v":         [],
            "w":         p["w"],
            "val":       p["val"],
            "pbest":     p["x"][:],
            "pbest_val": p["val"],
        })

    gbest_p   = max(particles, key=lambda p: p["pbest_val"])
    gbest     = gbest_p["pbest"][:]
    gbest_val = gbest_p["pbest_val"]

    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        p_steps = []

        for p in particles:
            v_pb  = _subtraction(p["pbest"], p["x"])
            v_gb  = _subtraction(gbest,      p["x"])
            v_new = (_scalar_mul(w,  p["v"]) +
                     _scalar_mul(n1, v_pb)   +
                     _scalar_mul(n2, v_gb))
            x_new   = _repair(_apply_velocity(p["x"], v_new), cap)
            val_new = _sol_v(x_new)
            w_new   = _sol_w(x_new)

            new_pbest     = p["pbest"][:]
            new_pbest_val = p["pbest_val"]
            if val_new > p["pbest_val"]:
                new_pbest     = x_new[:]
                new_pbest_val = val_new

            p_steps.append({
                "id":           p["id"],
                "x_before":     p["x"][:],
                "v_before":     p["v"][:],
                "pbest_before": p["pbest"][:],
                "gbest":        gbest[:],
                "v_pb":         v_pb,
                "v_gb":         v_gb,
                "v_new":        v_new,
                "x_new":        x_new[:],
                "w_new":        w_new,
                "val_new":      val_new,
                "pbest_new":    new_pbest,
                "pbest_val_new": new_pbest_val,
                "pbest_updated": new_pbest_val > p["pbest_val"],
            })

            p["x"]         = x_new
            p["v"]         = v_new
            p["w"]         = w_new
            p["val"]       = val_new
            p["pbest"]     = new_pbest
            p["pbest_val"] = new_pbest_val

        gbest_old = gbest[:]
        gbest_val_old = gbest_val
        for p in particles:
            if p["pbest_val"] > gbest_val:
                gbest     = p["pbest"][:]
                gbest_val = p["pbest_val"]

        steps.append({
            "iter":           iteration,
            "particles":      p_steps,
            "gbest_before":   gbest_old,
            "gbest_after":    gbest[:],
            "gbest_val":      gbest_val,
            "gbest_updated":  gbest_val > gbest_val_old,
        })

    return {
        "algorithm": "pso_knapsack",
        "config": {
            "w": w, "n1": n1, "n2": n2,
            "n_iters": n_iters, "capacity": cap, "n_particles": len(SEEDS),
        },
        "items":          ITEMS,
        "capacity":       cap,
        "init_state":     init_state,
        "steps":          steps,
        "final_gbest":    gbest,
        "final_gbest_val": gbest_val,
        "final_gbest_w":  _sol_w(gbest),
    }


if __name__ == "__main__":
    r = run()
    print(f"PSO Knapsack  w={r['config']['w']}  n1={r['config']['n1']}  n2={r['config']['n2']}")
    for p in r["init_state"]:
        sel = [i+1 for i in range(N) if p["x"][i]]
        print(f"  P{p['id']} init: items={sel}  w={p['w']}  val={p['val']}")
    for s in r["steps"]:
        if s["gbest_updated"]:
            sel = [i+1 for i in range(N) if s["gbest_after"][i]]
            print(f"  Iter {s['iter']:2d}: gbest → val={s['gbest_val']}  items={sel}")
    print(f"\nFinal gbest: val={r['final_gbest_val']}  w={r['final_gbest_w']}")
    sel = [i+1 for i in range(N) if r["final_gbest"][i]]
    print(f"Items: {sel}")
