from __future__ import annotations

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


def _sol_val(x: list) -> int:
    return sum(x[i] * ITEMS[i]["v"] for i in range(len(x)))


def _sol_w(x: list) -> int:
    return sum(x[i] * ITEMS[i]["w"] for i in range(len(x)))


def _neighbors(x: list, capacity: int) -> list:
    neighbors = []
    for i in range(len(x)):
        xn = x[:]
        xn[i] = 1 - xn[i]
        w = _sol_w(xn)
        v = _sol_val(xn)
        neighbors.append({
            "item":      i,
            "x":         xn,
            "val":       v,
            "w":         w,
            "feasible":  w <= capacity,
            "action":    "ADD" if xn[i] == 1 else "REM",
        })
    return sorted(neighbors, key=lambda m: -m["val"])


def run(k: int = 3, max_iter: int = 20, capacity: int | None = None) -> dict:
    cap   = capacity if capacity is not None else CAPACITY
    n     = len(ITEMS)
    x     = [0] * n
    best_x   = x[:]
    best_val = _sol_val(x)
    tabu: dict[int, int] = {}
    steps: list[dict] = []

    for iteration in range(1, max_iter + 1):
        neighbors = _neighbors(x, cap)

        chosen = next(
            (m for m in neighbors
             if m["feasible"] and (tabu.get(m["item"], 0) == 0 or m["val"] > best_val)),
            None,
        )
        if not chosen:
            break

        aspiration_used = tabu.get(chosen["item"], 0) > 0 and chosen["val"] > best_val
        is_new_best     = chosen["val"] > best_val

        steps.append({
            "iter":            iteration,
            "x_before":        x[:],
            "val_before":      _sol_val(x),
            "w_before":        _sol_w(x),
            "item":            chosen["item"],
            "action":          chosen["action"],
            "x_after":         chosen["x"][:],
            "val_after":       chosen["val"],
            "w_after":         chosen["w"],
            "aspiration_used": aspiration_used,
            "is_new_best":     is_new_best,
            "tabu_before":     dict(tabu),
            "top5":            [
                {"item": m["item"], "action": m["action"],
                 "val": m["val"], "w": m["w"],
                 "feasible": m["feasible"],
                 "is_tabu": tabu.get(m["item"], 0) > 0,
                 "aspiration": m["val"] > best_val}
                for m in neighbors[:5]
            ],
        })

        x = chosen["x"]
        tabu[chosen["item"]] = k
        tabu = {i: v - 1 for i, v in tabu.items() if v - 1 > 0}

        steps[-1]["tabu_after"] = dict(tabu)

        if is_new_best:
            best_x   = x[:]
            best_val = chosen["val"]

        steps[-1]["best_val"]  = best_val
        steps[-1]["best_x"]    = best_x[:]

    return {
        "algorithm": "tabu_knapsack",
        "config": {
            "k":        k,
            "max_iter": max_iter,
            "capacity": cap,
            "n_items":  n,
        },
        "items":      ITEMS,
        "capacity":   cap,
        "steps":      steps,
        "best_x":     best_x,
        "best_val":   best_val,
        "best_w":     _sol_w(best_x),
    }


if __name__ == "__main__":
    r = run(k=3, max_iter=15)
    print(f"Tabu Search Knapsack  k={r['config']['k']}  cap={r['config']['capacity']}")
    print()
    for s in r["steps"]:
        asp = " [ASP]" if s["aspiration_used"] else ""
        nb  = " *** BEST ***" if s["is_new_best"] else ""
        sel = sorted([i + 1 for i in range(len(s["x_after"])) if s["x_after"][i]])
        print(f"Iter {s['iter']:2d}: {s['action']} item {s['item']+1:2d}"
              f"  w={s['w_after']:3d}  val={s['val_after']:3d}{asp}{nb}")
        print(f"       items={sel}  tabu={sorted([i+1 for i in s['tabu_after']])}")
    print(f"\nBest val={r['best_val']}  w={r['best_w']}")
    print(f"Items: {sorted([i+1 for i in range(len(r['best_x'])) if r['best_x'][i]])}")
