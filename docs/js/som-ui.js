function som_phaseLabel(phase) {
  var html='<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  [['1','present pattern','b1'],['2','find winner','b2'],['3','update weights','b4']].forEach(function(pd,i){
    var active=i===phase;
    html+='<span style="font-size:10px;padding:2px 8px;border-radius:10px;border:0.5px solid var(--'+(active?'border2':'border3')+');background:'+(active?'var(--bg2)':'transparent')+';color:'+(active?'var(--text)':'var(--text3)')+';">'+pd[0]+'. '+pd[1]+'</span>';
  });
  return html+'</div>';
}

function som_buildPanel(step, phase, config) {
  var p=step.pattern, html=som_phaseLabel(phase);
  html+='<div class="card"><div class="ct">Pattern <strong>'+p.label+'</strong> — step '+(step.pi+1)+'/'+config.n_train+' — iter '+step.iter+'/'+config.n_iters+' — α='+step.alpha+' — radius='+step.radius+'</div>'+
    '<div style="font-family:monospace;font-size:12px;line-height:2;color:var(--text2)">x = ['+p.x.join(', ')+']</div></div>';

  if(phase===0){
    html+='<div class="card"><div class="ct">Step 1 \u2014 Present pattern to all neurons</div>';
    html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">d_i = \u03a3(x_j \u2212 w_ij)\u00b2 for each neuron i</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">neuron</th><th style="text-align:right;padding:2px 6px;font-weight:400">weights</th></tr></thead><tbody>';
    for(var i=0;i<step.weights_before.length;i++)
      html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">n'+(i+1)+' ('+config.positions[i].join(',')+')</td>'+
        '<td style="text-align:right;padding:2px 6px">['+step.weights_before[i].map(function(v){return Math.round(v*1e4)/1e4;}).join(', ')+']</td></tr>';
    html+='</tbody></table></div>';

  } else if(phase===1){
    html+='<div class="card"><div class="ct">Step 2 \u2014 Find winner (minimum distance)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400">neuron</th><th style="text-align:right;padding:3px 6px;font-weight:400">d_i</th><th style="padding:3px 6px;font-weight:400"></th></tr></thead><tbody>';
    for(var i=0;i<step.dists.length;i++){
      var isWin=i===step.winner;
      html+='<tr style="border-top:0.5px solid var(--border3)'+(isWin?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:3px 6px;color:var(--text3)">n'+(i+1)+' ('+config.positions[i].join(',')+')</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:'+(isWin?700:400)+';color:'+(isWin?'var(--warn)':'inherit')+'">'+step.dists[i].toFixed(4)+'</td>' +
        '<td style="padding:3px 6px">'+(isWin?'\u2190 winner \ud83c\udfc6':'')+'</td></tr>';
    }
    html+='</tbody></table>';
    html+='<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">Neighborhood (radius='+step.radius+'): '+step.neighbors.map(function(n){return 'n'+(n+1);}).join(', ')+'</div></div>';

  } else {
    html+='<div class="card"><div class="ct">Step 3 \u2014 Update winner + neighbors</div>';
    html+='<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">w_ij(new) = w_ij(old) + \u03b1\u00b7(x_j \u2212 w_ij(old))</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 4px;font-weight:400">n</th><th style="text-align:left;padding:2px 4px;font-weight:400">old</th><th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--info)">\u03b1\u00b7(x\u2212w)</th><th style="text-align:left;padding:2px 4px;font-weight:400;color:var(--warn)">new</th></tr></thead><tbody>';
    step.deltas.forEach(function(d){
      var isWin=d.neuron===step.winner;
      html+='<tr style="border-top:0.5px solid var(--border3)'+(isWin?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:2px 4px;color:var(--text3)">n'+(d.neuron+1)+(isWin?' \u2605':'')+'</td>' +
        '<td style="padding:2px 4px">['+d.old.join(', ')+']</td>' +
        '<td style="padding:2px 4px;color:var(--info)">['+d.delta.map(function(v){return v>=0?'+'+v:v;}).join(', ')+']</td>' +
        '<td style="padding:2px 4px;font-weight:600;color:var(--warn)">['+d.new.join(', ')+']</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}

function som_summaryPanel(exData) {
  var fw=exData.final_weights, cfg=exData.config, pos=SOM_EX.positions;
  var html='<div class="card"><div class="ct">\ud83c\udfaf Final map \u2014 SOM '+cfg.map_rows+'\u00d7'+cfg.map_cols+' \u00b7 \u03b1='+cfg.alpha+' \u00b7 '+cfg.n_iters+' iterations</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px;margin-bottom:14px">';
  html+='<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px;font-weight:400">neuron</th><th style="text-align:left;padding:2px 6px;font-weight:400">pos</th><th style="text-align:left;padding:2px 6px;font-weight:400">final weights</th></tr></thead><tbody>';
  for(var i=0;i<fw.length;i++)
    html+='<tr style="border-top:0.5px solid var(--border3)"><td style="padding:2px 6px;color:var(--text3)">n'+(i+1)+'</td><td style="padding:2px 6px;color:var(--text3)">('+pos[i].join(',')+')</td><td style="padding:2px 6px">['+fw[i].map(function(v){return Math.round(v*1e4)/1e4;}).join(', ')+']</td></tr>';
  html+='</tbody></table>';
  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Training patterns \u2192 winner neurons:</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  exData.train_final.forEach(function(r){
    html+='<div style="padding:4px 10px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border2);font-family:monospace;font-size:11px"><strong>'+r.label+'</strong> \u2192 n'+(r.winner+1)+' ('+r.pos.join(',')+')</div>';
  });
  html+='</div>';
  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Test patterns \u2192 winner neurons:</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
  exData.test_results.forEach(function(r){
    html+='<div style="padding:4px 10px;border-radius:6px;background:var(--info-bg);border:0.5px solid var(--info);font-family:monospace;font-size:11px;color:var(--info)"><strong>'+r.label+'</strong> \u2192 n'+(r.winner+1)+' ('+r.pos.join(',')+')</div>';
  });
  html+='</div></div>';
  return html;
}
