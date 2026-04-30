var EJ_DATASETS = {
  xor: [
    {n:1, x1:0, x2:0, d:0},
    {n:2, x1:0, x2:1, d:1},
    {n:3, x1:1, x2:0, d:1},
    {n:4, x1:1, x2:1, d:0},
  ],
  and: [
    {n:1, x1:0, x2:0, d:0},
    {n:2, x1:0, x2:1, d:0},
    {n:3, x1:1, x2:0, d:0},
    {n:4, x1:1, x2:1, d:1},
  ],
  ativ82: [
    {n:1, x1:0, x2:2, d:1},
    {n:2, x1:1, x2:2, d:1},
    {n:3, x1:1, x2:3, d:1},
    {n:4, x1:1, x2:0, d:0},
    {n:5, x1:2, x2:1, d:0},
  ],
};

function ej_r6(n) { return Math.round(n * 1e6) / 1e6; }
function ej_r4(n) { return Math.round(n * 1e4) / 1e4; }
function ej_sig(x) { return 1.0 / (1.0 + Math.exp(-x)); }

function ej_rng(seed) {
  var s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ej_initWeights(network, seed) {
  var rng   = ej_rng(seed);
  var rand  = function() { return ej_r4((rng() * 2 - 1) * 0.5); };
  var n_ctx = network === 'elman' ? 2 : 1;
  return {
    Wa:      [[rand(),rand()],[rand(),rand()]],
    Wb:      Array(2).fill(0).map(function(){return Array(n_ctx).fill(0).map(rand);}),
    W:       [rand(), rand()],
    theta_h: [rand(), rand()],
    theta_o: rand(),
  };
}

function ej_copyWs(ws) {
  return {
    Wa:      ws.Wa.map(function(r){return r.slice();}),
    Wb:      ws.Wb.map(function(r){return r.slice();}),
    W:       ws.W.slice(),
    theta_h: ws.theta_h.slice(),
    theta_o: ws.theta_o,
  };
}

function ej_forward(x, ctx, ws) {
  var z_star = [], z = [];
  for (var j = 0; j < 2; j++) {
    var zs = ws.theta_h[j];
    for (var i = 0; i < x.length; i++)   zs += ws.Wa[j][i] * x[i];
    for (var k = 0; k < ctx.length; k++) zs += ws.Wb[j][k] * ctx[k];
    z_star.push(ej_r6(zs));
    z.push(ej_r6(ej_sig(zs)));
  }
  var ys = ej_r6(ws.theta_o + ws.W[0]*z[0] + ws.W[1]*z[1]);
  return {z_star: z_star, z: z, y_star: ys, y: ej_r6(ej_sig(ys))};
}

function ej_backprop(x, ctx, d, ws, alpha) {
  var fwd    = ej_forward(x, ctx, ws);
  var y      = fwd.y, z = fwd.z;
  var new_ws = ej_copyWs(ws);

  var delta_out = ej_r6(y * (1 - y) * (d - y));

  var dW = [ej_r6(alpha*delta_out*z[0]), ej_r6(alpha*delta_out*z[1])];
  var d_to = ej_r6(alpha * delta_out);
  new_ws.W[0] = ej_r6(ws.W[0] + dW[0]);
  new_ws.W[1] = ej_r6(ws.W[1] + dW[1]);
  new_ws.theta_o = ej_r6(ws.theta_o + d_to);

  var delta_h = [
    ej_r6(delta_out * ws.W[0] * z[0] * (1 - z[0])),
    ej_r6(delta_out * ws.W[1] * z[1] * (1 - z[1])),
  ];
  var dWa = [], dWb = [], d_th = [];
  for (var j = 0; j < 2; j++) {
    dWa.push([ej_r6(alpha*delta_h[j]*x[0]), ej_r6(alpha*delta_h[j]*x[1])]);
    dWb.push(ctx.map(function(c){ return ej_r6(alpha*delta_h[j]*c); }));
    d_th.push(ej_r6(alpha * delta_h[j]));
    new_ws.Wa[j][0] = ej_r6(ws.Wa[j][0] + dWa[j][0]);
    new_ws.Wa[j][1] = ej_r6(ws.Wa[j][1] + dWa[j][1]);
    for (var k = 0; k < ctx.length; k++)
      new_ws.Wb[j][k] = ej_r6(ws.Wb[j][k] + dWb[j][k]);
    new_ws.theta_h[j] = ej_r6(ws.theta_h[j] + d_th[j]);
  }

  return {
    fwd: fwd, delta_out: delta_out, delta_h: delta_h,
    dW: dW, d_theta_o: d_to,
    dWa: dWa, dWb: dWb, d_theta_h: d_th,
    new_ws: new_ws,
  };
}

function ej_evalAll(train, ws, network, n_ctx) {
  var ctx = Array(n_ctx).fill(0), results = [];
  for (var i = 0; i < train.length; i++) {
    var p   = train[i];
    var fwd = ej_forward([p.x1, p.x2], ctx, ws);
    var yc  = fwd.y >= 0.5 ? 1 : 0;
    results.push({y: fwd.y, y_star: fwd.y_star, y_class: yc, ok: yc === p.d});
    ctx = network === 'elman' ? fwd.z.slice() : [fwd.y];
  }
  return results;
}

function ej_score(results) {
  var ok = results.filter(function(r){return r.ok;}).length;
  return {correct: ok, errors: results.length-ok, total: results.length,
          pct: results.length ? Math.round(ok/results.length*1000)/10 : 0};
}

function ej_run(dataset, network, alpha, n_iters, seed) {
  var train  = EJ_DATASETS[dataset];
  var n_ctx  = network === 'elman' ? 2 : 1;
  var ws     = ej_initWeights(network, seed || 42);
  var ws_init = ej_copyWs(ws);
  var steps  = [];

  for (var iter = 1; iter <= n_iters; iter++) {
    var ctx = Array(n_ctx).fill(0);

    for (var pi = 0; pi < train.length; pi++) {
      var p        = train[pi];
      var x        = [p.x1, p.x2];
      var ws_before  = ej_copyWs(ws);
      var ctx_before = ctx.slice();

      var bp = ej_backprop(x, ctx, p.d, ws, alpha);
      ws  = bp.new_ws;
      ctx = network === 'elman' ? bp.fwd.z.slice() : [bp.fwd.y];

      var all_res = ej_evalAll(train, ws, network, n_ctx);

      steps.push({
        iter: iter, pi: pi, pattern: p,
        x: x, ctx: ctx_before,
        forward:     bp.fwd,
        delta_out:   bp.delta_out,
        delta_h:     bp.delta_h,
        dW:          bp.dW,
        d_theta_o:   bp.d_theta_o,
        dWa:         bp.dWa,
        dWb:         bp.dWb,
        d_theta_h:   bp.d_theta_h,
        mse:         ej_r6(0.5 * Math.pow(p.d - bp.fwd.y, 2)),
        weights_before: ws_before,
        weights_after:  ej_copyWs(ws),
        train_results:  all_res,
        train_score:    ej_score(all_res),
      });
    }
  }

  var final_results = ej_evalAll(train, ws, network, n_ctx);

  return {
    config: {dataset:dataset, network:network, alpha:alpha,
             n_iters:n_iters, seed:seed||42, n_train:train.length, n_ctx:n_ctx},
    init_weights:  ws_init,
    steps:         steps,
    final_weights: ws,
    final_results: final_results,
    final_score:   ej_score(final_results),
  };
}
