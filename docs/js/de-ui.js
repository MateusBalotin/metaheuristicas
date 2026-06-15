// ED - renderizacao do plot 2D (mapa de calor + populacao) e paineis

function DeCanvas(canvasEl, fFunc, bounds, objective) {
  this.cv = canvasEl; this.ctx = canvasEl.getContext('2d');
  this.CW = canvasEl.width; this.CH = canvasEl.height;
  this.f = fFunc; this.bounds = bounds; this.objective = objective;
}
DeCanvas.prototype.isDk = function () {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};
DeCanvas.prototype.draw = function (pop, xbest, best) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  var lo = this.bounds[0], hi = this.bounds[1], f = this.f;
  ctx.clearRect(0, 0, CW, CH);
  var PAD = 32;
  var dW = CW - 2 * PAD, dH = CH - 2 * PAD;
  function px(x) { return PAD + (x - lo) / (hi - lo) * dW; }
  function py(y) { return PAD + dH - (y - lo) / (hi - lo) * dH; }

  // mapa de calor da funcao
  var step = 6, vmin = Infinity, vmax = -Infinity, grid = [];
  for (var sx = 0; sx < dW; sx += step) {
    for (var sy = 0; sy < dH; sy += step) {
      var X = lo + (sx / dW) * (hi - lo);
      var Y = hi - (sy / dH) * (hi - lo);
      var v = f(X, Y);
      grid.push([sx, sy, v]);
      if (v < vmin) vmin = v; if (v > vmax) vmax = v;
    }
  }
  grid.forEach(function (g) {
    var t = (g[2] - vmin) / (vmax - vmin || 1);
    // azul (baixo) -> vermelho (alto)
    var r = Math.round(40 + 180 * t), b = Math.round(200 - 160 * t);
    ctx.fillStyle = 'rgba(' + r + ',' + Math.round(80 + 40 * t) + ',' + b + ',' + (dk ? 0.5 : 0.32) + ')';
    ctx.fillRect(PAD + g[0], PAD + g[1], step, step);
  });

  // eixos 0
  ctx.strokeStyle = dk ? '#55524a' : '#c8c5bc'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(px(0), PAD); ctx.lineTo(px(0), CH - PAD); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD, py(0)); ctx.lineTo(CW - PAD, py(0)); ctx.stroke();

  // populacao
  (pop || []).forEach(function (p) {
    ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#4a9eff'; ctx.fill();
    ctx.strokeStyle = dk ? '#1a1a18' : '#fff'; ctx.lineWidth = 1; ctx.stroke();
  });
  // xbest (alvo)
  if (xbest) {
    ctx.beginPath(); ctx.arc(px(xbest[0]), py(xbest[1]), 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#EF9F27'; ctx.fill();
    ctx.strokeStyle = dk ? '#1a1a18' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // melhor global
  if (best) {
    ctx.save(); ctx.strokeStyle = dk ? '#6ee7b7' : '#065f46'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px(best[0]), py(best[1]), 10, 0, 2 * Math.PI); ctx.stroke();
    ctx.restore();
  }

  // rotulos eixos
  ctx.fillStyle = dk ? '#8a8579' : '#9a9589'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  [lo, 0, hi].forEach(function (x) { ctx.fillText(x, px(x), CH - PAD + 13); });
  ctx.textAlign = 'right';
  [lo, 0, hi].forEach(function (y) { ctx.fillText(y, PAD - 4, py(y) + 3); });
};

function de_fmtVec(v) { return '(' + v[0].toFixed(2) + ', ' + v[1].toFixed(2) + ')'; }

function de_popTable(pop, fvals, opts) {
  opts = opts || {};
  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">i</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">y</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">f(x,y)</th>' +
    '</tr></thead><tbody>';
  pop.forEach(function (p, i) {
    var isBest = opts.bestIdx === i;
    html += '<tr style="border-top:0.5px solid var(--border3)' + (isBest ? ';background:var(--warn-bg)' : '') + '">' +
      '<td style="padding:2px 4px;color:var(--text3)">' + (i + 1) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + p[0].toFixed(2) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + p[1].toFixed(2) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:' + (isBest ? '700' : '400') +
        ';color:' + (isBest ? 'var(--warn)' : 'inherit') + '">' + fvals[i].toFixed(4) + '</td></tr>';
  });
  return html + '</tbody></table>';
}

function de_buildInit(data) {
  var c = data.config;
  var html = '<div class="card"><div class="ct">' +
    (c.objective === 'minimizar' ? 'Atividade 14.1' : 'Atividade 14.2') + ' - ED ' + c.objective + '</div>' +
    '<div style="font-family:monospace;font-size:12px;color:var(--text2);margin-bottom:4px">' + c.expr + '</div>' +
    '<div style="font-size:12px;color:var(--text2)">x,y in [' + c.bounds[0] + ',' + c.bounds[1] + '] · ' +
    c.n_iter + ' iteracoes · P_CR=' + c.p_cr + ' · F=' + (c.F !== undefined ? c.F : c.F_mode) +
    ' · alvo: ' + c.target + '</div></div>';
  var fvals = data.init_pop.map(function (p) { return data._f(p[0], p[1]); });
  var bi = de_bestIdx(fvals, c.objective);
  html += '<div class="card"><div class="ct">Populacao inicial (6 individuos)</div>' +
    de_popTable(data.init_pop, fvals, { bestIdx: bi }) + '</div>';
  return html;
}

function de_bestIdx(fvals, objective) {
  var bi = 0;
  for (var i = 1; i < fvals.length; i++) {
    if (objective === 'minimizar' ? fvals[i] < fvals[bi] : fvals[i] > fvals[bi]) bi = i;
  }
  return bi;
}

function de_buildEval(data, g) {
  var c = data.config;
  var bi = de_bestIdx(g.fvals, c.objective);
  var html = '<div class="card"><div class="ct">Iteracao ' + g.iter + ' - populacao e vetor alvo</div>';
  html += de_popTable(g.pop, g.fvals, { bestIdx: bi });
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text2)">vetor alvo x_best = ' +
    de_fmtVec(g.xbest) + ' (f=' + g.xbest_f.toFixed(4) + ')</div></div>';
  return html;
}

function de_buildTrials(data, g) {
  var c = data.config;
  var html = '<div class="card"><div class="ct">Iteracao ' + g.iter + ' - mutacao, cruzamento e selecao</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">' +
    'u = x_best + F*(x_r1 - x_r2) · crossover P_CR=' + c.p_cr +
    ' · aceita se f(filho) ' + (c.objective === 'minimizar' ? '<' : '>') + ' f(x_i)</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 3px;font-weight:400">i</th>' +
    '<th style="text-align:right;padding:2px 3px;font-weight:400">F</th>' +
    '<th style="text-align:left;padding:2px 3px;font-weight:400">u (teste)</th>' +
    '<th style="text-align:left;padding:2px 3px;font-weight:400">filho</th>' +
    '<th style="text-align:right;padding:2px 3px;font-weight:400">f</th>' +
    '<th style="text-align:right;padding:2px 3px;font-weight:400">f(x_i)</th>' +
    '<th style="padding:2px 3px"></th></tr></thead><tbody>';
  g.trials.forEach(function (t) {
    html += '<tr style="border-top:0.5px solid var(--border3)' + (t.accept ? ';background:var(--success-bg)' : '') + '">' +
      '<td style="padding:2px 3px;color:var(--text3)">' + (t.i + 1) + '</td>' +
      '<td style="text-align:right;padding:2px 3px">' + t.F.toFixed(3) + '</td>' +
      '<td style="padding:2px 3px">' + de_fmtVec(t.u) + '</td>' +
      '<td style="padding:2px 3px">' + de_fmtVec(t.child) + '</td>' +
      '<td style="text-align:right;padding:2px 3px;font-weight:' + (t.accept ? '700' : '400') + '">' + t.f_child.toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 3px;color:var(--text3)">' + t.f_xi.toFixed(4) + '</td>' +
      '<td style="text-align:center;padding:2px 3px;color:' + (t.accept ? 'var(--success)' : 'var(--text3)') + '">' +
        (t.accept ? 'aceita' : '-') + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;padding:6px 10px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px">melhor ate agora: ' + de_fmtVec(g.best_so_far.vec) +
    ' · f=' + g.best_so_far.f.toFixed(4) + '</div></div>';
  return html;
}

function de_buildSummary(data) {
  var c = data.config, b = data.best;
  var html = '<div class="card"><div class="ct">Resultado final - ED ' +
    (c.objective === 'minimizar' ? '14.1' : '14.2') + '</div>';
  html += '<div style="font-family:monospace;font-size:13px;padding:8px 12px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px;margin-bottom:10px">' +
    (c.objective === 'minimizar' ? 'minimo' : 'maximo') + ': ' + de_fmtVec(b.vec) +
    ' · f = ' + b.f.toFixed(4) + '</div>';
  var last = data.iterations[data.iterations.length - 1];
  var bi = de_bestIdx(last.new_fvals, c.objective);
  html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">populacao final:</div>';
  html += de_popTable(last.new_pop, last.new_fvals, { bestIdx: bi });
  html += '</div>';
  return html;
}

function de_buildSteps(data) {
  var steps = [{ kind: 'init' }];
  data.iterations.forEach(function (g, gi) {
    steps.push({ kind: 'eval', gi: gi });
    steps.push({ kind: 'trials', gi: gi });
  });
  steps.push({ kind: 'summary' });
  return steps;
}
