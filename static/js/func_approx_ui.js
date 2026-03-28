function FuncApproxCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
  this.PAD = 52;
}
FuncApproxCanvas.prototype = Object.create(BaseCanvas.prototype);

FuncApproxCanvas.prototype._jsForward = function(x1, ws) {
  var p = ws.W.length, z = [];
  for (var j = 0; j < p; j++) {
    var zs = ws.theta_a[j] + ws.V[j][0] * x1;
    z.push(1.0 / (1.0 + Math.exp(-zs)));
  }
  var y = ws.theta_b;
  for (var j = 0; j < p; j++) y += ws.W[j] * z[j];
  return y;
};

FuncApproxCanvas.prototype.draw = function(ws, curPi, train, showCurve) {
  var dk  = isDark();
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg = this.cfg;
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  this.drawGrid(true);

  var tx = this.tx.bind(this), ty = this.ty.bind(this);

  if (showCurve && ws) {
    var steps = 300;
    var xRange = cfg.x1max - cfg.x1min;
    ctx.beginPath();
    ctx.strokeStyle = dk ? '#93c5fd' : '#185FA5';
    ctx.lineWidth = 2;
    var started = false;
    for (var i = 0; i <= steps; i++) {
      var xv = cfg.x1min + (i / steps) * xRange;
      var yv = this._jsForward(xv, ws);
      if (yv < this._ymin - 0.5 || yv > this._ymax + 0.5) { started = false; continue; }
      if (!started) { ctx.moveTo(tx(xv), ty(yv)); started = true; }
      else ctx.lineTo(tx(xv), ty(yv));
    }
    ctx.stroke();
  }

  for (var i = 0; i < train.length; i++) {
    var p    = train[i];
    var ppx  = tx(p.x1), ppy = ty(p.d);
    var isCur = i === curPi;

    if (isCur) {
      ctx.beginPath(); ctx.arc(ppx, ppy, 13, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(239,159,39,0.28)' : 'rgba(250,199,117,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ppx, ppy, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(ppx, ppy, 5, 0, Math.PI * 2);
    ctx.fillStyle   = dk ? 'rgba(29,158,117,0.9)' : 'rgba(29,158,117,0.88)';
    ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56';
    ctx.lineWidth   = isCur ? 2.5 : 1.5;
    ctx.fill(); ctx.stroke();

    if (ws) {
      var yhat = this._jsForward(p.x1, ws);
      if (yhat >= this._ymin - 0.5 && yhat <= this._ymax + 0.5) {
        ctx.beginPath(); ctx.arc(tx(p.x1), ty(yhat), 4, 0, Math.PI * 2);
        ctx.fillStyle   = dk ? 'rgba(239,159,39,0.8)' : 'rgba(186,117,23,0.85)';
        ctx.strokeStyle = dk ? '#EF9F27' : '#BA7517';
        ctx.lineWidth   = 1;
        ctx.fill(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tx(p.x1), ty(p.d));
        ctx.lineTo(tx(p.x1), ty(yhat));
        ctx.strokeStyle = dk ? 'rgba(239,159,39,0.35)' : 'rgba(186,117,23,0.35)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
};

if (typeof tex === 'undefined') {
  function tex(src) {
    try { return katex.renderToString(src, {throwOnError: false, displayMode: false}); }
    catch(e) { return src; }
  }
}
if (typeof rule === 'undefined') {
  function rule(src) {
    return '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
      tex(src) + '</div>';
  }
}

function buildFuncApproxPanel(step, phase, train) {
  var fwd = step.forward;
  var nH  = step.weights_before.W.length;
  var d   = step.pattern.d;
  var x1  = step.pattern.x1;
  var html = '';

  var phases = [['1','forward pass','b1'],['2','output update','b2'],['3','hidden update','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += mseTrackerHTML(step, phase, train);

  html += '<div class="card"><div class="ct">Pattern n=' + step.pattern.n +
    ' — Iteration ' + step.iter + ' (' + (step.pi + 1) + '/' + train.length + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x = ' + x1 + ' &nbsp; d = ' + d + '</div></div>';

  if (phase === 0) {
    var ws = step.weights_before;

    html += '<div class="card"><div class="ct">Step 1 — Hidden layer</div>';
    html += rule('z_j^* = v_{j1} x + \\theta_{a_j} \\qquad z_j = \\sigma(z_j^*)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b8a<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">z<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text2)">' + fmt6(fwd.z_star[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(fwd.z[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    var ws0 = step.weights_before;
    var wsum = 0;
    html += '<div class="card"><div class="ct">Step 2 — Output neuron (linear)</div>';
    html += rule('y = \\textstyle\\sum_j w_j z_j + \\theta_b');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub>\u00b7z<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var contrib = Math.round(ws0.W[j] * fwd.z[j] * 1e6) / 1e6;
      wsum += contrib;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws0.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(fwd.z[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(contrib) + '</td></tr>';
    }
    html += '<tr style="border-top:1px solid var(--border2)">' +
      '<td colspan="3" style="padding:3px 4px;color:var(--text3);font-size:10px">\u03b8b = ' + fmt4(ws0.theta_b) + '</td>' +
      '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + fmt4(ws0.theta_b) + '</td></tr>';
    html += '</tbody></table>';
    var wsumR = Math.round(wsum * 1e6) / 1e6;
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">y = ' + wsumR + ' + (' + fmt4(ws0.theta_b) + ')</span>' +
      '<span style="font-weight:500">y = <span style="color:var(--warn)">' + fmt6(fwd.y) + '</span>' +
      ' &nbsp; d = ' + d + ' &nbsp; error = ' + fmt6(step.delta_out) + '</span>' +
      '<span style="color:var(--text3)">MSE(pattern) = \u00bd(d\u2212y)\u00b2 = ' + fmt6(step.mse_pattern) + '</span>' +
      '</div></div>';

  } else if (phase === 1) {
    var dOut = step.delta_out;
    var wb = step.weights_before, wa = step.weights_after;

    html += '<div class="card"><div class="ct">Step 3 — Output error (linear output)</div>';
    html += rule('\\delta_{out} = d - y');
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">\u03b4_out = ' + d + ' \u2212 ' + fmt6(fwd.y) + '</span>' +
      '<span style="font-weight:500;color:var(--warn)">\u03b4_out = ' + fmt6(dOut) + '</span>' +
      '</div></div>';

    html += '<div class="card"><div class="ct">Output weight update</div>';
    html += rule('\\Delta w_j = \\alpha \\cdot \\delta_{out} \\cdot z_j \\qquad \\Delta\\theta_b = \\alpha \\cdot \\delta_{out}');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w<sub>j</sub>\u2032</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(fwd.z[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.dW[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + fmt4(wb.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.W[j]) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
      '\u0394\u03b8b = ' + fmtS6(step.d_theta_b) + '  \u2192  <span style="color:var(--warn);font-weight:500">\u03b8b = ' + fmt4(wa.theta_b) + '</span></div>';
    html += '</div>';

  } else if (phase === 2) {
    var wb = step.weights_before, wa = step.weights_after;

    html += '<div class="card"><div class="ct">Step 4 — Hidden error signals</div>';
    html += rule('\\delta_j = \\delta_{out} \\cdot w_j \\cdot z_j(1-z_j)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub>(1\u2212z<sub>j</sub>)</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03b4<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var zj = fwd.z[j], zprime = Math.round(zj * (1 - zj) * 1e6) / 1e6;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(wb.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(zprime) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(step.delta_h[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    html += '<div class="card"><div class="ct">Hidden weight update</div>';
    html += rule('\\Delta v_{j1} = \\alpha \\cdot \\delta_j \\cdot x \\qquad \\Delta\\theta_{a_j} = \\alpha \\cdot \\delta_j');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394\u03b8a<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>\u2032</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03b8a<sub>j</sub>\u2032</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.dV[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.d_theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.theta_a[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }

  return html;
}

function mseTrackerHTML(step, phase, train) {
  var mse = step.mse_train;
  var label = phase === 0 ? 'Before update' : 'After update';
  var html = '<div class="card" style="margin-bottom:8px">';
  html += '<div class="ct">Training MSE \u2014 ' + label + '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;margin-top:4px">';
  html += '<span style="color:var(--text2)">MSE = <strong>' + fmt6(mse) + '</strong></span>';
  var pct = Math.max(0, Math.min(100, 100 * (1 - mse / 10)));
  html += '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + pct + '%;height:100%;background:' + (mse < 0.01 ? 'var(--success)' : mse < 1 ? 'var(--warn)' : 'var(--error,#dc2626)') + ';border-radius:4px"></div></div>';
  html += '<span style="color:var(--text3)">' + (mse < 0.01 ? 'excellent' : mse < 0.5 ? 'good' : mse < 2 ? 'converging' : 'high error') + '</span>';
  html += '</div></div>';
  return html;
}

function buildFuncApproxTestPanel(exData) {
  var fw  = exData.final_weights;
  var cfg = exData.config;
  var nH  = cfg.n_hidden;

  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 ' + cfg.n_iters +
    ' iterations \u00b7 ' + nH + ' hidden neurons \u00b7 \u03b1=' + cfg.alpha + '</div>';

  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Final MSE: <strong style="color:' +
    (exData.final_mse < 0.05 ? 'var(--success)' : 'var(--warn)') + '">' + fmt6(exData.final_mse) + '</strong></div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Final weights \u2014 hidden layer V</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 6px;font-weight:400">j</th>' +
    '<th style="padding:2px 6px;font-weight:400">v<sub>j1</sub></th>' +
    '<th style="padding:2px 6px;font-weight:400">\u03b8a<sub>j</sub></th></tr></thead><tbody>';
  for (var j = 0; j < nH; j++) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j + 1) + '</td>' +
      '<td style="padding:2px 6px">' + fmt4(fw.V[j][0]) + '</td>' +
      '<td style="padding:2px 6px">' + fmt4(fw.theta_a[j]) + '</td></tr>';
  }
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:12px">';
  html += 'W = [' + fw.W.map(fmt4).join(', ') + '] &nbsp; \u03b8b = ' + fmt4(fw.theta_b);
  html += '</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Fit quality \u2014 all 13 training points</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 4px;font-weight:400">n</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">y</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">|error|</th></tr></thead><tbody>';
  exData.train.forEach(function(p) {
    var y = 0, z = [];
    for (var j = 0; j < nH; j++) {
      var zs = fw.theta_a[j] + fw.V[j][0] * p.x1;
      z.push(1.0 / (1.0 + Math.exp(-zs)));
    }
    y = fw.theta_b;
    for (var j = 0; j < nH; j++) y += fw.W[j] * z[j];
    var err = Math.abs(y - p.d);
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 4px;color:var(--text3)">' + p.n + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + p.x1 + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + p.d + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:500;color:var(--warn)">' + fmt4(Math.round(y*1e4)/1e4) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:' + (err < 0.1 ? 'var(--success)' : 'var(--warn)') + '">' + fmt4(Math.round(err*1e4)/1e4) + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '</div>';
  return html;
}
