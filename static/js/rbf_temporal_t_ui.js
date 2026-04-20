// static/js/rbf_temporal_t_ui.js  — RBF Temporal (entradas t) — Atividade 7.2

// ── Canvas renderer ───────────────────────────────────────────────────────────
function RbfTsCanvas_T(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

RbfTsCanvas_T.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

// Draw t-space: x-axis = t, y-axis = t+1 (diagonal layout since x2 = x1+1 always)
RbfTsCanvas_T.prototype.drawInputSpace = function(exData, step, phase) {
  var dk  = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 42;
  var drawW = CW - 2*PAD, drawH = CH - 2*PAD;
  // t-space: x1 in [0,10], x2 in [1,10]
  var minT = 0.5, maxT = 10;

  function px(t) { return PAD + (t - minT)/(maxT - minT)*drawW; }
  function py(t) { return PAD + (1 - (t - minT)/(maxT - minT))*drawH; }

  // ── Grid ──────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = dk ? '#2a2a28' : '#eeece6';
  ctx.lineWidth = 0.5;
  for (var t = 1; t <= 10; t++) {
    ctx.beginPath(); ctx.moveTo(px(t), py(minT)); ctx.lineTo(px(t), py(maxT)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(minT), py(t)); ctx.lineTo(px(maxT), py(t)); ctx.stroke();
  }
  ctx.restore();

  // Diagonal line: all patterns lie on t2 = t1+1
  ctx.save();
  ctx.strokeStyle = dk ? '#3a3a36' : '#e0ddd8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.moveTo(px(1), py(2));
  ctx.lineTo(px(8), py(9));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Axis labels ───────────────────────────────────────────────────────────
  ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  for (var i = 1; i <= 9; i++) {
    ctx.fillText(i, px(i), py(minT)+14);
    ctx.textAlign = 'right';
    ctx.fillText(i, px(minT)-4, py(i)+3);
    ctx.textAlign = 'center';
  }
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '10px sans-serif';
  ctx.fillText('t₁', px(5), py(minT)+26);
  ctx.save(); ctx.translate(px(minT)-28, py(5)); ctx.rotate(-Math.PI/2);
  ctx.fillText('t₂ = t₁+1', 0, 0); ctx.restore();

  var centers = exData.centers;
  var cColors = ['#EF9F27','#4a9eff','#5DCAA5'];

  // ── Centers ───────────────────────────────────────────────────────────────
  centers.forEach(function(c, ci) {
    ctx.beginPath();
    ctx.arc(px(c[0]), py(c[1]), 7, 0, 2*Math.PI);
    ctx.fillStyle = cColors[ci];
    ctx.fill();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('u'+(ci+1), px(c[0]), py(c[1])-9);
  });

  // ── Gaussian radius rings (1σ circle in t-space) ──────────────────────────
  if (phase >= 1) {
    var sigma = exData.config.sigma;
    var scaleT = drawW / (maxT - minT); // pixels per unit t
    centers.forEach(function(c, ci) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(px(c[0]), py(c[1]), sigma*scaleT, 0, 2*Math.PI);
      ctx.strokeStyle = cColors[ci];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.restore();
    });
  }

  // ── Previous patterns ─────────────────────────────────────────────────────
  exData.patterns.forEach(function(p, i) {
    if (step && i >= step.pi) return;
    ctx.beginPath();
    ctx.arc(px(p.x[0]), py(p.x[1]), 4, 0, 2*Math.PI);
    ctx.fillStyle = dk ? '#55524a' : '#c8c5bc';
    ctx.fill();
    ctx.fillStyle = dk ? '#888780' : '#888780';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P'+(i+1), px(p.x[0])+5, py(p.x[1])-2);
  });

  // ── Current pattern ───────────────────────────────────────────────────────
  if (step) {
    var x = step.x;
    ctx.beginPath();
    ctx.arc(px(x[0]), py(x[1]), 7, 0, 2*Math.PI);
    ctx.fillStyle = dk ? 'rgba(95,200,150,0.9)' : 'rgba(30,150,80,0.9)';
    ctx.fill();
    ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P'+(step.pi+1)+' t=['+x[0]+','+x[1]+']', px(x[0])+9, py(x[1])-3);

    // Lines to centers
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
        var mx = px((x[0]+c[0])/2), my = py((x[1]+c[1])/2);
        ctx.setLineDash([]);
        ctx.fillStyle = cColors[ci];
        ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('φ'+(ci+1)+'='+step.phis[ci].toFixed(4), mx+8, my-4);
        ctx.restore();
      });
    }
  }
};

// Draw final predictions overlaid on time series
RbfTsCanvas_T.prototype.drawTimeSeries = function(exData) {
  var dk  = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 42, TPAD = 20;
  var n = exData.y_series.length;
  var drawW = CW - 2*PAD, drawH = CH - PAD - TPAD;
  var minY = -0.1, maxY = 1.15;

  function px(i) { return PAD + (i/(n-1))*drawW; }
  function py(v) { return TPAD + (1-(v-minY)/(maxY-minY))*drawH; }

  // Grid
  ctx.save(); ctx.strokeStyle = dk ? '#2a2a28' : '#eeece6'; ctx.lineWidth = 0.5;
  [0,0.2,0.4,0.6,0.8,1.0].forEach(function(v) {
    ctx.beginPath(); ctx.moveTo(PAD,py(v)); ctx.lineTo(PAD+drawW,py(v)); ctx.stroke();
    ctx.fillStyle = dk ? '#555248' : '#bbb8b0';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), PAD-5, py(v)+3);
  });
  ctx.restore();

  // Original series
  ctx.save();
  ctx.strokeStyle = dk ? '#6d8fa8' : '#4a7090'; ctx.lineWidth = 2;
  ctx.beginPath();
  exData.y_series.forEach(function(v,i) { i===0?ctx.moveTo(px(i),py(v)):ctx.lineTo(px(i),py(v)); });
  ctx.stroke();
  exData.y_series.forEach(function(v,i) {
    ctx.beginPath(); ctx.arc(px(i),py(v),4,0,2*Math.PI);
    ctx.fillStyle = dk ? '#6d8fa8' : '#4a7090'; ctx.fill();
    ctx.fillStyle = dk ? '#c2c0b6' : '#333';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, px(i), py(v)-8);
  });
  ctx.restore();

  // Predictions
  var preds = exData.predictions;
  ctx.save(); ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  preds.forEach(function(pr,i) {
    var xi = pr.t + 1;  // prediction is for t+2, index t+1 (0-based)
    i===0?ctx.moveTo(px(xi),py(pr.y_hat)):ctx.lineTo(px(xi),py(pr.y_hat));
  });
  ctx.stroke(); ctx.setLineDash([]);
  preds.forEach(function(pr) {
    var xi = pr.t + 1;
    ctx.beginPath(); ctx.arc(px(xi),py(pr.y_hat),4,0,2*Math.PI);
    ctx.fillStyle = '#EF9F27'; ctx.fill();
  });
  ctx.restore();

  // x-axis
  ctx.fillStyle = dk ? '#888780' : '#888780'; ctx.font = '9px sans-serif';
  exData.y_series.forEach(function(v,i) {
    ctx.textAlign = 'center';
    ctx.fillText('t'+(i+1), px(i), TPAD+drawH+14);
  });
  ctx.fillText('Índice de tempo t', PAD+drawW/2, TPAD+drawH+26);

  // Legend
  ctx.fillStyle = dk ? '#6d8fa8' : '#4a7090';
  ctx.fillRect(PAD, TPAD+drawH+34, 18, 3);
  ctx.fillStyle = dk ? '#c2c0b6' : '#333'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('y original', PAD+22, TPAD+drawH+38);
  ctx.fillStyle = '#EF9F27'; ctx.fillRect(PAD+90, TPAD+drawH+34, 18, 3);
  ctx.fillStyle = dk ? '#c2c0b6' : '#333';
  ctx.fillText('ŷ RBF(t)', PAD+112, TPAD+drawH+38);
};

// ── Panel builders ────────────────────────────────────────────────────────────
function _rbfTPhaseLabel(phase) {
  var labels = [
    ['1','apresentar padrão t','b1'],
    ['2','calcular ativações φ(t)','b2'],
    ['3','adicionar linha a G','b4'],
  ];
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  labels.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active?'border2':'border3') + ');' +
      'background:' + (active?'var(--bg2)':'transparent') + ';' +
      'color:' + (active?'var(--text)':'var(--text3)') + ';">' +
      pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

function buildRbfTPanel(step, phase, cfg) {
  var html = _rbfTPhaseLabel(phase);

  html += '<div class="card"><div class="ct">Padrão P' + (step.pi+1) + '/' + cfg.n_patterns +
    ' &nbsp;(t=' + step.t + '→' + (step.t+1) + '→' + (step.t+2) + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2.2;color:var(--text2)">' +
    'x = [<strong>t=' + step.x[0] + '</strong>, <strong>t=' + step.x[1] + '</strong>]' +
    ' &nbsp;|&nbsp; y_in = [' + step.y_in[0] + ', ' + step.y_in[1] + ']' +
    ' &nbsp;|&nbsp; d = <strong>' + step.d + '</strong>' +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Janela de tempo (k=2)</div>';
    html += '<div style="font-size:11px;color:var(--text3);line-height:1.9">' +
      't₁ = <strong>' + step.x[0] + '</strong> (y=' + step.y_in[0] + ')' +
      ' &nbsp; t₂ = <strong>' + step.x[1] + '</strong> (y=' + step.y_in[1] + ')' +
      ' &nbsp;→&nbsp; prever y(t=' + (step.t+2) + ') = <strong>' + step.d + '</strong><br>' +
      'Centros em espaço de tempo: u₁=[1,2] · u₂=[4,5] · u₃=[7,8]<br>' +
      'φⱼ(x) = exp( −||t − uⱼ||² / (2σ²) ) = exp( −||t − uⱼ||² / 2 )' +
      '</div></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Calcular ativações φ (t-espaço)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">centro uⱼ</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">||t−uⱼ||²</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">−||·||²/2</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">φⱼ</th>' +
      '</tr></thead><tbody>';
    step.sq_dists.forEach(function(sq, j) {
      var centers = [[1,2],[4,5],[7,8]];
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 6px;color:var(--text3)">' +
          'u' + (j+1) + '=[' + centers[j] + ']</td>' +
        '<td style="text-align:right;padding:3px 6px">' + sq.toFixed(6) + '</td>' +
        '<td style="text-align:right;padding:3px 6px">' + (-sq/2).toFixed(6) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' +
          step.phis[j].toFixed(6) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      'θ = 1.0 (bias)</div></div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Adicionar linha à matriz G</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Nova linha: [φ₁, φ₂, φ₃, θ] = [' +
      step.phis[0].toFixed(6) + ', ' + step.phis[1].toFixed(6) + ', ' +
      step.phis[2].toFixed(6) + ', 1.0]</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400"></th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">φ₁</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">φ₂</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">φ₃</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">θ</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">d</th>' +
      '</tr></thead><tbody>';
    step.G_so_far.forEach(function(row, i) {
      var isNew = i === step.pi;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (isNew?';background:var(--warn-bg)':'') + '">' +
        '<td style="padding:2px 5px;' + (isNew?'color:var(--warn);font-weight:700':'color:var(--text3)') +
          '">P' + (i+1) + (isNew?' ← novo':'') + '</td>' +
        row.map(function(v) {
          return '<td style="text-align:right;padding:2px 5px' +
            (isNew?';font-weight:700;color:var(--warn)':'') + '">' + v.toFixed(6) + '</td>';
        }).join('') +
        '<td style="text-align:right;padding:2px 5px;color:var(--text3)">' +
          (isNew ? step.d : '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildRbfTSolvePanel(exData) {
  var w     = exData.weights;
  var preds = exData.predictions;
  var GtG   = exData.GtG;
  var Gtd   = exData.Gtd;

  var html = '<div class="card"><div class="ct">🔢 Resolver: w = (G<sup>T</sup>G)<sup>−1</sup> G<sup>T</sup>d &nbsp;(sistema 4×4)</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">G<sup>T</sup>G (4×4):</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:10px;margin-bottom:10px">';
  GtG.forEach(function(row) {
    html += '<tr>' + row.map(function(v) {
      return '<td style="padding:2px 8px;border:0.5px solid var(--border3);text-align:right">' + v.toFixed(4) + '</td>';
    }).join('') + '</tr>';
  });
  html += '</table>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">G<sup>T</sup>d:</div>';
  html += '<div style="font-family:monospace;font-size:11px;padding:6px 12px;background:var(--bg2);' +
    'border-radius:6px;border:0.5px solid var(--border3);margin-bottom:12px">' +
    '[' + Gtd.map(function(v){return v.toFixed(6);}).join(', ') + ']</div>';

  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;' +
    'background:var(--warn-bg);border-radius:6px;border:0.5px solid var(--warn);margin-bottom:12px">' +
    '<strong style="color:var(--warn)">w</strong> = [w₁,w₂,w₃,w₀] = [' +
    '<strong>' + w[0].toFixed(6) + '</strong>, ' +
    '<strong>' + w[1].toFixed(6) + '</strong>, ' +
    '<strong>' + w[2].toFixed(6) + '</strong>, ' +
    '<strong>' + w[3].toFixed(6) + '</strong>]</div>';

  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:12px">' +
    'ŷ = w₁·φ₁(t) + w₂·φ₂(t) + w₃·φ₃(t) + w₀·θ</div>';
  html += '</div>';

  html += '<div class="card"><div class="ct">📈 Predições vs. valores reais</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400">P</th>' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400">t=[t₁,t₂]</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--warn)">ŷ</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--info)">e</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">e²</th>' +
    '</tr></thead><tbody>';
  preds.forEach(function(pr) {
    var big = Math.abs(pr.error) > 0.1;
    html += '<tr style="border-top:0.5px solid var(--border3)' +
      (big?';background:rgba(220,60,60,0.06)':'') + '">' +
      '<td style="padding:2px 5px;color:var(--text3)">P' + pr.t + '</td>' +
      '<td style="padding:2px 5px">[' + pr.x[0] + ',' + pr.x[1] + ']</td>' +
      '<td style="text-align:right;padding:2px 5px">' + pr.d.toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + pr.y_hat.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;color:var(--info)">' +
        (pr.error>=0?'+':'') + pr.error.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + pr.sq_err.toFixed(6) + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="text-align:right;padding:8px 5px;font-family:monospace;font-size:11px;' +
    'font-weight:600;color:var(--success)">MSE = ' + exData.mse.toFixed(6) + '</div>';
  html += '</div>';

  // Comparison note
  html += '<div class="card" style="font-size:11px;color:var(--text3);line-height:1.9">' +
    '<strong style="color:var(--text2)">Comparação com Atividade 7.1 (entradas y):</strong><br>' +
    '• 7.1 MSE ≈ 0.004223 &nbsp;|&nbsp; 7.2 MSE ≈ ' + exData.mse.toFixed(6) + '<br>' +
    '• Entradas y capturam a <em>forma</em> da série · entradas t capturam a <em>posição temporal</em><br>' +
    '• Com σ=1 em t-espaço, Gaussianas quase não se sobrepõem (||u₁−u₂||²=18 → φ≈0)' +
    '</div>';
  return html;
}
