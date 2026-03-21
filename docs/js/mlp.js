// ── MLP Backpropagation (Algorithm 2) ────────────────────────────────────────
// Architecture: n inputs → p hidden neurons (sigmoid) → 1 output (sigmoid)
// Uses same 22-train / 8-test dataset as Perceptron ex5 / Adaline ex4.
//
// Algorithm 2 update rules (from apostila):
//   Forward:
//     z_j* = Σ_i v_ij·x_i + θa_j    z_j = σ(z_j*)     j=1..p
//     y*   = Σ_j w_j·z_j  + θb       y   = σ(y*)
//   Output corrections:
//     Δw_j  = α·y·(1−y)·(d−y)·z_j    →  w_j  = w_j  + Δw_j
//     Δθb   = α·y·(1−y)·(d−y)        →  θb   = θb   + Δθb
//   Hidden corrections:
//     Δv_ij = α·(d−y)·y·(1−y)·w_j·z_j·(1−z_j)·x_i  →  v_ij = v_ij + Δv_ij
//     Δθa_j = α·(d−y)·y·(1−y)·w_j·z_j·(1−z_j)       →  θa_j = θa_j + Δθa_j
// ─────────────────────────────────────────────────────────────────────────────

// ── Config ───────────────────────────────────────────────────────────────────
var MLP_EXERCISES = {
  'mlp-ex5': {
    name:    'Atividade 2.2 — MLP Backpropagation',
    alpha:   0.5,
    nHidden: 4,
    nIters:  3,
    seed:    42,
    get train()  { return EXERCISES.ex5.train;  },
    get test()   { return EXERCISES.ex5.test;   },
    get canvas() { return EXERCISES.ex5.canvas; },
  },
};

// ── Maths ─────────────────────────────────────────────────────────────────────
function sigmoid(x)  { return 1 / (1 + Math.exp(-x)); }
function mr6(n) { return Math.round(n * 1e6) / 1e6; }
function mr4(n) { return Math.round(n * 1e4) / 1e4; }

// ── Seeded RNG (mulberry32) ───────────────────────────────────────────────────
function mlpRNG(seed) {
  var s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Weight initialisation ─────────────────────────────────────────────────────
// Returns { V[p][n], thetaA[p], W[p], thetaB }
function mlpInitWeights(nInputs, nHidden, seed) {
  var rng = mlpRNG(seed);
  var rand = function() { return mr4((rng() * 2 - 1) * 0.5); };
  var V = [], thetaA = [], W = [];
  for (var j = 0; j < nHidden; j++) {
    var row = [];
    for (var i = 0; i < nInputs; i++) row.push(rand());
    V.push(row);
    thetaA.push(rand());
    W.push(rand());
  }
  return { V: V, thetaA: thetaA, W: W, thetaB: rand() };
}

function mlpCopyWeights(ws) {
  return {
    V:      ws.V.map(function(r) { return r.slice(); }),
    thetaA: ws.thetaA.slice(),
    W:      ws.W.slice(),
    thetaB: ws.thetaB,
  };
}

// ── Forward pass ──────────────────────────────────────────────────────────────
function mlpForward(x, ws) {
  var p = ws.W.length;
  var zStar = [], z = [];
  for (var j = 0; j < p; j++) {
    var zs = ws.thetaA[j];
    for (var i = 0; i < x.length; i++) zs += ws.V[j][i] * x[i];
    zs = mr6(zs);
    zStar.push(zs);
    z.push(mr6(sigmoid(zs)));
  }
  var yStar = ws.thetaB;
  for (var j = 0; j < p; j++) yStar += ws.W[j] * z[j];
  yStar = mr6(yStar);
  return { zStar: zStar, z: z, yStar: mr6(yStar), y: mr6(sigmoid(yStar)) };
}

// ── One backprop step ─────────────────────────────────────────────────────────
function mlpBackprop(x, d, ws, alpha) {
  var fwd     = mlpForward(x, ws);
  var y       = fwd.y, z = fwd.z;
  var p       = ws.W.length;
  var newWs   = mlpCopyWeights(ws);

  // δ_out = y·(1−y)·(d−y)
  var deltaOut = mr6(y * (1 - y) * (d - y));

  // Output layer updates
  var dW = [], dThetaB = mr6(alpha * deltaOut);
  for (var j = 0; j < p; j++) {
    var dw = mr6(alpha * deltaOut * z[j]);
    dW.push(dw);
    newWs.W[j]  = mr6(ws.W[j] + dw);
  }
  newWs.thetaB = mr6(ws.thetaB + dThetaB);

  // Hidden layer updates
  // δ_j = (d−y)·y·(1−y)·w_j·z_j·(1−z_j)  = deltaOut · w_j · z_j·(1−z_j)
  var deltaH = [], dV = [], dThetaA = [];
  for (var j = 0; j < p; j++) {
    var dh = mr6(deltaOut * ws.W[j] * z[j] * (1 - z[j]));
    deltaH.push(dh);
    var dvRow = [];
    for (var i = 0; i < x.length; i++) {
      var dv = mr6(alpha * dh * x[i]);
      dvRow.push(dv);
      newWs.V[j][i] = mr6(ws.V[j][i] + dv);
    }
    dV.push(dvRow);
    var dta = mr6(alpha * dh);
    dThetaA.push(dta);
    newWs.thetaA[j] = mr6(ws.thetaA[j] + dta);
  }

  return {
    fwd: fwd, deltaOut: deltaOut, deltaH: deltaH,
    dW: dW, dThetaB: dThetaB, dV: dV, dThetaA: dThetaA,
    newWs: newWs,
  };
}

// ── Evaluate all patterns ─────────────────────────────────────────────────────
function mlpEvalAll(dataset, ws) {
  return dataset.map(function(p) {
    var fwd    = mlpForward([p.x1, p.x2], ws);
    var yClass = fwd.y >= 0.5 ? 1 : -1;
    return { y: fwd.y, yStar: fwd.yStar, yClass: yClass, ok: yClass === p.d };
  });
}

function mlpScore(results) {
  var ok = results.filter(function(r) { return r.ok; }).length;
  return { correct: ok, errors: results.length - ok, total: results.length,
           pct: Math.round(ok / results.length * 100) };
}

// ── Build all steps ───────────────────────────────────────────────────────────
// 3 phases per pattern:  0=forward  1=output-update  2=hidden-update
function buildMLPSteps(exId, nHidden, seed, alpha) {
  var cfg   = MLP_EXERCISES[exId];
  nHidden   = (nHidden !== undefined) ? nHidden : cfg.nHidden;
  seed      = (seed    !== undefined) ? seed    : cfg.seed;
  alpha     = (alpha   !== undefined) ? alpha   : cfg.alpha;

  var train = cfg.train, test = cfg.test;
  var ws    = mlpInitWeights(2, nHidden, seed);
  var steps = [];

  for (var iter = 1; iter <= cfg.nIters; iter++) {
    for (var pi = 0; pi < train.length; pi++) {
      var p      = train[pi];
      var wsBefore = mlpCopyWeights(ws);
      var bp     = mlpBackprop([p.x1, p.x2], p.d, ws, alpha);
      ws         = bp.newWs;

      var mse    = mr6(0.5 * Math.pow(p.d - bp.fwd.y, 2));
      var allRes = mlpEvalAll(train, ws);

      steps.push({
        iter: iter, pi: pi, p: p,
        wsBefore: wsBefore,
        wsAfter:  mlpCopyWeights(ws),
        fwd:      bp.fwd,
        deltaOut: bp.deltaOut,
        deltaH:   bp.deltaH,
        dW:       bp.dW,  dThetaB:  bp.dThetaB,
        dV:       bp.dV,  dThetaA:  bp.dThetaA,
        mse:      mse,
        trainResults: allRes,
        trainScore:   mlpScore(allRes),
        trainPts:     train,
      });
    }
  }

  var testRes = mlpEvalAll(test, ws);
  return {
    steps:        steps,
    finalWs:      ws,
    initWs:       mlpInitWeights(2, nHidden, seed),
    testAnnotated: test.map(function(p, i) { return Object.assign({}, p, testRes[i]); }),
    testScore:    mlpScore(testRes),
    cfg: cfg, exId: exId, nHidden: nHidden, alpha: alpha, seed: seed,
  };
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function MLPCanvasRenderer(canvasEl, exId) {
  var self    = this;
  self.cv     = canvasEl;
  self.ctx    = canvasEl.getContext('2d');
  self.CW     = canvasEl.width;
  self.CH     = canvasEl.height;
  self.PAD    = 52;
  self.cfg    = MLP_EXERCISES[exId].canvas;

  self.isDk = function() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
  };

  self.tx = function(v) {
    var c = self.cfg;
    return self.PAD + (v - c.x1min) / (c.x1max - c.x1min) * (self.CW - 2 * self.PAD);
  };
  self.ty = function(v) {
    var c = self.cfg;
    var ymin = c.ydefMin, ymax = c.ydefMax;
    return self.CH - self.PAD - (v - ymin) / (ymax - ymin) * (self.CH - 2 * self.PAD);
  };

  // Draw decision region heatmap + grid + data points
  self.draw = function(ws, curPi, dataset, isTest, trainResults) {
    var dk  = self.isDk();
    var ctx = self.ctx, CW = self.CW, CH = self.CH, PAD = self.PAD;
    var cfg = self.cfg;
    var ymin = cfg.ydefMin, ymax = cfg.ydefMax;
    var tx = self.tx.bind(self), ty = self.ty.bind(self);

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
    ctx.fillRect(0, 0, CW, CH);

    // ── Decision region heatmap ─────────────────────────────────────────
    if (ws) {
      var imgW = CW - 2 * PAD, imgH = CH - 2 * PAD;
      var imgData = ctx.createImageData(imgW, imgH);
      var posR = dk ? [29,158,117] : [29,200,140];
      var negR = dk ? [216,90,48]  : [220,80,40];

      for (var px = 0; px < imgW; px++) {
        var x1v = cfg.x1min + (px / imgW) * (cfg.x1max - cfg.x1min);
        for (var py = 0; py < imgH; py++) {
          var x2v = ymax - (py / imgH) * (ymax - ymin);
          var fwd = mlpForward([x1v, x2v], ws);
          var conf = Math.abs(fwd.y - 0.5) * 2; // 0..1 confidence
          var alpha_px = Math.round(conf * (dk ? 120 : 100));
          var col = fwd.y >= 0.5 ? posR : negR;
          var idx = (py * imgW + px) * 4;
          imgData.data[idx]     = col[0];
          imgData.data[idx + 1] = col[1];
          imgData.data[idx + 2] = col[2];
          imgData.data[idx + 3] = alpha_px;
        }
      }
      ctx.putImageData(imgData, PAD, PAD);
    }

    // ── Grid ─────────────────────────────────────────────────────────────
    var gridC = dk ? 'rgba(200,200,190,0.07)' : 'rgba(0,0,0,0.055)';
    var axC   = dk ? 'rgba(200,200,190,0.22)' : 'rgba(0,0,0,0.18)';
    var txC   = dk ? '#c2c0b6' : '#444441';
    var mutC  = dk ? '#888780' : '#888780';

    var ystep = (ymax - ymin) <= 3 ? 0.5 : 1.0;
    var y0    = Math.ceil(ymin / ystep) * ystep;

    ctx.strokeStyle = gridC; ctx.lineWidth = 0.5;
    for (var v = y0; v <= ymax + 0.001; v += ystep) {
      var rv = Math.round(v * 1000) / 1000;
      ctx.beginPath(); ctx.moveTo(PAD, ty(rv)); ctx.lineTo(CW - PAD, ty(rv)); ctx.stroke();
    }
    for (var xg = Math.ceil(cfg.x1min); xg <= cfg.x1max; xg++) {
      ctx.beginPath(); ctx.moveTo(tx(xg), PAD); ctx.lineTo(tx(xg), CH - PAD); ctx.stroke();
    }

    // ── Axes ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = axC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, PAD - 5); ctx.lineTo(PAD, CH - PAD + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD - 5, CH - PAD); ctx.lineTo(CW - PAD + 5, CH - PAD); ctx.stroke();
    ctx.fillStyle = txC; ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('x\u2081', CW - PAD + 16, CH - PAD + 3);
    ctx.textAlign = 'right';  ctx.fillText('x\u2082', PAD - 5, PAD - 12);
    ctx.font = '9px sans-serif'; ctx.fillStyle = mutC;
    ctx.textAlign = 'center';
    cfg.refX.forEach(function(rx) { ctx.fillText('x\u2081=' + rx, tx(rx), PAD - 5); });
    for (var xg = Math.ceil(cfg.x1min); xg <= cfg.x1max; xg++)
      ctx.fillText(xg, tx(xg), CH - PAD + 13);
    ctx.textAlign = 'right';
    for (var v = y0; v <= ymax + 0.001; v += ystep) {
      var rv = Math.round(v * 1000) / 1000;
      ctx.fillText(Number.isInteger(rv) ? String(rv) : rv.toFixed(ystep < 0.5 ? 2 : 1), PAD - 4, ty(rv) + 3);
    }

    // ── Data points ───────────────────────────────────────────────────────
    for (var i = 0; i < dataset.length; i++) {
      var p    = dataset[i];
      var ppx  = tx(p.x1), ppy = ty(p.x2);
      var isPos  = p.d === 1;
      var isCur  = !isTest && i === curPi;
      var ptok   = trainResults ? trainResults[i].ok
                                : (mlpForward([p.x1, p.x2], ws).y >= 0.5 ? 1 : -1) === p.d;

      if (ptok) {
        ctx.beginPath(); ctx.arc(ppx, ppy, 16, 0, Math.PI * 2);
        ctx.fillStyle = dk ? 'rgba(239,159,39,0.28)' : 'rgba(250,199,117,0.55)'; ctx.fill();
      }
      if (isCur) {
        ctx.beginPath(); ctx.arc(ppx, ppy, 17, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2; ctx.stroke();
      }
      var fillC   = isPos ? (dk ? 'rgba(29,158,117,0.9)' : 'rgba(29,158,117,0.88)')
                          : (dk ? 'rgba(216,90,48,0.9)'  : 'rgba(216,90,48,0.88)');
      var strokeC = isCur ? '#EF9F27' : (isPos ? (dk ? '#5DCAA5' : '#0F6E56') : (dk ? '#F0997B' : '#993C1D'));
      ctx.beginPath(); ctx.arc(ppx, ppy, 8, 0, Math.PI * 2);
      ctx.fillStyle = fillC; ctx.fill();
      ctx.strokeStyle = strokeC; ctx.lineWidth = isCur ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(p.n), ppx, ppy + 2.5);
    }
  };
}
