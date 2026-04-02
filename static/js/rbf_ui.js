function RbfCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
RbfCanvas.prototype = Object.create(BaseCanvas.prototype);

RbfCanvas.prototype._fwd = function(x1, centers, weights, sigma) {
  var q = centers.length, y = weights[q];
  for (var j = 0; j < q; j++)
    y += weights[j] * Math.exp(-Math.pow(x1 - centers[j], 2) / (2 * sigma * sigma));
  return y;
};

RbfCanvas.prototype.draw = function(data, activePi, showCurve) {
  var dk  = isDark();
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  this._ymin = this.cfg.y_def_min;
  this._ymax = this.cfg.y_def_max;
  var tx = this.tx.bind(this), ty = this.ty.bind(this);

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8'; ctx.fillRect(0, 0, CW, CH);
  this.drawGrid(true);

  // Learned curve
  if (showCurve && data.weights) {
    ctx.beginPath(); ctx.strokeStyle = dk ? '#93c5fd' : '#185FA5'; ctx.lineWidth = 2;
    var started = false, self = this;
    for (var k = 0; k <= 500; k++) {
      var xv = this.cfg.x1min + (k / 500) * (this.cfg.x1max - this.cfg.x1min);
      var yv = this._fwd(xv, data.centers, data.weights, data.sigma);
      if (yv < this._ymin - 0.5 || yv > this._ymax + 0.5) { started = false; continue; }
      if (!started) { ctx.moveTo(tx(xv), ty(yv)); started = true; } else ctx.lineTo(tx(xv), ty(yv));
    }
    ctx.stroke();
  }

  // Center verticals
  if (data.centers) {
    for (var j = 0; j < data.centers.length; j++) {
      var cx = tx(data.centers[j]);
      ctx.strokeStyle = dk ? 'rgba(147,197,253,0.5)' : 'rgba(24,95,165,0.3)';
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, PAD); ctx.lineTo(cx, CH - PAD); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = dk ? '#93c5fd' : '#185FA5'; ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center'; ctx.fillText('u' + (j + 1), cx, PAD - 4);
    }
  }

  // Data points
  for (var i = 0; i < data.train.length; i++) {
    var p = data.train[i], ppx = tx(p.x1), ppy = ty(p.d), isCur = i === activePi;
    if (isCur) {
      ctx.beginPath(); ctx.arc(ppx, ppy, 12, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(239,159,39,0.28)' : 'rgba(250,199,117,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ppx, ppy, 13, 0, Math.PI * 2);
      ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(ppx, ppy, 5, 0, Math.PI * 2);
    ctx.fillStyle   = dk ? 'rgba(29,158,117,0.9)' : 'rgba(29,158,117,0.88)';
    ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56'; ctx.lineWidth = isCur ? 2.5 : 1.5;
    ctx.fill(); ctx.stroke();

    // Network output dot (orange) when curve is available
    if (showCurve && data.weights) {
      var yhat = this._fwd(p.x1, data.centers, data.weights, data.sigma);
      if (yhat >= this._ymin - 0.5 && yhat <= this._ymax + 0.5) {
        ctx.beginPath(); ctx.arc(tx(p.x1), ty(yhat), 4, 0, Math.PI * 2);
        ctx.fillStyle = dk ? 'rgba(239,159,39,0.8)' : 'rgba(186,117,23,0.85)';
        ctx.strokeStyle = dk ? '#EF9F27' : '#BA7517'; ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(tx(p.x1), ty(yhat));
        ctx.strokeStyle = dk ? 'rgba(239,159,39,0.3)' : 'rgba(186,117,23,0.3)';
        ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
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
    return '<div style="margin:4px 0 10px;padding:6px 10px;background:var(--bg2);border-radius:6px;display:inline-block">' + tex(src) + '</div>';
  }
}

// ── Panel builders ────────────────────────────────────────────────────────────
// Phases:
//   0..n-1  : Build G — one row per training pattern
//   n       : Show G^T G
//   n+1     : Show G^T d
//   n+2     : Solve w = (G^T G)^-1 G^T d
//   n+3     : Summary

function buildRbfPhaseLabel(phase, nTrain) {
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  var phases = [
    ['1', 'build G', 'b1'],
    ['2', 'G\u1D40G', 'b2'],
    ['3', 'G\u1D40d', 'b3'],
    ['4', 'solve w', 'b4'],
  ];
  phases.forEach(function(pd, i) {
    var active = (i === 0 && phase < nTrain) || (i === 1 && phase === nTrain) ||
                 (i === 2 && phase === nTrain + 1) || (i === 3 && phase >= nTrain + 2);
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--' +
      (active ? 'border2' : 'border3') + ');background:' + (active ? 'var(--bg2)' : 'transparent') +
      ';color:' + (active ? 'var(--text)' : 'var(--text3)') + ';">' + pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

function buildRbfGRowPanel(data, rowIdx) {
  var rd = data.row_details[rowIdx], q = data.centers.length;
  var html = buildRbfPhaseLabel(rowIdx, data.train.length);

  html += '<div class="card"><div class="ct">Build G \u2014 row ' + (rowIdx + 1) + ' of ' + data.train.length +
    ' &nbsp; (pattern n=' + rd.n + ', x=' + rd.x1 + ')</div>';
  html += rule('G_{i,j} = \\varphi_j = e^{-\\frac{1}{2\\sigma_j^2}\\|x_i - u_j\\|^2} \\qquad G_{i,q+1} = 1');
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">center u_j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">||x\u2212u||²</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03c6_j</th>' +
    '</tr></thead><tbody>';
  for (var j = 0; j < q; j++) {
    var diff2 = Math.round(Math.pow(rd.x1 - data.centers[j], 2) * 1e6) / 1e6;
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + data.centers[j] + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + diff2 + '</td>' +
      '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + fmt6(rd.phis[j]) + '</td></tr>';
  }
  html += '<tr style="border-top:1px solid var(--border2)">' +
    '<td style="padding:3px 4px;color:var(--text3)">bias</td>' +
    '<td style="text-align:right;padding:3px 4px;color:var(--text3)" colspan="2">\u03b8 = 1</td>' +
    '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">1</td></tr>';
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
    'G[' + (rowIdx + 1) + '] = [' + rd.phis.map(fmt6).join(', ') + ', 1] &nbsp; d[' + (rowIdx + 1) + '] = ' + rd.d + '</div>';
  html += '</div>';

  // G built so far (compact)
  html += '<div class="card"><div class="ct">G matrix so far (' + (rowIdx + 1) + '/' + data.train.length + ' rows)</div>';
  html += '<div style="font-family:monospace;font-size:10px;color:var(--text3);line-height:1.7;overflow-x:auto">';
  for (var i2 = 0; i2 <= rowIdx; i2++) {
    var rd2 = data.row_details[i2];
    var row = rd2.phis.map(fmt4).concat(['1']);
    var highlight = i2 === rowIdx ? 'color:var(--warn);font-weight:500' : '';
    html += '<span style="' + highlight + '">n' + rd2.n + ': [' + row.join(', ') + ']</span><br>';
  }
  html += '</div></div>';
  return html;
}

function buildRbfGTGPanel(data) {
  var q = data.centers.length, p1 = q + 1;
  var html = buildRbfPhaseLabel(data.train.length, data.train.length);
  html += '<div class="card"><div class="ct">Step 2 \u2014 Compute G\u1D40G</div>';
  html += rule('G^TG \\in \\mathbb{R}^{(q+1)\\times(q+1)}');
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400"></th>';
  for (var j = 0; j < p1; j++)
    html += '<th style="padding:2px 5px;font-weight:400;text-align:right">' + (j < q ? '\u03c6' + (j + 1) : 'θ') + '</th>';
  html += '</tr></thead><tbody>';
  for (var i = 0; i < p1; i++) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:var(--text3)">' + (i < q ? '\u03c6' + (i + 1) : 'θ') + '</td>';
    for (var j2 = 0; j2 < p1; j2++)
      html += '<td style="text-align:right;padding:2px 5px' + (i === j2 ? ';color:var(--warn);font-weight:500' : '') + '">' + fmt4(data.GTG[i][j2]) + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function buildRbfGTdPanel(data) {
  var q = data.centers.length;
  var html = buildRbfPhaseLabel(data.train.length + 1, data.train.length);
  html += '<div class="card"><div class="ct">Step 3 \u2014 Compute G\u1D40d</div>';
  html += rule('G^T d \\in \\mathbb{R}^{q+1}');
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">(G\u1D40d)_j</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : 'θ(bias)') + '</td>' +
      '<td style="text-align:right;padding:2px 6px;font-weight:500;color:var(--warn)">' + fmt6(data.GTd[j]) + '</td></tr>';
  html += '</tbody></table></div>';
  return html;
}

function buildRbfSolvePanel(data) {
  var q = data.centers.length;
  var html = buildRbfPhaseLabel(data.train.length + 2, data.train.length);
  html += '<div class="card"><div class="ct">Step 4 \u2014 Solve  w = (G\u1D40G)\u207b\u00b9 G\u1D40d</div>';
  html += rule('w = (G^T G)^{-1} G^T d');
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">w_j (output weight)</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : 'θ(bias)') + '</td>' +
      '<td style="text-align:right;padding:2px 6px;font-weight:600;color:var(--warn)">' + fmt6(data.weights[j]) + '</td></tr>';
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;margin-top:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;color:var(--text3);">' +
    'y_k = ' + data.weights.slice(0, q).map(function(w, j) { return fmt4(w) + '\u00b7\u03c6' + (j + 1); }).join(' + ') +
    ' + ' + fmt4(data.weights[q]) + '</div></div>';
  return html;
}

function buildRbfSummaryPanel(data) {
  var q = data.centers.length;
  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 RBF with ' + q + ' centers · \u03c3=' + data.sigma + '</div>';

  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:10px">';
  html += 'MSE: <strong style="color:' + (data.mse < 0.1 ? 'var(--success)' : 'var(--warn)') + '">' + fmt6(data.mse) + '</strong>';
  html += '  &nbsp; Centers u = [' + data.centers.map(function(c) { return c; }).join(', ') + ']</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Weights</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:12px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 6px;font-weight:400">j</th>' +
    '<th style="padding:2px 6px;font-weight:400;text-align:right">w_j</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : 'θ(bias)') + '</td>' +
      '<td style="padding:2px 6px;text-align:right;font-weight:600;color:var(--warn)">' + fmt6(data.weights[j]) + '</td></tr>';
  html += '</tbody></table>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Fit quality \u2014 all ' + data.results.length + ' points</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 4px;font-weight:400">n</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">y</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">|error|</th>' +
    '</tr></thead><tbody>';
  data.results.forEach(function(r) {
    var err = Math.abs(r.error);
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 4px;color:var(--text3)">' + r.n + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + r.x1 + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + fmt4(r.d) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:500;color:var(--warn)">' + fmt4(Math.round(r.y * 1e4) / 1e4) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:' + (err < 0.2 ? 'var(--success)' : 'var(--warn)') + '">' + fmt4(Math.round(err * 1e4) / 1e4) + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// ── RBF Classification (Ex6) panel builders ───────────────────────────────────

function buildRbfClsPhaseLabel(phase, nTrain) {
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  var phases = [['1','build G','b1'],['2','G\u1D40G','b2'],['3','G\u1D40d','b3'],['4','solve w','b4']];
  phases.forEach(function(pd, i) {
    var active = (i===0&&phase<nTrain)||(i===1&&phase===nTrain)||(i===2&&phase===nTrain+1)||(i===3&&phase>=nTrain+2);
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  return html+'</div>';
}

function buildRbfClsGRowPanel(data, rowIdx) {
  var rd=data.row_details[rowIdx], q=data.centers.length;
  var html=buildRbfClsPhaseLabel(rowIdx,data.train.length);
  html+='<div class="card"><div class="ct">Build G \u2014 row '+(rowIdx+1)+' of '+data.train.length+
    ' &nbsp; (n='+rd.n+', x\u2081='+rd.x1+', x\u2082='+rd.x2+')</div>';
  html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">';
  html+='\u03c6_j = e<sup>-||x\u2212u_j||²/(2\u03c3²)</sup> &nbsp; \u03c3='+data.sigma+'  &nbsp; 2\u03c3²='+Math.round(2*data.sigma*data.sigma*100)/100+'</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>'+
    '<th style="text-align:right;padding:2px 4px;font-weight:400">u_j</th>'+
    '<th style="text-align:right;padding:2px 4px;font-weight:400">||x\u2212u||²</th>'+
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03c6_j</th>'+
    '</tr></thead><tbody>';
  for (var j=0;j<q;j++) {
    var u=data.centers[j];
    var diff2=Math.round(((rd.x1-u[0])*(rd.x1-u[0])+(rd.x2-u[1])*(rd.x2-u[1]))*1e6)/1e6;
    html+='<tr style="border-top:0.5px solid var(--border3)">'+
      '<td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>'+
      '<td style="text-align:right;padding:3px 4px">('+u[0]+','+u[1]+')</td>'+
      '<td style="text-align:right;padding:3px 4px">'+diff2+'</td>'+
      '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fmt6(rd.phis[j])+'</td></tr>';
  }
  html+='<tr style="border-top:1px solid var(--border2)"><td style="padding:3px 4px;color:var(--text3)">bias</td>'+
    '<td colspan="2" style="text-align:right;padding:3px 4px;color:var(--text3)">\u03b8 = 1</td>'+
    '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">1</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">G['+(rowIdx+1)+'] = ['+rd.phis.map(fmt6).join(', ')+', 1]  &nbsp;  d='+rd.d+'</div></div>';

  html+='<div class="card"><div class="ct">G matrix so far \u2014 '+(rowIdx+1)+'/'+data.train.length+' rows</div>';
  html+='<div style="font-family:monospace;font-size:10px;color:var(--text3);line-height:1.7;overflow-x:auto;max-height:220px;overflow-y:auto">';
  for (var i2=0;i2<=rowIdx;i2++) {
    var r2=data.row_details[i2], hl=i2===rowIdx?'color:var(--warn);font-weight:500':'';
    html+='<span style="'+hl+'">n'+r2.n+' ('+r2.x1+','+r2.x2+'): ['+r2.phis.map(fmt4).concat(['1']).join(', ')+']  d='+r2.d+'</span><br>';
  }
  html+='</div></div>';
  return html;
}

function buildRbfClsGTGPanel(data) {
  var q=data.centers.length, p1=q+1;
  var html=buildRbfClsPhaseLabel(data.train.length,data.train.length);
  html+='<div class="card"><div class="ct">Step 2 \u2014 Compute G\u1D40G</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400"></th>';
  for (var j=0;j<p1;j++) html+='<th style="padding:2px 5px;font-weight:400;text-align:right">'+(j<q?'\u03c6'+(j+1):'\u03b8')+'</th>';
  html+='</tr></thead><tbody>';
  for (var i=0;i<p1;i++) {
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 5px;color:var(--text3)">'+(i<q?'\u03c6'+(i+1):'\u03b8')+'</td>';
    for (var j2=0;j2<p1;j2++) html+='<td style="text-align:right;padding:2px 5px'+(i===j2?';color:var(--warn);font-weight:500':'')+'">'+(data.GTG[i]?fmt4(data.GTG[i][j2]):'')+'</td>';
    html+='</tr>';
  }
  html+='</tbody></table></div>';
  return html;
}

function buildRbfClsGTdPanel(data) {
  var q=data.centers.length;
  var html=buildRbfClsPhaseLabel(data.train.length+1,data.train.length);
  html+='<div class="card"><div class="ct">Step 3 \u2014 Compute G\u1D40d</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>'+
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">(G\u1D40d)_j</th></tr></thead><tbody>';
  for (var j=0;j<=q;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j<q?'\u03c6'+(j+1):'\u03b8(bias)')+'</td>'+
      '<td style="text-align:right;padding:2px 6px;font-weight:500;color:var(--warn)">'+fmt6(data.GTd[j])+'</td></tr>';
  html+='</tbody></table></div>';
  return html;
}

function buildRbfClsSolvePanel(data) {
  var q=data.centers.length;
  var html=buildRbfClsPhaseLabel(data.train.length+2,data.train.length);
  html+='<div class="card"><div class="ct">Step 4 \u2014 w = (G\u1D40G)\u207b\u00b9 G\u1D40d</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>'+
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">w_j</th></tr></thead><tbody>';
  for (var j=0;j<=q;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j<q?'\u03c6'+(j+1):'\u03b8(bias)')+'</td>'+
      '<td style="text-align:right;padding:2px 6px;font-weight:600;color:var(--warn)">'+fmt6(data.weights[j])+'</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;margin-top:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;color:var(--text3)">'+
    'y = '+data.weights.slice(0,q).map(function(w,j){return fmt4(w)+'\u00b7\u03c6'+(j+1);}).join(' + ')+' + '+fmt4(data.weights[q])+'<br>'+
    'classify: y \u2265 0 \u2192 +1 &nbsp; y &lt; 0 \u2192 \u22121</div></div>';
  return html;
}

function buildRbfClsSummaryPanel(data) {
  var q=data.centers.length, tr=data.train_score, te=data.test_score;
  var html='<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 RBF classification · q='+q+' · \u03c3='+data.sigma+'</div>';
  html+='<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Fixed centers: '+
    data.centers.map(function(u,j){return 'u'+(j+1)+'=('+u[0]+','+u[1]+')'}).join(' · ')+'</div>';

  html+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (22 patterns)</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:2px;margin-bottom:6px">';
  data.train_results.forEach(function(r){
    html+='<div class="sc-cell '+(r.ok?'sc-ok':'sc-err')+'">'+
      '<div style="font-size:8px">n'+r.n+'</div>'+
      '<div style="font-size:11px;line-height:1.2">'+(r.ok?'✓':'✗')+'</div></div>';
  });
  html+='</div>';
  html+='<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">'+
    '<span style="color:var(--success)">✓ '+tr.correct+'/22</span>'+
    '<span style="color:var(--warn)">✗ '+tr.errors+'/22</span>'+
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
    '<div style="width:'+tr.pct+'%;height:100%;background:'+(tr.correct===22?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>'+
    '<span style="color:var(--text3)">'+tr.pct+'%</span></div></div>';

  if (data.test_annotated && data.test_annotated.length>0) {
    html+=testResultsHTML(data.test_annotated, te);
  }
  html+='</div>';
  return html;
}

// ── 2D Classification canvas ──────────────────────────────────────────────────
function RbfClsCanvas(canvasEl, cfg) {
  BaseCanvas.call(this, canvasEl, cfg);
  this._ymin = cfg.y_def_min;
  this._ymax = cfg.y_def_max;
}
RbfClsCanvas.prototype = Object.create(BaseCanvas.prototype);

RbfClsCanvas.prototype._phi2d = function(x1, x2, u, sigma) {
  return Math.exp(-((x1-u[0])*(x1-u[0])+(x2-u[1])*(x2-u[1]))/(2*sigma*sigma));
};

RbfClsCanvas.prototype._fwd2d = function(x1, x2, data) {
  var y=data.weights[data.q];
  for (var j=0;j<data.q;j++) y+=data.weights[j]*this._phi2d(x1,x2,data.centers[j],data.sigma);
  return y;
};

RbfClsCanvas.prototype.draw = function(data, activePi, showRegion) {
  var dk=isDark(), ctx=this.ctx, CW=this.CW, CH=this.CH, PAD=this.PAD;
  this._ymin=this.cfg.y_def_min; this._ymax=this.cfg.y_def_max;
  var tx=this.tx.bind(this), ty=this.ty.bind(this);

  ctx.clearRect(0,0,CW,CH);
  ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

  if (showRegion && data.weights) {
    // Final decision region heatmap (after solving w)
    var imgW=CW-2*PAD, imgH=CH-2*PAD;
    var imgData=ctx.createImageData(imgW,imgH);
    var posR=dk?[29,158,117]:[29,200,140], negR=dk?[216,90,48]:[220,80,40];
    var self=this;
    for (var px=0;px<imgW;px++) {
      var x1v=this.cfg.x1min+(px/imgW)*(this.cfg.x1max-this.cfg.x1min);
      for (var py=0;py<imgH;py++) {
        var x2v=this._ymax-(py/imgH)*(this._ymax-this._ymin);
        var y=self._fwd2d(x1v,x2v,data);
        var conf=Math.min(1,Math.abs(y)/2);
        var al=Math.round(20+conf*(dk?95:80));
        var col=y>=data.threshold?posR:negR, idx=(py*imgW+px)*4;
        imgData.data[idx]=col[0]; imgData.data[idx+1]=col[1];
        imgData.data[idx+2]=col[2]; imgData.data[idx+3]=al;
      }
    }
    ctx.putImageData(imgData,PAD,PAD);
  } else {
    // During G-building: just show empty grid with centers marked
  }

  this.drawGrid(true);

  // Centers
  if (data.centers) {
    data.centers.forEach(function(u,j){
      ctx.beginPath(); ctx.arc(tx(u[0]),ty(u[1]),10,0,Math.PI*2);
      ctx.strokeStyle=dk?'rgba(147,197,253,0.9)':'rgba(24,95,165,0.8)';
      ctx.lineWidth=2; ctx.setLineDash([3,2]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=dk?'#93c5fd':'#185FA5'; ctx.font='bold 9px monospace';
      ctx.textAlign='center'; ctx.fillText('u'+(j+1),tx(u[0]),ty(u[1])-14);
    });
  }

  // Data points
  var results=data.train_results||[];
  for (var i=0;i<data.train.length;i++) {
    var p=data.train[i], ppx=tx(p.x1), ppy=ty(p.x2), isCur=i===activePi;
    var isPos=p.d===1;
    var ptok=results.length>i?results[i].ok:false;
    if (ptok) {
      ctx.beginPath(); ctx.arc(ppx,ppy,14,0,Math.PI*2);
      ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)'; ctx.fill();
    }
    if (isCur) {
      ctx.beginPath(); ctx.arc(ppx,ppy,15,0,Math.PI*2);
      ctx.strokeStyle='#EF9F27'; ctx.lineWidth=2; ctx.stroke();
    }
    var fillC=isPos?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)'):(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
    var strokeC=isCur?'#EF9F27':(isPos?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
    ctx.beginPath(); ctx.arc(ppx,ppy,8,0,Math.PI*2);
    ctx.fillStyle=fillC; ctx.fill(); ctx.strokeStyle=strokeC; ctx.lineWidth=isCur?2.5:1.5; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 8px sans-serif'; ctx.textAlign='center';
    ctx.fillText(String(p.n),ppx,ppy+2.5);
  }
};
