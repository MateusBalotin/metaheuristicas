// simulated-annealing-ui.js

var SA_COLORS = {
  current: '#4a9eff',
  best:    '#5DCAA5',
  new:     '#EF9F27',
  city:    '#e8e6de',
};

function SaCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

SaCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

SaCanvas.prototype.draw = function(exData, step, phase) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 28;
  var W = CW - 2*PAD, H = CH - 2*PAD;

  // Find coordinate bounds
  var coords = exData.cities;
  var xs = Object.values(coords).map(function(c){return c[0];});
  var ys = Object.values(coords).map(function(c){return c[1];});
  var xMin=Math.min.apply(null,xs)-0.5, xMax=Math.max.apply(null,xs)+0.5;
  var yMin=Math.min.apply(null,ys)-0.5, yMax=Math.max.apply(null,ys)+0.5;

  function px(x){ return PAD + (x-xMin)/(xMax-xMin)*W; }
  function py(y){ return CH - PAD - (y-yMin)/(yMax-yMin)*H; }

  // Determine which tour to show
  var currentTour = step ? step.S_before : exData.best_tour;
  var newTour     = null;
  var bestTour    = step ? step.best_tour : exData.best_tour;
  var movedCities = [];

  if (step && phase >= 1 && step.tries.length) {
    var lastTry = step.tries[phase === 1 ? 0 : step.tries.length - 1];
    if (phase >= 2 && step.nsucess > 0) {
      currentTour = step.S_after;
    }
    if (phase === 1) {
      newTour = lastTry.tour;
      movedCities = lastTry.cities;
    }
  }

  function drawTour(tour, color, dash, width) {
    if (!tour || !tour.length) return;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width||1.5;
    ctx.setLineDash(dash||[]);
    ctx.beginPath();
    var n = tour.length;
    ctx.moveTo(px(coords[tour[0]][0]), py(coords[tour[0]][1]));
    for (var i=1; i<n; i++) ctx.lineTo(px(coords[tour[i]][0]), py(coords[tour[i]][1]));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Draw best tour (green dashed)
  if (step && step.best_tour) drawTour(bestTour, dk?'rgba(93,202,165,0.4)':'rgba(45,158,120,0.3)', [4,4], 1);
  // Draw new candidate (orange dashed)
  if (newTour) drawTour(newTour, 'rgba(239,159,39,0.7)', [3,3], 1.5);
  // Draw current tour (blue solid)
  drawTour(currentTour, dk?'rgba(74,158,255,0.85)':'rgba(58,127,212,0.8)', [], 2);

  // Draw cities
  exData.names.forEach(function(name) {
    var cx = px(coords[name][0]), cy = py(coords[name][1]);
    var isMoved = movedCities.indexOf(name) >= 0;
    var r = isMoved ? 8 : 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
    ctx.fillStyle = isMoved ? '#EF9F27' : (dk?'#3a3a36':'#fff');
    ctx.fill();
    ctx.strokeStyle = isMoved ? '#EF9F27' : (dk?'#4a9eff':'#3a7fd4');
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = isMoved ? '#fff' : (dk?'#e8e6de':'#1a1a18');
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(name, cx, cy + 3);
  });

  // Cost labels
  var curCost = sa_tc(currentTour);
  var bstCost = sa_tc(bestTour);
  ctx.font = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = dk?'rgba(74,158,255,0.9)':'#3a7fd4';
  ctx.fillText('atual: ' + curCost.toFixed(4), PAD, CH - 4);
  ctx.fillStyle = dk?'rgba(93,202,165,0.9)':'#2d9e78';
  ctx.textAlign = 'right';
  ctx.fillText('best: ' + bstCost.toFixed(4), CW - PAD, CH - 4);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function sa_phaseLabel(phase) {
  var labels=[['1','gerar vizinha','b1'],['2','calcular ΔE e aceitar','b2'],['3','atualizar T','b4']];
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
function buildSaPanel(step, phase, cfg) {
  var html = sa_phaseLabel(phase);

  var sBefore = step.S_before.join('→')+'→'+step.S_before[0];
  html += '<div class="card"><div class="ct">Iteração '+step.iter+
    ' &nbsp;|&nbsp; T='+step.T.toFixed(4)+
    ' &nbsp;|&nbsp; custo atual: <strong>'+step.cost_before.toFixed(4)+'</strong>'+
    ' &nbsp;|&nbsp; best: <strong>'+step.best_cost.toFixed(4)+'</strong></div>'+
    '<div style="font-family:monospace;font-size:11px;color:var(--text2);margin-top:4px">'+
    'S: '+sBefore+'</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Gerar soluções vizinhas (2-opt, até V='+cfg.V+')</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'Troca segmentos i e j da rota atual. Tentar até '+cfg.V+' vizinhos ou nsucess='+cfg.L+'.</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">'+
      '<th style="padding:3px 6px;font-weight:400;text-align:left">tentativa</th>'+
      '<th style="padding:3px 6px;font-weight:400">swap</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:left">nova rota</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">custo</th>'+
      '</tr></thead><tbody>';
    step.tries.forEach(function(t) {
      html += '<tr style="border-top:0.5px solid var(--border3)">'+
        '<td style="padding:3px 6px;color:var(--text3)">#'+t.try_n+'</td>'+
        '<td style="padding:3px 6px;text-align:center">'+t.cities[0]+'↔'+t.cities[1]+'</td>'+
        '<td style="padding:3px 6px">'+t.tour.join('→')+'→'+t.tour[0]+'</td>'+
        '<td style="text-align:right;padding:3px 6px">'+t.cost.toFixed(4)+'</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Calcular ΔE e decidir aceitação</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'ΔE = f(S_nova) − f(S) &nbsp;|&nbsp; P = e^(−ΔE/T) &nbsp;|&nbsp; aceitar se ΔE ≤ 0 ou P > rnd</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">'+
      '<th style="padding:3px 6px;font-weight:400">#</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">ΔE</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">P</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">rnd</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:center">aceitar?</th>'+
      '</tr></thead><tbody>';
    step.tries.forEach(function(t) {
      var acc = t.accept;
      var isImprove = t.delta_E <= 0;
      html += '<tr style="border-top:0.5px solid var(--border3)'+(acc?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:3px 6px;color:var(--text3)">#'+t.try_n+'</td>'+
        '<td style="text-align:right;padding:3px 6px;color:'+(isImprove?'var(--success)':'#e53e3e')+'">'+
          (t.delta_E > 0 ? '+' : '')+t.delta_E.toFixed(4)+'</td>'+
        '<td style="text-align:right;padding:3px 6px">'+
          (isImprove ? '—' : t.P.toFixed(4))+'</td>'+
        '<td style="text-align:right;padding:3px 6px">'+
          (isImprove ? '—' : t.r.toFixed(4))+'</td>'+
        '<td style="text-align:center;padding:3px 6px;font-weight:'+(acc?700:400)+';color:'+(acc?'var(--warn)':'var(--text3)')+'">'+
          (acc ? (isImprove?'✓ melhora':'✓ P>rnd') : '✗ P≤rnd')+'</td></tr>';
    });
    html += '</tbody></table>';
    if (step.nsucess > 0) {
      var accepted = step.tries.filter(function(t){return t.accept;})[0];
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--warn-bg);'+
        'border:0.5px solid var(--warn);font-family:monospace;font-size:11px;color:var(--warn)">'+
        'S aceita: '+accepted.tour.join('→')+'→'+accepted.tour[0]+
        '  custo='+accepted.cost.toFixed(4)+'</div>';
      if (accepted.cost < step.best_cost + 0.0001 && Math.abs(accepted.cost - step.best_cost) < 0.001) {
        html += '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:var(--success-bg);'+
          'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">'+
          '🏆 Nova melhor solução! best='+step.best_cost.toFixed(4)+'</div>';
      }
    } else {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--bg2);'+
        'font-family:monospace;font-size:11px;color:var(--text3)">'+
        'Nenhuma solução aceita nesta iteração (nsucess=0)</div>';
    }
    html += '</div>';

  } else {
    var T_new = sa_r4(cfg.alpha * step.T);
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar temperatura</div>';
    html += '<div style="font-family:monospace;font-size:12px;line-height:2;padding:8px 12px;background:var(--bg2);border-radius:6px">';
    html += 'T_nova = α × T = '+cfg.alpha+' × '+step.T.toFixed(4)+' = <strong>'+T_new.toFixed(4)+'</strong><br>';
    html += 'nsucess = '+step.nsucess+'  (parar se nsucess = 0 ao final da iteração)<br>';
    if (step.nsucess === 0) {
      html += '<span style="color:#e53e3e;font-weight:600">→ PARAR: nsucess = 0</span>';
    } else {
      html += 'S atual: '+step.S_after.join('→')+'→'+step.S_after[0]+'  custo='+step.cost_after.toFixed(4);
    }
    html += '</div></div>';
  }
  return html;
}

function buildSaSummaryPanel(exData) {
  var bt=exData.best_tour, bc=exData.best_cost;
  var html='<div class="card"><div class="ct">🏆 Resultado final — Simulated Annealing · '+
    exData.steps.length+' iterações</div>';
  html+='<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);'+
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">'+
    'Melhor rota: <strong>'+bt.join(' → ')+' → '+bt[0]+'</strong><br>'+
    'Custo: <strong>'+bc.toFixed(4)+'</strong> (vs S0='+exData.init_cost.toFixed(4)+
    ', melhora de '+(100*(exData.init_cost-bc)/exData.init_cost).toFixed(1)+'%)</div>';

  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico:</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)">'+
    '<th style="padding:2px 5px;font-weight:400">iter</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">T</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">custo</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">best</th>'+
    '<th style="padding:2px 5px;font-weight:400">aceito</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:center">novo best?</th>'+
    '</tr></thead><tbody>';
  var prevBest=exData.init_cost;
  exData.steps.forEach(function(s){
    var isNewBest=s.best_cost<prevBest-0.0001;
    var accepted=s.tries.filter(function(t){return t.accept;});
    prevBest=s.best_cost;
    html+='<tr style="border-top:0.5px solid var(--border3)'+(isNewBest?';background:var(--success-bg)':s.nsucess===0?';background:rgba(229,62,62,0.05)':'')+'">'+
      '<td style="padding:2px 5px;color:var(--text3)">'+s.iter+'</td>'+
      '<td style="text-align:right;padding:2px 5px">'+s.T.toFixed(4)+'</td>'+
      '<td style="text-align:right;padding:2px 5px">'+s.cost_after.toFixed(4)+'</td>'+
      '<td style="text-align:right;padding:2px 5px;'+(isNewBest?'font-weight:700;color:var(--success)':'')+'">'+s.best_cost.toFixed(4)+'</td>'+
      '<td style="padding:2px 5px">'+(accepted.length?accepted.map(function(t){return t.cities.join('↔');}).join(', '):'—')+'</td>'+
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">'+(isNewBest?'✓':'')+'</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
