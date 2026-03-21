function isDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
}

function BaseCanvas(canvasEl, cfg) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
  this.PAD = 52;
  this.cfg = cfg;   // { x1min, x1max, ref_x, y_def_min, y_def_max }
}

BaseCanvas.prototype.tx = function(v) {
  var c = this.cfg;
  return this.PAD + (v - c.x1min) / (c.x1max - c.x1min) * (this.CW - 2 * this.PAD);
};

BaseCanvas.prototype.ty = function(v) {
  return this.CH - this.PAD - (v - this._ymin) / (this._ymax - this._ymin) * (this.CH - 2 * this.PAD);
};

BaseCanvas.prototype.drawGrid = function(skipFill) {
  var dk  = isDark();
  var ctx = this.ctx, CW = this.CW, CH = this.CH, PAD = this.PAD;
  var cfg = this.cfg;
  var tx  = this.tx.bind(this), ty = this.ty.bind(this);

  if (!skipFill) {
    ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
    ctx.fillRect(0, 0, CW, CH);
  }

  var gridC = dk ? 'rgba(200,200,190,0.07)' : 'rgba(0,0,0,0.055)';
  var axC   = dk ? 'rgba(200,200,190,0.22)' : 'rgba(0,0,0,0.18)';
  var txC   = dk ? '#c2c0b6' : '#444441';
  var mutC  = dk ? '#888780' : '#888780';

  var yRange = this._ymax - this._ymin;
  var ystep  = yRange <= 1.5 ? 0.25 : yRange <= 3 ? 0.5 : 1.0;
  var y0     = Math.ceil(this._ymin / ystep) * ystep;

  ctx.strokeStyle = gridC; ctx.lineWidth = 0.5;
  for (var v = y0; v <= this._ymax + 0.001; v += ystep) {
    var rv = Math.round(v * 1000) / 1000;
    ctx.beginPath(); ctx.moveTo(PAD, ty(rv)); ctx.lineTo(CW - PAD, ty(rv)); ctx.stroke();
  }
  for (var xg = Math.ceil(cfg.x1min); xg <= cfg.x1max; xg++) {
    ctx.beginPath(); ctx.moveTo(tx(xg), PAD); ctx.lineTo(tx(xg), CH - PAD); ctx.stroke();
  }

  ctx.lineWidth = 0.7; ctx.setLineDash([2, 3]);
  ctx.strokeStyle = dk ? 'rgba(200,200,190,0.2)' : 'rgba(0,0,0,0.14)';
  cfg.ref_x.forEach(function(rx) {
    ctx.beginPath(); ctx.moveTo(tx(rx), PAD); ctx.lineTo(tx(rx), CH - PAD); ctx.stroke();
  });
  if (0 >= this._ymin && 0 <= this._ymax) {
    ctx.strokeStyle = dk ? 'rgba(200,200,190,0.28)' : 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.moveTo(PAD, ty(0)); ctx.lineTo(CW - PAD, ty(0)); ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = axC; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, PAD - 5); ctx.lineTo(PAD, CH - PAD + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD - 5, CH - PAD); ctx.lineTo(CW - PAD + 5, CH - PAD); ctx.stroke();

  ctx.fillStyle = txC; ctx.font = '11px sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('x\u2081', CW - PAD + 16, CH - PAD + 3);
  ctx.textAlign = 'right';  ctx.fillText('x\u2082', PAD - 5, PAD - 12);
  ctx.font = '9px sans-serif'; ctx.fillStyle = mutC;
  ctx.textAlign = 'center';
  cfg.ref_x.forEach(function(rx) { ctx.fillText('x\u2081=' + rx, tx(rx), PAD - 5); });
  for (var xg = Math.ceil(cfg.x1min); xg <= cfg.x1max; xg++)
    ctx.fillText(xg, tx(xg), CH - PAD + 13);
  ctx.textAlign = 'right';
  for (var v = y0; v <= this._ymax + 0.001; v += ystep) {
    var rv = Math.round(v * 1000) / 1000;
    ctx.fillText(Number.isInteger(rv) ? String(rv) : rv.toFixed(ystep < 0.5 ? 2 : 1), PAD - 4, ty(rv) + 3);
  }
};

BaseCanvas.prototype.drawPoints = function(dataset, curPi, isTest, results) {
  var dk  = isDark();
  var ctx = this.ctx;
  var tx  = this.tx.bind(this), ty = this.ty.bind(this);

  for (var i = 0; i < dataset.length; i++) {
    var p    = dataset[i];
    var ppx  = tx(p.x1), ppy = ty(p.x2);
    var isPos  = p.d === 1;
    var isCur  = !isTest && i === curPi;
    var ptok   = results ? results[i].ok : false;

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
    ctx.beginPath(); ctx.arc(ppx, ppy, 8, 0, Math.PI * 2);
    ctx.fillStyle = fillC; ctx.fill();
    ctx.strokeStyle = strokeC; ctx.lineWidth = isCur ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(p.n), ppx, ppy + 2.5);
  }
};

function fmt4(n) {
  if (n === undefined || n === null) return '?';
  var r = Math.round(n * 1e4) / 1e4;
  return r.toFixed(4).replace(/\.?0+$/, '') || '0';
}
function fmt6(n) {
  if (n === undefined || n === null) return '?';
  var r = Math.round(n * 1e6) / 1e6;
  return r.toFixed(6).replace(/\.?0+$/, '') || '0';
}
function fmtS(n) { return n >= 0 ? '+' + fmt4(n) : fmt4(n); }
function fmtS6(n){ return n >= 0 ? '+' + fmt6(n) : fmt6(n); }

function scoreTrackerHTML(trainResults, trainScore, trainDataset, curPi, phase, ws_label) {
  var n    = trainResults.length;
  var sc   = trainScore;
  var cols = Math.min(n, 11);
  var html = '<div class="card" style="margin-bottom:8px">';
  html += '<div class="ct">All ' + n + ' training patterns — ' + (ws_label || '') + '</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:2px;margin-bottom:6px">';
  for (var i = 0; i < n; i++) {
    var r = trainResults[i], isCur = (i === curPi);
    var cc = 'sc-cell ' + (r.ok ? 'sc-ok' : 'sc-err') + (isCur ? ' sc-cur' : '');
    html += '<div class="' + cc + '">' +
      '<div style="font-size:8px">n' + trainDataset[i].n + '</div>' +
      '<div style="font-size:11px;line-height:1.2">' + (r.ok ? '✓' : '✗') + '</div>' +
      '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;flex-wrap:wrap">';
  html += '<span style="color:var(--success);font-weight:500">✓ ' + sc.correct + '/' + n + '</span>';
  html += '<span style="color:var(--warn);font-weight:500">✗ ' + sc.errors + '/' + n + '</span>';
  html += '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + sc.pct + '%;height:100%;background:' +
    (sc.correct === n ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>';
  html += '<span style="color:var(--text3)">' + sc.pct + '%</span>';
  html += '</div>';
  if (sc.correct === n)
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All ' + n + ' correct!</div>';
  else
    html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">' + sc.errors + ' pattern' + (sc.errors === 1 ? '' : 's') + ' still misclassified.</div>';
  html += '</div>';
  return html;
}

function testResultsHTML(testAnnotated, testScore, nCols) {
  var html = '';
  nCols = nCols || Math.min(testAnnotated.length, 4);
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set (' + testAnnotated.length + ' vectors)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(' + nCols + ',1fr);gap:5px;margin-bottom:8px">';
  testAnnotated.forEach(function(p) {
    var ds = p.d === 1 ? '+1' : '−1';
    var yc = (p.y_class !== undefined ? p.y_class : p.y) === 1 ? '+1' : '−1';
    html += '<div class="test-cell ' + (p.ok ? 'test-ok' : 'test-err') + '">' +
      '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n=' + p.n + '</div>' +
      '<div style="font-size:9px">(' + p.x1 + ',' + p.x2 + ')</div>' +
      '<div style="font-size:9px">d=' + ds + '</div>' +
      (p.y_star !== undefined ? '<div style="font-size:10px">y*=' + fmt4(p.y_star) + '</div>' : '') +
      '<div style="font-size:10px">→' + yc + '</div>' +
      '<div style="font-size:14px;line-height:1.4">' + (p.ok ? '✓' : '✗') + '</div>' +
      '</div>';
  });
  html += '</div>';
  var ts = testScore;
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success);font-weight:500">✓ ' + ts.correct + '/' + testAnnotated.length + '</span>' +
    '<span style="color:var(--warn);font-weight:500">✗ ' + ts.errors + '/' + testAnnotated.length + '</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:' + ts.pct + '%;height:100%;background:' + (ts.correct === testAnnotated.length ? 'var(--success)' : 'var(--warn)') + ';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">' + ts.pct + '%</span></div>';
  return html;
}

function NavController(opts) {
  // opts: { total, onRender }
  this.cur      = 0;
  this.total    = opts.total;
  this.onRender = opts.onRender;

  var self = this;
  document.getElementById('bprev').addEventListener('click', function() { self.go(-1); });
  document.getElementById('bnext').addEventListener('click', function() { self.go(1); });
  document.getElementById('breset') && document.getElementById('breset').addEventListener('click', function() { self.goTo(0); });
  document.getElementById('btest')  && document.getElementById('btest').addEventListener('click',  function() { self.goTo(self.total - 1); });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); self.go(1); }
    if (e.key === 'ArrowLeft')                   { e.preventDefault(); self.go(-1); }
    if (e.key === 'Home')                        { e.preventDefault(); self.goTo(0); }
    if (e.key === 'End')                         { e.preventDefault(); self.goTo(self.total - 1); }
  });
}

NavController.prototype.go    = function(d) { this.goTo(this.cur + d); };
NavController.prototype.goTo  = function(i) {
  this.cur = Math.max(0, Math.min(this.total - 1, i));
  document.getElementById('bprev').disabled = (this.cur === 0);
  document.getElementById('bnext').disabled = (this.cur === this.total - 1);
  this.onRender(this.cur);
};
NavController.prototype.start = function() { this.goTo(0); };
