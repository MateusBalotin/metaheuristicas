var EXERCISES = {
  ex1: {
    name: "Exercise 1 — OR Logic (Bipolar)",
    delta: 0.5, alpha: 1.0, nIters: 2,
    w0: {w1: 0.3, w2: 0.5, th: 0},
    train: [
      {n:1, x1: 1, x2: 1,  d: 1},
      {n:2, x1: 1, x2:-1,  d: 1},
      {n:3, x1:-1, x2: 1,  d: 1},
      {n:4, x1:-1, x2:-1,  d:-1},
    ],
    test: [],
    canvas: {x1min:-1.7, x1max:1.7, refX:[-1,1], ydefMin:-1.5, ydefMax:1.5},
  },
  ex2: {
    name: "Exercise 2 — AND Logic (Bipolar)",
    delta: 0.4, alpha: 1.0, nIters: 4,
    w0: {w1: 0.9, w2: -0.7, th: 0},
    train: [
      {n:1, x1: 1, x2: 1,  d: 1},
      {n:2, x1: 1, x2:-1,  d:-1},
      {n:3, x1:-1, x2: 1,  d:-1},
      {n:4, x1:-1, x2:-1,  d:-1},
    ],
    test: [],
    canvas: {x1min:-1.7, x1max:1.7, refX:[-1,1], ydefMin:-1.5, ydefMax:1.5},
  },
  ex4: {
    name: "Exercise 4 — Pattern Classification",
    delta: 0.2, alpha: 1.0, nIters: 3,
    train: [
      {n:1, x1:0.75, x2:0.75, d: 1, cls:"A"},
      {n:2, x1:0.75, x2:0.25, d:-1, cls:"B"},
      {n:3, x1:0.25, x2:0.75, d:-1, cls:"B"},
      {n:4, x1:0.25, x2:0.25, d: 1, cls:"A"},
    ],
    test: [],
    canvas: {x1min:-0.15, x1max:1.35, refX:[0,1], ydefMin:-0.5, ydefMax:1.3},
  },
  ex5: {
    name: "Exercise 5 — 22 Training / 8 Test Vectors",
    delta: 0.2, alpha: 1.0, nIters: 3,
    train: [
      {n:1,x1:0,x2:1,d:1},{n:2,x1:0,x2:2,d:1},{n:3,x1:1,x2:1,d:1},
      {n:4,x1:1,x2:2,d:1},{n:5,x1:1,x2:3,d:1},{n:6,x1:2,x2:2,d:1},
      {n:7,x1:2,x2:3,d:1},{n:8,x1:3,x2:2,d:1},{n:9,x1:4,x2:1,d:1},
      {n:10,x1:4,x2:3,d:1},{n:11,x1:0,x2:3,d:1},{n:12,x1:2,x2:0,d:-1},
      {n:13,x1:2,x2:1,d:-1},{n:14,x1:3,x2:0,d:-1},{n:15,x1:3,x2:1,d:-1},
      {n:16,x1:3,x2:3,d:-1},{n:17,x1:4,x2:0,d:-1},{n:18,x1:4,x2:2,d:-1},
      {n:19,x1:5,x2:0,d:-1},{n:20,x1:5,x2:1,d:-1},{n:21,x1:5,x2:2,d:-1},
      {n:22,x1:5,x2:3,d:-1},
    ],
    test: [
      {n:23,x1:0,  x2:0,  d: 1},{n:24,x1:1,  x2:0,  d:-1},
      {n:25,x1:4.5,x2:0.5,d:-1},{n:26,x1:3.5,x2:1.5,d: 1},
      {n:27,x1:4,  x2:2.5,d: 1},{n:28,x1:1.5,x2:1.5,d: 1},
      {n:29,x1:2,  x2:0.5,d:-1},{n:30,x1:2.5,x2:2.5,d: 1},
    ],
    canvas: {x1min:-0.5, x1max:5.8, refX:[0,5], ydefMin:-0.5, ydefMax:4.0},
  },
};

function r4(n){return Math.round(n*1e4)/1e4;}
function fmtD(n){var r=r4(n);var s=r.toFixed(4).replace(/\.?0+$/,'');return s===''?'0':s;}
function fmtN(n){return Number.isInteger(n)?String(n):String(n);}
function sgn(n){return n>=0?'+':'';}

function classify(ys, delta){
  return ys>delta ? 1 : ys<-delta ? -1 : 0;
}

function evalAll(w1,w2,th,delta,dataset){
  return dataset.map(function(p){
    var ys=r4(w1*p.x1+w2*p.x2+th);
    var y=classify(ys,delta);
    return {ys:ys, y:y, ok:(y===p.d)};
  });
}

function score(results){
  var ok=results.filter(function(r){return r.ok;}).length;
  return {correct:ok, errors:results.length-ok, total:results.length, pct:Math.round(ok/results.length*100)};
}

function lineEqs(w1,w2,th,delta){
  if(w2===0&&w1===0) return null;
  if(w2===0){
    return {
      upper:{vertical:true, x1:r4((delta -th)/w1)},
      lower:{vertical:true, x1:r4((-delta-th)/w1)},
      w2zero:true
    };
  }
  var slope=r4(-w1/w2);
  var iU=r4(( delta-th)/w2);
  var iL=r4((-delta-th)/w2);
  return {
    upper:{slope:slope, intercept:iU, vertical:false},
    lower:{slope:slope, intercept:iL, vertical:false},
    diff: r4(2*delta/w2),
    w2zero:false
  };
}

function buildSteps(exId){
  var cfg=EXERCISES[exId];
  var delta=cfg.delta, alpha=cfg.alpha;
  var train=cfg.train, test=cfg.test;
  var w1=cfg.w0?cfg.w0.w1:0, w2=cfg.w0?cfg.w0.w2:0, th=cfg.w0?cfg.w0.th:0;
  var steps=[];

  for(var iter=1;iter<=cfg.nIters;iter++){
    for(var pi=0;pi<train.length;pi++){
      var p=train[pi];
      var w1b=w1,w2b=w2,thb=th;
      var ys=r4(w1*p.x1+w2*p.x2+th);
      var y=classify(ys,delta);
      var ok=(y===p.d);
      if(!ok){
        w1=r4(w1+alpha*p.d*p.x1);
        w2=r4(w2+alpha*p.d*p.x2);
        th=r4(th+alpha*p.d);
      }
      var allRes=evalAll(w1,w2,th,delta,train);
      steps.push({
        iter:iter, pi:pi, p:p, ys:ys, y:y, ok:ok,
        wb:{w1:w1b,w2:w2b,th:thb},
        wa:{w1:w1, w2:w2, th:th},
        products:{w1x1:r4(w1b*p.x1), w2x2:r4(w2b*p.x2)},
        lines: lineEqs(w1,w2,th,delta),
        trainResults: allRes,
        trainScore: score(allRes),
      });
    }
  }

  // Evaluate test set
  var testResults=evalAll(w1,w2,th,delta,test);
  return {
    steps: steps,
    finalW: {w1:w1,w2:w2,th:th},
    testResults: testResults,
    testAnnotated: test.map(function(p,i){return Object.assign({},p,testResults[i]);}),
    testScore: score(testResults),
    cfg: cfg,
    exId: exId,
  };
}

function CanvasRenderer(canvasEl, exId){
  var self=this;
  self.cv=canvasEl;
  self.ctx=canvasEl.getContext('2d');
  self.CW=canvasEl.width;
  self.CH=canvasEl.height;
  self.PAD=52;
  self.cfg=EXERCISES[exId].canvas;

  self.isDk=function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};

  self.tx=function(v){
    var c=self.cfg;
    return self.PAD+(v-c.x1min)/(c.x1max-c.x1min)*(self.CW-2*self.PAD);
  };

  self.ty=function(v){
    return self.CH-self.PAD-(v-self._ymin)/(self._ymax-self._ymin)*(self.CH-2*self.PAD);
  };

  self.getRange=function(w1,w2,th,delta,phase,dataset){
    var c=self.cfg;
    var ds=dataset||[];
    // Collect data-point y values
    var x2vals=ds.map(function(p){return p.x2;});
    // Add line marker points at refX (only when lines are being shown)
    if(phase>=2 && w2!==0 && (w1!==0||w2!==0||th!==0)){
      c.refX.forEach(function(rx){
        x2vals.push(( delta-w1*rx-th)/w2);
        x2vals.push((-delta-w1*rx-th)/w2);
      });
    }
    // Fallback defaults
    x2vals.push(c.ydefMin, c.ydefMax);
    var raw_min=Math.min.apply(null,x2vals);
    var raw_max=Math.max.apply(null,x2vals);
    // Hard-clamp: never more than 3x the data-point span away from data centroid
    var dp_vals=ds.map(function(p){return p.x2;});
    dp_vals.push(c.ydefMin, c.ydefMax);
    var dp_min=Math.min.apply(null,dp_vals), dp_max=Math.max.apply(null,dp_vals);
    var span=Math.max(dp_max-dp_min, 1.0);
    var clamp=span*2.5;
    var centre=(dp_min+dp_max)/2;
    var dmin=Math.max(raw_min, centre-clamp);
    var dmax=Math.min(raw_max, centre+clamp);
    var pad=(dmax-dmin)*0.15+0.25;
    return{ymin:dmin-pad, ymax:dmax+pad};
  };

  self.draw=function(w1,w2,th,delta,phase,curPi,dataset,isTest,glowResults){
    var dk=self.isDk();
    var ds=isTest?EXERCISES[self._exId].test:dataset;
    if(!ds) ds=dataset;
    var rng=self.getRange(w1,w2,th,delta,phase,ds);
    self._ymin=rng.ymin; self._ymax=rng.ymax;
    var tx=self.tx.bind(self), ty=self.ty.bind(self);
    var ctx=self.ctx, CW=self.CW, CH=self.CH, PAD=self.PAD;

    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

    var gridC=dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)';
    var axC  =dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC  =dk?'#c2c0b6':'#444441', mutC=dk?'#888780':'#888780';

    var yRange=rng.ymax-rng.ymin;
    var ystep=yRange<=1.5?0.25:yRange<=3?0.5:1.0;
    var y0=Math.ceil(rng.ymin/ystep)*ystep;

    ctx.strokeStyle=gridC; ctx.lineWidth=0.5;
    for(var v=y0;v<=rng.ymax+0.001;v+=ystep){
      var rv=Math.round(v*1000)/1000;
      ctx.beginPath();ctx.moveTo(PAD,ty(rv));ctx.lineTo(CW-PAD,ty(rv));ctx.stroke();
    }
    var cfg=self.cfg;
    for(var xg=Math.ceil(cfg.x1min);xg<=cfg.x1max;xg+=1){
      ctx.beginPath();ctx.moveTo(tx(xg),PAD);ctx.lineTo(tx(xg),CH-PAD);ctx.stroke();
    }

    // Reference verticals
    ctx.lineWidth=0.7; ctx.setLineDash([2,3]);
    ctx.strokeStyle=dk?'rgba(200,200,190,0.2)':'rgba(0,0,0,0.14)';
    cfg.refX.forEach(function(rx){
      ctx.beginPath();ctx.moveTo(tx(rx),PAD);ctx.lineTo(tx(rx),CH-PAD);ctx.stroke();
    });
    if(0>=rng.ymin&&0<=rng.ymax){
      ctx.strokeStyle=dk?'rgba(200,200,190,0.28)':'rgba(0,0,0,0.18)';
      ctx.beginPath();ctx.moveTo(PAD,ty(0));ctx.lineTo(CW-PAD,ty(0));ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle=axC; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,PAD-5);ctx.lineTo(PAD,CH-PAD+5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD-5,CH-PAD);ctx.lineTo(CW-PAD+5,CH-PAD);ctx.stroke();
    ctx.fillStyle=txC; ctx.font='11px sans-serif';
    ctx.textAlign='center'; ctx.fillText('x\u2081',CW-PAD+16,CH-PAD+3);
    ctx.textAlign='right';  ctx.fillText('x\u2082',PAD-5,PAD-12);

    ctx.font='9px sans-serif'; ctx.fillStyle=mutC;
    ctx.textAlign='center';
    cfg.refX.forEach(function(rx){ctx.fillText('x\u2081='+rx,tx(rx),PAD-5);});
    for(var xg=Math.ceil(cfg.x1min);xg<=cfg.x1max;xg+=1) ctx.fillText(xg,tx(xg),CH-PAD+13);
    ctx.textAlign='right';
    for(var v=y0;v<=rng.ymax+0.001;v+=ystep){
      var rv=Math.round(v*1000)/1000;
      ctx.fillText(Number.isInteger(rv)?String(rv):rv.toFixed(ystep<0.5?2:1),PAD-4,ty(rv)+3);
    }

    // Lines + shading
    var hasLine=(w1!==0||w2!==0||th!==0);
    var drawUpper=(phase>=2||isTest), drawLower=(phase>=3||isTest);
    var upC=dk?'#EF9F27':'#BA7517', loC=dk?'#3B8BD4':'#185FA5';

    if(hasLine&&(drawUpper||drawLower)&&w2!==0){
      var amF=dk?'rgba(186,117,23,0.09)':'rgba(250,199,117,0.13)';
      var blF=dk?'rgba(24,95,165,0.09)':'rgba(181,212,244,0.13)';
      var gyF=dk?'rgba(140,135,128,0.06)':'rgba(180,178,169,0.09)';
      var N=CW-2*PAD;
      for(var px=0;px<N;px++){
        var x1v=cfg.x1min+(px/N)*(cfg.x1max-cfg.x1min);
        var x2u=(delta-w1*x1v-th)/w2, x2l=(-delta-w1*x1v-th)/w2;
        var hi=Math.max(x2u,x2l), lo=Math.min(x2u,x2l), canX=PAD+px;
        if(drawUpper&&drawLower){
          ctx.fillStyle=amF;ctx.fillRect(canX,PAD,1,Math.max(0,ty(hi)-PAD));
          ctx.fillStyle=gyF;ctx.fillRect(canX,ty(hi),1,Math.max(0,ty(lo)-ty(hi)));
          ctx.fillStyle=blF;ctx.fillRect(canX,ty(lo),1,Math.max(0,(CH-PAD)-ty(lo)));
        }else if(drawUpper){
          ctx.fillStyle=amF;ctx.fillRect(canX,PAD,1,Math.max(0,ty(hi)-PAD));
          ctx.fillStyle=blF;ctx.fillRect(canX,ty(hi),1,Math.max(0,(CH-PAD)-ty(hi)));
        }
      }
    }

    function drawLineAndMarkers(c,color,active){
      if(!active||!hasLine) return;
      var vis=false,at0=null,at1=null;
      var refXs=cfg.refX;
      var ats=[];
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([6,3]);
      ctx.beginPath();var started=false;
      if(w2!==0){
        refXs.forEach(function(rx){ats.push({rx:rx, x2:r4((c-w1*rx-th)/w2)});});
        for(var x1v=cfg.x1min;x1v<=cfg.x1max;x1v+=(cfg.x1max-cfg.x1min)/500){
          var x2v=(c-w1*x1v-th)/w2;
          if(x2v<rng.ymin-0.05||x2v>rng.ymax+0.05){started=false;continue;}
          vis=true;
          if(!started){ctx.moveTo(tx(x1v),ty(x2v));started=true;}else ctx.lineTo(tx(x1v),ty(x2v));
        }
      }else if(w1!==0){
        var x1l=(c-th)/w1;
        if(x1l>=cfg.x1min&&x1l<=cfg.x1max){ctx.moveTo(tx(x1l),PAD);ctx.lineTo(tx(x1l),CH-PAD);vis=true;}
      }
      ctx.stroke();ctx.setLineDash([]);

      if(vis&&w2!==0){
        ats.forEach(function(a){
          if(a.x2>=rng.ymin&&a.x2<=rng.ymax){
            ctx.beginPath();ctx.arc(tx(a.rx),ty(a.x2),5,0,Math.PI*2);
            ctx.fillStyle=color;ctx.fill();
            ctx.strokeStyle=dk?'#1a1a18':'#fafaf8';ctx.lineWidth=1.5;ctx.stroke();
            ctx.strokeStyle=color;ctx.lineWidth=0.5;ctx.setLineDash([2,2]);
            ctx.beginPath();ctx.moveTo(PAD,ty(a.x2));ctx.lineTo(tx(a.rx),ty(a.x2));ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle=color;ctx.font='bold 9px monospace';ctx.textAlign='left';
            ctx.fillText('('+a.rx+','+fmtD(a.x2)+')',tx(a.rx)+7,ty(a.x2)-5);
            ctx.textAlign='right';ctx.font='bold 8px monospace';
            ctx.fillText(fmtD(a.x2),PAD-4,ty(a.x2)+3);
          }
        });
      }
    }

    drawLineAndMarkers(delta, upC, drawUpper);
    drawLineAndMarkers(-delta, loC, drawLower);

    // Data points
    for(var i=0;i<ds.length;i++){
      var p=ds[i];
      if(p.x2<rng.ymin||p.x2>rng.ymax) continue;
      var ppx=tx(p.x1),ppy=ty(p.x2),isPos=(p.d===1),isCur=(!isTest&&i===curPi);
      // Use precomputed results if passed (so glow matches score tracker)
      var ptok = glowResults ? glowResults[i].ok : (classify(r4(w1*p.x1+w2*p.x2+th),delta)===p.d);
      // Yellow glow ring on all correctly classified points
      if(ptok){
        ctx.beginPath();ctx.arc(ppx,ppy,16,0,Math.PI*2);
        ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)';ctx.fill();
      }
      // Extra bold ring on current pattern
      if(isCur){
        ctx.beginPath();ctx.arc(ppx,ppy,17,0,Math.PI*2);
        ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.stroke();
      }
      var fillC=isPos?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)'):(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
      var strokeC=isCur?'#EF9F27':(isPos?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
      ctx.beginPath();ctx.arc(ppx,ppy,8,0,Math.PI*2);
      ctx.fillStyle=fillC;ctx.fill();
      ctx.strokeStyle=strokeC;ctx.lineWidth=isCur?2.5:1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
      ctx.fillText(String(p.n),ppx,ppy+2.5);
    }
  };
}
