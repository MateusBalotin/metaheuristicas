// pso-ui.js

var PSO_COLORS = ['#4a9eff','#EF9F27','#5DCAA5','#c084fc'];

function PsoCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

PsoCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

PsoCanvas.prototype.draw = function(exData, step) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD_L = 40, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  var W = CW - PAD_L - PAD_R, H = CH - PAD_T - PAD_B;

  var xArr = exData.x_curve, yArr = exData.y_curve;
  var xMin = PSO_X_MIN, xMax = PSO_X_MAX;
  var yMin = Math.min.apply(null, yArr) - 0.3;
  var yMax = Math.max.apply(null, yArr) + 0.3;

  function px(x){ return PAD_L + (x-xMin)/(xMax-xMin)*W; }
  function py(y){ return PAD_T + (yMax-y)/(yMax-yMin)*H; }

  // Axes
  ctx.strokeStyle = dk?'#3a3a36':'#c8c6c0'; ctx.lineWidth=0.5;
  ctx.beginPath();
  ctx.moveTo(PAD_L,PAD_T); ctx.lineTo(PAD_L,PAD_T+H);
  ctx.moveTo(PAD_L,PAD_T+H); ctx.lineTo(PAD_L+W,PAD_T+H);
  ctx.stroke();
  // x=0 axis
  var y0 = py(0);
  if (y0 >= PAD_T && y0 <= PAD_T+H) {
    ctx.beginPath(); ctx.moveTo(PAD_L, y0); ctx.lineTo(PAD_L+W, y0);
    ctx.strokeStyle = dk?'#3a3a36':'#d0cec8'; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
  }
  // Tick labels
  ctx.fillStyle = dk?'#888780':'#888780'; ctx.font='9px monospace'; ctx.textAlign='center';
  [-4,-2,0,2,4,6,8,10,12].forEach(function(x){
    var bx=px(x);
    if(bx>=PAD_L&&bx<=PAD_L+W){ ctx.fillText(x, bx, PAD_T+H+12); }
  });
  ctx.textAlign='right';
  [-1,0,1,2,3].forEach(function(y){
    var by=py(y);
    if(by>=PAD_T&&by<=PAD_T+H){ ctx.fillText(y, PAD_L-4, by+3); }
  });

  // Function curve
  ctx.save();
  ctx.strokeStyle = dk?'rgba(74,158,255,0.6)':'rgba(24,95,165,0.5)';
  ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(px(xArr[0]), py(yArr[0]));
  for (var i=1;i<xArr.length;i++) ctx.lineTo(px(xArr[i]), py(yArr[i]));
  ctx.stroke();
  ctx.restore();

  // gbest vertical line
  var gbest = step ? step.gbest_after : exData.final_gbest;
  ctx.save();
  ctx.strokeStyle = 'rgba(95,205,100,0.6)'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(px(gbest),PAD_T); ctx.lineTo(px(gbest),PAD_T+H); ctx.stroke();
  ctx.restore();

  // Determine particle positions
  var positions = [];
  if (!step) {
    // Final state: use last step's x_new
    var lastStep = exData.steps[exData.steps.length-1];
    lastStep.particles.forEach(function(ps) {
      positions.push({id:ps.id, x:ps.x_new, pbest:ps.pbest_new, isChanged:false});
    });
  } else {
    step.particles.forEach(function(ps) {
      positions.push({id:ps.id, x:ps.x_new, pbest:ps.pbest_new, isChanged:ps.pbest_updated});
    });
  }

  // Draw pbest markers
  positions.forEach(function(pos, i) {
    var bx = px(pos.pbest), by = py(pso_f(pos.pbest));
    ctx.save();
    ctx.strokeStyle = PSO_COLORS[i]; ctx.lineWidth=1; ctx.setLineDash([2,2]);
    ctx.beginPath(); ctx.moveTo(bx, PAD_T); ctx.lineTo(bx, PAD_T+H); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, 2*Math.PI);
    ctx.strokeStyle = PSO_COLORS[i]; ctx.lineWidth=1.5; ctx.fillStyle='transparent';
    ctx.stroke();
  });

  // Draw current particle positions
  positions.forEach(function(pos, i) {
    var bx=px(pos.x), by=py(pso_f(pos.x));
    ctx.beginPath(); ctx.arc(bx, by, 6, 0, 2*Math.PI);
    ctx.fillStyle = PSO_COLORS[i];
    ctx.fill();
    ctx.fillStyle = dk?'#1a1a18':'#fff';
    ctx.font='bold 8px sans-serif'; ctx.textAlign='center';
    ctx.fillText(pos.id, bx, by+3);
  });

  // Labels
  ctx.fillStyle = dk?'#888780':'#666';
  ctx.font='10px sans-serif'; ctx.textAlign='left';
  ctx.fillText('f(x) = cos(x) + x/5', PAD_L+4, PAD_T+12);
  ctx.fillStyle = 'rgba(95,205,100,0.8)';
  ctx.fillText('gbest='+gbest.toFixed(4), PAD_L+4, PAD_T+H-6);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function pso_phaseLabel(phase) {
  var labels=[['1','calcular fitness','b1'],['2','atualizar pbest/gbest','b2'],['3','atualizar v e x','b4']];
  var html='<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  labels.forEach(function(pd,i){
    var active=i===phase;
    html+='<span style="font-size:10px;padding:2px 8px;border-radius:10px;'+
      'border:0.5px solid var(--'+(active?'border2':'border3')+');'+
      'background:'+(active?'var(--bg2)':'transparent')+';'+
      'color:'+(active?'var(--text)':'var(--text3)')+';">'+
      pd[0]+'. '+pd[1]+'</span>';
  });
  return html+'</div>';
}

// ── Panel builders ────────────────────────────────────────────────────────────
function buildPsoPanel(step, phase, cfg) {
  var html = pso_phaseLabel(phase);

  html += '<div class="card"><div class="ct">Iteração ' + step.iter + ' / ' + cfg.n_iters +
    ' &nbsp;|&nbsp; gbest=' + step.gbest_before.toFixed(4) +
    ' &nbsp;|&nbsp; f=' + pso_f(step.gbest_before).toFixed(6) + '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Calcular f(x) de cada partícula</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:3px 6px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">x</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">v</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">pbest</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">f(x)</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps,i) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 6px;color:'+PSO_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="text-align:right;padding:3px 6px">'+ps.x_before.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:3px 6px">'+ps.v_before.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:3px 6px">'+ps.pbest_before.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:600">'+pso_f(ps.x_before).toFixed(6)+'</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Atualizar pbest e gbest</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'pbest: manter se f(x_new) ≥ f(pbest), atualizar se f(x_new) &lt; f(pbest)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:3px 6px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">f(x_new)</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">f(pbest)</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right;color:var(--warn)">novo pbest</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps,i) {
      var updated = ps.pbest_updated;
      html += '<tr style="border-top:0.5px solid var(--border3)'+(updated?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:3px 6px;color:'+PSO_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="text-align:right;padding:3px 6px">'+ps.fit_new.toFixed(6)+'</td>' +
        '<td style="text-align:right;padding:3px 6px">'+pso_f(ps.pbest_before).toFixed(6)+'</td>' +
        '<td style="text-align:right;padding:3px 6px;font-weight:'+(updated?700:400)+';color:'+(updated?'var(--warn)':'inherit')+'">'+
          ps.pbest_new.toFixed(4)+(updated?' ✓':'')+'</td></tr>';
    });
    html += '</tbody></table>';
    if (step.gbest_updated) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);'+
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">'+
        '🏆 gbest atualizado: '+step.gbest_before.toFixed(4)+' → '+step.gbest_after.toFixed(4)+
        '  f='+step.gbest_fit.toFixed(6)+'</div>';
    } else {
      html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">'+
        'gbest mantido: '+step.gbest_after.toFixed(4)+'  f='+step.gbest_fit.toFixed(6)+'</div>';
    }
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar velocidade e posição</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'v = w·v + η₁·(pbest−x) + η₂·(gbest−x) &nbsp;|&nbsp; x = x + v</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">'+
      '<th style="padding:2px 5px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">w·v</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">η₁·(pb−x)</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">η₂·(gb−x)</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right;color:var(--warn)">v_new</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right;color:var(--warn)">x_new</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps,i) {
      var wv  = pso_r6(cfg.w * ps.v_before);
      var c1  = pso_r6(cfg.n1 * (ps.pbest_before - ps.x_before));
      var c2  = pso_r6(cfg.n2 * (step.gbest_before - ps.x_before));
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 5px;color:'+PSO_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="text-align:right;padding:2px 5px">'+wv.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:2px 5px">'+c1.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:2px 5px">'+c2.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">'+ps.v_new.toFixed(4)+'</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:600;color:var(--warn)">'+ps.x_new.toFixed(4)+'</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildPsoSummaryPanel(exData) {
  var gbest = exData.final_gbest;
  var html = '<div class="card"><div class="ct">🏆 Resultado final — PSO · ' +
    exData.config.n_iters + ' iterações · w=' + exData.config.w +
    ' η₁=' + exData.config.n1 + ' η₂=' + exData.config.n2 + '</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);'+
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">' +
    'gbest = <strong>' + gbest.toFixed(6) + '</strong>' +
    ' &nbsp;|&nbsp; f(gbest) = <strong>' + exData.final_gbest_fit.toFixed(6) + '</strong></div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico gbest:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">'+
    '<th style="padding:2px 5px;font-weight:400;text-align:left">iter</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">gbest</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">f(gbest)</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:center">atualizado?</th>'+
    '</tr></thead><tbody>';
  exData.steps.forEach(function(s) {
    html += '<tr style="border-top:0.5px solid var(--border3)'+(s.gbest_updated?';background:var(--success-bg)':'')+'">' +
      '<td style="padding:2px 5px;color:var(--text3)">'+s.iter+'</td>' +
      '<td style="text-align:right;padding:2px 5px;'+(s.gbest_updated?'font-weight:700;color:var(--success)':'')+'">'+s.gbest_after.toFixed(6)+'</td>' +
      '<td style="text-align:right;padding:2px 5px;'+(s.gbest_updated?'font-weight:700;color:var(--success)':'')+'">'+s.gbest_fit.toFixed(6)+'</td>' +
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">'+(s.gbest_updated?'✓':'')+'</td></tr>';
  });
  html += '</tbody></table>';

  html += '<div style="margin-top:12px;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Estado final das partículas:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">'+
    '<th style="padding:2px 5px;font-weight:400;text-align:left">P</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">x final</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">v final</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">pbest</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">f(pbest)</th>'+
    '</tr></thead><tbody>';
  var last = exData.steps[exData.steps.length-1];
  last.particles.forEach(function(ps,i) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:'+PSO_COLORS[i]+'">P'+ps.id+'</td>' +
      '<td style="text-align:right;padding:2px 5px">'+ps.x_new.toFixed(4)+'</td>' +
      '<td style="text-align:right;padding:2px 5px">'+ps.v_new.toFixed(4)+'</td>' +
      '<td style="text-align:right;padding:2px 5px">'+ps.pbest_new.toFixed(4)+'</td>' +
      '<td style="text-align:right;padding:2px 5px">'+ps.pbest_fit_new.toFixed(6)+'</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
