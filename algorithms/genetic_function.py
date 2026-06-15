from __future__ import annotations
import math

# f(x) = (x-4)^2 - (x-8)^3 + 5, x inteiro em [0,15], codificacao binaria de 4 bits
N_BITS   = 4
X_MIN    = 0
X_MAX    = 15
INIT_POP = ['1001', '1000', '0010', '0001']

# probabilidade de cruzamento e numero de geracoes
P_CROSS  = 1.0
N_GEN    = 5


def _r2(x: float) -> float:
    return math.floor(x * 100 + 0.5) / 100


def _r4(x: float) -> float:
    return math.floor(x * 1e4 + 0.5) / 1e4


def _decode(chrom: str) -> int:
    return int(chrom, 2)


def _f(x: int) -> float:
    return _r2((x - 4) ** 2 - (x - 8) ** 3 + 5)


class _LCG:
    def __init__(self, seed: int):
        self.state = seed & 0x7FFFFFFF

    def next(self) -> float:
        self.state = (self.state * 16807) % 2147483647
        return self.state / 2147483647.0


def _eval_pop(pop: list[str]) -> list[dict]:
    rows = []
    for ch in pop:
        x = _decode(ch)
        rows.append({'chrom': ch, 'x': x, 'f': _f(x)})
    return rows


def _fitness(rows: list[dict]) -> None:
    # minimizacao via roleta: fitness = (f_pior - f) + 1 para manter positivo
    fmax = max(r['f'] for r in rows)
    for r in rows:
        r['fit'] = _r4(fmax - r['f'] + 1.0)
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


def _crossover(p1: str, p2: str, point: int) -> tuple[str, str]:
    c1 = p1[:point] + p2[point:]
    c2 = p2[:point] + p1[point:]
    return c1, c2


def _mutate(ch: str, bit: int) -> str:
    lst = list(ch)
    lst[bit] = '0' if lst[bit] == '1' else '1'
    return ''.join(lst)


def run(seed: int = 13, n_gen: int = N_GEN, p_mut: float = 0.1) -> dict:
    rng_sel = _LCG(seed)
    rng_cx  = _LCG(seed * 7 + 3)
    rng_mut = _LCG(seed * 13 + 5)

    pop = INIT_POP[:]
    best = None
    generations = []

    for g in range(1, n_gen + 1):
        rows = _eval_pop(pop)
        _fitness(rows)

        gen_best = min(rows, key=lambda r: r['f'])
        if best is None or gen_best['f'] < best['f']:
            best = {'chrom': gen_best['chrom'], 'x': gen_best['x'], 'f': gen_best['f'], 'gen': g}

        # selecao por roleta: forma pares de pais
        pairs = []
        children = []
        cross_ops = []
        mut_ops = []
        n_pairs = len(pop) // 2
        for _ in range(n_pairs):
            i1 = _roulette(rows, rng_sel)
            i2 = _roulette(rows, rng_sel)
            p1, p2 = pop[i1], pop[i2]
            pairs.append({'p1': p1, 'i1': i1, 'p2': p2, 'i2': i2})
            if rng_cx.next() <= P_CROSS:
                point = 1 + int(rng_cx.next() * (N_BITS - 1))  # ponto em 1..3
                c1, c2 = _crossover(p1, p2, point)
                cross_ops.append({'p1': p1, 'p2': p2, 'point': point, 'c1': c1, 'c2': c2})
            else:
                c1, c2 = p1, p2
                cross_ops.append({'p1': p1, 'p2': p2, 'point': None, 'c1': c1, 'c2': c2})
            children.extend([c1, c2])

        # mutacao bit a bit
        mutated = []
        for ch in children:
            cur = ch
            for b in range(N_BITS):
                if rng_mut.next() <= p_mut:
                    new = _mutate(cur, b)
                    mut_ops.append({'before': cur, 'bit': b, 'after': new})
                    cur = new
            mutated.append(cur)

        # elitismo: o melhor da geracao atual entra na nova populacao
        new_pop = mutated[:]
        elite = gen_best['chrom']
        new_mut_rows = _eval_pop(new_pop)
        worst_idx = max(range(len(new_mut_rows)), key=lambda i: new_mut_rows[i]['f'])
        replaced = new_pop[worst_idx]
        new_pop[worst_idx] = elite

        generations.append({
            'gen':        g,
            'pop':        pop[:],
            'rows':       rows,
            'gen_best':   {'chrom': gen_best['chrom'], 'x': gen_best['x'], 'f': gen_best['f']},
            'pairs':      pairs,
            'cross':      cross_ops,
            'children':   children[:],
            'mutations':  mut_ops,
            'mutated':    mutated[:],
            'elite':      elite,
            'replaced':   replaced,
            'new_pop':    new_pop[:],
            'best_so_far': dict(best),
        })

        pop = new_pop

    # avaliacao final
    final_rows = _eval_pop(pop)

    return {
        'algorithm': 'genetic_function',
        'config': {
            'expr':   'f(x) = (x-4)^2 - (x-8)^3 + 5',
            'domain': [X_MIN, X_MAX],
            'n_bits': N_BITS,
            'n_gen':  n_gen,
            'p_mut':  p_mut,
            'p_cross': P_CROSS,
            'seed':   seed,
            'objective': 'minimizar',
        },
        'init_pop':    INIT_POP[:],
        'generations': generations,
        'final_pop':   final_rows,
        'best':        best,
    }


if __name__ == '__main__':
    r = run()
    print('f(x) = (x-4)^2 - (x-8)^3 + 5  em [0,15]  (minimizar)')
    print('populacao inicial:', r['init_pop'])
    for g in r['generations']:
        print('\n-- Geracao', g['gen'], '--')
        for row in g['rows']:
            print('  %s  x=%2d  f=%8.2f  fit=%7.2f  p=%.3f' %
                  (row['chrom'], row['x'], row['f'], row['fit'], row['prob']))
        print('  melhor da geracao:', g['gen_best']['chrom'],
              'x=%d f=%.2f' % (g['gen_best']['x'], g['gen_best']['f']))
        print('  nova populacao:', g['new_pop'])
    b = r['best']
    print('\nMelhor solucao: x =', b['x'], '(', b['chrom'], ')  f(x) =', b['f'], ' geracao', b['gen'])
    # conferencia: minimo real por busca exaustiva
    best_x = min(range(16), key=lambda x: _f(x))
    print('Minimo real em [0,15]: x =', best_x, ' f =', _f(best_x))
