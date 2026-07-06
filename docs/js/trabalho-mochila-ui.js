var TM_COMP_COLORS   = ['#3a7fd4', '#2d9e78', '#8b5cf6'];
var TM_COMP_COLORS_D = ['#4a9eff', '#5DCAA5', '#a78bfa'];

function tm_moveName(orig, dest) {
  if (orig === 0) return 'insere → comp ' + dest;
  if (dest === 0) return 'remove do comp ' + orig;
  return 'move comp ' + orig + ' → ' + dest;
}

function TmCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

TmCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

TmCanvas.prototype.draw = function(exData, step) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var cfg = exData.config;
  var a = step ? step.a_after : exData.best_a;
  var w = step ? step.w_after : exData.best_w;
  var changed = step ? step.item : -1;
  var colors = dk ? TM_COMP_COLORS_D : TM_COMP_COLORS;
  var offCol = dk ? '#2a2a28' : '#e8e6e0';

  var n = TM_N, PAD = 30, GAP = 3;
  var barW = Math.floor((CW - 2*PAD - (n-1)*GAP) / n);
  var maxV = Math.max.apply(null, exData.v);
  var maxP = Math.max.apply(null, exData.p);
  var CHART_H = 92;
  var TOP1 = 26, TOP2 = TOP1 + CHART_H + 34;

  ctx.fillStyle = '#888780';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Valor vⱼ', PAD, TOP1 - 6);
  ctx.fillText('Peso pⱼ', PAD, TOP2 - 6);

  for (var i = 0; i < n; i++) {
    var bx = PAD + i * (barW + GAP);
    var comp = a[i];
    var isCh = i === changed;
    var col  = isCh ? '#EF9F27' : (comp > 0 ? colors[comp-1] : offCol);

    var vH = Math.max(2, Math.round(exData.v[i] / maxV * CHART_H));
    ctx.fillStyle = col;
    ctx.fillRect(bx, TOP1 + CHART_H - vH, barW, vH);

    var pH = Math.max(2, Math.round(exData.p[i] / maxP * CHART_H));
    ctx.fillStyle = col;
    ctx.fillRect(bx, TOP2 + CHART_H - pH, barW, pH);

    ctx.fillStyle = isCh ? '#EF9F27'
      : (comp > 0 ? (dk?'#e8e6de':'#1a1a18') : '#888780');
    ctx.font = (isCh ? 'bold ' : '') + '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, bx + barW/2, TOP2 + CHART_H + 12);
  }

  var GY = TOP2 + CHART_H + 30;
  var gW = CW - 2*PAD, gH = 16, gGap = 26;
  for (var c = 0; c < TM_K; c++) {
    var y = GY + c * gGap;
    ctx.fillStyle = dk ? '#2a2a28' : '#eae9e5';
    ctx.fillRect(PAD, y, gW, gH);
    var frac = Math.min(1, w[c] / cfg.P_comp[c]);
    ctx.fillStyle = w[c] > cfg.P_comp[c] ? '#e53e3e' : colors[c];
    ctx.fillRect(PAD, y, Math.round(gW * frac), gH);
    ctx.strokeStyle = dk ? '#4a4a46' : '#c8c6be';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD + 0.5, y + 0.5, gW - 1, gH - 1);
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('P' + (c+1) + ': ' + w[c] + ' / ' + cfg.P_comp[c],
                 PAD + 5, y + 12);
  }
  var yT = GY + TM_K * gGap;
  var W  = w[0] + w[1] + w[2];
  ctx.fillStyle = dk ? '#2a2a28' : '#eae9e5';
  ctx.fillRect(PAD, yT, gW, gH);
  ctx.fillStyle = W > cfg.P_total ? '#e53e3e' : (dk ? '#888780' : '#5a5a56');
  ctx.fillRect(PAD, yT, Math.round(gW * Math.min(1, W / cfg.P_total)), gH);
  ctx.strokeStyle = dk ? '#4a4a46' : '#c8c6be';
  ctx.strokeRect(PAD + 0.5, yT + 0.5, gW - 1, gH - 1);
  ctx.fillStyle = dk ? '#e8e6de' : '#fafaf8';
  ctx.font = '10px monospace';
  ctx.fillText('P_TOTAL: ' + W + ' / ' + cfg.P_total, PAD + 5, yT + 12);
};

function tm_phaseLabel(phase) {
  var labels = [['1','avaliar vizinhança','b1'],['2','escolher movimento','b2'],['3','tabu + erro','b4']];
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

function tm_solStr(a) {
  var comps = [[], [], []];
  for (var j = 0; j < a.length; j++) if (a[j] > 0) comps[a[j]-1].push(j+1);
  return comps.map(function(c, i) {
    return 'C' + (i+1) + '=[' + c.join(',') + ']';
  }).join(' · ');
}

function tm_buildPanel(step, phase, cfg) {
  var html = tm_phaseLabel(phase);

  html += '<div class="card"><div class="ct">Iteração ' + step.iter + ' / ' + cfg.max_iter +
    ' &nbsp;|&nbsp; k=' + cfg.k + ' &nbsp;|&nbsp; μ=' + cfg.mu +
    ' &nbsp;|&nbsp; FO atual: <strong>' + step.f_before.toFixed(1) + '</strong></div>' +
    '<div style="font-family:monospace;font-size:11px;line-height:1.9;color:var(--text2)">' +
    'a (vetor de alocação): ' + tm_solStr(step.a_before) + '<br>' +
    'pesos: [' + step.w_before.join(', ') + ']  ·  penalidade: ' + step.pen_before.toFixed(1) +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Top 5 movimentos por FO = valor − <span style="text-transform:none">μ</span>·excesso</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Movimento: alterar aⱼ (inserir, remover ou mover item entre compartimentos)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">movimento</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">valor</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">pen</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">FO</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">tabu?</th>' +
      '</tr></thead><tbody>';
    step.top5.forEach(function(m, idx) {
      var chosen = m.item === step.item && m.dest === step.dest;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (chosen ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:2px 5px">item ' + (m.item+1) +
          ' (v=' + TM_V[m.item] + ' p=' + TM_P[m.item] + '): ' +
          tm_moveName(m.orig, m.dest) + '</td>' +
        '<td style="text-align:right;padding:2px 5px">' + m.val + '</td>' +
        '<td style="text-align:right;padding:2px 5px;color:' +
          (m.pen>0?'#e53e3e':'var(--text3)') + '">' + m.pen.toFixed(1) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:' + (chosen?700:400) +
          ';color:' + (chosen?'var(--warn)':'inherit') + '">' + m.f.toFixed(1) + '</td>' +
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
      'item ' + (step.item+1) + ' (v=' + TM_V[step.item] + ', p=' + TM_P[step.item] + '): ' +
      tm_moveName(step.orig, step.dest) +
      (!step.aspiration_used ? ' &nbsp;|&nbsp; não-tabu' : '') + '</div>';
    html += '<div class="deriv">' +
      '<span>f(a) = Σ vⱼ·[aⱼ>0] − μ·(Σᵢ max(0, wᵢ−Pᵢ) + max(0, W−P_TOTAL))</span>' +
      '<span>valor = ' + step.val_after +
      '  ·  pesos = [' + step.w_after.join(', ') + ']  ·  W = ' + step.W_after + '</span>' +
      '<span>penalidade = ' + cfg.mu + ' × ' + step.pen_after.toFixed(1) +
      '  →  <strong>FO = ' + step.f_after.toFixed(1) + '</strong></span>' +
      '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)"><th style="padding:3px 6px;font-weight:400;text-align:left"></th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">FO</th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">valor</th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">pen</th>' +
      '<th style="padding:3px 6px;font-weight:400;text-align:right">W</th></tr></thead><tbody>';
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:3px 6px;color:var(--text3)">antes</td>' +
      '<td style="text-align:right;padding:3px 6px">' + step.f_before.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + step.val_before + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' + step.pen_before.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px">' +
        (step.w_before[0]+step.w_before[1]+step.w_before[2]) + '</td></tr>';
    html += '<tr style="border-top:0.5px solid var(--border3);background:var(--warn-bg)">' +
      '<td style="padding:3px 6px;color:var(--warn);font-weight:600">depois</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:700;color:var(--warn)">' + step.f_after.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + step.val_after + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + step.pen_after.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:3px 6px;font-weight:600;color:var(--warn)">' + step.W_after + '</td></tr>';
    html += '</tbody></table>' + asp;
    if (step.is_new_best) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);' +
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">' +
        '🏆 Nova melhor solução! FO=' + step.f_after.toFixed(1) + '</div>';
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
    var allKeys = Object.keys(step.tabu_before).map(Number);
    if (allKeys.indexOf(step.item) === -1) allKeys.push(step.item);
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
    html += '</tbody></table>';
    html += '<div style="margin-top:10px" class="deriv">' +
      '<span>Erro da iteração ' + step.iter + ' (vs FO* = ' + cfg.fo_ref + '):</span>' +
      '<span>erro = FO* − FO = ' + cfg.fo_ref + ' − ' + step.f_after.toFixed(1) +
      ' = <strong>' + step.erro.toFixed(1) + '</strong></span>' +
      '<span>melhor FO até aqui: ' + step.best_f.toFixed(1) + '</span>' +
      '</div>';
    html += '</div>';
  }
  return html;
}

function tm_buildSummaryPanel(exData) {
  var cfg = exData.config;
  var comps = [[], [], []];
  for (var j = 0; j < exData.best_a.length; j++)
    if (exData.best_a[j] > 0) comps[exData.best_a[j]-1].push(j+1);

  var html = '<div class="card"><div class="ct">🏆 Melhor solução — Busca Tabu · k=' +
    cfg.k + ' · ' + exData.steps.length + ' iterações</div>';
  html += '<div style="font-family:monospace;font-size:12px;padding:8px 12px;background:var(--success-bg);' +
    'border-radius:6px;border:0.5px solid var(--success);color:var(--success);margin-bottom:12px">' +
    comps.map(function(c, i){
      var wi = c.reduce(function(s, id){ return s + TM_P[id-1]; }, 0);
      return 'Compartimento ' + (i+1) + ' [' + c.join(', ') + ']  peso ' +
        wi + '/' + cfg.P_comp[i];
    }).join('<br>') + '<br>' +
    '📦 Peso total: <strong>' + exData.best_W + ' / ' + cfg.P_total + '</strong>' +
    ' &nbsp;|&nbsp; 💰 FO: <strong>' + exData.best_f.toFixed(1) + '</strong>' +
    ' &nbsp;|&nbsp; erro final: <strong>' + exData.erro_final.toFixed(1) + '</strong></div>';

  html += '<div style="font-size:11px;font-weight:500;color:var(--text2);margin-bottom:6px">' +
    'Evolução (erro = FO* − FO, com FO* = ' + cfg.fo_ref + '):</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="padding:2px 5px;font-weight:400;text-align:left">iter</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:left">movimento</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:right">FO</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:right">pen</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:right">erro</th>' +
    '<th style="padding:2px 5px;font-weight:400;text-align:center">melhor?</th>' +
    '</tr></thead><tbody>';
  exData.steps.forEach(function(s) {
    html += '<tr style="border-top:0.5px solid var(--border3)' + (s.is_new_best?';background:var(--success-bg)':'') + '">' +
      '<td style="padding:2px 5px;color:var(--text3)">' + s.iter + '</td>' +
      '<td style="padding:2px 5px">item ' + (s.item+1) + ': ' + tm_moveName(s.orig, s.dest) +
        (s.aspiration_used?' <span style="color:#EF9F27">⭐</span>':'') + '</td>' +
      '<td style="text-align:right;padding:2px 5px;' + (s.is_new_best?'font-weight:700;color:var(--success)':'') + '">' +
        s.f_after.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:2px 5px;color:' + (s.pen_after>0?'#e53e3e':'var(--text3)') + '">' +
        s.pen_after.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + s.erro.toFixed(1) + '</td>' +
      '<td style="text-align:center;padding:2px 5px;color:var(--success)">' + (s.is_new_best?'✓':'') + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function tm_buildIntroPanel(cfg) {
  var S = 'font-size:11.5px;line-height:1.9;color:var(--text2)';
  var html = '<span class="badge b3">Passo 0 — decisões da resolução</span>';

  html += '<div class="card"><div class="ct">Representação da solução</div>' +
    '<div style="' + S + '">' +
    'Vetor a = (a₁, …, a₂₀) com aⱼ ∈ {0, 1, 2, 3}: aⱼ = 0 indica que o item j ficou fora da mochila; ' +
    'aⱼ = 1, 2 ou 3 indica o compartimento onde o item j foi colocado. ' +
    'Equivale à matriz binária zᵢⱼ, com a vantagem de que a restrição de cada item ocupar no máximo ' +
    'um compartimento fica satisfeita <strong>por construção</strong>, pois o vetor não coloca o mesmo ' +
    'item em dois lugares. Restam as capacidades, tratadas por penalidade na função de avaliação. ' +
    'Solução inicial: mochila vazia (todos os aⱼ = 0).' +
    '</div></div>';

  html += '<div class="card"><div class="ct">Função de avaliação e a escolha de <span style="text-transform:none">μ</span> = 1</div>' +
    '<div style="' + S + '">' +
    'f(a) = Σⱼ vⱼ·[aⱼ&gt;0] − μ·( Σᵢ max(0, wᵢ − Pᵢ) + max(0, W − P_TOTAL) ). ' +
    'Soluções inviáveis podem ser avaliadas, mas pagam μ por unidade de peso excedente. ' +
    'Como μ = 1 &gt; max(vⱼ/pⱼ) = 8/14 ≈ 0,57, cada unidade de excesso custa mais do que a melhor ' +
    'densidade de valor entre os itens. Para esta instância, o máximo de f coincide com o ótimo viável ' +
    '(FO* = 99, conferido por solver exato), então otimizar f resolve o problema original.' +
    '</div></div>';

  html += '<div class="card"><div class="ct">Vizinhança, lista tabu e aspiração</div>' +
    '<div style="' + S + '">' +
    'Vizinho: alterar <strong>um único</strong> aⱼ, o que cobre inserir o item (0 → 1, 2 ou 3), ' +
    'remover (voltar a 0) e mover de compartimento. São até 60 vizinhos por iteração, todos avaliados. ' +
    'Empates são resolvidos por uma regra fixa (maior FO; depois menor número do item; depois menor compartimento), ' +
    'para a execução ser reproduzível à mão. ' +
    'O atributo tabu é o <strong>item</strong> alterado, o que impede desfazer o movimento logo em seguida. ' +
    'Tenure k = ' + cfg.k + ': a cada iteração as tenures caem 1 e o item escolhido entra com k. ' +
    'Aspiração: um movimento tabu é aceito se a FO resultante superar a melhor FO já vista. ' +
    'Depois de atingir o ótimo, a busca segue em movimentos laterais (FO constante), ' +
    'comportamento esperado da Busca Tabu em platô.' +
    '</div></div>';

  html += '<div class="card"><div class="ct">Erro por iteração</div>' +
    '<div style="' + S + '">' +
    'O erro mostrado ao final de cada iteração é erro = FO* − FO, com FO* = ' + cfg.fo_ref.toFixed(0) +
    ' obtido por solver exato, uma referência calculada fora da metaheurística. ' +
    'Com os parâmetros padrão (k = 3, 20 iterações), a busca atinge FO = 99 na iteração 15 e o erro chega a 0.' +
    '</div></div>';

  return html;
}
