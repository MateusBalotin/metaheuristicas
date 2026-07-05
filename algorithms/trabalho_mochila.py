from __future__ import annotations

P_ITEM = [20, 25, 14, 46, 39, 57, 58, 47, 38, 30,
          53, 57, 38, 53, 58, 48, 14, 6, 40, 10]
V_ITEM = [7, 7, 8, 3, 5, 8, 1, 4, 9, 7,
          10, 8, 7, 1, 7, 9, 3, 2, 4, 2]
P_COMP  = [240, 190, 170]
P_TOTAL = 510
N       = 20
K       = 3
MU      = 1.0
FO_REF  = 99.0


def _weights(a: list) -> list:
    w = [0] * K
    for j in range(N):
        if a[j] > 0:
            w[a[j] - 1] += P_ITEM[j]
    return w


def _evaluate(a: list) -> dict:
    w   = _weights(a)
    W   = sum(w)
    val = sum(V_ITEM[j] for j in range(N) if a[j] > 0)
    exc_comp  = [max(0, w[i] - P_COMP[i]) for i in range(K)]
    exc_total = max(0, W - P_TOTAL)
    pen = MU * (sum(exc_comp) + exc_total)
    return {
        "f":         val - pen,
        "val":       val,
        "pen":       pen,
        "w":         w,
        "W":         W,
        "exc_comp":  exc_comp,
        "exc_total": exc_total,
    }


def run(k: int = 3, max_iter: int = 20) -> dict:
    a = [0] * N
    ev0     = _evaluate(a)
    best_f  = ev0["f"]
    best_a  = a[:]
    tabu: dict[int, int] = {}
    steps: list[dict] = []

    for iteration in range(1, max_iter + 1):
        moves = []
        for j in range(N):
            for s in range(K + 1):
                if s == a[j]:
                    continue
                an = a[:]
                an[j] = s
                ev = _evaluate(an)
                moves.append({
                    "item":   j,
                    "dest":   s,
                    "orig":   a[j],
                    "a":      an,
                    "f":      ev["f"],
                    "val":    ev["val"],
                    "pen":    ev["pen"],
                    "w":      ev["w"],
                    "W":      ev["W"],
                    "is_tabu":    tabu.get(j, 0) > 0,
                    "aspiration": ev["f"] > best_f,
                })
        moves.sort(key=lambda m: (-m["f"], m["item"], m["dest"]))

        chosen = next(
            (m for m in moves if not m["is_tabu"] or m["aspiration"]),
            None,
        )
        if not chosen:
            break

        aspiration_used = chosen["is_tabu"] and chosen["aspiration"]
        is_new_best     = chosen["f"] > best_f
        ev_before       = _evaluate(a)

        step = {
            "iter":            iteration,
            "a_before":        a[:],
            "f_before":        ev_before["f"],
            "val_before":      ev_before["val"],
            "pen_before":      ev_before["pen"],
            "w_before":        ev_before["w"],
            "item":            chosen["item"],
            "orig":            chosen["orig"],
            "dest":            chosen["dest"],
            "a_after":         chosen["a"][:],
            "f_after":         chosen["f"],
            "val_after":       chosen["val"],
            "pen_after":       chosen["pen"],
            "w_after":         chosen["w"][:],
            "W_after":         chosen["W"],
            "aspiration_used": aspiration_used,
            "is_new_best":     is_new_best,
            "tabu_before":     {str(i): t for i, t in tabu.items()},
            "top5": [
                {"item": m["item"], "orig": m["orig"], "dest": m["dest"],
                 "f": m["f"], "val": m["val"], "pen": m["pen"], "W": m["W"],
                 "is_tabu": m["is_tabu"], "aspiration": m["aspiration"]}
                for m in moves[:5]
            ],
        }

        a = chosen["a"]
        tabu = {i: t - 1 for i, t in tabu.items() if t - 1 > 0}
        tabu[chosen["item"]] = k
        step["tabu_after"] = {str(i): t for i, t in tabu.items()}

        if is_new_best:
            best_f = chosen["f"]
            best_a = a[:]

        step["best_f"] = best_f
        step["erro"]   = FO_REF - chosen["f"]
        steps.append(step)

    ev_best = _evaluate(best_a)
    return {
        "algorithm": "trabalho_mochila",
        "config": {
            "k": k, "max_iter": max_iter, "n": N, "K": K,
            "P_comp": P_COMP, "P_total": P_TOTAL, "mu": MU,
            "fo_ref": FO_REF,
        },
        "p":        P_ITEM,
        "v":        V_ITEM,
        "steps":    steps,
        "best_a":   best_a,
        "best_f":   best_f,
        "best_val": ev_best["val"],
        "best_pen": ev_best["pen"],
        "best_w":   ev_best["w"],
        "best_W":   ev_best["W"],
        "erro_final": FO_REF - best_f,
    }


if __name__ == "__main__":
    r = run(k=3, max_iter=20)
    print(f"Busca Tabu — Mochila com compartimentos  k={r['config']['k']}"
          f"  mu={r['config']['mu']}")
    print(f"P = {P_COMP}  P_TOTAL = {P_TOTAL}")
    print()
    for s in r["steps"]:
        mv  = ("insere" if s["orig"] == 0 else
               "remove" if s["dest"] == 0 else "move")
        dst = f"comp {s['dest']}" if s["dest"] > 0 else "fora"
        asp = " [ASP]" if s["aspiration_used"] else ""
        nb  = " *" if s["is_new_best"] else ""
        print(f"Iter {s['iter']:2d}: {mv} item {s['item']+1:2d} -> {dst:6s}"
              f"  FO={s['f_after']:6.1f}  pen={s['pen_after']:4.1f}"
              f"  erro={s['erro']:5.1f}{asp}{nb}")
        print(f"        w={s['w_after']}  W={s['W_after']}"
              f"  tabu={{{', '.join(f'{int(i)+1}:{t}' for i, t in s['tabu_after'].items())}}}")
    print()
    print(f"Melhor FO = {r['best_f']}  (val={r['best_val']}, pen={r['best_pen']})")
    print(f"Pesos por compartimento: {r['best_w']}  total={r['best_W']}/{P_TOTAL}")
    for i in range(1, K + 1):
        itens = [j + 1 for j in range(N) if r["best_a"][j] == i]
        print(f"  Compartimento {i}: {itens}")
    print(f"Erro final vs FO de referência ({FO_REF}): {r['erro_final']}")
