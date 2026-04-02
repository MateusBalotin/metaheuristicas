function rbf_phaseLabel(phase, nTrain) {
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

function rbf_rowPanel(data, rowIdx) {
  var rd = data.row_details[rowIdx], q = data.centers.length;
  var html = rbf_phaseLabel(rowIdx, data.train.length);

  html += '<div class="card"><div class="ct">Build G \u2014 row ' + (rowIdx + 1) + ' of ' + data.train.length +
    ' &nbsp; (n=' + rd.n + ', x=' + rd.x1 + ')</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
    '\u03c6_j = e<sup>-||x\u2212u_j||²/(2\u03c3²)</sup> &nbsp; \u03c3=' + data.sigma + '</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">u_j</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">||x\u2212u||²</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">\u03c6_j</th>' +
    '</tr></thead><tbody>';
  for (var j = 0; j < q; j++) {
    var diff2 = Math.round(Math.pow(rd.x1 - data.centers[j], 2) * 1e6) / 1e6;
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 4px;color:var(--text3)">' + (j + 1) + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + data.centers[j] + '</td>' +
      '<td style="text-align:right;padding:3px 4px">' + diff2 + '</td>' +
      '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">' + rbf_fmt(rd.phis[j]) + '</td></tr>';
  }
  html += '<tr style="border-top:1px solid var(--border2)">' +
    '<td style="padding:3px 4px;color:var(--text3)">bias</td>' +
    '<td colspan="2" style="text-align:right;padding:3px 4px;color:var(--text3)">\u03b8 = 1</td>' +
    '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">1</td></tr>';
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">' +
    'G[' + (rowIdx + 1) + '] = [' + rd.phis.map(rbf_fmt).join(', ') + ', 1]  &nbsp;  d=' + rd.d + '</div></div>';

  html += '<div class="card"><div class="ct">G matrix so far (' + (rowIdx + 1) + '/' + data.train.length + ' rows)</div>';
  html += '<div style="font-family:monospace;font-size:10px;color:var(--text3);line-height:1.7;overflow-x:auto">';
  for (var i = 0; i <= rowIdx; i++) {
    var r2 = data.row_details[i];
    var hl = i === rowIdx ? 'color:var(--warn);font-weight:500' : '';
    html += '<span style="' + hl + '">n' + r2.n + ': [' + r2.phis.map(rbf_fmt4).concat(['1']).join(', ') + ']</span><br>';
  }
  html += '</div></div>';
  return html;
}

function rbf_gtgPanel(data) {
  var q = data.centers.length, p1 = q + 1;
  var html = rbf_phaseLabel(data.train.length, data.train.length);
  html += '<div class="card"><div class="ct">Step 2 \u2014 Compute G\u1D40G</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">G\u1D40G \u2208 \u211d<sup>' + p1 + '\u00d7' + p1 + '</sup></div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400"></th>';
  for (var j = 0; j < p1; j++)
    html += '<th style="padding:2px 5px;font-weight:400;text-align:right">' + (j < q ? '\u03c6' + (j + 1) : '\u03b8') + '</th>';
  html += '</tr></thead><tbody>';
  for (var i = 0; i < p1; i++) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:var(--text3)">' + (i < q ? '\u03c6' + (i + 1) : '\u03b8') + '</td>';
    for (var j2 = 0; j2 < p1; j2++)
      html += '<td style="text-align:right;padding:2px 5px' + (i === j2 ? ';color:var(--warn);font-weight:500' : '') + '">' + rbf_fmt4(data.GTG[i][j2]) + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function rbf_gtdPanel(data) {
  var q = data.centers.length;
  var html = rbf_phaseLabel(data.train.length + 1, data.train.length);
  html += '<div class="card"><div class="ct">Step 3 \u2014 Compute G\u1D40d</div>';
  html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">G\u1D40d \u2208 \u211d<sup>' + (q + 1) + '</sup></div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">(G\u1D40d)_j</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : '\u03b8(bias)') + '</td>' +
      '<td style="text-align:right;padding:2px 6px;font-weight:500;color:var(--warn)">' + rbf_fmt(data.GTd[j]) + '</td></tr>';
  html += '</tbody></table></div>';
  return html;
}

function rbf_solvePanel(data) {
  var q = data.centers.length;
  var html = rbf_phaseLabel(data.train.length + 2, data.train.length);
  html += '<div class="card"><div class="ct">Step 4 \u2014 Solve  w = (G\u1D40G)\u207b\u00b9 G\u1D40d</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">j</th>' +
    '<th style="text-align:right;padding:2px 6px;font-weight:400;color:var(--warn)">w_j (output weight)</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : '\u03b8(bias)') + '</td>' +
      '<td style="text-align:right;padding:2px 6px;font-weight:600;color:var(--warn)">' + rbf_fmt(data.weights[j]) + '</td></tr>';
  html += '</tbody></table>';
  html += '<div style="font-family:monospace;font-size:11px;margin-top:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;color:var(--text3)">' +
    'y = ' + data.weights.slice(0, q).map(function(w, j) { return rbf_fmt4(w) + '\u00b7\u03c6' + (j + 1); }).join(' + ') +
    ' + ' + rbf_fmt4(data.weights[q]) + '</div></div>';
  return html;
}

function rbf_summaryPanel(data) {
  var q = data.centers.length;
  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 RBF with ' + q + ' centers · \u03c3=' + data.sigma + '</div>';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:10px">' +
    'MSE: <strong style="color:' + (data.mse < 0.1 ? 'var(--success)' : 'var(--warn)') + '">' + rbf_fmt(data.mse) + '</strong>' +
    '  &nbsp;  Centers: [' + data.centers.join(', ') + ']</div>';
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Weights</div>';
  html += '<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:12px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 6px;font-weight:400">j</th>' +
    '<th style="padding:2px 6px;font-weight:400;text-align:right">w_j</th></tr></thead><tbody>';
  for (var j = 0; j <= q; j++)
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">' + (j < q ? '\u03c6' + (j + 1) : '\u03b8(bias)') + '</td>' +
      '<td style="padding:2px 6px;text-align:right;font-weight:600;color:var(--warn)">' + rbf_fmt(data.weights[j]) + '</td></tr>';
  html += '</tbody></table>';
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Fit quality</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 4px;font-weight:400">n</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">y</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">|err|</th></tr></thead><tbody>';
  data.results.forEach(function(r) {
    var err = Math.abs(r.error);
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 4px;color:var(--text3)">' + r.n + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + r.x1 + '</td>' +
      '<td style="text-align:right;padding:2px 4px">' + rbf_fmt4(r.d) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:500;color:var(--warn)">' + rbf_fmt4(Math.round(r.y * 1e4) / 1e4) + '</td>' +
      '<td style="text-align:right;padding:2px 4px;color:' + (err < 0.2 ? 'var(--success)' : 'var(--warn)') + '">' + rbf_fmt4(Math.round(err * 1e4) / 1e4) + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// ── RBF Classification panel builders ────────────────────────────────────────
function buildRbfClsPhaseLabel(phase, nTrain) {
  var html='<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  var phases=[['1','build G','b1'],['2','G\u1D40G','b2'],['3','G\u1D40d','b3'],['4','solve w','b4']];
  phases.forEach(function(pd,i){
    var active=(i===0&&phase<nTrain)||(i===1&&phase===nTrain)||(i===2&&phase===nTrain+1)||(i===3&&phase>=nTrain+2);
    html+='<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
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
  for(var j=0;j<q;j++){
    var u=data.centers[j];
    var diff2=Math.round(((rd.x1-u[0])*(rd.x1-u[0])+(rd.x2-u[1])*(rd.x2-u[1]))*1e6)/1e6;
    html+='<tr style="border-top:0.5px solid var(--border3)">'+
      '<td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>'+
      '<td style="text-align:right;padding:3px 4px">('+u[0]+','+u[1]+')</td>'+
      '<td style="text-align:right;padding:3px 4px">'+diff2+'</td>'+
      '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+rbf_fmt(rd.phis[j])+'</td></tr>';
  }
  html+='<tr style="border-top:1px solid var(--border2)"><td style="padding:3px 4px;color:var(--text3)">bias</td>'+
    '<td colspan="2" style="text-align:right;padding:3px 4px;color:var(--text3)">\u03b8 = 1</td>'+
    '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">1</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">G['+(rowIdx+1)+'] = ['+rd.phis.map(rbf_fmt).join(', ')+', 1]  &nbsp;  d='+rd.d+'</div></div>';
  html+='<div class="card"><div class="ct">G matrix so far \u2014 '+(rowIdx+1)+'/'+data.train.length+' rows</div>';
  html+='<div style="font-family:monospace;font-size:10px;color:var(--text3);line-height:1.7;overflow-x:auto;max-height:220px;overflow-y:auto">';
  for(var i2=0;i2<=rowIdx;i2++){
    var r2=data.row_details[i2],hl=i2===rowIdx?'color:var(--warn);font-weight:500':'';
    html+='<span style="'+hl+'">n'+r2.n+' ('+r2.x1+','+r2.x2+'): ['+r2.phis.map(rbf_fmt4).concat(['1']).join(', ')+']  d='+r2.d+'</span><br>';
  }
  html+='</div></div>';
  return html;
}

function buildRbfClsGTGPanel(data) {
  var q=data.centers.length,p1=q+1;
  var html=buildRbfClsPhaseLabel(data.train.length,data.train.length);
  html+='<div class="card"><div class="ct">Step 2 \u2014 Compute G\u1D40G</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400"></th>';
  for(var j=0;j<p1;j++) html+='<th style="padding:2px 5px;font-weight:400;text-align:right">'+(j<q?'\u03c6'+(j+1):'\u03b8')+'</th>';
  html+='</tr></thead><tbody>';
  for(var i=0;i<p1;i++){
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 5px;color:var(--text3)">'+(i<q?'\u03c6'+(i+1):'\u03b8')+'</td>';
    for(var j2=0;j2<p1;j2++) html+='<td style="text-align:right;padding:2px 5px'+(i===j2?';color:var(--warn);font-weight:500':'')+'">'+(data.GTG[i]?rbf_fmt4(data.GTG[i][j2]):'')+'</td>';
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
  for(var j=0;j<=q;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j<q?'\u03c6'+(j+1):'\u03b8(bias)')+'</td>'+
      '<td style="text-align:right;padding:2px 6px;font-weight:500;color:var(--warn)">'+rbf_fmt(data.GTd[j])+'</td></tr>';
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
  for(var j=0;j<=q;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j<q?'\u03c6'+(j+1):'\u03b8(bias)')+'</td>'+
      '<td style="text-align:right;padding:2px 6px;font-weight:600;color:var(--warn)">'+rbf_fmt(data.weights[j])+'</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;margin-top:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;color:var(--text3)">'+
    'y = '+data.weights.slice(0,q).map(function(w,j){return rbf_fmt4(w)+'\u00b7\u03c6'+(j+1);}).join(' + ')+' + '+rbf_fmt4(data.weights[q])+'<br>'+
    'classify: y \u2265 0 \u2192 +1 &nbsp; y &lt; 0 \u2192 \u22121</div></div>';
  return html;
}

function buildRbfClsSummaryPanel(data) {
  var q=data.centers.length,tr=data.train_score,te=data.test_score;
  var html='<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 RBF classification · q='+q+' · \u03c3='+data.sigma+'</div>';
  html+='<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Fixed centers: '+
    data.centers.map(function(u,j){return 'u'+(j+1)+'=('+u[0]+','+u[1]+')';}).join(' · ')+'</div>';
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
  if(data.test_annotated&&data.test_annotated.length>0){
    html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set (8 vectors)</div>';
    html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px">';
    data.test_annotated.forEach(function(p){
      var ds2=p.d===1?'+1':'−1',cls2=p.cls===1?'+1':'−1';
      html+='<div class="test-cell '+(p.ok?'test-ok':'test-err')+'">'+
        '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n='+p.n+'</div>'+
        '<div style="font-size:9px">('+p.x1+','+p.x2+')</div>'+
        '<div style="font-size:9px">d='+ds2+'</div>'+
        '<div style="font-size:10px">y='+rbf_fmt4(Math.round(p.y*1e4)/1e4)+'</div>'+
        '<div style="font-size:10px">→'+cls2+'</div>'+
        '<div style="font-size:14px;line-height:1.4">'+(p.ok?'✓':'✗')+'</div></div>';
    });
    html+='</div>';
    html+='<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">'+
      '<span style="color:var(--success);font-weight:500">✓ '+te.correct+'/8</span>'+
      '<span style="color:var(--warn);font-weight:500">✗ '+te.errors+'/8</span>'+
      '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
      '<div style="width:'+te.pct+'%;height:100%;background:'+(te.correct===8?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>'+
      '<span style="color:var(--text3)">'+te.pct+'%</span></div>';
  }
  html+='</div>';
  return html;
}
