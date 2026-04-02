function HebbCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
HebbCanvas.prototype = Object.create(BaseCanvas.prototype);

HebbCanvas.prototype.draw = function(fw, curPi, train, isTest, results, showLine, norm) {
  var dk  = isDark();
  this._ymin = this.cfg.y_def_min;
  this._ymax = this.cfg.y_def_max;

  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var tx = this.tx.bind(this), ty = this.ty.bind(this);

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8'; ctx.fillRect(0, 0, CW, CH);

  // Decision boundary shading: y* = w1*x̂1 + w2*x̂2 + θ = 0
  // In original coords: solve for x2 given x1
  if (showLine && fw && (fw.w1 !== 0 || fw.w2 !== 0)) {
    var w1 = fw.w1, w2 = fw.w2, th = fw.theta;
    var x1min = norm.x1_min, x1max = norm.x1_max;
    var x2min = norm.x2_min, x2max = norm.x2_max;

    // Shade positive/negative regions
    if (w2 !== 0) {
      var posF = dk ? 'rgba(29,158,117,0.10)' : 'rgba(29,200,150,0.12)';
      var negF = dk ? 'rgba(216,90,48,0.10)'  : 'rgba(216,90,48,0.12)';
      var N = CW - 2 * PAD;
      for (var px = 0; px < N; px++) {
        var x1v  = this.cfg.x1min + (px / N) * (this.cfg.x1max - this.cfg.x1min);
        var xh1v = 2 * (x1v - x1min) / (x1max - x1min) - 1;
        // boundary: w2*x̂2 = -w1*x̂1 - θ → x̂2 = (-w1*x̂1 - θ)/w2
        var xh2b = (-w1 * xh1v - th) / w2;
        var x2b  = (xh2b + 1) / 2 * (x2max - x2min) + x2min;
        var canX = PAD + px;
        // above boundary = positive region (depends on sign of w2)
        if (w2 > 0) {
          ctx.fillStyle = posF; ctx.fillRect(canX, PAD, 1, Math.max(0, ty(x2b) - PAD));
          ctx.fillStyle = negF; ctx.fillRect(canX, ty(x2b), 1, Math.max(0, CH - PAD - ty(x2b)));
        } else {
          ctx.fillStyle = negF; ctx.fillRect(canX, PAD, 1, Math.max(0, ty(x2b) - PAD));
          ctx.fillStyle = posF; ctx.fillRect(canX, ty(x2b), 1, Math.max(0, CH - PAD - ty(x2b)));
        }
      }
    }

    // Draw boundary line
    if (w2 !== 0) {
      var lineC = dk ? '#A78BFA' : '#6d28d9';
      ctx.strokeStyle = lineC; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.beginPath(); var started = false;
      for (var x1v2 = this.cfg.x1min; x1v2 <= this.cfg.x1max; x1v2 += 0.02) {
        var xh1v2 = 2 * (x1v2 - x1min) / (x1max - x1min) - 1;
        var xh2b2 = (-w1 * xh1v2 - th) / w2;
        var x2b2  = (xh2b2 + 1) / 2 * (x2max - x2min) + x2min;
        if (x2b2 < this._ymin - 0.1 || x2b2 > this._ymax + 0.1) { started = false; continue; }
        if (!started) { ctx.moveTo(tx(x1v2), ty(x2b2)); started = true; }
        else ctx.lineTo(tx(x1v2), ty(x2b2));
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  this.drawGrid(true);
  this.drawPoints(train, isTest ? null : curPi, isTest, results);
};

if (typeof tex === 'undefined') {
  function tex(src) {
    try { return katex.renderToString(src, {throwOnError: false, displayMode: false}); }
    catch(e) { return src; }
  }
}
if (typeof rule === 'undefined') {
  function rule(src) {
    return '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' + tex(src) + '</div>';
  }
}

function buildHebbPanel(step, phase, train) {
  var p   = step.pattern;
  var wb  = step.weights_before, wa = step.weights_after;
  var html = '';

  var phases = [['1','normalize','b1'],['2','compute y*','b2'],['3','update w','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += scoreTrackerHTML(step.train_results, step.train_score, train, step.pi, phase,
    phase === 0 ? 'Before update' : 'After update');

  html += '<div class="card"><div class="ct">Pattern n=' + p.n + ' \u2014 Step ' + (step.pi + 1) + '/' + train.length + '</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x\u2081=' + p.x1 + '  x\u2082=' + p.x2 + '  d=' + p.d + '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 \u2014 Normalize inputs</div>';
    html += rule('\\hat{x}_j = 2\\left(\\dfrac{x_j - x_{min}}{x_{max} - x_{min}}\\right) - 1');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:12px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400">input</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">x</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">range</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">\u0078\u0302 (normalized)</th>' +
      '</tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">x\u2081</td>' +
      '<td style="text-align:right;padding:3px 6px">' + p.x1 + '</td>' +
      '<td style="text-align:right;padding:3px 6px;color:var(--text3)">[0, 5]</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:500;color:var(--warn)">' + fmt6(step.xh1) + '</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">x\u2082</td>' +
      '<td style="text-align:right;padding:3px 6px">' + p.x2 + '</td>' +
      '<td style="text-align:right;padding:3px 6px;color:var(--text3)">[0, 3]</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:500;color:var(--warn)">' + fmt6(step.xh2) + '</td></tr>';
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Step 2 \u2014 Compute y*</div>';
    html += rule('y^* = w_1\\hat{x}_1 + w_2\\hat{x}_2 + \\theta');
    html += '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = ' + fmt4(wb.w1) + '\u00b7(' + fmt6(step.xh1) + ') + ' +
      fmt4(wb.w2) + '\u00b7(' + fmt6(step.xh2) + ') + (' + fmt4(wb.theta) + ')</span>' +
      '<span style="font-weight:500">y* = <span style="color:var(--warn)">' + fmt6(step.y_star) + '</span>' +
      '  \u2192  ' + (step.cls === 1 ? '+1' : '\u22121') +
      ' &nbsp; (d=' + p.d + (step.cls === p.d ? ' \u2713' : ' \u2717') + ')</span>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:6px">' +
      '\u26a0\ufe0f Hebb always updates \u2014 even when y = d (no error check)</div></div>';

  } else if (phase === 2) {
    html += '<div class="card"><div class="ct">Step 3 \u2014 Update weights</div>';
    html += rule('w_i^{new} = w_i^{old} + \\alpha\\,\\hat{x}_i\\,d \\qquad \\theta^{new} = \\theta^{old} + \\alpha\\,d');
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:12px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:3px 6px;font-weight:400"></th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">old</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">\u03b1\u00b7\u0078\u0302\u00b7d</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">new</th>' +
      '</tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">w\u2081</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmt4(wb.w1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmtS6(step.dw1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + fmt4(wa.w1) + '</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">w\u2082</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmt4(wb.w2) + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmtS6(step.dw2) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + fmt4(wa.w2) + '</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">\u03b8</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmt4(wb.theta) + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + fmtS6(step.dtheta) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + fmt4(wa.theta) + '</td></tr>';
    html += '</tbody></table></div>';
  }

  return html;
}

function buildHebbSummaryPanel(exData) {
  var fw  = exData.final_weights;
  var cfg = exData.config;
  var lastStep = exData.steps[exData.steps.length - 1];
  var trainSc  = lastStep.train_score;

  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 Hebb · \u03b1=' + cfg.alpha + ' · ' + cfg.n_iters + ' pass(es) through data</div>';

  html += '<div style="font-family:monospace;font-size:12px;margin-bottom:10px;line-height:2">' +
    'w\u2081 = <strong>' + fmt4(fw.w1) + '</strong> &nbsp; ' +
    'w\u2082 = <strong>' + fmt4(fw.w2) + '</strong> &nbsp; ' +
    '\u03b8 = <strong>' + fmt4(fw.theta) + '</strong></div>';

  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:12px;padding:6px 10px;background:var(--bg2);border-radius:6px">' +
    'Decision boundary: ' + fmt4(fw.w1) + '\u00b7\u0078\u0302\u2081 + ' + fmt4(fw.w2) + '\u00b7\u0078\u0302\u2082 + (' + fmt4(fw.theta) + ') = 0</div>';

  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (' + cfg.n_train + ' patterns)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">\u2713 ' + trainSc.correct + '/' + cfg.n_train + '</span>' +
    '<span style="color:var(--warn)">\u2717 ' + trainSc.errors + '/' + cfg.n_train + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' + (trainSc.correct === cfg.n_train ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div></div>';

  html += testResultsHTML(exData.test_annotated, exData.test_score);
  html += '</div>';
  return html;
}
