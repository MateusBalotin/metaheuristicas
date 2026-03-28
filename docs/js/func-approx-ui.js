function fa_mseBarHTML(step, phase) {
  var mse=step.mseTrain, lbl=phase===0?'Before update':'After update';
  var pct=Math.max(0,Math.min(100,100*(1-mse/10)));
  var q=mse<0.01?'excellent':mse<0.5?'good':mse<2?'converging':'high error';
  return '<div class="card" style="margin-bottom:8px"><div class="ct">Training MSE \u2014 '+lbl+'</div>' +
    '<div style="display:flex;align-items:center;gap:10px;font-family:monospace;font-size:12px;margin-top:4px">' +
    '<span style="color:var(--text2)">MSE = <strong>'+fa_fmt(mse)+'</strong></span>' +
    '<div style="flex:1;min-width:60px;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">' +
    '<div style="width:'+pct+'%;height:100%;background:'+(mse<0.01?'var(--success)':mse<1?'var(--warn)':'#dc2626')+';border-radius:4px"></div></div>' +
    '<span style="color:var(--text3)">'+q+'</span>' +
    '</div></div>';
}

function fa_buildPanel(step, phase) {
  var fwd=step.fwd, nH=step.wsBefore.W.length, d=step.p.d, x1=step.p.x1;
  var html='';

  var phases=[['1','forward pass','b1'],['2','output update','b2'],['3','hidden update','b4']];
  html+='<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  phases.forEach(function(pd,i){
    var active=i===phase;
    html+='<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  html+='</div>';
  html+=fa_mseBarHTML(step,phase);
  html+='<div class="card"><div class="ct">Pattern n='+step.p.n+' \u2014 Iteration '+step.iter+' ('+(step.pi+1)+'/'+FUNC_APPROX_EX.train.length+')</div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2">x = '+x1+' &nbsp; d = '+d+'</div></div>';

  if(phase===0){
    var ws=step.wsBefore;
    html+='<div class="card"><div class="ct">Step 1 \u2014 Hidden layer  z* = v·x + θa  →  z = σ(z*)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">v<sub>j1</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">θa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z*<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">z<sub>j</sub></th></tr></thead><tbody>';
    for(var j=0;j<nH;j++)
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt4(ws.V[j][0])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt4(ws.thetaA[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text2)">'+fa_fmt(fwd.zStar[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fa_fmt(fwd.z[j])+'</td></tr>';
    html+='</tbody></table></div>';

    var ws0=step.wsBefore, wsum=0;
    html+='<div class="card"><div class="ct">Step 2 \u2014 Output (linear)  y = Σw·z + θb</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w·z</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var c=Math.round(ws0.W[j]*fwd.z[j]*1e6)/1e6; wsum+=c;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt4(ws0.W[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt(fwd.z[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt(c)+'</td></tr>';
    }
    html+='<tr style="border-top:1px solid var(--border2)"><td colspan="3" style="padding:3px 4px;color:var(--text3);font-size:10px">θb = '+fa_fmt4(ws0.thetaB)+'</td>' +
      '<td style="text-align:right;padding:3px 4px;color:var(--text3)">'+fa_fmt4(ws0.thetaB)+'</td></tr></tbody></table>';
    html+='<div class="deriv"><span style="color:var(--text3)">y = '+Math.round(wsum*1e6)/1e6+' + ('+fa_fmt4(ws0.thetaB)+')</span>' +
      '<span style="font-weight:500">y = <span style="color:var(--warn)">'+fa_fmt(fwd.y)+'</span>  &nbsp; d = '+d+'  &nbsp; error = '+fa_fmt(step.dOut)+'</span>' +
      '<span style="color:var(--text3)">MSE(pattern) = \u00bd(d\u2212y)\u00b2 = '+fa_fmt(step.msePat)+'</span></div></div>';

  } else if(phase===1){
    var dOut=step.dOut, wb=step.wsBefore, wa=step.wsAfter;
    html+='<div class="card"><div class="ct">Step 3 \u2014 Output error  δ_out = d − y  (linear output)</div>';
    html+='<div class="deriv"><span style="color:var(--text3)">\u03b4_out = '+d+' \u2212 '+fa_fmt(fwd.y)+'</span>' +
      '<span style="font-weight:500;color:var(--warn)">\u03b4_out = '+fa_fmt(dOut)+'</span></div></div>';
    html+='<div class="card"><div class="ct">Output weight update  Δw<sub>j</sub> = α·δ_out·z<sub>j</sub></div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">z<sub>j</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">Δw<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">w<sub>j</sub>′</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++)
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt(fwd.z[j])+'</td><td style="text-align:right;padding:3px 4px">'+fa_fmtS(step.dW[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;color:var(--text3)">'+fa_fmt4(wb.W[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fa_fmt4(wa.W[j])+'</td></tr>';
    html+='</tbody></table>';
    html+='<div style="font-family:monospace;font-size:11px;margin-top:6px;color:var(--text3)">Δθb = '+fa_fmtS(step.dThetaB)+'  →  <span style="color:var(--warn);font-weight:500">θb = '+fa_fmt4(wa.thetaB)+'</span></div></div>';

  } else if(phase===2){
    var wb=step.wsBefore, wa=step.wsAfter;
    html+='<div class="card"><div class="ct">Step 4 \u2014 δ_j = δ_out · w_j · z_j(1−z_j)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">w<sub>j</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">z(1−z)</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">δ<sub>j</sub></th></tr></thead><tbody>';
    for(var j=0;j<nH;j++){
      var zj=fwd.z[j], zp=Math.round(zj*(1-zj)*1e6)/1e6;
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmt4(wb.W[j])+'</td><td style="text-align:right;padding:3px 4px">'+fa_fmt(zp)+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fa_fmt(step.deltaH[j])+'</td></tr>';
    }
    html+='</tbody></table></div>';
    html+='<div class="card"><div class="ct">Hidden weight update  Δv<sub>j1</sub> = α·δ<sub>j</sub>·x</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">j</th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400">Δv<sub>j1</sub></th><th style="text-align:right;padding:2px 4px;font-weight:400">Δθa<sub>j</sub></th>' +
      '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">v<sub>j1</sub>′</th><th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">θa<sub>j</sub>′</th></tr></thead><tbody>';
    for(var j=0;j<nH;j++)
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 4px;color:var(--text3)">'+(j+1)+'</td>' +
        '<td style="text-align:right;padding:3px 4px">'+fa_fmtS(step.dV[j][0])+'</td><td style="text-align:right;padding:3px 4px">'+fa_fmtS(step.dThetaA[j])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fa_fmt4(wa.V[j][0])+'</td>' +
        '<td style="text-align:right;padding:3px 4px;font-weight:500;color:var(--warn)">'+fa_fmt4(wa.thetaA[j])+'</td></tr>';
    html+='</tbody></table></div>';
  }
  return html;
}

function fa_testPanelHTML(exData) {
  var fw=exData.finalWs, nH=exData.nHidden;
  var html='<div class="card"><div class="ct">🎯 Final results \u2014 '+exData.nIters+' iterations · '+nH+' hidden neurons · α='+exData.alpha+'</div>';
  html+='<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Final MSE: <strong style="color:'+(fa_mseTrain2(fw)<0.05?'var(--success)':'var(--warn)')+'">'+fa_fmt(fa_mseTrain2(fw))+'</strong></div>';
  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Final weights \u2014 hidden layer</div>';
  html+='<table style="border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:8px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 6px;font-weight:400">j</th><th style="padding:2px 6px;font-weight:400">v<sub>j1</sub></th><th style="padding:2px 6px;font-weight:400">θa<sub>j</sub></th></tr></thead><tbody>';
  for(var j=0;j<nH;j++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">'+(j+1)+'</td><td style="padding:2px 6px">'+fa_fmt4(fw.V[j][0])+'</td><td style="padding:2px 6px">'+fa_fmt4(fw.thetaA[j])+'</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:12px">W = ['+fw.W.map(fa_fmt4).join(', ')+'] &nbsp; θb = '+fa_fmt4(fw.thetaB)+'</div>';
  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Fit quality \u2014 all 13 points</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 4px;font-weight:400">n</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400">x</th><th style="text-align:right;padding:2px 4px;font-weight:400">d</th>' +
    '<th style="text-align:right;padding:2px 4px;font-weight:400;color:var(--warn)">y</th><th style="text-align:right;padding:2px 4px;font-weight:400">|err|</th></tr></thead><tbody>';
  FUNC_APPROX_EX.train.forEach(function(p){
    var y=fa_forward(p.x1,fw).y, err=Math.abs(y-p.d);
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 4px;color:var(--text3)">'+p.n+'</td>' +
      '<td style="text-align:right;padding:2px 4px">'+p.x1+'</td><td style="text-align:right;padding:2px 4px">'+p.d+'</td>' +
      '<td style="text-align:right;padding:2px 4px;font-weight:500;color:var(--warn)">'+fa_fmt4(Math.round(y*1e4)/1e4)+'</td>' +
      '<td style="text-align:right;padding:2px 4px;color:'+(err<0.1?'var(--success)':'var(--warn)')+'">'+fa_fmt4(Math.round(err*1e4)/1e4)+'</td></tr>';
  });
  html+='</tbody></table></div>'; return html;
}

function fa_mseTrain2(ws){
  var t=FUNC_APPROX_EX.train, s=0;
  for(var i=0;i<t.length;i++) s+=Math.pow(fa_forward(t[i].x1,ws).y-t[i].d,2);
  return fa_r6(s/t.length);
}
