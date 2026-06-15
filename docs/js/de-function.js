// ED 14.1 - minimizar f(x,y) = sen(x) + cos(y) + y/5 + 4 (DE/best/1)

var DEF_BOUNDS = [-10.0, 10.0];
var DEF_INIT_POP = [[-2.0, -1.0], [-4.0, -6.0], [6.0, 0.0], [4.0, -5.0], [0.0, 6.0], [2.0, 3.0]];

function def_r4(n) { return Math.floor(n * 1e4 + 0.5) / 1e4; }
function def_f(x, y) { return def_r4(Math.sin(x) + Math.cos(y) + y / 5.0 + 4.0); }

function DEF_LCG(seed) { this.state = (seed & 0x7FFFFFFF) || 1; }
DEF_LCG.prototype.next = function () {
  this.state = (this.state * 16807) % 2147483647;
  return this.state / 2147483647;
};

function def_clamp(v) {
  return def_r4(Math.max(DEF_BOUNDS[0], Math.min(DEF_BOUNDS[1], v)));
}

function def_run(seed, n_iter, p_cr) {
  seed = seed === undefined ? 14 : seed;
  n_iter = n_iter === undefined ? 4 : n_iter;
  p_cr = p_cr === undefined ? 0.7 : p_cr;

  var rngIdx = new DEF_LCG(seed);
  var rngF = new DEF_LCG(seed * 7 + 3);
  var rngCr = new DEF_LCG(seed * 13 + 5);

  var pop = DEF_INIT_POP.map(function (p) { return p.slice(); });
  var n = pop.length;
  var fvals = pop.map(function (p) { return def_f(p[0], p[1]); });

  var bestIdx = 0;
  for (var i = 1; i < n; i++) if (fvals[i] < fvals[bestIdx]) bestIdx = i;
  var best = { vec: pop[bestIdx].slice(), f: fvals[bestIdx] };

  var iterations = [];

  for (var it = 1; it <= n_iter; it++) {
    var k = 0;
    for (var i = 1; i < n; i++) if (fvals[i] < fvals[k]) k = i;
    var xbest = pop[k].slice();

    var trials = [];
    for (var i = 0; i < n; i++) {
      var idxs = []; for (var j = 0; j < n; j++) if (j !== i) idxs.push(j);
      var r1 = idxs[Math.floor(rngIdx.next() * idxs.length)];
      var idxs2 = idxs.filter(function (j) { return j !== r1; });
      var r2 = idxs2[Math.floor(rngIdx.next() * idxs2.length)];

      var F = def_r4(rngF.next());
      var u = [def_clamp(xbest[0] + F * (pop[r1][0] - pop[r2][0])),
               def_clamp(xbest[1] + F * (pop[r1][1] - pop[r2][1]))];

      var child = [0, 0], crFlags = [];
      for (var d = 0; d < 2; d++) {
        var s = rngCr.next();
        var takeU = s <= p_cr;
        child[d] = takeU ? u[d] : pop[i][d];
        crFlags.push(takeU ? 'u' : 'x');
      }

      var fChild = def_f(child[0], child[1]);
      var fCur = fvals[i];
      var accept = fChild < fCur;

      trials.push({
        i: i, r1: r1, r2: r2, F: F, xi: pop[i].slice(), f_xi: fCur,
        xbest: xbest.slice(), xr1: pop[r1].slice(), xr2: pop[r2].slice(),
        u: u.slice(), cr_flags: crFlags.slice(),
        child: child.slice(), f_child: fChild, accept: accept,
      });
    }

    var newPop = pop.map(function (p) { return p.slice(); });
    var newFvals = fvals.slice();
    trials.forEach(function (t) {
      if (t.accept) { newPop[t.i] = t.child.slice(); newFvals[t.i] = t.f_child; }
    });

    var gi = 0; for (var i = 1; i < n; i++) if (newFvals[i] < newFvals[gi]) gi = i;
    if (newFvals[gi] < best.f) best = { vec: newPop[gi].slice(), f: newFvals[gi] };

    iterations.push({
      iter: it, pop: pop.map(function (p) { return p.slice(); }), fvals: fvals.slice(),
      xbest: xbest.slice(), xbest_f: fvals[k], trials: trials,
      new_pop: newPop.map(function (p) { return p.slice(); }), new_fvals: newFvals.slice(),
      best_so_far: { vec: best.vec.slice(), f: best.f },
    });
    pop = newPop; fvals = newFvals;
  }

  return {
    config: {
      expr: 'f(x,y) = sen(x) + cos(y) + y/5 + 4', objective: 'minimizar',
      bounds: DEF_BOUNDS.slice(), n_iter: n_iter, p_cr: p_cr,
      F_mode: 'aleatorio', target: 'melhor (xbest) - DE/best/1', seed: seed,
    },
    init_pop: DEF_INIT_POP.map(function (p) { return p.slice(); }),
    iterations: iterations, best: best,
  };
}
