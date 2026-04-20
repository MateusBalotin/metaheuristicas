// static/js/lvq_ui.js  — LVQ canvas renderer + panel builders

var LVQ_CLASS_COLORS = {
  C1: { fill: '#4a9eff', stroke: '#1a6fd4' },
  C2: { fill: '#EF9F27', stroke: '#c97d10' },
  C3: { fill: '#5DCAA5', stroke: '#0F6E56' },
  C4: { fill: '#c084fc', stroke: '#7e22ce' },
};

// ── Canvas renderer ───────────────────────────────────────────────────────────
function LvqCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

LvqCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

LvqCanvas.prototype.draw = function(neuronClasses, weights, step) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 40;
  var drawW = CW - 2 * PAD, drawH = CH - 2 * PAD;

  // Grid spans [0,1] × [0,1]
  function px(x) { return PAD + x * drawW; }
  function py(y) { return PAD + (1 - y) * drawH; }  // flip y

  // ── Grid lines ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? '#2a2a28' : '#e8e6e0';
  ctx.lineWidth = 0.5;
  for (var t = 0; t <= 10; t++) {
    var v = t / 10;
    ctx.beginPath(); ctx.moveTo(px(v), py(0)); ctx.lineTo(px(v), py(1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), py(v)); ctx.lineTo(px(1), py(v)); ctx.stroke();
  }
  ctx.restore();

  // ── Axis labels ───────────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  var ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  ticks.forEach(function(v) {
    ctx.fillText(v.toFixed(1), px(v), py(0) + 14);
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), px(0) - 5, py(v) + 3);
    ctx.textAlign = 'center';
  });
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '10px sans-serif';
  ctx.fillText('x₁', px(0.5), py(0) + 26);
  ctx.save(); ctx.translate(px(0) - 26, py(0.5)); ctx.rotate(-Math.PI/2);
  ctx.fillText('x₂', 0, 0); ctx.restore();

  // ── Draw connection line to updated neuron ────────────────────────────────
  if (step) {
    var x = step.input.x;
    var wi = step.winner;
    var ws = step.phase === 2 ? step.weights_after : step.weights_before;
    ctx.save();
    ctx.strokeStyle = step.match ? 'rgba(95,200,100,0.5)' : 'rgba(220,60,60,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px(x[0]), py(x[1]));
    ctx.lineTo(px(ws[wi][0]), py(ws[wi][1]));
    ctx.stroke();
    ctx.restore();
  }

  // ── Draw neurons ──────────────────────────────────────────────────────────
  var ws = step ? (step.phase === 2 ? step.weights_after : step.weights_before) : weights;
  for (var i = 0; i < ws.length; i++) {
    var c = LVQ_CLASS_COLORS[neuronClasses[i]];
    var isWinner = step && step.winner === i && step.phase >= 1;
    var nx = px(ws[i][0]), ny = py(ws[i][1]);
    var r = isWinner ? 8 : 6;

    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, 2 * Math.PI);
    ctx.fillStyle = isWinner
      ? (step.match ? 'rgba(95,200,100,0.9)' : 'rgba(220,60,60,0.9)')
      : c.fill + (dk ? 'cc' : 'dd');
    ctx.fill();
    ctx.strokeStyle = isWinner
      ? (step.match ? '#1a8c30' : '#a00')
      : c.stroke;
    ctx.lineWidth = isWinner ? 2.5 : 1.5;
    ctx.stroke();

    // Neuron class label
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = (isWinner ? 'bold ' : '') + '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(neuronClasses[i], nx, ny - r - 3);
  }

  // ── Draw original position arrow for updated neuron ───────────────────────
  if (step && step.phase === 2) {
    var wi = step.winner;
    var ox = px(step.weights_before[wi][0]);
    var oy = py(step.weights_before[wi][1]);
    var nx2 = px(step.weights_after[wi][0]);
    var ny2 = py(step.weights_after[wi][1]);
    ctx.save();
    ctx.strokeStyle = step.match ? '#1a8c30' : '#a00';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(nx2, ny2);
    ctx.stroke();
    // arrowhead
    var ang = Math.atan2(ny2 - oy, nx2 - ox);
    ctx.beginPath();
    ctx.moveTo(nx2, ny2);
    ctx.lineTo(nx2 - 8*Math.cos(ang-0.4), ny2 - 8*Math.sin(ang-0.4));
    ctx.lineTo(nx2 - 8*Math.cos(ang+0.4), ny2 - 8*Math.sin(ang+0.4));
    ctx.closePath();
    ctx.fillStyle = step.match ? '#1a8c30' : '#a00';
    ctx.fill();
    ctx.restore();
  }

  // ── Draw input vector ─────────────────────────────────────────────────────
  if (step && step.phase >= 0) {
    var x = step.input.x;
    var ic = LVQ_CLASS_COLORS[step.input.cls];
    ctx.beginPath();
    ctx.arc(px(x[0]), py(x[1]), 7, 0, 2 * Math.PI);
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = ic.stroke;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Cross marker
    ctx.strokeStyle = ic.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(x[0])-7, py(x[1]));
    ctx.lineTo(px(x[0])+7, py(x[1]));
    ctx.moveTo(px(x[0]), py(x[1])-7);
    ctx.lineTo(px(x[0]), py(x[1])+7);
    ctx.stroke();
    ctx.fillStyle = ic.stroke;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x(' + step.input.cls + ')', px(x[0]) + 9, py(x[1]) - 5);
  }
};

// ── Panel builders ────────────────────────────────────────────────────────────
function _lvqPhaseLabel(phase) {
  var labels = [
    ['1', 'apresentar vetor', 'b1'],
    ['2', 'encontrar vencedor', 'b2'],
    ['3', 'atualizar peso', 'b4'],
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

function _clsBadge(cls) {
  var colors = {C1:'#4a9eff',C2:'#EF9F27',C3:'#5DCAA5',C4:'#c084fc'};
  var c = colors[cls] || '#888';
  return '<span style="display:inline-block;padding:1px 7px;border-radius:8px;font-size:10px;' +
    'font-weight:600;background:' + c + '22;border:0.5px solid ' + c + ';color:' + c + '">' + cls + '</span>';
}

function buildLvqPanel(step, phase, cfg) {
  var inp = step.input;
  var html = _lvqPhaseLabel(phase);

  // Input bar
  html += '<div class="card"><div class="ct">Vetor de entrada — passo ' +
    (step.pi + 1) + '/' + cfg.n_train + ' — ' + step.section + '</div>' +
    '<div style="font-family:monospace;font-size:13px;line-height:2.2;color:var(--text2)">' +
    'x = [' + inp.x[0] + ', ' + inp.x[1] + '] &nbsp; classe: ' + _clsBadge(inp.cls) +
    ' &nbsp; α = ' + step.alpha + '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Apresentar vetor a todos os neurônios</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'd<sub>i</sub> = √[(x₁−w<sub>i1</sub>)² + (x₂−w<sub>i2</sub>)²]</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">n</th>' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">classe</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">w_x1</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">w_x2</th>' +
      '</tr></thead><tbody>';
    step.weights_before.forEach(function(w, i) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 5px;color:var(--text3)">n' + (i+1) + '</td>' +
        '<td style="padding:2px 5px">' + _clsBadge(step.neuron_classes[i]) + '</td>' +
        '<td style="text-align:right;padding:2px 5px">' + w[0].toFixed(4) + '</td>' +
        '<td style="text-align:right;padding:2px 5px">' + w[1].toFixed(4) + '</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Encontrar neurônio vencedor (menor distância)</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Vencedor = argmin<sub>i</sub> d<sub>i</sub></div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">n</th>' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">classe</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">d<sub>i</sub></th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400"></th>' +
      '</tr></thead><tbody>';
    step.dists.forEach(function(d, i) {
      var isWin = i === step.winner;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (isWin ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">n' + (i+1) + '</td>' +
        '<td style="padding:3px 6px">' + _clsBadge(step.neuron_classes[i]) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:' +
        (isWin ? '700' : '400') + ';color:' + (isWin ? 'var(--warn)' : 'inherit') + '">' +
        d.toFixed(4) + '</td>' +
        '<td style="text-align:center;padding:3px 6px;font-size:12px">' +
        (isWin ? '← vencedor 🏆' : '') + '</td></tr>';
    });
    html += '</tbody></table>';
    var matchColor = step.match ? 'var(--success)' : 'var(--error,#e53e3e)';
    var matchBg    = step.match ? 'var(--success-bg)' : 'rgba(229,62,62,0.08)';
    html += '<div style="margin-top:10px;padding:8px 12px;border-radius:6px;background:' + matchBg + ';' +
      'border:0.5px solid ' + matchColor + ';font-family:monospace;font-size:11px">' +
      'Vencedor n' + (step.winner+1) + ' ∈ ' + _clsBadge(step.winner_cls) +
      ' &nbsp;|&nbsp; Input ∈ ' + _clsBadge(step.input.cls) +
      ' &nbsp;→&nbsp; <strong style="color:' + matchColor + '">' +
      (step.match ? '✓ MESMA CLASSE → ATRAI' : '✗ CLASSE DIFERENTE → REPELE') +
      '</strong></div>';
    html += '</div>';

  } else {
    var matchColor = step.match ? 'var(--success)' : 'var(--error,#e53e3e)';
    var rule = step.match
      ? 'w<sub>v</sub> ← w<sub>v</sub> + α·(x − w<sub>v</sub>)'
      : 'w<sub>v</sub> ← w<sub>v</sub> − α·(x − w<sub>v</sub>)';
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar neurônio vencedor n' +
      (step.winner+1) + ' ' + _clsBadge(step.winner_cls) + '</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:' + matchColor +
      ';margin-bottom:10px">' + rule + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 8px;font-weight:400"></th>' +
      '<th style="text-align:right;padding:3px 8px;font-weight:400">w_x1</th>' +
      '<th style="text-align:right;padding:3px 8px;font-weight:400">w_x2</th>' +
      '</tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 8px;color:var(--text3)">antes</td>' +
      '<td style="text-align:right;padding:3px 8px">' + step.winner_pos_old[0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:3px 8px">' + step.winner_pos_old[1].toFixed(4) + '</td></tr>';
    var sign = step.match ? '+' : '−';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 8px;color:var(--info)">α·(x−w) ' + (step.match ? '' : '×(−1)') + '</td>' +
      '<td style="text-align:right;padding:3px 8px;color:var(--info)">' +
        (step.delta[0] >= 0 ? '+' : '') + step.delta[0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:3px 8px;color:var(--info)">' +
        (step.delta[1] >= 0 ? '+' : '') + step.delta[1].toFixed(4) + '</td></tr>';
    html += '<tr style="border-top:1px solid var(--border2);background:var(--warn-bg)">' +
      '<td style="padding:3px 8px;font-weight:600;color:var(--warn)">depois</td>' +
      '<td style="text-align:right;padding:3px 8px;font-weight:700;color:var(--warn)">' +
        step.winner_pos_new[0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:3px 8px;font-weight:700;color:var(--warn)">' +
        step.winner_pos_new[1].toFixed(4) + '</td></tr>';
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-size:10px;color:var(--text3)">Todos os outros 15 neurônios permanecem inalterados.</div>';
    html += '</div>';
  }
  return html;
}

function buildLvqSummaryPanel(exData) {
  var fw  = exData.final_weights;
  var iw  = exData.init_weights;
  var nc  = exData.neuron_classes;
  var html = '<div class="card"><div class="ct">🎯 Mapa final — LVQ · α=' +
    exData.config.alpha + ' · ' + exData.config.n_train + ' vetores</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Neurônios modificados:</div>';
  var changed = false;
  for (var i = 0; i < fw.length; i++) {
    if (fw[i][0] !== iw[i][0] || fw[i][1] !== iw[i][1]) {
      changed = true;
      html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;' +
        'margin-bottom:5px;background:var(--warn-bg);border-radius:6px;border:0.5px solid var(--warn);' +
        'font-family:monospace;font-size:11px">' +
        'n' + (i+1) + ' ' + _clsBadge(nc[i]) +
        ' &nbsp; [' + iw[i][0].toFixed(4) + ', ' + iw[i][1].toFixed(4) + ']' +
        ' &nbsp;→&nbsp; ' +
        '<strong style="color:var(--warn)">[' + fw[i][0].toFixed(4) + ', ' + fw[i][1].toFixed(4) + ']</strong></div>';
    }
  }
  if (!changed) html += '<div style="color:var(--text3);font-size:11px">Nenhum neurônio modificado.</div>';
  html += '</div>';

  // Summary table
  html += '<div class="card"><div class="ct">Mapa completo de neurônios (posições finais)</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">n</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">classe</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_x1</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400">w_x2</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">Δ</th>' +
    '</tr></thead><tbody>';
  for (var i = 0; i < fw.length; i++) {
    var mod = fw[i][0] !== iw[i][0] || fw[i][1] !== iw[i][1];
    html += '<tr style="border-top:0.5px solid var(--border3)' + (mod ? ';background:var(--warn-bg)' : '') + '">' +
      '<td style="padding:2px 6px;color:var(--text3)">n' + (i+1) + '</td>' +
      '<td style="padding:2px 6px">' + _clsBadge(nc[i]) + '</td>' +
      '<td style="text-align:right;padding:2px 6px' + (mod ? ';font-weight:600;color:var(--warn)' : '') + '">' +
        fw[i][0].toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 6px' + (mod ? ';font-weight:600;color:var(--warn)' : '') + '">' +
        fw[i][1].toFixed(4) + '</td>' +
      '<td style="padding:2px 6px;color:var(--info);font-size:9px">' +
        (mod ? '[' + (fw[i][0]-iw[i][0] >= 0 ? '+' : '') + (fw[i][0]-iw[i][0]).toFixed(4) +
               ', ' + (fw[i][1]-iw[i][1] >= 0 ? '+' : '') + (fw[i][1]-iw[i][1]).toFixed(4) + ']' : '') +
        '</td></tr>';
  }
  html += '</tbody></table></div>';
  return html;
}
