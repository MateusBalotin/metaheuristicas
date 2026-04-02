from __future__ import annotations
import math
import copy
from algorithms.datasets import DATASETS


def _r6(x: float) -> float:
    return round(x, 6)

def _r4(x: float) -> float:
    return round(x, 4)


def _rng(seed: int):
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def _select_centers(dataset: list, q: int, seed: int) -> list:
    rng  = _rng(seed)
    idxs = list(range(len(dataset)))
    for i in range(q):
        j = i + int(rng() * (len(idxs) - i))
        idxs[i], idxs[j] = idxs[j], idxs[i]
    return [dataset[idxs[i]]["x1"] for i in range(q)]


def _phi(x: float, u: float, sigma: float) -> float:
    return _r6(math.exp(-((x - u) ** 2) / (2 * sigma ** 2)))


def _mat_T(A: list) -> list:
    rows, cols = len(A), len(A[0])
    return [[A[i][j] for i in range(rows)] for j in range(cols)]


def _mat_mul(A: list, B: list) -> list:
    rA, cA, cB = len(A), len(A[0]), len(B[0])
    return [[_r6(sum(A[i][k] * B[k][j] for k in range(cA))) for j in range(cB)] for i in range(rA)]


def _mat_vec(A: list, v: list) -> list:
    return [_r6(sum(A[i][j] * v[j] for j in range(len(v)))) for i in range(len(A))]


def _solve(A: list, b: list) -> list:
    n  = len(A)
    M  = [A[i][:] + [b[i]] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot] = M[pivot], M[col]
        piv = M[col][col]
        for row in range(n):
            if row != col:
                f = M[row][col] / piv
                M[row] = [M[row][k] - f * M[col][k] for k in range(n + 1)]
        M[col] = [x / piv for x in M[col]]
    return [_r6(M[i][n]) for i in range(n)]


def run(dataset_key: str = "rbf_ex5",
        q: int | None = None,
        sigma: float | None = None,
        seed: int | None = None) -> dict:
    ds    = DATASETS[dataset_key]
    train = ds["train"]
    q_    = q     if q     is not None else ds["q"]
    sig   = sigma if sigma is not None else ds["sigma"]
    sd    = seed  if seed  is not None else ds["seed"]

    centers = _select_centers(train, q_, sd)

    # Build G matrix: rows = patterns, cols = phi_1..phi_q + bias(1)
    G_rows = []
    row_details = []
    for p in train:
        x    = p["x1"]
        phis = [_phi(x, u, sig) for u in centers]
        row  = phis + [1.0]
        G_rows.append(row)
        row_details.append({
            "n":    p["n"],
            "x1":   x,
            "d":    p["d"],
            "phis": phis,
        })

    GT  = _mat_T(G_rows)
    GTG = _mat_mul(GT, G_rows)
    d_vec = [p["d"] for p in train]
    GTd = _mat_vec(GT, d_vec)
    w   = _solve(GTG, GTd)

    # Evaluate
    results = []
    mse = 0.0
    for i, p in enumerate(train):
        y   = _r6(sum(w[j] * G_rows[i][j] for j in range(q_ + 1)))
        err = _r6(p["d"] - y)
        mse += err ** 2
        results.append({"n": p["n"], "x1": p["x1"], "d": p["d"], "y": y, "error": err})
    mse = _r6(mse / len(train))

    return {
        "algorithm": "rbf",
        "config": {
            "dataset": dataset_key,
            "q":       q_,
            "sigma":   sig,
            "seed":    sd,
            "n_train": len(train),
            "canvas":  ds["canvas"],
        },
        "train":       train,
        "centers":     centers,
        "sigma":       sig,
        "q":           q_,
        "G":           G_rows,
        "GTG":         GTG,
        "GTd":         GTd,
        "weights":     w,
        "row_details": row_details,
        "results":     results,
        "mse":         mse,
    }


if __name__ == "__main__":
    r = run()
    print(f"RBF  q={r['config']['q']}  sigma={r['config']['sigma']}  seed={r['config']['seed']}")
    print(f"Centers: {r['centers']}")
    print(f"Weights: {[round(w, 4) for w in r['weights']]}")
    print(f"MSE: {r['mse']}")
    for res in r["results"]:
        print(f"  n={res['n']:2d}  x={res['x1']:5.1f}  d={res['d']:8.4f}  y={res['y']:8.4f}  err={res['error']:8.4f}")


def run_classification(dataset_key: str = "rbf_ex6",
                       q: int | None = None,
                       sigma: float | None = None) -> dict:
    ds      = DATASETS[dataset_key]
    train   = ds["train"]
    test    = ds.get("test", [])
    q_      = q     if q     is not None else ds["q"]
    sig     = sigma if sigma is not None else ds["sigma"]
    centers = ds["fixed_centers"]          # fixed 2D centers as given in the exercise
    thr     = ds.get("threshold", 0.0)     # y >= threshold → class +1

    def _phi2d(x1: float, x2: float, u: list, s: float) -> float:
        return _r6(math.exp(-((x1 - u[0])**2 + (x2 - u[1])**2) / (2 * s**2)))

    G_rows = []
    row_details = []
    for p in train:
        phis = [_phi2d(p["x1"], p["x2"], u, sig) for u in centers]
        row  = phis + [1.0]
        G_rows.append(row)
        row_details.append({"n": p["n"], "x1": p["x1"], "x2": p["x2"],
                             "d": p["d"], "phis": phis})

    GT  = _mat_T(G_rows)
    GTG = _mat_mul(GT, G_rows)
    d_vec = [p["d"] for p in train]
    GTd   = _mat_vec(GT, d_vec)
    w     = _solve(GTG, GTd)

    def _eval(dataset: list) -> list:
        res = []
        for i, p in enumerate(dataset):
            phis = [_phi2d(p["x1"], p["x2"], u, sig) for u in centers]
            row  = phis + [1.0]
            y    = _r6(sum(w[j] * row[j] for j in range(q_ + 1)))
            cls  = 1 if y >= thr else -1
            res.append({"n": p["n"], "x1": p["x1"], "x2": p["x2"],
                        "d": p["d"], "y": y, "cls": cls, "ok": cls == p["d"]})
        return res

    train_results = _eval(train)
    test_results  = _eval(test)

    def _score(results: list) -> dict:
        ok = sum(1 for r in results if r["ok"])
        n  = len(results)
        return {"correct": ok, "errors": n - ok, "total": n,
                "pct": round(ok / n * 100, 1) if n else 0.0}

    return {
        "algorithm":      "rbf_classification",
        "config": {
            "dataset":   dataset_key,
            "q":         q_,
            "sigma":     sig,
            "threshold": thr,
            "n_train":   len(train),
            "n_test":    len(test),
            "canvas":    ds["canvas"],
        },
        "train":          train,
        "centers":        centers,
        "sigma":          sig,
        "q":              q_,
        "threshold":      thr,
        "G":              G_rows,
        "GTG":            GTG,
        "GTd":            GTd,
        "weights":        w,
        "row_details":    row_details,
        "train_results":  train_results,
        "train_score":    _score(train_results),
        "test_annotated": test_results,
        "test_score":     _score(test_results),
    }
