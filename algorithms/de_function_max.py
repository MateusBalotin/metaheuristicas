from __future__ import annotations
import math

# f(x,y) = sen(x/3) + cos(6y/5) + e^(y/5) + 2, maximizar em [-10,10]
BOUNDS = (-10.0, 10.0)
INIT_POP = [
    (-7.0, -5.0),
    (5.0, -8.0),
    (-5.0, -3.0),
    (7.5, 2.5),
    (8.0, -5.0),
    (-5.0, 2.0),
]
F_SCALE = 0.5
P_CR = 0.7
N_ITER = 4


def _r4(x: float) -> float:
    return math.floor(x * 1e4 + 0.5) / 1e4


def _f(x: float, y: float) -> float:
    return _r4(math.sin(x / 3.0) + math.cos(6.0 * y / 5.0) + math.exp(y / 5.0) + 2.0)


# gerador de numeros pseudoaleatorios (LCG MINSTD)
class _LCG:
    def __init__(self, seed: int):
        self.state = seed & 0x7FFFFFFF

    def next(self) -> float:
        self.state = (self.state * 16807) % 2147483647
        return self.state / 2147483647.0


def _clamp(v: float) -> float:
    lo, hi = BOUNDS
    return _r4(max(lo, min(hi, v)))


def run(seed: int = 14, n_iter: int = N_ITER, f_scale: float = F_SCALE, p_cr: float = P_CR) -> dict:
    rng_idx = _LCG(seed)
    rng_cr  = _LCG(seed * 13 + 5)

    pop = [list(p) for p in INIT_POP]
    n = len(pop)
    fvals = [_f(p[0], p[1]) for p in pop]

    # melhor inicial (maximizacao)
    best_idx = max(range(n), key=lambda i: fvals[i])
    best = {'vec': pop[best_idx][:], 'f': fvals[best_idx]}

    iterations = []

    for it in range(1, n_iter + 1):
        # vetor alvo = melhor da populacao atual (xbest)
        k = max(range(n), key=lambda i: fvals[i])
        xbest = pop[k][:]

        trials = []
        for i in range(n):
            idxs = [j for j in range(n) if j != i]
            r1 = idxs[int(rng_idx.next() * len(idxs))]
            idxs2 = [j for j in idxs if j != r1]
            r2 = idxs2[int(rng_idx.next() * len(idxs2))]

            # mutacao DE/best/1: u = xbest + F*(x_r1 - x_r2)
            u = [_clamp(xbest[d] + f_scale * (pop[r1][d] - pop[r2][d])) for d in range(2)]

            # crossover binomial
            child = [0.0, 0.0]
            cr_flags = []
            for d in range(2):
                s = rng_cr.next()
                take_u = s <= p_cr
                child[d] = u[d] if take_u else pop[i][d]
                cr_flags.append('u' if take_u else 'x')

            f_child = _f(child[0], child[1])
            f_cur = fvals[i]
            accept = f_child > f_cur  # maximizacao

            trials.append({
                'i': i, 'r1': r1, 'r2': r2, 'F': f_scale,
                'xi': pop[i][:], 'f_xi': f_cur,
                'xbest': xbest[:], 'xr1': pop[r1][:], 'xr2': pop[r2][:],
                'u': u[:], 'cr_flags': cr_flags[:],
                'child': child[:], 'f_child': f_child,
                'accept': accept,
            })

        new_pop = [pop[i][:] for i in range(n)]
        new_fvals = fvals[:]
        for t in trials:
            if t['accept']:
                new_pop[t['i']] = t['child'][:]
                new_fvals[t['i']] = t['f_child']

        gi = max(range(n), key=lambda i: new_fvals[i])
        if new_fvals[gi] > best['f']:
            best = {'vec': new_pop[gi][:], 'f': new_fvals[gi]}

        iterations.append({
            'iter':       it,
            'pop':        [p[:] for p in pop],
            'fvals':      fvals[:],
            'xbest':      xbest[:],
            'xbest_f':    fvals[k],
            'trials':     trials,
            'new_pop':    [p[:] for p in new_pop],
            'new_fvals':  new_fvals[:],
            'best_so_far': {'vec': best['vec'][:], 'f': best['f']},
        })

        pop = new_pop
        fvals = new_fvals

    return {
        'algorithm': 'de_function_max',
        'config': {
            'expr':      'f(x,y) = sen(x/3) + cos(6y/5) + e^(y/5) + 2',
            'objective': 'maximizar',
            'bounds':    list(BOUNDS),
            'n_iter':    n_iter,
            'p_cr':      p_cr,
            'F':         f_scale,
            'target':    'melhor (xbest) - DE/best/1',
            'seed':      seed,
        },
        'init_pop':    [list(p) for p in INIT_POP],
        'iterations':  iterations,
        'best':        best,
    }


if __name__ == '__main__':
    r = run()
    print('ED 14.2 - maximizar', r['config']['expr'], 'em [-10,10]')
    print('estrategia: DE/best/1, F =', r['config']['F'], ', P_CR =', r['config']['p_cr'])
    print('populacao inicial:')
    for p in r['init_pop']:
        print('  (%.1f, %.1f)  f=%.4f' % (p[0], p[1], _f(p[0], p[1])))
    for it in r['iterations']:
        print('\n-- Iteracao', it['iter'], '-- xbest=(%.2f,%.2f) f=%.4f' %
              (it['xbest'][0], it['xbest'][1], it['xbest_f']))
        for t in it['trials']:
            mark = 'ACEITA' if t['accept'] else 'rejeita'
            print('  i=%d u=(%.2f,%.2f) filho=(%.2f,%.2f) f=%.4f vs %.4f -> %s' %
                  (t['i'], t['u'][0], t['u'][1], t['child'][0], t['child'][1],
                   t['f_child'], t['f_xi'], mark))
    b = r['best']
    print('\nMelhor: (%.4f, %.4f)  f=%.4f' % (b['vec'][0], b['vec'][1], b['f']))
