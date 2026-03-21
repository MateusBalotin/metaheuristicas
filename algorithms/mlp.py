from __future__ import annotations
import math
import copy
from algorithms.datasets import DATASETS


def _r6(x: float) -> float:
    return round(x, 6)

def _r4(x: float) -> float:
    return round(x, 4)

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _rng(seed: int):
    """Deterministic PRNG (mulberry32). Matches the JS implementation for reproducibility."""
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def init_weights(n_inputs: int, n_hidden: int, seed: int = 42) -> dict:
    rng  = _rng(seed)
    rand = lambda: _r4((rng() * 2 - 1) * 0.5)
    V       = [[rand() for _ in range(n_inputs)] for _ in range(n_hidden)]
    theta_a = [rand() for _ in range(n_hidden)]
    W       = [rand() for _ in range(n_hidden)]
    theta_b = rand()
    return {"V": V, "theta_a": theta_a, "W": W, "theta_b": theta_b}


def _forward(x: list[float], ws: dict) -> dict:
    p      = len(ws["W"])
    z_star = []
    z      = []
    for j in range(p):
        zs = ws["theta_a"][j] + sum(ws["V"][j][i] * x[i] for i in range(len(x)))
        zs = _r6(zs)
        z_star.append(zs)
        z.append(_r6(_sigmoid(zs)))
    y_star = _r6(ws["theta_b"] + sum(ws["W"][j] * z[j] for j in range(p)))
    y      = _r6(_sigmoid(y_star))
    return {"z_star": z_star, "z": z, "y_star": y_star, "y": y}


def _backprop(x: list[float], d: int, ws: dict, alpha: float) -> dict:
    fwd   = _forward(x, ws)
    y, z  = fwd["y"], fwd["z"]
    p     = len(ws["W"])
    new_ws = copy.deepcopy(ws)

    delta_out = _r6(y * (1 - y) * (d - y))

    dW   = [_r6(alpha * delta_out * z[j]) for j in range(p)]
    d_tb = _r6(alpha * delta_out)
    for j in range(p):
        new_ws["W"][j] = _r6(ws["W"][j] + dW[j])
    new_ws["theta_b"] = _r6(ws["theta_b"] + d_tb)

    delta_h = [_r6(delta_out * ws["W"][j] * z[j] * (1 - z[j])) for j in range(p)]
    dV      = [[_r6(alpha * delta_h[j] * x[i]) for i in range(len(x))] for j in range(p)]
    d_ta    = [_r6(alpha * delta_h[j]) for j in range(p)]
    for j in range(p):
        for i in range(len(x)):
            new_ws["V"][j][i] = _r6(ws["V"][j][i] + dV[j][i])
        new_ws["theta_a"][j] = _r6(ws["theta_a"][j] + d_ta[j])

    return {
        "fwd":       fwd,
        "delta_out": delta_out,
        "delta_h":   delta_h,
        "dW":        dW,  "d_theta_b": d_tb,
        "dV":        dV,  "d_theta_a": d_ta,
        "new_ws":    new_ws,
    }


def _eval_all(dataset: list, ws: dict) -> list:
    results = []
    for p in dataset:
        fwd   = _forward([p["x1"], p["x2"]], ws)
        y_cls = 1 if fwd["y"] >= 0.5 else -1
        results.append({"y": fwd["y"], "y_star": fwd["y_star"],
                        "y_class": y_cls, "ok": y_cls == p["d"]})
    return results


def _score(results: list) -> dict:
    correct = sum(1 for r in results if r["ok"])
    total   = len(results)
    return {
        "correct": correct,
        "errors":  total - correct,
        "total":   total,
        "pct":     round(correct / total * 100, 1) if total else 0.0,
    }


def run(dataset_key: str = "ex22",
        n_hidden: int = 4,
        alpha: float = 0.5,
        n_iters: int = 3,
        seed: int = 42) -> dict:
    ds    = DATASETS[dataset_key]
    train = ds["train"]
    test  = ds["test"]

    ws      = init_weights(2, n_hidden, seed)
    ws_init = copy.deepcopy(ws)
    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        for pi, p in enumerate(train):
            x         = [p["x1"], p["x2"]]
            ws_before = copy.deepcopy(ws)
            bp        = _backprop(x, p["d"], ws, alpha)
            ws        = bp["new_ws"]

            mse     = _r6(0.5 * (p["d"] - bp["fwd"]["y"]) ** 2)
            all_res = _eval_all(train, ws)

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "pattern":        p,
                "forward":        bp["fwd"],
                "delta_out":      bp["delta_out"],
                "delta_h":        bp["delta_h"],
                "dW":             bp["dW"],
                "d_theta_b":      bp["d_theta_b"],
                "dV":             bp["dV"],
                "d_theta_a":      bp["d_theta_a"],
                "mse":            mse,
                "weights_before": ws_before,
                "weights_after":  copy.deepcopy(ws),
                "train_results":  all_res,
                "train_score":    _score(all_res),
            })

    test_results   = _eval_all(test, ws)
    test_annotated = [{**p, **r} for p, r in zip(test, test_results)]

    return {
        "algorithm":      "mlp",
        "config": {
            "dataset":  dataset_key,
            "n_hidden": n_hidden,
            "alpha":    alpha,
            "n_iters":  n_iters,
            "seed":     seed,
            "n_train":  len(train),
            "n_test":   len(test),
            "canvas":   ds["canvas"],
        },
        "init_weights":   ws_init,
        "steps":          steps,
        "final_weights":  ws,
        "test_annotated": test_annotated,
        "test_score":     _score(test_results),
    }


if __name__ == "__main__":
    import sys
    key     = sys.argv[1] if len(sys.argv) > 1 else "ex22"
    n_h     = int(sys.argv[2])   if len(sys.argv) > 2 else 6
    alpha   = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    n_iters = int(sys.argv[4])   if len(sys.argv) > 4 else 50
    seed    = int(sys.argv[5])   if len(sys.argv) > 5 else 30

    result = run(key, n_h, alpha, n_iters, seed)
    print(f"\nMLP  nH={n_h}  α={alpha}  seed={seed}")
    for s in result["steps"]:
        if s["pi"] == len(DATASETS[key]["train"]) - 1:
            sc = s["train_score"]
            print(f"  After iter {s['iter']:3d}: {sc['correct']}/{sc['total']} correct ({sc['pct']}%)")
    if result["test_annotated"]:
        ts = result["test_score"]
        print(f"\nTest: {ts['correct']}/{ts['total']} ({ts['pct']}%)")
        for t in result["test_annotated"]:
            print(f"  {'✓' if t['ok'] else '✗'}  n={t['n']}  ({t['x1']},{t['x2']})  d={t['d']}  y={t['y']:.4f}")
