// tabu-knapsack-ui.js

function KsCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

KsCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

KsCanvas.prototype.draw = function(exData, step) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var items = exData.items, n = items.length;
  var PAD = 32, BAR_GAP = 4;
  var barW = Math.floor((CW - 2*PAD - (n-1)*BAR_GAP) / n);
  var x = step ? step.x_after : exData.best_x;
  var changedItem = step ? step.item : -1;

  var maxV = Math.max.apply(null, items.map(function(it){return it.v;}));
  var maxW = Math.max.apply(null, items.map(function(it){return it.w;}));
  var CHART_H = (CH - PAD - 60) / 2;
  var TOP1 = 30, TOP2 = TOP1 + CHART_H + 40;

  // Title labels
  ctx.fillStyle = dk ? '#888780' : '#888780';
  ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Valor', PAD, TOP1 - 6);
  ctx.fillText('Peso', PAD, TOP2 - 6);

  for (var i = 0; i < n; i++) {
    var bx = PAD + i * (barW + BAR_GAP);
    var selected = x[i] === 1;
    var isChanged = i === changedItem;

    // Value bar
    var vH = Math.round(items[i].v / maxV * CHART_H);
    ctx.fillStyle = isChanged ? '#EF9F27'
      : selected ? (dk ? '#4a9eff' : '#3a7fd4')
      : (dk ? '#2a2a28' : '#e8e6e0');
    ctx.fillRect(bx, TOP1 + CHART_H - vH, barW, vH);

    // Weight bar
    var wH = Math.round(items[i].w / maxW * CHART_H);
    ctx.fillStyle = isChanged ? '#EF9F27'
      : selected ? (dk ? '#5DCAA5' : '#2d9e78')
      : (dk ? '#2a2a28' : '#e8e6e0');
    ctx.fillRect(bx, TOP2 + CHART_H - wH, barW, wH);

    // Item label
    ctx.fillStyle = isChanged ? '#EF9F27' : (selected ? (dk?'#e8e6de':'#1a1a18') : (dk?'#888780':'#999'));
    ctx.font = isChanged ? 'bold 9px sans-serif' : '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, bx + barW/2, CH - 8);

    // Selection tick
    if (selected) {
      ctx.fillStyle = '#EF9F27';
      ctx.font = '8px sans-serif';
      ctx.fillText('✓', bx + barW/2, CH - 18);
    }
  }

  // Capacity bar
  var w = step ? step.w_after : exData.best_w;
  var capRatio = w / exData.capacity;
  var barTotalW = CW - 2*PAD;
  ctx.fillStyle = dk ? '#2a2a28' : '#e8e6e0';
  ctx.fillRect(PAD, CH - 50, barTotalW, 8);
  ctx.fillStyle = capRatio > 1.0 ? '#e53e3e' : (dk ? '#5DCAA5' : '#2d9e78');
  ctx.fillRect(PAD, CH - 50, Math.round(barTotalW * Math.min(capRatio, 1.0)), 8);
  ctx.fillStyle = dk ? '#888780' : '#666';
  ctx.font = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillText('Capacidade: ' + w + ' / ' + exData.capacity + ' (' + Math.round(capRatio*100) + '%)', PAD, CH - 54);

  // Value label
  var val = step ? step.val_after : exData.best_val;
  ctx.fillStyle = dk ? '#4a9eff' : '#185FA5';
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('Valor: ' + val, CW - PAD, CH - 54);
};

// ── Phase label ───────────────────────────────────────────────────────────────
function ks_phaseLabel(phase) {
  var labels = [['1','avaliar vizinhança','b1'],['2','escolher movimento','b2'],['3','atualizar lista tabu','b4']];
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  labels.forEach(function(pd, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active?'border2':'border3') + ');' +
      'background:' + (active?'var(--bg2)':'transparent') + ';' +
      'color:' + (active?'var(--text)':'var(--text3)') + ';">' +
      pd[0] + '. ' + pd[1] + '</span>';
  });
  return html + '</div>';
}

// ── Panel builders ────────────────────────────────────────────────────────────
function buildKsPanel(step, phase, cfg) {
  var html = ks_phaseLabel(phase);
  var items = KS_ITEMS;

  var selBefore = [];
  for (var i=0;i<step.x_before.length;i++) if(step.x_before[i]) selBefore.push(i+1);

  html += '<div class="card"><div class="ct">Iteração ' + step.iter + ' / ' + cfg.max_iter +
    ' &nbsp;|&nbsp; k=' + cfg.k + ' &nbsp;|&nbsp; ' +
    'w=' + step.w_before + '/' + cfg.capacity +
    ' &nbsp;|&nbsp; valor atual: <strong>' + step.val_before + '</strong></div>' +
    '<div style="font-family:monospace;font-size:11px;line-height:1.9;color:var(--text2)">' +
    'Itens selecionados: [' + selBefore.join(', ') + ']' +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Top 5 movimentos por valor</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Movimento: ADD (incluir item) ou REM (remover item) · apenas soluções factíveis (w≤' + cfg.capacity + ')</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">move</th>' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">item</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">w</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">valor</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">factível?</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">tabu?</th>' +
      '</tr></thead><tbody>';
    step.top5.forEach(function(m, idx) {
      var chosen = idx === 0 && m.feasible && (!m.is_tabu || m.aspiration);
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (chosen ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:2px 5px;color:var(--text3)">' + m.action + '</td>' +
        '<td style="padding:2px 5px">item ' + (m.item+1) +
          ' (v=' + items[m.item].v + ' w=' + items[m.item].w + ')</td>' +
        '<td style="text-align:right;padding:2px 5px">' + m.w + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:' + (chosen?700:400) +
          ';color:' + (chosen?'var(--warn)':'inherit') + '">' + m.val + '</td>' +
        '<td style="text-align:center;padding:2px 5px;color:' +
          (m.feasible?'var(--success)':'#e53e3e') + '">' + (m.feasible?'✓':'✗') + '</td>' +
        '<td style="text-align:center;padding:2px 5px;color:' +
          (m.is_tabu?'#e53e3e':'var(--success)') + '">' + (m.is_tabu?'sim':'não') + '</td></tr>';
    });
    html += '</tbody></table>';
    var tabuItems = Object.keys(step.tabu_before);
    html += '<div style="margin-top:8px;font-family:monospace;font-size:11px;color:var(--text3)">' +
      (tabuItems.length ? 'Lista tabu: ' + tabuItems.map(function(k){
        return 'item '+(parseInt(k)+1)+'='+step.tabu_before[k];
      }).join('  ') : 'Lista tabu: vazia') + '</div>';
    html += '</div>';

  } else if (phase === 1) {
    var asp = step.aspiration_used
      ? '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:rgba(239,159,39,0.1);' +
        'border:0.5px solid #EF9F27;font-family:monospace;font-size:11px;color:#EF9F27">' +
        '⭐ Critério de aspiração — movimento tabu aceito por melhorar o melhor!</div>' : '';

    html += '<div class="card"><div class="ct">Passo 2 — Movimento escolhido</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      step.action + ' item ' + (step.item+1) +
      ' (v=' + items[step.item].v + ', w=' + items[step.item].w + ')' +
      (!step.aspiration_used ? ' &nbsp;|&nbsp; não-tabu' : ' &nbsp;|&nbsp; <strong style="color:#EF9F27">tabu + aspiração</strong>') +
      '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:3px 6px;font-weight:400;text-align:left"></th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:left">itens</th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">peso</th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">valor</th></tr></thead><tbody>';
    var selAfter = [];
    for (var i=0;i<step.x_after.length;i++) if(step.x_after[i]) selAfter.push(i+1);
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">antes</td>' +
      '<td style="padding:3px 6px">[' + selBefore.join(', ') + ']</td>' +
      '<td style="text-align:right;padding:3px 6px">' + step.w_before + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + step.val_before + '</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3);background:var(--warn-bg)">' +
      '<td style="padding:3px 6px;color:var(--warn);font-weight:600">depois</td>' +
      '<td style="padding:3px 6px;font-weight:600;color:var(--warn)">[' + selAfter.join(', ') + ']</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + step.w_after + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' + step.val_after + '</td></tr>';
    html += '</tbody></table>' + asp;
    if (step.is_new_best) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);' +
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">' +
        '🏆 Nova melhor solução! valor=' + step.val_after + '</div>';
    }
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar lista tabu</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Adicionar item ' + (step.item+1) + ' com tenure k=' + cfg.k + '<br>' +
      'Decrementar todos os outros; remover se chegar a 0</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="padding:3px 6px;font-weight:400">item</th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400">antes</th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400;color:var(--warn)">depois</th>' +
      '</tr></thead><tbody>';
    var allKeys = new Set(Object.keys(step.tabu_before).map(Number));
    allKeys.add(step.item);
    allKeys.forEach(function(ki) {
      var before = step.tabu_before[ki] || 0;
      var after  = step.tabu_after[ki]  || 0;
      var isNew  = ki === step.item;
      html += '<tr style="border-top:0.5px solid var(--border3)' + (isNew?';background:var(--warn-bg)':'') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">item ' + (ki+1) + (isNew?' ← novo':'') + '</td>' +
        '<td style="text-align:center;padding:3px 6px">' + (before||'—') + '</td>' +
        '<td style="text-align:center;padding:3px 6px;font-weight:' + (isNew?700:400) + ';' +
          'color:' + (isNew?'var(--warn)':(after===0?'var(--text3)':'inherit')) + '">' +
          (after===0?'removido':after) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function buildKsSummaryPanel(exData) {
  var items = exData.items;
  var sel   = [];
  for (var i=0;i<exData.best_x.length;i++) if(exData.best_x[i]) sel.push(i+1);

  var html = '<div class="card"><div class="ct">🏆 Melhor solução — Busca Tabu Mochila · k=' +
    exData.config.k + ' · ' + exData.steps.length + ' iterações</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);' +
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">' +
    'Itens selecionados: [' + sel.join(', ') + ']<br>' +
    '📦 Peso: <strong>' + exData.best_w + ' / ' + exData.capacity + '</strong>' +
    ' &nbsp;|&nbsp; 💰 Valor: <strong>' + exData.best_val + '</strong></div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Histórico:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 5px;font-weight:400;text-align:left">iter</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:left">move</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:left">item</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:right">peso</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:right">valor</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:center">melhor?</th>' +
    '</tr></thead><tbody>';
  exData.steps.forEach(function(s) {
    html += '<tr style="border-top:0.5px solid var(--border3)' + (s.is_new_best?';background:var(--success-bg)':'') + '">' +
      '<td style="padding:2px 5px;color:var(--text3)">' + s.iter + '</td>' +
      '<td style="padding:2px 5px">' + s.action + '</td>' +
      '<td style="padding:2px 5px">item ' + (s.item+1) +
        (s.aspiration_used?' <span style="color:#EF9F27">⭐</span>':'') +
        (s.was_tabu?' <span style="color:#e53e3e;font-size:9px">[tabu]</span>':'') + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + s.w_after + '</td>' +
      '<td style="text-align:right;padding:2px 5px;' + (s.is_new_best?'font-weight:700;color:var(--success)':'') + '">' +
        s.val_after + '</td>' +
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">' + (s.is_new_best?'✓':'') + '</td></tr>';
  });
  html += '</tbody></table>';

  html += '<div style="margin-top:12px;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">Itens selecionados:</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)"><th style="padding:2px 5px;font-weight:400">item</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">peso</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">valor</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">v/p</th></tr></thead><tbody>';
  sel.forEach(function(id) {
    var it = items[id-1];
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px">' + id + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + it.w + '</td>' +
      '<td style="text-align:right;padding:2px 5px;font-weight:600">' + it.v + '</td>' +
      '<td style="text-align:right;padding:2px 5px;color:var(--text3)">' +
        (it.v/it.w).toFixed(3) + '</td></tr>';
  });
  html += '<tr style="border-top:1px solid var(--border2);font-weight:700"><td style="padding:2px 5px">Total</td>' +
    '<td style="text-align:right;padding:2px 5px">' + exData.best_w + '</td>' +
    '<td style="text-align:right;padding:2px 5px;color:var(--success)">' + exData.best_val + '</td>' +
    '<td></td></tr>';
  html += '</tbody></table></div>';
  return html;
}
