from __future__ import annotations
import math

INIT_NEURONS = [
    {"id": 0,  "cls": "C1", "pos": [0.6, 0.8]},
    {"id": 1,  "cls": "C1", "pos": [0.2, 0.6]},
    {"id": 2,  "cls": "C1", "pos": [0.6, 0.4]},
    {"id": 3,  "cls": "C1", "pos": [0.2, 0.2]},
    {"id": 4,  "cls": "C2", "pos": [0.8, 0.8]},
    {"id": 5,  "cls": "C2", "pos": [0.4, 0.6]},
    {"id": 6,  "cls": "C2", "pos": [0.8, 0.4]},
    {"id": 7,  "cls": "C2", "pos": [0.4, 0.2]},
    {"id": 8,  "cls": "C3", "pos": [0.2, 0.8]},
    {"id": 9,  "cls": "C3", "pos": [0.6, 0.6]},
    {"id": 10, "cls": "C3", "pos": [0.2, 0.4]},
    {"id": 11, "cls": "C3", "pos": [0.6, 0.2]},
    {"id": 12, "cls": "C4", "pos": [0.4, 0.8]},
    {"id": 13, "cls": "C4", "pos": [0.8, 0.6]},
    {"id": 14, "cls": "C4", "pos": [0.4, 0.4]},
    {"id": 15, "cls": "C4", "pos": [0.8, 0.2]},
]

TRAIN_VECTORS = [
    {"x": [0.25, 0.25], "cls": "C1", "section": "2.1/2.2"},
    {"x": [0.40, 0.35], "cls": "C1", "section": "2.3"},
    {"x": [0.40, 0.45], "cls": "C1", "section": "2.3"},
    {"x": [0.60, 0.65], "cls": "C4", "section": "2.3"},
    {"x": [0.75, 0.80], "cls": "C4", "section": "2.3"},
]


def _r4(x: float) -> float:
    return round(x, 4)


def _euclid(ax: float, ay: float, bx: float, by: float) -> float:
    return _r4(math.sqrt((ax - bx) ** 2 + (ay - by) ** 2))


def run(alpha: float = 0.5) -> dict:
    W      = [n["pos"][:] for n in INIT_NEURONS]
    clss   = [n["cls"]    for n in INIT_NEURONS]
    init_W = [w[:] for w in W]
    steps: list[dict] = []

    for pi, t in enumerate(TRAIN_VECTORS):
        x        = t["x"]
        w_before = [w[:] for w in W]

        dists  = [_euclid(x[0], x[1], W[i][0], W[i][1]) for i in range(len(W))]
        winner = dists.index(min(dists))
        w_cls  = clss[winner]
        match  = w_cls == t["cls"]
        w_old  = W[winner][:]

        if match:
            dx   = _r4( alpha * (x[0] - W[winner][0]))
            dy   = _r4( alpha * (x[1] - W[winner][1]))
            rule = "attract"
        else:
            dx   = _r4(-alpha * (x[0] - W[winner][0]))
            dy   = _r4(-alpha * (x[1] - W[winner][1]))
            rule = "repel"

        W[winner][0] = _r4(W[winner][0] + dx)
        W[winner][1] = _r4(W[winner][1] + dy)

        steps.append({
            "pi":             pi,
            "section":        t["section"],
            "alpha":          alpha,
            "input":          {"x": x, "cls": t["cls"]},
            "dists":          dists,
            "winner":         winner,
            "winner_cls":     w_cls,
            "winner_pos_old": w_old,
            "match":          match,
            "rule":           rule,
            "delta":          [dx, dy],
            "winner_pos_new": W[winner][:],
            "weights_before": [w[:] for w in w_before],
            "weights_after":  [w[:] for w in W],
        })

    return {
        "algorithm":      "lvq",
        "config":         {"alpha": alpha, "n_neurons": len(W), "n_train": len(TRAIN_VECTORS)},
        "classes":        ["C1", "C2", "C3", "C4"],
        "neuron_classes": clss,
        "init_weights":   init_W,
        "steps":          steps,
        "final_weights":  [w[:] for w in W],
    }


if __name__ == "__main__":
    r = run()
    print("LVQ — Atividade 6.2\n")
    for s in r["steps"]:
        x  = s["input"]["x"]
        ci = s["input"]["cls"]
        wi = s["winner"]
        wc = s["winner_cls"]
        print(f"[{s['section']}] x={x} cls={ci} → winner=n{wi+1}({wc}) "
              f"d={s['dists'][wi]:.4f} {s['rule'].upper()} "
              f"{s['winner_pos_old']} → {s['winner_pos_new']}")
