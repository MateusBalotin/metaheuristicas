// ── Burma14 TSP data ──────────────────────────────────────────────────────────
var BURMA14 = [
  {id:1,  x:16.47, y:96.10},
  {id:2,  x:16.47, y:94.44},
  {id:3,  x:20.09, y:92.54},
  {id:4,  x:22.39, y:93.37},
  {id:5,  x:25.23, y:97.24},
  {id:6,  x:22.00, y:96.05},
  {id:7,  x:20.47, y:97.02},
  {id:8,  x:17.20, y:96.29},
  {id:9,  x:16.30, y:97.38},
  {id:10, x:14.05, y:98.12},
  {id:11, x:16.53, y:97.38},
  {id:12, x:21.52, y:95.59},
  {id:13, x:19.41, y:97.13},
  {id:14, x:20.09, y:94.55},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function tsp_r4(n)  { return Math.round(n * 1e4) / 1e4; }
function tsp_r2(n)  { return Math.round(n * 100)  / 100;  }

function tsp_euclid(ax, ay, bx, by) {
  var dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function tsp_ringDist(i, j, n) {
  var d = Math.abs(i - j);
  return Math.min(d, n - d);
}

function tsp_initWeights(n_neurons) {
  var cx = 0, cy = 0, nc = BURMA14.length;
  BURMA14.forEach(function(c) { cx += c.x; cy += c.y; });
  cx /= nc; cy /= nc;
  // Ellipse around centroid — proportional to city spread
  var rx = 3.2, ry = 1.6;
  var W = [];
  for (var i = 0; i < n_neurons; i++) {
    var a = 2 * Math.PI * i / n_neurons;
    W.push([tsp_r4(cx + rx * Math.cos(a)), tsp_r4(cy + ry * Math.sin(a))]);
  }
  return W;
}

// ── Main algorithm ────────────────────────────────────────────────────────────
function tsp_run(alpha0, n_iters, n_neurons, radius0) {
  var cities = BURMA14, nc = cities.length;
  var W      = tsp_initWeights(n_neurons);
  var initW  = W.map(function(w) { return w.slice(); });
  var steps  = [];

  for (var iter = 1; iter <= n_iters; iter++) {
    var alpha  = tsp_r4(alpha0 * Math.pow(0.5, iter - 1));
    // Radius decays linearly: starts at radius0, ends at 0
    var radius = Math.max(0, Math.round(radius0 * (1 - (iter - 1) / Math.max(n_iters - 1, 1))));

    for (var pi = 0; pi < nc; pi++) {
      var c      = cities[pi];
      var wBefore = W.map(function(w) { return w.slice(); });

      // Compute distances to all neurons
      var dists = W.map(function(w) { return tsp_r4(tsp_euclid(c.x, c.y, w[0], w[1])); });

      // Find winner (BMU)
      var winner = 0;
      for (var i = 1; i < n_neurons; i++)
        if (dists[i] < dists[winner]) winner = i;

      // Neighborhood (ring topology)
      var nbrs = [];
      for (var i = 0; i < n_neurons; i++)
        if (tsp_ringDist(i, winner, n_neurons) <= radius) nbrs.push(i);

      // Update winner + neighbors
      var deltas = [];
      for (var i = 0; i < n_neurons; i++) {
        if (nbrs.indexOf(i) !== -1) {
          var old = W[i].slice();
          var dx  = tsp_r4(alpha * (c.x - W[i][0]));
          var dy  = tsp_r4(alpha * (c.y - W[i][1]));
          W[i][0] = tsp_r4(W[i][0] + dx);
          W[i][1] = tsp_r4(W[i][1] + dy);
          deltas.push({ n: i, old: old, delta: [dx, dy], nw: W[i].slice() });
        }
      }

      steps.push({
        iter: iter, pi: pi, alpha: alpha, radius: radius,
        city: { id: c.id, label: 'C' + c.id, x: c.x, y: c.y },
        dists: dists, winner: winner, neighbors: nbrs, deltas: deltas,
        weights_before: wBefore,
        weights_after:  W.map(function(w) { return w.slice(); })
      });
    }
  }

  // Final: assign each city to its BMU
  var finalMap = cities.map(function(c) {
    var ds  = W.map(function(w) { return tsp_euclid(c.x, c.y, w[0], w[1]); });
    var win = 0;
    for (var i = 1; i < n_neurons; i++) if (ds[i] < ds[win]) win = i;
    return { id: c.id, label: 'C' + c.id, x: c.x, y: c.y, winner: win, dist: tsp_r4(ds[win]) };
  });

  // Tour: order cities by BMU index around the ring
  var tour = finalMap.slice().sort(function(a, b) { return a.winner - b.winner; });
  var tourDist = 0;
  for (var i = 0; i < tour.length; i++) {
    var nxt = tour[(i + 1) % tour.length];
    tourDist += tsp_euclid(tour[i].x, tour[i].y, nxt.x, nxt.y);
  }

  return {
    steps: steps,
    final_weights: W.map(function(w) { return w.slice(); }),
    init_weights: initW,
    final_mapping: finalMap,
    tour: tour,
    tour_dist: tsp_r2(tourDist),
    config: { nc: nc, n_neurons: n_neurons, alpha: alpha0, n_iters: n_iters, radius0: radius0 }
  };
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function TSP_CanvasRenderer(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

TSP_CanvasRenderer.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

TSP_CanvasRenderer.prototype.draw = function(weights, step, isFinal, finalMap) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 38;

  // Bounding box over cities + neurons
  var allX = BURMA14.map(function(c) { return c.x; }).concat(weights.map(function(w) { return w[0]; }));
  var allY = BURMA14.map(function(c) { return c.y; }).concat(weights.map(function(w) { return w[1]; }));
  var minX = Math.min.apply(null, allX) - 0.8;
  var maxX = Math.max.apply(null, allX) + 0.8;
  var minY = Math.min.apply(null, allY) - 0.8;
  var maxY = Math.max.apply(null, allY) + 0.8;
  var rangeX = maxX - minX, rangeY = maxY - minY;

  var drawW = CW - 2 * PAD, drawH = CH - 2 * PAD;
  // Maintain aspect ratio
  var scale = Math.min(drawW / rangeX, drawH / rangeY);
  var offX  = PAD + (drawW - rangeX * scale) / 2;
  var offY  = PAD + (drawH - rangeY * scale) / 2;

  function px(x) { return offX + (x - minX) * scale; }
  function py(y) { return offY + (maxY - y) * scale; }   // flip y (north-up)

  var nn = weights.length;

  // ── Draw final tour (dashed green lines) ──────────────────────────────────
  if (isFinal && finalMap) {
    var tour = finalMap.slice().sort(function(a, b) { return a.winner - b.winner; });
    ctx.save();
    ctx.strokeStyle = dk ? 'rgba(95,205,100,0.65)' : 'rgba(30,150,40,0.55)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(px(tour[0].x), py(tour[0].y));
    for (var i = 1; i < tour.length; i++) ctx.lineTo(px(tour[i].x), py(tour[i].y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ── Draw neuron ring connections ───────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? 'rgba(239,159,39,0.45)' : 'rgba(220,140,20,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(weights[0][0]), py(weights[0][1]));
  for (var i = 1; i < nn; i++) ctx.lineTo(px(weights[i][0]), py(weights[i][1]));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // ── Draw neurons ───────────────────────────────────────────────────────────
  for (var i = 0; i < nn; i++) {
    var wx = px(weights[i][0]), wy = py(weights[i][1]);
    var isWin = step && step.winner === i;
    var isNbr = step && step.neighbors && step.neighbors.indexOf(i) !== -1 && !isWin;
    var r = isWin ? 5 : (isNbr ? 4 : 3);
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, 2 * Math.PI);
    ctx.fillStyle = isWin ? '#EF9F27' : (isNbr ? (dk ? '#5DCAA5' : '#0F6E56') : (dk ? '#55524a' : '#bbb8b0'));
    ctx.fill();
    if (isWin) {
      ctx.strokeStyle = '#EF9F27';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, 9, 0, 2 * Math.PI);
      ctx.stroke();
    }
    // Neuron index label (small, for first neuron to show ring start)
    if (i === 0) {
      ctx.fillStyle = dk ? '#888780' : '#888780';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('n1', wx, wy - 7);
    }
  }

  // ── Draw cities ────────────────────────────────────────────────────────────
  BURMA14.forEach(function(c) {
    var isCur = step && step.city.id === c.id;
    var cxp = px(c.x), cyp = py(c.y);
    // City circle
    ctx.beginPath();
    ctx.arc(cxp, cyp, isCur ? 7 : 5, 0, 2 * Math.PI);
    ctx.fillStyle = isCur ? '#4a9eff' : (dk ? '#6d8fa8' : '#4a7090');
    ctx.fill();
    if (isCur) {
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cxp, cyp, 11, 0, 2 * Math.PI);
      ctx.stroke();
    }
    // City label
    ctx.fillStyle = dk ? '#c2c0b6' : '#333';
    ctx.font = (isCur ? 'bold ' : '') + '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.id, cxp + 7, cyp - 3);
  });

  // ── Axis tick labels ───────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('x:' + minX.toFixed(1), PAD - 2, CH - 6);
  ctx.textAlign = 'left';
  ctx.fillText(maxX.toFixed(1), CW - PAD + 2, CH - 6);
  ctx.save();
  ctx.translate(10, CH - PAD);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'right';
  ctx.fillText('y:' + minY.toFixed(1), 0, 0);
  ctx.restore();

  // ── Final: show tour distance ──────────────────────────────────────────────
  if (isFinal && finalMap) {
    var td = 0;
    var tour2 = finalMap.slice().sort(function(a, b) { return a.winner - b.winner; });
    for (var i = 0; i < tour2.length; i++) {
      var nxt = tour2[(i + 1) % tour2.length];
      td += tsp_euclid(tour2[i].x, tour2[i].y, nxt.x, nxt.y);
    }
    ctx.fillStyle = dk ? '#5DCAA5' : '#0F6E56';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Tour ≈ ' + (Math.round(td * 100) / 100).toFixed(2) + ' units', PAD, CH - 8);
  }
};

// ── Panel builders ────────────────────────────────────────────────────────────
function tsp_phaseLabel(phase) {
  var labels = [['1','apresentar cidade','b1'],['2','encontrar BMU','b2'],['3','atualizar pesos','b4']];
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  labels.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

function tsp_buildPanel(step, phase, cfg) {
  var c    = step.city;
  var html = tsp_phaseLabel(phase);

  // Step info bar
  html += '<div class="card"><div class="ct">Cidade <strong>' + c.label + '</strong>' +
    ' — passo ' + (step.pi + 1) + '/' + cfg.nc +
    ' — iter ' + step.iter + '/' + cfg.n_iters +
    ' — α=' + step.alpha + ' — raio=' + step.radius + '</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2;color:var(--text2)">' +
    'x<sub>entrada</sub> = [' + c.x + ', ' + c.y + ']</div></div>';

  if (phase === 0) {
    // Show current neuron weights (top 8 only to save space)
    html += '<div class="card"><div class="ct">Passo 1 — Apresentar cidade a todos os neurônios</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Cada neurônio computará: d<sub>i</sub> = √[(x−w<sub>x</sub>)² + (y−w<sub>y</sub>)²]</div>';
    html += '<div style="font-size:10px;color:var(--text3);margin-bottom:6px">Posições dos neurônios (anel com ' + cfg.n_neurons + ' neurônios):</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;margin-top:4px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">neurônio</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_x</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_y</th></tr></thead><tbody>';
    var show = Math.min(step.weights_before.length, 10);
    for (var i = 0; i < show; i++) {
      var w = step.weights_before[i];
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 4px;color:var(--text3)">n' + (i + 1) + '</td>' +
        '<td style="text-align:right;padding:2px 4px">' + w[0].toFixed(4) + '</td>' +
        '<td style="text-align:right;padding:2px 4px">' + w[1].toFixed(4) + '</td></tr>';
    }
    if (show < step.weights_before.length)
      html += '<tr><td colspan="3" style="padding:2px 4px;color:var(--text3);text-align:center">… ' + (step.weights_before.length - show) + ' mais …</td></tr>';
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Encontrar BMU (menor distância)</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'd<sub>i</sub> = √[(x−w<sub>xi</sub>)² + (y−w<sub>yi</sub>)²]  →  BMU = argmin d<sub>i</sub></div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400">neurônio</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">d<sub>i</sub></th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400"></th></tr></thead><tbody>';
    for (var i = 0; i < step.dists.length; i++) {
      var isWin = i === step.winner;
      html += '<tr style="border-top:0.5px solid var(--border3)' + (isWin ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">n' + (i + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:' + (isWin ? '700' : '400') + ';color:' +
        (isWin ? 'var(--warn)' : 'inherit') + '">' + step.dists[i].toFixed(4) + '</td>' +
        '<td style="text-align:center;padding:3px 6px">' + (isWin ? '← BMU 🏆' : '') + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      'Vizinhos (raio=' + step.radius + '): ' +
      step.neighbors.map(function(n) { return 'n' + (n + 1); }).join(', ') + '</div>';
    html += '</div>';

  } else if (phase === 2) {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar BMU e vizinhos</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'w<sub>i</sub>(novo) = w<sub>i</sub>(ant) + α · [x − w<sub>i</sub>(ant)] &nbsp; para i ∈ V (raio=' + step.radius + ')</div>';
    if (step.deltas.length === 0) {
      html += '<div style="padding:8px;color:var(--text3);font-size:11px">Nenhuma atualização (raio=0 e nenhum vizinho).</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
      html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">neurônio</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400">antes</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--info)">α·(x−w)</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--warn)">depois</th></tr></thead><tbody>';
      step.deltas.forEach(function(d) {
        var isWin = d.n === step.winner;
        html += '<tr style="border-top:0.5px solid var(--border3)' + (isWin ? ';background:var(--warn-bg)' : '') + '">' +
          '<td style="padding:2px 4px;color:var(--text3)">n' + (d.n + 1) + (isWin ? ' ★' : '') + '</td>' +
          '<td style="padding:2px 4px">[' + d.old[0].toFixed(4) + ', ' + d.old[1].toFixed(4) + ']</td>' +
          '<td style="padding:2px 4px;color:var(--info)">[' +
            (d.delta[0] >= 0 ? '+' : '') + d.delta[0].toFixed(4) + ', ' +
            (d.delta[1] >= 0 ? '+' : '') + d.delta[1].toFixed(4) + ']</td>' +
          '<td style="padding:2px 4px;font-weight:600;color:var(--warn)">[' + d.nw[0].toFixed(4) + ', ' + d.nw[1].toFixed(4) + ']</td></tr>';
      });
      html += '</tbody></table>';
    }
    html += '</div>';
  }
  return html;
}

function tsp_summaryPanel(exData) {
  var fw  = exData.final_weights;
  var cfg = exData.config;
  var fm  = exData.final_mapping;
  var tour = exData.tour;

  var html = '<div class="card"><div class="ct">🎯 Resultado final — SOM para TSP · anel de ' + cfg.n_neurons +
    ' neurônios · α=' + cfg.alpha + ' · ' + cfg.n_iters + ' iterações · raio₀=' + cfg.radius0 + '</div>';

  // City-to-BMU mapping
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Mapeamento cidade → BMU:</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px">';
  fm.forEach(function(r) {
    html += '<div style="padding:3px 9px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border2);font-family:monospace;font-size:10px">' +
      '<strong>' + r.label + '</strong> → n' + (r.winner + 1) + ' (d=' + r.dist.toFixed(4) + ')</div>';
  });
  html += '</div>';

  // Tour sequence
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Rota derivada (ordem dos BMUs no anel):</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text2);padding:8px 12px;background:var(--bg2);border-radius:6px;border:0.5px solid var(--border3);margin-bottom:12px;line-height:2">';
  html += tour.map(function(r) { return r.label; }).join(' → ') + ' → ' + tour[0].label;
  html += '</div>';

  // Tour distance
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:14px">';
  html += '📏 Distância total da rota ≈ <strong>' + exData.tour_dist + '</strong> unidades';
  html += '</div>';

  // Final neuron positions (first 10)
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Posições finais dos neurônios:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;margin-bottom:8px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">neurônio</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_x</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_y</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">cidade(s) mapeada(s)</th></tr></thead><tbody>';
  var cityByNeuron = {};
  fm.forEach(function(r) {
    if (!cityByNeuron[r.winner]) cityByNeuron[r.winner] = [];
    cityByNeuron[r.winner].push(r.label);
  });
  for (var i = 0; i < fw.length; i++) {
    var mapped = cityByNeuron[i] ? cityByNeuron[i].join(', ') : '—';
    html += '<tr style="border-top:0.5px solid var(--border3)' + (cityByNeuron[i] ? ';background:var(--info-bg)' : '') + '">' +
      '<td style="padding:2px 6px;color:var(--text3)">n' + (i + 1) + '</td>' +
      '<td style="text-align:right;padding:2px 6px">' + fw[i][0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 6px">' + fw[i][1].toFixed(4) + '</td>' +
      '<td style="padding:2px 6px;color:var(--info)">' + mapped + '</td></tr>';
  }
  html += '</tbody></table></div>';
  return html;
}
