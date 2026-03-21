// ── MLP UI panel builders ──────────────────────────────────────────────────────

function mfmt(n) {
  if (n === undefined || n === null) return '?';
  var r = Math.round(n * 1e6) / 1e6;
  return r.toFixed(6).replace(/\.?0+$/, '') || '0';
}
function mfmt4(n) {
  var r = Math.round(n * 1e4) / 1e4;
  return r.toFixed(4).replace(/\.?0+$/, '') || '0';
}
function mfmtS(n) { return n >= 0 ? '+' + mfmt(n) : mfmt(n); }

// ── Score tracker (reuses same visual as Adaline/Perceptron) ──────────────────
function mlpScoreTrackerHTML(step, phase) {
  var results = step.trainResults, sc = step.trainScore;
  var n = results.length;
  var ws = phase === 0 ? step.wsBefore : step.wsAfter;
  var wlbl = (phase === 0 ? 'before' : 'after') + ' update (α=' + step.wsAfter /* placeholder */;
  // simpler label
  wlbl = (phase === 0 ? 'Before update' : 'After update');

  var html = '<div class="card" style="margin-bottom:8px">';
  html += '<div class="ct">All ' + n + ' training patterns — ' + wlbl + '</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:2px;margin-bottom:6px">';
  for (var i = 0; i < n; i++) {
    var r = results[i], isCur = (i === step.pi);
    var cc = 'sc-cell ' + (r.ok ? 'sc-ok' : 'sc-err') + (isCur ? ' sc-cur' : '');
    var lbl = step.trainPts ? step.trainPts[i].n : (i + 1);
    html += '<div class="' + cc + '" title="n=' + lbl + '">' +
      '<div style="font-size:8px">n' + lbl + '</div>' +
      '<div style="font-size:11px;line-height:1.2">' + (r.ok ? '✓' : '✗') + '</div>' +
      '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;flex-wrap:wrap">';
  html += '<span style="color:var(--success);font-weight:500">✓ ' + sc.correct + '/' + n + '</span>';
  html += '<span style="color:var(--warn);font-weight:500">✗ ' + sc.errors + '/' + n + '</span>';
  html += '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + sc.pct + '%;height:100%;background:' + (sc.correct === n ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>';
  html += '<span style="color:var(--text3)">' + sc.pct + '%</span>';
  html += '</div>';
  if (sc.correct === n) {
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All ' + n + ' correct!</div>';
  } else {
    html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">' + sc.errors + ' pattern' + (sc.errors === 1 ? '' : 's') + ' still misclassified.</div>';
  }
  html += '</div>';
  return html;
}

// ── Hidden neuron table helper ────────────────────────────────────────────────
function hiddenTableHTML(step, phase) {
  var fwd = step.fwd, nH = fwd.z.length;
  var ws  = phase === 0 ? step.wsBefore : step.wsAfter;

  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j2</sub></th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">θa<sub>j</sub></th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub>=σ(z*)</th>' +
    '</tr></thead><tbody>';
  for (var j = 0; j < nH; j++) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + mfmt4(ws.V[j][0]) + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + mfmt4(ws.V[j][1]) + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + mfmt4(ws.thetaA[j]) + '</td>' +
      '<td style="text-align:right;padding:3px 4px;color:var(--text2)">' + mfmt(fwd.zStar[j]) + '</td>' +
      '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt(fwd.z[j]) + '</td>' +
      '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// ── Main panel builder ────────────────────────────────────────────────────────
// phase 0 = forward pass
// phase 1 = output layer update
// phase 2 = hidden layer update
function buildMLPPanel(step, phase, exData) {
  var cfg  = exData.cfg;
  var ds   = step.p.d === 1 ? '+1' : '−1';
  var nH   = step.fwd.z.length;
  var fwd  = step.fwd;
  var html = '';

  // Phase breadcrumb
  var phases = [
    ['1', 'forward pass', 'b1'],
    ['2', 'output update', 'b2'],
    ['3', 'hidden update', 'b4'],
  ];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active ? 'border2' : 'border3') + ');' +
      'background:' + (active ? 'var(--bg2)' : 'transparent') + ';' +
      'color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  html += '</div>';

  html += mlpScoreTrackerHTML(step, phase);

  // Pattern header
  html += '<div class="card"><div class="ct">Pattern n=' + step.p.n +
    ' — Iteration ' + step.iter + ' (' + (step.pi + 1) + '/22)</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x₁=' + step.p.x1 + '  x₂=' + step.p.x2 + '  d=' + ds +
    '</div></div>';

  if (phase === 0) {
    // ── FORWARD PASS ────────────────────────────────────────────────────
    html += '<div class="card"><div class="ct">Step 1 — Hidden layer  z_j = σ(Σ v_ij·x_i + θa_j)</div>';
    html += hiddenTableHTML(step, 0);
    html += '</div>';

    // Output neuron
    var yStr   = mfmt(fwd.y), ysStr = mfmt(fwd.yStar);
    var wSum   = step.wsBefore.W.map(function(w, j) {
      return mfmt4(w) + '·' + mfmt(fwd.z[j]);
    }).join(' + ');
    html += '<div class="card"><div class="ct">Step 2 — Output  y = σ(Σ w_j·z_j + θb)</div>' +
      '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = ' + wSum + ' + (' + mfmt4(step.wsBefore.thetaB) + ')</span>' +
      '<span style="color:var(--text3)">y* = ' + ysStr + '</span>' +
      '<span style="font-weight:500">y  = σ(' + ysStr + ') = <span style="color:var(--warn)">' + yStr + '</span></span>' +
      '<span style="color:var(--text3)">MSE = ½·(d−y)² = ½·(' + ds + '−' + yStr + ')² = ' + mfmt(step.mse) + '</span>' +
      '</div></div>';

  } else if (phase === 1) {
    // ── OUTPUT LAYER UPDATE ─────────────────────────────────────────────
    var y = fwd.y, yStr = mfmt(y);
    var dStr = ds, errStr = mfmt(mr6(step.p.d - y));
    var dOut = step.deltaOut;

    html += '<div class="card"><div class="ct">Step 3 — δ_out = y·(1−y)·(d−y)</div>' +
      '<div class="deriv">' +
      '<span style="color:var(--text3)">δ_out = ' + yStr + ' · (1−' + yStr + ') · (' + dStr + '−' + yStr + ')</span>' +
      '<span style="color:var(--text3)">δ_out = ' + yStr + ' · ' + mfmt(mr6(1 - y)) + ' · ' + errStr + '</span>' +
      '<span style="font-weight:500;color:var(--warn)">δ_out = ' + mfmt(dOut) + '</span>' +
      '</div></div>';

    // w_j updates table
    html += '<div class="card"><div class="ct">Update output weights  Δw_j = α·δ_out·z_j</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z_j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δw_j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_j before</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w_j after</th>' +
      '</tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmt(fwd.z[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmtS(step.dW[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">' + mfmt4(step.wsBefore.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt4(step.wsAfter.W[j]) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
      'Δθb = α·δ_out = ' + exData.alpha + '·' + mfmt(dOut) + ' = ' + mfmtS(step.dThetaB) +
      '  →  <span style="color:var(--warn);font-weight:500">θb = ' + mfmt4(step.wsAfter.thetaB) + '</span></div>';
    html += '</div>';

  } else if (phase === 2) {
    // ── HIDDEN LAYER UPDATE ─────────────────────────────────────────────
    html += '<div class="card"><div class="ct">Step 4 — δ_j = δ_out · w_j · z_j·(1−z_j)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w_j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z_j·(1−z_j)</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">δ_j</th>' +
      '</tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      var zj  = fwd.z[j];
      var zprime = mr6(zj * (1 - zj));
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmt4(step.wsBefore.W[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmt(zprime) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt(step.deltaH[j]) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table></div>';

    // v_ij and θa_j updates
    html += '<div class="card"><div class="ct">Update hidden weights  Δv_ij = α·δ_j·x_i  &amp;  Δθa_j = α·δ_j</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j2</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δθa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>′</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j2</sub>′</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">θa<sub>j</sub>′</th>' +
      '</tr></thead><tbody>';
    for (var j = 0; j < nH; j++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmtS(step.dV[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmtS(step.dV[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px">' + mfmtS(step.dThetaA[j]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt4(step.wsAfter.V[j][0]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt4(step.wsAfter.V[j][1]) + '</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + mfmt4(step.wsAfter.thetaA[j]) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table></div>';
  }

  return html;
}

// ── Test/summary panel ────────────────────────────────────────────────────────
function mlpTestPanelHTML(exData) {
  var trainSc = exData.steps[exData.steps.length - 1].trainScore;
  var testAnn = exData.testAnnotated, testSc = exData.testScore;
  var fw = exData.finalWs, nH = exData.nHidden;

  var html = '<div class="card"><div class="ct">🎯 Final results after ' + exData.cfg.nIters + ' iterations</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;font-family:monospace">' +
    nH + ' hidden neurons · α=' + exData.alpha + ' · seed=' + exData.seed + '</div>';

  // Final weight display
  html += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Final weights — output layer</div>';
  html += '<div style="font-family:monospace;font-size:11px;line-height:1.8;color:var(--text3)">';
  for (var j = 0; j < nH; j++) {
    html += 'w' + (j + 1) + ' = ' + mfmt4(fw.W[j]) + '&nbsp;&nbsp;';
  }
  html += '<br>θb = ' + mfmt4(fw.thetaB);
  html += '</div></div>';

  // Training recap
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (22 vectors)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ ' + trainSc.correct + '/22</span>' +
    '<span style="color:var(--warn)">✗ ' + trainSc.errors + '/22</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + trainSc.pct + '%;height:100%;background:' + (trainSc.correct === 22 ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + trainSc.pct + '%</span></div></div>';

  // Test set
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set (8 vectors)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px">';
  testAnn.forEach(function(p) {
    var ds2 = p.d === 1 ? '+1' : '−1', yc2 = p.yClass === 1 ? '+1' : '−1';
    html += '<div class="test-cell ' + (p.ok ? 'test-ok' : 'test-err') + '">' +
      '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n=' + p.n + '</div>' +
      '<div style="font-size:9px">(' + p.x1 + ',' + p.x2 + ')</div>' +
      '<div style="font-size:9px">d=' + ds2 + '</div>' +
      '<div style="font-size:10px">y=' + mfmt(p.y) + '</div>' +
      '<div style="font-size:10px">→' + yc2 + '</div>' +
      '<div style="font-size:14px;line-height:1.4">' + (p.ok ? '✓' : '✗') + '</div>' +
      '</div>';
  });
  html += '</div>';

  var tePct = testSc.pct;
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success);font-weight:500">✓ ' + testSc.correct + '/8</span>' +
    '<span style="color:var(--warn);font-weight:500">✗ ' + testSc.errors + '/8</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + tePct + '%;height:100%;background:' + (testSc.correct === 8 ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + tePct + '%</span></div>';

  if (testSc.correct === 8)
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All test vectors correct!</div>';
  else
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--warn-bg);color:var(--warn);font-size:12px">' +
      testSc.errors + ' test vector' + (testSc.errors === 1 ? '' : 's') + ' misclassified after 3 iterations.</div>';

  // Dataset note
  html += '<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border3);font-size:11px;color:var(--text3);line-height:1.7">' +
    '📊 <strong style="color:var(--text2)">Dataset note:</strong> This is the same partially non-linearly separable dataset from Perceptron Ex5. ' +
    'Even with 500+ iterations, max train accuracy is ~19/22 (86%) — some classes overlap geometrically ' +
    '(e.g. n13:(2,1,−1) vs n3:(1,1,+1)). Try increasing neurons or changing the seed for different decision regions.' +
    '</div>';

  html += '</div>';
  return html;
}
