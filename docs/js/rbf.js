var RBF_EX = {
  name:    'Activity 4 · Ex5 — RBF Function Approximation',
  canvas:  { x1min:-2.5, x1max:4.5, refX:[-2,-1,0,1,2,3,4],
             ydefMin:-8.0, ydefMax:6.0 },
  train: (function() {
    var pts = [];
    for (var i = 0; i < 21; i++) {
      var x = -2 + i * 0.3;
      pts.push({ n: i + 1, x1: Math.round(x * 1e4) / 1e4,
                 d: Math.round((Math.sin(x) + 4*Math.cos(x) - 1) * 1e6) / 1e6 });
    }
    return pts;
  })(),
};

function rbf_r6(n) { return Math.round(n * 1e6) / 1e6; }
function rbf_r4(n) { return Math.round(n * 1e4) / 1e4; }
function rbf_fmt(n){ var r=rbf_r6(n); return r.toFixed(6).replace(/\.?0+$/,'')||'0'; }
function rbf_fmt4(n){var r=rbf_r4(n); return r.toFixed(4).replace(/\.?0+$/,'')||'0'; }
function rbf_fmtS(n){return n>=0?'+'+rbf_fmt(n):rbf_fmt(n);}

function rbf_rng(seed) {
  var s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rbf_selectCenters(q, seed) {
  var rng = rbf_rng(seed), n = RBF_EX.train.length;
  var idxs = [];
  for (var i = 0; i < n; i++) idxs.push(i);
  for (var i = 0; i < q; i++) {
    var j = i + Math.floor(rng() * (n - i));
    var tmp = idxs[i]; idxs[i] = idxs[j]; idxs[j] = tmp;
  }
  return idxs.slice(0, q).map(function(i) { return RBF_EX.train[i].x1; });
}

function rbf_phi(x, u, sigma) {
  return rbf_r6(Math.exp(-Math.pow(x - u, 2) / (2 * sigma * sigma)));
}

function rbf_matT(A) {
  return A[0].map(function(_, j) { return A.map(function(row) { return row[j]; }); });
}

function rbf_matMul(A, B) {
  return A.map(function(row) {
    return B[0].map(function(_, j) {
      return rbf_r6(row.reduce(function(s, v, k) { return s + v * B[k][j]; }, 0));
    });
  });
}

function rbf_matVec(A, v) {
  return A.map(function(row) { return rbf_r6(row.reduce(function(s, val, k) { return s + val * v[k]; }, 0)); });
}

function rbf_solve(A, b) {
  var n = A.length;
  var M = A.map(function(row, i) { return row.concat([b[i]]); });
  for (var col = 0; col < n; col++) {
    var pivot = col;
    for (var r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    var tmp = M[col]; M[col] = M[pivot]; M[pivot] = tmp;
    var piv = M[col][col];
    for (var row = 0; row < n; row++) {
      if (row === col) continue;
      var f = M[row][col] / piv;
      M[row] = M[row].map(function(v, k) { return v - f * M[col][k]; });
    }
    M[col] = M[col].map(function(v) { return v / piv; });
  }
  return M.map(function(row) { return rbf_r6(row[n]); });
}

function rbf_run(q, sigma, seed) {
  var train   = RBF_EX.train;
  var centers = rbf_selectCenters(q, seed);

  var G_rows = train.map(function(p) {
    return centers.map(function(u) { return rbf_phi(p.x1, u, sigma); }).concat([1.0]);
  });

  var rowDetails = train.map(function(p, i) {
    return {
      n:    p.n,
      x1:   p.x1,
      d:    p.d,
      phis: centers.map(function(u) { return rbf_phi(p.x1, u, sigma); }),
      row:  G_rows[i],
    };
  });

  var GT  = rbf_matT(G_rows);
  var GTG = rbf_matMul(GT, G_rows);
  var d   = train.map(function(p) { return p.d; });
  var GTd = rbf_matVec(GT, d);
  var w   = rbf_solve(GTG, GTd);

  var results = train.map(function(p, i) {
    var y   = rbf_r6(G_rows[i].reduce(function(s, v, j) { return s + v * w[j]; }, 0));
    return { n: p.n, x1: p.x1, d: p.d, y: y, error: rbf_r6(p.d - y) };
  });

  var mse = rbf_r6(results.reduce(function(s, r) { return s + r.error * r.error; }, 0) / results.length);

  return {
    centers: centers, sigma: sigma, q: q, seed: seed,
    G: G_rows, row_details: rowDetails, GTG: GTG, GTd: GTd,
    weights: w, results: results, mse: mse, train: train,
    config: { canvas: RBF_EX.canvas, q: q, sigma: sigma },
  };
}

function rbf_CanvasRenderer(canvasEl) {
  var self = this;
  self.cv  = canvasEl; self.ctx = canvasEl.getContext('2d');
  self.CW  = canvasEl.width; self.CH = canvasEl.height; self.PAD = 52;
  var cfg  = RBF_EX.canvas;

  self.isDk = function() { return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches; };
  self.tx   = function(v) { return self.PAD + (v - cfg.x1min) / (cfg.x1max - cfg.x1min) * (self.CW - 2 * self.PAD); };
  self.ty   = function(v) { return self.CH - self.PAD - (v - cfg.ydefMin) / (cfg.ydefMax - cfg.ydefMin) * (self.CH - 2 * self.PAD); };

  self.fwd  = function(x1, data) {
    var y = data.weights[data.q];
    for (var j = 0; j < data.q; j++)
      y += data.weights[j] * Math.exp(-Math.pow(x1 - data.centers[j], 2) / (2 * data.sigma * data.sigma));
    return y;
  };

  self.draw = function(data, activePi, showCurve) {
    var dk  = self.isDk(), ctx = self.ctx, CW = self.CW, CH = self.CH, PAD = self.PAD;
    var tx  = self.tx, ty = self.ty;

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8'; ctx.fillRect(0, 0, CW, CH);

    // Grid
    var gridC = dk ? 'rgba(200,200,190,0.07)' : 'rgba(0,0,0,0.055)';
    var axC   = dk ? 'rgba(200,200,190,0.22)' : 'rgba(0,0,0,0.18)';
    var txC   = dk ? '#c2c0b6' : '#444441', mutC = dk ? '#888780' : '#888780';
    ctx.strokeStyle = gridC; ctx.lineWidth = 0.5;
    for (var v = -8; v <= 6; v += 2) {
      ctx.beginPath(); ctx.moveTo(PAD, ty(v)); ctx.lineTo(CW - PAD, ty(v)); ctx.stroke();
    }
    for (var xg = -2; xg <= 4; xg++) {
      ctx.beginPath(); ctx.moveTo(tx(xg), PAD); ctx.lineTo(tx(xg), CH - PAD); ctx.stroke();
    }
    // y=0 line
    ctx.lineWidth = 0.7; ctx.setLineDash([3,3]);
    ctx.strokeStyle = dk ? 'rgba(200,200,190,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.moveTo(PAD, ty(0)); ctx.lineTo(CW - PAD, ty(0)); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = axC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, PAD - 5); ctx.lineTo(PAD, CH - PAD + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD - 5, CH - PAD); ctx.lineTo(CW - PAD + 5, CH - PAD); ctx.stroke();
    ctx.fillStyle = txC; ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('x', CW - PAD + 12, CH - PAD + 3);
    ctx.textAlign = 'right'; ctx.fillText('y', PAD - 5, PAD - 12);
    ctx.font = '9px sans-serif'; ctx.fillStyle = mutC;
    ctx.textAlign = 'center';
    for (var xg2 = -2; xg2 <= 4; xg2++) if (xg2 !== 0) ctx.fillText(xg2, tx(xg2), CH - PAD + 13);
    ctx.textAlign = 'right';
    for (var v2 = -8; v2 <= 6; v2 += 2) ctx.fillText(v2, PAD - 4, ty(v2) + 3);

    // Learned curve
    if (showCurve) {
      ctx.beginPath(); ctx.strokeStyle = dk ? '#93c5fd' : '#185FA5'; ctx.lineWidth = 2;
      var started = false;
      for (var k = 0; k <= 500; k++) {
        var xv = cfg.x1min + (k / 500) * (cfg.x1max - cfg.x1min);
        var yv = self.fwd(xv, data);
        if (yv < cfg.ydefMin - 0.5 || yv > cfg.ydefMax + 0.5) { started = false; continue; }
        if (!started) { ctx.moveTo(tx(xv), ty(yv)); started = true; } else ctx.lineTo(tx(xv), ty(yv));
      }
      ctx.stroke();
    }

    // Centers
    for (var j = 0; j < data.centers.length; j++) {
      var cx = tx(data.centers[j]);
      ctx.strokeStyle = dk ? 'rgba(147,197,253,0.5)' : 'rgba(24,95,165,0.3)';
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, PAD); ctx.lineTo(cx, CH - PAD); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = dk ? '#93c5fd' : '#185FA5'; ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center'; ctx.fillText('u' + (j + 1), cx, PAD - 4);
    }

    // Data points
    for (var i = 0; i < data.train.length; i++) {
      var p = data.train[i], ppx = tx(p.x1), ppy = ty(p.d), isCur = i === activePi;
      if (isCur) {
        ctx.beginPath(); ctx.arc(ppx, ppy, 12, 0, Math.PI * 2);
        ctx.fillStyle = dk ? 'rgba(239,159,39,0.28)' : 'rgba(250,199,117,0.55)'; ctx.fill();
        ctx.beginPath(); ctx.arc(ppx, ppy, 13, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(ppx, ppy, 5, 0, Math.PI * 2);
      ctx.fillStyle   = dk ? 'rgba(29,158,117,0.9)' : 'rgba(29,158,117,0.88)';
      ctx.strokeStyle = dk ? '#5DCAA5' : '#0F6E56'; ctx.lineWidth = isCur ? 2.5 : 1.5;
      ctx.fill(); ctx.stroke();
      if (showCurve) {
        var yhat = self.fwd(p.x1, data);
        if (yhat >= cfg.ydefMin - 0.5 && yhat <= cfg.ydefMax + 0.5) {
          ctx.beginPath(); ctx.arc(tx(p.x1), ty(yhat), 4, 0, Math.PI * 2);
          ctx.fillStyle = dk ? 'rgba(239,159,39,0.8)' : 'rgba(186,117,23,0.85)';
          ctx.strokeStyle = dk ? '#EF9F27' : '#BA7517'; ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(tx(p.x1), ty(yhat));
          ctx.strokeStyle = dk ? 'rgba(239,159,39,0.3)' : 'rgba(186,117,23,0.3)';
          ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
  };
}

// ── RBF Classification (Ex6) ──────────────────────────────────────────────────
var RBF_CLS_EX = {
  centers: [[1,3],[4,0],[5,3]],
  sigma:   5,
  q:       3,
  threshold: 0,
  train: (function() {
    var pts = [
      {n:1,x1:0,x2:1,d:1},{n:2,x1:0,x2:2,d:1},{n:3,x1:1,x2:1,d:1},
      {n:4,x1:1,x2:2,d:1},{n:5,x1:1,x2:3,d:1},{n:6,x1:2,x2:2,d:1},
      {n:7,x1:2,x2:3,d:1},{n:8,x1:3,x2:2,d:1},{n:9,x1:4,x2:1,d:1},
      {n:10,x1:4,x2:3,d:1},
      {n:11,x1:2,x2:0,d:-1},{n:12,x1:2,x2:1,d:-1},{n:13,x1:3,x2:0,d:-1},
      {n:14,x1:3,x2:1,d:-1},{n:15,x1:3,x2:3,d:-1},{n:16,x1:4,x2:0,d:-1},
      {n:17,x1:4,x2:2,d:-1},{n:18,x1:5,x2:0,d:-1},{n:19,x1:5,x2:1,d:-1},
      {n:20,x1:5,x2:2,d:-1},{n:21,x1:5,x2:3,d:-1},
      {n:22,x1:0,x2:3,d:1},
    ];
    return pts;
  })(),
  test: [
    {n:23,x1:0,x2:0,d:1},{n:24,x1:1,x2:0,d:-1},
    {n:25,x1:4.5,x2:0.5,d:-1},{n:26,x1:3.5,x2:1.5,d:1},
    {n:27,x1:4,x2:2.5,d:1},{n:28,x1:1.5,x2:1.5,d:1},
    {n:29,x1:2,x2:0.5,d:-1},{n:30,x1:2.5,x2:2.5,d:1},
  ],
  canvas: {x1min:-0.5,x1max:5.8,refX:[0,5],ydefMin:-0.5,ydefMax:4.0},
};

function rbf_cls_phi(x1, x2, u, sig) {
  return Math.round(Math.exp(-((x1-u[0])*(x1-u[0])+(x2-u[1])*(x2-u[1]))/(2*sig*sig))*1e6)/1e6;
}

function rbf_cls_run() {
  var train=RBF_CLS_EX.train, test=RBF_CLS_EX.test;
  var centers=RBF_CLS_EX.centers, sig=RBF_CLS_EX.sigma, q=RBF_CLS_EX.q;

  var G_rows=train.map(function(p){
    return centers.map(function(u){return rbf_cls_phi(p.x1,p.x2,u,sig);}).concat([1]);
  });
  var rowDetails=train.map(function(p,i){
    return {n:p.n,x1:p.x1,x2:p.x2,d:p.d,phis:centers.map(function(u){return rbf_cls_phi(p.x1,p.x2,u,sig);})};
  });

  var GT=rbf_matT(G_rows), GTG=rbf_matMul(GT,G_rows);
  var d=train.map(function(p){return p.d;}), GTd=rbf_matVec(GT,d);
  var w=rbf_solve(GTG,GTd);

  function evalSet(dataset) {
    return dataset.map(function(p,i) {
      var phis=centers.map(function(u){return rbf_cls_phi(p.x1,p.x2,u,sig);});
      var row=phis.concat([1]);
      var y=Math.round(row.reduce(function(s,v,j){return s+v*w[j];},0)*1e6)/1e6;
      var cls=y>=RBF_CLS_EX.threshold?1:-1;
      return {n:p.n,x1:p.x1,x2:p.x2,d:p.d,y:y,cls:cls,ok:cls===p.d};
    });
  }

  var trRes=evalSet(train), teRes=evalSet(test);
  function score(res){var ok=res.filter(function(r){return r.ok;}).length;
    return {correct:ok,errors:res.length-ok,total:res.length,pct:Math.round(ok/res.length*100)};}

  return {
    centers:centers,sigma:sig,q:q,threshold:RBF_CLS_EX.threshold,
    G:G_rows,row_details:rowDetails,GTG:GTG,GTd:GTd,weights:w,
    train:train,test:test,train_results:trRes,test_annotated:teRes,
    train_score:score(trRes),test_score:score(teRes),
    config:{canvas:RBF_CLS_EX.canvas,q:q,sigma:sig},
  };
}

function rbf_ClsCanvasRenderer(canvasEl) {
  var self=this;
  self.cv=canvasEl; self.ctx=canvasEl.getContext('2d');
  self.CW=canvasEl.width; self.CH=canvasEl.height; self.PAD=52;
  var cfg=RBF_CLS_EX.canvas;
  self.isDk=function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};
  self.tx=function(v){return self.PAD+(v-cfg.x1min)/(cfg.x1max-cfg.x1min)*(self.CW-2*self.PAD);};
  self.ty=function(v){return self.CH-self.PAD-(v-cfg.ydefMin)/(cfg.ydefMax-cfg.ydefMin)*(self.CH-2*self.PAD);};

  self.fwd=function(x1,x2,data){
    var y=data.weights[data.q];
    for(var j=0;j<data.q;j++) y+=data.weights[j]*rbf_cls_phi(x1,x2,data.centers[j],data.sigma);
    return y;
  };

  self.draw=function(data,activePi,showRegion){
    var dk=self.isDk(),ctx=self.ctx,CW=self.CW,CH=self.CH,PAD=self.PAD;
    var tx=self.tx,ty=self.ty;
    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

    if(showRegion&&data.weights){
      var imgW=CW-2*PAD,imgH=CH-2*PAD,imgData=ctx.createImageData(imgW,imgH);
      var posR=dk?[29,158,117]:[29,200,140],negR=dk?[216,90,48]:[220,80,40];
      var self2=self;
      for(var px=0;px<imgW;px++){
        var x1v=cfg.x1min+(px/imgW)*(cfg.x1max-cfg.x1min);
        for(var py2=0;py2<imgH;py2++){
          var x2v=cfg.ydefMax-(py2/imgH)*(cfg.ydefMax-cfg.ydefMin);
          var y2=self2.fwd(x1v,x2v,data);
          var conf=Math.min(1,Math.abs(y2)/2),al=Math.round(20+conf*(dk?95:80));
          var col=y2>=data.threshold?posR:negR,idx=(py2*imgW+px)*4;
          imgData.data[idx]=col[0];imgData.data[idx+1]=col[1];imgData.data[idx+2]=col[2];imgData.data[idx+3]=al;
        }
      }
      ctx.putImageData(imgData,PAD,PAD);
    }

    // Grid
    var gridC=dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)',axC=dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC=dk?'#c2c0b6':'#444441',mutC=dk?'#888780':'#888780';
    ctx.strokeStyle=gridC;ctx.lineWidth=0.5;
    for(var v2=0;v2<=4;v2++){ctx.beginPath();ctx.moveTo(PAD,ty(v2));ctx.lineTo(CW-PAD,ty(v2));ctx.stroke();}
    for(var xg=0;xg<=5;xg++){ctx.beginPath();ctx.moveTo(tx(xg),PAD);ctx.lineTo(tx(xg),CH-PAD);ctx.stroke();}
    ctx.strokeStyle=axC;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,PAD-5);ctx.lineTo(PAD,CH-PAD+5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD-5,CH-PAD);ctx.lineTo(CW-PAD+5,CH-PAD);ctx.stroke();
    ctx.fillStyle=txC;ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('x\u2081',CW-PAD+16,CH-PAD+3);
    ctx.textAlign='right';ctx.fillText('x\u2082',PAD-5,PAD-12);
    ctx.font='9px sans-serif';ctx.fillStyle=mutC;ctx.textAlign='center';
    for(var xg2=0;xg2<=5;xg2++)ctx.fillText(xg2,tx(xg2),CH-PAD+13);
    ctx.textAlign='right';
    for(var yg=0;yg<=4;yg++)ctx.fillText(yg,PAD-4,ty(yg)+3);

    if(data.centers){
      data.centers.forEach(function(u,j){
        ctx.beginPath();ctx.arc(tx(u[0]),ty(u[1]),10,0,Math.PI*2);
        ctx.strokeStyle=dk?'rgba(147,197,253,0.9)':'rgba(24,95,165,0.8)';
        ctx.lineWidth=2;ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=dk?'#93c5fd':'#185FA5';ctx.font='bold 9px monospace';
        ctx.textAlign='center';ctx.fillText('u'+(j+1),tx(u[0]),ty(u[1])-14);
      });
    }

    var results=data.train_results||[];
    for(var i=0;i<data.train.length;i++){
      var p=data.train[i],ppx=tx(p.x1),ppy=ty(p.x2),isCur=i===activePi,isPos=p.d===1;
      var ptok=results.length>i?results[i].ok:false;
      if(ptok){ctx.beginPath();ctx.arc(ppx,ppy,14,0,Math.PI*2);ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)';ctx.fill();}
      if(isCur){ctx.beginPath();ctx.arc(ppx,ppy,15,0,Math.PI*2);ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.stroke();}
      var fillC=isPos?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)'):(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
      var strokeC=isCur?'#EF9F27':(isPos?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
      ctx.beginPath();ctx.arc(ppx,ppy,8,0,Math.PI*2);ctx.fillStyle=fillC;ctx.fill();ctx.strokeStyle=strokeC;ctx.lineWidth=isCur?2.5:1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(String(p.n),ppx,ppy+2.5);
    }
  };
}
