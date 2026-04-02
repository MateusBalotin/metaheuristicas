from __future__ import annotations
import math
import copy
from algorithms.datasets import DATASETS


def _r6(x: float) -> float:
    return round(x, 6)

def _r4(x: float) -> float:
    return round(x, 4)


def _dist2(x: list, w: list) -> float:
    return _r6(sum((x[j] - w[j]) ** 2 for j in range(len(x))))


def _grid_dist(pos_i: tuple, pos_j: tuple) -> int:
    """Chebyshev distance between two grid positions."""
    return max(abs(pos_i[0] - pos_j[0]), abs(pos_i[1] - pos_j[1]))


def _neighborhood(winner: int, radius: int, positions: list) -> list:
    return [i for i in range(len(positions))
            if _grid_dist(positions[winner], positions[i]) <= radius]


def _radius_for_iter(iteration: int, n_iters: int) -> int:
    """Decrease radius: start at 1, drop to 0 after halfway."""
    if iteration <= n_iters // 2:
        return 1
    return 0


def _alpha_for_iter(alpha_init: float, iteration: int) -> float:
    return _r6(alpha_init * (0.5 ** (iteration - 1)))


def _eval_all(dataset: list, weights: list, positions: list) -> list:
    results = []
    for p in dataset:
        dists = [_dist2(p["x"], weights[i]) for i in range(len(weights))]
        winner = dists.index(min(dists))
        results.append({
            "label":   p["label"],
            "x":       p["x"],
            "dists":   [_r6(d) for d in dists],
            "winner":  winner,
            "pos":     positions[winner],
        })
    return results


def run(dataset_key: str = "som_ex2",
        alpha_init: float | None = None,
        n_iters: int | None = None) -> dict:
    ds    = DATASETS[dataset_key]
    train = ds["train"]
    test  = ds["test"]
    rows  = ds["map_rows"]
    cols  = ds["map_cols"]
    alp   = alpha_init if alpha_init is not None else ds["alpha"]
    nit   = n_iters    if n_iters    is not None else ds["n_iters"]
    n_dim = ds["n_inputs"]
    n_neu = rows * cols

    # Grid positions: row-major
    positions = [(r, c) for r in range(rows) for c in range(cols)]

    weights = [row[:] for row in ds["init_weights"]]
    init_w  = [row[:] for row in weights]
    steps: list[dict] = []

    for iteration in range(1, nit + 1):
        alpha  = _alpha_for_iter(alp, iteration)
        radius = _radius_for_iter(iteration, nit)

        for pi, p in enumerate(train):
            x = p["x"]
            w_before = [row[:] for row in weights]

            # Distances to all neurons
            dists  = [_dist2(x, weights[i]) for i in range(n_neu)]
            winner = dists.index(min(dists))
            nbrs   = _neighborhood(winner, radius, positions)

            # Update
            deltas = []
            for ni in range(n_neu):
                if ni in nbrs:
                    old = weights[ni][:]
                    weights[ni] = [_r6(weights[ni][j] + alpha * (x[j] - weights[ni][j]))
                                   for j in range(n_dim)]
                    deltas.append({
                        "neuron": ni,
                        "old":    [_r4(v) for v in old],
                        "delta":  [_r6(weights[ni][j] - old[j]) for j in range(n_dim)],
                        "new":    [_r4(v) for v in weights[ni]],
                    })

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "pattern":        p,
                "alpha":          alpha,
                "radius":         radius,
                "dists":          [_r6(d) for d in dists],
                "winner":         winner,
                "winner_pos":     positions[winner],
                "neighbors":      nbrs,
                "deltas":         deltas,
                "weights_before": [row[:] for row in w_before],
                "weights_after":  [row[:] for row in weights],
            })

    test_results = _eval_all(test, weights, positions)
    train_final  = _eval_all(train, weights, positions)

    return {
        "algorithm":     "som",
        "config": {
            "dataset":   dataset_key,
            "map_rows":  rows,
            "map_cols":  cols,
            "n_inputs":  n_dim,
            "alpha":     alp,
            "n_iters":   nit,
            "n_train":   len(train),
            "n_test":    len(test),
            "positions": positions,
        },
        "positions":     positions,
        "init_weights":  init_w,
        "steps":         steps,
        "final_weights": [row[:] for row in weights],
        "train_final":   train_final,
        "test_results":  test_results,
    }


if __name__ == "__main__":
    r = run()
    print(f"SOM {r['config']['map_rows']}×{r['config']['map_cols']}  α={r['config']['alpha']}  iters={r['config']['n_iters']}")
    print("\nFinal weights:")
    pos = r["positions"]
    for i, w in enumerate(r["final_weights"]):
        print(f"  n{i+1} {pos[i]}: {[round(v,4) for v in w]}")
    print("\nTrain → winner neurons:")
    for res in r["train_final"]:
        print(f"  {res['label']:2s}: n{res['winner']+1} {res['pos']}")
    print("\nTest → winner neurons:")
    for res in r["test_results"]:
        print(f"  {res['label']:2s}: n{res['winner']+1} {res['pos']}")
