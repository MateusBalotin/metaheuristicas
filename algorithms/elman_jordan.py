from __future__ import annotations
import math

DATASETS = {
    "xor": [
        {"n": 1, "x1": 0, "x2": 0, "d": 0},
        {"n": 2, "x1": 0, "x2": 1, "d": 1},
        {"n": 3, "x1": 1, "x2": 0, "d": 1},
        {"n": 4, "x1": 1, "x2": 1, "d": 0},
    ],
    "and": [
        {"n": 1, "x1": 0, "x2": 0, "d": 0},
        {"n": 2, "x1": 0, "x2": 1, "d": 0},
        {"n": 3, "x1": 1, "x2": 0, "d": 0},
        {"n": 4, "x1": 1, "x2": 1, "d": 1},
    ],
    "ativ82": [
        {"n": 1, "x1": 0, "x2": 2, "d": 1},
        {"n": 2, "x1": 1, "x2": 2, "d": 1},
        {"n": 3, "x1": 1, "x2": 3, "d": 1},
        {"n": 4, "x1": 1, "x2": 0, "d": 0},
        {"n": 5, "x1": 2, "x2": 1, "d": 0},
    ],
}


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


def _init_weights(network: str, n_hidden: int, seed: int) -> dict:
    rng  = _rng(seed)
    rand = lambda: _r4((rng() * 2 - 1) * 0.5)
    n_ctx = n_hidden if network == "elman" else 1
    return {
        "Wa":      [[rand() for _ in range(2)]      for _ in range(n_hidden)],
        "Wb":      [[rand() for _ in range(n_ctx)]  for _ in range(n_hidden)],
        "W":       [rand() for _ in range(n_hidden)],
        "theta_h": [rand() for _ in range(n_hidden)],
        "theta_o": rand(),
    }


def _copy_ws(ws: dict) -> dict:
    return {
        "Wa":      [row[:] for row in ws["Wa"]],
        "Wb":      [row[:] for row in ws["Wb"]],
        "W":       ws["W"][:],
        "theta_h": ws["theta_h"][:],
        "theta_o": ws["theta_o"],
    }


def _forward(x: list, ctx: list, ws: dict) -> dict:
    n_h = len(ws["W"])
    z_star, z = [], []
    for j in range(n_h):
        zs = _r6(ws["theta_h"][j]
                 + sum(ws["Wa"][j][i] * x[i]   for i in range(len(x)))
                 + sum(ws["Wb"][j][k] * ctx[k]  for k in range(len(ctx))))
        z_star.append(zs)
        z.append(_r6(_sigmoid(zs)))
    y_star = _r6(ws["theta_o"] + sum(ws["W"][j] * z[j] for j in range(n_h)))
    return {"z_star": z_star, "z": z, "y_star": y_star, "y": _r6(_sigmoid(y_star))}


def _backprop(x: list, ctx: list, d: int, ws: dict, alpha: float) -> dict:
    fwd    = _forward(x, ctx, ws)
    y, z   = fwd["y"], fwd["z"]
    n_h    = len(ws["W"])
    new_ws = _copy_ws(ws)

    delta_out = _r6(y * (1 - y) * (d - y))

    dW   = [_r6(alpha * delta_out * z[j]) for j in range(n_h)]
    d_to = _r6(alpha * delta_out)
    for j in range(n_h):
        new_ws["W"][j] = _r6(ws["W"][j] + dW[j])
    new_ws["theta_o"] = _r6(ws["theta_o"] + d_to)

    delta_h = [_r6(delta_out * ws["W"][j] * z[j] * (1 - z[j])) for j in range(n_h)]
    dWa = [[_r6(alpha * delta_h[j] * x[i])   for i in range(len(x))]   for j in range(n_h)]
    dWb = [[_r6(alpha * delta_h[j] * ctx[k]) for k in range(len(ctx))] for j in range(n_h)]
    d_th = [_r6(alpha * delta_h[j]) for j in range(n_h)]

    for j in range(n_h):
        for i in range(len(x)):
            new_ws["Wa"][j][i] = _r6(ws["Wa"][j][i] + dWa[j][i])
        for k in range(len(ctx)):
            new_ws["Wb"][j][k] = _r6(ws["Wb"][j][k] + dWb[j][k])
        new_ws["theta_h"][j] = _r6(ws["theta_h"][j] + d_th[j])

    return {
        "fwd":       fwd,
        "delta_out": delta_out,
        "delta_h":   delta_h,
        "dW":        dW,   "d_theta_o": d_to,
        "dWa":       dWa,  "dWb":       dWb,
        "d_theta_h": d_th,
        "new_ws":    new_ws,
    }


def _eval_all(dataset: list, ws: dict, network: str, n_ctx: int) -> list:
    ctx = [0.0] * n_ctx
    results = []
    for p in dataset:
        x   = [p["x1"], p["x2"]]
        fwd = _forward(x, ctx, ws)
        y_c = 1 if fwd["y"] >= 0.5 else 0
        results.append({"y": fwd["y"], "y_star": fwd["y_star"],
                        "y_class": y_c, "ok": y_c == p["d"]})
        ctx = fwd["z"][:] if network == "elman" else [fwd["y"]]
    return results


def _score(results: list) -> dict:
    correct = sum(1 for r in results if r["ok"])
    total   = len(results)
    return {"correct": correct, "errors": total - correct, "total": total,
            "pct": round(correct / total * 100, 1) if total else 0.0}


def run(dataset: str = "xor",
        network: str = "elman",
        alpha: float = 0.5,
        n_iters: int = 3,
        seed: int = 42) -> dict:

    train  = DATASETS[dataset]
    n_ctx  = 2 if network == "elman" else 1
    ws     = _init_weights(network, 2, seed)
    ws_init = _copy_ws(ws)
    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        ctx = [0.0] * n_ctx

        for pi, p in enumerate(train):
            x          = [p["x1"], p["x2"]]
            ws_before  = _copy_ws(ws)
            ctx_before = ctx[:]

            bp  = _backprop(x, ctx, p["d"], ws, alpha)
            ws  = bp["new_ws"]
            ctx = bp["fwd"]["z"][:] if network == "elman" else [bp["fwd"]["y"]]

            all_res = _eval_all(train, ws, network, n_ctx)

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "pattern":        p,
                "x":              x,
                "ctx":            ctx_before,
                "forward":        bp["fwd"],
                "delta_out":      bp["delta_out"],
                "delta_h":        bp["delta_h"],
                "dW":             bp["dW"],
                "d_theta_o":      bp["d_theta_o"],
                "dWa":            bp["dWa"],
                "dWb":            bp["dWb"],
                "d_theta_h":      bp["d_theta_h"],
                "mse":            _r6(0.5 * (p["d"] - bp["fwd"]["y"]) ** 2),
                "weights_before": ws_before,
                "weights_after":  _copy_ws(ws),
                "train_results":  all_res,
                "train_score":    _score(all_res),
            })

    final_results = _eval_all(train, ws, network, n_ctx)

    return {
        "algorithm": "elman_jordan",
        "config": {
            "dataset":  dataset,
            "network":  network,
            "alpha":    alpha,
            "n_iters":  n_iters,
            "seed":     seed,
            "n_train":  len(train),
            "n_ctx":    n_ctx,
        },
        "init_weights":  ws_init,
        "steps":         steps,
        "final_weights": ws,
        "final_results": final_results,
        "final_score":   _score(final_results),
    }


if __name__ == "__main__":
    for net in ("elman", "jordan"):
        for ds in ("xor", "and"):
            r  = run(dataset=ds, network=net)
            sc = r["final_score"]
            fw = r["final_weights"]
            print(f"{net.upper()} {ds.upper():3s} — {sc['correct']}/{sc['total']} "
                  f"({sc['pct']}%)  W={[round(w,4) for w in fw['W']]}")
