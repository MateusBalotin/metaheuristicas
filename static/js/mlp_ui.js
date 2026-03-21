function MLPCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
MLPCanvas.prototype = Object.create(BaseCanvas.prototype);

// Evaluate a single forward pass in JS for heatmap rendering only
MLPCanvas.prototype._jsForward = function(x1, x2, ws) {
  var p = ws.W.length, z = [];
  for (var j = 0; j < p; j++) {
    var zs = ws.theta_a[j] + ws.V[j][0] * x1 + ws.V[j][1] * x2;
    z.push(1.0 / (1.0 + Math.exp(-zs)));
  }
  var ys = ws.theta_b;
  for (var j = 0; j < p; j++) ys += ws.W[j] * z[j];
  return 1.0 / (1.0 + Math.exp(-ys));
};

MLPCanvas.prototype.draw = function(ws, curPi, train, isTest, results, showHeatmap) {
  this._ymin = this.cfg.y_def_min;
  this._ymax = this.cfg.y_def_max;

  var dk = isDark();
  this.ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  this.ctx.fillRect(0, 0, this.CW, this.CH);

  if (ws && showHeatmap) this._drawHeatmap(ws);

  this.drawGrid(true);
  this.drawPoints(train, isTest ? null : curPi, isTest, results);
};

MLPCanvas.prototype._drawHeatmap = function(ws) {
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg = this.cfg, dk = isDark();
  var imgW = CW - 2 * PAD, imgH = CH - 2 * PAD;
  var imgData = ctx.createImageData(imgW, imgH);
  var posR = dk ? [29,158,117] : [29,200,140];
  var negR = dk ? [216,90,48]  : [220,80,40];
  var self = this;

  for (var px = 0; px < imgW; px++) {
    var x1v = cfg.x1min + (px / imgW) * (cfg.x1max - cfg.x1min);
    for (var py = 0; py < imgH; py++) {
      var x2v = this._ymax - (py / imgH) * (this._ymax - this._ymin);
      var y   = self._jsForward(x1v, x2v, ws);
      var conf = Math.abs(y - 0.5) * 2;  // 0 = no confidence, 1 = full confidence
      // Always show at least a faint tint (min 25), scale up with confidence
      var alpha_px = Math.round(25 + conf * (dk ? 95 : 75));
      var col = y >= 0.5 ? posR : negR;
      var idx = (py * imgW + px) * 4;
      imgData.data[idx]     = col[0];
      imgData.data[idx + 1] = col[1];
      imgData.data[idx + 2] = col[2];
      imgData.data[idx + 3] = alpha_px;
    }
  }
  ctx.putImageData(imgData, PAD, PAD);
};

if (typeof tex === 'undefined') {
  function tex(src) {
    try { return katex.renderToString(src, {throwOnError: false, displayMode: false}); }
    catch(e) { return src; }
  }
}

function rule(src) {
  return '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
    tex(src) + '</div>';
}

function buildMLPPanel(step, phase, train) {
  var fwd = step.forward;
  var nH  = step.weights_before.W.length;
  var d   = step.pattern.d;
  var ds  = d === 1 ? '+1' : '−1';
  var x1  = step.pattern.x1, x2 = step.pattern.x2;
  var html = '';

  var phases = [['1','forward pass','b1'],['2','output update','b2'],['3','hidden update','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active?'border2':'border3') + ');background:' + (active?'var(--bg2)':'transparent') +
      ';color:' + (active?'var(--text)':'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += scoreTrackerHTML(step.train_results, step.train_score, train, step.pi, phase,
    phase === 0 ? 'Before update' : 'After update');

  html += '<div class="card"><div class="ct">Pattern n=' + step.pattern.n + ' — Iteration ' + step.iter + ' (' + (step.pi+1) + '/'+train.length+')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">x₁=' + x1 + '  x₂=' + x2 + '  d=' + ds + '</div></div>';

  if (phase === 0) {
    var ws = step.weights_before;

    // Step 1 — hidden layer
    html += '<div class="card"><div class="ct">Step 1 — Hidden layer</div>';
    html += rule('z_j^* = \\textstyle\\sum_i v_{ij}\\, x_i + \\theta_{a_j} \\qquad z_j = \\sigma(z_j^*)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j2</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">θa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">z<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.V[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text2)">' + fmt6(fwd.z_star[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(fwd.z[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    // Step 2 — output
    var ws0 = step.weights_before;
    var wsum = 0;
    html += '<div class="card"><div class="ct">Step 2 — Output neuron</div>';
    html += rule('y^* = \\textstyle\\sum_j w_j\\, z_j + \\theta_b \\qquad y = \\sigma(y^*)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub>·z<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var contrib = Math.round(ws0.W[j] * fwd.z[j] * 1e6) / 1e6;
      wsum += contrib;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws0.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(fwd.z[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(contrib) + '</td></tr>';
    }
    html += '<tr style="border-top:1px solid var(--border2)">' +
      '<td colspan="3" style="padding:3px 4px;color:var(--text3);font-size:10px">θb = ' + fmt4(ws0.theta_b) + '</td>' +
      '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + fmt4(ws0.theta_b) + '</td></tr>';
    html += '</tbody></table>';
    var wsumR = Math.round(wsum * 1e6) / 1e6;
    var correct = (fwd.y >= 0.5) === (d === 1);
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = ' + wsumR + ' + (' + fmt4(ws0.theta_b) + ') = ' + fmt6(fwd.y_star) + '</span>' +
      '<span style="font-weight:500">y  = σ(' + fmt6(fwd.y_star) + ') = <span style="color:var(--warn)">' + fmt6(fwd.y) + '</span>' +
      '  →  ' + (fwd.y >= 0.5 ? '+1' : '−1') + '  (d=' + ds + (correct ? ' ✓' : ' ✗') + ')</span>' +
      '<span style="color:var(--text3)">MSE = ½·(d−y)² = ' + fmt6(step.mse) + '</span>' +
      '</div></div>';

  } else if (phase === 1) {
    var y = fwd.y, dOut = step.delta_out;
    var wb = step.weights_before, wa = step.weights_after;

    html += '<div class="card"><div class="ct">Step 3 — Output error signal</div>';
    html += rule('\\delta_{out} = y(1-y)(d-y)');
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">δ_out = ' + fmt6(y) + '·(1−' + fmt6(y) + ')·(' + ds + '−' + fmt6(y) + ')</span>' +
      '<span style="font-weight:500;color:var(--warn)">δ_out = ' + fmt6(dOut) + '</span>' +
      '</div></div>';

    html += '<div class="card"><div class="ct">Output weight updates</div>';
    html += rule('\\Delta w_j = \\alpha \\cdot \\delta_{out} \\cdot z_j \\qquad \\Delta\\theta_b = \\alpha \\cdot \\delta_{out}');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δw<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w<sub>j</sub>′</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(fwd.z[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.dW[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + fmt4(wb.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.W[j]) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
      'Δθb = ' + fmtS6(step.d_theta_b) + '  →  <span style="color:var(--warn);font-weight:500">θb = ' + fmt4(wa.theta_b) + '</span></div>';
    html += '</div>';

  } else if (phase === 2) {
    var wb = step.weights_before, wa = step.weights_after;

    html += '<div class="card"><div class="ct">Step 4 — Hidden error signals</div>';
    html += rule('\\delta_j = \\delta_{out} \\cdot w_j \\cdot z_j(1-z_j)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub>(1−z<sub>j</sub>)</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">δ<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var zj = fwd.z[j], zprime = Math.round(zj * (1-zj) * 1e6) / 1e6;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(wb.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt6(zprime) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(step.delta_h[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    html += '<div class="card"><div class="ct">Hidden weight updates</div>';
    html += rule('\\Delta v_{ij} = \\alpha \\cdot \\delta_j \\cdot x_i \\qquad \\Delta\\theta_{a_j} = \\alpha \\cdot \\delta_j');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j2</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δθa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>′</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j2</sub>′</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">θa<sub>j</sub>′</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j+1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.dV[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.dV[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.d_theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.V[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.theta_a[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }
  return html;
}

function buildMLPTestPanel(exData) {
  var fw = exData.final_weights, cfg = exData.config;
  var lastStep = exData.steps[exData.steps.length - 1];
  var trainSc  = lastStep.train_score;

  var html = '<div class="card"><div class="ct">🎯 Final results — ' + cfg.n_iters + ' iterations · ' + cfg.n_hidden + ' hidden neurons · α=' + cfg.alpha + ' · seed=' + cfg.seed + '</div>';

  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ ' + trainSc.correct + '/' + cfg.n_train + '</span>' +
    '<span style="color:var(--warn)">✗ ' + trainSc.errors + '/' + cfg.n_train + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' + (trainSc.correct===cfg.n_train?'var(--success)':'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div></div>';

  html += testResultsHTML(exData.test_annotated, exData.test_score);
  html += '</div>';
  return html;
}
