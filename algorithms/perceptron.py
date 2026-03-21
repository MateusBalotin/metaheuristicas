from __future__ import annotations
from algorithms.datasets import DATASETS


def _r4(x: float) -> float:
    return round(x, 4)


def _classify(y_star: float, delta: float) -> int:
    if y_star > delta:  return  1
    if y_star < -delta: return -1
    return 0


def _line_equations(w1: float, w2: float, theta: float, delta: float) -> dict:
    if w1 == 0 and w2 == 0:
        return {"upper": None, "lower": None, "w2_zero": True, "w1_zero": True}
    if w2 == 0:
        return {
            "upper":   {"vertical": True, "x1": _r4(( delta - theta) / w1)},
            "lower":   {"vertical": True, "x1": _r4((-delta - theta) / w1)},
            "w2_zero": True, "w1_zero": False,
        }
    slope     = _r4(-w1 / w2)
    int_upper = _r4(( delta - theta) / w2)
    int_lower = _r4((-delta - theta) / w2)
    return {
        "upper":          {"slope": slope, "intercept": int_upper, "vertical": False},
        "lower":          {"slope": slope, "intercept": int_lower, "vertical": False},
        "intercept_diff": _r4(2 * delta / w2),
        "w2_zero":        False,
    }


def _eval_all(w1: float, w2: float, theta: float, delta: float, dataset: list) -> list:
    results = []
    for p in dataset:
        ys = _r4(w1 * p["x1"] + w2 * p["x2"] + theta)
        y  = _classify(ys, delta)
        results.append({"y_star": ys, "y": y, "ok": y == p["d"]})
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


def run(dataset_key: str = "perceptron_ex4",
        delta: float = 0.2,
        alpha: float = 1.0,
        n_iters: int = 3) -> dict:
    ds    = DATASETS[dataset_key]
    train = ds["train"]
    test  = ds["test"]

    w1 = w2 = theta = 0.0
    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        for pi, p in enumerate(train):
            x1, x2, d = p["x1"], p["x2"], p["d"]
            w1b, w2b, thb = w1, w2, theta

            y_star = _r4(w1 * x1 + w2 * x2 + theta)
            y      = _classify(y_star, delta)
            ok     = y == d

            if not ok:
                w1    = _r4(w1    + alpha * d * x1)
                w2    = _r4(w2    + alpha * d * x2)
                theta = _r4(theta + alpha * d)

            all_res = _eval_all(w1, w2, theta, delta, train)

            steps.append({
                "iter":           iteration,
                "pi":             pi,
                "pattern":        p,
                "y_star":         y_star,
                "y":              y,
                "ok":             ok,
                "weights_before": {"w1": w1b, "w2": w2b, "theta": thb},
                "weights_after":  {"w1": w1,  "w2": w2,  "theta": theta},
                "products":       {"w1_x1": _r4(w1b * x1), "w2_x2": _r4(w2b * x2)},
                "lines":          _line_equations(w1, w2, theta, delta),
                "train_results":  all_res,
                "train_score":    _score(all_res),
            })

    test_results   = _eval_all(w1, w2, theta, delta, test)
    test_annotated = [{**p, **r} for p, r in zip(test, test_results)]

    return {
        "algorithm":      "perceptron",
        "config": {
            "dataset": dataset_key,
            "delta":   delta,
            "alpha":   alpha,
            "n_iters": n_iters,
            "n_train": len(train),
            "n_test":  len(test),
            "canvas":  ds["canvas"],
        },
        "steps":          steps,
        "final_weights":  {"w1": w1, "w2": w2, "theta": theta},
        "test_annotated": test_annotated,
        "test_score":     _score(test_results),
    }


if __name__ == "__main__":
    import sys
    key    = sys.argv[1] if len(sys.argv) > 1 else "perceptron_ex4"
    result = run(key)
    fw = result["final_weights"]
    print(f"\nFinal weights: w1={fw['w1']}  w2={fw['w2']}  θ={fw['theta']}")
    for s in result["steps"]:
        if s["pi"] == len(DATASETS[key]["train"]) - 1:
            sc = s["train_score"]
            print(f"  After iter {s['iter']}: {sc['correct']}/{sc['total']} correct ({sc['pct']}%)")
    if result["test_annotated"]:
        ts = result["test_score"]
        print(f"\nTest: {ts['correct']}/{ts['total']} ({ts['pct']}%)")
        for t in result["test_annotated"]:
            print(f"  {'✓' if t['ok'] else '✗'}  n={t['n']}  ({t['x1']},{t['x2']})  d={t['d']}  y={t['y']}")
