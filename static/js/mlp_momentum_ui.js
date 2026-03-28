function MlpMomentumCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
MlpMomentumCanvas.prototype = Object.create(BaseCanvas.prototype);

MlpMomentumCanvas.prototype._jsForward = function(x1, x2, ws) {
  var p = ws.W.length, z = [];
  for (var j = 0; j < p; j++) {
    var zs = ws.theta_a[j] + ws.V[j][0] * x1 + ws.V[j][1] * x2;
    z.push(1.0 / (1.0 + Math.exp(-zs)));
  }
  var ys = ws.theta_b;
  for (var j = 0; j < p; j++) ys += ws.W[j] * z[j];
  return 1.0 / (1.0 + Math.exp(-ys));
};

MlpMomentumCanvas.prototype.draw = function(ws, curPi, train, isTest, results, showHeatmap) {
  this._ymin = this.cfg.y_def_min;
  this._ymax = this.cfg.y_def_max;
  var dk = isDark();
  this.ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  this.ctx.fillRect(0, 0, this.CW, this.CH);
  if (ws && showHeatmap) this._drawHeatmap(ws);
  this.drawGrid(true);
  this.drawPoints(train, isTest ? null : curPi, isTest, results);
};

MlpMomentumCanvas.prototype._drawHeatmap = function(ws) {
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg = this.cfg, dk = isDark();
  var imgW = CW - 2 * PAD, imgH = CH - 2 * PAD;
  var imgData = ctx.createImageData(imgW, imgH);
  var posR = dk ? [29, 158, 117] : [29, 200, 140];
  var negR = dk ? [216, 90, 48]  : [220, 80, 40];
  var self = this;
  for (var px = 0; px < imgW; px++) {
    var x1v = cfg.x1min + (px / imgW) * (cfg.x1max - cfg.x1min);
    for (var py = 0; py < imgH; py++) {
      var x2v  = this._ymax - (py / imgH) * (this._ymax - this._ymin);
      var y    = self._jsForward(x1v, x2v, ws);
      var conf = Math.abs(y - 0.5) * 2;
      var al   = Math.round(25 + conf * (dk ? 95 : 75));
      var col  = y >= 0.5 ? posR : negR;
      var idx  = (py * imgW + px) * 4;
      imgData.data[idx]     = col[0];
      imgData.data[idx + 1] = col[1];
      imgData.data[idx + 2] = col[2];
      imgData.data[idx + 3] = al;
    }
  }
  ctx.putImageData(imgData, PAD, PAD);
};

MlpMomentumCanvas.prototype.drawPoints = function(dataset, curPi, isTest, results) {
  var dk  = isDark();
  var ctx = this.ctx;
  var tx  = this.tx.bind(this), ty = this.ty.bind(this);
  for (var i = 0; i < dataset.length; i++) {
    var p     = dataset[i];
    var ppx   = tx(p.x1), ppy = ty(p.x2);
    var isPos = p.d === 1;
    var isCur = !isTest && i === curPi;
    var ptok  = results ? results[i].ok : false;
    if (ptok) {
      ctx.beginPath(); ctx.arc(ppx, ppy, 16, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(239,159,39,0.28)' : 'rgba(250,199,117,0.55)'; ctx.fill();
    }
    if (isCur) {
      ctx.beginPath(); ctx.arc(ppx, ppy, 17, 0, Math.PI * 2);
      ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2; ctx.stroke();
    }
    var fillC   = isPos ? (dk ? 'rgba(29,158,117,0.9)'  : 'rgba(29,158,117,0.88)')
                        : (dk ? 'rgba(216,90,48,0.9)'   : 'rgba(216,90,48,0.88)');
    var strokeC = isCur ? '#EF9F27'
                        : (isPos ? (dk ? '#5DCAA5' : '#0F6E56') : (dk ? '#F0997B' : '#993C1D'));
    ctx.beginPath(); ctx.arc(ppx, ppy, 9, 0, Math.PI * 2);
    ctx.fillStyle = fillC; ctx.fill();
    ctx.strokeStyle = strokeC; ctx.lineWidth = isCur ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.label || String(p.n), ppx, ppy + 3);
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

function buildMlpMomentumPanel(step, phase, train, gamma) {
  var fwd  = step.forward;
  var nH   = step.weights_before.W.length;
  var d    = step.pattern.d;
  var ds   = String(d);
  var x1   = step.pattern.x1, x2 = step.pattern.x2;
  var lbl  = step.pattern.label || ('n=' + step.pattern.n);
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

  html += scoreTrackerHTML(
    step.train_results, step.train_score, train, step.pi, phase,
    phase === 0 ? 'Before update' : 'After update'
  );

  html += '<div class="card"><div class="ct">Pattern ' + lbl + ' (n=' + step.pattern.n + ') \u2014 Iteration ' + step.iter +
    ' (' + (step.pi + 1) + '/' + train.length + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">x\u2081=' + x1 + '  x\u2082=' + x2 + '  d=' + ds + '</div></div>';

  if (phase === 0) {
    var ws = step.weights_before;
    html += '<div class="card"><div class="ct">Step 1 \u2014 Hidden layer</div>';
    html += rule('z_j^* = \\textstyle\\sum_i v_{ij}\\, x_i + \\theta_{a_j} \\qquad z_j = \\sigma(z_j^*)');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j2</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b8a<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">z<sub>j</sub></th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.V[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmt4(ws.theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text2)">' + fmt6(fwd.z_star[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(fwd.z[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    var ws0 = step.weights_before, wsum = 0;
    html += '<div class="card"><div class="ct">Step 2 \u2014 Output neuron</div>';
    html += rule('y^* = \\textstyle\\sum_j w_j\\, z_j + \\theta_b \\qquad y = \\sigma(y^*)');
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
    var wsumR  = Math.round(wsum * 1e6) / 1e6;
    var yClass = fwd.y >= 0.5 ? 1 : 0;
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = ' + wsumR + ' + (' + fmt4(ws0.theta_b) + ') = ' + fmt6(fwd.y_star) + '</span>' +
      '<span style="font-weight:500">y = \u03c3(' + fmt6(fwd.y_star) + ') = <span style="color:var(--warn)">' + fmt6(fwd.y) + '</span>' +
      ' \u2192 ' + (fwd.y >= 0.5 ? 'Class A (1)' : 'Class B (0)') +
      ' (d=' + ds + (yClass === d ? ' \u2713' : ' \u2717') + ')</span>' +
      '</div></div>';

  } else if (phase === 1) {
    var y = fwd.y, dOut = step.delta_out;
    var wb = step.weights_before, wa = step.weights_after;
    var gam = gamma || 0.6;

    html += '<div class="card"><div class="ct">Step 3 \u2014 Output error signal</div>';
    html += rule('\\delta_{out} = y(1-y)(d-y)');
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">\u03b4_out = ' + fmt6(y) + '\u00b7(1\u2212' + fmt6(y) + ')\u00b7(' + ds + '\u2212' + fmt6(y) + ')</span>' +
      '<span style="font-weight:500;color:var(--warn)">\u03b4_out = ' + fmt6(dOut) + '</span>' +
      '</div></div>';

    html += '<div class="card"><div class="ct">Output weight update <span style="font-weight:400;color:var(--text3)">with momentum \u03b3=' + gam + '</span></div>';
    html += rule('\\Delta w_j = \\alpha \\cdot \\delta_{out} \\cdot z_j + \\gamma \\cdot \\Delta w_j^{prev}');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b1\u00b7\u03b4\u00b7z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b3\u00b7\u0394w<sup>prev</sup></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w<sub>j</sub>\u2032</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var stdTerm = Math.round(1.0 * dOut * fwd.z[j] * 1e6) / 1e6;
      var momTerm = Math.round(gam * step.prev_dws.W[j] * 1e6) / 1e6;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(stdTerm) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--info)">' + fmtS6(momTerm) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500">' + fmtS6(step.dW[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + fmt4(wb.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.W[j]) + '</td></tr>';
    }
    html += '</tbody></table>';
    var stdTb  = Math.round(1.0 * dOut * 1e6) / 1e6;
    var momTb  = Math.round(gam * step.prev_dws.theta_b * 1e6) / 1e6;
    html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
      '\u0394\u03b8b = \u03b1\u00b7\u03b4_out + \u03b3\u00b7\u0394\u03b8b\u1d56\u02b3\u1d49\u1d5b = ' + fmtS6(stdTb) + ' + ' + fmtS6(momTb) + ' = ' + fmtS6(step.d_theta_b) +
      '  \u2192  <span style="color:var(--warn);font-weight:500">\u03b8b = ' + fmt4(wa.theta_b) + '</span></div>';
    html += '</div>';

  } else if (phase === 2) {
    var wb = step.weights_before, wa = step.weights_after;
    var gam = gamma || 0.6;

    html += '<div class="card"><div class="ct">Step 4 \u2014 Hidden error signals</div>';
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

    html += '<div class="card"><div class="ct">Hidden weight update <span style="font-weight:400;color:var(--text3)">with momentum \u03b3=' + gam + '</span></div>';
    html += rule('\\Delta v_{ij} = \\alpha \\cdot \\delta_j \\cdot x_i + \\gamma \\cdot \\Delta v_{ij}^{prev}');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b1\u00b7\u03b4\u00b7x<sub>1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u03b3\u00b7\u0394v<sup>prev</sup></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">\u0394\u03b8a<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>\u2032</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03b8a<sub>j</sub>\u2032</th></tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var stdV   = Math.round(1.0 * step.delta_h[j] * step.pattern.x1 * 1e6) / 1e6;
      var momV   = Math.round(gam * step.prev_dws.V[j][0] * 1e6) / 1e6;
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(stdV) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--info)">' + fmtS6(momV) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500">' + fmtS6(step.dV[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + fmtS6(step.d_theta_a[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt4(wa.theta_a[j]) + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }

  return html;
}

function buildMlpMomentumTestPanel(exData) {
  var fw      = exData.final_weights;
  var cfg     = exData.config;
  var lastStep = exData.steps[exData.steps.length - 1];
  var trainSc  = lastStep.train_score;
  var nH       = cfg.n_hidden;

  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 ' + cfg.n_iters +
    ' iterations \u00b7 ' + nH + ' hidden \u00b7 \u03b1=' + cfg.alpha + ' \u00b7 \u03b3=' + cfg.gamma + '</div>';

  html += '<div style="margin-bottom:10px">';
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Final weights \u2014 hidden layer V</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:4px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 6px;font-weight:400">j</th>' +
    '<th style="padding:2px 6px;font-weight:400">v<sub>j1</sub></th>' +
    '<th style="padding:2px 6px;font-weight:400">v<sub>j2</sub></th>' +
    '<th style="padding:2px 6px;font-weight:400">\u03b8a<sub>j</sub></th></tr></thead><tbody>';
  for (var j = 0; j < nH; j++) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j + 1) + '</td>' +
      '<td style="padding:2px 6px">' + fmt4(fw.V[j][0]) + '</td>' +
      '<td style="padding:2px 6px">' + fmt4(fw.V[j][1]) + '</td>' +
      '<td style="padding:2px 6px">' + fmt4(fw.theta_a[j]) + '</td></tr>';
  }
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-top:4px">';
  html += 'W = [' + fw.W.map(fmt4).join(', ') + '] &nbsp; \u03b8b = ' + fmt4(fw.theta_b);
  html += '</div></div>';

  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (' + cfg.n_train + ' patterns)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">\u2713 ' + trainSc.correct + '/' + cfg.n_train + '</span>' +
    '<span style="color:var(--warn)">\u2717 ' + trainSc.errors + '/' + cfg.n_train + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' +
    (trainSc.correct === cfg.n_train ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div>';
  if (trainSc.correct === cfg.n_train)
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">\u2713 All patterns correctly classified!</div>';
  else
    html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">' + trainSc.errors + ' pattern(s) still misclassified.</div>';
  html += '</div>';

  html += testResultsHTML(exData.test_annotated, exData.test_score);
  html += '</div>';
  return html;
}
