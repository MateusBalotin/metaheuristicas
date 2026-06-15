// AG - minimizacao de funcao com codificacao binaria (Atividade 13.1)

var GF_NBITS = 4;
var GF_INIT_POP = ['1001', '1000', '0010', '0001'];
var GF_PCROSS = 1.0;

function gf_r2(n) { return Math.floor(n * 100 + 0.5) / 100; }
function gf_r4(n) { return Math.floor(n * 1e4 + 0.5) / 1e4; }

function gf_decode(ch) { return parseInt(ch, 2); }
function gf_f(x) { return gf_r2(Math.pow(x - 4, 2) - Math.pow(x - 8, 3) + 5); }

function GF_LCG(seed) { this.state = (seed & 0x7FFFFFFF) || 1; }
GF_LCG.prototype.next = function () {
  this.state = (this.state * 16807) % 2147483647;
  return this.state / 2147483647;
};

function gf_evalPop(pop) {
  return pop.map(function (ch) {
    var x = gf_decode(ch);
    return { chrom: ch, x: x, f: gf_f(x) };
  });
}

function gf_fitness(rows) {
  var fmax = Math.max.apply(null, rows.map(function (r) { return r.f; }));
  rows.forEach(function (r) { r.fit = gf_r4(fmax - r.f + 1.0); });
  var total = rows.reduce(function (a, r) { return a + r.fit; }, 0);
  var acc = 0;
  rows.forEach(function (r) {
    r.prob = total > 0 ? gf_r4(r.fit / total) : gf_r4(1.0 / rows.length);
    acc += r.prob; r.cum = gf_r4(acc);
  });
}

function gf_roulette(rows, rng) {
  var r = rng.next();
  for (var i = 0; i < rows.length; i++) if (r <= rows[i].cum) return i;
  return rows.length - 1;
}

function gf_crossover(p1, p2, point) {
  return [p1.slice(0, point) + p2.slice(point), p2.slice(0, point) + p1.slice(point)];
}

function gf_mutate(ch, bit) {
  var a = ch.split('');
  a[bit] = a[bit] === '1' ? '0' : '1';
  return a.join('');
}

function gf_run(seed, n_gen, p_mut) {
  seed = seed === undefined ? 13 : seed;
  n_gen = n_gen === undefined ? 5 : n_gen;
  p_mut = p_mut === undefined ? 0.1 : p_mut;

  var rngSel = new GF_LCG(seed);
  var rngCx = new GF_LCG(seed * 7 + 3);
  var rngMut = new GF_LCG(seed * 13 + 5);

  var pop = GF_INIT_POP.slice();
  var best = null;
  var generations = [];

  for (var g = 1; g <= n_gen; g++) {
    var rows = gf_evalPop(pop);
    gf_fitness(rows);

    var genBest = rows.reduce(function (a, b) { return b.f < a.f ? b : a; });
    if (best === null || genBest.f < best.f)
      best = { chrom: genBest.chrom, x: genBest.x, f: genBest.f, gen: g };

    var pairs = [], children = [], crossOps = [], mutOps = [];
    var nPairs = Math.floor(pop.length / 2);
    for (var k = 0; k < nPairs; k++) {
      var i1 = gf_roulette(rows, rngSel);
      var i2 = gf_roulette(rows, rngSel);
      var p1 = pop[i1], p2 = pop[i2];
      pairs.push({ p1: p1, i1: i1, p2: p2, i2: i2 });
      var c1, c2, point = null;
      if (rngCx.next() <= GF_PCROSS) {
        point = 1 + Math.floor(rngCx.next() * (GF_NBITS - 1));
        var cc = gf_crossover(p1, p2, point); c1 = cc[0]; c2 = cc[1];
      } else { c1 = p1; c2 = p2; }
      crossOps.push({ p1: p1, p2: p2, point: point, c1: c1, c2: c2 });
      children.push(c1, c2);
    }

    var mutated = [];
    children.forEach(function (ch) {
      var cur = ch;
      for (var b = 0; b < GF_NBITS; b++) {
        if (rngMut.next() <= p_mut) {
          var nw = gf_mutate(cur, b);
          mutOps.push({ before: cur, bit: b, after: nw });
          cur = nw;
        }
      }
      mutated.push(cur);
    });

    var newPop = mutated.slice();
    var elite = genBest.chrom;
    var newRows = gf_evalPop(newPop);
    var worstIdx = 0;
    for (var i = 1; i < newRows.length; i++) if (newRows[i].f > newRows[worstIdx].f) worstIdx = i;
    var replaced = newPop[worstIdx];
    newPop[worstIdx] = elite;

    generations.push({
      gen: g, pop: pop.slice(), rows: rows,
      gen_best: { chrom: genBest.chrom, x: genBest.x, f: genBest.f },
      pairs: pairs, cross: crossOps, children: children.slice(),
      mutations: mutOps, mutated: mutated.slice(),
      elite: elite, replaced: replaced, new_pop: newPop.slice(),
      best_so_far: { chrom: best.chrom, x: best.x, f: best.f, gen: best.gen },
    });
    pop = newPop;
  }

  return {
    config: {
      expr: 'f(x) = (x-4)^2 - (x-8)^3 + 5', domain: [0, 15],
      n_bits: GF_NBITS, n_gen: n_gen, p_mut: p_mut, p_cross: GF_PCROSS,
      seed: seed, objective: 'minimizar',
    },
    init_pop: GF_INIT_POP.slice(),
    generations: generations,
    final_pop: gf_evalPop(pop),
    best: best,
  };
}
