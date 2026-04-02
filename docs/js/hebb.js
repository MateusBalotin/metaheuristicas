var HEBB_EX = {
  norm: { x1_min:0, x1_max:5, x2_min:0, x2_max:3 },
  canvas: { x1min:-0.5, x1max:5.8, refX:[0,5], ydefMin:-0.5, ydefMax:4.0 },
  train: [
    {n:1,x1:0,x2:1,d:1},{n:2,x1:0,x2:2,d:1},{n:3,x1:1,x2:1,d:1},
    {n:4,x1:1,x2:2,d:1},{n:5,x1:1,x2:3,d:1},{n:6,x1:2,x2:2,d:1},
    {n:7,x1:2,x2:3,d:1},{n:8,x1:3,x2:2,d:1},{n:9,x1:4,x2:1,d:1},
    {n:10,x1:4,x2:3,d:1},
    {n:11,x1:2,x2:0,d:-1},{n:12,x1:2,x2:1,d:-1},{n:13,x1:3,x2:0,d:-1},
    {n:14,x1:3,x2:1,d:-1},{n:15,x1:3,x2:3,d:-1},{n:16,x1:4,x2:0,d:-1},
    {n:17,x1:4,x2:2,d:-1},{n:18,x1:5,x2:0,d:-1},{n:19,x1:5,x2:1,d:-1},
    {n:20,x1:5,x2:2,d:-1},{n:21,x1:5,x2:3,d:-1},
    {n:22,x1:0,x2:3,d:1},
  ],
  test: [
    {n:23,x1:0,x2:0,d:1},{n:24,x1:1,x2:0,d:-1},
    {n:25,x1:4.5,x2:0.5,d:-1},{n:26,x1:3.5,x2:1.5,d:1},
    {n:27,x1:4,x2:2.5,d:1},{n:28,x1:1.5,x2:1.5,d:1},
    {n:29,x1:2,x2:0.5,d:-1},{n:30,x1:2.5,x2:2.5,d:1},
  ],
};

function hb_r6(n) { return Math.round(n*1e6)/1e6; }
function hb_r4(n) { return Math.round(n*1e4)/1e4; }
function hb_fmt(n){ var r=hb_r6(n); return r.toFixed(6).replace(/\.?0+$/,'')||'0'; }
function hb_fmt4(n){var r=hb_r4(n); return r.toFixed(4).replace(/\.?0+$/,'')||'0'; }
function hb_fmtS(n){return n>=0?'+'+hb_fmt(n):hb_fmt(n);}

function hb_norm(x, xmin, xmax) {
  return hb_r6(2*(x-xmin)/(xmax-xmin)-1);
}

function hb_evalAll(dataset, w1, w2, theta) {
  var nm = HEBB_EX.norm;
  return dataset.map(function(p) {
    var xh1 = hb_norm(p.x1, nm.x1_min, nm.x1_max);
    var xh2 = hb_norm(p.x2, nm.x2_min, nm.x2_max);
    var ys  = hb_r6(w1*xh1 + w2*xh2 + theta);
    var cls = ys >= 0 ? 1 : -1;
    return {y_star: ys, cls: cls, ok: cls === p.d};
  });
}

function hb_score(results) {
  var ok = results.filter(function(r){return r.ok;}).length;
  return {correct:ok, errors:results.length-ok, total:results.length,
          pct:Math.round(ok/results.length*100)};
}

function hb_run(alpha, n_iters) {
  var train = HEBB_EX.train, test = HEBB_EX.test;
  var nm    = HEBB_EX.norm;
  var w1 = 0, w2 = 0, theta = 0;
  var steps = [];

  for (var iter = 1; iter <= n_iters; iter++) {
    for (var pi = 0; pi < train.length; pi++) {
      var p   = train[pi];
      var xh1 = hb_norm(p.x1, nm.x1_min, nm.x1_max);
      var xh2 = hb_norm(p.x2, nm.x2_min, nm.x2_max);
      var w1b = w1, w2b = w2, thb = theta;
      var ys  = hb_r6(w1*xh1 + w2*xh2 + theta);
      var cls = ys >= 0 ? 1 : -1;
      var dw1 = hb_r6(alpha*xh1*p.d);
      var dw2 = hb_r6(alpha*xh2*p.d);
      var dth = hb_r6(alpha*p.d);
      w1    = hb_r6(w1 + dw1);
      w2    = hb_r6(w2 + dw2);
      theta = hb_r6(theta + dth);
      var allRes = hb_evalAll(train, w1, w2, theta);
      steps.push({
        iter:iter, pi:pi, pattern:p, xh1:xh1, xh2:xh2,
        y_star:ys, cls:cls, dw1:dw1, dw2:dw2, dtheta:dth,
        weights_before:{w1:w1b,w2:w2b,theta:thb},
        weights_after: {w1:w1, w2:w2, theta:theta},
        train_results:allRes, train_score:hb_score(allRes),
      });
    }
  }

  var testRes = hb_evalAll(test, w1, w2, theta);
  return {
    steps: steps,
    final_weights: {w1:w1, w2:w2, theta:theta},
    test_annotated: test.map(function(p,i){return Object.assign({},p,testRes[i]);}),
    test_score: hb_score(testRes),
    config: {alpha:alpha, n_iters:n_iters, n_train:train.length, norm:nm, canvas:HEBB_EX.canvas},
  };
}

function hb_CanvasRenderer(canvasEl) {
  var self = this;
  self.cv  = canvasEl; self.ctx = canvasEl.getContext('2d');
  self.CW  = canvasEl.width; self.CH = canvasEl.height; self.PAD = 52;
  var cfg  = HEBB_EX.canvas;

  self.isDk = function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};
  self.tx   = function(v){return self.PAD+(v-cfg.x1min)/(cfg.x1max-cfg.x1min)*(self.CW-2*self.PAD);};
  self.ty   = function(v){return self.CH-self.PAD-(v-cfg.ydefMin)/(cfg.ydefMax-cfg.ydefMin)*(self.CH-2*self.PAD);};

  self.draw = function(fw, curPi, train, isTest, results, showLine) {
    var dk  = self.isDk(), ctx = self.ctx, CW = self.CW, CH = self.CH, PAD = self.PAD;
    var tx  = self.tx, ty = self.ty, nm = HEBB_EX.norm;

    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle = dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

    if (showLine && fw && fw.w2 !== 0) {
      var w1=fw.w1, w2=fw.w2, th=fw.theta;
      var posF=dk?'rgba(29,158,117,0.10)':'rgba(29,200,150,0.12)';
      var negF=dk?'rgba(216,90,48,0.10)':'rgba(216,90,48,0.12)';
      var N=CW-2*PAD;
      for (var px=0;px<N;px++) {
        var x1v=cfg.x1min+(px/N)*(cfg.x1max-cfg.x1min);
        var xh1v=2*(x1v-nm.x1_min)/(nm.x1_max-nm.x1_min)-1;
        var xh2b=(-w1*xh1v-th)/w2;
        var x2b=(xh2b+1)/2*(nm.x2_max-nm.x2_min)+nm.x2_min;
        var canX=PAD+px;
        if (w2>0) {
          ctx.fillStyle=posF; ctx.fillRect(canX,PAD,1,Math.max(0,ty(x2b)-PAD));
          ctx.fillStyle=negF; ctx.fillRect(canX,ty(x2b),1,Math.max(0,CH-PAD-ty(x2b)));
        } else {
          ctx.fillStyle=negF; ctx.fillRect(canX,PAD,1,Math.max(0,ty(x2b)-PAD));
          ctx.fillStyle=posF; ctx.fillRect(canX,ty(x2b),1,Math.max(0,CH-PAD-ty(x2b)));
        }
      }
      ctx.strokeStyle=dk?'#A78BFA':'#6d28d9'; ctx.lineWidth=2; ctx.setLineDash([6,3]);
      ctx.beginPath(); var started=false;
      for (var x1v2=cfg.x1min;x1v2<=cfg.x1max;x1v2+=0.02) {
        var xh1v2=2*(x1v2-nm.x1_min)/(nm.x1_max-nm.x1_min)-1;
        var xh2b2=(-w1*xh1v2-th)/w2;
        var x2b2=(xh2b2+1)/2*(nm.x2_max-nm.x2_min)+nm.x2_min;
        if (x2b2<cfg.ydefMin-0.1||x2b2>cfg.ydefMax+0.1){started=false;continue;}
        if (!started){ctx.moveTo(tx(x1v2),ty(x2b2));started=true;}else ctx.lineTo(tx(x1v2),ty(x2b2));
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Grid
    var gridC=dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)',axC=dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC=dk?'#c2c0b6':'#444441',mutC=dk?'#888780':'#888780';
    var yRange=cfg.ydefMax-cfg.ydefMin, ystep=yRange<=3?0.5:1.0;
    var y0=Math.ceil(cfg.ydefMin/ystep)*ystep;
    ctx.strokeStyle=gridC; ctx.lineWidth=0.5;
    for(var v=y0;v<=cfg.ydefMax+0.001;v+=ystep){ctx.beginPath();ctx.moveTo(PAD,ty(v));ctx.lineTo(CW-PAD,ty(v));ctx.stroke();}
    for(var xg=Math.ceil(cfg.x1min);xg<=cfg.x1max;xg++){ctx.beginPath();ctx.moveTo(tx(xg),PAD);ctx.lineTo(tx(xg),CH-PAD);ctx.stroke();}
    ctx.lineWidth=0.7;ctx.setLineDash([2,3]);ctx.strokeStyle=dk?'rgba(200,200,190,0.2)':'rgba(0,0,0,0.14)';
    cfg.refX.forEach(function(rx){ctx.beginPath();ctx.moveTo(tx(rx),PAD);ctx.lineTo(tx(rx),CH-PAD);ctx.stroke();});
    ctx.setLineDash([]);
    ctx.strokeStyle=axC;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,PAD-5);ctx.lineTo(PAD,CH-PAD+5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD-5,CH-PAD);ctx.lineTo(CW-PAD+5,CH-PAD);ctx.stroke();
    ctx.fillStyle=txC;ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('x\u2081',CW-PAD+16,CH-PAD+3);
    ctx.textAlign='right';ctx.fillText('x\u2082',PAD-5,PAD-12);
    ctx.font='9px sans-serif';ctx.fillStyle=mutC;ctx.textAlign='center';
    cfg.refX.forEach(function(rx){ctx.fillText('x\u2081='+rx,tx(rx),PAD-5);});
    for(var xg2=Math.ceil(cfg.x1min);xg2<=cfg.x1max;xg2++)ctx.fillText(xg2,tx(xg2),CH-PAD+13);
    ctx.textAlign='right';
    for(var v2=y0;v2<=cfg.ydefMax+0.001;v2+=ystep){var rv=Math.round(v2*1000)/1000;ctx.fillText(Number.isInteger(rv)?String(rv):rv.toFixed(ystep<0.5?2:1),PAD-4,ty(rv)+3);}

    // Points
    for(var i=0;i<train.length;i++){
      var p=train[i],ppx=tx(p.x1),ppy=ty(p.x2),isPos=p.d===1,isCur=!isTest&&i===curPi;
      var ptok=results?results[i].ok:false;
      if(ptok){ctx.beginPath();ctx.arc(ppx,ppy,16,0,Math.PI*2);ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)';ctx.fill();}
      if(isCur){ctx.beginPath();ctx.arc(ppx,ppy,17,0,Math.PI*2);ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.stroke();}
      var fillC=isPos?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)'):(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
      var strokeC=isCur?'#EF9F27':(isPos?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
      ctx.beginPath();ctx.arc(ppx,ppy,8,0,Math.PI*2);ctx.fillStyle=fillC;ctx.fill();ctx.strokeStyle=strokeC;ctx.lineWidth=isCur?2.5:1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(String(p.n),ppx,ppy+2.5);
    }
  };
}
