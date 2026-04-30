var KS_ITEMS = [
  {id:1, w:63,v:13},{id:2, w:21,v:2}, {id:3, w:2, v:20},{id:4, w:32,v:10},
  {id:5, w:13,v:7}, {id:6, w:80,v:14},{id:7, w:19,v:7}, {id:8, w:37,v:2},
  {id:9, w:56,v:2}, {id:10,w:41,v:4}, {id:11,w:14,v:16},{id:12,w:8, v:17},
  {id:13,w:32,v:17},{id:14,w:42,v:3}, {id:15,w:7, v:21},
];
var KS_CAPACITY = 275;

function ks_solVal(x) {
  return x.reduce(function(s,xi,i){ return s + xi*KS_ITEMS[i].v; }, 0);
}
function ks_solW(x) {
  return x.reduce(function(s,xi,i){ return s + xi*KS_ITEMS[i].w; }, 0);
}

function ks_neighbors(x, cap, bestVal, tabu) {
  var neighbors = [];
  for (var i = 0; i < x.length; i++) {
    var xn = x.slice(); xn[i] = 1 - xn[i];
    var w = ks_solW(xn), v = ks_solVal(xn);
    neighbors.push({
      item: i, x: xn, val: v, w: w, feasible: w <= cap,
      action: xn[i]===1 ? 'ADD' : 'REM',
      is_tabu: (tabu[i]||0) > 0,
      aspiration: v > bestVal,
    });
  }
  return neighbors.sort(function(a,b){ return b.val - a.val; });
}

function ks_run(k, maxIter, capacity) {
  var cap = capacity || KS_CAPACITY;
  var n   = KS_ITEMS.length;
  var x   = Array(n).fill(0);
  var bestX = x.slice(), bestVal = 0;
  var tabu = {}, steps = [];

  for (var iter = 1; iter <= maxIter; iter++) {
    var neighbors = ks_neighbors(x, cap, bestVal, tabu);

    var chosen = null;
    for (var mi = 0; mi < neighbors.length; mi++) {
      var m = neighbors[mi];
      if (m.feasible && (!m.is_tabu || m.aspiration)) { chosen = m; break; }
    }
    if (!chosen) break;

    var aspUsed  = chosen.is_tabu && chosen.aspiration;
    var isNewBest = chosen.val > bestVal;

    var step = {
      iter:            iter,
      x_before:        x.slice(),
      val_before:      ks_solVal(x),
      w_before:        ks_solW(x),
      item:            chosen.item,
      action:          chosen.action,
      x_after:         chosen.x.slice(),
      val_after:       chosen.val,
      w_after:         chosen.w,
      aspiration_used: aspUsed,
      is_new_best:     isNewBest,
      tabu_before:     JSON.parse(JSON.stringify(tabu)),
      top5: neighbors.slice(0,5).map(function(m){
        return {item:m.item,action:m.action,val:m.val,w:m.w,
                feasible:m.feasible,is_tabu:m.is_tabu,aspiration:m.aspiration};
      }),
    };

    x = chosen.x;
    tabu[chosen.item] = k;
    var newTabu = {};
    Object.keys(tabu).forEach(function(ki){
      if (tabu[ki] - 1 > 0) newTabu[ki] = tabu[ki] - 1;
    });
    tabu = newTabu;
    step.tabu_after = JSON.parse(JSON.stringify(tabu));

    if (isNewBest) { bestX = x.slice(); bestVal = chosen.val; }
    step.best_val = bestVal;
    step.best_x   = bestX.slice();
    steps.push(step);
  }

  return {
    config:   {k:k, max_iter:maxIter, capacity:cap, n_items:n},
    items:    KS_ITEMS,
    capacity: cap,
    steps:    steps,
    best_x:   bestX,
    best_val: bestVal,
    best_w:   ks_solW(bestX),
  };
}
