// ── SOM Canvas ────────────────────────────────────────────────────────────────
function SomCanvas(canvasEl, rows, cols) {
  this.cv   = canvasEl;
  this.ctx  = canvasEl.getContext('2d');
  this.CW   = canvasEl.width;
  this.CH   = canvasEl.height;
  this.rows = rows;
  this.cols = cols;
}

SomCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

SomCanvas.prototype.draw = function(weights, positions, step, isTest, testResults) {
  var dk  = this.isDk();
  var ctx = this.ctx, CW = this.CW, CH = this.CH;
  var rows = this.rows, cols = this.cols;

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD    = 24;
  var cellW  = (CW - 2 * PAD) / cols;
  var cellH  = (CH - 2 * PAD - 60) / rows;  // leave 60px bottom for legend
  var n_dim  = weights[0].length;

  // Max weight value for scaling bars
  var maxW = 0;
  weights.forEach(function(w) { w.forEach(function(v) { if (v > maxW) maxW = v; }); });
  if (maxW < 1) maxW = 1;

  // Build neuron → assigned labels map
  var neuronLabels = {};
  var sourceResults = isTest ? testResults : null;

  // Draw each neuron cell
  for (var ni = 0; ni < rows * cols; ni++) {
    var r = positions[ni][0], c = positions[ni][1];
    var cx = PAD + c * cellW + cellW / 2;
    var cy = PAD + r * cellH + cellH / 2;
    var isWinner = step && step.winner === ni;
    var isNeighbor = step && step.neighbors && step.neighbors.indexOf(ni) !== -1 && !isWinner;

    // Cell background
    var bg = dk ? '#2a2a28' : '#f0eeea';
    if (isWinner) bg = dk ? 'rgba(239,159,39,0.25)' : 'rgba(250,199,117,0.45)';
    else if (isNeighbor) bg = dk ? 'rgba(29,158,117,0.18)' : 'rgba(29,200,150,0.18)';

    var bx = PAD + c * cellW + 4, by = PAD + r * cellH + 4;
    var bw = cellW - 8, bh = cellH - 8;
    ctx.fillStyle = bg;
    ctx.beginPath();
    var r8 = 8;
    ctx.moveTo(bx + r8, by);
    ctx.lineTo(bx + bw - r8, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r8, r8);
    ctx.lineTo(bx + bw, by + bh - r8);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r8, by + bh, r8);
    ctx.lineTo(bx + r8, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r8, r8);
    ctx.lineTo(bx, by + r8);
    ctx.arcTo(bx, by, bx + r8, by, r8);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = isWinner ? '#EF9F27' : (isNeighbor ? (dk ? '#5DCAA5' : '#0F6E56') : (dk ? '#3a3a38' : '#d8d6d2'));
    ctx.lineWidth = isWinner ? 2.5 : (isNeighbor ? 2 : 1);
    ctx.stroke();

    // Neuron label
    ctx.fillStyle = dk ? '#c2c0b6' : '#444441';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('n' + (ni + 1), cx, by + 14);

    // Mini bar chart for weight vector
    var barW = (bw - 16) / n_dim;
    var barMaxH = bh - 32;
    for (var d = 0; d < n_dim; d++) {
      var bH = Math.max(1, (weights[ni][d] / maxW) * barMaxH);
      var bX = bx + 8 + d * barW;
      var bY = by + bh - 8 - bH;
      var hue = isWinner ? '#EF9F27' : (dk ? '#6d8fa8' : '#4a7090');
      ctx.fillStyle = hue;
      ctx.fillRect(bX, bY, barW - 2, bH);
    }

    // Pattern label if assigned
    if (step) {
      var lbl = '';
      if (isWinner && step.pattern) lbl = step.pattern.label;
      if (lbl) {
        ctx.fillStyle = '#EF9F27';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, cx, by + bh - 4);
      }
    }
  }

  // Grid position labels on axes
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  for (var c2 = 0; c2 < cols; c2++)
    ctx.fillText('col ' + c2, PAD + c2 * cellW + cellW / 2, PAD - 6);
  ctx.textAlign = 'right';
  for (var r2 = 0; r2 < rows; r2++)
    ctx.fillText('row ' + r2, PAD - 4, PAD + r2 * cellH + cellH / 2 + 4);

  // Test results overlay (bottom)
  if (isTest && testResults) {
    ctx.fillStyle = dk ? '#888780' : '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Test: ' + testResults.map(function(r) {
      return r.label + '→n' + (r.winner + 1);
    }).join('  '), PAD, CH - 10);
  }
};

// ── Panel builders ────────────────────────────────────────────────────────────
// Phases: 0=show input, 1=compute distances/winner, 2=update weights

function buildSomPhaseLabel(phase) {
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  var phases = [['1','present pattern','b1'],['2','find winner','b2'],['3','update weights','b4']];
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

function buildSomPanel(step, phase, config) {
  var p    = step.pattern;
  var html = buildSomPhaseLabel(phase);

  // Step info bar
  html += '<div class="card"><div class="ct">Pattern <strong>' + p.label + '</strong>' +
    ' — step ' + (step.pi + 1) + '/' + config.n_train +
    ' — iter ' + step.iter + '/' + config.n_iters +
    ' — α=' + step.alpha + ' — radius=' + step.radius + '</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2;color:var(--text2)">' +
    'x = [' + p.x.join(', ') + ']</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 \u2014 Present pattern to all neurons</div>';
    html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:8px">' +
      'Each neuron computes: d_i = \u03a3(x_j \u2212 w_ij)\u00b2</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3)">' +
      'Weight vectors before this pattern:</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;margin-top:6px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">neuron</th>' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">pos</th>' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">weights</th></tr></thead><tbody>';
    for (var i = 0; i < step.weights_before.length; i++) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 4px;color:var(--text3)">n' + (i+1) + '</td>' +
        '<td style="padding:2px 4px;color:var(--text3)">(' + config.positions[i].join(',') + ')</td>' +
        '<td style="padding:2px 4px">[' + step.weights_before[i].map(function(v){return Math.round(v*1e4)/1e4;}).join(', ') + ']</td></tr>';
    }
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Step 2 \u2014 Find winner (minimum distance)</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'd_i = \u03a3(x_j \u2212 w_ij)\u00b2  \u2192  winner = argmin d_i</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400">neuron</th>' +
      '<th style="text-align:right;padding:3px 6px;font-weight:400">d_i</th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400"></th></tr></thead><tbody>';
    for (var i = 0; i < step.dists.length; i++) {
      var isWin = i === step.winner;
      html += '<tr style="border-top:0.5px solid var(--border3)' + (isWin ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">n' + (i+1) + ' (' + config.positions[i].join(',') + ')</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:' + (isWin ? '700' : '400') + ';color:' +
        (isWin ? 'var(--warn)' : 'inherit') + '">' + step.dists[i].toFixed(4) + '</td>' +
        '<td style="text-align:center;padding:3px 6px">' + (isWin ? '\u2190 winner \ud83c\udfc6' : '') + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      'Neighborhood (radius=' + step.radius + '): ' + step.neighbors.map(function(n){return 'n'+(n+1);}).join(', ') + '</div>';
    html += '</div>';

  } else if (phase === 2) {
    html += '<div class="card"><div class="ct">Step 3 \u2014 Update winner + neighbors</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'w_ij(new) = w_ij(old) + \u03b1\u00b7[x_j \u2212 w_ij(old)] &nbsp; for i \u2208 V (radius=' + step.radius + ')</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">neuron</th>' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400">old weights</th>' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--info)">\u03b1\u00b7(x\u2212w)</th>' +
      '<th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--warn)">new weights</th></tr></thead><tbody>';
    step.deltas.forEach(function(d) {
      var isWin = d.neuron === step.winner;
      html += '<tr style="border-top:0.5px solid var(--border3)' + (isWin ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:2px 4px;color:var(--text3)">n' + (d.neuron+1) + (isWin ? ' \u2605' : '') + '</td>' +
        '<td style="padding:2px 4px">[' + d.old.join(', ') + ']</td>' +
        '<td style="padding:2px 4px;color:var(--info)">[' + d.delta.map(function(v){return v>=0?'+'+v:v;}).join(', ') + ']</td>' +
        '<td style="padding:2px 4px;font-weight:600;color:var(--warn)">[' + d.new.join(', ') + ']</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  return html;
}

function buildSomSummaryPanel(exData) {
  var fw  = exData.final_weights;
  var pos = exData.config.positions;
  var cfg = exData.config;
  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final map \u2014 SOM ' + cfg.map_rows + '\u00d7' + cfg.map_cols + ' \u00b7 \u03b1=' + cfg.alpha + ' \u00b7 ' + cfg.n_iters + ' iterations</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:8px">Final weight vectors:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:14px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">neuron</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">position</th>' +
    '<th style="text-align:left;padding:2px 6px;font-weight:400">weights [w₁..w₅]</th></tr></thead><tbody>';
  for (var i = 0; i < fw.length; i++) {
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">n' + (i+1) + '</td>' +
      '<td style="padding:2px 6px;color:var(--text3)">(' + pos[i].join(',') + ')</td>' +
      '<td style="padding:2px 6px">[' + fw[i].map(function(v){return Math.round(v*1e4)/1e4;}).join(', ') + ']</td></tr>';
  }
  html += '</tbody></table>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Training patterns \u2192 winner neurons:</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  exData.train_final.forEach(function(res) {
    html += '<div style="padding:4px 10px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border2);font-family:monospace;font-size:11px">' +
      '<strong>' + res.label + '</strong> \u2192 n' + (res.winner+1) + ' (' + res.pos.join(',') + ')</div>';
  });
  html += '</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test patterns \u2192 winner neurons:</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
  exData.test_results.forEach(function(res) {
    html += '<div style="padding:4px 10px;border-radius:6px;background:var(--info-bg);border:0.5px solid var(--info);font-family:monospace;font-size:11px;color:var(--info)">' +
      '<strong>' + res.label + '</strong> \u2192 n' + (res.winner+1) + ' (' + res.pos.join(',') + ')</div>';
  });
  html += '</div></div>';
  return html;
}
