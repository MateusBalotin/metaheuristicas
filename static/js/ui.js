function lineDerivHTML(c, cStr, w1, w2, th, color, refX) {
  var rx0 = refX[0], rx1 = refX[refX.length - 1];
  if (w2 === 0 && w1 === 0)
    return '<span style="color:var(--text3)">Weights zero — no line.</span>';
  if (w2 === 0)
    return '<span style="color:var(--text3)">' + fmtN(w1) + '·x₁+(' + fmtN(th) + ')=' + cStr + '</span>' +
      '<span style="font-weight:500;color:' + color + '">→ x₁=' + fmtD((c - th) / w1) + ' (vertical)</span>';
  var slope = r4(-w1 / w2), intercept = r4((c - th) / w2);
  var at1 = r4((c - w1 * rx1 - th) / w2);
  return '<span style="color:var(--text3)">y* = w₁·x₁ + w₂·x₂ + θ = ' + cStr + '</span>' +
    '<span style="color:var(--text3)">' + fmtN(w1) + '·x₁ + ' + fmtN(w2) + '·x₂ + (' + fmtN(th) + ') = ' + cStr + '</span>' +
    '<span style="color:var(--text3)">' + fmtN(w2) + '·x₂ = ' + cStr + ' − ' + fmtN(w1) + '·x₁ − (' + fmtN(th) + ')</span>' +
    '<span style="color:var(--text3)">x₂ = (' + cStr + ' − ' + fmtN(w1) + '·x₁ − (' + fmtN(th) + ')) / ' + fmtN(w2) + '</span>' +
    '<span style="font-weight:500;color:' + color + '">→ x₂ = ' + fmtD(slope) + '·x₁ ' + sgn(intercept) + fmtD(intercept) + '</span>' +
    '<span style="color:var(--text3)">at x₁=' + rx0 + ' : x₂ = ' + fmtD(intercept) + '</span>' +
    '<span style="color:var(--text3)">at x₁=' + rx1 + ' : x₂ = ' + fmtD(at1) + '</span>';
}

function scoreTrackerHTML(step, phase, nCols) {
  var w1 = phase === 0 ? step.wb.w1 : step.wa.w1;
  var w2 = phase === 0 ? step.wb.w2 : step.wa.w2;
  var th = phase === 0 ? step.wb.th : step.wa.th;
  var noW = (w1 === 0 && w2 === 0 && th === 0);
  var results = step.trainResults;
  var sc = step.trainScore;
  var pct = sc.pct;
  var wlbl = (phase === 0 ? 'before' : 'after') +
    ' update (w₁=' + fmtN(w1) + ', w₂=' + fmtN(w2) + ', θ=' + fmtN(th) + ')';
  var n = results.length;
  var cols = nCols || Math.min(n, 11);

  var html = '<div class="card" style="margin-bottom:8px">';
  html += '<div class="ct">All ' + n + ' training patterns with current weights</div>';
  html += '<div style="font-size:10px;color:var(--text3);font-family:monospace;margin-bottom:8px">' + wlbl + '</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:2px;margin-bottom:6px">';
  for (var i = 0; i < n; i++) {
    var r = results[i], isCur = (i === step.pi);
    var cc = 'sc-cell ' + (r.ok ? 'sc-ok' : 'sc-err') + (isCur ? ' sc-cur' : '');
    var label = step.trainPts ? step.trainPts[i].n : (i + 1);
    html += '<div class="' + cc + '" title="n=' + label + '">' +
      '<div style="font-size:8px">n' + label + '</div>' +
      '<div style="font-size:11px;line-height:1.2">' + (r.ok ? '✓' : '✗') + '</div>' +
      '</div>';
  }
  html += '</div>';

  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;flex-wrap:wrap">';
  html += '<span style="color:var(--success);font-weight:500">✓ ' + sc.correct + '/' + n + '</span>';
  html += '<span style="color:var(--warn);font-weight:500">✗ ' + sc.errors + '/' + n + '</span>';
  html += '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + pct + '%;height:100%;background:' + (sc.correct === n ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>';
  html += '<span style="color:var(--text3)">' + pct + '%</span>';
  html += '</div>';

  if (!noW) {
    if (sc.correct === n) {
      html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All ' + n + ' correct!</div>';
    } else {
      html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">' + sc.errors + ' pattern' + (sc.errors === 1 ? '' : 's') + ' still misclassified.</div>';
    }
  }
  html += '</div>';
  return html;
}

function buildPanel(step, phase, cfg) {
  var ds = step.p.d === 1 ? '+1' : '−1';
  var delta = cfg.delta;
  var refX = cfg.canvas.refX;
  var nCols = cfg.train.length <= 4 ? 4 : 11;
  var html = '';

  // Phase breadcrumb
  var phaseDefs = [['1','calculation','b1'],['2','weight update','b2'],['3','line y*=+δ','b3'],['4','line y*=−δ','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phaseDefs.forEach(function(pd, i) {
    var active = (i === phase);
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active ? 'border2' : 'border3') + ');' +
      'background:' + (active ? 'var(--bg2)' : 'transparent') + ';' +
      'color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += scoreTrackerHTML(step, phase, nCols);

  html += '<div class="card"><div class="ct">Pattern n=' + step.p.n + ' — Iteration ' + step.iter + ' (' + (step.pi + 1) + '/' + cfg.train.length + ')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x₁=' + step.p.x1 + ', x₂=' + step.p.x2 + ', d=' + ds + '<br>' +
    'weights in: w₁=' + fmtN(step.wb.w1) + ' w₂=' + fmtN(step.wb.w2) + ' θ=' + fmtN(step.wb.th) + '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 — Compute y*</div><div class="deriv">' +
      '<span style="color:var(--text3)">y* = w₁·x₁ + w₂·x₂ + θ</span>' +
      '<span style="color:var(--text3)">   = ' + fmtN(step.wb.w1) + '·' + step.p.x1 + ' + ' + fmtN(step.wb.w2) + '·' + step.p.x2 + ' + (' + fmtN(step.wb.th) + ')</span>' +
      '<span style="color:var(--text3)">   = ' + step.products.w1x1 + ' + ' + step.products.w2x2 + ' + (' + fmtN(step.wb.th) + ')</span>' +
      '<span style="font-weight:500">   = ' + step.ys + '</span>' +
      '</div></div>';
    var zone = '';
    if (step.y === 1)  zone = step.ys + ' > +' + delta + '  →  <strong>y = +1</strong>';
    else if (step.y === -1) zone = step.ys + ' < −' + delta + '  →  <strong>y = −1</strong>';
    else zone = '−' + delta + ' ≤ ' + step.ys + ' ≤ +' + delta + '  →  <strong>y = 0</strong>';
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
        '<div class="deriv"><span>w₁=' + fmtN(step.wa.w1) + '  w₂=' + fmtN(step.wa.w2) + '  θ=' + fmtN(step.wa.th) + '</span></div></div>';
    } else {
      html += '<div class="card"><div class="ct">Step 3 — Update: w = w + α·d·x</div>' +
        '<div class="deriv"><span style="color:var(--text3)">w₁ = ' + fmtN(step.wb.w1) + ' + 1·(' + ds + ')·' + step.p.x1 + '</span><span><span class="hl">w₁ = ' + fmtN(step.wa.w1) + '</span></span></div>' +
        '<div class="deriv" style="margin-top:6px"><span style="color:var(--text3)">w₂ = ' + fmtN(step.wb.w2) + ' + 1·(' + ds + ')·' + step.p.x2 + '</span><span><span class="hl">w₂ = ' + fmtN(step.wa.w2) + '</span></span></div>' +
        '<div class="deriv" style="margin-top:6px"><span style="color:var(--text3)">θ  = ' + fmtN(step.wb.th) + ' + 1·(' + ds + ')·1</span><span><span class="hl">θ  = ' + fmtN(step.wa.th) + '</span></span></div></div>';
    }

  } else if (phase === 2) {
    html += '<div class="card" style="border-color:#f5d87a">' +
      '<div class="ct" style="color:#92400e">Step 4 — Upper boundary  y* = +δ = +' + delta + '</div>' +
      '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:4px">w₁=' + fmtN(step.wa.w1) + ', w₂=' + fmtN(step.wa.w2) + ', θ=' + fmtN(step.wa.th) + '</div>' +
      '<div class="deriv">' + lineDerivHTML(delta, '+' + delta, step.wa.w1, step.wa.w2, step.wa.th, '#92400e', refX) + '</div>';
    if (step.wa.w2 !== 0) {
      var sl = fmtD(-step.wa.w1 / step.wa.w2), iU = fmtD((delta - step.wa.th) / step.wa.w2);
      html += '<div style="margin-top:6px"><span class="res-up">x₂ = ' + sl + '·x₁ ' + sgn(parseFloat(iU)) + iU + '</span></div>';
    }
    html += '</div>';

  } else if (phase === 3) {
    html += '<div class="card" style="border-color:#aac4ee">' +
      '<div class="ct" style="color:#1e3a6e">Step 5 — Lower boundary  y* = −δ = −' + delta + '</div>' +
      '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:4px">w₁=' + fmtN(step.wa.w1) + ', w₂=' + fmtN(step.wa.w2) + ', θ=' + fmtN(step.wa.th) + '</div>' +
      '<div class="deriv">' + lineDerivHTML(-delta, '−' + delta, step.wa.w1, step.wa.w2, step.wa.th, '#1e3a6e', refX) + '</div>';
    if (step.wa.w2 !== 0) {
      var sl = fmtD(-step.wa.w1 / step.wa.w2);
      var iU = fmtD((delta - step.wa.th) / step.wa.w2);
      var iL = fmtD((-delta - step.wa.th) / step.wa.w2);
      html += '<div style="margin-top:6px"><span class="res-lo">x₂ = ' + sl + '·x₁ ' + sgn(parseFloat(iL)) + iL + '</span></div>';
      html += '<div class="card" style="margin-top:8px;margin-bottom:0;background:var(--bg2)"><div class="ct">Both lines — same slope, parallel</div>' +
        '<div style="font-family:monospace;font-size:12px;line-height:2">' +
        '<span style="color:#BA7517">+δ:  x₂ = ' + sl + '·x₁ ' + sgn(parseFloat(iU)) + iU + '</span><br>' +
        '<span style="color:#185FA5">−δ:  x₂ = ' + sl + '·x₁ ' + sgn(parseFloat(iL)) + iL + '</span><br>' +
        '<span style="color:var(--text3);font-size:11px">Both lines are parallel — same slope</span>' +
        '</div></div>';
    }
    html += '</div>';
  }
  return html;
}

function testPanelHTML(exData) {
  var fw = exData.finalW, cfg = exData.cfg;
  var trainSc = exData.steps[exData.steps.length - 1].trainScore;
  var testAnnotated = exData.testAnnotated, testSc = exData.testScore;

  var html = '<div class="card"><div class="ct">🎯 Test phase — final weights after ' + cfg.nIters + ' iterations</div>';
  html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:10px">' +
    'w₁=' + fmtN(fw.w1) + '  w₂=' + fmtN(fw.w2) + '  θ=' + fmtN(fw.th) + '</div>';

  // Training recap
  var trPct = trainSc.pct;
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (' + cfg.train.length + ' vectors)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ ' + trainSc.correct + '/' + cfg.train.length + '</span>' +
    '<span style="color:var(--warn)">✗ ' + trainSc.errors + '/' + cfg.train.length + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trPct + '%;height:100%;background:' + (trainSc.correct === cfg.train.length ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trPct + '%</span></div></div>';

  if (testAnnotated.length > 0) {
    html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set (' + testAnnotated.length + ' vectors)</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(' + Math.min(testAnnotated.length, 4) + ',1fr);gap:5px;margin-bottom:8px">';
    testAnnotated.forEach(function(p) {
      var ds = (p.d === 1) ? '+1' : '−1', ys2 = (p.y === 1) ? '+1' : (p.y === -1 ? '−1' : '0');
      html += '<div class="test-cell ' + (p.ok ? 'test-ok' : 'test-err') + '">' +
        '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n=' + p.n + '</div>' +
        '<div style="font-size:9px">(' + p.x1 + ', ' + p.x2 + ')</div>' +
        '<div style="font-size:9px">d=' + ds + '</div>' +
        '<div style="font-size:10px">y*=' + fmtD(p.ys) + '</div>' +
        '<div style="font-size:10px">y=' + ys2 + '</div>' +
        '<div style="font-size:14px;line-height:1.4">' + (p.ok ? '✓' : '✗') + '</div>' +
        '</div>';
    });
    html += '</div>';

    var tePct = testSc.pct;
    html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;margin-top:4px">' +
      '<span style="color:var(--success);font-weight:500">✓ ' + testSc.correct + '/' + testAnnotated.length + '</span>' +
      '<span style="color:var(--warn);font-weight:500">✗ ' + testSc.errors + '/' + testAnnotated.length + '</span>' +
      '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
      '<div style="width:' + tePct + '%;height:100%;background:' + (testSc.correct === testAnnotated.length ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
      '<span style="color:var(--text3)">' + tePct + '%</span></div>';
    if (testSc.correct === testAnnotated.length) {
      html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All test vectors correctly classified!</div>';
    } else {
      html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--warn-bg);color:var(--warn);font-size:12px">' + testSc.errors + ' test vector' + (testSc.errors === 1 ? '' : 's') + ' misclassified.</div>';
    }
  } else {
    html += '<div style="color:var(--text3);font-size:12px">No separate test set for this exercise.</div>';
  }
  html += '</div>';
  return html;
}
