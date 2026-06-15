from __future__ import annotations
import math

# Coordenadas das 6 cidades (A-F)
CITIES = {
    'A': (1.0, 1.0),
    'B': (2.0, 8.0),
    'C': (7.0, 7.0),
    'D': (8.0, 0.0),
    'E': (9.0, 8.0),
    'F': (4.0, 9.0),
}
NAMES = list('ABCDEF')


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


# Gerador de numeros pseudoaleatorios (LCG MINSTD) para a tabela inicial
class _LCG:
    def __init__(self, seed: int):
        self.state = seed & 0x7FFFFFFF

    def next(self) -> float:
        self.state = (self.state * 16807) % 2147483647
        return self.state / 2147483647.0


def _init_pheromones(seed: int, lo: float = 0.1, hi: float = 1.0) -> dict:
    rng = _LCG(seed)
    tau = {a: {b: 0.0 for b in NAMES} for a in NAMES}
    n = len(NAMES)
    for i in range(n):
        for j in range(i + 1, n):
            val = _r4(lo + (hi - lo) * rng.next())
            tau[NAMES[i]][NAMES[j]] = val
            tau[NAMES[j]][NAMES[i]] = val
    return tau


def _tour_length(tour: list, C: dict) -> float:
    n = len(tour)
    return _r2(sum(C[tour[i]][tour[(i + 1) % n]] for i in range(n)))


def _ant_choices(rng: _LCG):
    def choose(probs: list[float]) -> int:
        r = rng.next()
        acc = 0.0
        for idx, p in enumerate(probs):
            acc += p
            if r <= acc:
                return idx
        return len(probs) - 1
    return choose


def run(seed: int = 7,
        n_ants: int = 6,
        n_iters: int = 2,
        alpha: float = 0.4,
        beta: float = 0.6,
        rho: float = 0.5,
        Q: float = 100.0,
        start_seed: int = 101) -> dict:

    C       = _build_matrix()
    tau     = _init_pheromones(seed)
    init_tau = {a: dict(tau[a]) for a in NAMES}

    eta = {a: {b: (0.0 if a == b else _r4(1.0 / C[a][b])) for b in NAMES}
           for a in NAMES}

    best_tour: list | None = None
    best_len               = float('inf')
    iterations: list[dict] = []

    choice_rng = _LCG(start_seed)
    choose     = _ant_choices(choice_rng)
    start_rng  = _LCG(start_seed * 31 + 7)

    for it in range(1, n_iters + 1):
        tau_before = {a: dict(tau[a]) for a in NAMES}
        ants: list[dict] = []
        deposits: dict = {a: {b: 0.0 for b in NAMES} for a in NAMES}

        for k in range(n_ants):
            start_idx = int(start_rng.next() * len(NAMES)) % len(NAMES)
            current   = NAMES[start_idx]
            visited   = [current]
            ant_steps: list[dict] = []

            while len(visited) < len(NAMES):
                allowed = [c for c in NAMES if c not in visited]

                # numerador: tau^alpha * eta^beta
                terms = []
                for nxt in allowed:
                    t = tau[current][nxt] ** alpha
                    h = eta[current][nxt] ** beta
                    terms.append(_r4(t * h))
                total = sum(terms)
                probs = [_r4(t / total) if total > 0 else _r4(1.0 / len(allowed))
                         for t in terms]

                pick = choose(probs)
                chosen = allowed[pick]

                ant_steps.append({
                    'current':  current,
                    'allowed':  allowed[:],
                    'tau':      [tau[current][c] for c in allowed],
                    'eta':      [eta[current][c] for c in allowed],
                    'num':      terms,
                    'total':    _r4(total),
                    'probs':    probs,
                    'chosen':   chosen,
                })

                visited.append(chosen)
                current = chosen

            L = _tour_length(visited, C)

            # deposito dtau = Q / L em cada aresta da rota
            dep = _r4(Q / L) if L > 0 else 0.0
            edges = []
            for i in range(len(visited)):
                a = visited[i]
                b = visited[(i + 1) % len(visited)]
                deposits[a][b] += dep
                deposits[b][a] += dep
                edges.append((a, b))

            if L < best_len:
                best_len  = L
                best_tour = visited[:]

            ants.append({
                'k':        k + 1,
                'start':    visited[0],
                'steps':    ant_steps,
                'tour':     visited[:],
                'length':   L,
                'deposit':  dep,
                'edges':    edges,
            })

        # atualizacao global: tau = (1-rho)*tau + soma dos depositos
        update_rows = []
        for i in range(len(NAMES)):
            for j in range(i + 1, len(NAMES)):
                a, b = NAMES[i], NAMES[j]
                old  = tau[a][b]
                evap = _r4((1 - rho) * old)
                add  = _r4(deposits[a][b])
                new  = _r4(evap + add)
                tau[a][b] = new
                tau[b][a] = new
                update_rows.append({
                    'edge':  a + b,
                    'old':   old,
                    'evap':  evap,
                    'add':   add,
                    'new':   new,
                })

        tau_after = {a: dict(tau[a]) for a in NAMES}

        iterations.append({
            'iter':         it,
            'tau_before':   _mat_list(tau_before),
            'ants':         ants,
            'deposits':     _mat_list(deposits),
            'updates':      update_rows,
            'tau_after':    _mat_list(tau_after),
            'best_tour':    best_tour[:],
            'best_len':     _r2(best_len),
        })

    matrix_list = [[C[a][b] for b in NAMES] for a in NAMES]
    eta_list    = [[eta[a][b] for b in NAMES] for a in NAMES]

    return {
        'algorithm': 'aco',
        'config': {
            'n_cities': len(NAMES),
            'n_ants':   n_ants,
            'n_iters':  n_iters,
            'alpha':    alpha,
            'beta':     beta,
            'rho':      rho,
            'Q':        Q,
            'seed':     seed,
        },
        'cities':       {k: list(v) for k, v in CITIES.items()},
        'names':        NAMES,
        'matrix':       matrix_list,
        'eta':          eta_list,
        'init_tau':     _mat_list(init_tau),
        'iterations':   iterations,
        'best_tour':    best_tour,
        'best_len':     _r2(best_len),
    }


def _mat_list(tau: dict) -> list:
    return [[_r4(tau[a][b]) for b in NAMES] for a in NAMES]


if __name__ == '__main__':
    r = run()
    print(f"ACO TSP · {r['config']['n_ants']} formigas · "
          f"α={r['config']['alpha']} β={r['config']['beta']} "
          f"ρ={r['config']['rho']} Q={r['config']['Q']} · "
          f"{r['config']['n_iters']} iterações · seed={r['config']['seed']}")
    for it in r['iterations']:
        print(f"\n── Iteração {it['iter']} ──")
        for ant in it['ants']:
            print(f"  Formiga {ant['k']} (início {ant['start']}): "
                  f"{' → '.join(ant['tour'])} → {ant['tour'][0]}"
                  f"  L={ant['length']:.2f}  Δτ={ant['deposit']:.4f}")
        print(f"  Melhor até agora: {' → '.join(it['best_tour'])}"
              f"  L={it['best_len']:.2f}")
    print(f"\nMelhor rota: {' → '.join(r['best_tour'])} → {r['best_tour'][0]}")
    print(f"Comprimento: {r['best_len']:.2f}")
