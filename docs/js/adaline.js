// ─── Adaline (WIDROW-HOFF / LMS) ──────────────────────────────────────────────
// Key differences from Perceptron:
//   • Update applied to EVERY pattern (not just misclassified)
//   • Error = (d − y*) on the continuous activation y*
//   • Decision boundary is a SINGLE line: y* = 0  (no delta band)
//   • Update rule: w_i ← w_i + α·(d−y*)·x_i   θ ← θ + α·(d−y*)
// ─────────────────────────────────────────────────────────────────────────────

// Adaline ex4 reuses the same dataset as Perceptron ex5 (identical vectors).
// EXERCISES is declared in perceptron.js which must be loaded before this file.
var ADALINE_EXERCISES = {
  'adaline-ex4': {
    name:   'Atividade 2 — Exercise 4 (Adaline)',
    alpha:  0.01,
    nIters: 3,
    get train()  { return EXERCISES.ex5.train;  },
    get test()   { return EXERCISES.ex5.test;   },
    get canvas() { return EXERCISES.ex5.canvas; },
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function ar4(n){ return Math.round(n*1e4)/1e4; }
function afmtD(n){ var r=ar4(n); var s=r.toFixed(4).replace(/\.?0+$/,''); return s===''?'0':s; }
function afmtN(n){ return Number.isInteger(n)?String(n):String(n); }
function asgn(n){ return n>=0?'+':'';}

function adalineSign(ys){ return ys >= 0 ? 1 : -1; }

// Evaluate all patterns with current weights (Adaline: classify by sign of y*)
function aEvalAll(w1,w2,th,dataset){
  return dataset.map(function(p){
    var ys = ar4(w1*p.x1 + w2*p.x2 + th);
    var y  = adalineSign(ys);
    return { ys:ys, y:y, ok:(y===p.d) };
  });
}

function aScore(results){
  var ok = results.filter(function(r){ return r.ok; }).length;
  return { correct:ok, errors:results.length-ok, total:results.length,
           pct:Math.round(ok/results.length*100) };
}

// Adaline step builder
function buildAdalineSteps(exId){
  var cfg   = ADALINE_EXERCISES[exId];
  var alpha = cfg.alpha;
  var train = cfg.train, test = cfg.test;
  var w1=0, w2=0, th=0;
  var steps = [];

  for(var iter=1; iter<=cfg.nIters; iter++){
    for(var pi=0; pi<train.length; pi++){
      var p    = train[pi];
      var w1b  = w1, w2b = w2, thb = th;
      var ys   = ar4(w1*p.x1 + w2*p.x2 + th);
      var err  = ar4(p.d - ys);
      var dw1  = ar4(alpha * err * p.x1);
      var dw2  = ar4(alpha * err * p.x2);
      var dth  = ar4(alpha * err);
      w1 = ar4(w1 + dw1);
      w2 = ar4(w2 + dw2);
      th = ar4(th + dth);
      var mse  = ar4(0.5 * err * err);
      var allRes = aEvalAll(w1,w2,th,train);
      steps.push({
        iter:iter, pi:pi, p:p,
        ys:ys, err:err, dw1:dw1, dw2:dw2, dth:dth, mse:mse,
        wb:{w1:w1b, w2:w2b, th:thb},
        wa:{w1:w1,  w2:w2,  th:th },
        products:{ w1x1:ar4(w1b*p.x1), w2x2:ar4(w2b*p.x2) },
        trainResults: allRes,
        trainScore:   aScore(allRes),
        trainPts:     train,
      });
    }
  }

  var testResults = aEvalAll(w1,w2,th,test);
  return {
    steps: steps,
    finalW: {w1:w1, w2:w2, th:th},
    testResults: testResults,
    testAnnotated: test.map(function(p,i){ return Object.assign({},p,testResults[i]); }),
    testScore: aScore(testResults),
    cfg: cfg,
    exId: exId,
  };
}

// ── Canvas renderer for Adaline (single decision line y*=0) ─────────────────
function AdalineCanvasRenderer(canvasEl, exId){
  var self = this;
  self.cv  = canvasEl;
  self.ctx = canvasEl.getContext('2d');
  self.CW  = canvasEl.width;
  self.CH  = canvasEl.height;
  self.PAD = 52;
  self.cfg = ADALINE_EXERCISES[exId].canvas;

  self.isDk = function(){ return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches; };

  self.tx = function(v){
    var c = self.cfg;
    return self.PAD + (v - c.x1min)/(c.x1max - c.x1min)*(self.CW - 2*self.PAD);
  };
  self.ty = function(v){
    return self.CH - self.PAD - (v - self._ymin)/(self._ymax - self._ymin)*(self.CH - 2*self.PAD);
  };

  self.getRange = function(w1,w2,th,dataset){
    var c = self.cfg;
    var x2vals = dataset.map(function(p){ return p.x2; });
    if(w2 !== 0 && (w1!==0||w2!==0||th!==0)){
      c.refX.forEach(function(rx){
        x2vals.push((-w1*rx - th)/w2);
      });
    }
    x2vals.push(c.ydefMin, c.ydefMax);
    var rmin = Math.min.apply(null,x2vals), rmax = Math.max.apply(null,x2vals);
    var dpvals = dataset.map(function(p){ return p.x2; });
    dpvals.push(c.ydefMin, c.ydefMax);
    var dp_min = Math.min.apply(null,dpvals), dp_max = Math.max.apply(null,dpvals);
    var span   = Math.max(dp_max-dp_min, 1.0);
    var centre = (dp_min+dp_max)/2;
    var clamp  = span*2.5;
    var dmin   = Math.max(rmin, centre-clamp), dmax = Math.min(rmax, centre+clamp);
    var pad    = (dmax-dmin)*0.15 + 0.25;
    return { ymin:dmin-pad, ymax:dmax+pad };
  };

  self.draw = function(w1,w2,th,showLine,curPi,dataset,isTest){
    var dk  = self.isDk();
    var ds  = dataset;
    var rng = self.getRange(w1,w2,th,ds);
    self._ymin = rng.ymin; self._ymax = rng.ymax;
    var tx = self.tx.bind(self), ty = self.ty.bind(self);
    var ctx = self.ctx, CW = self.CW, CH = self.CH, PAD = self.PAD;
    var cfg = self.cfg;

    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle = dk ? '#1a1a18' : '#fafaf8'; ctx.fillRect(0,0,CW,CH);

    var gridC = dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)';
    var axC   = dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC   = dk?'#c2c0b6':'#444441', mutC = dk?'#888780':'#888780';

    var yRange = rng.ymax-rng.ymin;
    var ystep  = yRange<=1.5?0.25:yRange<=3?0.5:1.0;
    var y0     = Math.ceil(rng.ymin/ystep)*ystep;

    // Grid
    ctx.strokeStyle=gridC; ctx.lineWidth=0.5;
    for(var v=y0; v<=rng.ymax+0.001; v+=ystep){
      var rv=Math.round(v*1000)/1000;
      ctx.beginPath(); ctx.moveTo(PAD,ty(rv)); ctx.lineTo(CW-PAD,ty(rv)); ctx.stroke();
    }
    for(var xg=Math.ceil(cfg.x1min); xg<=cfg.x1max; xg+=1){
      ctx.beginPath(); ctx.moveTo(tx(xg),PAD); ctx.lineTo(tx(xg),CH-PAD); ctx.stroke();
    }

    // Dashed reference verticals
    ctx.lineWidth=0.7; ctx.setLineDash([2,3]);
    ctx.strokeStyle=dk?'rgba(200,200,190,0.2)':'rgba(0,0,0,0.14)';
    cfg.refX.forEach(function(rx){
      ctx.beginPath(); ctx.moveTo(tx(rx),PAD); ctx.lineTo(tx(rx),CH-PAD); ctx.stroke();
    });
    if(0>=rng.ymin&&0<=rng.ymax){
      ctx.strokeStyle=dk?'rgba(200,200,190,0.28)':'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.moveTo(PAD,ty(0)); ctx.lineTo(CW-PAD,ty(0)); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle=axC; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,PAD-5); ctx.lineTo(PAD,CH-PAD+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD-5,CH-PAD); ctx.lineTo(CW-PAD+5,CH-PAD); ctx.stroke();
    ctx.fillStyle=txC; ctx.font='11px sans-serif';
    ctx.textAlign='center'; ctx.fillText('x\u2081',CW-PAD+16,CH-PAD+3);
    ctx.textAlign='right';  ctx.fillText('x\u2082',PAD-5,PAD-12);
    ctx.font='9px sans-serif'; ctx.fillStyle=mutC;
    ctx.textAlign='center';
    cfg.refX.forEach(function(rx){ ctx.fillText('x\u2081='+rx, tx(rx), PAD-5); });
    for(var xg=Math.ceil(cfg.x1min); xg<=cfg.x1max; xg+=1)
      ctx.fillText(xg, tx(xg), CH-PAD+13);
    ctx.textAlign='right';
    for(var v=y0; v<=rng.ymax+0.001; v+=ystep){
      var rv=Math.round(v*1000)/1000;
      ctx.fillText(Number.isInteger(rv)?String(rv):rv.toFixed(ystep<0.5?2:1), PAD-4, ty(rv)+3);
    }

    // ── Decision boundary shading (y* = 0) ─────────────────────────────────
    var hasLine = (w1!==0||w2!==0||th!==0) && showLine;
    if(hasLine && w2!==0){
      var posF = dk?'rgba(29,158,117,0.07)':'rgba(29,200,150,0.10)';
      var negF = dk?'rgba(216,90,48,0.07)':'rgba(216,90,48,0.10)';
      var N = CW-2*PAD;
      for(var px=0; px<N; px++){
        var x1v = cfg.x1min + (px/N)*(cfg.x1max-cfg.x1min);
        var x2boundary = (-w1*x1v - th)/w2;
        var canX = PAD+px;
        // above line → positive y* region → class +1
        ctx.fillStyle=posF; ctx.fillRect(canX, PAD, 1, Math.max(0, ty(x2boundary)-PAD));
        // below line → negative y* region → class -1
        ctx.fillStyle=negF; ctx.fillRect(canX, ty(x2boundary), 1, Math.max(0, (CH-PAD)-ty(x2boundary)));
      }
    }

    // ── Draw decision line y* = 0 ───────────────────────────────────────────
    if(hasLine){
      var lineColor = dk?'#A78BFA':'#6d28d9';
      ctx.strokeStyle=lineColor; ctx.lineWidth=2; ctx.setLineDash([6,3]);
      ctx.beginPath(); var started=false;
      if(w2 !== 0){
        for(var x1v=cfg.x1min; x1v<=cfg.x1max; x1v+=(cfg.x1max-cfg.x1min)/500){
          var x2v = (-w1*x1v - th)/w2;
          if(x2v < rng.ymin-0.05 || x2v > rng.ymax+0.05){ started=false; continue; }
          if(!started){ ctx.moveTo(tx(x1v),ty(x2v)); started=true; }
          else ctx.lineTo(tx(x1v),ty(x2v));
        }
      } else if(w1 !== 0){
        var x1l = -th/w1;
        if(x1l>=cfg.x1min&&x1l<=cfg.x1max){ ctx.moveTo(tx(x1l),PAD); ctx.lineTo(tx(x1l),CH-PAD); }
      }
      ctx.stroke(); ctx.setLineDash([]);

      // Marker dots at refX
      if(w2 !== 0){
        cfg.refX.forEach(function(rx){
          var x2v = (-w1*rx - th)/w2;
          if(x2v >= rng.ymin && x2v <= rng.ymax){
            ctx.beginPath(); ctx.arc(tx(rx),ty(x2v),5,0,Math.PI*2);
            ctx.fillStyle=lineColor; ctx.fill();
            ctx.strokeStyle=dk?'#1a1a18':'#fafaf8'; ctx.lineWidth=1.5; ctx.stroke();
            ctx.strokeStyle=lineColor; ctx.lineWidth=0.5; ctx.setLineDash([2,2]);
            ctx.beginPath(); ctx.moveTo(PAD,ty(x2v)); ctx.lineTo(tx(rx),ty(x2v)); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle=lineColor; ctx.font='bold 9px monospace'; ctx.textAlign='left';
            ctx.fillText('('+rx+','+afmtD(x2v)+')', tx(rx)+7, ty(x2v)-5);
            ctx.textAlign='right'; ctx.font='bold 8px monospace';
            ctx.fillText(afmtD(x2v), PAD-4, ty(x2v)+3);
          }
        });
      }
    }

    // ── Data points ─────────────────────────────────────────────────────────
    for(var i=0; i<ds.length; i++){
      var p    = ds[i];
      if(p.x2 < rng.ymin || p.x2 > rng.ymax) continue;
      var ppx  = tx(p.x1), ppy = ty(p.x2);
      var isPos = (p.d === 1);
      var isCur = (!isTest && i === curPi);
      var ys    = ar4(w1*p.x1 + w2*p.x2 + th);
      var ptok  = (adalineSign(ys) === p.d);

      if(ptok){
        ctx.beginPath(); ctx.arc(ppx,ppy,16,0,Math.PI*2);
        ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)'; ctx.fill();
      }
      if(isCur){
        ctx.beginPath(); ctx.arc(ppx,ppy,17,0,Math.PI*2);
        ctx.strokeStyle='#EF9F27'; ctx.lineWidth=2; ctx.stroke();
      }
      var fillC   = isPos?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)')
                         :(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
      var strokeC = isCur?'#EF9F27':(isPos?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
      ctx.beginPath(); ctx.arc(ppx,ppy,8,0,Math.PI*2);
      ctx.fillStyle=fillC; ctx.fill();
      ctx.strokeStyle=strokeC; ctx.lineWidth=isCur?2.5:1.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 8px sans-serif'; ctx.textAlign='center';
      ctx.fillText(String(p.n), ppx, ppy+2.5);
    }
  };
}
