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
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def _init_weights(n_inputs: int, n_hidden: int, seed: int) -> dict:
    rng  = _rng(seed)
    rand = lambda: _r4((rng() * 2 - 1) * 0.5)
    V       = [[rand() for _ in range(n_inputs)] for _ in range(n_hidden)]
    theta_a = [rand() for _ in range(n_hidden)]
    W       = [rand() for _ in range(n_hidden)]
    theta_b = rand()
    return {"V": V, "theta_a": theta_a, "W": W, "theta_b": theta_b}


def _copy_ws(ws: dict) -> dict:
    return {
        "V":       [row[:] for row in ws["V"]],
        "theta_a": ws["theta_a"][:],
        "W":       ws["W"][:],
        "theta_b": ws["theta_b"],
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
    return {"z_star": z_star, "z": z, "y_star": y_star, "y": y_star}


def _backprop(x: list[float], d: float, ws: dict, alpha: float) -> dict:
    fwd    = _forward(x, ws)
    y, z   = fwd["y"], fwd["z"]
    p      = len(ws["W"])
    new_ws = _copy_ws(ws)

    delta_out = _r6(d - y)

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


def _mse_all(dataset: list, ws: dict) -> float:
    total = sum((_forward([p["x1"]], ws)["y"] - p["d"]) ** 2 for p in dataset)
    return _r6(total / len(dataset))


def run(dataset_key: str = "func_approx_ex1",
        n_hidden: int | None = None,
        alpha: float | None = None,
        n_iters: int | None = None,
        seed: int | None = None) -> dict:
    ds      = DATASETS[dataset_key]
    train   = ds["train"]
    n_hid   = n_hidden if n_hidden is not None else ds["n_hidden"]
    alp     = alpha    if alpha    is not None else ds["alpha"]
    niters  = n_iters  if n_iters  is not None else ds["n_iters"]
    sd      = seed     if seed     is not None else ds["seed"]

    ws      = _init_weights(ds["n_inputs"], n_hid, sd)
    ws_init = _copy_ws(ws)
    steps: list[dict] = []

    for iteration in range(1, niters + 1):
        for pi, p in enumerate(train):
            x         = [p["x1"]]
            ws_before = _copy_ws(ws)
            bp        = _backprop(x, p["d"], ws, alp)
            ws        = bp["new_ws"]

            mse_pt = _r6(0.5 * (p["d"] - bp["fwd"]["y"]) ** 2)
            mse    = _mse_all(train, ws)

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
                "mse_pattern":    mse_pt,
                "mse_train":      mse,
                "weights_before": ws_before,
                "weights_after":  _copy_ws(ws),
            })

    return {
        "algorithm":    "func_approx",
        "config": {
            "dataset":  dataset_key,
            "n_hidden": n_hid,
            "alpha":    alp,
            "n_iters":  niters,
            "seed":     sd,
            "n_train":  len(train),
            "canvas":   ds["canvas"],
        },
        "init_weights":  ws_init,
        "steps":         steps,
        "final_weights": ws,
        "final_mse":     _mse_all(train, ws),
        "train":         train,
    }


if __name__ == "__main__":
    result = run()
    print(f"Func Approx — alpha={result['config']['alpha']}  nH={result['config']['n_hidden']}  iters={result['config']['n_iters']}")
    print(f"Final MSE: {result['final_mse']}")
    fw = result["final_weights"]
    print(f"Final W : {[round(w,4) for w in fw['W']]}")
    print(f"Final tb: {fw['theta_b']}")
