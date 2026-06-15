// AG 13.1 - renderizacao do plot e dos paineis

function GfCanvas(canvasEl) {
  this.cv = canvasEl; this.ctx = canvasEl.getContext('2d');
  this.CW = canvasEl.width; this.CH = canvasEl.height;
}
GfCanvas.prototype.isDk = function () {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};
GfCanvas.prototype.draw = function (highlightXs, bestX) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 40;
  function f(x) { return Math.pow(x - 4, 2) - Math.pow(x - 8, 3) + 5; }
  var xs = [], ys = [];
  for (var x = 0; x <= 15; x += 0.25) { xs.push(x); ys.push(f(x)); }
  var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
  var dW = CW - 2 * PAD, dH = CH - 2 * PAD;
  function px(x) { return PAD + (x / 15) * dW; }
  function py(y) { return PAD + dH - ((y - ymin) / (ymax - ymin)) * dH; }

  // eixos
  ctx.strokeStyle = dk ? '#3a3833' : '#d8d5cc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, py(0)); ctx.lineTo(CW - PAD, py(0)); ctx.stroke();

  // curva
  ctx.strokeStyle = dk ? '#6d8fa8' : '#4a7090'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < xs.length; i++) {
    var X = px(xs[i]), Y = py(ys[i]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.stroke();

  // pontos da populacao
  (highlightXs || []).forEach(function (x) {
    var X = px(x), Y = py(f(x));
    ctx.beginPath(); ctx.arc(X, Y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = (x === bestX) ? '#EF9F27' : '#4a9eff'; ctx.fill();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('x=' + x, X, Y - 9);
  });

  // rotulos eixo x
  ctx.fillStyle = dk ? '#8a8579' : '#9a9589'; ctx.font = '9px monospace';
  [0, 4, 8, 12, 15].forEach(function (x) { ctx.fillText(x, px(x), CH - PAD + 14); });
};

function gf_popTable(rows, opts) {
  opts = opts || {};
  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">' +
    '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">cromossomo</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">f(x)</th>';
  if (opts.fit) html += '<th style="text-align:right;padding:2px 4px;font-weight:400">fit</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">p</th>';
  html += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    var isBest = opts.bestChrom && r.chrom === opts.bestChrom;
    html += '<tr style="border-top:0.5px solid var(--border3)' + (isBest ? ';background:var(--warn-bg)' : '') + '">' +
      '<td style="padding:2px 4px;font-weight:' + (isBest ? '700' : '400') + '">' + r.chrom + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + r.x + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:' + (isBest ? 'var(--warn)' : 'inherit') + '">' + r.f.toFixed(2) + '</td>';
    if (opts.fit) html += '<td style="text-align:right;padding:2px 4px">' + r.fit.toFixed(2) + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + r.prob.toFixed(3) + '</td>';
    html += '</tr>';
  });
  return html + '</tbody></table>';
}

function gf_buildInit(data) {
  var c = data.config;
  var html = '<div class="card"><div class="ct">Atividade 13.1 - AG para minimizar funcao</div>' +
    '<div style="font-family:monospace;font-size:12px;color:var(--text2);margin-bottom:4px">' + c.expr + '</div>' +
    '<div style="font-size:12px;color:var(--text2)">x inteiro em [' + c.domain[0] + ', ' + c.domain[1] + '] · ' +
    c.n_bits + ' bits · ' + c.n_gen + ' geracoes · objetivo: minimizar</div></div>';
  html += '<div class="card"><div class="ct">Populacao inicial</div>' +
    gf_popTable(gf_initRows(data)) + '</div>';
  return html;
}

function gf_initRows(data) {
  return data.init_pop.map(function (ch) {
    var x = parseInt(ch, 2);
    return { chrom: ch, x: x, f: Math.pow(x - 4, 2) - Math.pow(x - 8, 3) + 5 };
  });
}

function gf_buildEval(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - avaliacao e fitness</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">fitness = (f_pior - f) + 1 ' +
    '(transforma minimizacao em maximizacao para a roleta)</div>';
  html += gf_popTable(g.rows, { fit: true, bestChrom: g.gen_best.chrom });
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text2)">melhor da geracao: <strong>' +
    g.gen_best.chrom + '</strong> (x=' + g.gen_best.x + ', f=' + g.gen_best.f.toFixed(2) + ')</div></div>';
  return html;
}

function gf_buildCross(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - selecao (roleta) e cruzamento</div>';
  g.cross.forEach(function (cx, i) {
    var pr = g.pairs[i];
    html += '<div style="font-family:monospace;font-size:11px;margin-bottom:8px;padding:6px 8px;background:var(--bg2);border-radius:6px">' +
      'pais: ' + cx.p1 + ' x ' + cx.p2;
    if (cx.point !== null)
      html += ' · corte apos bit ' + cx.point + '<br>filhos: <span class="hl">' + cx.c1 + '</span> e <span class="hl">' + cx.c2 + '</span>';
    else html += ' · sem cruzamento<br>filhos: ' + cx.c1 + ' e ' + cx.c2;
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function gf_buildMut(g) {
  var html = '<div class="card"><div class="ct">Geracao ' + g.gen + ' - mutacao e nova populacao</div>';
  if (g.mutations.length === 0)
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">nenhuma mutacao nesta geracao</div>';
  else {
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:6px">mutacoes (inversao de bit):</div>';
    g.mutations.forEach(function (m) {
      html += '<div style="font-family:monospace;font-size:11px">' + m.before +
        ' -> <span class="hl">' + m.after + '</span> (bit ' + m.bit + ')</div>';
    });
  }
  html += '<div style="margin-top:8px;font-size:11px;color:var(--text2)">elitismo: <strong>' + g.elite +
    '</strong> entra no lugar de ' + g.replaced + '</div>';
  html += '<div style="margin-top:8px;font-family:monospace;font-size:12px;padding:6px 10px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px">nova populacao: ' + g.new_pop.join(', ') + '</div>';
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">melhor ate agora: ' +
    g.best_so_far.chrom + ' (x=' + g.best_so_far.x + ', f=' + g.best_so_far.f.toFixed(2) + ', geracao ' + g.best_so_far.gen + ')</div>';
  html += '</div>';
  return html;
}

function gf_buildSummary(data) {
  var b = data.best;
  var html = '<div class="card"><div class="ct">Resultado final - AG 13.1</div>';
  html += '<div style="font-family:monospace;font-size:13px;padding:8px 12px;background:var(--success-bg);' +
    'color:var(--success);border-radius:6px;margin-bottom:10px">melhor solucao: x = ' + b.x +
    ' (' + b.chrom + ') · f(x) = ' + b.f.toFixed(2) + ' · encontrada na geracao ' + b.gen + '</div>';
  html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">populacao final:</div>';
  html += gf_popTable(data.final_pop, { bestChrom: b.chrom });
  html += '</div>';
  return html;
}

function gf_buildSteps(data) {
  var steps = [{ kind: 'init' }];
  data.generations.forEach(function (g, gi) {
    steps.push({ kind: 'eval', gi: gi });
    steps.push({ kind: 'cross', gi: gi });
    steps.push({ kind: 'mut', gi: gi });
  });
  steps.push({ kind: 'summary' });
  return steps;
}
