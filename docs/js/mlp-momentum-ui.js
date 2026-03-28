function mScoreTrackerHTML(step, phase) {
  var results=phase===0?mEvalAll(MOMENTUM_EX.train,step.wsBefore):step.trainResults;
  var sc=mScore(results), n=results.length;
  var wlbl=phase===0?'Before update':'After update';
  var html='<div class="card" style="margin-bottom:8px">';
  html+='<div class="ct">All '+n+' patterns \u2014 '+wlbl+'</div>';
  html+='<div style="display:grid;grid-template-columns:repeat('+n+',1fr);gap:3px;margin-bottom:6px">';
  for(var i=0;i<n;i++){
    var r=results[i], isCur=i===step.pi;
    html+='<div class="sc-cell '+(r.ok?'sc-ok':'sc-err')+(isCur?' sc-cur':'')+'">' +
      '<div style="font-size:8px">'+MOMENTUM_EX.train[i].label+'</div>' +
      '<div style="font-size:11px;line-height:1.2">'+(r.ok?'✓':'✗')+'</div></div>';
  }
  html+='</div>';
  html+='<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">';
  html+='<span style="color:var(--success);font-weight:500">✓ '+sc.correct+'/'+n+'</span>';
  html+='<span style="color:var(--warn);font-weight:500">✗ '+sc.errors+'/'+n+'</span>';
  html+='<div style="flex:1;min-width:40px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:'+sc.pct+'%;height:100%;background:'+(sc.correct===n?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>';
  html+='<span style="color:var(--text3)">'+sc.pct+'%</span></div>';
  if(sc.correct===n) html+='<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All correct!</div>';
  html+='</div>'; return html;
}

function mBuildPanel(step, phase, gamma) {
  var fwd=step.fwd, nH=step.wsBefore.W.length;
  var d=step.p.d, ds=String(d);
  var lbl=step.p.label||('n='+step.p.n);
  var html='';

  var phases=[['1','forward pass','b1'],['2','output update','b2'],['3','hidden update','b4']];
  html+='<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd,i){
    var active=i===phase;
    html+='<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  html+='</div>';
  html+=mScoreTrackerHTML(step,phase);

  html+='<div class="card"><div class="ct">Pattern '+lbl+' (n='+step.p.n+') \u2014 Iteration '+step.iter+' ('+(step.pi+1)+'/'+MOMENTUM_EX.train.length+')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">x\u2081='+step.p.x1+'  x\u2082='+step.p.x2+'  d='+ds+'</div></div>';

  if(phase===0){
    var ws=step.wsBefore;
    html+='<div class="card"><div class="ct">Step 1 \u2014 Hidden layer  z* = Σv·x + θa  →  z = σ(z*)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j2</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">θa<sub>j</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">z<sub>j</sub></th></tr></thead><tbody>';
    for(var j=0;j<nH;j++)
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt4(ws.V[j][0])+'</td><td style="text-align:right;padding:3px 4px">'+mfmt4(ws.V[j][1])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt4(ws.thetaA[j])+'</td><td style="text-align:right;padding:3px 4px;color:var(--text2)">'+mfmt(fwd.zStar[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+mfmt(fwd.z[j])+'</td></tr>';
    html+='</tbody></table></div>';

    var ws0=step.wsBefore, wsum=0;
    html+='<div class="card"><div class="ct">Step 2 \u2014 Output  y* = Σw·z + θb  →  y = σ(y*)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w·z</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var c=Math.round(ws0.W[j]*fwd.z[j]*1e6)/1e6; wsum+=c;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt4(ws0.W[j])+'</td><td style="text-align:right;padding:3px 4px">'+mfmt(fwd.z[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt(c)+'</td></tr>';
    }
    html+='<tr style="border-top:1px solid var(--border2)"><td colspan="3" style="padding:3px 4px;color:var(--text3);font-size:10px">θb = '+mfmt4(ws0.thetaB)+'</td>' +
      '<td style="text-align:right;padding:3px 4px;color:var(--text3)">'+mfmt4(ws0.thetaB)+'</td></tr></tbody></table>';
    var yClass=fwd.y>=0.5?1:0;
    html+='<div class="deriv"><span style="color:var(--text3)">y* = '+Math.round(wsum*1e6)/1e6+' + ('+mfmt4(ws0.thetaB)+') = '+mfmt(fwd.yStar)+'</span>' +
      '<span style="font-weight:500">y = σ('+mfmt(fwd.yStar)+') = <span style="color:var(--warn)">'+mfmt(fwd.y)+'</span>' +
      ' → '+(fwd.y>=0.5?'Class A (1)':'Class B (0)')+' (d='+ds+(yClass===d?' ✓':' ✗')+')</span></div></div>';

  } else if(phase===1){
    var y=fwd.y, dOut=step.dOut, wb=step.wsBefore, wa=step.wsAfter, gam=gamma||0.6;
    html+='<div class="card"><div class="ct">Step 3 \u2014 δ_out = y(1−y)(d−y)</div>';
    html+='<div class="deriv"><span style="color:var(--text3)">δ_out = '+mfmt(y)+'·(1−'+mfmt(y)+')·('+ds+'−'+mfmt(y)+')</span>' +
      '<span style="font-weight:500;color:var(--warn)">δ_out = '+mfmt(dOut)+'</span></div></div>';

    html+='<div class="card"><div class="ct">Output weight update with momentum γ='+gam+'</div>';
    html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:6px">Δw<sub>j</sub> = α·δ_out·z<sub>j</sub> + γ·Δw<sub>j</sub><sup>prev</sup></div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">α·δ·z</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--info)">γ·Δw<sup>prev</sup></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δw</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w′</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var stdT=Math.round(1.0*dOut*fwd.z[j]*1e6)/1e6;
      var momT=Math.round(gam*step.prevDws.W[j]*1e6)/1e6;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmtS(stdT)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--info)">'+mfmtS(momT)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500">'+mfmtS(step.dW[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">'+mfmt4(wb.W[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+mfmt4(wa.W[j])+'</td></tr>';
    }
    html+='</tbody></table>';
    var stdTb=Math.round(1.0*dOut*1e6)/1e6, momTb=Math.round(gam*step.prevDws.thetaB*1e6)/1e6;
    html+='<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">Δθb = '+mfmtS(stdTb)+' + '+mfmtS(momTb)+' = '+mfmtS(step.dThetaB)+'  →  <span style="color:var(--warn);font-weight:500">θb = '+mfmt4(wa.thetaB)+'</span></div></div>';

  } else if(phase===2){
    var wb=step.wsBefore, wa=step.wsAfter, gam=gamma||0.6;
    html+='<div class="card"><div class="ct">Step 4 \u2014 δ_j = δ_out · w_j · z_j(1−z_j)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z(1−z)</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">δ<sub>j</sub></th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var zj=fwd.z[j], zp=Math.round(zj*(1-zj)*1e6)/1e6;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt4(wb.W[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmt(zp)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+mfmt(step.deltaH[j])+'</td></tr>';
    }
    html+='</tbody></table></div>';

    html+='<div class="card"><div class="ct">Hidden weight update with momentum γ='+gam+'</div>';
    html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:6px">Δv<sub>ij</sub> = α·δ<sub>j</sub>·x<sub>i</sub> + γ·Δv<sub>ij</sub><sup>prev</sup></div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">α·δ·x₁</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--info)">γ·Δv<sup>prev</sup></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δθa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>′</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">θa<sub>j</sub>′</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var stdV=Math.round(1.0*step.deltaH[j]*step.p.x1*1e6)/1e6;
      var momV=Math.round(gam*step.prevDws.V[j][0]*1e6)/1e6;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmtS(stdV)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--info)">'+mfmtS(momV)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500">'+mfmtS(step.dV[j][0])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+mfmtS(step.dThetaA[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+mfmt4(wa.V[j][0])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+mfmt4(wa.thetaA[j])+'</td></tr>';
    }
    html+='</tbody></table></div>';
  }
  return html;
}

function mTestPanelHTML(exData) {
  var fw=exData.finalWs, nH=fw.W.length;
  var lastSc=exData.steps[exData.steps.length-1].trainScore;
  var html='<div class="card"><div class="ct">🎯 Final results \u2014 '+MOMENTUM_EX.nIters+' iterations · '+nH+' hidden · α='+MOMENTUM_EX.alpha+' · γ='+exData.gamma+'</div>';
  html+='<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Final weights \u2014 hidden layer V</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:4px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 6px;font-weight:400">j</th><th style="padding:2px 6px;font-weight:400">v<sub>j1</sub></th><th style="padding:2px 6px;font-weight:400">v<sub>j2</sub></th><th style="padding:2px 6px;font-weight:400">θa<sub>j</sub></th></tr></thead><tbody>';
  for(var j=0;j<nH;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j+1)+'</td><td style="padding:2px 6px">'+mfmt4(fw.V[j][0])+'</td><td style="padding:2px 6px">'+mfmt4(fw.V[j][1])+'</td><td style="padding:2px 6px">'+mfmt4(fw.thetaA[j])+'</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-top:4px">W = ['+fw.W.map(mfmt4).join(', ')+'] &nbsp; θb = '+mfmt4(fw.thetaB)+'</div></div>';
  html+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Training set (5 patterns)</div>';
  html+='<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px">' +
    '<span style="color:var(--success)">✓ '+lastSc.correct+'/5</span>' +
    '<span style="color:var(--warn)">✗ '+lastSc.errors+'/5</span>' +
    '<div style="flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="width:'+lastSc.pct+'%;height:100%;background:'+(lastSc.correct===5?'var(--success)':'var(--warn)')+';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">'+lastSc.pct+'%</span></div>';
  if(lastSc.correct===5) html+='<div style="margin-top:8px;padding:5px 10px;border-radius:6px;background:var(--success-bg);color:var(--success);font-size:12px;font-weight:500">✓ All patterns correctly classified!</div>';
  html+='</div></div>'; return html;
}
