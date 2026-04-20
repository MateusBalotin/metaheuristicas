from __future__ import annotations
import math

Y_SERIES        = [1.0, 0.9, 0.75, 0.6, 0.55, 0.6, 0.4, 0.3, 0.2, 0.05]
DEFAULT_CENTERS = [[1, 2], [4, 5], [7, 8]]


def _r6(x: float) -> float:
    return round(x, 6)


def _sq_dist(x: list, u: list) -> float:
    return _r6(sum((x[j] - u[j]) ** 2 for j in range(len(x))))


def _phi(x: list, u: list, sigma: float) -> float:
    return _r6(math.exp(-_sq_dist(x, u) / (2 * sigma ** 2)))


def _mat_T(A: list) -> list:
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]


def _mat_mul(A: list, B: list) -> list:
    r, m, c = len(A), len(B), len(B[0])
    return [[_r6(sum(A[i][k] * B[k][j] for k in range(m))) for j in range(c)]
            for i in range(r)]


def _solve(A: list, b: list) -> list:
    n = len(b)
    M = [A[i][:] + [b[i]] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot] = M[pivot], M[col]
        for row in range(col + 1, n):
            if abs(M[col][col]) < 1e-14:
                continue
            f = M[row][col] / M[col][col]
            for k in range(col, n + 1):
                M[row][k] -= f * M[col][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = M[i][n]
        for j in range(i + 1, n):
            x[i] -= M[i][j] * x[j]
        x[i] = _r6(x[i] / M[i][i])
    return x


def run(sigma: float = 1.0,
        theta: float = 1.0,
        centers: list | None = None) -> dict:

    if centers is None:
        centers = DEFAULT_CENTERS
    k         = len(centers[0])
    n_centers = len(centers)
    n_weights = n_centers + 1

    patterns = []
    for t in range(len(Y_SERIES) - k):
        patterns.append({
            "t":    t + 1,
            "x":    [t + 1, t + 2],
            "y_in": Y_SERIES[t: t + k],
            "d":    Y_SERIES[t + k],
        })

    G_rows: list[list[float]] = []
    steps:  list[dict]        = []

    for pi, p in enumerate(patterns):
        x        = p["x"]
        g_before = G_rows[:]
        sq_dists = [_r6(_sq_dist(x, c)) for c in centers]
        phis     = [_phi(x, c, sigma) for c in centers]
        new_row  = phis + [theta]
        G_rows.append(new_row)

        steps.append({
            "pi":       pi,
            "t":        p["t"],
            "x":        x,
            "y_in":     p["y_in"],
            "d":        p["d"],
            "sq_dists": sq_dists,
            "phis":     phis,
            "new_row":  new_row,
            "G_so_far": [r[:] for r in G_rows],
            "G_before": [r[:] for r in g_before],
        })

    Gt    = _mat_T(G_rows)
    GtG   = _mat_mul(Gt, G_rows)
    d_vec = [p["d"] for p in patterns]
    Gtd   = [_r6(sum(Gt[i][j] * d_vec[j] for j in range(len(d_vec))))
              for i in range(n_weights)]
    w     = _solve(GtG, Gtd)

    predictions = []
    for p in patterns:
        x     = p["x"]
        y_hat = _r6(sum(w[j] * _phi(x, centers[j], sigma) for j in range(n_centers))
                    + w[n_centers] * theta)
        err   = _r6(p["d"] - y_hat)
        predictions.append({
            "t":      p["t"],
            "x":      x,
            "y_in":   p["y_in"],
            "d":      p["d"],
            "y_hat":  y_hat,
            "error":  err,
            "sq_err": _r6(err ** 2),
        })

    mse = _r6(sum(pr["sq_err"] for pr in predictions) / len(predictions))

    return {
        "algorithm": "rbf_temporal_t",
        "config": {
            "sigma":      sigma,
            "theta":      theta,
            "k":          k,
            "n_centers":  n_centers,
            "n_patterns": len(patterns),
            "input_type": "time",
        },
        "y_series":    Y_SERIES,
        "centers":     centers,
        "patterns":    patterns,
        "steps":       steps,
        "GtG":         GtG,
        "Gtd":         Gtd,
        "weights":     w,
        "predictions": predictions,
        "mse":         mse,
    }


if __name__ == "__main__":
    r = run()
    print(f"RBF Temporal (entradas t) — σ={r['config']['sigma']}  θ={r['config']['theta']}")
    print(f"Centros: {r['centers']}")
    print(f"\nPesos: w1={r['weights'][0]:.6f}  w2={r['weights'][1]:.6f}"
          f"  w3={r['weights'][2]:.6f}  w0={r['weights'][3]:.6f}")
    print(f"\n{'P':3} {'x=[t,t+1]':14} {'d':8} {'ŷ':12} {'e':12} {'e²':12}")
    for pr in r["predictions"]:
        print(f"P{pr['t']:1}  {str(pr['x']):14} "
              f"{pr['d']:8.4f} {pr['y_hat']:12.6f} "
              f"{pr['error']:+12.6f} {pr['sq_err']:12.6f}")
    print(f"\nMSE = {r['mse']:.6f}")
