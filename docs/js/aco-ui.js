// ACO - renderizacao do canvas e dos paineis

// ── Canvas ─────────────────────────────────────────────────────────────────
function AcoCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}
AcoCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

// view: {tau, names, partialTour, currentCity, candidate, chosenEdge, fullTour, bestTour}
AcoCanvas.prototype.draw = function(cities, names, view) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 34;
  var xs = names.map(function(n){ return cities[n][0]; });
  var ys = names.map(function(n){ return cities[n][1]; });
  var minX = Math.min.apply(null, xs) - 1, maxX = Math.max.apply(null, xs) + 1;
  var minY = Math.min.apply(null, ys) - 1, maxY = Math.max.apply(null, ys) + 1;
  var rx = maxX - minX, ry = maxY - minY;
  var dW = CW - 2 * PAD, dH = CH - 2 * PAD;
  var sc = Math.min(dW / rx, dH / ry);
  var oX = PAD + (dW - rx * sc) / 2, oY = PAD + (dH - ry * sc) / 2;
  function px(x){ return oX + (x - minX) * sc; }
  function py(y){ return oY + (maxY - y) * sc; }

  // ── Pheromone edges (thickness ∝ τ) ──
  if (view.tau) {
    var maxTau = 0;
    for (var i = 0; i < names.length; i++)
      for (var j = i + 1; j < names.length; j++)
        if (view.tau[i][j] > maxTau) maxTau = view.tau[i][j];
    for (var i = 0; i < names.length; i++) {
      for (var j = i + 1; j < names.length; j++) {
        var t = view.tau[i][j];
        var lw = maxTau > 0 ? 0.4 + 4.4 * (t / maxTau) : 0.6;
        ctx.save();
        ctx.strokeStyle = dk ? 'rgba(147,197,253,0.30)' : 'rgba(24,95,165,0.22)';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(px(cities[names[i]][0]), py(cities[names[i]][1]));
        ctx.lineTo(px(cities[names[j]][0]), py(cities[names[j]][1]));
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Completed tour (green dashed loop) ──
  function drawTour(tour, color, dash, width) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px(cities[tour[0]][0]), py(cities[tour[0]][1]));
    for (var i = 1; i < tour.length; i++) ctx.lineTo(px(cities[tour[i]][0]), py(cities[tour[i]][1]));
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  if (view.bestTour) drawTour(view.bestTour, dk ? 'rgba(110,231,183,0.7)' : 'rgba(6,95,70,0.6)', [5,3], 2);
  if (view.fullTour) drawTour(view.fullTour, '#EF9F27', null, 2.4);

  // ── Partial path so far (solid orange) ──
  if (view.partialTour && view.partialTour.length > 1) {
    ctx.save();
    ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px(cities[view.partialTour[0]][0]), py(cities[view.partialTour[0]][1]));
    for (var i = 1; i < view.partialTour.length; i++)
      ctx.lineTo(px(cities[view.partialTour[i]][0]), py(cities[view.partialTour[i]][1]));
    ctx.stroke(); ctx.restore();
  }

  // ── Candidate edge being evaluated (blue dashed) ──
  if (view.currentCity && view.candidate) {
    ctx.save();
    ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 2; ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(px(cities[view.currentCity][0]), py(cities[view.currentCity][1]));
    ctx.lineTo(px(cities[view.candidate][0]),   py(cities[view.candidate][1]));
    ctx.stroke(); ctx.restore();
  }

  // ── Cities ──
  names.forEach(function(n) {
    var x = px(cities[n][0]), y = py(cities[n][1]);
    var isCur = view.currentCity === n;
    var visited = view.partialTour && view.partialTour.indexOf(n) !== -1;
    ctx.beginPath();
    ctx.arc(x, y, isCur ? 8 : 6, 0, 2 * Math.PI);
    ctx.fillStyle = isCur ? '#4a9eff' : (visited ? (dk ? '#6d8fa8' : '#4a7090') : (dk ? '#55524a' : '#c8c5bc'));
    ctx.fill();
    if (isCur) {
      ctx.save(); ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(n, x, y - 11);
  });
};

// ── Panel helpers ─────────────────────────────────────────────────────────
function _acoPhaseChips(active) {
  var chips = [['1','construir rota'], ['2','depósito Δτ'], ['3','atualizar τ']];
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  chips.forEach(function(c, i) {
    var on = i === active;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (on ? 'border2' : 'border3') + ');background:' + (on ? 'var(--bg2)' : 'transparent') +
      ';color:' + (on ? 'var(--text)' : 'var(--text3)') + '">' + c[0] + '. ' + c[1] + '</span>';
  });
  return html + '</div>';
}

function _fmt(x, d) { return Number(x).toFixed(d === undefined ? 4 : d); }

// Construction-step panel: choosing the next city from `current`
function buildAcoConstructPanel(itData, ant, step, cfg) {
  var html = _acoPhaseChips(0);
  html += '<div class="card"><div class="ct">Iteração ' + itData.iter + ' · Formiga ' + ant.k +
    ' (início ' + ant.start + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;color:var(--text2)">Rota parcial: ' +
    ant.tour.slice(0, ant.tour.indexOf(step.current) + 1).join(' → ') + '</div></div>';

  html += '<div class="card"><div class="ct">Regra de probabilidade · α=' + cfg.alpha +
    ' β=' + cfg.beta + '</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
    'p<sub>ij</sub> = (τ<sub>ij</sub><sup>α</sup>·η<sub>ij</sub><sup>β</sup>) / Σ<sub>l</sub>(τ<sub>il</sub><sup>α</sup>·η<sub>il</sub><sup>β</sup>)' +
    ' &nbsp;·&nbsp; η<sub>ij</sub> = 1/d<sub>ij</sub></div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">' + step.current + '→j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">τ</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">η</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">τ<sup>α</sup>η<sup>β</sup></th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">p</th>' +
    '<th style="padding:2px 4px"></th></tr></thead><tbody>';
  step.allowed.forEach(function(c, i) {
    var pick = c === step.chosen;
    html += '<tr style="border-top:0.5px solid var(--border3)' + (pick ? ';background:var(--warn-bg)' : '') + '">' +
      '<td style="padding:2px 4px;color:var(--text3)">' + step.current + c + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + _fmt(step.tau[i]) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + _fmt(step.eta[i]) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + _fmt(step.num[i]) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:' + (pick ? '700' : '400') +
        ';color:' + (pick ? 'var(--warn)' : 'inherit') + '">' + _fmt(step.probs[i]) + '</td>' +
      '<td style="text-align:center;padding:2px 4px">' + (pick ? '← escolhida' : '') + '</td></tr>';
  });
  html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 4px;color:var(--text3)">Σ</td>' +
    '<td colspan="2"></td><td style="text-align:right;padding:2px 4px;color:var(--text3)">' + _fmt(step.total) +
    '</td><td colspan="2"></td></tr>';
  html += '</tbody></table>';
  html += '<div style="margin-top:8px;font-size:11px;color:var(--text2)">Próxima cidade (roleta): <strong>' +
    step.chosen + '</strong></div></div>';
  return html;
}

// Ant-complete panel: tour finished, deposit computed
function buildAcoDepositPanel(itData, ant, cfg) {
  var html = _acoPhaseChips(1);
  html += '<div class="card"><div class="ct">Iteração ' + itData.iter + ' · Formiga ' + ant.k + ' — rota completa</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--bg2);' +
    'border-radius:6px;border:0.5px solid var(--border3);line-height:2">' +
    ant.tour.join(' → ') + ' → ' + ant.tour[0] + '</div>';
  html += '<div style="margin-top:8px;font-family:monospace;font-size:12px;color:var(--text2)">' +
    'L<sub>' + ant.k + '</sub> = <strong>' + _fmt(ant.length, 2) + '</strong></div>';
  html += '<div style="margin-top:6px;font-family:monospace;font-size:11px;color:var(--text3)">' +
    'Δτ = Q / L<sub>k</sub> = ' + cfg.Q + ' / ' + _fmt(ant.length, 2) +
    ' = <span class="hl">' + _fmt(ant.deposit) + '</span> em cada aresta da rota</div>';
  html += '</div>';
  return html;
}

// Pheromone-update panel: end of iteration global update
function buildAcoUpdatePanel(itData, cfg) {
  var html = _acoPhaseChips(2);
  html += '<div class="card"><div class="ct">Iteração ' + itData.iter +
    ' — atualização global · ρ=' + cfg.rho + '</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
    'τ<sub>ij</sub> ← (1−ρ)·τ<sub>ij</sub> + Σ<sub>k</sub> Δτ<sub>ij</sub><sup>k</sup></div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">aresta</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">τ antiga</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">(1−ρ)τ</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--info)">+ΣΔτ</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">τ nova</th>' +
    '</tr></thead><tbody>';
  itData.updates.forEach(function(u) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 4px;color:var(--text3)">' + u.edge + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + _fmt(u.old) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + _fmt(u.evap) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:var(--info)">+' + _fmt(u.add) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:600;color:var(--warn)">' + _fmt(u.new) + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;padding:6px 10px;' +
    'background:var(--success-bg);color:var(--success);border-radius:6px">Melhor rota até a iteração ' +
    itData.iter + ': ' + itData.best_tour.join(' → ') + ' → ' + itData.best_tour[0] +
    ' &nbsp;(L=' + _fmt(itData.best_len, 2) + ')</div>';
  html += '</div>';
  return html;
}

function buildAcoInitPanel(data) {
  var cfg = data.config, names = data.names;
  var html = '<div class="card"><div class="ct">Atividade 12 — ACO para o Caixeiro Viajante</div>' +
    '<div style="font-size:12px;color:var(--text2);line-height:1.6">' +
    cfg.n_cities + ' cidades · ' + cfg.n_ants + ' formigas · ' + cfg.n_iters +
    ' iterações · α=' + cfg.alpha + ' β=' + cfg.beta + ' ρ=' + cfg.rho + ' Q=' + cfg.Q + '</div></div>';

  html += '<div class="card"><div class="ct">Tabela de feromônios inicial (aleatória · seed=' + cfg.seed + ')</div>';
  html += _acoMatrix(data.init_tau, names);
  html += '</div>';

  html += '<div class="card"><div class="ct">Matriz de distâncias d<sub>ij</sub></div>';
  html += _acoMatrix(data.matrix, names, 2);
  html += '</div>';
  return html;
}

function buildAcoSummaryPanel(data) {
  var cfg = data.config;
  var html = '<div class="card"><div class="ct">🎯 Resultado final — ACO · ' + cfg.n_iters +
    ' iterações · ' + cfg.n_ants + ' formigas</div>';
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Melhor rota encontrada:</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--bg2);' +
    'border-radius:6px;border:0.5px solid var(--border3);margin-bottom:12px;line-height:2">' +
    data.best_tour.join(' → ') + ' → ' + data.best_tour[0] + '</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);' +
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:14px">' +
    '📏 Comprimento total = <strong>' + _fmt(data.best_len, 2) + '</strong></div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">' +
    'Tabela de feromônios final:</div>';
  html += _acoMatrix(data.iterations[data.iterations.length - 1].tau_after, data.names);
  html += '</div>';
  return html;
}

function _acoMatrix(M, names, dec) {
  dec = dec === undefined ? 4 : dec;
  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 4px"></th>';
  names.forEach(function(n){ html += '<th style="text-align:right;padding:2px 4px;font-weight:400">' + n + '</th>'; });
  html += '</tr></thead><tbody>';
  for (var i = 0; i < names.length; i++) {
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 4px;color:var(--text3)">' + names[i] + '</td>';
    for (var j = 0; j < names.length; j++) {
      var v = M[i][j];
      html += '<td style="text-align:right;padding:2px 4px;color:' +
        (i === j ? 'var(--text3)' : 'inherit') + '">' + Number(v).toFixed(dec) + '</td>';
    }
    html += '</tr>';
  }
  return html + '</tbody></table>';
}

// ── Flatten the run into a linear list of navigable steps ───────────────────
// Each entry: {kind:'init'|'construct'|'deposit'|'update'|'summary', ...}
function acoBuildSteps(data) {
  var steps = [{ kind: 'init' }];
  data.iterations.forEach(function(it, ii) {
    it.ants.forEach(function(ant, ai) {
      ant.steps.forEach(function(s, si) {
        steps.push({ kind: 'construct', ii: ii, ai: ai, si: si });
      });
      steps.push({ kind: 'deposit', ii: ii, ai: ai });
    });
    steps.push({ kind: 'update', ii: ii });
  });
  steps.push({ kind: 'summary' });
  return steps;
}
