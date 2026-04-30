from __future__ import annotations
import math

CITIES = {
    'A': (1.4, 6.2), 'B': (5.1, 6.2), 'C': (6.2, 9.8),
    'D': (7.4, 6.1), 'E': (8.1, 4.1), 'F': (11.2, 6.2),
    'G': (9.3, 0.6), 'H': (6.2, 2.7), 'I': (3.3, 0.6),
    'J': (4.4, 4.1),
}
NAMES     = list('ABCDEFGHIJ')
INIT_TOUR = list('AIGJCDHEBF')

C: dict = {
    'A': {'A':0.00,'B':3.70,'C':6.00,'D':6.00,'E':7.02,'F':9.80,'G':9.68,'H':5.94,'I':5.91,'J':3.66},
    'B': {'A':3.70,'B':0.00,'C':3.76,'D':2.30,'E':3.66,'F':6.10,'G':7.00,'H':3.67,'I':5.88,'J':2.21},
    'C': {'A':6.00,'B':3.76,'C':0.00,'D':3.79,'E':6.01,'F':6.16,'G':9.71,'H':7.10,'I':9.65,'J':5.98},
    'D': {'A':6.00,'B':2.30,'C':3.79,'D':0.00,'E':2.21,'F':3.80,'G':5.91,'H':3.70,'I':6.94,'J':3.66},
    'E': {'A':7.02,'B':3.66,'C':6.01,'D':2.21,'E':0.00,'F':3.74,'G':3.70,'H':2.36,'I':5.94,'J':3.70},
    'F': {'A':9.80,'B':6.10,'C':6.16,'D':3.80,'E':3.74,'F':0.00,'G':5.91,'H':6.10,'I':9.68,'J':7.12},
    'G': {'A':9.68,'B':7.00,'C':9.71,'D':5.91,'E':3.70,'F':5.91,'G':0.00,'H':3.74,'I':6.00,'J':6.02},
    'H': {'A':5.94,'B':3.67,'C':7.10,'D':3.70,'E':2.36,'F':6.10,'G':3.74,'H':0.00,'I':3.58,'J':2.28},
    'I': {'A':5.91,'B':5.88,'C':9.65,'D':6.94,'E':5.94,'F':9.68,'G':6.00,'H':3.58,'I':0.00,'J':3.67},
    'J': {'A':3.66,'B':2.21,'C':5.98,'D':3.66,'E':3.70,'F':7.12,'G':6.02,'H':2.28,'I':3.67,'J':0.00},
}


def _r4(x: float) -> float:
    return round(x, 4)


def _tc(tour: list) -> float:
    n = len(tour)
    return _r4(sum(C[tour[i]][tour[(i + 1) % n]] for i in range(n)))


def _two_opt(tour: list, i: int, j: int) -> list:
    return tour[:i] + tour[i:j + 1][::-1] + tour[j + 1:]


def _all_neighbors(tour: list) -> list:
    n = len(tour)
    nb = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            nt = _two_opt(tour, i, j)
            nb.append({'i': i, 'j': j, 'tour': nt, 'cost': _tc(nt),
                       'cities': (tour[i], tour[j])})
    return nb


def _rng(seed: int):
    s = seed & 0xFFFFFFFF
    def _next() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (s | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return _next


def run(alpha: float = 0.9,
        L: int = 1,
        T0: float = 10.0,
        V: int = 2,
        max_iter: int = 50,
        seed: int = 42) -> dict:

    rng = _rng(seed)
    S = INIT_TOUR[:]
    best_S = S[:]
    best_cost = _tc(S)
    T = T0
    steps: list[dict] = []

    for iteration in range(1, max_iter + 1):
        nsucess = 0
        i_count = 0
        nb = _all_neighbors(S)
        it_steps: list[dict] = []
        cost_before = _tc(S)

        while nsucess < L and i_count < V and i_count < len(nb):
            m = nb[i_count]
            i_count += 1
            delta_E = _r4(m['cost'] - cost_before)

            if delta_E <= 0:
                P = 1.0
                r = 0.0
                accept = True
            else:
                P = _r4(math.exp(-delta_E / T))
                r = _r4(rng())
                accept = P > r

            it_steps.append({
                'try_n':   i_count,
                'move_i':  m['i'],
                'move_j':  m['j'],
                'cities':  m['cities'],
                'tour':    m['tour'][:],
                'cost':    m['cost'],
                'delta_E': delta_E,
                'P':       P,
                'r':       r,
                'accept':  accept,
            })

            if accept:
                nsucess += 1
                S = m['tour'][:]
                if _tc(S) < best_cost:
                    best_S = S[:]
                    best_cost = _tc(S)

        steps.append({
            'iter':       iteration,
            'T':          T,
            'S_before':   S[:] if not it_steps else INIT_TOUR[:],  # handled below
            'cost_before': cost_before,
            'tries':      it_steps,
            'nsucess':    nsucess,
            'S_after':    S[:],
            'cost_after': _tc(S),
            'best_cost':  best_cost,
            'best_tour':  best_S[:],
        })
        # Fix S_before
        steps[-1]['S_before'] = [t['tour'][:] for t in it_steps[:1]] and \
            (nb[0]['tour'][:] if it_steps else S[:])

        T = _r4(alpha * T)

        if nsucess == 0:
            break

    # Fix S_before properly
    s_track = INIT_TOUR[:]
    for step in steps:
        step['S_before'] = s_track[:]
        for t in step['tries']:
            if t['accept']:
                s_track = t['tour'][:]

    x_curve = [_r4(-5 + i * 17 / 200) for i in range(201)]
    matrix_list = [[C[a][b] for b in NAMES] for a in NAMES]

    return {
        'algorithm': 'simulated_annealing',
        'config': {
            'alpha':    alpha,
            'L':        L,
            'T0':       T0,
            'V':        V,
            'max_iter': max_iter,
            'n_cities': len(NAMES),
        },
        'cities':    CITIES,
        'names':     NAMES,
        'init_tour': INIT_TOUR[:],
        'init_cost': _tc(INIT_TOUR),
        'matrix':    matrix_list,
        'steps':     steps,
        'best_tour': best_S,
        'best_cost': best_cost,
    }


if __name__ == '__main__':
    r = run()
    print(f"SA  α={r['config']['alpha']}  L={r['config']['L']}"
          f"  T0={r['config']['T0']}  V={r['config']['V']}")
    print(f"Initial: {' → '.join(r['init_tour'])}  cost={r['init_cost']}")
    for s in r['steps']:
        for t in s['tries']:
            acc = 'ACCEPT' if t['accept'] else 'REJECT'
            asp = '' if t['delta_E'] <= 0 else f"  P={t['P']:.4f} > r={t['r']:.4f}"
            print(f"  I{s['iter']:2d} T={s['T']:.4f} swap({t['move_i']},{t['move_j']})"
                  f" {t['cities'][0]}-{t['cities'][1]}"
                  f"  ΔE={t['delta_E']:+.4f}{asp}  {acc}")
        print(f"       → {' → '.join(s['S_after'])}  cost={s['cost_after']:.4f}"
              f"  best={s['best_cost']:.4f}")
    print(f"\nBest: {' → '.join(r['best_tour'])} → {r['best_tour'][0]}"
          f"  cost={r['best_cost']:.4f}")
