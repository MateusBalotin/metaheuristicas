// static/js/som_tsp_ui.js — SOM-TSP canvas renderer + panel builders

// ── Canvas renderer ───────────────────────────────────────────────────────────
function SomTspCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

SomTspCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

SomTspCanvas.prototype.draw = function(cities, weights, step, isFinal, finalMap) {
  var dk  = this.isDk();
  var ctx = this.ctx, CW = this.CW, CH = this.CH;

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 38;

  // Bounding box over cities + current neuron positions
  var allX = cities.map(function(c) { return c.x; })
              .concat(weights.map(function(w) { return w[0]; }));
  var allY = cities.map(function(c) { return c.y; })
              .concat(weights.map(function(w) { return w[1]; }));
  var minX = Math.min.apply(null, allX) - 0.8;
  var maxX = Math.max.apply(null, allX) + 0.8;
  var minY = Math.min.apply(null, allY) - 0.8;
  var maxY = Math.max.apply(null, allY) + 0.8;
  var rangeX = maxX - minX, rangeY = maxY - minY;

  var drawW = CW - 2 * PAD, drawH = CH - 2 * PAD;
  var scale = Math.min(drawW / rangeX, drawH / rangeY);
  var offX  = PAD + (drawW - rangeX * scale) / 2;
  var offY  = PAD + (drawH - rangeY * scale) / 2;

  function px(x) { return offX + (x - minX) * scale; }
  function py(y) { return offY + (maxY - y) * scale; }  // north-up

  var nn = weights.length;

  // ── Final tour (dashed green) ──────────────────────────────────────────────
  if (isFinal && finalMap) {
    var tour = finalMap.slice().sort(function(a, b) { return a.winner - b.winner; });
    ctx.save();
    ctx.strokeStyle = dk ? 'rgba(95,205,100,0.65)' : 'rgba(30,150,40,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(px(tour[0].x), py(tour[0].y));
    for (var i = 1; i < tour.length; i++) ctx.lineTo(px(tour[i].x), py(tour[i].y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ── Neuron ring ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? 'rgba(239,159,39,0.45)' : 'rgba(220,140,20,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(weights[0][0]), py(weights[0][1]));
  for (var i = 1; i < nn; i++) ctx.lineTo(px(weights[i][0]), py(weights[i][1]));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // ── Neurons ────────────────────────────────────────────────────────────────
  for (var i = 0; i < nn; i++) {
    var wx = px(weights[i][0]), wy = py(weights[i][1]);
    var isWin = step && step.winner === i;
    var isNbr = step && step.neighbors && step.neighbors.indexOf(i) !== -1 && !isWin;
    var r = isWin ? 5 : (isNbr ? 4 : 3);
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, 2 * Math.PI);
    ctx.fillStyle = isWin ? '#EF9F27' : (isNbr ? (dk ? '#5DCAA5' : '#0F6E56') : (dk ? '#55524a' : '#c8c5bc'));
    ctx.fill();
    if (isWin) {
      ctx.save();
      ctx.strokeStyle = '#EF9F27';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, 9, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    // Mark first neuron to show ring start
    if (i === 0) {
      ctx.fillStyle = dk ? '#888780' : '#888780';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('n1', wx, wy - 8);
    }
  }

  // ── Cities ────────────────────────────────────────────────────────────────
  cities.forEach(function(c) {
    var isCur = step && step.city.id === c.id;
    var cxp = px(c.x), cyp = py(c.y);
    ctx.beginPath();
    ctx.arc(cxp, cyp, isCur ? 7 : 5, 0, 2 * Math.PI);
    ctx.fillStyle = isCur ? '#4a9eff' : (dk ? '#6d8fa8' : '#4a7090');
    ctx.fill();
    if (isCur) {
      ctx.save();
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cxp, cyp, 11, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = dk ? '#c2c0b6' : '#333';
    ctx.font = (isCur ? 'bold ' : '') + '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.id, cxp + 7, cyp - 3);
  });

  // ── Tour distance overlay ──────────────────────────────────────────────────
  if (isFinal && finalMap) {
    var t2 = finalMap.slice().sort(function(a, b) { return a.winner - b.winner; });
    var td = 0;
    for (var i = 0; i < t2.length; i++) {
      var nxt = t2[(i + 1) % t2.length];
      td += Math.sqrt(Math.pow(t2[i].x - nxt.x, 2) + Math.pow(t2[i].y - nxt.y, 2));
    }
    ctx.fillStyle = dk ? '#5DCAA5' : '#0F6E56';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Rota ≈ ' + (Math.round(td * 100) / 100).toFixed(2) + ' unidades', PAD, CH - 8);
  }
};

// ── Panel builders ────────────────────────────────────────────────────────────
function _tspPhaseLabel(phase) {
  var labels = [
    ['1', 'apresentar cidade', 'b1'],
    ['2', 'encontrar BMU',     'b2'],
    ['3', 'atualizar pesos',   'b4'],
  ];
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  labels.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active ? 'border2' : 'border3') + ');' +
      'background:' + (active ? 'var(--bg2)' : 'transparent') + ';' +
      'color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' +
      pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

function buildSomTspPanel(step, phase, cfg) {
  var c    = step.city;
  var html = _tspPhaseLabel(phase);

  html += '<div class="card"><div class="ct">Cidade <strong>' + c.label + '</strong>' +
    ' — passo ' + (step.pi + 1) + '/' + cfg.nc +
    ' — iter ' + step.iter + '/' + cfg.n_iters +
    ' — α=' + step.alpha + ' — raio=' + step.radius + '</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2;color:var(--text2)">' +
    'x = [' + c.x + ', ' + c.y + ']</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Apresentar cidade a todos os neurônios</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'd<sub>i</sub> = √[(x₁−w<sub>i1</sub>)² + (x₂−w<sub>i2</sub>)²]</div>';
    html += '<div style="font-size:10px;color:var(--text3);margin-bottom:6px">Posições atuais dos neurônios:</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">n</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_x</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_y</th></tr></thead><tbody>';
    var show = Math.min(step.weights_before.length, 10);
    for (var i = 0; i < show; i++) {
      var w = step.weights_before[i];
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 4px;color:var(--text3)">n' + (i+1) + '</td>' +
        '<td style="text-align:right;padding:2px 4px">' + w[0].toFixed(4) + '</td>' +
        '<td style="text-align:right;padding:2px 4px">' + w[1].toFixed(4) + '</td></tr>';
    }
    if (show < step.weights_before.length)
      html += '<tr><td colspan="3" style="padding:2px 4px;color:var(--text3);text-align:center">… ' +
        (step.weights_before.length - show) + ' mais …</td></tr>';
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Encontrar BMU (menor distância)</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'BMU = argmin<sub>i</sub> d<sub>i</sub></div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">neurônio</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">d<sub>i</sub></th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400"></th>' +
      '</tr></thead><tbody>';
    for (var i = 0; i < step.dists.length; i++) {
      var isWin = i === step.winner;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (isWin ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">n' + (i+1) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:' +
        (isWin ? '700' : '400') + ';color:' + (isWin ? 'var(--warn)' : 'inherit') + '">' +
        step.dists[i].toFixed(4) + '</td>' +
        '<td style="text-align:center;padding:3px 6px">' + (isWin ? '← BMU 🏆' : '') + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      'Vizinhos (raio=' + step.radius + '): ' +
      step.neighbors.map(function(n) { return 'n' + (n+1); }).join(', ') + '</div>';
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar BMU e vizinhos</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'w<sub>i</sub> ← w<sub>i</sub> + α·(x − w<sub>i</sub>) &nbsp; ∀i ∈ V (raio=' + step.radius + ')</div>';
    if (step.deltas.length === 0) {
      html += '<div style="padding:8px;color:var(--text3);font-size:11px">' +
        'Nenhuma atualização — raio=0, apenas o BMU seria atualizado, mas já incluso acima.</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
      html += '<thead><tr style="color:var(--text3)">' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400">n</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400">antes</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--info)">α·(x−w)</th>' +
        '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--warn)">depois</th>' +
        '</tr></thead><tbody>';
      step.deltas.forEach(function(d) {
        var isWin = d.n === step.winner;
        html += '<tr style="border-top:0.5px solid var(--border3)' +
          (isWin ? ';background:var(--warn-bg)' : '') + '">' +
          '<td style="padding:2px 4px;color:var(--text3)">n' + (d.n+1) + (isWin ? ' ★' : '') + '</td>' +
          '<td style="padding:2px 4px">[' + d.old[0].toFixed(4) + ', ' + d.old[1].toFixed(4) + ']</td>' +
          '<td style="padding:2px 4px;color:var(--info)">[' +
            (d.delta[0] >= 0 ? '+' : '') + d.delta[0].toFixed(4) + ', ' +
            (d.delta[1] >= 0 ? '+' : '') + d.delta[1].toFixed(4) + ']</td>' +
          '<td style="padding:2px 4px;font-weight:600;color:var(--warn)">[' +
            d.nw[0].toFixed(4) + ', ' + d.nw[1].toFixed(4) + ']</td></tr>';
      });
      html += '</tbody></table>';
    }
    html += '</div>';
  }
  return html;
}

function buildSomTspSummaryPanel(exData) {
  var fw  = exData.final_weights;
  var cfg = exData.config;
  var fm  = exData.final_mapping;
  var tour = exData.tour;

  var html = '<div class="card"><div class="ct">🎯 Resultado final — SOM para TSP · anel de ' +
    cfg.n_neurons + ' neurônios · α=' + cfg.alpha + ' · ' + cfg.n_iters +
    ' iterações · raio₀=' + cfg.radius0 + '</div>';

  // City-to-BMU mapping
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">' +
    'Mapeamento cidade → BMU:</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px">';
  fm.forEach(function(r) {
    html += '<div style="padding:3px 9px;border-radius:6px;background:var(--bg2);' +
      'border:0.5px solid var(--border2);font-family:monospace;font-size:10px">' +
      '<strong>' + r.label + '</strong> → n' + (r.winner+1) +
      ' (d=' + r.dist.toFixed(4) + ')</div>';
  });
  html += '</div>';

  // Tour sequence
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">' +
    'Rota derivada (ordem dos BMUs no anel):</div>';
  html += '<div style="font-family:monospace;font-size:11px;padding:8px 12px;' +
    'background:var(--bg2);border-radius:6px;border:0.5px solid var(--border3);' +
    'margin-bottom:12px;line-height:2">';
  html += tour.map(function(r) { return r.label; }).join(' → ') + ' → ' + tour[0].label;
  html += '</div>';

  // Tour distance
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;' +
    'background:var(--success-bg);border-radius:6px;border:0.5px solid var(--success);' +
    'color:var(--success);margin-bottom:14px">' +
    '📏 Distância total da rota ≈ <strong>' + exData.tour_dist + '</strong> unidades</div>';

  // Final neuron positions
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">' +
    'Posições finais dos neurônios:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;margin-bottom:8px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">n</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_x</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_y</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">cidades</th>' +
    '</tr></thead><tbody>';
  var cityByNeuron = {};
  fm.forEach(function(r) {
    if (!cityByNeuron[r.winner]) cityByNeuron[r.winner] = [];
    cityByNeuron[r.winner].push(r.label);
  });
  for (var i = 0; i < fw.length; i++) {
    var mapped = cityByNeuron[i] ? cityByNeuron[i].join(', ') : '—';
    var hasCities = !!cityByNeuron[i];
    html += '<tr style="border-top:0.5px solid var(--border3)' +
      (hasCities ? ';background:var(--info-bg)' : '') + '">' +
      '<td style="padding:2px 6px;color:var(--text3)">n' + (i+1) + '</td>' +
      '<td style="text-align:right;padding:2px 6px">' + fw[i][0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 6px">' + fw[i][1].toFixed(4) + '</td>' +
      '<td style="padding:2px 6px;color:var(--info)">' + mapped + '</td></tr>';
  }
  html += '</tbody></table></div>';
  return html;
}
