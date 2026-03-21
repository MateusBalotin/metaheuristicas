function AdalineCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
AdalineCanvas.prototype = Object.create(BaseCanvas.prototype);

AdalineCanvas.prototype._computeYRange = function(w1, w2, th, train, showLine) {
  var cfg = this.cfg;

  // Start from the data points — these must always be fully visible
  var pts_y = train.map(function(p) { return p.x2; });
  var pts_min = Math.min.apply(null, pts_y);
  var pts_max = Math.max.apply(null, pts_y);

  // Add a comfortable margin around the points
  var margin = Math.max((pts_max - pts_min) * 0.25, 0.5);
  var ymin = pts_min - margin;
  var ymax = pts_max + margin;

  // Also respect the default viewport so it doesn't shrink too much
  ymin = Math.min(ymin, cfg.y_def_min);
  ymax = Math.max(ymax, cfg.y_def_max);

  // If showing the line, extend range just enough to include it
  if (showLine && w2 !== 0) {
    var lineYvals = [];
    // Sample line y at x1min, x1max and ref_x points
    [cfg.x1min, cfg.x1max].concat(cfg.ref_x).forEach(function(rx) {
      lineYvals.push((-w1 * rx - th) / w2);
    });
    var lineMin = Math.min.apply(null, lineYvals);
    var lineMax = Math.max.apply(null, lineYvals);

    // Clamp: never extend more than 3× the data span in either direction
    var dataSpan = pts_max - pts_min || 1;
    var clampLo  = pts_min - dataSpan * 3;
    var clampHi  = pts_max + dataSpan * 3;

    ymin = Math.max(Math.min(ymin, lineMin - 0.3), clampLo);
    ymax = Math.min(Math.max(ymax, lineMax + 0.3), clampHi);
  }

  return { ymin: ymin, ymax: ymax };
};

AdalineCanvas.prototype.draw = function(step, phase, train, finalW) {
  var w1, w2, th;
  if (finalW) {
    w1 = finalW.w1; w2 = finalW.w2; th = finalW.theta;
  } else {
    var wb = step.weights_before, wa = step.weights_after;
    w1 = phase < 2 ? wb.w1 : wa.w1;
    w2 = phase < 2 ? wb.w2 : wa.w2;
    th = phase < 2 ? wb.theta : wa.theta;
  }
  var showLine = (phase === 2 || !!finalW);

  // Compute y range dynamically so the line is always visible
  var range = this._computeYRange(w1, w2, th, train, showLine);
  this._ymin = range.ymin;
  this._ymax = range.ymax;

  this.ctx.clearRect(0, 0, this.CW, this.CH);
  this.drawGrid();
  if (showLine) this._drawDecisionLine(w1, w2, th);

  var results = finalW ? null : step.train_results;
  this.drawPoints(train, finalW ? null : step.pi, !!finalW, results);
};

AdalineCanvas.prototype._drawDecisionLine = function(w1, w2, th) {
  var dk  = isDark();
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg = this.cfg;
  var tx  = this.tx.bind(this), ty = this.ty.bind(this);
  var hasLine = (w1 !== 0 || w2 !== 0 || th !== 0);
  if (!hasLine) return;

  var lineColor = dk ? '#A78BFA' : '#6d28d9';

  // Shading
  if (w2 !== 0) {
    var posF = dk ? 'rgba(29,158,117,0.07)' : 'rgba(29,200,150,0.10)';
    var negF = dk ? 'rgba(216,90,48,0.07)'  : 'rgba(216,90,48,0.10)';
    var N = CW - 2 * PAD;
    for (var px = 0; px < N; px++) {
      var x1v = cfg.x1min + (px / N) * (cfg.x1max - cfg.x1min);
      var x2b = (-w1 * x1v - th) / w2;
      var canX = PAD + px;
      ctx.fillStyle = posF; ctx.fillRect(canX, PAD, 1, Math.max(0, ty(x2b) - PAD));
      ctx.fillStyle = negF; ctx.fillRect(canX, ty(x2b), 1, Math.max(0, (CH - PAD) - ty(x2b)));
    }
  }

  ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
  ctx.beginPath(); var started = false;
  if (w2 !== 0) {
    for (var x1v = cfg.x1min; x1v <= cfg.x1max; x1v += (cfg.x1max - cfg.x1min) / 500) {
      var x2v = (-w1 * x1v - th) / w2;
      if (x2v < this._ymin - 0.05 || x2v > this._ymax + 0.05) { started = false; continue; }
      if (!started) { ctx.moveTo(tx(x1v), ty(x2v)); started = true; }
      else ctx.lineTo(tx(x1v), ty(x2v));
    }
  } else if (w1 !== 0) {
    var x1l = -th / w1;
    if (x1l >= cfg.x1min && x1l <= cfg.x1max) {
      ctx.moveTo(tx(x1l), PAD); ctx.lineTo(tx(x1l), CH - PAD);
    }
  }
  ctx.stroke(); ctx.setLineDash([]);

  if (w2 !== 0) {
    var self = this;
    cfg.ref_x.forEach(function(rx) {
      var x2v = (-w1 * rx - th) / w2;
      if (x2v < self._ymin || x2v > self._ymax) return;
      ctx.beginPath(); ctx.arc(tx(rx), ty(x2v), 5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor; ctx.fill();
      ctx.strokeStyle = isDark() ? '#1a1a18' : '#fafaf8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = lineColor; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
      ctx.fillText('(' + rx + ',' + fmt4(x2v) + ')', tx(rx) + 7, ty(x2v) - 5);
    });
  }
};

function tex(src) {
  try { return katex.renderToString(src, {throwOnError: false, displayMode: false}); }
  catch(e) { return src; }
}

function buildAdalinePanel(step, phase, train) {
  var wb = step.weights_before, wa = step.weights_after;
  var d  = step.pattern.d;
  var ds = d === 1 ? '+1' : '−1';
  var x1 = step.pattern.x1, x2 = step.pattern.x2;
  var html = '';

  var phases = [['1','compute y* & error','b1'],['2','weight update','b2'],['3','decision boundary','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active?'border2':'border3') + ');background:' + (active?'var(--bg2)':'transparent') +
      ';color:' + (active?'var(--text)':'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += scoreTrackerHTML(step.train_results, step.train_score, train, step.pi, phase,
    (phase===0?'before':'after') + ' update');

  html += '<div class="card"><div class="ct">Pattern n=' + step.pattern.n + ' — Iteration ' + step.iter + ' (' + (step.pi+1) + '/' + train.length + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x₁=' + x1 + ', x₂=' + x2 + ', d=' + ds + '<br>' +
    'weights in: w₁=' + fmt4(wb.w1) + '  w₂=' + fmt4(wb.w2) + '  θ=' + fmt4(wb.theta) +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 — Linear activation</div>';
    html += '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
      tex('y^* = w_1 x_1 + w_2 x_2 + \\theta') + '</div>';
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = ' + fmt4(wb.w1) + '·' + x1 + ' + ' + fmt4(wb.w2) + '·' + x2 + ' + (' + fmt4(wb.theta) + ')</span>' +
      '<span style="color:var(--text3)">   = ' + step.products.w1_x1 + ' + ' + step.products.w2_x2 + ' + (' + fmt4(wb.theta) + ')</span>' +
      '<span style="font-weight:500">   y* = ' + fmt4(step.y_star) + '</span>' +
      '</div></div>';

    var errSign = step.error >= 0 ? '+' : '';
    html += '<div class="card"><div class="ct">Step 2 — LMS error</div>';
    html += '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
      tex('e = d - y^*') + '</div>';
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">e = ' + ds + ' − (' + fmt4(step.y_star) + ')</span>' +
      '<span style="font-weight:500;color:var(--warn)">e = ' + errSign + fmt4(step.error) + '</span>' +
      '<span style="color:var(--text3)">MSE = ½·e² = ½·(' + fmt4(step.error) + ')² = ' + fmt4(step.mse) + '</span>' +
      '</div></div>';

  } else if (phase === 1) {
    var e = step.error, dw = step.delta_w;
    var alpha_str = fmt4(Math.abs(e) > 1e-9 ? Math.abs(dw.dtheta / e) : 0);

    html += '<div class="card"><div class="ct">Step 3 — Weight update  (α=' + alpha_str + ', e=' + fmt4(e) + ')</div>';
    html += '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
      tex('w_i \\leftarrow w_i + \\alpha \\cdot e \\cdot x_i \\qquad \\theta \\leftarrow \\theta + \\alpha \\cdot e') + '</div>';
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">w₁ = ' + fmt4(wb.w1) + ' + ' + alpha_str + '·(' + fmt4(e) + ')·' + x1 + '</span>' +
      '<span><span class="hl">w₁ = ' + fmt4(wa.w1) + '</span></span>' +
      '</div>' +
      '<div class="deriv" style="margin-top:4px">' +
      '<span style="color:var(--text3)">w₂ = ' + fmt4(wb.w2) + ' + ' + alpha_str + '·(' + fmt4(e) + ')·' + x2 + '</span>' +
      '<span><span class="hl">w₂ = ' + fmt4(wa.w2) + '</span></span>' +
      '</div>' +
      '<div class="deriv" style="margin-top:4px">' +
      '<span style="color:var(--text3)">θ  = ' + fmt4(wb.theta) + ' + ' + alpha_str + '·(' + fmt4(e) + ')·1</span>' +
      '<span><span class="hl">θ  = ' + fmt4(wa.theta) + '</span></span>' +
      '</div></div>';

  } else if (phase === 2) {
    var dl = step.decision_line;
    html += '<div class="card" style="border-color:#c4b5fd"><div class="ct" style="color:#6d28d9">Step 4 — Decision boundary</div>';
    html += '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' +
      tex('y^* = w_1 x_1 + w_2 x_2 + \\theta = 0') + '</div>';
    html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:6px">' +
      'w₁=' + fmt4(wa.w1) + '  w₂=' + fmt4(wa.w2) + '  θ=' + fmt4(wa.theta) + '</div>';
    if (dl && dl.defined && !dl.vertical) {
      var sign = parseFloat(fmt4(dl.intercept)) >= 0 ? '+' : '';
      html += '<div style="padding:4px 10px;border-radius:5px;background:var(--purple-bg);color:var(--purple);border:0.5px solid #c4b5fd;display:inline-block;font-family:monospace;font-size:12px;font-weight:500">' +
        'x₂ = ' + fmt4(dl.slope) + '·x₁ ' + sign + fmt4(dl.intercept) + '</div>';
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text3)">🟢 y*≥0 (above) → +1 &nbsp;&nbsp; 🔴 y*&lt;0 (below) → −1</div>';
    }
    html += '</div>';
  }
  return html;
}

function buildAdalineTestPanel(exData) {
  var fw = exData.final_weights;
  var lastStep = exData.steps[exData.steps.length - 1];
  var html = '<div class="card"><div class="ct">🎯 Test phase — final weights after ' + exData.config.n_iters + ' iterations</div>';
  html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:10px">' +
    'w₁=' + fmt4(fw.w1) + '  w₂=' + fmt4(fw.w2) + '  θ=' + fmt4(fw.theta) + '</div>';

  var trainSc = lastStep.train_score;
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ ' + trainSc.correct + '/' + exData.config.n_train + '</span>' +
    '<span style="color:var(--warn)">✗ ' + trainSc.errors + '/' + exData.config.n_train + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' + (trainSc.correct===exData.config.n_train?'var(--success)':'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div></div>';
  html += testResultsHTML(exData.test_annotated, exData.test_score);
  html += '</div>';
  return html;
}
