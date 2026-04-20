// static/js/rbf_temporal_ui.js  — RBF Temporal Series panels + canvas

// ── Canvas renderer ───────────────────────────────────────────────────────────
function RbfTsCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

RbfTsCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

// Draw the 2D input-space with current pattern and G rows built so far
RbfTsCanvas.prototype.drawInputSpace = function(exData, step, phase) {
  var dk  = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 38;
  var drawW = CW - 2*PAD, drawH = CH - 2*PAD;

  // All inputs span roughly [0.2, 1.0] in both dims — pad a bit
  var minV = 0.1, maxV = 1.05;
  function px(v) { return PAD + (v - minV)/(maxV - minV)*drawW; }
  function py(v) { return PAD + (1 - (v - minV)/(maxV - minV))*drawH; }

  // ── Grid ──────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? '#2a2a28' : '#eeece6';
  ctx.lineWidth = 0.5;
  for (var t = 0; t <= 10; t++) {
    var v = 0.1 + t * 0.1;
    ctx.beginPath(); ctx.moveTo(px(v), py(minV)); ctx.lineTo(px(v), py(maxV)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(minV), py(v)); ctx.lineTo(px(maxV), py(v)); ctx.stroke();
  }
  ctx.restore();

  // ── Axis labels ───────────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  [0.2,0.4,0.6,0.8,1.0].forEach(function(v) {
    ctx.fillText(v.toFixed(1), px(v), py(minV)+14);
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), px(minV)-4, py(v)+3);
    ctx.textAlign = 'center';
  });
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '10px sans-serif';
  ctx.fillText('x₁ (y_t)', px(0.55), py(minV)+26);
  ctx.save(); ctx.translate(px(minV)-26, py(0.55)); ctx.rotate(-Math.PI/2);
  ctx.fillText('x₂ (y_{t+1})', 0, 0); ctx.restore();

  // ── Gaussian contours for centers ────────────────────────────────────────
  var centers = exData.centers;
  var sigma   = exData.config.sigma;
  var cColors = [dk ? '#EF9F27' : '#c97d10', dk ? '#4a9eff' : '#1a6fd4'];
  centers.forEach(function(c, ci) {
    // Draw filled circle at center
    ctx.beginPath();
    ctx.arc(px(c[0]), py(c[1]), 7, 0, 2*Math.PI);
    ctx.fillStyle = cColors[ci];
    ctx.fill();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('u'+(ci+1), px(c[0]), py(c[1])-9);
  });

  // ── All previous patterns (grey dots) ─────────────────────────────────────
  var G = step ? step.G_before : [];
  exData.patterns.forEach(function(p, i) {
    if (i >= (step ? step.pi : 0)) return; // only already-processed
    ctx.beginPath();
    ctx.arc(px(p.x[0]), py(p.x[1]), 4, 0, 2*Math.PI);
    ctx.fillStyle = dk ? '#55524a' : '#c8c5bc';
    ctx.fill();
    ctx.fillStyle = dk ? '#888780' : '#888780';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P'+(i+1), px(p.x[0])+5, py(p.x[1])-2);
  });

  // ── Current pattern (highlighted) ─────────────────────────────────────────
  if (step) {
    var x = step.x;
    ctx.beginPath();
    ctx.arc(px(x[0]), py(x[1]), 7, 0, 2*Math.PI);
    ctx.fillStyle = dk ? 'rgba(95,200,150,0.9)' : 'rgba(30,150,80,0.9)';
    ctx.fill();
    ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P'+(step.pi+1), px(x[0])+9, py(x[1])-3);

    // Lines to centers (phase 1: computing distances)
    if (phase >= 1) {
      centers.forEach(function(c, ci) {
        ctx.save();
        ctx.strokeStyle = cColors[ci];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]);
        ctx.beginPath();
        ctx.moveTo(px(x[0]), py(x[1]));
        ctx.lineTo(px(c[0]), py(c[1]));
        ctx.stroke();
        // midpoint label
        var mx = px((x[0]+c[0])/2), my = py((x[1]+c[1])/2);
        ctx.setLineDash([]);
        ctx.fillStyle = cColors[ci];
        ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('d'+(ci+1)+'='+step.sq_dists[ci].toFixed(4), mx, my-4);
        ctx.restore();
      });
    }
  }
};

// Draw final prediction chart (time series)
RbfTsCanvas.prototype.drawTimeSeries = function(exData) {
  var dk  = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 40, TPAD = 20;
  var drawW = CW - 2*PAD, drawH = CH - PAD - TPAD;

  var n = exData.y_series.length;
  var minY = -0.1, maxY = 1.15;
  function px(i) { return PAD + i/(n-1)*drawW; }
  function py(v) { return TPAD + (1-(v-minY)/(maxY-minY))*drawH; }

  // ── Grid lines ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? '#2a2a28' : '#eeece6';
  ctx.lineWidth = 0.5;
  [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach(function(v) {
    ctx.beginPath(); ctx.moveTo(PAD, py(v)); ctx.lineTo(PAD+drawW, py(v)); ctx.stroke();
    ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), PAD-5, py(v)+3);
  });
  ctx.restore();

  // ── Original series ───────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? '#6d8fa8' : '#4a7090';
  ctx.lineWidth = 2;
  ctx.beginPath();
  exData.y_series.forEach(function(v, i) { i===0 ? ctx.moveTo(px(i),py(v)) : ctx.lineTo(px(i),py(v)); });
  ctx.stroke();
  // dots
  exData.y_series.forEach(function(v, i) {
    ctx.beginPath(); ctx.arc(px(i), py(v), 4, 0, 2*Math.PI);
    ctx.fillStyle = dk ? '#6d8fa8' : '#4a7090'; ctx.fill();
    ctx.fillStyle = dk ? '#c2c0b6' : '#333';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, px(i), py(v)-8);
  });
  ctx.restore();

  // ── Predictions (orange dots + line, starting at index 2) ────────────────
  var preds = exData.predictions;
  ctx.save();
  ctx.strokeStyle = '#EF9F27';
  ctx.lineWidth = 2;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  preds.forEach(function(pr, i) {
    var xi = pr.t + 1;  // prediction is for index t+1 (0-based) = t+2th value
    i===0 ? ctx.moveTo(px(xi),py(pr.y_hat)) : ctx.lineTo(px(xi),py(pr.y_hat));
  });
  ctx.stroke();
  ctx.setLineDash([]);
  preds.forEach(function(pr) {
    var xi = pr.t + 1;
    ctx.beginPath(); ctx.arc(px(xi), py(pr.y_hat), 4, 0, 2*Math.PI);
    ctx.fillStyle = '#EF9F27'; ctx.fill();
  });
  ctx.restore();

  // ── x-axis labels ────────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  exData.y_series.forEach(function(v, i) {
    ctx.fillText('t'+(i+1), px(i), TPAD+drawH+14);
  });
  ctx.fillText('Série temporal', PAD+drawW/2, TPAD+drawH+26);

  // ── Legend ────────────────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#6d8fa8' : '#4a7090';
  ctx.fillRect(PAD, TPAD+drawH+34, 18, 3);
  ctx.fillStyle = dk ? '#c2c0b6' : '#333';
  ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('original', PAD+22, TPAD+drawH+38);
  ctx.fillStyle = '#EF9F27';
  ctx.fillRect(PAD+80, TPAD+drawH+34, 18, 3);
  ctx.setLineDash([4,3]);
  ctx.fillStyle = dk ? '#c2c0b6' : '#333';
  ctx.fillText('predição RBF', PAD+102, TPAD+drawH+38);
  ctx.setLineDash([]);
};

// ── Panel builders ────────────────────────────────────────────────────────────
function _rbfPhaseLabel(phase) {
  var labels = [
    ['1', 'apresentar padrão', 'b1'],
    ['2', 'calcular ativações φ', 'b2'],
    ['3', 'adicionar linha a G', 'b4'],
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

function buildRbfTsPanel(step, phase, cfg) {
  var html = _rbfPhaseLabel(phase);

  html += '<div class="card"><div class="ct">Padrão P' + (step.pi+1) + '/' + cfg.n_patterns +
    ' (t=' + step.t + '→' + (step.t+1) + '→' + (step.t+2) + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2.2;color:var(--text2)">' +
    'x = [<strong>' + step.x[0] + '</strong>, <strong>' + step.x[1] + '</strong>]' +
    ' &nbsp;|&nbsp; d = <strong>' + step.d + '</strong>' +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Janela deslizante (k=2)</div>';
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'y(t=' + step.t + ')=' + step.x[0] + '  e  y(t=' + (step.t+1) + ')=' + step.x[1] +
      '  →  prever y(t=' + (step.t+2) + ')=' + step.d + '</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3)">' +
      'Centros: u₁=[1.0, 0.9] &nbsp;&nbsp; u₂=[0.6, 0.4]<br>' +
      'φⱼ(x) = exp( −||x − uⱼ||² / (2σ²) ) = exp( −||x − uⱼ||² / 2 )' +
      '</div></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Calcular ativações φ (Gaussianas)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">centro</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">||x−uⱼ||²</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">−||·||²/2</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">φⱼ = e^(·)</th>' +
      '</tr></thead><tbody>';
    step.sq_dists.forEach(function(sq, j) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 6px;color:var(--text3)">u' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 6px">' + sq.toFixed(6) + '</td>' +
        '<td style="text-align:right;padding:3px 6px">' + (-sq/2).toFixed(6) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' +
          step.phis[j].toFixed(6) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      'θ = 1.0 (bias)</div></div>';

  } else {
    // Phase 2: show G row added
    html += '<div class="card"><div class="ct">Passo 3 — Adicionar linha à matriz G</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Nova linha: [φ₁, φ₂, θ] = [' +
      step.phis[0].toFixed(6) + ', ' + step.phis[1].toFixed(6) + ', 1.0]</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 6px;font-weight:400"></th>' +
      '<th style="text-align:right;padding:2px 6px;font-weight:400">φ₁</th>' +
      '<th style="text-align:right;padding:2px 6px;font-weight:400">φ₂</th>' +
      '<th style="text-align:right;padding:2px 6px;font-weight:400">θ</th>' +
      '<th style="text-align:right;padding:2px 6px;font-weight:400">d</th>' +
      '</tr></thead><tbody>';
    step.G_so_far.forEach(function(row, i) {
      var isNew = i === step.pi;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (isNew ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:2px 6px;color:var(--text3)' + (isNew ? ';color:var(--warn);font-weight:700' : '') + '">P' + (i+1) + (isNew ? ' ← novo' : '') + '</td>' +
        row.map(function(v) {
          return '<td style="text-align:right;padding:2px 6px' + (isNew ? ';font-weight:700;color:var(--warn)' : '') + '">' + v.toFixed(6) + '</td>';
        }).join('') +
        '<td style="text-align:right;padding:2px 6px;color:var(--text3)">' + (isNew ? step.d : '—') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildRbfTsSolvePanel(exData) {
  var w    = exData.weights;
  var preds = exData.predictions;
  var GtG  = exData.GtG;
  var Gtd  = exData.Gtd;

  var html = '<div class="card"><div class="ct">🔢 Resolver: w = (G<sup>T</sup>G)<sup>−1</sup> G<sup>T</sup>d</div>';

  // G^T G matrix
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">G<sup>T</sup>G:</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:10px;margin-bottom:10px">';
  GtG.forEach(function(row) {
    html += '<tr>' + row.map(function(v) {
      return '<td style="padding:2px 8px;border:0.5px solid var(--border3);text-align:right">' + v.toFixed(4) + '</td>';
    }).join('') + '</tr>';
  });
  html += '</table>';

  // G^T d vector
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">G<sup>T</sup>d:</div>';
  html += '<div style="font-family:monospace;font-size:11px;padding:6px 12px;background:var(--bg2);' +
    'border-radius:6px;border:0.5px solid var(--border3);margin-bottom:12px">' +
    '[' + Gtd.map(function(v) { return v.toFixed(6); }).join(', ') + ']</div>';

  // Weights
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;' +
    'background:var(--warn-bg);border-radius:6px;border:0.5px solid var(--warn);margin-bottom:12px">' +
    '<strong style="color:var(--warn)">w</strong> = [w₁, w₂, w₀] = [' +
    '<strong>' + w[0].toFixed(6) + '</strong>, ' +
    '<strong>' + w[1].toFixed(6) + '</strong>, ' +
    '<strong>' + w[2].toFixed(6) + '</strong>]</div>';

  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:12px">' +
    'ŷ = w₁·φ₁(x) + w₂·φ₂(x) + w₀·θ</div>';
  html += '</div>';

  // Predictions table
  html += '<div class="card"><div class="ct">📈 Predições vs. valores reais</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400">P</th>' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400">x = [y_t, y_{t+1}]</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--warn)">ŷ</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--info)">e=d−ŷ</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">e²</th>' +
    '</tr></thead><tbody>';
  preds.forEach(function(pr) {
    var big = Math.abs(pr.error) > 0.1;
    html += '<tr style="border-top:0.5px solid var(--border3)' + (big ? ';background:rgba(220,60,60,0.06)' : '') + '">' +
      '<td style="padding:2px 5px;color:var(--text3)">P' + pr.t + '</td>' +
      '<td style="padding:2px 5px">[' + pr.x[0] + ', ' + pr.x[1] + ']</td>' +
      '<td style="text-align:right;padding:2px 5px">' + pr.d.toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + pr.y_hat.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;color:var(--info)">' + (pr.error >= 0 ? '+' : '') + pr.error.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + pr.sq_err.toFixed(6) + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="text-align:right;padding:8px 5px;font-family:monospace;font-size:11px;' +
    'font-weight:600;color:var(--success)">MSE = ' + exData.mse.toFixed(6) + '</div>';
  html += '</div>';
  return html;
}
