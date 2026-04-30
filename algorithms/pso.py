from __future__ import annotations
import math

PARTICLES_INIT = [
    {"id": 1, "x": 5.0,  "v": 0.0},
    {"id": 2, "x": 6.0,  "v": 0.0},
    {"id": 3, "x": 8.5,  "v": 0.0},
    {"id": 4, "x": 11.0, "v": 0.0},
]

X_MIN = -5.0
X_MAX = 12.0


def _r6(x: float) -> float:
    return round(x, 6)


def _f(x: float) -> float:
    return _r6(math.cos(x) + x / 5)


def run(w: float = 0.2,
        n1: float = 0.3,
        n2: float = 0.5,
        n_iters: int = 10,
        r1: float = 1.0,
        r2: float = 1.0) -> dict:

    particles = [{"id": p["id"], "x": p["x"], "v": p["v"]} for p in PARTICLES_INIT]

    for p in particles:
        p["fit"]       = _f(p["x"])
        p["pbest"]     = p["x"]
        p["pbest_fit"] = p["fit"]

    gbest_p  = min(particles, key=lambda p: p["pbest_fit"])
    gbest    = gbest_p["pbest"]
    gbest_fit = gbest_p["pbest_fit"]

    init_state = [{"id": p["id"], "x": p["x"], "v": p["v"],
                   "fit": p["fit"], "pbest": p["pbest"], "pbest_fit": p["pbest_fit"]}
                  for p in particles]

    steps: list[dict] = []

    for iteration in range(1, n_iters + 1):
        p_steps = []

        for p in particles:
            x_old = p["x"]
            v_old = p["v"]
            pb    = p["pbest"]

            v_new = _r6(w * v_old + n1 * r1 * (pb - x_old) + n2 * r2 * (gbest - x_old))
            x_new = _r6(x_old + v_new)
            fit_new = _f(x_new)

            new_pbest    = pb
            new_pbest_fit = p["pbest_fit"]
            if fit_new < p["pbest_fit"]:
                new_pbest     = x_new
                new_pbest_fit = fit_new

            p_steps.append({
                "id":          p["id"],
                "x_before":    x_old,
                "v_before":    v_old,
                "pbest_before": pb,
                "gbest":       gbest,
                "v_new":       v_new,
                "x_new":       x_new,
                "fit_new":     fit_new,
                "pbest_new":   new_pbest,
                "pbest_fit_new": new_pbest_fit,
                "pbest_updated": new_pbest != pb,
            })

            p["x"]         = x_new
            p["v"]         = v_new
            p["fit"]       = fit_new
            p["pbest"]     = new_pbest
            p["pbest_fit"] = new_pbest_fit

        gbest_old = gbest
        for p in particles:
            if p["pbest_fit"] < gbest_fit:
                gbest     = p["pbest"]
                gbest_fit = p["pbest_fit"]

        steps.append({
            "iter":         iteration,
            "particles":    p_steps,
            "gbest_before": gbest_old,
            "gbest_after":  gbest,
            "gbest_fit":    gbest_fit,
            "gbest_updated": gbest != gbest_old,
        })

    x_curve = [_r6(X_MIN + i * (X_MAX - X_MIN) / 200) for i in range(201)]
    y_curve  = [_f(x) for x in x_curve]

    return {
        "algorithm": "pso",
        "config": {
            "w":       w,
            "n1":      n1,
            "n2":      n2,
            "r1":      r1,
            "r2":      r2,
            "n_iters": n_iters,
            "n_particles": len(particles),
        },
        "init_state":   init_state,
        "steps":        steps,
        "final_gbest":  gbest,
        "final_gbest_fit": gbest_fit,
        "x_curve":      x_curve,
        "y_curve":      y_curve,
    }


if __name__ == "__main__":
    r = run()
    cfg = r["config"]
    print(f"PSO  w={cfg['w']}  n1={cfg['n1']}  n2={cfg['n2']}")
    best_init = min(r["init_state"], key=lambda p: p["fit"])
    print(f"Init gbest={best_init['x']}  f={best_init['fit']:.6f}")
    for s in r["steps"]:
        print(f"Iter {s['iter']:2d}  gbest={s['gbest_after']:.6f}  f={s['gbest_fit']:.6f}")
        for ps in s["particles"]:
            upd = " pbest" if ps["pbest_updated"] else ""
            print(f"  P{ps['id']}: {ps['x_before']:.4f}->{ps['x_new']:.4f}"
                  f"  v={ps['v_new']:.4f}  f={ps['fit_new']:.6f}{upd}")
    print(f"Final gbest={r['final_gbest']:.6f}  f={r['final_gbest_fit']:.6f}")
