from __future__ import annotations

NAMES = list("ABCDEF")
COST = {
    "A": {"A": 0.0, "B": 9.2, "C": 5.4, "D": 4.1, "E": 6.0, "F": 8.5},
    "B": {"A": 9.2, "B": 0.0, "C": 9.1, "D": 5.8, "E": 6.1, "F": 4.5},
    "C": {"A": 5.4, "B": 9.1, "C": 0.0, "D": 7.2, "E": 9.4, "F": 5.8},
    "D": {"A": 4.1, "B": 5.8, "C": 7.2, "D": 0.0, "E": 2.2, "F": 7.1},
    "E": {"A": 6.0, "B": 6.1, "C": 9.4, "D": 2.2, "E": 0.0, "F": 8.5},
    "F": {"A": 8.5, "B": 4.5, "C": 5.8, "D": 7.1, "E": 8.5, "F": 0.0},
}
COORDS = {
    "A": (3.6, 3.4), "B": (6.6, 8.6), "C": (5.6, 1.8),
    "D": (4.2, 6.2), "E": (3.8, 7.6), "F": (7.4, 5.4),
}

S4         = list("ABCEFD")
TABU_INIT  = {"B_E": 2, "C_E": 3, "E_F": 1}
TENURE     = 3
CUSTO_OTIMO = 28.1
R_SEL      = [0.45, 0.25, 0.10]
OX_C1      = 3
OX_C2      = 4
MUT_I      = 1
MUT_J      = 2


def _r1(x: float) -> float:
    return round(x, 1)


def _tour_cost(t: list) -> float:
    n = len(t)
    return _r1(sum(COST[t[i]][t[(i + 1) % n]] for i in range(n)))


def _pair_key(a: str, b: str) -> str:
    return "_".join(sorted([a, b]))


def _tabu_run() -> dict:
    S    = S4[:]
    tabu = dict(TABU_INIT)
    best_cost = _tour_cost(S)
    best_S    = S[:]
    steps: list[dict] = []

    for iteration in (4, 5):
        moves = []
        for i in range(1, len(S) - 1):
            for j in range(i + 1, len(S)):
                t = S[:]
                t[i], t[j] = t[j], t[i]
                c   = _tour_cost(t)
                key = _pair_key(S[i], S[j])
                moves.append({
                    "i": i, "j": j,
                    "cities": (S[i], S[j]),
                    "key":    key,
                    "tour":   t,
                    "cost":   c,
                    "is_tabu":    tabu.get(key, 0) > 0,
                    "aspiration": c < best_cost,
                })
        moves.sort(key=lambda m: (m["cost"], m["i"], m["j"]))
        candidates = moves[:3]

        chosen = next(
            (m for m in candidates if not m["is_tabu"] or m["aspiration"]),
            None,
        )
        aspiration_used = chosen["is_tabu"] and chosen["aspiration"]
        is_new_best     = chosen["cost"] < best_cost

        step = {
            "iter":        iteration,
            "S_before":    S[:],
            "cost_before": _tour_cost(S),
            "move_cities": chosen["cities"],
            "move_key":    chosen["key"],
            "S_after":     chosen["tour"][:],
            "cost_after":  chosen["cost"],
            "was_tabu":        chosen["is_tabu"],
            "aspiration_used": aspiration_used,
            "is_new_best":     is_new_best,
            "tabu_before": dict(tabu),
            "candidates": [
                {"cities": m["cities"], "key": m["key"], "cost": m["cost"],
                 "tour": m["tour"][:],
                 "is_tabu": m["is_tabu"], "aspiration": m["aspiration"]}
                for m in candidates
            ],
        }

        tabu = {k: v - 1 for k, v in tabu.items() if v - 1 > 0}
        tabu[chosen["key"]] = TENURE
        step["tabu_after"] = dict(tabu)

        S = chosen["tour"]
        if is_new_best:
            best_cost = chosen["cost"]
            best_S    = S[:]

        step["best_cost"] = best_cost
        step["erro"]      = _r1(chosen["cost"] - CUSTO_OTIMO)
        steps.append(step)

    return {"steps": steps, "S6": S[:], "S6_cost": _tour_cost(S)}


def _fitness(rows: list[dict]) -> None:
    cmax = max(r["cost"] for r in rows)
    for r in rows:
        r["fit"] = _r1(cmax - r["cost"] + 1.0)
    total = _r1(sum(r["fit"] for r in rows))
    acc = 0.0
    for r in rows:
        r["prob"] = round(r["fit"] / total, 3)
        acc = round(acc + r["prob"], 3)
        r["cum"] = acc
    rows[-1]["cum"] = 1.0


def _roulette(rows: list[dict], r: float) -> int:
    for i, row in enumerate(rows):
        if r <= row["cum"]:
            return i
    return len(rows) - 1


def _ox(p1: list, p2: list, c1: int, c2: int) -> list:
    n = len(p1)
    child = [None] * n
    for i in range(c1, c2 + 1):
        child[i] = p1[i]
    seg = set(child[c1:c2 + 1])
    fill = [g for g in p2 if g not in seg]
    idx = 0
    for i in range(n):
        if child[i] is None:
            child[i] = fill[idx]
            idx += 1
    return child


def _ga_run(pop_tours: list[list], labels: list[str]) -> dict:
    pop = [{"label": labels[i], "tour": t[:], "cost": _tour_cost(t)}
           for i, t in enumerate(pop_tours)]
    _fitness(pop)

    i_p1 = _roulette(pop, R_SEL[0])
    i_p2 = _roulette(pop, R_SEL[1])
    p1, p2 = pop[i_p1], pop[i_p2]

    child_tour = _ox(p1["tour"], p2["tour"], OX_C1, OX_C2)
    child = {"label": "Filho", "tour": child_tour,
             "cost": _tour_cost(child_tour)}

    i_mut = _roulette(pop, R_SEL[2])
    base  = pop[i_mut]
    mut_tour = base["tour"][:]
    mut_tour[MUT_I], mut_tour[MUT_J] = mut_tour[MUT_J], mut_tour[MUT_I]
    mut = {"label": "Mutante", "tour": mut_tour,
           "cost": _tour_cost(mut_tour), "base": base["label"]}

    i_elite = min(range(len(pop)), key=lambda i: pop[i]["cost"])
    elite   = pop[i_elite]
    new_pop = [
        {"label": elite["label"] + " (elite)", "tour": elite["tour"][:],
         "cost": elite["cost"]},
        {"label": "Filho",   "tour": child["tour"][:], "cost": child["cost"]},
        {"label": "Mutante", "tour": mut["tour"][:],   "cost": mut["cost"]},
    ]
    _fitness(new_pop)
    i_best = min(range(len(new_pop)), key=lambda i: new_pop[i]["cost"])
    for r in new_pop:
        r["erro"] = _r1(r["cost"] - CUSTO_OTIMO)

    return {
        "pop_ini":  pop,
        "r_sel":    R_SEL,
        "i_p1":     i_p1,
        "i_p2":     i_p2,
        "ox_cuts":  [OX_C1, OX_C2],
        "child":    child,
        "i_mut":    i_mut,
        "mut_pos":  [MUT_I, MUT_J],
        "mut":      mut,
        "i_elite":  i_elite,
        "new_pop":  new_pop,
        "best":     new_pop[i_best],
    }


def run() -> dict:
    tabu_part = _tabu_run()
    S5 = tabu_part["steps"][0]["S_after"]
    S6 = tabu_part["S6"]
    ga_part = _ga_run([S4, S5, S6], ["S4", "S5", "S6"])

    matrix = [[COST[a][b] for b in NAMES] for a in NAMES]
    return {
        "algorithm": "trabalho_tsp",
        "config": {
            "tenure":      TENURE,
            "custo_otimo": CUSTO_OTIMO,
            "n_cities":    len(NAMES),
        },
        "names":     NAMES,
        "coords":    COORDS,
        "matrix":    matrix,
        "S4":        S4[:],
        "S4_cost":   _tour_cost(S4),
        "tabu_init": dict(TABU_INIT),
        "tabu":      tabu_part,
        "ga":        ga_part,
    }


if __name__ == "__main__":
    r = run()
    print("2.1 — Busca Tabu (iterações 4 e 5)")
    print(f"S4 = {'-'.join(r['S4'])}-A  custo = {r['S4_cost']}")
    print(f"Tabu inicial: {r['tabu_init']}")
    print()
    for s in r["tabu"]["steps"]:
        print(f"Iteração {s['iter']} — candidatos:")
        for c in s["candidates"]:
            flags = []
            if c["is_tabu"]:
                flags.append("TABU")
            if c["is_tabu"] and c["aspiration"]:
                flags.append("ASPIRAÇÃO")
            fl = f"  [{' + '.join(flags)}]" if flags else ""
            print(f"  troca {c['cities'][0]}-{c['cities'][1]}: "
                  f"{'-'.join(c['tour'])}-A  custo={c['cost']}{fl}")
        asp = " (por aspiração)" if s["aspiration_used"] else ""
        print(f"  escolhido: troca {s['move_cities'][0]}-{s['move_cities'][1]}{asp}")
        print(f"  S{s['iter']+1} = {'-'.join(s['S_after'])}-A  "
              f"custo={s['cost_after']}  erro={s['erro']}")
        print(f"  tabu atualizada: {s['tabu_after']}")
        print()
    print(f"S6 = {'-'.join(r['tabu']['S6'])}-A  custo = {r['tabu']['S6_cost']}")
    print()
    print("2.2 — Algoritmo Genético (1 iteração)")
    ga = r["ga"]
    print("População inicial:")
    for p in ga["pop_ini"]:
        print(f"  {p['label']}: {'-'.join(p['tour'])}-A  custo={p['cost']}"
              f"  fit={p['fit']}  prob={p['prob']}  acum={p['cum']}")
    print(f"Roleta: r1={ga['r_sel'][0]} -> {ga['pop_ini'][ga['i_p1']]['label']}, "
          f"r2={ga['r_sel'][1]} -> {ga['pop_ini'][ga['i_p2']]['label']}")
    c1, c2 = ga["ox_cuts"]
    print(f"Cruzamento OX (posições {c1+1} a {c2+1}): "
          f"filho = {'-'.join(ga['child']['tour'])}-A  custo={ga['child']['cost']}")
    print(f"Mutação: r3={ga['r_sel'][2]} -> {ga['mut']['base']}, "
          f"troca posições {ga['mut_pos'][0]+1} e {ga['mut_pos'][1]+1}: "
          f"mutante = {'-'.join(ga['mut']['tour'])}-A  custo={ga['mut']['cost']}")
    print("Nova população:")
    for p in ga["new_pop"]:
        print(f"  {p['label']}: {'-'.join(p['tour'])}-A  custo={p['cost']}"
              f"  fit={p['fit']}  erro={p['erro']}")
    b = ga["best"]
    print(f"Melhor solução: {b['label']} = {'-'.join(b['tour'])}-A  "
          f"custo={b['cost']}  (custo ótimo = {r['config']['custo_otimo']})")
