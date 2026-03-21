function PerceptronCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
}
PerceptronCanvas.prototype = Object.create(BaseCanvas.prototype);

PerceptronCanvas.prototype.draw = function(step, phase, train, finalW) {
  var cfg  = this.cfg;
  var ymin = cfg.y_def_min, ymax = cfg.y_def_max;
  this._ymin = ymin; this._ymax = ymax;

  var w1, w2, th;
  if (finalW) {
    w1 = finalW.w1; w2 = finalW.w2; th = finalW.theta;
  } else {
    var wb = step.weights_before, wa = step.weights_after;
    w1 = phase < 2 ? wb.w1 : wa.w1;
    w2 = phase < 2 ? wb.w2 : wa.w2;
    th = phase < 2 ? wb.theta : wa.theta;
  }

  this.ctx.clearRect(0, 0, this.CW, this.CH);
  this.drawGrid();

  var showUpper = (phase >= 2 || finalW);
  var showLower = (phase >= 3 || finalW);
  this._drawBands(w1, w2, th, showUpper, showLower);

  var results = finalW ? null : step.train_results;
  this.drawPoints(train, finalW ? null : step.pi, !!finalW, results);
};

PerceptronCanvas.prototype._drawBands = function(w1, w2, th, showUpper, showLower) {
  var dk   = isDark();
  var ctx  = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg  = this.cfg;
  var tx   = this.tx.bind(this), ty = this.ty.bind(this);
  var delta = 0.2; // stored in step but we keep renderer stateless — use default

  var hasLine = (w1 !== 0 || w2 !== 0 || th !== 0);
  if (!hasLine) return;

  // Shading
  if (showUpper && showLower && w2 !== 0) {
    var amF = dk ? 'rgba(186,117,23,0.09)' : 'rgba(250,199,117,0.13)';
    var blF = dk ? 'rgba(24,95,165,0.09)'  : 'rgba(181,212,244,0.13)';
    var gyF = dk ? 'rgba(140,135,128,0.06)': 'rgba(180,178,169,0.09)';
    var N = CW - 2 * PAD;
    for (var px = 0; px < N; px++) {
      var x1v = cfg.x1min + (px / N) * (cfg.x1max - cfg.x1min);
      var x2u = (delta  - w1 * x1v - th) / w2;
      var x2l = (-delta - w1 * x1v - th) / w2;
      var hi  = Math.max(x2u, x2l), lo = Math.min(x2u, x2l);
      var canX = PAD + px;
      ctx.fillStyle = amF; ctx.fillRect(canX, PAD, 1, Math.max(0, ty(hi) - PAD));
      ctx.fillStyle = gyF; ctx.fillRect(canX, ty(hi), 1, Math.max(0, ty(lo) - ty(hi)));
      ctx.fillStyle = blF; ctx.fillRect(canX, ty(lo), 1, Math.max(0, (CH - PAD) - ty(lo)));
    }
  }

  var upC = dk ? '#EF9F27' : '#BA7517';
  var loC = dk ? '#3B8BD4' : '#185FA5';

  var self = this;
  function drawLine(c, color, active) {
    if (!active) return;
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
    ctx.beginPath(); var started = false;
    if (w2 !== 0) {
      for (var x1v = cfg.x1min; x1v <= cfg.x1max; x1v += (cfg.x1max - cfg.x1min) / 500) {
        var x2v = (c - w1 * x1v - th) / w2;
        if (x2v < self._ymin - 0.05 || x2v > self._ymax + 0.05) { started = false; continue; }
        if (!started) { ctx.moveTo(tx(x1v), ty(x2v)); started = true; }
        else ctx.lineTo(tx(x1v), ty(x2v));
      }
    } else if (w1 !== 0) {
      var x1l = (c - th) / w1;
      if (x1l >= cfg.x1min && x1l <= cfg.x1max) {
        ctx.moveTo(tx(x1l), PAD); ctx.lineTo(tx(x1l), CH - PAD);
      }
    }
    ctx.stroke(); ctx.setLineDash([]);
    // Markers at ref_x
    if (w2 !== 0) {
      cfg.ref_x.forEach(function(rx) {
        var x2v = (c - w1 * rx - th) / w2;
        if (x2v < self._ymin || x2v > self._ymax) return;
        ctx.beginPath(); ctx.arc(tx(rx), ty(x2v), 5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = isDark() ? '#1a1a18' : '#fafaf8'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = color; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
        ctx.fillText('(' + rx + ',' + fmt4(x2v) + ')', tx(rx) + 7, ty(x2v) - 5);
      });
    }
  }
  drawLine( delta, upC, showUpper);
  drawLine(-delta, loC, showLower);
};

function buildPerceptronPanel(step, phase, train, delta) {
  var wb = step.weights_before, wa = step.weights_after;
  var ds = step.pattern.d === 1 ? '+1' : '−1';
  var html = '';

  var phases = [['1','calculation','b1'],['2','weight update','b2'],['3','line y*=+δ','b3'],['4','line y*=−δ','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  var wsLabel = (phase === 0 ? 'before' : 'after') + ' update (w₁=' + fmt4(phase===0?wb.w1:wa.w1) + ', w₂=' + fmt4(phase===0?wb.w2:wa.w2) + ', θ=' + fmt4(phase===0?wb.theta:wa.theta) + ')';
  html += scoreTrackerHTML(step.train_results, step.train_score, train, step.pi, phase, wsLabel);

  html += '<div class="card"><div class="ct">Pattern n=' + step.pattern.n + ' — Iteration ' + step.iter + ' (' + (step.pi + 1) + '/' + train.length + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x₁=' + step.pattern.x1 + ', x₂=' + step.pattern.x2 + ', d=' + ds + '<br>' +
    'weights in: w₁=' + fmt4(wb.w1) + '  w₂=' + fmt4(wb.w2) + '  θ=' + fmt4(wb.theta) +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 — Compute y*</div><div class="deriv">' +
      '<span style="color:var(--text3)">y* = w₁·x₁ + w₂·x₂ + θ</span>' +
      '<span style="color:var(--text3)">   = ' + fmt4(wb.w1) + '·' + step.pattern.x1 + ' + ' + fmt4(wb.w2) + '·' + step.pattern.x2 + ' + (' + fmt4(wb.theta) + ')</span>' +
      '<span style="color:var(--text3)">   = ' + step.products.w1_x1 + ' + ' + step.products.w2_x2 + ' + (' + fmt4(wb.theta) + ')</span>' +
      '<span style="font-weight:500">   = ' + step.y_star + '</span></div></div>';

    var zone = step.y ===  1 ? step.y_star + ' > +' + delta + '  →  <strong>y = +1</strong>' :
               step.y === -1 ? step.y_star + ' < −' + delta + '  →  <strong>y = −1</strong>' :
               '−' + delta + ' ≤ ' + step.y_star + ' ≤ +' + delta + '  →  <strong>y = 0</strong>';
    html += '<div class="card"><div class="ct">Step 2 — Classify</div>' +
      '<div style="font-family:monospace;font-size:12px">' + zone + '</div>' +
      '<div style="margin-top:6px">';
    if (step.ok) html += '<span class="tag tok">✓ y = d = ' + ds + ' — correct, no update</span>';
    else         html += '<span class="tag tup">✗ y = ' + step.y + ' ≠ d = ' + ds + ' — update needed</span>';
    html += '</div></div>';

  } else if (phase === 1) {
    if (step.ok) {
      html += '<div class="card"><div class="ct">Step 3 — Weight update</div>' +
        '<div style="color:var(--text3);font-family:monospace;font-size:12px">y = d → no error → weights unchanged.</div>' +
        '<div class="deriv"><span>w₁=' + fmt4(wa.w1) + '  w₂=' + fmt4(wa.w2) + '  θ=' + fmt4(wa.theta) + '</span></div></div>';
    } else {
      html += '<div class="card"><div class="ct">Step 3 — Update: w = w + α·d·x</div>' +
        '<div class="deriv"><span style="color:var(--text3)">w₁ = ' + fmt4(wb.w1) + ' + 1·(' + ds + ')·' + step.pattern.x1 + '</span>' +
        '<span><span class="hl">w₁ = ' + fmt4(wa.w1) + '</span></span></div>' +
        '<div class="deriv" style="margin-top:6px"><span style="color:var(--text3)">w₂ = ' + fmt4(wb.w2) + ' + 1·(' + ds + ')·' + step.pattern.x2 + '</span>' +
        '<span><span class="hl">w₂ = ' + fmt4(wa.w2) + '</span></span></div>' +
        '<div class="deriv" style="margin-top:6px"><span style="color:var(--text3)">θ  = ' + fmt4(wb.theta) + ' + 1·(' + ds + ')·1</span>' +
        '<span><span class="hl">θ  = ' + fmt4(wa.theta) + '</span></span></div></div>';
    }
  } else if (phase === 2) {
    var upC = '#BA7517';
    html += '<div class="card" style="border-color:#f5d87a"><div class="ct" style="color:#92400e">Step 4 — Upper boundary y* = +δ = +' + delta + '</div>' +
      '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:4px">w₁=' + fmt4(wa.w1) + ', w₂=' + fmt4(wa.w2) + ', θ=' + fmt4(wa.theta) + '</div>';
    if (wa.w2 !== 0) {
      var sl = fmt4(-wa.w1 / wa.w2), iU = fmt4((delta - wa.theta) / wa.w2);
      html += '<div style="margin-top:6px"><span class="res-up">x₂ = ' + sl + '·x₁ ' + (parseFloat(iU)>=0?'+':'') + iU + '</span></div>';
    }
    html += '</div>';
  } else if (phase === 3) {
    html += '<div class="card" style="border-color:#aac4ee"><div class="ct" style="color:#1e3a6e">Step 5 — Lower boundary y* = −δ = −' + delta + '</div>' +
      '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:4px">w₁=' + fmt4(wa.w1) + ', w₂=' + fmt4(wa.w2) + ', θ=' + fmt4(wa.theta) + '</div>';
    if (wa.w2 !== 0) {
      var sl = fmt4(-wa.w1 / wa.w2);
      var iU = fmt4((delta - wa.theta) / wa.w2);
      var iL = fmt4((-delta - wa.theta) / wa.w2);
      html += '<div style="margin-top:6px"><span class="res-lo">x₂ = ' + sl + '·x₁ ' + (parseFloat(iL)>=0?'+':'') + iL + '</span></div>';
      html += '<div class="card" style="margin-top:8px;margin-bottom:0;background:var(--bg2)"><div class="ct">Both lines — same slope</div>' +
        '<div style="font-family:monospace;font-size:12px;line-height:2">' +
        '<span style="color:#BA7517">+δ:  x₂ = ' + sl + '·x₁ ' + (parseFloat(iU)>=0?'+':'') + iU + '</span><br>' +
        '<span style="color:#185FA5">−δ:  x₂ = ' + sl + '·x₁ ' + (parseFloat(iL)>=0?'+':'') + iL + '</span></div></div>';
    }
    html += '</div>';
  }
  return html;
}

function buildPerceptronTestPanel(exData) {
  var fw = exData.final_weights;
  var lastStep = exData.steps[exData.steps.length - 1];
  var cfg = exData.config;

  var html = '<div class="card"><div class="ct">🎯 Test phase — final weights after ' + cfg.n_iters + ' iterations</div>';
  html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:10px">' +
    'w₁=' + fmt4(fw.w1) + '  w₂=' + fmt4(fw.w2) + '  θ=' + fmt4(fw.theta) + '</div>';

  var trainSc = lastStep.train_score;
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (' + cfg.n_train + ' vectors)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ ' + trainSc.correct + '/' + cfg.n_train + '</span>' +
    '<span style="color:var(--warn)">✗ ' + trainSc.errors + '/' + cfg.n_train + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' + (trainSc.correct===cfg.n_train?'var(--success)':'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div></div>';

  if (exData.test_annotated && exData.test_annotated.length > 0)
    html += testResultsHTML(exData.test_annotated, exData.test_score);
  else
    html += '<div style="color:var(--text3);font-size:12px">No separate test set for this exercise.</div>';
  html += '</div>';
  return html;
}
