function hb_scoreTrackerHTML(step, phase) {
  var results = phase === 0 ? hb_evalAll(HEBB_EX.train, step.weights_before.w1, step.weights_before.w2, step.weights_before.theta) : step.train_results;
  var sc = hb_score(results), n = results.length;
  var lbl = phase === 0 ? 'Before update' : 'After update';
  var html = '<div class="card" style="margin-bottom:8px"><div class="ct">All '+n+' patterns \u2014 '+lbl+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:2px;margin-bottom:6px">';
  for (var i = 0; i < n; i++) {
    var r = results[i], isCur = i === step.pi;
    html += '<div class="sc-cell '+(r.ok?'sc-ok':'sc-err')+(isCur?' sc-cur':'')+'">'+
      '<div style="font-size:8px">n'+HEBB_EX.train[i].n+'</div>'+
      '<div style="font-size:11px;line-height:1.2">'+(r.ok?'✓':'✗')+'</div></div>';
  }
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">'+
    '<span style="color:var(--success);font-weight:500">✓ '+sc.correct+'/'+n+'</span>'+
    '<span style="color:var(--warn);font-weight:500">✗ '+sc.errors+'/'+n+'</span>'+
    '<div style="flex:1;min-width:40px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
    '<div style="width:'+sc.pct+'%;height:100%;background:'+(sc.correct===n?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>'+
    '<span style="color:var(--text3)">'+sc.pct+'%</span></div>';
  if (sc.correct===n) html+='<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All correct!</div>';
  html += '</div>'; return html;
}

function hb_buildPanel(step, phase) {
  var p = step.pattern, wb = step.weights_before, wa = step.weights_after;
  var html = '';

  var phases = [['1','normalize','b1'],['2','compute y*','b2'],['3','update w','b4']];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  html += '</div>';
  html += hb_scoreTrackerHTML(step, phase);
  html += '<div class="card"><div class="ct">Pattern n='+p.n+' \u2014 Step '+(step.pi+1)+'/'+HEBB_EX.train.length+' iter '+step.iter+'</div>'+
    '<div style="font-family:monospace;font-size:12px;line-height:2">x\u2081='+p.x1+'  x\u2082='+p.x2+'  d='+p.d+'</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Step 1 \u2014 Normalize inputs</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">\u0078\u0302_j = 2\u00b7(x_j \u2212 x_min)/(x_max \u2212 x_min) \u2212 1</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:12px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400">input</th><th style="text-align:right;padding:3px 6px;font-weight:400">x</th><th style="text-align:right;padding:3px 6px;font-weight:400">range</th><th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">\u0078\u0302</th></tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">x\u2081</td><td style="text-align:right;padding:3px 6px">'+p.x1+'</td><td style="text-align:right;padding:3px 6px;color:var(--text3)">[0, 5]</td><td style="text-align:right;padding:3px 6px;font-weight:500;color:var(--warn)">'+hb_fmt(step.xh1)+'</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">x\u2082</td><td style="text-align:right;padding:3px 6px">'+p.x2+'</td><td style="text-align:right;padding:3px 6px;color:var(--text3)">[0, 3]</td><td style="text-align:right;padding:3px 6px;font-weight:500;color:var(--warn)">'+hb_fmt(step.xh2)+'</td></tr>';
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Step 2 \u2014 y* = w\u2081\u0078\u0302\u2081 + w\u2082\u0078\u0302\u2082 + \u03b8</div>';
    html += '<div class="deriv">'+
      '<span style="color:var(--text3)">y* = '+hb_fmt4(wb.w1)+'\u00b7('+hb_fmt(step.xh1)+') + '+hb_fmt4(wb.w2)+'\u00b7('+hb_fmt(step.xh2)+') + ('+hb_fmt4(wb.theta)+')</span>'+
      '<span style="font-weight:500">y* = <span style="color:var(--warn)">'+hb_fmt(step.y_star)+'</span>  \u2192  '+(step.cls===1?'+1':'\u22121')+' &nbsp; (d='+p.d+(step.cls===p.d?' \u2713':' \u2717')+')</span>'+
      '</div>'+
      '<div style="font-size:11px;color:var(--text3);margin-top:6px">\u26a0\ufe0f Hebb always updates \u2014 even when y = d</div></div>';

  } else if (phase === 2) {
    html += '<div class="card"><div class="ct">Step 3 \u2014 w_i = w_i + \u03b1\u00b7\u0078\u0302_i\u00b7d &nbsp; \u03b8 = \u03b8 + \u03b1\u00b7d</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:12px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400"></th><th style="text-align:right;padding:3px 6px;font-weight:400">old</th><th style="text-align:right;padding:3px 6px;font-weight:400">\u03b1\u00b7\u0078\u0302\u00b7d</th><th style="text-align:right;padding:3px 6px;font-weight:400;color:var(--warn)">new</th></tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">w\u2081</td><td style="text-align:right;padding:3px 6px">'+hb_fmt4(wb.w1)+'</td><td style="text-align:right;padding:3px 6px">'+hb_fmtS(step.dw1)+'</td><td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">'+hb_fmt4(wa.w1)+'</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">w\u2082</td><td style="text-align:right;padding:3px 6px">'+hb_fmt4(wb.w2)+'</td><td style="text-align:right;padding:3px 6px">'+hb_fmtS(step.dw2)+'</td><td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">'+hb_fmt4(wa.w2)+'</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">\u03b8</td><td style="text-align:right;padding:3px 6px">'+hb_fmt4(wb.theta)+'</td><td style="text-align:right;padding:3px 6px">'+hb_fmtS(step.dtheta)+'</td><td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">'+hb_fmt4(wa.theta)+'</td></tr>';
    html += '</tbody></table></div>';
  }
  return html;
}

function hb_summaryPanel(exData) {
  var fw = exData.final_weights, cfg = exData.config;
  var trainSc = exData.steps[exData.steps.length-1].train_score;
  var html = '<div class="card"><div class="ct">\ud83c\udfaf Final results \u2014 Hebb · \u03b1='+cfg.alpha+' · '+cfg.n_iters+' pass(es)</div>';
  html += '<div style="font-family:monospace;font-size:12px;margin-bottom:10px;line-height:2">'+
    'w\u2081 = <strong>'+hb_fmt4(fw.w1)+'</strong> &nbsp; w\u2082 = <strong>'+hb_fmt4(fw.w2)+'</strong> &nbsp; \u03b8 = <strong>'+hb_fmt4(fw.theta)+'</strong></div>';
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (22 patterns)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">'+
    '<span style="color:var(--success)">\u2713 '+trainSc.correct+'/22</span>'+
    '<span style="color:var(--warn)">\u2717 '+trainSc.errors+'/22</span>'+
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
    '<div style="width:'+trainSc.pct+'%;height:100%;background:'+(trainSc.correct===22?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>'+
    '<span style="color:var(--text3)">'+trainSc.pct+'%</span></div></div>';

  var te = exData.test_score;
  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set (8 vectors)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px">';
  exData.test_annotated.forEach(function(p){
    var ds2=p.d===1?'+1':'−1', cls2=p.cls===1?'+1':'−1';
    html+='<div class="test-cell '+(p.ok?'test-ok':'test-err')+'">'+
      '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n='+p.n+'</div>'+
      '<div style="font-size:9px">('+p.x1+','+p.x2+')</div>'+
      '<div style="font-size:9px">d='+ds2+'</div>'+
      '<div style="font-size:10px">y*='+hb_fmt4(Math.round(p.y_star*1e4)/1e4)+'</div>'+
      '<div style="font-size:10px">→'+cls2+'</div>'+
      '<div style="font-size:14px;line-height:1.4">'+(p.ok?'✓':'✗')+'</div></div>';
  });
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">'+
    '<span style="color:var(--success);font-weight:500">\u2713 '+te.correct+'/8</span>'+
    '<span style="color:var(--warn);font-weight:500">\u2717 '+te.errors+'/8</span>'+
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
    '<div style="width:'+te.pct+'%;height:100%;background:'+(te.correct===8?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>'+
    '<span style="color:var(--text3)">'+te.pct+'%</span></div>';
  html += '</div>'; return html;
}
