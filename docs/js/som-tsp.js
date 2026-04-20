var SOM_TSP_EX = {
  cities: [
    {id:1,  label:'C1',  x:16.47, y:96.10},
    {id:2,  label:'C2',  x:16.47, y:94.44},
    {id:3,  label:'C3',  x:20.09, y:92.54},
    {id:4,  label:'C4',  x:22.39, y:93.37},
    {id:5,  label:'C5',  x:25.23, y:97.24},
    {id:6,  label:'C6',  x:22.00, y:96.05},
    {id:7,  label:'C7',  x:20.47, y:97.02},
    {id:8,  label:'C8',  x:17.20, y:96.29},
    {id:9,  label:'C9',  x:16.30, y:97.38},
    {id:10, label:'C10', x:14.05, y:98.12},
    {id:11, label:'C11', x:16.53, y:97.38},
    {id:12, label:'C12', x:21.52, y:95.59},
    {id:13, label:'C13', x:19.41, y:97.13},
    {id:14, label:'C14', x:20.09, y:94.55},
  ],
};

function tsp_r4(n) { return Math.round(n * 1e4) / 1e4; }
function tsp_r2(n) { return Math.round(n * 100)  / 100; }

function tsp_euclid(ax, ay, bx, by) {
  return Math.sqrt((ax-bx)*(ax-bx) + (ay-by)*(ay-by));
}

function tsp_ringDist(i, j, n) {
  var d = Math.abs(i - j);
  return Math.min(d, n - d);
}

function tsp_initWeights(n_neurons) {
  var cities = SOM_TSP_EX.cities;
  var cx = 0, cy = 0;
  cities.forEach(function(c) { cx += c.x; cy += c.y; });
  cx /= cities.length; cy /= cities.length;
  var rx = 3.2, ry = 1.6, W = [];
  for (var i = 0; i < n_neurons; i++) {
    var a = 2 * Math.PI * i / n_neurons;
    W.push([tsp_r4(cx + rx * Math.cos(a)), tsp_r4(cy + ry * Math.sin(a))]);
  }
  return W;
}

function tsp_run(alpha0, n_iters, n_neurons, radius0) {
  var cities = SOM_TSP_EX.cities, nc = cities.length;
  var W = tsp_initWeights(n_neurons);
  var initW = W.map(function(w) { return w.slice(); });
  var steps = [];

  for (var iter = 1; iter <= n_iters; iter++) {
    var alpha  = tsp_r4(alpha0 * Math.pow(0.5, iter - 1));
    var denom  = Math.max(n_iters - 1, 1);
    var radius = Math.max(0, Math.round(radius0 * (1 - (iter - 1) / denom)));

    for (var pi = 0; pi < nc; pi++) {
      var c = cities[pi];
      var wBefore = W.map(function(w) { return w.slice(); });

      var dists = W.map(function(w) { return tsp_r4(tsp_euclid(c.x, c.y, w[0], w[1])); });
      var winner = 0;
      for (var i = 1; i < n_neurons; i++) if (dists[i] < dists[winner]) winner = i;

      var nbrs = [];
      for (var i = 0; i < n_neurons; i++)
        if (tsp_ringDist(i, winner, n_neurons) <= radius) nbrs.push(i);

      var deltas = [];
      for (var ni = 0; ni < n_neurons; ni++) {
        if (nbrs.indexOf(ni) !== -1) {
          var old = W[ni].slice();
          var dx  = tsp_r4(alpha * (c.x - W[ni][0]));
          var dy  = tsp_r4(alpha * (c.y - W[ni][1]));
          W[ni][0] = tsp_r4(W[ni][0] + dx);
          W[ni][1] = tsp_r4(W[ni][1] + dy);
          deltas.push({n: ni, old: old, delta: [dx, dy], nw: W[ni].slice()});
        }
      }

      steps.push({
        iter: iter, pi: pi, alpha: alpha, radius: radius,
        city: {id: c.id, label: c.label, x: c.x, y: c.y},
        dists: dists, winner: winner, neighbors: nbrs, deltas: deltas,
        weights_before: wBefore,
        weights_after:  W.map(function(w) { return w.slice(); }),
      });
    }
  }

  var finalMapping = cities.map(function(c) {
    var ds = W.map(function(w) { return tsp_euclid(c.x, c.y, w[0], w[1]); });
    var win = 0;
    for (var i = 1; i < n_neurons; i++) if (ds[i] < ds[win]) win = i;
    return {id: c.id, label: c.label, x: c.x, y: c.y, winner: win, dist: tsp_r4(ds[win])};
  });

  var tour = finalMapping.slice().sort(function(a, b) { return a.winner - b.winner; });
  var tourDist = 0;
  for (var i = 0; i < tour.length; i++) {
    var nxt = tour[(i + 1) % tour.length];
    tourDist += tsp_euclid(tour[i].x, tour[i].y, nxt.x, nxt.y);
  }

  return {
    config: {nc: nc, n_neurons: n_neurons, alpha: alpha0, n_iters: n_iters, radius0: radius0},
    cities: cities, init_weights: initW, steps: steps,
    final_weights: W.map(function(w) { return w.slice(); }),
    final_mapping: finalMapping, tour: tour, tour_dist: tsp_r2(tourDist),
  };
}
