// AG - TSP com permutacao e Order Crossover (Atividade 13.2)

var GT_CITIES = {
  A: [1.4, 6.2], B: [5.1, 6.2], C: [6.2, 9.8], D: [7.4, 6.1], E: [8.1, 4.1],
  F: [11.2, 6.2], G: [9.3, 0.6], H: [6.2, 2.7], I: [3.3, 0.6], J: [4.4, 4.1],
};
var GT_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
var GT_INIT_POP = [
  'ABJDHECFGI'.split(''),
  'AIHJGFCDEB'.split(''),
  'HAEBJDCFIG'.split(''),
  'AICGFBHDJE'.split(''),
];

function gt_r2(n) { return Math.floor(n * 100 + 0.5) / 100; }
function gt_r4(n) { return Math.floor(n * 1e4 + 0.5) / 1e4; }

function gt_dist(a, b) {
  var p = GT_CITIES[a], q = GT_CITIES[b];
  return gt_r2(Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1])));
}
function gt_buildMatrix() {
  var C = {};
  GT_NAMES.forEach(function (a) { C[a] = {}; GT_NAMES.forEach(function (b) { C[a][b] = gt_dist(a, b); }); });
  return C;
}
function gt_tourCost(tour, C) {
  var n = tour.length, s = 0;
  for (var i = 0; i < n; i++) s += C[tour[i]][tour[(i + 1) % n]];
  return gt_r2(s);
}

function GT_LCG(seed) { this.state = (seed & 0x7FFFFFFF) || 1; }
GT_LCG.prototype.next = function () {
  this.state = (this.state * 16807) % 2147483647;
  return this.state / 2147483647;
};

function gt_evalPop(pop, C) {
  return pop.map(function (t) { return { tour: t.slice(), cost: gt_tourCost(t, C) }; });
}
function gt_fitness(rows) {
  var cmax = Math.max.apply(null, rows.map(function (r) { return r.cost; }));
  rows.forEach(function (r) { r.fit = gt_r4(cmax - r.cost + 1.0); });
  var total = rows.reduce(function (a, r) { return a + r.fit; }, 0);
  var acc = 0;
  rows.forEach(function (r) {
    r.prob = total > 0 ? gt_r4(r.fit / total) : gt_r4(1.0 / rows.length);
    acc += r.prob; r.cum = gt_r4(acc);
  });
}
function gt_roulette(rows, rng) {
  var r = rng.next();
  for (var i = 0; i < rows.length; i++) if (r <= rows[i].cum) return i;
  return rows.length - 1;
}

function gt_ox(p1, p2, c1, c2) {
  var n = p1.length, child = new Array(n).fill(null);
  for (var i = c1; i <= c2; i++) child[i] = p1[i];
  var seg = {}; for (var i = c1; i <= c2; i++) seg[p1[i]] = true;
  var fill = p2.filter(function (g) { return !seg[g]; });
  var idx = 0;
  for (var i = 0; i < n; i++) if (child[i] === null) { child[i] = fill[idx++]; }
  return child;
}
function gt_swap(tour, i, j) {
  var t = tour.slice(); var tmp = t[i]; t[i] = t[j]; t[j] = tmp; return t;
}

function gt_run(seed, n_gen, p_mut) {
  seed = seed === undefined ? 21 : seed;
  n_gen = n_gen === undefined ? 5 : n_gen;
  p_mut = p_mut === undefined ? 0.2 : p_mut;

  var C = gt_buildMatrix();
  var rngSel = new GT_LCG(seed);
  var rngCx = new GT_LCG(seed * 7 + 3);
  var rngMut = new GT_LCG(seed * 13 + 5);

  var pop = GT_INIT_POP.map(function (t) { return t.slice(); });
  var best = null;
  var generations = [];

  for (var g = 1; g <= n_gen; g++) {
    var rows = gt_evalPop(pop, C);
    gt_fitness(rows);

    var genBest = rows.reduce(function (a, b) { return b.cost < a.cost ? b : a; });
    if (best === null || genBest.cost < best.cost)
      best = { tour: genBest.tour.slice(), cost: genBest.cost, gen: g };

    var pairs = [], crossOps = [], children = [];
    var nPairs = Math.floor(pop.length / 2);
    for (var k = 0; k < nPairs; k++) {
      var i1 = gt_roulette(rows, rngSel);
      var i2 = gt_roulette(rows, rngSel);
      var p1 = pop[i1], p2 = pop[i2];
      pairs.push({ i1: i1, i2: i2, p1: p1.slice(), p2: p2.slice() });
      var n = p1.length;
      var a = Math.floor(rngCx.next() * n);
      var b = Math.floor(rngCx.next() * n);
      var lo = Math.min(a, b), hi = Math.max(a, b);
      var ch1 = gt_ox(p1, p2, lo, hi);
      var ch2 = gt_ox(p2, p1, lo, hi);
      crossOps.push({ p1: p1.slice(), p2: p2.slice(), lo: lo, hi: hi, c1: ch1.slice(), c2: ch2.slice() });
      children.push(ch1, ch2);
    }

    var mutOps = [], mutated = [];
    children.forEach(function (ch) {
      var cur = ch.slice();
      if (rngMut.next() <= p_mut) {
        var n = cur.length;
        var i = Math.floor(rngMut.next() * n);
        var j = Math.floor(rngMut.next() * n);
        if (i !== j) {
          var nw = gt_swap(cur, i, j);
          mutOps.push({ before: cur.slice(), i: i, j: j, after: nw.slice() });
          cur = nw;
        }
      }
      mutated.push(cur);
    });

    var newPop = mutated.map(function (t) { return t.slice(); });
    var newRows = gt_evalPop(newPop, C);
    var worstIdx = 0;
    for (var i = 1; i < newRows.length; i++) if (newRows[i].cost > newRows[worstIdx].cost) worstIdx = i;
    var replaced = newPop[worstIdx].slice();
    newPop[worstIdx] = genBest.tour.slice();

    generations.push({
      gen: g, pop: pop.map(function (t) { return t.slice(); }), rows: rows,
      gen_best: { tour: genBest.tour.slice(), cost: genBest.cost },
      pairs: pairs, cross: crossOps, children: children.map(function (c) { return c.slice(); }),
      mutations: mutOps, mutated: mutated.map(function (m) { return m.slice(); }),
      elite: genBest.tour.slice(), replaced: replaced,
      new_pop: newPop.map(function (t) { return t.slice(); }),
      best_so_far: { tour: best.tour.slice(), cost: best.cost, gen: best.gen },
    });
    pop = newPop;
  }

  var matrixList = GT_NAMES.map(function (a) { return GT_NAMES.map(function (b) { return C[a][b]; }); });
  return {
    config: {
      n_cities: GT_NAMES.length, n_gen: n_gen, p_mut: p_mut, seed: seed,
      objective: 'minimizar distancia', crossover: 'Order Crossover (OX)',
    },
    cities: GT_CITIES, names: GT_NAMES, matrix: matrixList,
    init_pop: GT_INIT_POP.map(function (t) { return t.slice(); }),
    generations: generations, final_pop: gt_evalPop(pop, C), best: best,
  };
}
