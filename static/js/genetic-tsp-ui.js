// AG 13.2 - renderizacao do canvas TSP e dos paineis

function GtCanvas(canvasEl) {
  this.cv = canvasEl; this.ctx = canvasEl.getContext('2d');
  this.CW = canvasEl.width; this.CH = canvasEl.height;
}
GtCanvas.prototype.isDk = function () {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};
GtCanvas.prototype.draw = function (cities, names, tour, bestTour) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 30;
  var xs = names.map(function (n) { return cities[n][0]; });
  var ys = names.map(function (n) { return cities[n][1]; });
  var minX = Math.min.apply(null, xs) - 1, maxX = Math.max.apply(null, xs) + 1;
  var minY = Math.min.apply(null, ys) - 1, maxY = Math.max.apply(null, ys) + 1;
  var rx = maxX - minX, ry = maxY - minY;
  var dW = CW - 2 * PAD, dH = CH - 2 * PAD;
  var sc = Math.min(dW / rx, dH / ry);
  var oX = PAD + (dW - rx * sc) / 2, oY = PAD + (dH - ry * sc) / 2;
  function px(x) { return oX + (x - minX) * sc; }
  function py(y) { return oY + (maxY - y) * sc; }

  function drawTour(t, color, dash, width) {
    if (!t || t.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px(cities[t[0]][0]), py(cities[t[0]][1]));
    for (var i = 1; i < t.length; i++) ctx.lineTo(px(cities[t[i]][0]), py(cities[t[i]][1]));
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  if (bestTour) drawTour(bestTour, dk ? 'rgba(110,231,183,0.6)' : 'rgba(6,95,70,0.5)', [5, 3], 2);
  if (tour) drawTour(tour, '#EF9F27', null, 2.4);

  names.forEach(function (n) {
    var x = px(cities[n][0]), y = py(cities[n][1]);
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = dk ? '#6d8fa8' : '#4a7090'; ctx.fill();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(n, x, y - 10);
  });
};

function gt_popTable(rows, opts) {
  opts = opts || {};
  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">rota</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">custo</th>';
  if (opts.fit) html += '<th style="text-align:right;padding:2px 4px;font-weight:400">fit</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">p</th>';
  html += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    var s = r.tour.join('');
    var isBest = opts.bestTour && s === opts.bestTour.join('');
    html += '<tr style="border-top:0.5px solid var(--border3)' + (isBest ? ';background:var(--warn-bg)' : '') + '">' +
      '<td style="padding:2px 4px;font-weight:' + (isBest ? '700' : '400') + '">' + s + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:' + (isBest ? 'var(--warn)' : 'inherit') + '">' + r.cost.toFixed(2) + '</td>';
    if (opts.fit) html += '<td style="text-align:right;padding:2px 4px">' + r.fit.toFixed(2) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + r.prob.toFixed(3) + '</td>';
    html += '</tr>';
  });
  return html + '</tbody></table>';
}

function gt_buildInit(data) {
  var c = data.config;
  var html = '<div class="card"><div class="ct">Atividade 13.2 - AG para o Caixeiro Viajante</div>' +
    '<div style="font-size:12px;color:var(--text2)">' + c.n_cities + ' cidades · ' + c.n_gen +
    ' geracoes · cruzamento ' + c.crossover + ' · objetivo: minimizar distancia</div></div>';
  html += '<div class="card" style="background:var(--warn-bg)"><div class="ct">Observacao sobre o enunciado</div>' +
    '<div style="font-size:11px;color:var(--text2)">Como a cidade J esta repetida e a F ausente na rota ' +
    'ABJDHEC<strong>J</strong>GI, considerei que o enunciado estava errado e tratei como: ABJDHEC<strong>F</strong>GI.</div></div>';
  var C = {}; data.names.forEach(function (a, i) { C[a] = {}; data.names.forEach(function (b, j) { C[a][b] = data.matrix[i][j]; }); });
  var rows = data.init_pop.map(function (t) {
    var cost = 0; for (var i = 0; i < t.length; i++) cost += C[t[i]][t[(i + 1) % t.length]];
    return { tour: t, cost: Math.round(cost * 100) / 100 };
  });
  html += '<div class="card"><div class="ct">Populacao inicial (4 individuos)</div>' + gt_popTable(rows) + '</div>';
  return html;
}

function gt_buildEval(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - avaliacao e fitness</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">fitness = (custo_pior - custo) + 1</div>';
  html += gt_popTable(g.rows, { fit: true, bestTour: g.gen_best.tour });
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text2)">melhor da geracao: <strong>' +
    g.gen_best.tour.join('') + '</strong> (custo ' + g.gen_best.cost.toFixed(2) + ')</div></div>';
  return html;
}

function gt_buildCross(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - selecao e Order Crossover</div>';
  g.cross.forEach(function (cx) {
    html += '<div style="font-family:monospace;font-size:11px;margin-bottom:8px;padding:6px 8px;background:var(--bg2);border-radius:6px">' +
      'pais: ' + cx.p1.join('') + ' x ' + cx.p2.join('') + '<br>' +
      'segmento [' + cx.lo + ',' + cx.hi + ']<br>' +
      'filhos: <span class="hl">' + cx.c1.join('') + '</span> e <span class="hl">' + cx.c2.join('') + '</span></div>';
  });
  html += '</div>';
  return html;
}

function gt_buildMut(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - mutacao e nova populacao</div>';
  if (g.mutations.length === 0)
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">nenhuma mutacao nesta geracao</div>';
  else {
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:6px">mutacoes (troca de posicoes):</div>';
    g.mutations.forEach(function (m) {
      html += '<div style="font-family:monospace;font-size:11px">' + m.before.join('') +
        ' -> <span class="hl">' + m.after.join('') + '</span> (troca ' + m.i + ' e ' + m.j + ')</div>';
    });
  }
  html += '<div style="margin-top:8px;font-size:11px;color:var(--text2)">elitismo: <strong>' + g.elite.join('') +
    '</strong> entra no lugar de ' + g.replaced.join('') + '</div>';
  html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;padding:6px 10px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px">nova populacao:<br>' + g.new_pop.map(function (t) { return t.join(''); }).join('<br>') + '</div>';
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">melhor ate agora: ' +
    g.best_so_far.tour.join('') + ' (custo ' + g.best_so_far.cost.toFixed(2) + ', geracao ' + g.best_so_far.gen + ')</div>';
  html += '</div>';
  return html;
}

function gt_buildSummary(data) {
  var b = data.best;
  var html = '<div class="card"><div class="ct">Resultado final - AG 13.2</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--bg2);' +
    'border-radius:6px;border:0.5px solid var(--border3);margin-bottom:10px;line-height:2">' +
    b.tour.join(' - ') + ' - ' + b.tour[0] + '</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px;margin-bottom:10px">custo total = ' + b.cost.toFixed(2) +
    ' · encontrada na geracao ' + b.gen + '</div>';
  html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">populacao final:</div>';
  html += gt_popTable(data.final_pop, { bestTour: b.tour });
  html += '</div>';
  return html;
}

function gt_buildSteps(data) {
  var steps = [{ kind: 'init' }];
  data.generations.forEach(function (g, gi) {
    steps.push({ kind: 'eval', gi: gi });
    steps.push({ kind: 'cross', gi: gi });
    steps.push({ kind: 'mut', gi: gi });
  });
  steps.push({ kind: 'summary' });
  return steps;
}
