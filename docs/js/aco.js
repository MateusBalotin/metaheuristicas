// ACO (Ant Colony Optimization) - TSP de 6 cidades

var ACO_CITIES = {
  A: [1.0, 1.0], B: [2.0, 8.0], C: [7.0, 7.0],
  D: [8.0, 0.0], E: [9.0, 8.0], F: [4.0, 9.0],
};
var ACO_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

function aco_r2(n) { return Math.round(n * 100) / 100; }
function aco_r4(n) { return Math.round(n * 1e4) / 1e4; }

function aco_dist(a, b) {
  var p = ACO_CITIES[a], q = ACO_CITIES[b];
  return aco_r2(Math.sqrt((p[0]-q[0])*(p[0]-q[0]) + (p[1]-q[1])*(p[1]-q[1])));
}

function aco_buildMatrix() {
  var C = {};
  ACO_NAMES.forEach(function(a) {
    C[a] = {};
    ACO_NAMES.forEach(function(b) { C[a][b] = aco_dist(a, b); });
  });
  return C;
}

// Gerador de numeros pseudoaleatorios (LCG MINSTD)
function ACO_LCG(seed) { this.state = (seed & 0x7FFFFFFF) || 1; }
ACO_LCG.prototype.next = function() {
  this.state = (this.state * 16807) % 2147483647;
  return this.state / 2147483647;
};

function aco_initPheromones(seed, lo, hi) {
  lo = (lo === undefined) ? 0.1 : lo;
  hi = (hi === undefined) ? 1.0 : hi;
  var rng = new ACO_LCG(seed);
  var tau = {};
  ACO_NAMES.forEach(function(a) {
    tau[a] = {};
    ACO_NAMES.forEach(function(b) { tau[a][b] = 0.0; });
  });
  var n = ACO_NAMES.length;
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      var val = aco_r4(lo + (hi - lo) * rng.next());
      tau[ACO_NAMES[i]][ACO_NAMES[j]] = val;
      tau[ACO_NAMES[j]][ACO_NAMES[i]] = val;
    }
  }
  return tau;
}

function aco_tourLength(tour, C) {
  var n = tour.length, s = 0;
  for (var i = 0; i < n; i++) s += C[tour[i]][tour[(i + 1) % n]];
  return aco_r2(s);
}

function aco_matList(tau) {
  return ACO_NAMES.map(function(a) {
    return ACO_NAMES.map(function(b) { return aco_r4(tau[a][b]); });
  });
}

function aco_run(seed, n_ants, n_iters, alpha, beta, rho, Q, start_seed) {
  seed       = (seed       === undefined) ? 7   : seed;
  n_ants     = (n_ants     === undefined) ? 6   : n_ants;
  n_iters    = (n_iters    === undefined) ? 2   : n_iters;
  alpha      = (alpha      === undefined) ? 0.4 : alpha;
  beta       = (beta       === undefined) ? 0.6 : beta;
  rho        = (rho        === undefined) ? 0.5 : rho;
  Q          = (Q          === undefined) ? 100 : Q;
  start_seed = (start_seed === undefined) ? 101 : start_seed;

  var C   = aco_buildMatrix();
  var tau = aco_initPheromones(seed);
  var initTau = aco_matList(tau);

  var eta = {};
  ACO_NAMES.forEach(function(a) {
    eta[a] = {};
    ACO_NAMES.forEach(function(b) {
      eta[a][b] = (a === b) ? 0.0 : aco_r4(1.0 / C[a][b]);
    });
  });

  var bestTour = null, bestLen = Infinity;
  var iterations = [];

  var choiceRng = new ACO_LCG(start_seed);
  var startRng  = new ACO_LCG(start_seed * 31 + 7);

  function choose(probs) {
    var r = choiceRng.next(), acc = 0;
    for (var i = 0; i < probs.length; i++) { acc += probs[i]; if (r <= acc) return i; }
    return probs.length - 1;
  }

  for (var it = 1; it <= n_iters; it++) {
    var tauBefore = {};
    ACO_NAMES.forEach(function(a) { tauBefore[a] = {}; ACO_NAMES.forEach(function(b){ tauBefore[a][b]=tau[a][b]; }); });

    var ants = [];
    var deposits = {};
    ACO_NAMES.forEach(function(a){ deposits[a]={}; ACO_NAMES.forEach(function(b){ deposits[a][b]=0.0; }); });

    for (var k = 0; k < n_ants; k++) {
      var startIdx = Math.floor(startRng.next() * ACO_NAMES.length) % ACO_NAMES.length;
      var current  = ACO_NAMES[startIdx];
      var visited  = [current];
      var antSteps = [];

      while (visited.length < ACO_NAMES.length) {
        var allowed = ACO_NAMES.filter(function(c){ return visited.indexOf(c) === -1; });

        var terms = allowed.map(function(nxt) {
          var t = Math.pow(tau[current][nxt], alpha);
          var h = Math.pow(eta[current][nxt], beta);
          return aco_r4(t * h);
        });
        var total = terms.reduce(function(a,b){ return a+b; }, 0);
        var probs = terms.map(function(t) {
          return total > 0 ? aco_r4(t / total) : aco_r4(1.0 / allowed.length);
        });

        var pick = choose(probs);
        var chosen = allowed[pick];

        antSteps.push({
          current: current,
          allowed: allowed.slice(),
          tau: allowed.map(function(c){ return tau[current][c]; }),
          eta: allowed.map(function(c){ return eta[current][c]; }),
          num: terms,
          total: aco_r4(total),
          probs: probs,
          chosen: chosen,
        });

        visited.push(chosen);
        current = chosen;
      }

      var L = aco_tourLength(visited, C);
      var dep = L > 0 ? aco_r4(Q / L) : 0.0;
      var edges = [];
      for (var i = 0; i < visited.length; i++) {
        var a = visited[i], b = visited[(i + 1) % visited.length];
        deposits[a][b] += dep;
        deposits[b][a] += dep;
        edges.push([a, b]);
      }

      if (L < bestLen) { bestLen = L; bestTour = visited.slice(); }

      ants.push({
        k: k + 1, start: visited[0], steps: antSteps,
        tour: visited.slice(), length: L, deposit: dep, edges: edges,
      });
    }

    var updates = [];
    for (var i2 = 0; i2 < ACO_NAMES.length; i2++) {
      for (var j2 = i2 + 1; j2 < ACO_NAMES.length; j2++) {
        var ea = ACO_NAMES[i2], eb = ACO_NAMES[j2];
        var old = tau[ea][eb];
        var evap = aco_r4((1 - rho) * old);
        var add  = aco_r4(deposits[ea][eb]);
        var nw   = aco_r4(evap + add);
        tau[ea][eb] = nw; tau[eb][ea] = nw;
        updates.push({ edge: ea + eb, old: old, evap: evap, add: add, new: nw });
      }
    }

    iterations.push({
      iter: it,
      tau_before: aco_matList(tauBefore),
      ants: ants,
      deposits: aco_matList(deposits),
      updates: updates,
      tau_after: aco_matList(tau),
      best_tour: bestTour.slice(),
      best_len: aco_r2(bestLen),
    });
  }

  var matrixList = ACO_NAMES.map(function(a){ return ACO_NAMES.map(function(b){ return C[a][b]; }); });
  var etaList    = ACO_NAMES.map(function(a){ return ACO_NAMES.map(function(b){ return eta[a][b]; }); });

  return {
    config: {
      n_cities: ACO_NAMES.length, n_ants: n_ants, n_iters: n_iters,
      alpha: alpha, beta: beta, rho: rho, Q: Q, seed: seed,
    },
    cities: ACO_CITIES, names: ACO_NAMES,
    matrix: matrixList, eta: etaList, init_tau: initTau,
    iterations: iterations, best_tour: bestTour, best_len: aco_r2(bestLen),
  };
}
