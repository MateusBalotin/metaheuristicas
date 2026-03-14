from typing import Any

# d = +1 for class A, -1 for class B
EXERCISES: dict[str, dict] = {
    "ex4": {
        "name": "Exercise 4 — Pattern Classification",
        "delta": 0.2,
        "alpha": 1.0,
        "n_iters": 3,
        "train": [
            {"n": 1, "x1": 0.75, "x2": 0.75, "d":  1, "cls": "A"},
            {"n": 2, "x1": 0.75, "x2": 0.25, "d": -1, "cls": "B"},
            {"n": 3, "x1": 0.25, "x2": 0.75, "d": -1, "cls": "B"},
            {"n": 4, "x1": 0.25, "x2": 0.25, "d":  1, "cls": "A"},
        ],
        "test": [],
    },
    "ex5": {
        "name": "Exercise 5 — 22 training / 8 test vectors",
        "delta": 0.2,
        "alpha": 1.0,
        "n_iters": 3,
        "train": [
            {"n":  1, "x1": 0, "x2": 1, "d":  1},
            {"n":  2, "x1": 0, "x2": 2, "d":  1},
            {"n":  3, "x1": 1, "x2": 1, "d":  1},
            {"n":  4, "x1": 1, "x2": 2, "d":  1},
            {"n":  5, "x1": 1, "x2": 3, "d":  1},
            {"n":  6, "x1": 2, "x2": 2, "d":  1},
            {"n":  7, "x1": 2, "x2": 3, "d":  1},
            {"n":  8, "x1": 3, "x2": 2, "d":  1},
            {"n":  9, "x1": 4, "x2": 1, "d":  1},
            {"n": 10, "x1": 4, "x2": 3, "d":  1},
            {"n": 11, "x1": 0, "x2": 3, "d":  1},
            {"n": 12, "x1": 2, "x2": 0, "d": -1},
            {"n": 13, "x1": 2, "x2": 1, "d": -1},
            {"n": 14, "x1": 3, "x2": 0, "d": -1},
            {"n": 15, "x1": 3, "x2": 1, "d": -1},
            {"n": 16, "x1": 3, "x2": 3, "d": -1},
            {"n": 17, "x1": 4, "x2": 0, "d": -1},
            {"n": 18, "x1": 4, "x2": 2, "d": -1},
            {"n": 19, "x1": 5, "x2": 0, "d": -1},
            {"n": 20, "x1": 5, "x2": 1, "d": -1},
            {"n": 21, "x1": 5, "x2": 2, "d": -1},
            {"n": 22, "x1": 5, "x2": 3, "d": -1},
        ],
        "test": [
            {"n": 23, "x1": 0,   "x2": 0,   "d":  1},
            {"n": 24, "x1": 1,   "x2": 0,   "d": -1},
            {"n": 25, "x1": 4.5, "x2": 0.5, "d": -1},
            {"n": 26, "x1": 3.5, "x2": 1.5, "d":  1},
            {"n": 27, "x1": 4,   "x2": 2.5, "d":  1},
            {"n": 28, "x1": 1.5, "x2": 1.5, "d":  1},
            {"n": 29, "x1": 2,   "x2": 0.5, "d": -1},
            {"n": 30, "x1": 2.5, "x2": 2.5, "d":  1},
        ],
    },
}


def _r4(x: float) -> float:
    return round(x, 4)


def _classify(y_star: float, delta: float) -> int:
    if y_star > delta:
        return 1
    if y_star < -delta:
        return -1
    return 0


def _net_input(w1: float, w2: float, theta: float, x1: float, x2: float) -> float:
    return _r4(w1 * x1 + w2 * x2 + theta)


def _update_weights(w1: float, w2: float, theta: float,
                    alpha: float, d: int,
                    x1: float, x2: float) -> tuple[float, float, float]:
    return (
        _r4(w1    + alpha * d * x1),
        _r4(w2    + alpha * d * x2),
        _r4(theta + alpha * d),
    )


def _eval_pattern(w1: float, w2: float, theta: float,
                  delta: float, p: dict) -> dict[str, Any]:
    y_star = _net_input(w1, w2, theta, p["x1"], p["x2"])
    y      = _classify(y_star, delta)
    ok     = y == p["d"]
    return {"y_star": y_star, "y": y, "ok": ok}


def _eval_all(w1: float, w2: float, theta: float,
              delta: float, dataset: list[dict]) -> list[dict]:
    return [_eval_pattern(w1, w2, theta, delta, p) for p in dataset]


def _score(results: list[dict]) -> dict[str, Any]:
    correct = sum(1 for r in results if r["ok"])
    total   = len(results)
    return {
        "correct": correct,
        "errors":  total - correct,
        "total":   total,
        "pct":     round(correct / total * 100, 1) if total else 0.0,
    }


def run(exercise: str = "ex4") -> dict[str, Any]:
    cfg     = EXERCISES[exercise]
    delta   = cfg["delta"]
    alpha   = cfg["alpha"]
    n_iters = cfg["n_iters"]
    train   = cfg["train"]
    test    = cfg["test"]

    w1, w2, theta = 0.0, 0.0, 0.0
    training_steps: list[dict] = []
    summary: list[dict] = []

    for iteration in range(1, n_iters + 1):
        iter_errors = 0

        for pi, pattern in enumerate(train):
            x1, x2, d = pattern["x1"], pattern["x2"], pattern["d"]

            w1_before, w2_before, th_before = w1, w2, theta

            y_star = _net_input(w1, w2, theta, x1, x2)
            y      = _classify(y_star, delta)
            ok     = y == d

            if not ok:
                iter_errors += 1
                w1, w2, theta = _update_weights(w1, w2, theta, alpha, d, x1, x2)

            all_results = _eval_all(w1, w2, theta, delta, train)

            training_steps.append({
                "iter":    iteration,
                "pi":      pi,
                "pattern": pattern,
                "y_star":  y_star,
                "y":       y,
                "ok":      ok,
                "weights_before": {"w1": w1_before, "w2": w2_before, "theta": th_before},
                "weights_after":  {"w1": w1,        "w2": w2,        "theta": theta},
                "products": {
                    "w1_x1": _r4(w1_before * x1),
                    "w2_x2": _r4(w2_before * x2),
                },
                "lines": _line_equations(w1, w2, theta, delta),
                "train_results": all_results,
                "train_score":   _score(all_results),
            })

        summary.append({
            "iteration":   iteration,
            "errors":      iter_errors,
            "weights_end": {"w1": w1, "w2": w2, "theta": theta},
        })

    test_results = _eval_all(w1, w2, theta, delta, test)
    test_score   = _score(test_results)
    test_annotated = [{**p, **r} for p, r in zip(test, test_results)]

    return {
        "config":        cfg,
        "training":      training_steps,
        "summary":       summary,
        "final_weights": {"w1": w1, "w2": w2, "theta": theta},
        "test":          test_annotated,
        "test_score":    test_score,
    }


def _line_equations(w1: float, w2: float, theta: float, delta: float) -> dict[str, Any]:
    if w2 == 0:
        if w1 == 0:
            return {"upper": None, "lower": None, "w2_zero": True, "w1_zero": True}
        return {
            "upper": {"vertical": True, "x1": _r4((delta  - theta) / w1)},
            "lower": {"vertical": True, "x1": _r4((-delta - theta) / w1)},
            "w2_zero": True, "w1_zero": False,
        }

    slope     = _r4(-w1 / w2)
    int_upper = _r4(( delta - theta) / w2)
    int_lower = _r4((-delta - theta) / w2)

    return {
        "upper": {"slope": slope, "intercept": int_upper, "vertical": False},
        "lower": {"slope": slope, "intercept": int_lower, "vertical": False},
        "intercept_diff": _r4(2 * delta / w2),
        "w2_zero": False,
    }


if __name__ == "__main__":
    import sys

    ex = sys.argv[1] if len(sys.argv) > 1 else "ex4"
    result = run(ex)

    print(f"\n{'='*55}")
    print(f"  {result['config']['name']}")
    print(f"{'='*55}")
    print(f"\nFinal weights: {result['final_weights']}\n")

    for s in result["summary"]:
        print(f"  Iter {s['iteration']}: {s['errors']} error(s) | weights: {s['weights_end']}")

    if result["test"]:
        ts = result["test_score"]
        print(f"\nTest set: {ts['correct']}/{ts['total']} correct ({ts['pct']}%)")
        for t in result["test"]:
            status = "✓" if t["ok"] else "✗"
            print(f"  {status} n={t['n']}  ({t['x1']}, {t['x2']})  d={t['d']}  y={t['y']}")
    print()
