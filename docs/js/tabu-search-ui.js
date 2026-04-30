// tabu-search-ui.js  — canvas renderer + panel builders

function TabuCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

TabuCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

TabuCanvas.prototype.draw = function(exData, step, phase) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var PAD = 36;
  var cities = exData.cities, names = exData.names;

  var xs = names.map(function(n){return cities[n][0];});
  var ys = names.map(function(n){return cities[n][1];});
  var minX=Math.min.apply(null,xs)-0.5, maxX=Math.max.apply(null,xs)+0.5;
  var minY=Math.min.apply(null,ys)-0.5, maxY=Math.max.apply(null,ys)+0.5;
  var dW=CW-2*PAD, dH=CH-2*PAD;
  var scX=dW/(maxX-minX), scY=dH/(maxY-minY);

  function px(x){ return PAD+(x-minX)*scX; }
  function py(y){ return PAD+(maxY-y)*scY; }

  var tour  = step ? (phase===2 ? step.S_after  : step.S_before) : exData.best_tour;
  var isFinal = !step;

  // Draw current/best tour
  ctx.save();
  ctx.strokeStyle = isFinal ? (dk?'rgba(95,205,100,0.7)':'rgba(20,150,40,0.6)') :
                               (dk?'rgba(74,158,255,0.45)':'rgba(24,95,165,0.35)');
  ctx.lineWidth = isFinal ? 2 : 1.5;
  if (isFinal) ctx.setLineDash([]);
  else ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.moveTo(px(cities[tour[0]][0]), py(cities[tour[0]][1]));
  for (var i=1;i<tour.length;i++) ctx.lineTo(px(cities[tour[i]][0]),py(cities[tour[i]][1]));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Highlight swapped segment in orange when showing the move
  if (step && phase>=1) {
    var mi=step.move_i, mj=step.move_j;
    var sb=step.S_before;
    ctx.save();
    ctx.strokeStyle='#EF9F27'; ctx.lineWidth=2.5; ctx.setLineDash([]);
    // Draw edge before (dashed red) and after (solid orange)
    if (phase===1) {
      ctx.strokeStyle='rgba(220,60,60,0.7)'; ctx.setLineDash([4,2]);
      ctx.beginPath();
      ctx.moveTo(px(cities[sb[mi]][0]),py(cities[sb[mi]][1]));
      ctx.lineTo(px(cities[sb[(mi-1+sb.length)%sb.length]][0]),
                 py(cities[sb[(mi-1+sb.length)%sb.length]][1]));
      ctx.moveTo(px(cities[sb[mj]][0]),py(cities[sb[mj]][1]));
      ctx.lineTo(px(cities[sb[(mj+1)%sb.length]][0]),
                 py(cities[sb[(mj+1)%sb.length]][1]));
      ctx.stroke();
    }
    // Highlight the two swapped cities
    [mi,mj].forEach(function(pos) {
      var cname = (phase===2 ? step.S_after : step.S_before)[pos];
      ctx.beginPath();
      ctx.arc(px(cities[cname][0]),py(cities[cname][1]),10,0,2*Math.PI);
      ctx.strokeStyle='#EF9F27'; ctx.lineWidth=2.5; ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Draw city dots and labels
  names.forEach(function(name) {
    var cx=px(cities[name][0]), cy=py(cities[name][1]);
    var isSwap = step && phase>=1 &&
      (name===step.move_cities[0]||name===step.move_cities[1]);
    ctx.beginPath();
    ctx.arc(cx,cy,5,0,2*Math.PI);
    ctx.fillStyle = isSwap ? '#EF9F27' : (dk?'#6d8fa8':'#4a7090');
    ctx.fill();
    ctx.fillStyle = dk?'#c2c0b6':'#1a1a18';
    ctx.font=(isSwap?'bold ':'')+'10px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(name, cx, cy-8);
  });

  // Tour direction arrow on first segment
  var p0=tour[0], p1=tour[1];
  var ax=px(cities[p0][0]),ay=py(cities[p0][1]);
  var bx=px(cities[p1][0]),by=py(cities[p1][1]);
  var mx=(ax+bx)/2, my=(ay+by)/2;
  var ang=Math.atan2(by-ay,bx-ax);
  ctx.save();
  ctx.fillStyle=isFinal?(dk?'rgba(95,205,100,0.8)':'rgba(20,150,40,0.8)'):
                         (dk?'rgba(74,158,255,0.6)':'rgba(24,95,165,0.6)');
  ctx.beginPath();
  ctx.moveTo(mx+7*Math.cos(ang),my+7*Math.sin(ang));
  ctx.lineTo(mx-5*Math.cos(ang-0.5),my-5*Math.sin(ang-0.5));
  ctx.lineTo(mx-5*Math.cos(ang+0.5),my-5*Math.sin(ang+0.5));
  ctx.closePath(); ctx.fill(); ctx.restore();

  // Cost label
  var cost = step ? (phase===2?step.cost_after:step.cost_before) : exData.best_cost;
  ctx.fillStyle=isFinal?(dk?'rgba(95,205,100,0.9)':'rgba(20,150,40,0.9)'):(dk?'#888780':'#666');
  ctx.font='bold 11px sans-serif'; ctx.textAlign='left';
  ctx.fillText((isFinal?'Melhor rota: ':'Rota: ')+cost.toFixed(4), PAD, CH-10);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function tabu_phaseLabel(phase) {
  var labels=[['1','avaliar vizinhança','b1'],['2','escolher movimento','b2'],['3','atualizar lista tabu','b4']];
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
function buildTabuPanel(step, phase, cfg) {
  var html = tabu_phaseLabel(phase);

  html += '<div class="card"><div class="ct">Iteração ' + step.iter + ' / ' + cfg.max_iter +
    ' &nbsp;|&nbsp; k=' + cfg.k + ' &nbsp;|&nbsp; custo atual: <strong>' +
    step.cost_before.toFixed(4) + '</strong></div>' +
    '<div style="font-family:monospace;font-size:12px;line-height:2;color:var(--text2)">' +
    'S = ' + step.S_before.join(' → ') + ' → ' + step.S_before[0] +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Top 5 movimentos 2-opt por custo</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Movimento (i,j): reverter segmento entre posições i e j da rota</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">move(i,j)</th>' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">cidades</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">custo</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">tabu?</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">aspiração?</th>' +
      '</tr></thead><tbody>';
    step.top5.forEach(function(m, idx) {
      var chosen = idx===0 && (!m.is_tabu||m.aspiration);
      html += '<tr style="border-top:0.5px solid var(--border3)'+
        (chosen?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:2px 5px;color:var(--text3)">(' + m.i + ',' + m.j + ')</td>' +
        '<td style="padding:2px 5px">' + m.cities[0] + '-' + m.cities[1] + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:'+(chosen?700:400)+
          ';color:'+(chosen?'var(--warn)':'inherit')+'">' + m.cost.toFixed(4) + '</td>' +
        '<td style="text-align:center;padding:2px 5px;color:'+(m.is_tabu?'#e53e3e':'var(--success)')+'">'+
          (m.is_tabu?'sim':'não')+'</td>' +
        '<td style="text-align:center;padding:2px 5px;color:'+(m.aspiration?'var(--warn)':'var(--text3)')+'">'+
          (m.aspiration?'✓ sim':'—')+'</td></tr>';
    });
    html += '</tbody></table>';
    if (Object.keys(step.tabu_before).length > 0) {
      html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">'+
        'Lista tabu atual: ' +
        Object.entries(step.tabu_before).map(function(e){
          var parts=e[0].split('_');
          return '('+parts[0]+','+parts[1]+')='+e[1];
        }).join('  ')+'</div>';
    } else {
      html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">'+
        'Lista tabu: vazia</div>';
    }
    html += '</div>';

  } else if (phase === 1) {
    var asp = step.aspiration_used
      ? '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:rgba(239,159,39,0.1);'+
        'border:0.5px solid #EF9F27;font-family:monospace;font-size:11px;color:#EF9F27">'+
        '⭐ Critério de aspiração aplicado — movimento tabu aceito porque melhora o melhor conhecido!</div>'
      : '';

    html += '<div class="card"><div class="ct">Passo 2 — Movimento escolhido</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Melhor movimento '+(!step.was_tabu?'<strong>não-tabu</strong>':'<strong style="color:#EF9F27">tabu com aspiração</strong>')+
      ': swap('+step.move_i+','+step.move_j+') cidades '+step.move_cities[0]+'-'+step.move_cities[1]+'</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="text-align:left;padding:3px 6px;font-weight:400"></th>'+
      '<th style="text-align:left;padding:3px 6px;font-weight:400">rota</th>'+
      '<th style="text-align:right;padding:3px 6px;font-weight:400">custo</th></tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)"><td style="padding:3px 6px;color:var(--text3)">antes</td>'+
      '<td style="padding:3px 6px">'+step.S_before.join(' → ')+'</td>'+
      '<td style="text-align:right;padding:3px 6px">'+step.cost_before.toFixed(4)+'</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3);background:var(--warn-bg)">'+
      '<td style="padding:3px 6px;color:var(--warn);font-weight:600">depois</td>'+
      '<td style="padding:3px 6px;font-weight:600;color:var(--warn)">'+step.S_after.join(' → ')+'</td>'+
      '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">'+step.cost_after.toFixed(4)+'</td></tr>';
    html += '</tbody></table>' + asp;
    if (step.is_new_best) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);'+
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">'+
        '🏆 Nova melhor solução! custo=' + step.cost_after.toFixed(4) + '</div>';
    }
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar lista tabu</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Adicionar movimento ('+step.move_i+','+step.move_j+') com tenure k='+cfg.k+'<br>' +
      'Decrementar todos os outros; remover se chegar a 0</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:3px 6px;font-weight:400">movimento</th>'+
      '<th style="text-align:center;padding:3px 6px;font-weight:400">antes</th>'+
      '<th style="text-align:center;padding:3px 6px;font-weight:400;color:var(--warn)">depois</th></tr></thead><tbody>';

    // Collect all keys from before + new move
    var allKeys = new Set(Object.keys(step.tabu_before));
    allKeys.add(step.move_i+'_'+step.move_j);
    allKeys.forEach(function(mk) {
      var parts=mk.split('_'), ki=parts[0], kj=parts[1];
      var before=step.tabu_before[mk]||0;
      var after =step.tabu_after[mk]||0;
      var isNew  = mk===step.move_i+'_'+step.move_j;
      html += '<tr style="border-top:0.5px solid var(--border3)'+(isNew?';background:var(--warn-bg)':'')+'">' +
        '<td style="padding:3px 6px;color:var(--text3)">('+ki+','+kj+')'+(isNew?' ← novo':'')+'</td>' +
        '<td style="text-align:center;padding:3px 6px">'+(before||'—')+'</td>' +
        '<td style="text-align:center;padding:3px 6px;font-weight:'+(isNew?700:400)+
          ';color:'+(isNew?'var(--warn)':(after===0?'var(--text3)':'inherit'))+'">' +
          (after===0?'removido':after)+'</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildTabuSummaryPanel(exData) {
  var bt = exData.best_tour, bc = exData.best_cost;
  var html = '<div class="card"><div class="ct">🏆 Melhor solução — Busca Tabu · k=' +
    exData.config.k + ' · ' + exData.steps.length + ' iterações</div>';

  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);'+
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">' +
    bt.join(' → ') + ' → ' + bt[0] + '<br>' +
    '📏 Custo: <strong>' + bc.toFixed(4) + '</strong>' +
    ' &nbsp;(inicial: ' + exData.init_cost.toFixed(4) + ' &nbsp;melhoria: ' +
    ((1-bc/exData.init_cost)*100).toFixed(1) + '%)</div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico de iterações:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">'+
    '<th style="text-align:left;padding:2px 5px;font-weight:400">iter</th>'+
    '<th style="text-align:left;padding:2px 5px;font-weight:400">move</th>'+
    '<th style="text-align:left;padding:2px 5px;font-weight:400">cidades</th>'+
    '<th style="text-align:right;padding:2px 5px;font-weight:400">custo</th>'+
    '<th style="text-align:center;padding:2px 5px;font-weight:400">melhor?</th>'+
    '</tr></thead><tbody>';
  exData.steps.forEach(function(s) {
    html += '<tr style="border-top:0.5px solid var(--border3)'+(s.is_new_best?';background:var(--success-bg)':'')+'">' +
      '<td style="padding:2px 5px;color:var(--text3)">'+s.iter+'</td>'+
      '<td style="padding:2px 5px">('+s.move_i+','+s.move_j+')</td>'+
      '<td style="padding:2px 5px">'+s.move_cities[0]+'-'+s.move_cities[1]+
        (s.aspiration_used?' <span style="color:#EF9F27">⭐</span>':'')+
        (s.was_tabu?' <span style="color:#e53e3e;font-size:9px">[tabu]</span>':'')+'</td>'+
      '<td style="text-align:right;padding:2px 5px;'+(s.is_new_best?'font-weight:700;color:var(--success)':'')+'">' +
        s.cost_after.toFixed(4)+'</td>'+
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">'+(s.is_new_best?'✓':'')+'</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
