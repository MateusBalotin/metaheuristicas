from __future__ import annotations
import math
import copy
from algorithms.datasets import DATASETS


def _r6(x: float) -> float:
    return round(x, 6)

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _copy_ws(ws: dict) -> dict:
    return {
        "V":       [row[:] for row in ws["V"]],
        "theta_a": ws["theta_a"][:],
        "W":       ws["W"][:],
        "theta_b": ws["theta_b"],
    }


def _zero_ws(ws: dict) -> dict:
    p = len(ws["W"])
    n = len(ws["V"][0])
    return {
        "V":       [[0.0] * n for _ in range(p)],
        "theta_a": [0.0] * p,
        "W":       [0.0] * p,
        "theta_b": 0.0,
    }


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


def _backprop_momentum(x: list[float], d: int, ws: dict, prev_dws: dict,
                       alpha: float, gamma: float) -> dict:
    fwd    = _forward(x, ws)
    y, z   = fwd["y"], fwd["z"]
    p      = len(ws["W"])
    new_ws = _copy_ws(ws)

    delta_out = _r6(y * (1 - y) * (d - y))

    # Output layer: Δw_j = α·δ_out·z_j + γ·Δw_j(prev)
    dW   = []
    d_tb = _r6(alpha * delta_out + gamma * prev_dws["theta_b"])
    for j in range(p):
        dw = _r6(alpha * delta_out * z[j] + gamma * prev_dws["W"][j])
        dW.append(dw)
        new_ws["W"][j] = _r6(ws["W"][j] + dw)
    new_ws["theta_b"] = _r6(ws["theta_b"] + d_tb)

    # Hidden layer: δ_j = δ_out · w_j · z_j·(1−z_j)
    # Δv_ij = α·δ_j·x_i + γ·Δv_ij(prev)
    delta_h = [_r6(delta_out * ws["W"][j] * z[j] * (1 - z[j])) for j in range(p)]
    dV      = []
    d_ta    = []
    for j in range(p):
        dvRow = []
        for i in range(len(x)):
            dv = _r6(alpha * delta_h[j] * x[i] + gamma * prev_dws["V"][j][i])
            dvRow.append(dv)
            new_ws["V"][j][i] = _r6(ws["V"][j][i] + dv)
        dV.append(dvRow)
        dta = _r6(alpha * delta_h[j] + gamma * prev_dws["theta_a"][j])
        d_ta.append(dta)
        new_ws["theta_a"][j] = _r6(ws["theta_a"][j] + dta)

    new_dws = {
        "V":       dV,
        "theta_a": d_ta,
        "W":       dW,
        "theta_b": d_tb,
    }

    return {
        "fwd":       fwd,
        "delta_out": delta_out,
        "delta_h":   delta_h,
        "dW":        dW,       "d_theta_b": d_tb,
        "dV":        dV,       "d_theta_a": d_ta,
        "new_ws":    new_ws,
        "new_dws":   new_dws,
    }


def _eval_all(dataset: list, ws: dict, threshold: float = 0.5) -> list:
    results = []
    for p in dataset:
        fwd     = _forward([p["x1"], p["x2"]], ws)
        y_class = 1 if fwd["y"] >= threshold else 0
        results.append({
            "y":       fwd["y"],
            "y_star":  fwd["y_star"],
            "y_class": y_class,
            "ok":      y_class == p["d"],
        })
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


def run(dataset_key: str = "mlp_momentum", gamma: float = 0.6) -> dict:
    ds        = DATASETS[dataset_key]
    train     = ds["train"]
    test      = ds["test"]
    alpha     = ds["alpha"]
    n_iters   = ds["n_iters"]
    threshold = ds["threshold"]

    ws      = _copy_ws(ds["init_weights"])
    ws_init = _copy_ws(ws)
    prev_dws = _zero_ws(ws)
    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        for pi, p in enumerate(train):
            x         = [p["x1"], p["x2"]]
            ws_before = _copy_ws(ws)
            pd_before = _copy_ws(prev_dws)
            bp        = _backprop_momentum(x, p["d"], ws, prev_dws, alpha, gamma)
            ws        = bp["new_ws"]
            prev_dws  = bp["new_dws"]

            mse     = _r6(0.5 * (p["d"] - bp["fwd"]["y"]) ** 2)
            all_res = _eval_all(train, ws, threshold)

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
                "prev_dws":       pd_before,
                "mse":            mse,
                "weights_before": ws_before,
                "weights_after":  _copy_ws(ws),
                "train_results":  all_res,
                "train_score":    _score(all_res),
            })

    test_results   = _eval_all(test, ws, threshold)
    test_annotated = [{**p, **r} for p, r in zip(test, test_results)]

    return {
        "algorithm":      "mlp_momentum",
        "config": {
            "dataset":   dataset_key,
            "n_hidden":  ds["n_hidden"],
            "alpha":     alpha,
            "gamma":     gamma,
            "n_iters":   n_iters,
            "threshold": threshold,
            "n_train":   len(train),
            "n_test":    len(test),
            "canvas":    ds["canvas"],
        },
        "init_weights":   ws_init,
        "steps":          steps,
        "final_weights":  ws,
        "test_annotated": test_annotated,
        "test_score":     _score(test_results),
    }


if __name__ == "__main__":
    result = run()
    print(f"MLP Momentum — alpha={result['config']['alpha']}  gamma={result['config']['gamma']}  nH={result['config']['n_hidden']}")
    for s in result["steps"]:
        if s["pi"] == len(DATASETS["mlp_momentum"]["train"]) - 1:
            sc = s["train_score"]
            print(f"  After iter {s['iter']:3d}: {sc['correct']}/{sc['total']} correct ({sc['pct']}%)")
    fw = result["final_weights"]
    print(f"Final W  : {[round(w,4) for w in fw['W']]}")
    print(f"Final tb : {fw['theta_b']}")
    print(f"Final ta : {[round(t,4) for t in fw['theta_a']]}")
