from __future__ import annotations
import math

CITIES = {
    'A': (1.4, 6.2), 'B': (5.1, 6.2), 'C': (6.2, 9.8),
    'D': (7.4, 6.1), 'E': (8.1, 4.1), 'F': (11.2, 6.2),
    'G': (9.3, 0.6), 'H': (6.2, 2.7), 'I': (3.3, 0.6),
    'J': (4.4, 4.1),
}
NAMES     = list('ABCDEFGHIJ')
INIT_TOUR = list('JDHBEAFICG')


def _r4(x: float) -> float:
    return round(x, 4)


def _dist(a: str, b: str) -> float:
    ax, ay = CITIES[a]
    bx, by = CITIES[b]
    return _r4(math.sqrt((ax - bx) ** 2 + (ay - by) ** 2))


def _build_matrix() -> dict:
    return {a: {b: _dist(a, b) for b in NAMES} for a in NAMES}


def _tour_cost(tour: list, C: dict) -> float:
    n = len(tour)
    return _r4(sum(C[tour[i]][tour[(i + 1) % n]] for i in range(n)))


def _two_opt(tour: list, i: int, j: int) -> list:
    return tour[:i] + tour[i:j + 1][::-1] + tour[j + 1:]


def run(init_tour: list | None = None,
        k: int = 3,
        max_iter: int = 20) -> dict:

    C          = _build_matrix()
    S          = (init_tour or INIT_TOUR)[:]
    best_S     = S[:]
    best_cost  = _tour_cost(S, C)
    tabu: dict = {}
    steps: list[dict] = []

    for iteration in range(1, max_iter + 1):
        n = len(S)

        neighbors = []
        for i in range(n - 1):
            for j in range(i + 1, n):
                new_tour = _two_opt(S, i, j)
                cost     = _tour_cost(new_tour, C)
                key      = (i, j)
                is_tabu  = tabu.get(key, 0) > 0
                aspiration = cost < best_cost
                neighbors.append({
                    'i': i, 'j': j, 'key': key,
                    'tour': new_tour, 'cost': cost,
                    'is_tabu': is_tabu, 'aspiration': aspiration,
                    'cities': (S[i], S[j]),
                })
        neighbors.sort(key=lambda m: m['cost'])

        chosen = next(
            (m for m in neighbors if not m['is_tabu'] or m['aspiration']),
            None
        )

        if not chosen:
            break

        aspiration_used = chosen['is_tabu'] and chosen['aspiration']
        is_new_best     = chosen['cost'] < best_cost

        steps.append({
            'iter':           iteration,
            'S_before':       S[:],
            'cost_before':    _tour_cost(S, C),
            'move_i':         chosen['i'],
            'move_j':         chosen['j'],
            'move_cities':    chosen['cities'],
            'S_after':        chosen['tour'][:],
            'cost_after':     chosen['cost'],
            'was_tabu':       chosen['is_tabu'],
            'aspiration_used': aspiration_used,
            'is_new_best':    is_new_best,
            'tabu_before':    {str(k[0])+'_'+str(k[1]): v for k,v in tabu.items()},
            'top5':           [{'i':m['i'],'j':m['j'],'cities':m['cities'],
                                 'cost':m['cost'],'is_tabu':m['is_tabu'],
                                 'aspiration':m['aspiration']}
                                for m in neighbors[:5]],
        })

        tabu[chosen['key']] = k
        tabu = {m: v - 1 for m, v in tabu.items() if v - 1 > 0}

        steps[-1]['tabu_after'] = {str(k[0])+'_'+str(k[1]): v for k,v in tabu.items()}

        S = chosen['tour']
        if is_new_best:
            best_S    = S[:]
            best_cost = chosen['cost']

        steps[-1]['best_tour'] = best_S[:]
        steps[-1]['best_cost'] = best_cost

    matrix_list = [[C[a][b] for b in NAMES] for a in NAMES]

    return {
        'algorithm':  'tabu_search',
        'config': {
            'k':        k,
            'max_iter': max_iter,
            'n_cities': len(NAMES),
        },
        'cities':      CITIES,
        'names':       NAMES,
        'init_tour':   INIT_TOUR[:],
        'init_cost':   _tour_cost(INIT_TOUR, C),
        'matrix':      matrix_list,
        'steps':       steps,
        'best_tour':   best_S,
        'best_cost':   best_cost,
    }


if __name__ == '__main__':
    r = run(max_iter=5)
    print(f"Tabu Search TSP  k={r['config']['k']}")
    print(f"Initial: {' → '.join(r['init_tour'])} → {r['init_tour'][0]}"
          f"  cost={r['init_cost']:.4f}")
    print()
    for s in r['steps']:
        mc  = s['move_cities']
        asp = ' [ASPIRATION]' if s['aspiration_used'] else ''
        nb  = ' *** NEW BEST ***' if s['is_new_best'] else ''
        print(f"Iter {s['iter']:2d}: swap({s['move_i']},{s['move_j']}) "
              f"{mc[0]}-{mc[1]}{asp}")
        print(f"  {' → '.join(s['S_before'])}  cost={s['cost_before']:.4f}")
        print(f"  {' → '.join(s['S_after'])}  cost={s['cost_after']:.4f}{nb}")
        print(f"  Tabu: {s['tabu_after']}")
    print(f"\nBest: {' → '.join(r['best_tour'])} → {r['best_tour'][0]}")
    print(f"Best cost: {r['best_cost']:.4f}")
