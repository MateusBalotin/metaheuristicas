// pso-knapsack-ui.js

var PSOKS_COLORS = ['#4a9eff', '#EF9F27', '#5DCAA5'];

function PsoKsCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

PsoKsCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

PsoKsCanvas.prototype.draw = function(exData, step, phase) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var items = exData.items, n = items.length;
  var PAD_L = 28, PAD_R = 8;
  var W = CW - PAD_L - PAD_R;
  var barW = Math.floor((W - (n-1)) / n);
  var gap  = 1;
  var CHART_H = Math.floor((CH - 40) / 2);
  var TOP1 = 4;
  var TOP2 = TOP1 + CHART_H + 10;
  var LBL_Y = TOP2 + CHART_H + 12;

  // Get selections and gbest
  var xs = [];
  if (step) {
    var useNew = (phase >= 2);
    step.particles.forEach(function(ps){ xs.push(useNew ? ps.x_new : ps.x_before); });
  } else {
    exData.steps[exData.steps.length-1].particles.forEach(function(ps){ xs.push(ps.x_new); });
  }
  var gbest = step ? (phase >= 2 ? step.gbest_after : step.gbest_before) : exData.final_gbest;
  var gbest_w = psoks_solW(gbest), gbest_v = psoks_solV(gbest);

  var maxV = Math.max.apply(null, items.map(function(it){return it.v;}));
  var maxW = Math.max.apply(null, items.map(function(it){return it.w;}));

  // Section labels
  ctx.fillStyle = dk ? '#888780' : '#888';
  ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('v', PAD_L - 2, TOP1 + CHART_H / 2);
  ctx.fillText('w', PAD_L - 2, TOP2 + CHART_H / 2);

  for (var i = 0; i < n; i++) {
    var bx = PAD_L + i * (barW + gap);
    var inGbest = gbest[i] === 1;
    var anyHas  = xs.some(function(x){ return x[i] === 1; });

    var colV = !anyHas ? (dk?'#252523':'#eceae6')
             : inGbest  ? (dk?'#4a9eff':'#3a7fd4')
             :             (dk?'#666663':'#c0beb8');
    var colW = !anyHas ? (dk?'#252523':'#eceae6')
             : inGbest  ? (dk?'#5DCAA5':'#2d9e78')
             :             (dk?'#666663':'#c0beb8');

    var vH = Math.max(1, Math.round(items[i].v / maxV * (CHART_H - 2)));
    ctx.fillStyle = colV;
    ctx.fillRect(bx, TOP1 + CHART_H - vH, barW, vH);

    var wH = Math.max(1, Math.round(items[i].w / maxW * (CHART_H - 2)));
    ctx.fillStyle = colW;
    ctx.fillRect(bx, TOP2 + CHART_H - wH, barW, wH);

    ctx.fillStyle = inGbest ? (dk?'#e8e6de':'#1a1a18')
                 : anyHas   ? (dk?'#888780':'#666')
                 :             (dk?'#444':'#ccc');
    ctx.font = (inGbest ? 'bold ' : '') + '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, bx + barW / 2, LBL_Y);
  }

  // Capacity bar
  var capY = LBL_Y + 6;
  ctx.fillStyle = dk ? '#252523' : '#e8e6e0';
  ctx.fillRect(PAD_L, capY, W, 4);
  ctx.fillStyle = dk ? '#4a9eff' : '#3a7fd4';
  ctx.fillRect(PAD_L, capY, Math.round(W * gbest_w / exData.capacity), 4);
  ctx.fillStyle = dk ? '#888780' : '#666';
  ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillText('gbest: val='+gbest_v+'  w='+gbest_w+'/'+exData.capacity, PAD_L, capY - 2);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function psoks_phaseLabel(phase) {
  var labels=[
    ['1','calcular fitness','b1'],
    ['2','atualizar pbest/gbest','b2'],
    ['3','atualizar velocidade e posição','b4']
  ];
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

function psoks_fmtV(v) {
  if (!v || !v.length) return '∅';
  return '{' + v.map(function(t){ return '('+( t[0]+1)+','+(t[1]+1)+')'; }).join(', ') + '}';
}

// ── Panel builders ────────────────────────────────────────────────────────────
function buildPsoKsPanel(step, phase, cfg) {
  var html = psoks_phaseLabel(phase);
  var gbest_sel = [];
  for (var i=0;i<PSOKS_N;i++) if(step.gbest_before[i]) gbest_sel.push(i+1);

  html += '<div class="card"><div class="ct">Iteração ' + step.iter + ' / ' + cfg.n_iters +
    ' &nbsp;|&nbsp; w=' + cfg.w + ' η₁=' + cfg.n1 + ' η₂=' + cfg.n2 +
    ' &nbsp;|&nbsp; gbest: items=[' + gbest_sel.join(',') + '] val=' + step.gbest_val + '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Fitness de cada partícula</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:left">itens selecionados</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">w</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">val</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right">pbest val</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps, i) {
      var sel=[];
      for(var j=0;j<PSOKS_N;j++) if(ps.x_before[j]) sel.push(j+1);
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 5px;color:'+PSOKS_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="padding:2px 5px">[' + sel.join(',') + ']</td>' +
        '<td style="text-align:right;padding:2px 5px">' + psoks_solW(ps.x_before) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:600">' + psoks_solV(ps.x_before) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;color:var(--text3)">' + psoks_solV(ps.pbest_before) + '</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Subtração: calcular (pbest−x) e (gbest−x)</div>';
    html += '<div style="font-family:monospace;font-size:10px;color:var(--text3);margin-bottom:6px">'+
      'x_j−x_i = transposições para transformar x_i em x_j</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:2px 5px;font-weight:400">(pbest−x)</th>'+
      '<th style="padding:2px 5px;font-weight:400">(gbest−x)</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps, i) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:2px 5px;color:'+PSOKS_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="padding:2px 5px">' + psoks_fmtV(ps.v_pb) + '</td>' +
        '<td style="padding:2px 5px">' + psoks_fmtV(ps.v_gb) + '</td></tr>';
    });
    html += '</tbody></table>';
    if (step.gbest_updated) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);'+
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">'+
        '🏆 gbest atualizado: val='+step.gbest_val+'</div>';
    }
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar velocidade e posição</div>';
    html += '<div style="font-family:monospace;font-size:10px;color:var(--text3);margin-bottom:6px">'+
      'v = w⊗v + η₁⊗(pbest−x) + η₂⊗(gbest−x) &nbsp;|&nbsp; c⊗v = primeiros ⌊c·|v|⌋ transposições<br>'+
      'x = x + v (aplicar transposições)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400;text-align:left">P</th>'+
      '<th style="padding:2px 5px;font-weight:400">w⊗v</th>'+
      '<th style="padding:2px 5px;font-weight:400">η₁⊗(pb−x)</th>'+
      '<th style="padding:2px 5px;font-weight:400">η₂⊗(gb−x)</th>'+
      '<th style="padding:2px 5px;font-weight:400;color:var(--warn)">v_novo</th>'+
      '<th style="padding:2px 5px;font-weight:400;text-align:right;color:var(--warn)">val</th>'+
      '</tr></thead><tbody>';
    step.particles.forEach(function(ps, i) {
      var wv   = psoks_scalarMul(cfg.w,  ps.v_before);
      var n1v  = psoks_scalarMul(cfg.n1, ps.v_pb);
      var n2v  = psoks_scalarMul(cfg.n2, ps.v_gb);
      var upd  = ps.pbest_updated;
      html += '<tr style="border-top:0.5px solid var(--border3)'+(upd?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:2px 5px;color:'+PSOKS_COLORS[i]+'">P'+ps.id+'</td>' +
        '<td style="padding:2px 5px">' + psoks_fmtV(wv) + '</td>' +
        '<td style="padding:2px 5px">' + psoks_fmtV(n1v) + '</td>' +
        '<td style="padding:2px 5px">' + psoks_fmtV(n2v) + '</td>' +
        '<td style="padding:2px 5px;color:var(--warn)">' + psoks_fmtV(ps.v_new) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:'+(upd?700:400)+';color:'+(upd?'var(--warn)':'inherit')+'">'+
          ps.val_new+(upd?' ✓':'')+'</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildPsoKsSummaryPanel(exData) {
  var gv=exData.final_gbest_val, gw=exData.final_gbest_w;
  var sel=[]; for(var i=0;i<PSOKS_N;i++) if(exData.final_gbest[i]) sel.push(i+1);

  var html='<div class="card"><div class="ct">🏆 Resultado final — PSO Mochila · '+
    exData.config.n_iters+' iterações · '+exData.config.n_particles+' partículas</div>';
  html+='<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);'+
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">'+
    'Itens: ['+sel.join(', ')+']<br>'+
    '📦 Peso: <strong>'+gw+' / '+exData.capacity+'</strong>'+
    ' &nbsp;|&nbsp; 💰 Valor: <strong>'+gv+'</strong></div>';

  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico gbest:</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400">iter</th>'+
    '<th style="padding:2px 5px;font-weight:400">gbest val</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:center">atualizado?</th></tr></thead><tbody>';
  exData.steps.forEach(function(s){
    html+='<tr style="border-top:0.5px solid var(--border3)'+(s.gbest_updated?';background:var(--success-bg)':'')+'">' +
      '<td style="padding:2px 5px;color:var(--text3)">'+s.iter+'</td>'+
      '<td style="padding:2px 5px;'+(s.gbest_updated?'font-weight:700;color:var(--success)':'')+'">'+s.gbest_val+'</td>'+
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">'+(s.gbest_updated?'✓':'')+'</td></tr>';
  });
  html+='</tbody></table>';

  html+='<div style="margin-top:10px;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px">Estado final das partículas:</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400">P</th>'+
    '<th style="padding:2px 5px;font-weight:400">itens</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">w</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">val</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">pbest val</th></tr></thead><tbody>';
  var last=exData.steps[exData.steps.length-1];
  last.particles.forEach(function(ps,i){
    var sel2=[]; for(var j=0;j<PSOKS_N;j++) if(ps.x_new[j]) sel2.push(j+1);
    html+='<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:'+PSOKS_COLORS[i]+'">P'+ps.id+'</td>'+
      '<td style="padding:2px 5px">['+sel2.join(',')+']</td>'+
      '<td style="text-align:right;padding:2px 5px">'+ps.w_new+'</td>'+
      '<td style="text-align:right;padding:2px 5px">'+ps.val_new+'</td>'+
      '<td style="text-align:right;padding:2px 5px;font-weight:600">'+ps.pbest_val_new+'</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
