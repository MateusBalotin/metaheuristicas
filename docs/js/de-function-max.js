// ED 14.2 - maximizar f(x,y) = sen(x/3) + cos(6y/5) + e^(y/5) + 2 (DE/best/1)

var DEM_BOUNDS = [-10.0, 10.0];
var DEM_INIT_POP = [[-7.0, -5.0], [5.0, -8.0], [-5.0, -3.0], [7.5, 2.5], [8.0, -5.0], [-5.0, 2.0]];

function dem_r4(n) { return Math.floor(n * 1e4 + 0.5) / 1e4; }
function dem_f(x, y) { return dem_r4(Math.sin(x / 3.0) + Math.cos(6.0 * y / 5.0) + Math.exp(y / 5.0) + 2.0); }

function DEM_LCG(seed) { this.state = (seed & 0x7FFFFFFF) || 1; }
DEM_LCG.prototype.next = function () {
  this.state = (this.state * 16807) % 2147483647;
  return this.state / 2147483647;
};

function dem_clamp(v) {
  return dem_r4(Math.max(DEM_BOUNDS[0], Math.min(DEM_BOUNDS[1], v)));
}

function dem_run(seed, n_iter, f_scale, p_cr) {
  seed = seed === undefined ? 14 : seed;
  n_iter = n_iter === undefined ? 4 : n_iter;
  f_scale = f_scale === undefined ? 0.5 : f_scale;
  p_cr = p_cr === undefined ? 0.7 : p_cr;

  var rngIdx = new DEM_LCG(seed);
  var rngCr = new DEM_LCG(seed * 13 + 5);

  var pop = DEM_INIT_POP.map(function (p) { return p.slice(); });
  var n = pop.length;
  var fvals = pop.map(function (p) { return dem_f(p[0], p[1]); });

  var bestIdx = 0;
  for (var i = 1; i < n; i++) if (fvals[i] > fvals[bestIdx]) bestIdx = i;
  var best = { vec: pop[bestIdx].slice(), f: fvals[bestIdx] };

  var iterations = [];

  for (var it = 1; it <= n_iter; it++) {
    var k = 0;
    for (var i = 1; i < n; i++) if (fvals[i] > fvals[k]) k = i;
    var xbest = pop[k].slice();

    var trials = [];
    for (var i = 0; i < n; i++) {
      var idxs = []; for (var j = 0; j < n; j++) if (j !== i) idxs.push(j);
      var r1 = idxs[Math.floor(rngIdx.next() * idxs.length)];
      var idxs2 = idxs.filter(function (j) { return j !== r1; });
      var r2 = idxs2[Math.floor(rngIdx.next() * idxs2.length)];

      var u = [dem_clamp(xbest[0] + f_scale * (pop[r1][0] - pop[r2][0])),
               dem_clamp(xbest[1] + f_scale * (pop[r1][1] - pop[r2][1]))];

      var child = [0, 0], crFlags = [];
      for (var d = 0; d < 2; d++) {
        var s = rngCr.next();
        var takeU = s <= p_cr;
        child[d] = takeU ? u[d] : pop[i][d];
        crFlags.push(takeU ? 'u' : 'x');
      }

      var fChild = dem_f(child[0], child[1]);
      var fCur = fvals[i];
      var accept = fChild > fCur;

      trials.push({
        i: i, r1: r1, r2: r2, F: f_scale, xi: pop[i].slice(), f_xi: fCur,
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

    var gi = 0; for (var i = 1; i < n; i++) if (newFvals[i] > newFvals[gi]) gi = i;
    if (newFvals[gi] > best.f) best = { vec: newPop[gi].slice(), f: newFvals[gi] };

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
      expr: 'f(x,y) = sen(x/3) + cos(6y/5) + e^(y/5) + 2', objective: 'maximizar',
      bounds: DEM_BOUNDS.slice(), n_iter: n_iter, p_cr: p_cr,
      F: f_scale, target: 'melhor (xbest) - DE/best/1', seed: seed,
    },
    init_pop: DEM_INIT_POP.map(function (p) { return p.slice(); }),
    iterations: iterations, best: best,
  };
}
