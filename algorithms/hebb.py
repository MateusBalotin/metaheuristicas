from __future__ import annotations
from algorithms.datasets import DATASETS


def _r6(x: float) -> float:
    return round(x, 6)

def _r4(x: float) -> float:
    return round(x, 4)


def _normalize(x: float, xmin: float, xmax: float) -> float:
    return _r6(2 * (x - xmin) / (xmax - xmin) - 1)


def _classify(y_star: float) -> int:
    return 1 if y_star >= 0 else -1


def _eval_all(dataset: list, w1: float, w2: float, theta: float,
              x1_min: float, x1_max: float, x2_min: float, x2_max: float) -> list:
    results = []
    for p in dataset:
        xh1 = _normalize(p["x1"], x1_min, x1_max)
        xh2 = _normalize(p["x2"], x2_min, x2_max)
        y_star = _r6(w1 * xh1 + w2 * xh2 + theta)
        cls    = _classify(y_star)
        results.append({"y_star": y_star, "cls": cls, "ok": cls == p["d"]})
    return results


def _score(results: list) -> dict:
    correct = sum(1 for r in results if r["ok"])
    total   = len(results)
    return {"correct": correct, "errors": total - correct, "total": total,
            "pct": round(correct / total * 100, 1) if total else 0.0}


def run(dataset_key: str = "hebb_ex4",
        alpha: float | None = None,
        n_iters: int | None = None) -> dict:
    ds     = DATASETS[dataset_key]
    train  = ds["train"]
    test   = ds.get("test", [])
    alp    = alpha   if alpha   is not None else ds["alpha"]
    niters = n_iters if n_iters is not None else ds["n_iters"]
    norm   = ds["norm"]

    x1_min, x1_max = norm["x1_min"], norm["x1_max"]
    x2_min, x2_max = norm["x2_min"], norm["x2_max"]

    w1 = w2 = theta = 0.0
    steps: list[dict] = []

    for iteration in range(1, niters + 1):
        for pi, p in enumerate(train):
            xh1 = _normalize(p["x1"], x1_min, x1_max)
            xh2 = _normalize(p["x2"], x2_min, x2_max)

            w1b, w2b, thb = w1, w2, theta
            y_star = _r6(w1 * xh1 + w2 * xh2 + theta)
            cls    = _classify(y_star)

            # Hebb: always update regardless of correct/incorrect
            dw1    = _r6(alp * xh1 * p["d"])
            dw2    = _r6(alp * xh2 * p["d"])
            dtheta = _r6(alp * p["d"])
            w1     = _r6(w1 + dw1)
            w2     = _r6(w2 + dw2)
            theta  = _r6(theta + dtheta)

            all_res = _eval_all(train, w1, w2, theta,
                                x1_min, x1_max, x2_min, x2_max)

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "pattern":        p,
                "xh1":            xh1,
                "xh2":            xh2,
                "y_star":         y_star,
                "cls":            cls,
                "dw1":            dw1,
                "dw2":            dw2,
                "dtheta":         dtheta,
                "weights_before": {"w1": w1b, "w2": w2b, "theta": thb},
                "weights_after":  {"w1": w1,  "w2": w2,  "theta": theta},
                "train_results":  all_res,
                "train_score":    _score(all_res),
            })

    test_results   = _eval_all(test, w1, w2, theta,
                                x1_min, x1_max, x2_min, x2_max)
    test_annotated = [{**p, **r} for p, r in zip(test, test_results)]

    return {
        "algorithm":      "hebb",
        "config": {
            "dataset":  dataset_key,
            "alpha":    alp,
            "n_iters":  niters,
            "n_train":  len(train),
            "n_test":   len(test),
            "canvas":   ds["canvas"],
            "norm":     norm,
        },
        "steps":          steps,
        "final_weights":  {"w1": w1, "w2": w2, "theta": theta},
        "test_annotated": test_annotated,
        "test_score":     _score(test_results),
    }


if __name__ == "__main__":
    r = run()
    fw = r["final_weights"]
    print(f"Hebb — α={r['config']['alpha']}  iters={r['config']['n_iters']}")
    print(f"Final: w1={fw['w1']}  w2={fw['w2']}  θ={fw['theta']}")
    sc = r["steps"][-1]["train_score"]
    print(f"Train: {sc['correct']}/{sc['total']} ({sc['pct']}%)")
    for s in r["steps"]:
        if not s["train_results"][s["pi"]]["ok"]:
            p = s["pattern"]
            print(f"  WRONG n={p['n']}: y*={s['y_star']}, cls={s['cls']}, d={p['d']}")
