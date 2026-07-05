var TT_NAMES = ['A','B','C','D','E','F'];
var TT_COST = {
  A: {A:0.0, B:9.2, C:5.4, D:4.1, E:6.0, F:8.5},
  B: {A:9.2, B:0.0, C:9.1, D:5.8, E:6.1, F:4.5},
  C: {A:5.4, B:9.1, C:0.0, D:7.2, E:9.4, F:5.8},
  D: {A:4.1, B:5.8, C:7.2, D:0.0, E:2.2, F:7.1},
  E: {A:6.0, B:6.1, C:9.4, D:2.2, E:0.0, F:8.5},
  F: {A:8.5, B:4.5, C:5.8, D:7.1, E:8.5, F:0.0},
};
var TT_COORDS = {
  A: [3.6,3.4], B: [6.6,8.6], C: [5.6,1.8],
  D: [4.2,6.2], E: [3.8,7.6], F: [7.4,5.4],
};
var TT_S4        = ['A','B','C','E','F','D'];
var TT_TABU_INIT = {B_E:2, C_E:3, E_F:1};
var TT_TENURE    = 3;
var TT_OTIMO     = 28.1;
var TT_R_SEL     = [0.45, 0.25, 0.10];
var TT_OX_C1 = 3, TT_OX_C2 = 4;
var TT_MUT_I = 1, TT_MUT_J = 2;

function tt_r1(x) { return Math.round(x * 10) / 10; }

function tt_tourCost(t) {
  var s = 0;
  for (var i = 0; i < t.length; i++) s += TT_COST[t[i]][t[(i+1) % t.length]];
  return tt_r1(s);
}

function tt_pairKey(a, b) { return a < b ? a + '_' + b : b + '_' + a; }

function tt_tabuRun() {
  var S = TT_S4.slice();
  var tabu = JSON.parse(JSON.stringify(TT_TABU_INIT));
  var bestCost = tt_tourCost(S), bestS = S.slice();
  var steps = [];

  [4, 5].forEach(function(iter) {
    var moves = [];
    for (var i = 1; i < S.length - 1; i++) {
      for (var j = i + 1; j < S.length; j++) {
        var t = S.slice();
        var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
        var c   = tt_tourCost(t);
        var key = tt_pairKey(S[i], S[j]);
        moves.push({i:i, j:j, cities:[S[i],S[j]], key:key, tour:t, cost:c,
                    is_tabu: (tabu[key]||0) > 0, aspiration: c < bestCost});
      }
    }
    moves.sort(function(a, b) {
      if (a.cost !== b.cost) return a.cost - b.cost;
      if (a.i !== b.i) return a.i - b.i;
      return a.j - b.j;
    });
    var candidates = moves.slice(0, 3);

    var chosen = null;
    for (var mi = 0; mi < candidates.length; mi++) {
      var m = candidates[mi];
      if (!m.is_tabu || m.aspiration) { chosen = m; break; }
    }

    var aspUsed   = chosen.is_tabu && chosen.aspiration;
    var isNewBest = chosen.cost < bestCost;

    var step = {
      iter:        iter,
      S_before:    S.slice(),
      cost_before: tt_tourCost(S),
      move_cities: chosen.cities.slice(),
      move_key:    chosen.key,
      S_after:     chosen.tour.slice(),
      cost_after:  chosen.cost,
      was_tabu:        chosen.is_tabu,
      aspiration_used: aspUsed,
      is_new_best:     isNewBest,
      tabu_before: JSON.parse(JSON.stringify(tabu)),
      candidates: candidates.map(function(m){
        return {cities:m.cities.slice(), key:m.key, cost:m.cost,
                tour:m.tour.slice(), is_tabu:m.is_tabu, aspiration:m.aspiration};
      }),
    };

    var newTabu = {};
    Object.keys(tabu).forEach(function(k){
      if (tabu[k] - 1 > 0) newTabu[k] = tabu[k] - 1;
    });
    tabu = newTabu;
    tabu[chosen.key] = TT_TENURE;
    step.tabu_after = JSON.parse(JSON.stringify(tabu));

    S = chosen.tour;
    if (isNewBest) { bestCost = chosen.cost; bestS = S.slice(); }
    step.best_cost = bestCost;
    step.erro      = tt_r1(chosen.cost - TT_OTIMO);
    steps.push(step);
  });

  return {steps: steps, S6: S.slice(), S6_cost: tt_tourCost(S)};
}

function tt_fitness(rows) {
  var cmax = Math.max.apply(null, rows.map(function(r){ return r.cost; }));
  rows.forEach(function(r){ r.fit = tt_r1(cmax - r.cost + 1.0); });
  var total = tt_r1(rows.reduce(function(s, r){ return s + r.fit; }, 0));
  var acc = 0;
  rows.forEach(function(r){
    r.prob = Math.round(r.fit / total * 1000) / 1000;
    acc = Math.round((acc + r.prob) * 1000) / 1000;
    r.cum = acc;
  });
  rows[rows.length - 1].cum = 1.0;
}

function tt_roulette(rows, r) {
  for (var i = 0; i < rows.length; i++) if (r <= rows[i].cum) return i;
  return rows.length - 1;
}

function tt_ox(p1, p2, c1, c2) {
  var n = p1.length, child = Array(n).fill(null), seg = {};
  for (var i = c1; i <= c2; i++) { child[i] = p1[i]; seg[p1[i]] = true; }
  var fill = p2.filter(function(g){ return !seg[g]; });
  var idx = 0;
  for (var i2 = 0; i2 < n; i2++) {
    if (child[i2] === null) { child[i2] = fill[idx]; idx++; }
  }
  return child;
}

function tt_gaRun(popTours, labels) {
  var pop = popTours.map(function(t, i){
    return {label: labels[i], tour: t.slice(), cost: tt_tourCost(t)};
  });
  tt_fitness(pop);

  var iP1 = tt_roulette(pop, TT_R_SEL[0]);
  var iP2 = tt_roulette(pop, TT_R_SEL[1]);
  var p1 = pop[iP1], p2 = pop[iP2];

  var childTour = tt_ox(p1.tour, p2.tour, TT_OX_C1, TT_OX_C2);
  var child = {label:'Filho', tour:childTour, cost:tt_tourCost(childTour)};

  var iMut = tt_roulette(pop, TT_R_SEL[2]);
  var base = pop[iMut];
  var mutTour = base.tour.slice();
  var tmp = mutTour[TT_MUT_I]; mutTour[TT_MUT_I] = mutTour[TT_MUT_J]; mutTour[TT_MUT_J] = tmp;
  var mut = {label:'Mutante', tour:mutTour, cost:tt_tourCost(mutTour), base:base.label};

  var iElite = 0;
  for (var i = 1; i < pop.length; i++) if (pop[i].cost < pop[iElite].cost) iElite = i;
  var elite = pop[iElite];
  var newPop = [
    {label: elite.label + ' (elite)', tour: elite.tour.slice(), cost: elite.cost},
    {label: 'Filho',   tour: child.tour.slice(), cost: child.cost},
    {label: 'Mutante', tour: mut.tour.slice(),   cost: mut.cost},
  ];
  tt_fitness(newPop);
  var iBest = 0;
  for (var b = 1; b < newPop.length; b++) if (newPop[b].cost < newPop[iBest].cost) iBest = b;
  newPop.forEach(function(r){ r.erro = tt_r1(r.cost - TT_OTIMO); });

  return {pop_ini:pop, r_sel:TT_R_SEL, i_p1:iP1, i_p2:iP2,
          ox_cuts:[TT_OX_C1, TT_OX_C2], child:child,
          i_mut:iMut, mut_pos:[TT_MUT_I, TT_MUT_J], mut:mut,
          i_elite:iElite, new_pop:newPop, best:newPop[iBest]};
}

function tt_run() {
  var tabuPart = tt_tabuRun();
  var S5 = tabuPart.steps[0].S_after;
  var S6 = tabuPart.S6;
  var gaPart = tt_gaRun([TT_S4, S5, S6], ['S4','S5','S6']);

  var matrix = TT_NAMES.map(function(a){
    return TT_NAMES.map(function(b){ return TT_COST[a][b]; });
  });
  return {
    config: {tenure: TT_TENURE, custo_otimo: TT_OTIMO, n_cities: TT_NAMES.length},
    names: TT_NAMES,
    coords: TT_COORDS,
    matrix: matrix,
    S4: TT_S4.slice(),
    S4_cost: tt_tourCost(TT_S4),
    tabu_init: JSON.parse(JSON.stringify(TT_TABU_INIT)),
    tabu: tabuPart,
    ga: gaPart,
  };
}
