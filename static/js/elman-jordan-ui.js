// elman-jordan-ui.js  — canvas renderer + panel builders

function EJCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

EJCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

EJCanvas.prototype.draw = function(exData, step) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var cfg  = exData.config;
  var ws   = step ? step.weights_after : exData.final_weights;
  var fwd  = step ? step.forward : null;
  var x    = step ? step.x    : null;
  var sctx = step ? step.ctx  : null;

  var R   = 18;
  var CX  = CW / 2;

  // Layer y positions
  var yOut  = 55;
  var yHid  = 185;
  var yInp  = 340;

  // Node positions
  var outPos  = [[CX, yOut]];
  var hidPos  = [[CX - 55, yHid], [CX + 55, yHid]];
  var xPos    = [[CX - 90, yInp], [CX + 90, yInp]];
  var ctxPos  = cfg.network === 'elman'
    ? [[CX - 155, yInp], [CX + 155, yInp]]
    : [[CX, yInp + 55]];

  function nodeColor(val, isActive, isInput) {
    if (!isActive) return dk ? '#2a2a28' : '#f0eeea';
    var v = Math.max(0, Math.min(1, val));
    if (isInput) return 'rgba(74,158,255,' + (0.3 + v * 0.7) + ')';
    return 'rgba(239,159,39,' + (0.3 + v * 0.7) + ')';
  }

  // Draw connections: hidden←input
  for (var j = 0; j < 2; j++) {
    for (var i = 0; i < 2; i++) {
      var w = ws.Wa[j][i];
      _ejLine(ctx, xPos[i], hidPos[j], w, dk);
    }
  }
  // hidden←context
  for (var j = 0; j < 2; j++) {
    for (var k = 0; k < ctxPos.length; k++) {
      var w = ws.Wb[j][k];
      _ejLine(ctx, ctxPos[k], hidPos[j], w, dk);
    }
  }
  // output←hidden
  for (var j = 0; j < 2; j++) {
    _ejLine(ctx, hidPos[j], outPos[0], ws.W[j], dk);
  }

  // Draw feedback arrow (z^{-1})
  ctx.save();
  ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  if (cfg.network === 'elman') {
    // Arrow from hidden neurons down to context (curved, right side)
    for (var j = 0; j < 2; j++) {
      var hx = hidPos[j][0], hy = hidPos[j][1];
      var cx2 = ctxPos[j][0], cy2 = ctxPos[j][1];
      ctx.beginPath();
      ctx.moveTo(hx + R, hy);
      ctx.bezierCurveTo(hx + 70, hy + 60, cx2 + 70, cy2 - 40, cx2 + R, cy2);
      ctx.stroke();
    }
  } else {
    // Arrow from output down to context (right side)
    var ox = outPos[0][0], oy = outPos[0][1];
    var cx2 = ctxPos[0][0], cy2 = ctxPos[0][1];
    ctx.beginPath();
    ctx.moveTo(ox + R, oy);
    ctx.bezierCurveTo(ox + 110, oy + 80, cx2 + 80, cy2 - 50, cx2 + R, cy2);
    ctx.stroke();
  }
  ctx.restore();

  // Delay box label z^{-1}
  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = dk ? '#5DCAA5' : '#0F6E56';
  ctx.textAlign = 'center';
  if (cfg.network === 'elman') {
    ctx.fillText('z⁻¹', CX + 100, yHid + 40);
  } else {
    ctx.fillText('z⁻¹', CX + 110, (yOut + ctxPos[0][1]) / 2);
  }
  ctx.restore();

  // Draw neurons
  var nodeGroups = [
    {pos: outPos,  labels: ['y(t)'],           vals: fwd ? [fwd.y]   : null,          isInput: false},
    {pos: hidPos,  labels: ['z₁(t)','z₂(t)'], vals: fwd ? fwd.z     : null,          isInput: false},
    {pos: xPos,    labels: ['x₁','x₂'],        vals: x   ? x         : null,          isInput: true},
    {pos: ctxPos,  labels: cfg.network === 'elman'
      ? ['z₁(t-1)','z₂(t-1)']
      : ['y(t-1)'],
      vals: sctx ? sctx : null,
      isInput: true},
  ];

  nodeGroups.forEach(function(grp) {
    grp.pos.forEach(function(p, i) {
      var val    = grp.vals ? grp.vals[i] : 0.5;
      var active = grp.vals !== null;
      ctx.beginPath();
      ctx.arc(p[0], p[1], R, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(val || 0, active, grp.isInput);
      ctx.fill();
      ctx.strokeStyle = dk ? '#3a3a36' : '#d0cec8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Value
      if (active && val !== null && val !== undefined) {
        ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(typeof val === 'number' ? val.toFixed(3) : val, p[0], p[1] + 3);
      }
      // Label
      ctx.fillStyle = dk ? '#888780' : '#888780';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(grp.labels[i], p[0], p[1] + R + 12);
    });
  });

  // bias labels
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('θ(2)=[' + ws.theta_h.map(function(v){return v.toFixed(3);}).join(',') + ']', 8, yHid + 5);
  ctx.fillText('θ(3)=' + ws.theta_o.toFixed(3), 8, yOut + 5);

  // Network type label
  ctx.fillStyle = dk ? '#4a9eff' : '#185FA5';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(cfg.network === 'elman' ? 'Elman' : 'Jordan', CW - 8, 18);
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '10px sans-serif';
  ctx.fillText(cfg.dataset.toUpperCase(), CW - 8, 32);
};

function _ejLine(ctx, from, to, w, dk) {
  var abs = Math.abs(w);
  ctx.save();
  ctx.strokeStyle = w >= 0
    ? (dk ? 'rgba(74,158,255,' + (0.15 + abs * 0.5) + ')' : 'rgba(24,95,165,' + (0.15 + abs * 0.5) + ')')
    : (dk ? 'rgba(239,90,90,' + (0.15 + abs * 0.5) + ')' : 'rgba(180,30,30,' + (0.15 + abs * 0.5) + ')');
  ctx.lineWidth = Math.max(0.5, Math.min(3, abs * 4));
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.restore();
}

// ── Phase label ───────────────────────────────────────────────────────────────
function ej_phaseLabel(phase) {
  var labels = [
    ['1','apresentar padrão + contexto','b1'],
    ['2','forward pass','b2'],
    ['3','backprop + atualizar pesos','b4'],
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

// ── Panel builders ────────────────────────────────────────────────────────────
function buildEJPanel(step, phase, cfg) {
  var p    = step.pattern;
  var fwd  = step.forward;
  var html = ej_phaseLabel(phase);

  var netLabel = cfg.network === 'elman' ? 'Elman' : 'Jordan';
  var ctxLabel = cfg.network === 'elman' ? 'z(t−1)' : 'y(t−1)';

  html += '<div class="card"><div class="ct">' + netLabel + ' — ' +
    cfg.dataset.toUpperCase() + ' — padrão P' + p.n + '/' + cfg.n_train +
    ' (iter ' + step.iter + '/' + cfg.n_iters + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2.2;color:var(--text2)">' +
    'x = [' + step.x[0] + ', ' + step.x[1] + ']' +
    ' &nbsp;|&nbsp; d = <strong>' + p.d + '</strong>' +
    ' &nbsp;|&nbsp; ' + ctxLabel + ' = [' + step.ctx.map(function(v){return v.toFixed(4);}).join(', ') + ']' +
    ' &nbsp;|&nbsp; α = ' + cfg.alpha +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Apresentar padrão e contexto</div>';
    html += '<div style="font-size:11px;color:var(--text3);line-height:1.9;font-family:monospace">';
    if (cfg.network === 'elman') {
      html += 'z*(2)(t) = Wa·x(1)(t) + Wb·z(2)(t−1) + θ(2)<br>';
    } else {
      html += 'z*(2)(t) = Wa·x(1)(t) + Wb·y(1)(t−1) + θ(2)<br>';
    }
    html += 'z(2)(t) = σ(z*(2)(t))<br>';
    html += 'y*(3)(t) = W·z(2)(t) + θ(3)<br>';
    html += 'y(3)(t) = σ(y*(3)(t))</div>';

    var ws = step.weights_before;
    html += '<div style="font-family:monospace;font-size:10px;margin-top:8px;color:var(--text3)">';
    html += 'Wa = [[' + ws.Wa[0].map(function(v){return v.toFixed(4);}).join(', ') + '], ' +
                  '[' + ws.Wa[1].map(function(v){return v.toFixed(4);}).join(', ') + ']]<br>';
    html += 'Wb = [[' + ws.Wb[0].map(function(v){return v.toFixed(4);}).join(', ') + '], ' +
                  '[' + ws.Wb[1].map(function(v){return v.toFixed(4);}).join(', ') + ']]<br>';
    html += 'W = [' + ws.W.map(function(v){return v.toFixed(4);}).join(', ') + ']  ' +
            'θ(2)=[' + ws.theta_h.map(function(v){return v.toFixed(4);}).join(', ') + ']  ' +
            'θ(3)=' + ws.theta_o.toFixed(4);
    html += '</div></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Forward pass</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">neurônio</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">entrada líquida z*</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">saída σ(z*)</th>' +
      '</tr></thead><tbody>';
    for (var j = 0; j < 2; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 6px;color:var(--text3)">z' + (j+1) + '(t)</td>' +
        '<td style="text-align:right;padding:3px 6px">' + fwd.z_star[j].toFixed(6) + '</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' + fwd.z[j].toFixed(6) + '</td></tr>';
    }
    html += '<tr style="border-top:1px solid var(--border2);background:var(--warn-bg)">' +
      '<td style="padding:3px 6px;color:var(--text3)">y(t)</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fwd.y_star.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' + fwd.y.toFixed(6) + '</td></tr>';
    html += '</tbody></table>';
    var yc  = fwd.y >= 0.5 ? 1 : 0;
    var ok  = yc === p.d;
    html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;font-family:monospace;font-size:11px;' +
      'background:' + (ok?'var(--success-bg)':'rgba(220,60,60,0.08)') + ';' +
      'border:0.5px solid ' + (ok?'var(--success)':'rgba(220,60,60,0.5)') + ';' +
      'color:' + (ok?'var(--success)':'#e53e3e') + '">' +
      'y=' + fwd.y.toFixed(4) + ' → classe ' + yc + ' &nbsp;|&nbsp; d=' + p.d + ' → ' +
      (ok ? '✓ correto' : '✗ errado') + '</div></div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Backpropagation + atualização</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'δ_out = y·(1−y)·(d−y) = ' + step.delta_out.toFixed(6) + '<br>' +
      'δ_h = [' + step.delta_h.map(function(v){return v.toFixed(6);}).join(', ') + ']</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">parâmetro</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">antes</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--info)">Δ</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400;color:var(--warn)">depois</th>' +
      '</tr></thead><tbody>';
    var wb = step.weights_before, wa = step.weights_after;
    for (var j = 0; j < 2; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 5px;color:var(--text3)">W[' + (j+1) + ']</td>' +
        '<td style="text-align:right;padding:2px 5px">' + wb.W[j].toFixed(4) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;color:var(--info)">' + (step.dW[j]>=0?'+':'') + step.dW[j].toFixed(4) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + wa.W[j].toFixed(4) + '</td></tr>';
    }
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:var(--text3)">θ(3)</td>' +
      '<td style="text-align:right;padding:2px 5px">' + wb.theta_o.toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;color:var(--info)">' + (step.d_theta_o>=0?'+':'') + step.d_theta_o.toFixed(4) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + wa.theta_o.toFixed(4) + '</td></tr>';
    for (var j = 0; j < 2; j++) {
      for (var i = 0; i < 2; i++) {
        html += '<tr style="border-top:0.5px solid var(--border3)">' +
          '<td style="padding:2px 5px;color:var(--text3)">Wa[' + (j+1) + '][' + (i+1) + ']</td>' +
          '<td style="text-align:right;padding:2px 5px">' + wb.Wa[j][i].toFixed(4) + '</td>' +
          '<td style="text-align:right;padding:2px 5px;color:var(--info)">' + (step.dWa[j][i]>=0?'+':'') + step.dWa[j][i].toFixed(4) + '</td>' +
          '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + wa.Wa[j][i].toFixed(4) + '</td></tr>';
      }
    }
    for (var j = 0; j < 2; j++) {
      for (var k = 0; k < step.ctx.length; k++) {
        html += '<tr style="border-top:0.5px solid var(--border3)">' +
          '<td style="padding:2px 5px;color:var(--text3)">Wb[' + (j+1) + '][' + (k+1) + ']</td>' +
          '<td style="text-align:right;padding:2px 5px">' + wb.Wb[j][k].toFixed(4) + '</td>' +
          '<td style="text-align:right;padding:2px 5px;color:var(--info)">' + (step.dWb[j][k]>=0?'+':'') + step.dWb[j][k].toFixed(4) + '</td>' +
          '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">' + wa.Wb[j][k].toFixed(4) + '</td></tr>';
      }
    }
    html += '</tbody></table>';
    var ctxNext = step.ctx.length > 0
      ? (step.ctx.length === 2
        ? 'z(t) = [' + step.forward.z.map(function(v){return v.toFixed(4);}).join(', ') + '] → próximo z(t−1)'
        : 'y(t) = ' + step.forward.y.toFixed(4) + ' → próximo y(t−1)')
      : '';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:10px;color:var(--info)">' + ctxNext + '</div>';
    html += '</div>';
  }
  return html;
}

function buildEJSummaryPanel(exData) {
  var fw  = exData.final_weights;
  var cfg = exData.config;
  var sc  = exData.final_score;
  var res = exData.final_results;
  var ds = exData.steps
    .filter(function(s){ return s.iter === 1; })
    .map(function(s){ return s.pattern; });

  var html = '<div class="card"><div class="ct">🎯 Resultado final — ' +
    (cfg.network==='elman'?'Elman':'Jordan') + ' · ' + cfg.dataset.toUpperCase() +
    ' · α=' + cfg.alpha + ' · ' + cfg.n_iters + ' iterações</div>';

  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:12px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:3px 6px;font-weight:400">P</th>' +
    '<th style="text-align:center;padding:3px 6px;font-weight:400">x</th>' +
    '<th style="text-align:center;padding:3px 6px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">y</th>' +
    '<th style="text-align:center;padding:3px 6px;font-weight:400">classe</th>' +
    '<th style="text-align:center;padding:3px 6px;font-weight:400"></th>' +
    '</tr></thead><tbody>';
  res.forEach(function(r, i) {
    var p = ds[i];
    html += '<tr style="border-top:0.5px solid var(--border3)' + (r.ok?'':';background:rgba(220,60,60,0.06)') + '">' +
      '<td style="padding:3px 6px;color:var(--text3)">P' + (i+1) + '</td>' +
      '<td style="text-align:center;padding:3px 6px">[' + p.x1 + ',' + p.x2 + ']</td>' +
      '<td style="text-align:center;padding:3px 6px">' + p.d + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + r.y.toFixed(6) + '</td>' +
      '<td style="text-align:center;padding:3px 6px">' + r.y_class + '</td>' +
      '<td style="text-align:center;padding:3px 6px">' + (r.ok?'✓':'✗') + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;' +
    'background:' + (sc.correct===sc.total?'var(--success-bg)':'var(--warn-bg)') + ';' +
    'border-radius:6px;border:0.5px solid ' + (sc.correct===sc.total?'var(--success)':'var(--warn)') + ';' +
    'color:' + (sc.correct===sc.total?'var(--success)':'var(--warn)') + ';margin-bottom:12px">' +
    sc.correct + '/' + sc.total + ' corretos (' + sc.pct + '%) após ' + cfg.n_iters + ' iterações</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Pesos finais:</div>';
  html += '<div style="font-family:monospace;font-size:10px;color:var(--text3);line-height:1.9">';
  html += 'W = [' + fw.W.map(function(v){return v.toFixed(4);}).join(', ') + ']  ' +
          'θ(3) = ' + fw.theta_o.toFixed(4) + '<br>';
  html += 'Wa = [[' + fw.Wa[0].map(function(v){return v.toFixed(4);}).join(', ') + '], [' +
                      fw.Wa[1].map(function(v){return v.toFixed(4);}).join(', ') + ']]<br>';
  html += 'Wb = [[' + fw.Wb[0].map(function(v){return v.toFixed(4);}).join(', ') + '], [' +
                      fw.Wb[1].map(function(v){return v.toFixed(4);}).join(', ') + ']]<br>';
  html += 'θ(2) = [' + fw.theta_h.map(function(v){return v.toFixed(4);}).join(', ') + ']';
  html += '</div></div>';
  return html;
}
