// sa-knapsack-ui.js

function SaKsCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

SaKsCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

SaKsCanvas.prototype.draw = function(exData, step, phase) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var items = exData.items, n = items.length;
  var PAD_L = 28, PAD_R = 8;
  var W = CW - PAD_L - PAD_R;
  var barW = Math.floor((W - (n-1)) / n);
  var CHART_H = Math.floor((CH - 40) / 2);
  var TOP1 = 4, TOP2 = TOP1 + CHART_H + 10, LBL_Y = TOP2 + CHART_H + 12;

  // Determine which state to show
  var x = step ? (phase >= 2 ? step.x_after : step.x_before) : exData.best_x;
  var best_x = step ? step.best_x : exData.best_x;
  var changedItem = (step && phase >= 1 && step.tries.length)
    ? step.tries[step.tries.length-1].item : -1;

  var maxV = Math.max.apply(null, items.map(function(it){return it.v;}));
  var maxW = Math.max.apply(null, items.map(function(it){return it.w;}));

  ctx.fillStyle = dk ? '#888780' : '#888';
  ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('v', PAD_L-2, TOP1+CHART_H/2);
  ctx.fillText('w', PAD_L-2, TOP2+CHART_H/2);

  for (var i = 0; i < n; i++) {
    var bx = PAD_L + i * (barW + 1);
    var selected  = x[i] === 1;
    var inBest    = best_x[i] === 1;
    var isChanged = i === changedItem;

    var colV = isChanged ? '#EF9F27'
             : selected && inBest  ? (dk?'#4a9eff':'#3a7fd4')
             : selected            ? (dk?'#666663':'#c0beb8')
             :                       (dk?'#252523':'#eceae6');
    var colW = isChanged ? '#EF9F27'
             : selected && inBest  ? (dk?'#5DCAA5':'#2d9e78')
             : selected            ? (dk?'#666663':'#c0beb8')
             :                       (dk?'#252523':'#eceae6');

    var vH = Math.max(1, Math.round(items[i].v / maxV * (CHART_H-2)));
    ctx.fillStyle = colV;
    ctx.fillRect(bx, TOP1+CHART_H-vH, barW, vH);

    var wH = Math.max(1, Math.round(items[i].w / maxW * (CHART_H-2)));
    ctx.fillStyle = colW;
    ctx.fillRect(bx, TOP2+CHART_H-wH, barW, wH);

    ctx.fillStyle = isChanged ? '#EF9F27'
                 : selected   ? (dk?'#e8e6de':'#1a1a18')
                 :               (dk?'#444':'#ccc');
    ctx.font = (isChanged?'bold ':'') + '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i+1, bx+barW/2, LBL_Y);
  }

  // Capacity + value labels
  var w = step ? (phase >= 2 ? step.w_after : step.w_before) : exData.best_w;
  var v = step ? (phase >= 2 ? step.val_after : step.val_before) : exData.best_val;
  var capY = LBL_Y + 6;
  ctx.fillStyle = dk?'#252523':'#e8e6e0';
  ctx.fillRect(PAD_L, capY, W, 4);
  ctx.fillStyle = w > exData.capacity ? '#e53e3e' : (dk?'#4a9eff':'#3a7fd4');
  ctx.fillRect(PAD_L, capY, Math.round(W*Math.min(w/exData.capacity,1)), 4);
  ctx.fillStyle = dk?'#888780':'#666'; ctx.font='8px monospace'; ctx.textAlign='left';
  ctx.fillText('w='+w+'/'+exData.capacity+'  val='+v, PAD_L, capY-2);
  ctx.fillStyle = dk?'#4a9eff':'#3a7fd4'; ctx.textAlign='right';
  ctx.fillText('best='+step?(step.best_val):(exData.best_val), CW-PAD_R, capY-2);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function saks_phaseLabel(phase) {
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

function saks_selItems(x){
  var s=[];
  for(var i=0;i<SAKS_N;i++) if(x[i]) s.push(i+1);
  return '['+s.join(',')+']';
}

// ── Panel builders ────────────────────────────────────────────────────────────
function buildSaKsPanel(step, phase, cfg) {
  var html = saks_phaseLabel(phase);

  html += '<div class="card"><div class="ct">Iteração '+step.iter+
    ' &nbsp;|&nbsp; T='+step.T.toFixed(4)+
    ' &nbsp;|&nbsp; valor atual: <strong>'+step.val_before+'</strong>'+
    ' &nbsp;|&nbsp; best: <strong>'+step.best_val+'</strong></div>'+
    '<div style="font-family:monospace;font-size:11px;color:var(--text2);margin-top:4px">'+
    'S: itens='+saks_selItems(step.x_before)+
    '  w='+step.w_before+'/'+cfg.capacity+'</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Gerar vizinhos (flip 1 item, até V='+cfg.V+')</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'Vizinhos factíveis ordenados por valor descendente. Tentar até '+cfg.V+' ou nsucess='+cfg.L+'.</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">'+
      '<th style="padding:3px 6px;font-weight:400">#</th>'+
      '<th style="padding:3px 6px;font-weight:400">move</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">w</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">valor</th>'+
      '</tr></thead><tbody>';
    step.tries.forEach(function(t) {
      html += '<tr style="border-top:0.5px solid var(--border3)">' +
        '<td style="padding:3px 6px;color:var(--text3)">#'+t.try_n+'</td>'+
        '<td style="padding:3px 6px">'+t.action+' item '+(t.item+1)+
          ' (v='+SAKS_ITEMS[t.item].v+', w='+SAKS_ITEMS[t.item].w+')</td>'+
        '<td style="text-align:right;padding:3px 6px">'+t.w_new+'</td>'+
        '<td style="text-align:right;padding:3px 6px;font-weight:600">'+t.v_new+'</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Calcular ΔE e aceitar</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">'+
      'ΔE = val_atual − val_nova &nbsp;|&nbsp; P = e^(−ΔE/T) &nbsp;|&nbsp; aceitar se ΔE ≤ 0 ou P > rnd</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">'+
      '<th style="padding:3px 6px;font-weight:400">#</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">ΔE</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">P</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:right">rnd</th>'+
      '<th style="padding:3px 6px;font-weight:400;text-align:center">aceitar?</th>'+
      '</tr></thead><tbody>';
    step.tries.forEach(function(t) {
      var acc = t.accept, isImprove = t.delta_E <= 0;
      html += '<tr style="border-top:0.5px solid var(--border3)'+(acc?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:3px 6px;color:var(--text3)">#'+t.try_n+'</td>'+
        '<td style="text-align:right;padding:3px 6px;color:'+(isImprove?'var(--success)':'#e53e3e')+'">'+
          (t.delta_E > 0 ? '+' : '')+t.delta_E.toFixed(4)+'</td>'+
        '<td style="text-align:right;padding:3px 6px">'+(isImprove?'—':t.P.toFixed(4))+'</td>'+
        '<td style="text-align:right;padding:3px 6px">'+(isImprove?'—':t.r.toFixed(4))+'</td>'+
        '<td style="text-align:center;padding:3px 6px;font-weight:'+(acc?700:400)+';color:'+(acc?'var(--warn)':'var(--text3)')+'">'+
          (acc?(isImprove?'✓ melhora':'✓ P>rnd'):'✗ P≤rnd')+'</td></tr>';
    });
    html += '</tbody></table>';
    if (step.nsucess > 0) {
      var acc0 = step.tries.filter(function(t){return t.accept;})[0];
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--warn-bg);'+
        'border:0.5px solid var(--warn);font-family:monospace;font-size:11px;color:var(--warn)">'+
        acc0.action+' item '+(acc0.item+1)+
        '  itens='+saks_selItems(acc0.x_new)+
        '  w='+acc0.w_new+'/'+cfg.capacity+'  val='+acc0.v_new+'</div>';
      if (acc0.v_new === step.best_val) {
        html += '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:var(--success-bg);'+
          'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">'+
          '🏆 Nova melhor solução! best='+step.best_val+'</div>';
      }
    } else {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--bg2);'+
        'font-family:monospace;font-size:11px;color:var(--text3)">Nenhuma solução aceita (nsucess=0)</div>';
    }
    html += '</div>';

  } else {
    var T_new = saks_r4(cfg.alpha * step.T);
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar temperatura</div>';
    html += '<div style="font-family:monospace;font-size:12px;line-height:2;padding:8px 12px;background:var(--bg2);border-radius:6px">';
    html += 'T_nova = α × T = '+cfg.alpha+' × '+step.T.toFixed(4)+' = <strong>'+T_new.toFixed(4)+'</strong><br>';
    html += 'nsucess = '+step.nsucess+'<br>';
    if (step.nsucess === 0) {
      html += '<span style="color:#e53e3e;font-weight:600">→ PARAR: nsucess = 0</span>';
    } else {
      html += 'S atual: itens='+saks_selItems(step.x_after)+'  val='+step.val_after;
    }
    html += '</div></div>';
  }
  return html;
}

function buildSaKsSummaryPanel(exData) {
  var bx=exData.best_x, bv=exData.best_val, bw=exData.best_w;
  var html='<div class="card"><div class="ct">🏆 Resultado final — SA Mochila · '+
    exData.steps.length+' iterações</div>';
  html+='<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);'+
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">'+
    'Itens: '+saks_selItems(bx)+'<br>'+
    '📦 Peso: <strong>'+bw+' / '+exData.capacity+'</strong>'+
    ' &nbsp;|&nbsp; 💰 Valor: <strong>'+bv+'</strong></div>';

  html+='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico:</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html+='<thead><tr style="color:var(--text3)">'+
    '<th style="padding:2px 5px;font-weight:400">iter</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">T</th>'+
    '<th style="padding:2px 5px;font-weight:400">move</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:right">val</th>'+
    '<th style="padding:2px 5px;font-weight:400;text-align:center">best?</th>'+
    '</tr></thead><tbody>';
  var prevBest=0;
  exData.steps.forEach(function(s){
    var isNew=s.best_val>prevBest; prevBest=s.best_val;
    var acc=s.tries.filter(function(t){return t.accept;});
    html+='<tr style="border-top:0.5px solid var(--border3)'+(isNew?';background:var(--success-bg)':s.nsucess===0?';background:rgba(229,62,62,0.05)':'')+'">'+
      '<td style="padding:2px 5px;color:var(--text3)">'+s.iter+'</td>'+
      '<td style="text-align:right;padding:2px 5px">'+s.T.toFixed(4)+'</td>'+
      '<td style="padding:2px 5px">'+(acc.length?acc[0].action+' '+(acc[0].item+1):'—')+'</td>'+
      '<td style="text-align:right;padding:2px 5px;'+(isNew?'font-weight:700;color:var(--success)':'')+'">'+s.val_after+'</td>'+
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">'+(isNew?'✓':'')+'</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
