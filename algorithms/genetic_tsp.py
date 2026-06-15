from __future__ import annotations
import math

# As mesmas 10 cidades das Atividades 9 e 11
CITIES = {
    'A': (1.4, 6.2), 'B': (5.1, 6.2), 'C': (6.2, 9.8),
    'D': (7.4, 6.1), 'E': (8.1, 4.1), 'F': (11.2, 6.2),
    'G': (9.3, 0.6), 'H': (6.2, 2.7), 'I': (3.3, 0.6),
    'J': (4.4, 4.1),
}
NAMES = list('ABCDEFGHIJ')

# 4 individuos iniciais da apostila (i1 corrige o erro: 7a cidade era F, nao J)
INIT_POP = [
    list('ABJDHECFGI'),
    list('AIHJGFCDEB'),
    list('HAEBJDCFIG'),
    list('AICGFBHDJE'),
]
N_GEN = 5


def _r2(x: float) -> float:
    return math.floor(x * 100 + 0.5) / 100


def _r4(x: float) -> float:
    return math.floor(x * 1e4 + 0.5) / 1e4


def _dist(a: str, b: str) -> float:
    ax, ay = CITIES[a]
    bx, by = CITIES[b]
    return _r2(math.sqrt((ax - bx) ** 2 + (ay - by) ** 2))


def _build_matrix() -> dict:
    return {a: {b: _dist(a, b) for b in NAMES} for a in NAMES}


def _tour_cost(tour: list, C: dict) -> float:
    n = len(tour)
    return _r2(sum(C[tour[i]][tour[(i + 1) % n]] for i in range(n)))


class _LCG:
    def __init__(self, seed: int):
        self.state = seed & 0x7FFFFFFF

    def next(self) -> float:
        self.state = (self.state * 16807) % 2147483647
        return self.state / 2147483647.0


def _eval_pop(pop: list, C: dict) -> list[dict]:
    return [{'tour': t[:], 'cost': _tour_cost(t, C)} for t in pop]


def _fitness(rows: list[dict]) -> None:
    # minimizacao via roleta: fitness = (custo_pior - custo) + 1
    cmax = max(r['cost'] for r in rows)
    for r in rows:
        r['fit'] = _r4(cmax - r['cost'] + 1.0)
    total = sum(r['fit'] for r in rows)
    acc = 0.0
    for r in rows:
        r['prob'] = _r4(r['fit'] / total) if total > 0 else _r4(1.0 / len(rows))
        acc += r['prob']
        r['cum'] = _r4(acc)


def _roulette(rows: list[dict], rng: _LCG) -> int:
    r = rng.next()
    for i, row in enumerate(rows):
        if r <= row['cum']:
            return i
    return len(rows) - 1


def _ox(p1: list, p2: list, c1: int, c2: int) -> list:
    # Order Crossover: copia segmento [c1,c2] de p1, completa com a ordem de p2
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


def _swap_mut(tour: list, i: int, j: int) -> list:
    t = tour[:]
    t[i], t[j] = t[j], t[i]
    return t


def run(seed: int = 21, n_gen: int = N_GEN, p_mut: float = 0.2) -> dict:
    C = _build_matrix()
    rng_sel = _LCG(seed)
    rng_cx  = _LCG(seed * 7 + 3)
    rng_mut = _LCG(seed * 13 + 5)

    pop = [t[:] for t in INIT_POP]
    best = None
    generations = []

    for g in range(1, n_gen + 1):
        rows = _eval_pop(pop, C)
        _fitness(rows)

        gen_best = min(rows, key=lambda r: r['cost'])
        if best is None or gen_best['cost'] < best['cost']:
            best = {'tour': gen_best['tour'][:], 'cost': gen_best['cost'], 'gen': g}

        pairs = []
        cross_ops = []
        children = []
        n_pairs = len(pop) // 2
        for _ in range(n_pairs):
            i1 = _roulette(rows, rng_sel)
            i2 = _roulette(rows, rng_sel)
            p1, p2 = pop[i1], pop[i2]
            pairs.append({'i1': i1, 'i2': i2, 'p1': p1[:], 'p2': p2[:]})
            n = len(p1)
            a = int(rng_cx.next() * n)
            b = int(rng_cx.next() * n)
            lo, hi = min(a, b), max(a, b)
            ch1 = _ox(p1, p2, lo, hi)
            ch2 = _ox(p2, p1, lo, hi)
            cross_ops.append({'p1': p1[:], 'p2': p2[:], 'lo': lo, 'hi': hi,
                              'c1': ch1[:], 'c2': ch2[:]})
            children.extend([ch1, ch2])

        # mutacao por troca (swap)
        mut_ops = []
        mutated = []
        for ch in children:
            cur = ch[:]
            if rng_mut.next() <= p_mut:
                n = len(cur)
                i = int(rng_mut.next() * n)
                j = int(rng_mut.next() * n)
                if i != j:
                    new = _swap_mut(cur, i, j)
                    mut_ops.append({'before': cur[:], 'i': i, 'j': j, 'after': new[:]})
                    cur = new
            mutated.append(cur)

        # elitismo: o melhor da geracao substitui o pior filho
        new_pop = [t[:] for t in mutated]
        new_rows = _eval_pop(new_pop, C)
        worst_idx = max(range(len(new_rows)), key=lambda i: new_rows[i]['cost'])
        replaced = new_pop[worst_idx][:]
        new_pop[worst_idx] = gen_best['tour'][:]

        generations.append({
            'gen':         g,
            'pop':         [t[:] for t in pop],
            'rows':        rows,
            'gen_best':    {'tour': gen_best['tour'][:], 'cost': gen_best['cost']},
            'pairs':       pairs,
            'cross':       cross_ops,
            'children':    [c[:] for c in children],
            'mutations':   mut_ops,
            'mutated':     [m[:] for m in mutated],
            'elite':       gen_best['tour'][:],
            'replaced':    replaced,
            'new_pop':     [t[:] for t in new_pop],
            'best_so_far': dict(best),
        })

        pop = new_pop

    final_rows = _eval_pop(pop, C)
    matrix_list = [[C[a][b] for b in NAMES] for a in NAMES]

    return {
        'algorithm': 'genetic_tsp',
        'config': {
            'n_cities': len(NAMES),
            'n_gen':    n_gen,
            'p_mut':    p_mut,
            'seed':     seed,
            'objective': 'minimizar distancia',
            'crossover': 'Order Crossover (OX)',
        },
        'cities':      {k: list(v) for k, v in CITIES.items()},
        'names':       NAMES,
        'matrix':      matrix_list,
        'init_pop':    [t[:] for t in INIT_POP],
        'generations': generations,
        'final_pop':   final_rows,
        'best':        best,
    }


if __name__ == '__main__':
    r = run()
    print('TSP 10 cidades - AG com Order Crossover (minimizar distancia)')
    print('populacao inicial:')
    C = _build_matrix()
    for t in r['init_pop']:
        print('  ', ''.join(t), ' custo=%.2f' % _tour_cost(t, C))
    for g in r['generations']:
        print('\n-- Geracao', g['gen'], '--')
        for row in g['rows']:
            print('  %s  custo=%7.2f  fit=%7.2f  p=%.3f' %
                  (''.join(row['tour']), row['cost'], row['fit'], row['prob']))
        print('  melhor da geracao:', ''.join(g['gen_best']['tour']),
              'custo=%.2f' % g['gen_best']['cost'])
    b = r['best']
    print('\nMelhor rota:', ''.join(b['tour']), ' custo=%.2f' % b['cost'], ' geracao', b['gen'])
