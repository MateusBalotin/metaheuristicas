var TM_P = [20,25,14,46,39,57,58,47,38,30,53,57,38,53,58,48,14,6,40,10];
var TM_V = [7,7,8,3,5,8,1,4,9,7,10,8,7,1,7,9,3,2,4,2];
var TM_PCOMP  = [240,190,170];
var TM_PTOTAL = 510;
var TM_N  = 20;
var TM_K  = 3;
var TM_MU = 1.0;
var TM_FO_REF = 99.0;

function tm_weights(a) {
  var w = [0,0,0];
  for (var j = 0; j < TM_N; j++) if (a[j] > 0) w[a[j]-1] += TM_P[j];
  return w;
}

function tm_evaluate(a) {
  var w = tm_weights(a);
  var W = w[0] + w[1] + w[2];
  var val = 0;
  for (var j = 0; j < TM_N; j++) if (a[j] > 0) val += TM_V[j];
  var excComp = [0,0,0], sumExc = 0;
  for (var i = 0; i < TM_K; i++) {
    excComp[i] = Math.max(0, w[i] - TM_PCOMP[i]);
    sumExc += excComp[i];
  }
  var excTotal = Math.max(0, W - TM_PTOTAL);
  var pen = TM_MU * (sumExc + excTotal);
  return {f: val - pen, val: val, pen: pen, w: w, W: W,
          exc_comp: excComp, exc_total: excTotal};
}

function tm_run(k, maxIter) {
  var a = Array(TM_N).fill(0);
  var ev0 = tm_evaluate(a);
  var bestF = ev0.f, bestA = a.slice();
  var tabu = {}, steps = [];

  for (var iter = 1; iter <= maxIter; iter++) {
    var moves = [];
    for (var j = 0; j < TM_N; j++) {
      for (var s = 0; s <= TM_K; s++) {
        if (s === a[j]) continue;
        var an = a.slice(); an[j] = s;
        var ev = tm_evaluate(an);
        moves.push({item: j, dest: s, orig: a[j], a: an,
                    f: ev.f, val: ev.val, pen: ev.pen, w: ev.w, W: ev.W,
                    is_tabu: (tabu[j]||0) > 0, aspiration: ev.f > bestF});
      }
    }
    moves.sort(function(m1, m2) {
      if (m2.f !== m1.f) return m2.f - m1.f;
      if (m1.item !== m2.item) return m1.item - m2.item;
      return m1.dest - m2.dest;
    });

    var chosen = null;
    for (var mi = 0; mi < moves.length; mi++) {
      var m = moves[mi];
      if (!m.is_tabu || m.aspiration) { chosen = m; break; }
    }
    if (!chosen) break;

    var aspUsed   = chosen.is_tabu && chosen.aspiration;
    var isNewBest = chosen.f > bestF;
    var evBefore  = tm_evaluate(a);

    var step = {
      iter:            iter,
      a_before:        a.slice(),
      f_before:        evBefore.f,
      val_before:      evBefore.val,
      pen_before:      evBefore.pen,
      w_before:        evBefore.w,
      item:            chosen.item,
      orig:            chosen.orig,
      dest:            chosen.dest,
      a_after:         chosen.a.slice(),
      f_after:         chosen.f,
      val_after:       chosen.val,
      pen_after:       chosen.pen,
      w_after:         chosen.w.slice(),
      W_after:         chosen.W,
      aspiration_used: aspUsed,
      is_new_best:     isNewBest,
      tabu_before:     JSON.parse(JSON.stringify(tabu)),
      top5: moves.slice(0,5).map(function(m){
        return {item:m.item, orig:m.orig, dest:m.dest, f:m.f, val:m.val,
                pen:m.pen, W:m.W, is_tabu:m.is_tabu, aspiration:m.aspiration};
      }),
    };

    a = chosen.a;
    var newTabu = {};
    Object.keys(tabu).forEach(function(ki){
      if (tabu[ki] - 1 > 0) newTabu[ki] = tabu[ki] - 1;
    });
    tabu = newTabu;
    tabu[chosen.item] = k;
    step.tabu_after = JSON.parse(JSON.stringify(tabu));

    if (isNewBest) { bestF = chosen.f; bestA = a.slice(); }
    step.best_f = bestF;
    step.erro   = TM_FO_REF - chosen.f;
    steps.push(step);
  }

  var evBest = tm_evaluate(bestA);
  return {
    config: {k:k, max_iter:maxIter, n:TM_N, K:TM_K, P_comp:TM_PCOMP,
             P_total:TM_PTOTAL, mu:TM_MU, fo_ref:TM_FO_REF},
    p: TM_P, v: TM_V,
    steps: steps,
    best_a: bestA, best_f: bestF,
    best_val: evBest.val, best_pen: evBest.pen,
    best_w: evBest.w, best_W: evBest.W,
    erro_final: TM_FO_REF - bestF,
  };
}
