var TABU_CITIES = {
  A:[1.4,6.2], B:[5.1,6.2], C:[6.2,9.8], D:[7.4,6.1], E:[8.1,4.1],
  F:[11.2,6.2], G:[9.3,0.6], H:[6.2,2.7], I:[3.3,0.6], J:[4.4,4.1],
};
var TABU_NAMES     = ['A','B','C','D','E','F','G','H','I','J'];
var TABU_INIT_TOUR = ['J','D','H','B','E','A','F','I','C','G'];

function tabu_r4(n) { return Math.round(n * 1e4) / 1e4; }

function tabu_dist(a, b) {
  var ca=TABU_CITIES[a], cb=TABU_CITIES[b];
  return tabu_r4(Math.sqrt(Math.pow(ca[0]-cb[0],2)+Math.pow(ca[1]-cb[1],2)));
}

function tabu_buildMatrix() {
  var C = {};
  TABU_NAMES.forEach(function(a) {
    C[a] = {};
    TABU_NAMES.forEach(function(b) { C[a][b] = tabu_dist(a, b); });
  });
  return C;
}

function tabu_tourCost(tour, C) {
  var n = tour.length, s = 0;
  for (var i = 0; i < n; i++) s += C[tour[i]][tour[(i+1)%n]];
  return tabu_r4(s);
}

function tabu_twoOpt(tour, i, j) {
  return tour.slice(0,i).concat(tour.slice(i,j+1).reverse()).concat(tour.slice(j+1));
}

function tabu_run(initTour, k, maxIter) {
  var C       = tabu_buildMatrix();
  var S       = (initTour || TABU_INIT_TOUR).slice();
  var bestS   = S.slice();
  var bestCost = tabu_tourCost(S, C);
  var tabu    = {};
  var steps   = [];

  for (var iter = 1; iter <= maxIter; iter++) {
    var n = S.length;
    var neighbors = [];

    for (var i = 0; i < n-1; i++) {
      for (var j = i+1; j < n; j++) {
        var newTour = tabu_twoOpt(S, i, j);
        var cost    = tabu_tourCost(newTour, C);
        var key     = i + '_' + j;
        var isTabu  = (tabu[key] || 0) > 0;
        var aspiration = cost < bestCost;
        neighbors.push({
          i:i, j:j, key:key, tour:newTour, cost:cost,
          is_tabu:isTabu, aspiration:aspiration, cities:[S[i],S[j]],
        });
      }
    }
    neighbors.sort(function(a,b){return a.cost-b.cost;});

    var chosen = null;
    for (var mi = 0; mi < neighbors.length; mi++) {
      if (!neighbors[mi].is_tabu || neighbors[mi].aspiration) {
        chosen = neighbors[mi]; break;
      }
    }
    if (!chosen) break;

    var aspUsed  = chosen.is_tabu && chosen.aspiration;
    var isNewBest = chosen.cost < bestCost;

    var step = {
      iter:          iter,
      S_before:      S.slice(),
      cost_before:   tabu_tourCost(S, C),
      move_i:        chosen.i,
      move_j:        chosen.j,
      move_cities:   chosen.cities.slice(),
      S_after:       chosen.tour.slice(),
      cost_after:    chosen.cost,
      was_tabu:      chosen.is_tabu,
      aspiration_used: aspUsed,
      is_new_best:   isNewBest,
      tabu_before:   JSON.parse(JSON.stringify(tabu)),
      top5: neighbors.slice(0,5).map(function(m){
        return {i:m.i,j:m.j,cities:m.cities.slice(),cost:m.cost,
                is_tabu:m.is_tabu,aspiration:m.aspiration};
      }),
    };

    tabu[chosen.key] = k;
    var newTabu = {};
    Object.keys(tabu).forEach(function(mk) {
      if (tabu[mk] - 1 > 0) newTabu[mk] = tabu[mk] - 1;
    });
    tabu = newTabu;
    step.tabu_after = JSON.parse(JSON.stringify(tabu));

    S = chosen.tour;
    if (isNewBest) { bestS = S.slice(); bestCost = chosen.cost; }
    step.best_tour = bestS.slice();
    step.best_cost = bestCost;
    steps.push(step);
  }

  var matrixList = TABU_NAMES.map(function(a){
    return TABU_NAMES.map(function(b){ return C[a][b]; });
  });

  return {
    config:    {k:k, max_iter:maxIter, n_cities:TABU_NAMES.length},
    cities:    TABU_CITIES,
    names:     TABU_NAMES,
    init_tour: TABU_INIT_TOUR.slice(),
    init_cost: tabu_tourCost(TABU_INIT_TOUR, C),
    matrix:    matrixList,
    steps:     steps,
    best_tour: bestS,
    best_cost: bestCost,
  };
}
