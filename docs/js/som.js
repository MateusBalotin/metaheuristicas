var SOM_EX = {
  map_rows: 2, map_cols: 3, n_inputs: 5,
  alpha: 0.5, n_iters: 3,
  train: [
    {label:'A', x:[1,0,0,0,0]},
    {label:'F', x:[3,1,0,0,0]},
    {label:'K', x:[3,3,1,0,0]},
    {label:'R', x:[3,3,8,0,0]},
    {label:'S', x:[3,3,3,1,0]},
    {label:'1', x:[3,3,6,2,1]},
    {label:'2', x:[3,3,6,2,2]},
  ],
  test: [
    {label:'V', x:[3,3,3,0,0]},
    {label:'6', x:[3,3,6,0,0]},
    {label:'C', x:[4,2,0,0,0]},
    {label:'L', x:[0,6,0,0,0]},
  ],
  init_weights: [
    [0.1,0.2,0.3,0.4,0.5],
    [0.5,0.4,0.3,0.2,0.1],
    [0.3,0.1,0.5,0.2,0.4],
    [0.2,0.5,0.3,0.4,0.1],
    [0.1,0.4,0.3,0.5,0.2],
    [0.5,0.3,0.2,0.1,0.4],
  ],
  positions: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],
};

function som_r6(n) { return Math.round(n*1e6)/1e6; }
function som_r4(n) { return Math.round(n*1e4)/1e4; }
function som_fmt(n){ return (Math.round(n*1e4)/1e4).toString(); }
function som_fmtS(n){ return n>=0?'+'+som_fmt(n):som_fmt(n); }

function som_dist2(x, w) {
  var s=0; for(var j=0;j<x.length;j++) s+=(x[j]-w[j])*(x[j]-w[j]);
  return som_r6(s);
}

function som_gridDist(i, j) {
  var pos = SOM_EX.positions;
  return Math.max(Math.abs(pos[i][0]-pos[j][0]), Math.abs(pos[i][1]-pos[j][1]));
}

function som_neighborhood(winner, radius) {
  var nbrs=[];
  for(var i=0;i<SOM_EX.positions.length;i++)
    if(som_gridDist(winner,i)<=radius) nbrs.push(i);
  return nbrs;
}

function som_radiusForIter(iter, n_iters) {
  return 0; // winner only
}

function som_alphaForIter(alpha0, iter) {
  return som_r6(alpha0 * Math.pow(0.5, iter-1));
}

function som_evalAll(dataset, weights) {
  return dataset.map(function(p) {
    var dists = weights.map(function(w){ return som_dist2(p.x, w); });
    var winner = dists.indexOf(Math.min.apply(null, dists));
    return {label:p.label, x:p.x, dists:dists.map(som_r6), winner:winner, pos:SOM_EX.positions[winner]};
  });
}

function som_run(alpha0, n_iters) {
  var train=SOM_EX.train, test=SOM_EX.test, n_neu=6, n_dim=SOM_EX.n_inputs;
  var W = SOM_EX.init_weights.map(function(r){return r.slice();});
  var initW = W.map(function(r){return r.slice();});
  var steps=[];

  for(var iter=1; iter<=n_iters; iter++) {
    var alpha = som_alphaForIter(alpha0, iter);
    var radius = som_radiusForIter(iter, n_iters);

    for(var pi=0; pi<train.length; pi++) {
      var p = train[pi], x = p.x;
      var wBefore = W.map(function(r){return r.slice();});
      var dists = W.map(function(w){return som_dist2(x,w);});
      var winner = dists.indexOf(Math.min.apply(null,dists));
      var nbrs = som_neighborhood(winner, radius);

      var deltas = [];
      for(var ni=0; ni<n_neu; ni++) {
        if(nbrs.indexOf(ni) !== -1) {
          var old = W[ni].slice();
          var delta = [];
          for(var j=0;j<n_dim;j++) {
            var dv = som_r6(alpha*(x[j]-W[ni][j]));
            delta.push(dv);
            W[ni][j] = som_r6(W[ni][j]+dv);
          }
          deltas.push({neuron:ni, old:old.map(som_r4), delta:delta, new:W[ni].map(som_r4)});
        }
      }

      steps.push({
        iter:iter, pi:pi, pattern:p, alpha:alpha, radius:radius,
        dists:dists.map(som_r6), winner:winner, winner_pos:SOM_EX.positions[winner],
        neighbors:nbrs, deltas:deltas,
        weights_before:wBefore, weights_after:W.map(function(r){return r.slice();})
      });
    }
  }

  return {
    steps:steps, final_weights:W.map(function(r){return r.slice();}),
    init_weights:initW, train_final:som_evalAll(train,W),
    test_results:som_evalAll(test,W),
    config:{map_rows:2,map_cols:3,n_inputs:5,alpha:alpha0,n_iters:n_iters,
            n_train:train.length,n_test:test.length,positions:SOM_EX.positions},
  };
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function som_CanvasRenderer(canvasEl) {
  var self=this;
  self.cv=canvasEl; self.ctx=canvasEl.getContext('2d');
  self.CW=canvasEl.width; self.CH=canvasEl.height;
  self.isDk=function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};
}

som_CanvasRenderer.prototype.draw = function(weights, positions, step, isTest, testResults) {
  var dk=this.isDk(), ctx=this.ctx, CW=this.CW, CH=this.CH;
  var rows=SOM_EX.map_rows, cols=SOM_EX.map_cols, n_dim=SOM_EX.n_inputs;
  ctx.clearRect(0,0,CW,CH);
  ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

  var PAD=28, cellW=(CW-2*PAD)/cols, cellH=(CH-2*PAD-50)/rows;
  var maxW=0;
  weights.forEach(function(w){w.forEach(function(v){if(v>maxW)maxW=v;});});
  if(maxW<1)maxW=1;

  for(var ni=0;ni<rows*cols;ni++){
    var r=positions[ni][0], c=positions[ni][1];
    var bx=PAD+c*cellW+4, by=PAD+r*cellH+4, bw=cellW-8, bh=cellH-8;
    var isWinner=step&&step.winner===ni;
    var isNeighbor=step&&step.neighbors&&step.neighbors.indexOf(ni)!==-1&&!isWinner;
    var bg=dk?'#2a2a28':'#f0eeea';
    if(isWinner) bg=dk?'rgba(239,159,39,0.25)':'rgba(250,199,117,0.45)';
    else if(isNeighbor) bg=dk?'rgba(29,158,117,0.18)':'rgba(29,200,150,0.18)';

    ctx.fillStyle=bg;
    ctx.beginPath();
    var r8=8;
    ctx.moveTo(bx+r8,by); ctx.lineTo(bx+bw-r8,by);
    ctx.arcTo(bx+bw,by,bx+bw,by+r8,r8); ctx.lineTo(bx+bw,by+bh-r8);
    ctx.arcTo(bx+bw,by+bh,bx+bw-r8,by+bh,r8); ctx.lineTo(bx+r8,by+bh);
    ctx.arcTo(bx,by+bh,bx,by+bh-r8,r8); ctx.lineTo(bx,by+r8);
    ctx.arcTo(bx,by,bx+r8,by,r8); ctx.closePath(); ctx.fill();

    ctx.strokeStyle=isWinner?'#EF9F27':(isNeighbor?(dk?'#5DCAA5':'#0F6E56'):(dk?'#3a3a38':'#d8d6d2'));
    ctx.lineWidth=isWinner?2.5:(isNeighbor?2:1); ctx.stroke();

    ctx.fillStyle=dk?'#c2c0b6':'#444441';
    ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('n'+(ni+1), bx+bw/2, by+14);

    var barW=(bw-16)/n_dim, barMaxH=bh-32;
    for(var d=0;d<n_dim;d++){
      var bH=Math.max(1,(weights[ni][d]/maxW)*barMaxH);
      var bX=bx+8+d*barW, bY=by+bh-8-bH;
      ctx.fillStyle=isWinner?'#EF9F27':(dk?'#6d8fa8':'#4a7090');
      ctx.fillRect(bX,bY,barW-2,bH);
    }

    if(isWinner&&step&&step.pattern){
      ctx.fillStyle='#EF9F27'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
      ctx.fillText(step.pattern.label, bx+bw/2, by+bh-4);
    }
  }

  ctx.fillStyle=dk?'#888780':'#888780'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  for(var c2=0;c2<cols;c2++) ctx.fillText('col'+c2, PAD+c2*cellW+cellW/2, PAD-8);
  ctx.textAlign='right';
  for(var r2=0;r2<rows;r2++) ctx.fillText('row'+r2, PAD-4, PAD+r2*cellH+cellH/2+4);

  if(isTest&&testResults){
    ctx.fillStyle=dk?'#888780':'#666'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText('Test: '+testResults.map(function(r){return r.label+'\u2192n'+(r.winner+1);}).join('  '), PAD, CH-10);
  }
};
