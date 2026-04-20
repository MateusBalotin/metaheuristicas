from __future__ import annotations
import math

BURMA14 = [
    {"id": 1,  "label": "C1",  "x": 16.47, "y": 96.10},
    {"id": 2,  "label": "C2",  "x": 16.47, "y": 94.44},
    {"id": 3,  "label": "C3",  "x": 20.09, "y": 92.54},
    {"id": 4,  "label": "C4",  "x": 22.39, "y": 93.37},
    {"id": 5,  "label": "C5",  "x": 25.23, "y": 97.24},
    {"id": 6,  "label": "C6",  "x": 22.00, "y": 96.05},
    {"id": 7,  "label": "C7",  "x": 20.47, "y": 97.02},
    {"id": 8,  "label": "C8",  "x": 17.20, "y": 96.29},
    {"id": 9,  "label": "C9",  "x": 16.30, "y": 97.38},
    {"id": 10, "label": "C10", "x": 14.05, "y": 98.12},
    {"id": 11, "label": "C11", "x": 16.53, "y": 97.38},
    {"id": 12, "label": "C12", "x": 21.52, "y": 95.59},
    {"id": 13, "label": "C13", "x": 19.41, "y": 97.13},
    {"id": 14, "label": "C14", "x": 20.09, "y": 94.55},
]


def _r4(x: float) -> float:
    return round(x, 4)


def _r2(x: float) -> float:
    return round(x, 2)


def _euclid(ax: float, ay: float, bx: float, by: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)


def _ring_dist(i: int, j: int, n: int) -> int:
    d = abs(i - j)
    return min(d, n - d)


def _init_weights(n_neurons: int) -> list[list[float]]:
    cx = sum(c["x"] for c in BURMA14) / len(BURMA14)
    cy = sum(c["y"] for c in BURMA14) / len(BURMA14)
    rx, ry = 3.2, 1.6
    W = []
    for i in range(n_neurons):
        angle = 2 * math.pi * i / n_neurons
        W.append([_r4(cx + rx * math.cos(angle)),
                  _r4(cy + ry * math.sin(angle))])
    return W


def run(alpha: float = 0.5,
        n_iters: int = 3,
        n_neurons: int = 20,
        radius0: int = 3) -> dict:

    cities = BURMA14
    nc     = len(cities)
    W      = _init_weights(n_neurons)
    init_W = [w[:] for w in W]
    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        alpha_t  = _r4(alpha * (0.5 ** (iteration - 1)))
        denom    = max(n_iters - 1, 1)
        radius_t = max(0, round(radius0 * (1 - (iteration - 1) / denom)))

        for pi, city in enumerate(cities):
            w_before = [w[:] for w in W]

            dists  = [_r4(_euclid(city["x"], city["y"], W[i][0], W[i][1]))
                      for i in range(n_neurons)]
            winner = dists.index(min(dists))
            nbrs   = [i for i in range(n_neurons)
                      if _ring_dist(i, winner, n_neurons) <= radius_t]

            deltas = []
            for ni in range(n_neurons):
                if ni in nbrs:
                    old = W[ni][:]
                    dx  = _r4(alpha_t * (city["x"] - W[ni][0]))
                    dy  = _r4(alpha_t * (city["y"] - W[ni][1]))
                    W[ni][0] = _r4(W[ni][0] + dx)
                    W[ni][1] = _r4(W[ni][1] + dy)
                    deltas.append({"n": ni, "old": old, "delta": [dx, dy], "nw": W[ni][:]})

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "alpha":          alpha_t,
                "radius":         radius_t,
                "city":           {"id": city["id"], "label": city["label"],
                                   "x": city["x"], "y": city["y"]},
                "dists":          dists,
                "winner":         winner,
                "neighbors":      nbrs,
                "deltas":         deltas,
                "weights_before": [w[:] for w in w_before],
                "weights_after":  [w[:] for w in W],
            })

    final_mapping = []
    for city in cities:
        ds  = [_euclid(city["x"], city["y"], W[i][0], W[i][1]) for i in range(n_neurons)]
        win = ds.index(min(ds))
        final_mapping.append({
            "id": city["id"], "label": city["label"],
            "x":  city["x"],  "y":    city["y"],
            "winner": win,    "dist": _r4(ds[win]),
        })

    tour      = sorted(final_mapping, key=lambda r: r["winner"])
    tour_dist = 0.0
    for i in range(len(tour)):
        nxt = tour[(i + 1) % len(tour)]
        tour_dist += _euclid(tour[i]["x"], tour[i]["y"], nxt["x"], nxt["y"])

    return {
        "algorithm": "som_tsp",
        "config": {
            "nc":        nc,
            "n_neurons": n_neurons,
            "alpha":     alpha,
            "n_iters":   n_iters,
            "radius0":   radius0,
        },
        "cities":        cities,
        "init_weights":  init_W,
        "steps":         steps,
        "final_weights": [w[:] for w in W],
        "final_mapping": final_mapping,
        "tour":          tour,
        "tour_dist":     _r2(tour_dist),
    }


if __name__ == "__main__":
    r = run()
    print(f"SOM-TSP · {r['config']['n_neurons']} neurons · "
          f"α={r['config']['alpha']} · iters={r['config']['n_iters']} · "
          f"radius0={r['config']['radius0']}")
    print(f"\nTour ({r['tour_dist']} units):")
    print(" → ".join(c["label"] for c in r["tour"]) + f" → {r['tour'][0]['label']}")
    from collections import Counter
    cnt = Counter(c["winner"] for c in r["final_mapping"])
    for neu, n in cnt.items():
        if n > 1:
            labels = [c["label"] for c in r["final_mapping"] if c["winner"] == neu]
            print(f"  n{neu+1}: {labels}")
