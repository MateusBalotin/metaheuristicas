function TtCanvas(canvasEl) {
  this.cv  = canvasEl;
  this.ctx = canvasEl.getContext('2d');
  this.CW  = canvasEl.width;
  this.CH  = canvasEl.height;
}

TtCanvas.prototype.isDk = function() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
};

TtCanvas.prototype.xy = function(coords, name) {
  var PAD = 42;
  var c = coords[name];
  var x = PAD + (c[0] - 3.0) / (8.0 - 3.0) * (this.CW - 2*PAD);
  var y = this.CH - PAD - (c[1] - 1.2) / (9.2 - 1.2) * (this.CH - 2*PAD);
  return [x, y];
};

TtCanvas.prototype.drawTour = function(coords, tour, color, dashed, width) {
  var ctx = this.ctx;
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 1.5;
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.beginPath();
  for (var i = 0; i <= tour.length; i++) {
    var p = this.xy(coords, tour[i % tour.length]);
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
};

TtCanvas.prototype.draw = function(exData, tour, bestTour, hl) {
  var dk = this.isDk(), ctx = this.ctx, CW = this.CW, CH = this.CH;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8';
  ctx.fillRect(0, 0, CW, CH);

  var coords = exData.coords;
  if (bestTour) this.drawTour(coords, bestTour, 'rgba(20,150,40,0.7)', false, 2);
  if (tour)     this.drawTour(coords, tour, dk ? '#6aa5d8' : '#4a7090', true, 1.5);

  var self = this;
  exData.names.forEach(function(name) {
    var p = self.xy(coords, name);
    var isHl = hl && hl.indexOf(name) !== -1;
    ctx.beginPath();
    ctx.arc(p[0], p[1], isHl ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isHl ? '#EF9F27' : (dk ? '#4a9eff' : '#3a7fd4');
    ctx.fill();
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.font = (isHl ? 'bold ' : '') + '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, p[0], p[1] - 11);
  });
};

function tt_tourStr(t) { return t.join('–') + '–' + t[0]; }

function tt_tabuStr(tabu) {
  var ks = Object.keys(tabu);
  if (!ks.length) return 'vazia';
  return ks.map(function(k){
    return k.replace('_', '-') + '=' + tabu[k];
  }).join('  ');
}

function tt_phaseLabel(names, phase) {
  var html = '<div style="display:flex;gap:5px;margin:0 0 10px;flex-wrap:wrap">';
  names.forEach(function(nm, i) {
    var active = i === phase;
    html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;' +
      'border:0.5px solid var(--' + (active?'border2':'border3') + ');' +
      'background:' + (active?'var(--bg2)':'transparent') + ';' +
      'color:' + (active?'var(--text)':'var(--text3)') + ';">' +
      (i+1) + '. ' + nm + '</span>';
  });
  return html + '</div>';
}

function tt_buildTabuPanel(step, phase, cfg) {
  var html = tt_phaseLabel(['lista de 3 movimentos','escolher movimento','tabu + erro'], phase);

  html += '<div class="card"><div class="ct">Busca Tabu — Iteração ' + step.iter +
    ' &nbsp;|&nbsp; tenure=' + cfg.tenure + '</div>' +
    '<div style="font-family:monospace;font-size:11px;line-height:1.9;color:var(--text2)">' +
    'S' + step.iter + ' = ' + tt_tourStr(step.S_before) +
    '  ·  custo = ' + step.cost_before.toFixed(1) + '<br>' +
    'Lista tabu: ' + tt_tabuStr(step.tabu_before) +
    '</div></div>';

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — Lista de 3 movimentos (trocas de cidades, A fixa)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">troca</th>' +
      '<th style="text-align:left;padding:2px 5px;font-weight:400">rota resultante</th>' +
      '<th style="text-align:right;padding:2px 5px;font-weight:400">custo</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">tabu?</th>' +
      '<th style="text-align:center;padding:2px 5px;font-weight:400">aspiração?</th>' +
      '</tr></thead><tbody>';
    step.candidates.forEach(function(m) {
      var chosen = m.key === step.move_key;
      html += '<tr style="border-top:0.5px solid var(--border3)' +
        (chosen ? ';background:var(--warn-bg)' : '') + '">' +
        '<td style="padding:2px 5px">' + m.cities[0] + '-' + m.cities[1] + '</td>' +
        '<td style="padding:2px 5px">' + tt_tourStr(m.tour) + '</td>' +
        '<td style="text-align:right;padding:2px 5px;font-weight:' + (chosen?700:400) +
          ';color:' + (chosen?'var(--warn)':'inherit') + '">' + m.cost.toFixed(1) + '</td>' +
        '<td style="text-align:center;padding:2px 5px;color:' +
          (m.is_tabu?'#e53e3e':'var(--success)') + '">' + (m.is_tabu?'sim':'não') + '</td>' +
        '<td style="text-align:center;padding:2px 5px;color:' +
          (m.is_tabu && m.aspiration?'#EF9F27':'var(--text3)') + '">' +
          (m.is_tabu ? (m.aspiration?'⭐ sim':'não') : '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';

  } else if (phase === 1) {
    html += '<div class="card"><div class="ct">Passo 2 — Movimento escolhido</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'troca ' + step.move_cities[0] + '-' + step.move_cities[1] +
      (step.aspiration_used
        ? ' &nbsp;|&nbsp; <strong style="color:#EF9F27">tabu + aspiração</strong>'
        : ' &nbsp;|&nbsp; melhor movimento não-tabu') + '</div>';
    html += '<div class="deriv">' +
      '<span>S' + step.iter + '   = ' + tt_tourStr(step.S_before) +
      '  custo = ' + step.cost_before.toFixed(1) + '</span>' +
      '<span>S' + (step.iter+1) + ' = <strong>' + tt_tourStr(step.S_after) +
      '</strong>  custo = <strong>' + step.cost_after.toFixed(1) + '</strong></span>' +
      '</div>';
    if (step.aspiration_used) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:rgba(239,159,39,0.1);' +
        'border:0.5px solid #EF9F27;font-family:monospace;font-size:11px;color:#EF9F27">' +
        '⭐ Critério de aspiração — a troca ' + step.move_cities[0] + '-' + step.move_cities[1] +
        ' está na lista tabu, mas ' + step.cost_after.toFixed(1) + ' &lt; ' +
        step.cost_before.toFixed(1) + ' melhora a melhor solução</div>';
    }
    if (step.is_new_best) {
      html += '<div style="margin-top:8px;padding:6px 10px;border-radius:6px;background:var(--success-bg);' +
        'border:0.5px solid var(--success);font-family:monospace;font-size:11px;color:var(--success)">' +
        '🏆 Nova melhor solução! custo=' + step.cost_after.toFixed(1) + '</div>';
    }
    html += '</div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 3 — Atualizar lista tabu</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Adicionar troca ' + step.move_key.replace('_','-') + ' com tenure=' + cfg.tenure +
      '<br>Decrementar as demais; remover se chegar a 0</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
    html += '<thead><tr style="color:var(--text3)">' +
      '<th style="padding:3px 6px;font-weight:400">troca</th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400">antes</th>' +
      '<th style="text-align:center;padding:3px 6px;font-weight:400;color:var(--warn)">depois</th>' +
      '</tr></thead><tbody>';
    var allKeys = Object.keys(step.tabu_before);
    if (allKeys.indexOf(step.move_key) === -1) allKeys.push(step.move_key);
    allKeys.forEach(function(k) {
      var before = step.tabu_before[k] || 0;
      var after  = step.tabu_after[k]  || 0;
      var isNew  = k === step.move_key;
      html += '<tr style="border-top:0.5px solid var(--border3)' + (isNew?';background:var(--warn-bg)':'') + '">' +
        '<td style="padding:3px 6px;color:var(--text3)">' + k.replace('_','-') + (isNew?' ← novo':'') + '</td>' +
        '<td style="text-align:center;padding:3px 6px">' + (before||'—') + '</td>' +
        '<td style="text-align:center;padding:3px 6px;font-weight:' + (isNew?700:400) + ';' +
          'color:' + (isNew?'var(--warn)':(after===0?'var(--text3)':'inherit')) + '">' +
          (after===0?'removido':after) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="margin-top:10px" class="deriv">' +
      '<span>Erro da iteração ' + step.iter + ' (vs custo ótimo = ' + cfg.custo_otimo + '):</span>' +
      '<span>erro = custo − custo* = ' + step.cost_after.toFixed(1) + ' − ' + cfg.custo_otimo +
      ' = <strong>' + step.erro.toFixed(1) + '</strong></span>' +
      '</div>';
    html += '</div>';
  }
  return html;
}

function tt_popTable(rows, withProb) {
  var html = '<table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:11px">';
  html += '<thead><tr style="color:var(--text3)">' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400"></th>' +
    '<th style="text-align:left;padding:2px 5px;font-weight:400">rota</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">custo</th>' +
    '<th style="text-align:right;padding:2px 5px;font-weight:400">fitness</th>' +
    (withProb
      ? '<th style="text-align:right;padding:2px 5px;font-weight:400">prob</th>' +
        '<th style="text-align:right;padding:2px 5px;font-weight:400">acum</th>'
      : '<th style="text-align:right;padding:2px 5px;font-weight:400">erro</th>') +
    '</tr></thead><tbody>';
  rows.forEach(function(r) {
    html += '<tr style="border-top:0.5px solid var(--border3)">' +
      '<td style="padding:2px 5px;color:var(--text3)">' + r.label + '</td>' +
      '<td style="padding:2px 5px">' + tt_tourStr(r.tour) + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + r.cost.toFixed(1) + '</td>' +
      '<td style="text-align:right;padding:2px 5px">' + r.fit.toFixed(1) + '</td>' +
      (withProb
        ? '<td style="text-align:right;padding:2px 5px">' + r.prob.toFixed(3) + '</td>' +
          '<td style="text-align:right;padding:2px 5px">' + r.cum.toFixed(3) + '</td>'
        : '<td style="text-align:right;padding:2px 5px">' + r.erro.toFixed(1) + '</td>') +
      '</tr>';
  });
  return html + '</tbody></table>';
}

function tt_buildGaPanel(ga, phase, cfg) {
  var html = tt_phaseLabel(['fitness e seleção','cruzamento OX','mutação','nova população'], phase);

  if (phase === 0) {
    html += '<div class="card"><div class="ct">Passo 1 — População inicial {S₄, S₅, S₆} e fitness</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'fitness = (custo_pior − custo) + 1 &nbsp;·&nbsp; minimização via roleta</div>';
    html += tt_popTable(ga.pop_ini, true);
    html += '<div style="margin-top:10px" class="deriv">' +
      '<span>Seleção por roleta (números sorteados):</span>' +
      '<span>r₁ = ' + ga.r_sel[0].toFixed(2) + ' → <strong>' +
        ga.pop_ini[ga.i_p1].label + '</strong> (pai 1)</span>' +
      '<span>r₂ = ' + ga.r_sel[1].toFixed(2) + ' → <strong>' +
        ga.pop_ini[ga.i_p2].label + '</strong> (pai 2)</span>' +
      '</div></div>';

  } else if (phase === 1) {
    var c1 = ga.ox_cuts[0], c2 = ga.ox_cuts[1];
    var p1 = ga.pop_ini[ga.i_p1], p2 = ga.pop_ini[ga.i_p2];
    var seg = p1.tour.slice(c1, c2+1);
    html += '<div class="card"><div class="ct">Passo 2 — Cruzamento OX (Order Crossover)</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Pontos de corte: posições ' + (c1+1) + ' e ' + (c2+1) +
      ' · segmento do pai 1 é copiado, restante preenchido na ordem do pai 2</div>';
    html += '<div class="deriv">' +
      '<span>Pai 1 (' + p1.label + '): ' + p1.tour.map(function(g, i){
        return (i>=c1 && i<=c2) ? '<strong style="color:var(--warn)">'+g+'</strong>' : g;
      }).join('–') + '</span>' +
      '<span>Pai 2 (' + p2.label + '): ' + p2.tour.join('–') + '</span>' +
      '<span>Segmento herdado: [' + seg.join(', ') + ']</span>' +
      '<span>Preenchimento (ordem do pai 2): ' +
        p2.tour.filter(function(g){ return seg.indexOf(g) === -1; }).join(', ') + '</span>' +
      '<span>Filho = <strong>' + tt_tourStr(ga.child.tour) +
        '</strong>  custo = <strong>' + ga.child.cost.toFixed(1) + '</strong></span>' +
      '</div></div>';

  } else if (phase === 2) {
    var base = ga.pop_ini[ga.i_mut];
    html += '<div class="card"><div class="ct">Passo 3 — Mutação por troca</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'r₃ = ' + ga.r_sel[2].toFixed(2) + ' → ' + base.label +
      ' · trocar posições ' + (ga.mut_pos[0]+1) + ' e ' + (ga.mut_pos[1]+1) + '</div>';
    html += '<div class="deriv">' +
      '<span>' + base.label + ':  ' + base.tour.map(function(g, i){
        return (i===ga.mut_pos[0] || i===ga.mut_pos[1])
          ? '<strong style="color:var(--warn)">'+g+'</strong>' : g;
      }).join('–') + '   custo = ' + base.cost.toFixed(1) + '</span>' +
      '<span>Mutante: <strong>' + tt_tourStr(ga.mut.tour) +
        '</strong>  custo = <strong>' + ga.mut.cost.toFixed(1) + '</strong></span>' +
      '</div></div>';

  } else {
    html += '<div class="card"><div class="ct">Passo 4 — Nova população (elitismo) e fitness</div>';
    html += '<div style="font-family:monospace;font-size:11px;color:var(--text3);margin-bottom:8px">' +
      'Mantém o melhor da população anterior (' + ga.pop_ini[ga.i_elite].label +
      ') e substitui os demais pelo filho e pelo mutante</div>';
    html += tt_popTable(ga.new_pop, false);
    html += '<div style="margin-top:10px;padding:8px 12px;border-radius:6px;background:var(--success-bg);' +
      'border:0.5px solid var(--success);font-family:monospace;font-size:12px;color:var(--success)">' +
      '🏆 Melhor solução: <strong>' + ga.best.label + ' = ' + tt_tourStr(ga.best.tour) +
      '</strong>  custo = <strong>' + ga.best.cost.toFixed(1) + '</strong>' +
      ' &nbsp;(erro = ' + ga.best.erro.toFixed(1) + ' vs custo ótimo ' + cfg.custo_otimo + ')</div>';
    html += '</div>';
  }
  return html;
}

function tt_buildSummaryPanel(exData) {
  var cfg = exData.config;
  var html = '<div class="card"><div class="ct">🏆 Resumo — Questão 2</div>';
  html += '<div style="font-family:monospace;font-size:11px;line-height:2;color:var(--text2)">' +
    '<strong>2.1 Busca Tabu</strong><br>' +
    'S₄ = ' + tt_tourStr(exData.S4) + '  custo = ' + exData.S4_cost.toFixed(1) + '<br>';
  exData.tabu.steps.forEach(function(s) {
    html += 'S' + (s.iter+1) + ' = ' + tt_tourStr(s.S_after) +
      '  custo = ' + s.cost_after.toFixed(1) +
      '  erro = ' + s.erro.toFixed(1) +
      (s.aspiration_used ? '  <span style="color:#EF9F27">⭐ aspiração</span>' : '') + '<br>';
  });
  html += '<br><strong>2.2 Algoritmo Genético</strong><br>' +
    'Filho (OX)  = ' + tt_tourStr(exData.ga.child.tour) +
      '  custo = ' + exData.ga.child.cost.toFixed(1) + '<br>' +
    'Mutante     = ' + tt_tourStr(exData.ga.mut.tour) +
      '  custo = ' + exData.ga.mut.cost.toFixed(1) + '<br>' +
    '</div>';
  html += '<div style="margin-top:10px;padding:8px 12px;border-radius:6px;background:var(--success-bg);' +
    'border:0.5px solid var(--success);font-family:monospace;font-size:12px;color:var(--success)">' +
    'Melhor solução encontrada: <strong>' + exData.ga.best.label + ' = ' +
    tt_tourStr(exData.ga.best.tour) + '</strong><br>custo = <strong>' +
    exData.ga.best.cost.toFixed(1) + '</strong> = custo ótimo (' + cfg.custo_otimo + ') · erro = 0</div>';
  html += '</div>';
  return html;
}

function tt_buildIntroPanel(cfg) {
  var S = 'font-size:11.5px;line-height:1.9;color:var(--text2)';
  var html = '<span class="badge b3">Passo 0 — decisões da resolução</span>';

  html += '<div class="card"><div class="ct">2.1 Movimentos e lista de candidatos</div>' +
    '<div style="' + S + '">' +
    'Movimento: troca de duas cidades na rota, mantendo <strong>A fixa</strong> na primeira posição. ' +
    'Isso elimina rotas equivalentes por rotação e é consistente com a lista tabu dada, ' +
    'cujos pares não envolvem A. São C(5,2) = 10 trocas por iteração; a lista de candidatos reúne as ' +
    '<strong>3 de menor custo</strong>, com desempate por regra fixa (custo e posições). ' +
    'O melhor custo conhecido no início da iteração 4 é o de S₄ (47,4), leitura natural de uma trajetória em melhora.' +
    '</div></div>';

  html += '<div class="card"><div class="ct">2.1 Tabu, tenure e aspiração</div>' +
    '<div style="' + S + '">' +
    'Escolhe-se o melhor candidato não-tabu, ou um candidato tabu cujo custo supere o melhor já visto ' +
    '(critério de aspiração). Atualização da lista: todas as tenures caem 1, saem as que zeram e a troca ' +
    'executada entra com tenure ' + cfg.tenure + ', o mesmo esquema da lista dada {B-E:2, C-E:3, E-F:1}. ' +
    'Na iteração 5 a melhor troca (B-E, custo 29,7) está proibida, mas como 29,7 &lt; 36,9 ela entra pelo ' +
    'critério de aspiração.' +
    '</div></div>';

  html += '<div class="card"><div class="ct">2.2 Algoritmo Genético</div>' +
    '<div style="' + S + '">' +
    'População = {S₄, S₅, S₆}. Fitness para minimização com roleta: (custo do pior − custo) + 1, ' +
    'a mesma transformação da Atividade 13. Os sorteios da roleta são declarados para a resolução poder ' +
    'ser conferida à mão: r = 0,45 seleciona S₆ (pai 1), 0,25 seleciona S₅ (pai 2) e 0,10 seleciona S₅ ' +
    '(base da mutação). Cruzamento OX com cortes nas posições 4 e 5: copia o segmento do pai 1 e completa ' +
    'na ordem do pai 2. Mutação por troca das posições 2 e 3. Nova população com elitismo: o melhor da ' +
    'geração anterior (S₆) é preservado e o filho e o mutante substituem os dois piores.' +
    '</div></div>';

  html += '<div class="card"><div class="ct">Erro e desenho</div>' +
    '<div style="' + S + '">' +
    'erro = custo − 28,1, onde 28,1 é o custo ótimo obtido por enumeração completa das 60 rotas distintas. ' +
    'As coordenadas das cidades no desenho são apenas ilustrativas; todos os custos vêm da matriz do enunciado.' +
    '</div></div>';

  return html;
}
