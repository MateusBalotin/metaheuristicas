// ── Adaline UI panel builders ─────────────────────────────────────────────────

function adalineLineDerivHTML(w1, w2, th, color, refX) {
  var rx0 = refX[0], rx1 = refX[refX.length-1];
  if(w2===0 && w1===0)
    return '<span style="color:var(--text3)">Weights zero — no line yet.</span>';
  if(w2===0){
    var xv = afmtD(-th/w1);
    return '<span style="color:var(--text3)">'+afmtN(w1)+'·x₁ + ('+afmtN(th)+') = 0</span>' +
           '<span style="font-weight:500;color:'+color+'">→ x₁ = '+xv+' (vertical)</span>';
  }
  var slope = ar4(-w1/w2);
  var intc  = ar4(-th/w2);
  var at0   = ar4((-w1*rx0 - th)/w2);
  var at1   = ar4((-w1*rx1 - th)/w2);
  return '<span style="color:var(--text3)">y* = w₁·x₁ + w₂·x₂ + θ = 0</span>' +
    '<span style="color:var(--text3)">'+afmtN(w1)+'·x₁ + '+afmtN(w2)+'·x₂ + ('+afmtN(th)+') = 0</span>' +
    '<span style="color:var(--text3)">'+afmtN(w2)+'·x₂ = −'+afmtN(w1)+'·x₁ − ('+afmtN(th)+')</span>' +
    '<span style="color:var(--text3)">x₂ = (−'+afmtN(w1)+'·x₁ − ('+afmtN(th)+')) / '+afmtN(w2)+'</span>' +
    '<span style="font-weight:500;color:'+color+'">→ x₂ = '+afmtD(slope)+'·x₁ '+asgn(intc)+afmtD(intc)+'</span>' +
    '<span style="color:var(--text3)">at x₁='+rx0+' : x₂ = '+afmtD(at0)+'</span>' +
    '<span style="color:var(--text3)">at x₁='+rx1+' : x₂ = '+afmtD(at1)+'</span>';
}

function adalineScoreTrackerHTML(step, phase, nCols) {
  var w1 = (phase===0) ? step.wb.w1 : step.wa.w1;
  var w2 = (phase===0) ? step.wb.w2 : step.wa.w2;
  var th = (phase===0) ? step.wb.th  : step.wa.th;
  var results = step.trainResults;
  var sc      = step.trainScore;
  var n       = results.length;
  var cols    = nCols || Math.min(n, 11);
  var wlbl    = (phase===0?'before':'after')+' update (w₁='+afmtN(w1)+', w₂='+afmtN(w2)+', θ='+afmtN(th)+')';

  var html = '<div class="card" style="margin-bottom:8px">';
  html += '<div class="ct">All '+n+' training patterns with current weights</div>';
  html += '<div style="font-size:10px;color:var(--text3);font-family:monospace;margin-bottom:8px">'+wlbl+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:2px;margin-bottom:6px">';
  for(var i=0; i<n; i++){
    var r = results[i], isCur = (i===step.pi);
    var cc = 'sc-cell '+(r.ok?'sc-ok':'sc-err')+(isCur?' sc-cur':'');
    var lbl = step.trainPts ? step.trainPts[i].n : (i+1);
    html += '<div class="'+cc+'" title="n='+lbl+'">' +
      '<div style="font-size:8px">n'+lbl+'</div>' +
      '<div style="font-size:11px;line-height:1.2">'+(r.ok?'✓':'✗')+'</div>' +
      '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;flex-wrap:wrap">';
  html += '<span style="color:var(--success);font-weight:500">✓ '+sc.correct+'/'+n+'</span>';
  html += '<span style="color:var(--warn);font-weight:500">✗ '+sc.errors+'/'+n+'</span>';
  html += '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:'+sc.pct+'%;height:100%;background:'+(sc.correct===n?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>';
  html += '<span style="color:var(--text3)">'+sc.pct+'%</span>';
  html += '</div>';
  if(sc.correct===n){
    html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All '+n+' correct!</div>';
  } else {
    html += '<div style="margin-top:6px;font-size:11px;color:var(--text3)">'+sc.errors+' pattern'+(sc.errors===1?'':'s')+' still misclassified.</div>';
  }
  html += '</div>';
  return html;
}

// ── 3 phases per step ─────────────────────────────────────────────────────────
// Phase 0: compute y* and error (d − y*)
// Phase 1: weight update
// Phase 2: decision boundary y* = 0
function buildAdalinePanel(step, phase, cfg) {
  var ds = step.p.d===1 ? '+1' : '−1';
  var refX = cfg.canvas.refX;
  var html = '';

  // Phase breadcrumb
  var phaseDefs = [
    ['1','compute y* & error','b1'],
    ['2','weight update','b2'],
    ['3','decision boundary','b4'],
  ];
  html += '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phaseDefs.forEach(function(pd, i){
    var active = (i===phase);
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--'+(active?'border2':'border3')+');' +
      'background:'+(active?'var(--bg2)':'transparent')+';' +
      'color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  html += '</div>';

  html += adalineScoreTrackerHTML(step, phase, 11);

  html += '<div class="card"><div class="ct">Pattern n='+step.p.n+' — Iteration '+step.iter+' ('+(step.pi+1)+'/'+cfg.train.length+')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">' +
    'x₁='+step.p.x1+', x₂='+step.p.x2+', d='+ds+'<br>' +
    'weights in: w₁='+afmtN(step.wb.w1)+'  w₂='+afmtN(step.wb.w2)+'  θ='+afmtN(step.wb.th)+
    '</div></div>';

  if(phase===0){
    // ── Phase 0: y* calculation and LMS error ─────────────────────────────
    html += '<div class="card"><div class="ct">Step 1 — Compute y* (linear activation)</div>' +
      '<div class="deriv">' +
      '<span style="color:var(--text3)">y* = w₁·x₁ + w₂·x₂ + θ</span>' +
      '<span style="color:var(--text3)">   = '+afmtN(step.wb.w1)+'·'+step.p.x1+' + '+afmtN(step.wb.w2)+'·'+step.p.x2+' + ('+afmtN(step.wb.th)+')</span>' +
      '<span style="color:var(--text3)">   = '+step.products.w1x1+' + '+step.products.w2x2+' + ('+afmtN(step.wb.th)+')</span>' +
      '<span style="font-weight:500">   y* = '+afmtD(step.ys)+'</span>' +
      '</div></div>';

    var errFmt = afmtD(step.err);
    var mseFmt = afmtD(step.mse);
    var errSign = step.err >= 0 ? '+' : '';
    html += '<div class="card"><div class="ct">Step 2 — LMS Error  e = d − y*</div>' +
      '<div class="deriv">' +
      '<span style="color:var(--text3)">e = d − y* = '+ds+' − ('+afmtD(step.ys)+')</span>' +
      '<span style="font-weight:500;color:var(--warn)">e = '+errSign+errFmt+'</span>' +
      '<span style="color:var(--text3);font-size:11px">MSE = ½·e² = ½·('+errFmt+')² = '+mseFmt+'</span>' +
      '</div>' +
      '<div style="margin-top:6px">';
    if(Math.abs(step.err) < 1e-6){
      html += '<span class="tag tok">e ≈ 0 — no correction needed</span>';
    } else {
      html += '<span class="tag tup">Update always applied (Adaline updates on every pattern)</span>';
    }
    html += '</div></div>';

  } else if(phase===1){
    // ── Phase 1: weight update ────────────────────────────────────────────
    var alpha = cfg.alpha;
    var errFmt = afmtD(step.err);
    html += '<div class="card"><div class="ct">Step 3 — Update: w = w + α·e·x  (α='+alpha+')</div>' +
      '<div class="deriv">' +
      '<span style="color:var(--text3)">w₁ = '+afmtN(step.wb.w1)+' + '+alpha+'·('+errFmt+')·'+step.p.x1+'</span>' +
      '<span style="color:var(--text3)">w₁ = '+afmtN(step.wb.w1)+' + ('+afmtD(step.dw1)+')</span>' +
      '<span><span class="hl">w₁ = '+afmtN(step.wa.w1)+'</span></span>' +
      '</div>' +
      '<div class="deriv" style="margin-top:6px">' +
      '<span style="color:var(--text3)">w₂ = '+afmtN(step.wb.w2)+' + '+alpha+'·('+errFmt+')·'+step.p.x2+'</span>' +
      '<span style="color:var(--text3)">w₂ = '+afmtN(step.wb.w2)+' + ('+afmtD(step.dw2)+')</span>' +
      '<span><span class="hl">w₂ = '+afmtN(step.wa.w2)+'</span></span>' +
      '</div>' +
      '<div class="deriv" style="margin-top:6px">' +
      '<span style="color:var(--text3)">θ  = '+afmtN(step.wb.th)+' + '+alpha+'·('+errFmt+')·1</span>' +
      '<span style="color:var(--text3)">θ  = '+afmtN(step.wb.th)+' + ('+afmtD(step.dth)+')</span>' +
      '<span><span class="hl">θ  = '+afmtN(step.wa.th)+'</span></span>' +
      '</div></div>';

    // weight summary after update
    html += '<div class="card" style="background:var(--bg2)"><div class="ct">Weights after update</div>' +
      '<div style="font-family:monospace;font-size:12px;line-height:2">' +
      'w₁ = <strong>'+afmtN(step.wa.w1)+'</strong> &nbsp; w₂ = <strong>'+afmtN(step.wa.w2)+'</strong> &nbsp; θ = <strong>'+afmtN(step.wa.th)+'</strong>' +
      '</div></div>';

  } else if(phase===2){
    // ── Phase 2: decision boundary ─────────────────────────────────────────
    var lineColor = '#6d28d9';
    html += '<div class="card" style="border-color:#c4b5fd">' +
      '<div class="ct" style="color:'+lineColor+'">Step 4 — Decision boundary  y* = 0</div>' +
      '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:4px">w₁='+afmtN(step.wa.w1)+'  w₂='+afmtN(step.wa.w2)+'  θ='+afmtN(step.wa.th)+'</div>' +
      '<div class="deriv">'+adalineLineDerivHTML(step.wa.w1, step.wa.w2, step.wa.th, lineColor, refX)+'</div>';
    if(step.wa.w2 !== 0){
      var sl  = afmtD(ar4(-step.wa.w1/step.wa.w2));
      var ic  = afmtD(ar4(-step.wa.th/step.wa.w2));
      html += '<div style="margin-top:6px"><span style="display:inline-block;padding:3px 10px;border-radius:5px;' +
        'font-family:monospace;font-size:12px;font-weight:500;background:var(--purple-bg);color:var(--purple);' +
        'border:0.5px solid #c4b5fd">x₂ = '+sl+'·x₁ '+asgn(parseFloat(ic))+ic+'</span></div>';
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text3)">'+
        '🟢 <strong>y* > 0</strong> (above line) → classified as +1 &nbsp;&nbsp; '+
        '🔴 <strong>y* &lt; 0</strong> (below line) → classified as −1</div>';
    }
    html += '</div>';
  }

  return html;
}

function adalineTestPanelHTML(exData) {
  var fw  = exData.finalW, cfg = exData.cfg;
  var trainSc = exData.steps[exData.steps.length-1].trainScore;
  var testAnnotated = exData.testAnnotated, testSc = exData.testScore;

  var html = '<div class="card"><div class="ct">🎯 Test phase — final weights after '+cfg.nIters+' iterations</div>';
  html += '<div style="font-family:monospace;font-size:12px;color:var(--text3);margin-bottom:10px">' +
    'w₁='+afmtN(fw.w1)+'  w₂='+afmtN(fw.w2)+'  θ='+afmtN(fw.th)+'</div>';

  // Training recap
  html += '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set ('+cfg.train.length+' vectors)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ '+trainSc.correct+'/'+cfg.train.length+'</span>' +
    '<span style="color:var(--warn)">✗ '+trainSc.errors+'/'+cfg.train.length+'</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:'+trainSc.pct+'%;height:100%;background:'+(trainSc.correct===cfg.train.length?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">'+trainSc.pct+'%</span></div></div>';

  // Test set
  if(testAnnotated.length > 0){
    html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test set ('+testAnnotated.length+' vectors)</div>';
    html += '<div style="display:grid;grid-template-columns:repeat('+Math.min(testAnnotated.length,4)+',1fr);gap:5px;margin-bottom:8px">';
    testAnnotated.forEach(function(p){
      var ds2 = (p.d===1)?'+1':'−1', ys2 = (p.y===1)?'+1':'−1';
      html += '<div class="test-cell '+(p.ok?'test-ok':'test-err')+'">' +
        '<div style="font-size:9px;font-weight:500;margin-bottom:2px">n='+p.n+'</div>' +
        '<div style="font-size:9px">('+p.x1+', '+p.x2+')</div>' +
        '<div style="font-size:9px">d='+ds2+'</div>' +
        '<div style="font-size:10px">y*='+afmtD(p.ys)+'</div>' +
        '<div style="font-size:10px">y='+ys2+'</div>' +
        '<div style="font-size:14px;line-height:1.4">'+(p.ok?'✓':'✗')+'</div>' +
        '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
      '<span style="color:var(--success);font-weight:500">✓ '+testSc.correct+'/'+testAnnotated.length+'</span>' +
      '<span style="color:var(--warn);font-weight:500">✗ '+testSc.errors+'/'+testAnnotated.length+'</span>' +
      '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
      '<div style="width:'+testSc.pct+'%;height:100%;background:'+(testSc.correct===testAnnotated.length?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>' +
      '<span style="color:var(--text3)">'+testSc.pct+'%</span></div>';
    if(testSc.correct===testAnnotated.length){
      html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All test vectors correctly classified!</div>';
    } else {
      html += '<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--warn-bg);color:var(--warn);font-size:12px">'+testSc.errors+' test vector'+(testSc.errors===1?'':'s')+' misclassified.</div>';
    }
  }
  html += '</div>';
  return html;
}
